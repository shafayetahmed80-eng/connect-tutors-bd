// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  data: { guardianApplicantVisibility: "all" as "all" | "shortlisted", appointmentRequestsOutsideShortlist: 0 },
  mutate: vi.fn(),
  invalidate: vi.fn(),
  overrides: [] as Array<{ slotId: string; text: string | null }>,
  saveLink: vi.fn(),
  invalidateContent: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      adminControl: { get: { invalidate: state.invalidate } },
      siteContent: { list: { invalidate: state.invalidateContent } },
    }),
    adminControl: {
      get: { useQuery: () => ({ data: state.data, isLoading: false, isError: false }) },
      setGuardianApplicantVisibility: { useMutation: () => ({ mutate: state.mutate, isPending: false }) },
    },
    siteContent: {
      list: { useQuery: () => ({ data: state.overrides, isLoading: false, isError: false }) },
      save: { useMutation: () => ({ mutate: state.saveLink, isPending: false, variables: undefined }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { communityLinkSlotId, DEFAULT_COMMUNITY_LINK } from "@shared/community";
import AdminControlEditor from "./AdminControlEditor";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.data = { guardianApplicantVisibility: "all", appointmentRequestsOutsideShortlist: 0 };
  state.overrides = [];
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

describe("the community link of each panel", () => {
  it("starts on the shipped address, with nothing to save or reset", () => {
    render(<AdminControlEditor />);

    for (const label of ["Tutor panel", "Guardian panel"]) {
      expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe(DEFAULT_COMMUNITY_LINK);
    }
    expect(screen.getAllByRole("button", { name: "Save" }).every(button => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getAllByRole("button", { name: "Reset" }).every(button => (button as HTMLButtonElement).disabled)).toBe(true);
  });

  it("shows each panel its own stored address", () => {
    state.overrides = [{ slotId: communityLinkSlotId("guardian"), text: "https://www.facebook.com/groups/ctbd-guardians" }];
    render(<AdminControlEditor />);

    expect((screen.getByLabelText("Tutor panel") as HTMLInputElement).value).toBe(DEFAULT_COMMUNITY_LINK);
    expect((screen.getByLabelText("Guardian panel") as HTMLInputElement).value).toBe("https://www.facebook.com/groups/ctbd-guardians");
  });

  it("saves one panel without touching the other", () => {
    render(<AdminControlEditor />);

    fireEvent.change(screen.getByLabelText("Tutor panel"), { target: { value: "https://www.facebook.com/groups/ctbd-tutors" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(state.saveLink).toHaveBeenCalledTimes(1);
    expect(state.saveLink).toHaveBeenCalledWith({ slotId: communityLinkSlotId("tutor"), text: "https://www.facebook.com/groups/ctbd-tutors" });
  });

  it("will not save something that is not a link", () => {
    render(<AdminControlEditor />);

    const box = screen.getByLabelText("Tutor panel");
    fireEvent.change(box, { target: { value: "facebook groups connecttutors" } });

    expect(box.getAttribute("aria-invalid")).toBe("true");
    expect((screen.getAllByRole("button", { name: "Save" })[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it("resets a changed panel back to the shipped address", () => {
    state.overrides = [{ slotId: communityLinkSlotId("tutor"), text: "https://www.facebook.com/groups/ctbd-tutors" }];
    render(<AdminControlEditor />);

    fireEvent.click(screen.getAllByRole("button", { name: "Reset" })[0]);

    expect(state.saveLink).toHaveBeenCalledWith({ slotId: communityLinkSlotId("tutor"), text: null });
  });
});
