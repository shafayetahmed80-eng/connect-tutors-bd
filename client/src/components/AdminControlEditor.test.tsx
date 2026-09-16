// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  data: { guardianApplicantVisibility: "all" as "all" | "shortlisted", appointmentRequestsOutsideShortlist: 0 },
  mutate: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ adminControl: { get: { invalidate: state.invalidate } } }),
    adminControl: {
      get: { useQuery: () => ({ data: state.data, isLoading: false, isError: false }) },
      setGuardianApplicantVisibility: { useMutation: () => ({ mutate: state.mutate, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import AdminControlEditor from "./AdminControlEditor";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.data = { guardianApplicantVisibility: "all", appointmentRequestsOutsideShortlist: 0 };
});

describe("Admin Control", () => {
  it("marks the choice in force", () => {
    render(<AdminControlEditor />);

    const group = screen.getByRole("radiogroup", { name: "Guardian applicants" });
    expect(within(group).getByRole("radio", { name: "All applicants" }).getAttribute("aria-checked")).toBe("true");
    expect(within(group).getByRole("radio", { name: "Shortlisted only" }).getAttribute("aria-checked")).toBe("false");
  });

  it("saves a choice straight away when nothing is lost by it", () => {
    render(<AdminControlEditor />);

    fireEvent.click(screen.getByRole("radio", { name: "All applicants" }));
    expect(state.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "Shortlisted only" }));
    expect(state.mutate).toHaveBeenCalledWith({ visibility: "shortlisted" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("names the appointment requests that turning to Shortlisted only cancels, and saves only when confirmed", () => {
    state.data = { guardianApplicantVisibility: "all", appointmentRequestsOutsideShortlist: 3 };
    render(<AdminControlEditor />);

    fireEvent.click(screen.getByRole("radio", { name: "Shortlisted only" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/3 waiting appointment requests/)).toBeTruthy();
    expect(state.mutate).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Back" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state.mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Shortlisted only" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel requests and save" }));
    expect(state.mutate).toHaveBeenCalledWith({ visibility: "shortlisted" });
  });

  it("goes back to All applicants without asking", () => {
    state.data = { guardianApplicantVisibility: "shortlisted", appointmentRequestsOutsideShortlist: 0 };
    render(<AdminControlEditor />);

    fireEvent.click(screen.getByRole("radio", { name: "All applicants" }));
    expect(state.mutate).toHaveBeenCalledWith({ visibility: "all" });
  });
});
