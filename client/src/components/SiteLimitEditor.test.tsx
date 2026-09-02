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
    expect((screen.getByLabelText("Subjects per request") as HTMLInputElement).value).toBe(String(subjects.value));
  });

  it("keeps a request's subjects and a Tutor's as separate rows", () => {
    // They count the same kind of thing and are not the same number.
    render(<SiteLimitEditor />);
    expect((screen.getByLabelText("Subjects per request") as HTMLInputElement).value).toBe("12");
    expect((screen.getByLabelText("Subjects per Tutor") as HTMLInputElement).value).toBe("8");
  });

  it("shows the range, so a refusal can be avoided rather than discovered", () => {
    render(<SiteLimitEditor />);
    // Both subject limits share a range, so this is a getAll: the point is that
    // the range is shown at all, not that it is unique.
    expect(screen.getAllByText(`${subjects.min}–${subjects.max} subjects`).length).toBeGreaterThan(0);
    expect(screen.getByText("1–180 days")).toBeTruthy();
    expect(screen.getByText("40–240 characters")).toBeTruthy();
  });

  it("saves the number that was typed", async () => {
    render(<SiteLimitEditor />);
    fireEvent.change(screen.getByLabelText("Subjects per request"), { target: { value: "6" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await vi.waitFor(() => expect(state.save).toHaveBeenCalledWith({ limitId: "request.subjects", value: 6 }));
  });

  it("will not save a number outside the range", () => {
    render(<SiteLimitEditor />);
    const input = screen.getByLabelText("Subjects per request");
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

    expect((screen.getByLabelText("Subjects per request") as HTMLInputElement).value).toBe("4");
    expect(screen.getByText(/ships as 12/)).toBeTruthy();
  });

  it("offers Reset only where the Owner has changed something", () => {
    state.rows = [{ limitId: "request.subjects", value: 4 }];
    render(<SiteLimitEditor />);

    expect(screen.getByLabelText("Reset Subjects per request")).toHaveProperty("disabled", false);
    expect(screen.getByLabelText("Reset Languages per request")).toHaveProperty("disabled", true);
  });

  it("resets one limit without touching the others", async () => {
    state.rows = [{ limitId: "request.subjects", value: 4 }];
    render(<SiteLimitEditor />);
    fireEvent.click(screen.getByLabelText("Reset Subjects per request"));

    await vi.waitFor(() => expect(state.reset).toHaveBeenCalledWith({ limitId: "request.subjects" }));
    expect(state.reset).toHaveBeenCalledTimes(1);
  });

  it("surfaces a rejected save instead of pretending it worked", async () => {
    state.save.mockRejectedValue(new Error("Subjects per request must be between 1 and 20 subjects."));
    render(<SiteLimitEditor />);
    fireEvent.change(screen.getByLabelText("Subjects per request"), { target: { value: "6" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toContain("must be between 1 and 20"));
  });
});
