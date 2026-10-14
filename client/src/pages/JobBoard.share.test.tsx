// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const job = (id: number, jobId: string, title: string) => ({
  id, jobId, title,
  tuitionType: "home" as const,
  category: "Bangla Medium",
  classCourse: "Class 8",
  subjects: ["History"],
  studentCount: 1,
  studentGender: null,
  preferredTutorGender: "any" as const,
  daysPerWeek: 3,
  budgetAmount: 5000,
  notes: null,
  country: "Bangladesh",
  cityLocationId: "dhaka-city",
  locationId: "dhaka-adabor",
  locationLabel: "Adabor, Dhaka",
  directionLabel: null,
  publishedAt: new Date("2026-11-01T00:00:00.000Z"),
});

const mocks = vi.hoisted(() => ({
  share: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  /** What a lookup of one job by its own ID returns; the board itself shows only 6801. */
  sharedLookup: [] as unknown[],
}));

vi.mock("@/lib/shareJob", () => ({ shareJob: (...args: unknown[]) => mocks.share(...args) }));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => mocks.toastSuccess(...a), error: (...a: unknown[]) => mocks.toastError(...a), info: (...a: unknown[]) => mocks.toastInfo(...a) } }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/lib/siteContent", () => ({
  useSiteContact: () => ({ number: "8801000000000", display: "+8801000000000", tel: "tel:", whatsapp: () => "https://wa.me/x" }),
  useSiteContentResolver: () => (_slot: string, fallback: string) => fallback,
  SiteText: ({ fallback }: { fallback?: string }) => <>{fallback ?? ""}</>,
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutor: { myJobInterests: { invalidate: vi.fn() } } }),
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [] }) },
    },
    jobBoard: {
      filterOptions: { useQuery: () => ({ data: undefined, isLoading: false }) },
      list: {
        useQuery: (input: { jobId?: string }, options?: { enabled?: boolean }) => {
          if (options?.enabled === true || input.jobId) return { data: { items: mocks.sharedLookup, totalCount: mocks.sharedLookup.length }, isLoading: false, isSuccess: true };
          return { data: { items: [job(1, "6801", "Need a Tutor for Class 8")], totalCount: 1 }, isLoading: false, isSuccess: true };
        },
      },
      expressInterest: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      withdrawInterest: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    tutor: {
      myJobInterests: { useQuery: () => ({ data: [] }) },
      getMyProfile: { useQuery: () => ({ data: undefined }) },
    },
  },
}));

import { JobBoardContent } from "./JobBoard";
import ShareJobButton from "@/components/ShareJobButton";

beforeEach(() => {
  mocks.share.mockResolvedValue("copied");
  mocks.sharedLookup = [];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/job-board");
});

describe("sharing a tuition from the Job Board", () => {
  it("keeps share button off the primary job card, and exposes it in the details dialog", async () => {
    render(<JobBoardContent embedded />);

    expect(within(screen.getByRole("button", { name: /Job ID 6801/ })).queryByRole("button", { name: "Share this tuition" })).toBeNull();

    // Opening details displays the Share button
    fireEvent.click(screen.getByRole("button", { name: /Job ID 6801/ }));
    const share = within(screen.getByRole("dialog")).getByRole("button", { name: "Share this tuition" });
    expect(share).toBeTruthy();
  });

  it("says so when the copy did not work, and says nothing after the share sheet is closed", async () => {
    render(<ShareJobButton job={job(1, "6801", "Need a Tutor for Class 8")} />);
    const share = screen.getByRole("button", { name: "Share this tuition" });

    mocks.share.mockResolvedValueOnce("failed");
    fireEvent.click(share);
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());

    mocks.toastSuccess.mockClear();
    mocks.toastError.mockClear();
    mocks.share.mockResolvedValueOnce("cancelled");
    fireEvent.click(share);
    await waitFor(() => expect(mocks.share).toHaveBeenCalledTimes(2));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("carries a labelled Share button in the details dialog", () => {
    render(<JobBoardContent embedded />);

    fireEvent.click(screen.getByRole("button", { name: /Job ID 6801/ }));

    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Share this tuition" }).textContent).toContain("Share");
  });

  it("opens the share popover menu in details dialog with WhatsApp, Facebook, Copy Link and Copy Details options", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<JobBoardContent embedded />);

    fireEvent.click(screen.getByRole("button", { name: /Job ID 6801/ }));

    const shareBtn = within(screen.getByRole("dialog")).getByRole("button", { name: "Share this tuition" });
    fireEvent.click(shareBtn);

    const shareOptions = screen.getByRole("dialog", { name: "Share options" });
    expect(within(shareOptions).getByText("Share to WhatsApp")).toBeTruthy();
    expect(within(shareOptions).getByText("Share on Facebook")).toBeTruthy();
    expect(within(shareOptions).getByText("Copy Link")).toBeTruthy();
    expect(within(shareOptions).getByText("Copy Full Details")).toBeTruthy();

    // Clicking WhatsApp opens a window with WhatsApp share URL
    fireEvent.click(within(shareOptions).getByRole("button", { name: /Share to WhatsApp/ }));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("https://api.whatsapp.com/send?text="), "_blank", expect.any(String));

    openSpy.mockRestore();
  });

  it("copies link and provides checkmark feedback when Copy Link is clicked in details popover", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<JobBoardContent embedded />);

    fireEvent.click(screen.getByRole("button", { name: /Job ID 6801/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Share this tuition" }));

    const copyLinkBtn = screen.getByRole("button", { name: /Copy Link/ });
    fireEvent.click(copyLinkBtn);

    await waitFor(() => {
      expect(screen.getByText("Link Copied!")).toBeTruthy();
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Tuition link copied to clipboard");
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/job-board?job=6801"));
  });

  it("closes the share popover when Escape is pressed", () => {
    render(<JobBoardContent embedded />);

    fireEvent.click(screen.getByRole("button", { name: /Job ID 6801/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Share this tuition" }));

    expect(screen.getByRole("dialog", { name: "Share options" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Share options" })).toBeNull();
  });
});

describe("opening a shared link", () => {
  it("shows that tuition's details even though the board's own page does not list it", () => {
    window.history.replaceState({}, "", "/job-board?job=6802");
    mocks.sharedLookup = [job(2, "6802", "Need a Tutor for Class 9")];

    render(<JobBoardContent />);

    expect(within(screen.getByRole("dialog")).getByText("Need a Tutor for Class 9")).toBeTruthy();
  });

  it("says the tuition is gone when no live job has that ID", () => {
    window.history.replaceState({}, "", "/job-board?job=6999");
    mocks.sharedLookup = [];

    render(<JobBoardContent />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.toastInfo).toHaveBeenCalledWith("This tuition is no longer on the Job Board.");
  });

  it("takes the job out of the address when the dialog is closed", () => {
    window.history.replaceState({}, "", "/job-board?job=6802");
    mocks.sharedLookup = [job(2, "6802", "Need a Tutor for Class 9")];
    render(<JobBoardContent />);

    // The dialog has a close cross in its header and a Close button in its footer; either one does it.
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: "Close" })[0]);

    expect(window.location.search).toBe("");
  });

  it("ignores a link that is not a Job ID", () => {
    window.history.replaceState({}, "", "/job-board?job=abc");
    mocks.sharedLookup = [job(2, "6802", "Need a Tutor for Class 9")];

    render(<JobBoardContent />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.toastInfo).not.toHaveBeenCalled();
  });
});
