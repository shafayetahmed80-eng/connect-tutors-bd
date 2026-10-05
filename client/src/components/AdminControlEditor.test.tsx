// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  data: { guardianApplicantVisibility: "all", appointmentRequestsOutsideShortlist: 0, tutorGuardianLoginOtp: { enabled: false, rememberDays: 30 } } as { guardianApplicantVisibility: "all" | "shortlisted"; appointmentRequestsOutsideShortlist: number; tutorGuardianLoginOtp?: { enabled: boolean; rememberDays: number } },
  mutate: vi.fn(),
  setOtpEnabled: vi.fn(),
  setOtpDays: vi.fn(),
  resetTrust: vi.fn(),
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
      setTutorGuardianLoginOtpEnabled: { useMutation: () => ({ mutate: state.setOtpEnabled, isPending: false }) },
      setTutorGuardianLoginOtpDays: { useMutation: () => ({ mutate: state.setOtpDays, isPending: false }) },
      resetTutorGuardianLoginTrust: { useMutation: () => ({ mutate: state.resetTrust, isPending: false }) },
    },
    siteContent: {
      list: { useQuery: () => ({ data: state.overrides, isLoading: false, isError: false }) },
      save: { useMutation: () => ({ mutate: state.saveLink, isPending: false, variables: undefined }) },
    },
  },
}));
// The rates are the limit editor's own concern and have their own tests.
vi.mock("@/components/SiteLimitEditor", () => ({ default: ({ groups }: { groups?: string[] }) => <div data-testid="limit-editor">{groups?.join(",")}</div> }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { communityLinkSlotId, DEFAULT_COMMUNITY_LINK } from "@shared/community";
import { paymentAccountSlotId } from "@shared/platform-charge";
import AdminControlEditor from "./AdminControlEditor";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.data = { guardianApplicantVisibility: "all", appointmentRequestsOutsideShortlist: 0, tutorGuardianLoginOtp: { enabled: false, rememberDays: 30 } };
  state.overrides = [];
});

describe("the sign-in code switch", () => {
  it("marks the switch in force and shows the days a browser is remembered", () => {
    render(<AdminControlEditor />);

    const group = screen.getByRole("radiogroup", { name: "Tutor and Guardian sign-in code" });
    expect(within(group).getByRole("radio", { name: "Off" }).getAttribute("aria-checked")).toBe("true");
    expect(within(group).getByRole("radio", { name: "On" }).getAttribute("aria-checked")).toBe("false");
    expect((screen.getByLabelText("Remember for") as HTMLInputElement).value).toBe("30");
  });

  it("turns the code on or off the moment it is picked", () => {
    render(<AdminControlEditor />);

    fireEvent.click(screen.getByRole("radio", { name: "Off" }));
    expect(state.setOtpEnabled).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "On" }));
    expect(state.setOtpEnabled).toHaveBeenCalledWith({ enabled: true });
  });

  it("saves the days only once they have changed and sit between 1 and 90", () => {
    render(<AdminControlEditor />);
    const days = screen.getByLabelText("Remember for") as HTMLInputElement;
    const save = () => within(days.closest("section") as HTMLElement).getByRole("button", { name: "Save" }) as HTMLButtonElement;

    expect(save().disabled).toBe(true);
    fireEvent.change(days, { target: { value: "14" } });
    expect(save().disabled).toBe(false);
    fireEvent.click(save());
    expect(state.setOtpDays).toHaveBeenCalledWith({ days: 14 });

    fireEvent.change(days, { target: { value: "0" } });
    expect(save().disabled).toBe(true);
    expect(days.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(days, { target: { value: "95" } });
    expect(days.value).toBe("95");
    expect(save().disabled).toBe(true);
  });

  it("resets every trusted browser only after a confirmation, and not when backed out of", () => {
    render(<AdminControlEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Reset trusted browsers" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/asked for a sign-in code again/)).toBeTruthy();
    expect(state.resetTrust).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Back" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state.resetTrust).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reset trusted browsers" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reset" }));
    expect(state.resetTrust).toHaveBeenCalledTimes(1);
  });

  it("falls back to the shipped defaults while the Owner has never set it", () => {
    state.data = { guardianApplicantVisibility: "all", appointmentRequestsOutsideShortlist: 0 };
    render(<AdminControlEditor />);
    expect((screen.getByLabelText("Remember for") as HTMLInputElement).value).toBe("30");
  });
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
    fireEvent.click(within(screen.getByLabelText("Tutor panel").closest("section") as HTMLElement).getAllByRole("button", { name: "Save" })[0]);

    expect(state.saveLink).toHaveBeenCalledTimes(1);
    expect(state.saveLink).toHaveBeenCalledWith({ slotId: communityLinkSlotId("tutor"), text: "https://www.facebook.com/groups/ctbd-tutors" });
  });

  it("will not save something that is not a link", () => {
    render(<AdminControlEditor />);

    const box = screen.getByLabelText("Tutor panel");
    fireEvent.change(box, { target: { value: "facebook groups connecttutors" } });

    expect(box.getAttribute("aria-invalid")).toBe("true");
    expect((within(box.closest("section") as HTMLElement).getAllByRole("button", { name: "Save" })[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it("resets a changed panel back to the shipped address", () => {
    state.overrides = [{ slotId: communityLinkSlotId("tutor"), text: "https://www.facebook.com/groups/ctbd-tutors" }];
    render(<AdminControlEditor />);

    fireEvent.click(screen.getAllByRole("button", { name: "Reset" })[0]);

    expect(state.saveLink).toHaveBeenCalledWith({ slotId: communityLinkSlotId("tutor"), text: null });
  });
});

describe("where Tutors send their payments", () => {
  it("shows a box per method, empty until the Owner fills it in", () => {
    render(<AdminControlEditor />);

    for (const label of ["bKash", "Nagad", "Rocket", "Bank transfer"]) {
      expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe("");
    }
  });

  it("shows what is stored, and saves one method without touching the others", () => {
    state.overrides = [{ slotId: paymentAccountSlotId("nagad"), text: "01812345678" }];
    render(<AdminControlEditor />);

    expect((screen.getByLabelText("Nagad") as HTMLInputElement).value).toBe("01812345678");
    fireEvent.change(screen.getByLabelText("bKash"), { target: { value: "  01712345678 (Personal) " } });
    fireEvent.click(within(screen.getByLabelText("bKash").closest("section") as HTMLElement).getAllByRole("button", { name: "Save" })[0]);

    expect(state.saveLink).toHaveBeenCalledTimes(1);
    expect(state.saveLink).toHaveBeenCalledWith({ slotId: paymentAccountSlotId("bkash"), text: "01712345678 (Personal)" });
  });

  it("resets a method that has an account back to nothing", () => {
    state.overrides = [{ slotId: paymentAccountSlotId("rocket"), text: "01912345678" }];
    render(<AdminControlEditor />);

    // Reset is enabled only on the row that has something stored.
    const enabled = screen.getAllByRole("button", { name: "Reset" }).filter(button => !(button as HTMLButtonElement).disabled);
    expect(enabled).toHaveLength(1);
    fireEvent.click(enabled[0]);
    expect(state.saveLink).toHaveBeenCalledWith({ slotId: paymentAccountSlotId("rocket"), text: null });
  });
});
