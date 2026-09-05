// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TutorProfileFieldOverrideRow } from "@shared/tutor-profile-field-registry";

const mocks = vi.hoisted(() => ({
  rows: [] as TutorProfileFieldOverrideRow[],
  save: vi.fn().mockResolvedValue({ saved: 0 }),
  invalidateOverrides: vi.fn().mockResolvedValue(undefined),
  invalidateResolved: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      tutorProfileFieldConfig: { listOverrides: { invalidate: mocks.invalidateOverrides }, resolved: { invalidate: mocks.invalidateResolved } },
    }),
    tutorProfileFieldConfig: {
      listOverrides: { useQuery: () => ({ data: mocks.rows, isLoading: false, isError: false }) },
      save: { useMutation: () => ({ mutateAsync: mocks.save, isPending: false }) },
    },
  },
}));

import TutorProfileFieldEditor from "./TutorProfileFieldEditor";

afterEach(() => {
  cleanup();
  mocks.rows = [];
  mocks.save.mockClear();
  mocks.invalidateOverrides.mockClear();
  mocks.invalidateResolved.mockClear();
});

describe("Tutor Profile field editor", () => {
  it("renders every section heading and shows an untouched field as on and at its default required state", () => {
    render(<TutorProfileFieldEditor />);

    for (const label of ["Personal Information", "Education", "Tuition, location and communication", "Introduction and review"]) {
      expect(screen.getByRole("heading", { name: label })).toBeTruthy();
    }
    expect(screen.getByLabelText("Disable Full Name")).toHaveProperty("checked", true);
    expect(screen.getByLabelText("Make optional Full Name")).toHaveProperty("checked", true);
    expect(screen.getByRole("button", { name: "Saved" })).toHaveProperty("disabled", true);
  });

  it("shows Fixed instead of a Required checkbox for a field whose requiredness is code-owned", () => {
    render(<TutorProfileFieldEditor />);
    expect(screen.queryByLabelText(/^Make (required|optional) Year\/Semester$/)).toBeNull();
    const row = screen.getByText("Year/Semester").closest("div")!;
    expect(within(row).getByText("Fixed")).toBeTruthy();
  });

  it("gives the profile photo Enabled/Required controls but no move controls", () => {
    render(<TutorProfileFieldEditor />);
    expect(screen.getByLabelText("Disable Profile Photo")).toBeTruthy();
    expect(screen.queryByLabelText("Move Profile Photo up")).toBeNull();
    expect(screen.queryByLabelText("Move Profile Photo to a different section")).toBeNull();
  });

  it("marks a toggled field dirty and saves it as a single batched change", async () => {
    render(<TutorProfileFieldEditor />);

    fireEvent.click(screen.getByLabelText("Disable Full Name"));
    const saveButton = screen.getByRole("button", { name: "Save 1 change" });
    fireEvent.click(saveButton);

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledWith([
      { fieldId: "name", section: null, subGroup: null, sortOrder: null, enabled: 0, required: null },
    ]);
    await waitFor(() => expect(mocks.invalidateOverrides).toHaveBeenCalled());
    expect(mocks.invalidateResolved).toHaveBeenCalled();
  });

  it("clears an override back to null when a toggle returns to the field's own default", async () => {
    mocks.rows = [{ fieldId: "resultGpa", section: null, subGroup: null, sortOrder: null, enabled: null, required: 1 }];
    render(<TutorProfileFieldEditor />);

    // resultGpa defaults to optional; the stored row already flipped it required.
    fireEvent.click(screen.getByLabelText("Make optional Result / GPA"));
    fireEvent.click(screen.getByRole("button", { name: "Save 1 change" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith([
      { fieldId: "resultGpa", section: null, subGroup: null, sortOrder: null, enabled: null, required: null },
    ]));
  });

  it("moves a field into a different section and sends both section and sortOrder", async () => {
    render(<TutorProfileFieldEditor />);

    const select = screen.getByLabelText("Move Additional Notes to a different section") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "d" } });
    fireEvent.click(screen.getByRole("button", { name: "Save 1 change" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const [payload] = mocks.save.mock.calls[0] as [TutorProfileFieldOverrideRow[]];
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({ fieldId: "additionalNotes", section: "d", subGroup: null });
    expect(typeof payload[0].sortOrder).toBe("number");
  });

  it("moving into a sub-group-owning section always names the sub-group, never leaves it to fall back", async () => {
    render(<TutorProfileFieldEditor />);

    const select = screen.getByLabelText("Move Additional Notes to a different section") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "a-family" } });
    fireEvent.click(screen.getByRole("button", { name: "Save 1 change" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const [payload] = mocks.save.mock.calls[0] as [TutorProfileFieldOverrideRow[]];
    expect(payload[0]).toMatchObject({ fieldId: "additionalNotes", section: "a", subGroup: "a-family" });
  });

  it("moves a field up within its own group, swapping sortOrder with its neighbor", async () => {
    render(<TutorProfileFieldEditor />);

    // Section e in registry order: About Me, Teaching Approach, Why Choose Me, Additional Notes.
    fireEvent.click(screen.getByLabelText("Move Teaching Approach up"));
    fireEvent.click(screen.getByRole("button", { name: "Save 2 changes" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const [payload] = mocks.save.mock.calls[0] as [TutorProfileFieldOverrideRow[]];
    const byId = Object.fromEntries(payload.map(row => [row.fieldId, row.sortOrder]));
    expect(byId.aboutMe).toBe(20);
    expect(byId.teachingApproach).toBe(10);
  });

  it("disables Move up at the top of a group and Move down at the bottom", () => {
    render(<TutorProfileFieldEditor />);
    expect(screen.getByLabelText("Move About Me up")).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Move Additional Notes down")).toHaveProperty("disabled", true);
  });

  it("keeps reordering scoped to a field's own panel, not its whole section", () => {
    // Additional Notes is the only "review"-panel field in section e - its
    // three siblings (About Me, Teaching Approach, Why Choose Me) all sit in
    // "introduction", a different visual block. Swapping sortOrder across
    // that boundary would leave nothing to actually move, so both buttons
    // must stay disabled rather than nudging it into a swap nothing renders.
    render(<TutorProfileFieldEditor />);
    expect(screen.getByLabelText("Move Additional Notes up")).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Move Additional Notes down")).toHaveProperty("disabled", true);
  });
});
