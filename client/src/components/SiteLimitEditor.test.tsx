// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findSiteLimit } from "@shared/site-limits";

const state = vi.hoisted(() => ({
  rows: [] as Array<{ limitId: string; value: number }>,
  save: vi.fn(),
  reset: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      siteLimits: { listOverrides: { invalidate: state.invalidate }, resolved: { invalidate: state.invalidate } },
    }),
    siteLimits: {
      listOverrides: { useQuery: () => ({ data: state.rows, isLoading: false, isError: false }) },
      save: { useMutation: () => ({ mutateAsync: state.save }) },
      reset: { useMutation: () => ({ mutateAsync: state.reset }) },
    },
  },
}));

import SiteLimitEditor from "./SiteLimitEditor";

const subjects = findSiteLimit("request.subjects")!;

beforeEach(() => {
  state.rows = [];
  for (const spy of [state.save, state.reset, state.invalidate]) spy.mockReset().mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("site limit editor", () => {
  it("shows each limit at its shipped value when nothing is stored", () => {
    render(<SiteLimitEditor />);
    expect((screen.getByLabelText("Subjects per class") as HTMLInputElement).value).toBe(String(subjects.value));
  });

  it("keeps a request's subjects and a Tutor's as separate rows", () => {
    // They count the same kind of thing and are not the same number.
    render(<SiteLimitEditor />);
    expect((screen.getByLabelText("Subjects per class") as HTMLInputElement).value).toBe("12");
    expect((screen.getByLabelText("Subjects per Tutor") as HTMLInputElement).value).toBe("8");
  });

  it("shows the range, so a refusal can be avoided rather than discovered", () => {
    render(<SiteLimitEditor />);
    // Both subject limits share a range, so this is a getAll: the point is that
    // the range is shown at all, not that it is unique.
    expect(screen.getAllByText(`${subjects.min}–${subjects.max} subjects`).length).toBeGreaterThan(0);
    expect(screen.getByText("40–240 characters")).toBeTruthy();
  });

  it("saves the number that was typed", async () => {
    render(<SiteLimitEditor />);
    fireEvent.change(screen.getByLabelText("Subjects per class"), { target: { value: "6" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await vi.waitFor(() => expect(state.save).toHaveBeenCalledWith({ limitId: "request.subjects", value: 6 }));
  });

  it("will not save a number outside the range", () => {
    render(<SiteLimitEditor />);
    const input = screen.getByLabelText("Subjects per class");
    fireEvent.change(input, { target: { value: String(subjects.max + 1) } });

    // The server would refuse it; there is no reason to make the round trip.
    expect(screen.getAllByRole("button", { name: "Save" })[0]).toHaveProperty("disabled", true);
  });

  it("will not save when the number has not moved", () => {
    render(<SiteLimitEditor />);
    expect(screen.getAllByRole("button", { name: "Save" })[0]).toHaveProperty("disabled", true);
  });

  it("marks an edited limit and says what it ships as", () => {
    state.rows = [{ limitId: "request.subjects", value: 4 }];
    render(<SiteLimitEditor />);

    expect((screen.getByLabelText("Subjects per class") as HTMLInputElement).value).toBe("4");
    expect(screen.getByText(/ships as 12/)).toBeTruthy();
  });

  it("offers Reset only where the Owner has changed something", () => {
    state.rows = [{ limitId: "request.subjects", value: 4 }];
    render(<SiteLimitEditor />);

    expect(screen.getByLabelText("Reset Subjects per class")).toHaveProperty("disabled", false);
    expect(screen.getByLabelText("Reset Languages per request")).toHaveProperty("disabled", true);
  });

  it("resets one limit without touching the others", async () => {
    state.rows = [{ limitId: "request.subjects", value: 4 }];
    render(<SiteLimitEditor />);
    fireEvent.click(screen.getByLabelText("Reset Subjects per class"));

    await vi.waitFor(() => expect(state.reset).toHaveBeenCalledWith({ limitId: "request.subjects" }));
    expect(state.reset).toHaveBeenCalledTimes(1);
  });

  it("surfaces a rejected save instead of pretending it worked", async () => {
    state.save.mockRejectedValue(new Error("Subjects per class must be between 1 and 20 subjects."));
    render(<SiteLimitEditor />);
    fireEvent.change(screen.getByLabelText("Subjects per class"), { target: { value: "6" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toContain("must be between 1 and 20"));
  });
});

describe("the Job card group", () => {
  it("is left out of the general Limits page, which has its own page for it", () => {
    render(<SiteLimitEditor />);
    expect(screen.queryByLabelText("Job card text")).toBeNull();
    expect(screen.queryByLabelText("Job details text")).toBeNull();
  });

  it("offers the card's number and the dialog's, each saved on its own, from 10 to 20 pixels", async () => {
    render(<SiteLimitEditor groups={["Job card"]} />);

    expect((screen.getByLabelText("Job card text") as HTMLInputElement).value).toBe("13");
    expect((screen.getByLabelText("Job details text") as HTMLInputElement).value).toBe("13");
    expect(screen.getAllByText("10–20 px")).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Job card text"), { target: { value: "15" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);
    await vi.waitFor(() => expect(state.save).toHaveBeenCalledWith({ limitId: "jobCard.textSize", value: 15 }));
  });

  it("refuses 9 and 21", () => {
    render(<SiteLimitEditor groups={["Job card"]} />);
    for (const bad of ["9", "21"]) {
      fireEvent.change(screen.getByLabelText("Job details text"), { target: { value: bad } });
      expect((screen.getAllByRole("button", { name: "Save" })[1] as HTMLButtonElement).disabled).toBe(true);
    }
  });
});

describe("the drawing beside the rows", () => {
  const panelWidth = findSiteLimit("modal.width.panel")!;
  const drawing = (limits: { "modal.width.panel": number }) => <p data-testid="aside">{limits["modal.width.panel"]}</p>;

  it("is left out unless the page asks for one", () => {
    render(<SiteLimitEditor groups={["Modals"]} />);
    expect(screen.queryByRole("complementary", { hidden: true })).toBeNull();
  });

  it("starts from the shipped number, or from the saved one", () => {
    const { unmount } = render(<SiteLimitEditor groups={["Modals"]} aside={drawing} />);
    expect(screen.getByTestId("aside").textContent).toBe(String(panelWidth.value));
    unmount();

    state.rows = [{ limitId: "modal.width.panel", value: 720 }];
    render(<SiteLimitEditor groups={["Modals"]} aside={drawing} />);
    expect(screen.getByTestId("aside").textContent).toBe("720");
  });

  it("follows what is typed, before anything is saved", () => {
    render(<SiteLimitEditor groups={["Modals"]} aside={drawing} />);

    fireEvent.change(screen.getByLabelText("Panel width"), { target: { value: "760" } });

    expect(screen.getByTestId("aside").textContent).toBe("760");
    expect(state.save).not.toHaveBeenCalled();
  });

  it("holds the last good number while what is typed is empty, fractional or out of range", () => {
    render(<SiteLimitEditor groups={["Modals"]} aside={drawing} />);
    const box = screen.getByLabelText("Panel width");
    fireEvent.change(box, { target: { value: "760" } });

    for (const bad of ["", "7", "7600", "700.5", "-3"]) {
      fireEvent.change(box, { target: { value: bad } });
      expect(screen.getByTestId("aside").textContent, `typed "${bad}"`).toBe(String(panelWidth.value));
    }
  });

  it("goes back to the saved number when an edit is undone", () => {
    state.rows = [{ limitId: "modal.width.panel", value: 720 }];
    render(<SiteLimitEditor groups={["Modals"]} aside={drawing} />);
    const box = screen.getByLabelText("Panel width");

    fireEvent.change(box, { target: { value: "900" } });
    expect(screen.getByTestId("aside").textContent).toBe("900");
    fireEvent.change(box, { target: { value: "720" } });
    expect(screen.getByTestId("aside").textContent).toBe("720");
  });
});
