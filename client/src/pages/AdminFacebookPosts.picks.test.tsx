// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchFn: vi.fn(),
  items: [] as Array<Record<string, unknown>>,
  posters: [] as Array<{ isOpen: boolean; jobs?: Array<{ id: number; jobId: string }> | null; job?: { id: number; jobId: string } | null }>,
  toastError: vi.fn(),
}));

const liveJob = (id: number) => ({
  id,
  classCourse: `Class ${id}`,
  category: "English Version",
  curriculumType: null,
  subjects: JSON.stringify(["Math"]),
  tuitionType: "home",
  tuitionLocationLabel: "Dhanmondi, Dhaka",
  locationText: "Dhanmondi",
  addressDetails: null,
  budgetAmount: 5000,
  daysPerWeek: 3,
  tutoringTime: null,
  studentGender: null,
  studentCount: 1,
  preferredGender: "any",
  instituteName: null,
  notes: null,
  status: "matched",
  publicationState: "published",
  isFacebookPosted: false,
  facebookPostedAt: null,
  facebookPostedByAdminId: null,
  facebookPostedByAdminName: null,
  createdAt: new Date("2026-10-15T10:00:00.000Z"),
});

const useItems = (count: number) => {
  mocks.items = Array.from({ length: count }, (_, index) => liveJob(index + 1));
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { listPostedJobs: { invalidate: vi.fn(), fetch: mocks.fetchFn }, getFacebookPostTemplates: { invalidate: vi.fn() } } }),
    admin: {
      getWorkspaceAccess: { useQuery: () => ({ data: { isOwner: true, userId: 1, name: "Owner" }, isLoading: false }) },
      getFacebookPostTemplates: { useQuery: () => ({ data: null, isLoading: false }) },
      saveFacebookPostTemplates: { useMutation: () => ({ mutateAsync: async () => ({ success: true }), isPending: false }) },
      resetFacebookPostTemplates: { useMutation: () => ({ mutateAsync: async () => ({ success: true }), isPending: false }) },
      setFacebookPostStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      listPostedJobs: {
        useQuery: () => ({
          data: { items: mocks.items, counts: { live: mocks.items.length }, livePostedCount: 0, liveUnpostedCount: mocks.items.length, total: mocks.items.length, page: 1, pageSize: 20, totalPages: 1 },
          isLoading: false,
          isError: false,
          error: null,
        }),
      },
      jobFilterOptions: { useQuery: () => ({ data: { tuitionTypes: [], daysPerWeek: [], cities: [], locationsByCity: {}, classesByCategory: {}, subjectsByClass: {} } }) },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: mocks.toastError, info: vi.fn() } }));

// The poster window is its own tested component: here only what it is handed matters.
vi.mock("@/components/FacebookPosterModal", () => ({
  FacebookPosterModal: (props: (typeof mocks.posters)[number]) => {
    mocks.posters.push(props);
    if (!props.isOpen) return null;
    return <div data-testid={props.jobs ? "bulk-poster" : "single-poster"}>{props.jobs ? props.jobs.map(job => job.jobId).join(",") : props.job?.jobId}</div>;
  },
}));

import { AdminFacebookPostsContent } from "./AdminFacebookPosts";

const bulkButton = () => screen.getByRole("button", { name: /^Bulk Poster/ });
const pickBox = (jobId: number) => screen.getByRole("checkbox", { name: `Pick job ${6799 + jobId} for the poster` }) as HTMLInputElement;
const pageBox = () => screen.getByRole("checkbox", { name: "Pick every tuition on this page for the poster" }) as HTMLInputElement;
const openedJobs = () => screen.getByTestId("bulk-poster").textContent;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.posters.length = 0;
  mocks.fetchFn.mockImplementation(() => Promise.resolve({ items: mocks.items }));
  localStorage.clear();
  window.innerWidth = 1024;
});
afterEach(cleanup);

describe("picking the tuitions for the bulk poster", () => {
  it("counts the ticked tuitions on the button and numbers each in the order ticked", () => {
    useItems(14);
    render(<AdminFacebookPostsContent />);
    expect(bulkButton().textContent).toBe("Bulk Poster (12)");

    fireEvent.click(pickBox(3));
    fireEvent.click(pickBox(1));

    expect(bulkButton().textContent).toBe("Bulk Poster (2 picked)");
    // Ticked third, drawn first.
    const first = pickBox(3).closest("label")!;
    const second = pickBox(1).closest("label")!;
    expect(within(first).getByText("1")).toBeTruthy();
    expect(within(second).getByText("2")).toBeTruthy();
  });

  it("makes the poster of exactly the ticked tuitions, in the order ticked, without asking the server for more", () => {
    useItems(14);
    render(<AdminFacebookPostsContent />);

    fireEvent.click(pickBox(3));
    fireEvent.click(pickBox(1));
    fireEvent.click(pickBox(9));
    fireEvent.click(bulkButton());

    expect(openedJobs()).toBe("6802,6800,6808");
    expect(mocks.fetchFn).not.toHaveBeenCalled();
  });

  it("makes the poster of the filtered tuitions, the first twelve, when none is ticked", async () => {
    useItems(14);
    render(<AdminFacebookPostsContent />);

    fireEvent.click(bulkButton());

    expect(await screen.findByTestId("bulk-poster")).toBeTruthy();
    expect(openedJobs()).toBe(Array.from({ length: 12 }, (_, index) => String(6800 + index)).join(","));
  });

  it("lets a ticked tuition go again with a second tick", () => {
    useItems(5);
    render(<AdminFacebookPostsContent />);

    fireEvent.click(pickBox(2));
    fireEvent.click(pickBox(4));
    fireEvent.click(pickBox(2));

    expect(pickBox(2).checked).toBe(false);
    expect(bulkButton().textContent).toBe("Bulk Poster (1 picked)");
    // The one left is now first.
    expect(within(pickBox(4).closest("label")!).getByText("1")).toBeTruthy();
  });

  it("refuses a thirteenth, with a message, and keeps the twelve", () => {
    useItems(14);
    render(<AdminFacebookPostsContent />);

    for (let id = 1; id <= 12; id += 1) fireEvent.click(pickBox(id));
    expect(mocks.toastError).not.toHaveBeenCalled();
    fireEvent.click(pickBox(13));

    expect(mocks.toastError).toHaveBeenCalledWith("পোস্টারের জন্য সর্বোচ্চ 12টি টিউশন বাছা যায়।");
    expect(pickBox(13).checked).toBe(false);
    expect(bulkButton().textContent).toBe("Bulk Poster (12 picked)");
  });

  it("ticks the whole page from the heading, and lets it all go from the same tick", () => {
    useItems(5);
    render(<AdminFacebookPostsContent />);

    fireEvent.click(pageBox());
    expect(bulkButton().textContent).toBe("Bulk Poster (5 picked)");
    expect(pageBox().checked).toBe(true);
    for (let id = 1; id <= 5; id += 1) expect(pickBox(id).checked).toBe(true);

    fireEvent.click(pageBox());
    expect(bulkButton().textContent).toBe("Bulk Poster (5)");
    expect(pageBox().checked).toBe(false);
  });

  it("ticks only as many as the poster holds when the page has more, and says so", () => {
    useItems(14);
    render(<AdminFacebookPostsContent />);

    fireEvent.click(pageBox());

    expect(bulkButton().textContent).toBe("Bulk Poster (12 picked)");
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    expect(pickBox(12).checked).toBe(true);
    expect(pickBox(13).checked).toBe(false);
  });

  it("marks the heading tick as partly ticked when only some are", () => {
    useItems(5);
    render(<AdminFacebookPostsContent />);

    fireEvent.click(pickBox(2));

    expect(pageBox().indeterminate).toBe(true);
    expect(pageBox().checked).toBe(false);
  });

  it("clears every tick with Clear, and the button counts the filtered tuitions again", () => {
    useItems(5);
    render(<AdminFacebookPostsContent />);
    expect(screen.queryByRole("button", { name: "Clear the tuitions picked for the poster" })).toBeNull();

    fireEvent.click(pickBox(1));
    fireEvent.click(pickBox(2));
    fireEvent.click(screen.getByRole("button", { name: "Clear the tuitions picked for the poster" }));

    expect(bulkButton().textContent).toBe("Bulk Poster (5)");
    expect(pickBox(1).checked).toBe(false);
    expect(screen.queryByRole("button", { name: "Clear the tuitions picked for the poster" })).toBeNull();
  });

  it("tints a ticked tuition's row", () => {
    useItems(3);
    render(<AdminFacebookPostsContent />);

    fireEvent.click(pickBox(2));

    expect(pickBox(2).closest("tr")!.className).toContain("bg-sky-50/70");
    expect(pickBox(1).closest("tr")!.className).not.toContain("bg-sky-50/70");
  });

  it("is ticked from a phone's card too, with a thumb-sized box", () => {
    window.innerWidth = 390;
    useItems(3);
    render(<AdminFacebookPostsContent />);

    const box = pickBox(2);
    expect(box.closest("label")!.className).toContain("min-h-10");
    fireEvent.click(box);

    expect(bulkButton().textContent).toBe("Bulk Poster (1 picked)");
    expect(box.closest("li")!.className).toContain("bg-sky-50/70");
  });

  it("opens even when no tuition matches the filters, as long as some are ticked", () => {
    useItems(2);
    render(<AdminFacebookPostsContent />);
    fireEvent.click(pickBox(1));
    expect((bulkButton() as HTMLButtonElement).disabled).toBe(false);
  });
});
