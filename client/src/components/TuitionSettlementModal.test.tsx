// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  preview: { data: undefined as unknown, isLoading: false, isError: false, error: null as unknown },
  lastInput: undefined as unknown,
  save: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { listCancelledCharges: { invalidate: state.invalidate } } }),
    admin: {
      previewTuitionSettlement: { useQuery: (input: unknown) => { state.lastInput = input; return state.preview; } },
      saveTuitionSettlement: { useMutation: () => ({ mutate: state.save, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import TuitionSettlementModal from "./TuitionSettlementModal";

const preview = (over: Record<string, unknown> = {}) => ({
  outcome: "preview", phase: "first_month", paid: 2500, total: 3000, refundPct: 30, retained: 1500, refund: 1000, due: 0, ...over,
});

const open = (data: unknown, existing: { reason: any; retained: number; disposition: any } | null = null) => {
  state.preview = { data, isLoading: false, isError: false, error: null };
  return render(<TuitionSettlementModal requestId={21} existing={existing} onClose={vi.fn()} />);
};

afterEach(() => { cleanup(); vi.clearAllMocks(); state.preview = { data: undefined, isLoading: false, isError: false, error: null }; });

describe("settling a cancelled tuition", () => {
  it("names the tuition, the month it ended in, and what the rates suggest", () => {
    open(preview());

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Settle · Job ID 6820")).toBeTruthy();
    expect(dialog.getByText("Ended in the first month")).toBeTruthy();
    expect((dialog.getByLabelText("Charge to keep (Taka)") as HTMLInputElement).value).toBe("1500");
    expect(dialog.getByText("1,000 Taka comes back to the Tutor")).toBeTruthy();
  });

  it("starts on a Guardian's valid reason, and asks the server again when the Admin changes it", () => {
    open(preview());
    expect(state.lastInput).toMatchObject({ requestId: 21, reason: "guardian_valid" });

    fireEvent.change(screen.getByLabelText("Why it ended"), { target: { value: "tutor_fault" } });
    expect(state.lastInput).toMatchObject({ reason: "tutor_fault" });
  });

  it("asks for the salary received only when nothing was paid in the first month", () => {
    open(preview({ paid: 0, phase: "first_month", retained: 1500, refund: 0, due: 1500 }));
    expect(screen.getByLabelText("Salary received (Taka)")).toBeTruthy();

    cleanup();
    open(preview({ paid: 2500 }));
    expect(screen.queryByLabelText("Salary received (Taka)")).toBeNull();

    cleanup();
    open(preview({ paid: 0, phase: "later" }));
    expect(screen.queryByLabelText("Salary received (Taka)")).toBeNull();
  });

  it("recomputes what comes back when the Admin moves the figure to keep, and offers the way back", () => {
    open(preview());
    fireEvent.change(screen.getByLabelText("Charge to keep (Taka)"), { target: { value: "2000" } });

    expect(screen.getByText("500 Taka comes back to the Tutor")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Use the suggested 1,500/ }));
    expect(screen.getByText("1,000 Taka comes back to the Tutor")).toBeTruthy();
  });

  it("says what is still due when the Tutor has paid less than is kept", () => {
    open(preview({ paid: 1000, retained: 3000, refund: 0, due: 2000 }));
    expect(screen.getByText("2,000 Taka is still due from the Tutor")).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("never keeps more than the full charge", () => {
    open(preview());
    fireEvent.change(screen.getByLabelText("Charge to keep (Taka)"), { target: { value: "9999" } });
    // Capped at the full 3,000: 500 more than the 2,500 paid.
    expect(screen.getByText("500 Taka is still due from the Tutor")).toBeTruthy();
  });

  it("saves the suggestion as it stands, crediting the refund when the Admin chooses to", () => {
    open(preview());

    fireEvent.click(screen.getByRole("radio", { name: "Credit to their other tuitions" }));
    fireEvent.click(screen.getByRole("button", { name: "Save settlement" }));

    expect(state.save).toHaveBeenCalledTimes(1);
    expect(state.save).toHaveBeenCalledWith({
      requestId: 21, reason: "guardian_valid", receivedSalary: null, retained: null, disposition: "credited", note: null,
    });
  });

  it("sends the figure only when the Admin moved it, with the note they wrote", () => {
    open(preview());
    fireEvent.change(screen.getByLabelText("Charge to keep (Taka)"), { target: { value: "2000" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "  Agreed by phone " } });
    fireEvent.click(screen.getByRole("button", { name: "Save settlement" }));

    expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ retained: 2000, disposition: "refunded", note: "Agreed by phone" }));
  });

  it("sends no disposition when there is no refund to dispose of", () => {
    open(preview({ paid: 1000, retained: 3000, refund: 0, due: 2000 }));
    fireEvent.click(screen.getByRole("button", { name: "Save settlement" }));
    expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ disposition: "none" }));
  });

  it("opens on what was decided before, so a revision starts from it", () => {
    open(preview(), { reason: "tutor_fault", retained: 1500, disposition: "credited" });

    expect((screen.getByLabelText("Why it ended") as HTMLSelectElement).value).toBe("tutor_fault");
    expect((screen.getByLabelText("Charge to keep (Taka)") as HTMLInputElement).value).toBe("1500");
    expect(screen.getByRole("radio", { name: "Credit to their other tuitions" }).getAttribute("aria-checked")).toBe("true");
  });

  it("says why the settlement could not be worked out", () => {
    state.preview = { data: undefined, isLoading: false, isError: true, error: { message: "This tuition has no salary, so there is no charge to pay." } };
    render(<TuitionSettlementModal requestId={21} existing={null} onClose={vi.fn()} />);

    expect(screen.getByRole("alert").textContent).toContain("no salary");
    expect((screen.getByRole("button", { name: "Save settlement" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
