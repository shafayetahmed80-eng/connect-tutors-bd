// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFacebookPostsContent } from "./AdminFacebookPosts";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  fetchFn: vi.fn(),
  isOwner: true,
  templates: null as unknown,
  savedTemplates: null as unknown,
  postStatusInput: null as unknown,
  liveData: {
    items: [
      {
        id: 101,
        classCourse: "Class 10",
        category: "English Version",
        curriculumType: "National Curriculum",
        subjects: JSON.stringify(["Higher Math", "Physics"]),
        tuitionType: "home",
        tuitionLocationLabel: "Dhanmondi, Dhaka",
        locationText: "Dhanmondi",
        addressDetails: "Road 8/A",
        budgetAmount: 9000,
        daysPerWeek: 3,
        tutoringTime: "6:00 PM",
        studentGender: "male",
        studentCount: 1,
        preferredGender: "female",
        instituteName: "BUET / DU",
        notes: "Careful attention needed in Physics.",
        status: "matched",
        publicationState: "published",
        isFacebookPosted: false,
        facebookPostedAt: null as Date | null,
        facebookPostedByAdminId: null as number | null,
        facebookPostedByAdminName: null as string | null,
        createdAt: new Date("2026-10-15T10:00:00.000Z"),
      },
    ],
    counts: {
      pending: 0,
      live: 1,
      appointed: 0,
      confirmed: 0,
      closed: 0,
      cancelled: 0,
    },
    livePostedCount: 0,
    liveUnpostedCount: 1,
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
}));

mocks.fetchFn.mockImplementation(() => Promise.resolve(mocks.liveData));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        listPostedJobs: {
          invalidate: vi.fn(),
          fetch: mocks.fetchFn,
        },
        getFacebookPostTemplates: {
          invalidate: vi.fn(),
        },
      },
    }),
    admin: {
      getWorkspaceAccess: {
        useQuery: () => ({
          data: { isOwner: mocks.isOwner, userId: 1, name: "Owner Admin" },
          isLoading: false,
        }),
      },
      getFacebookPostTemplates: {
        useQuery: () => ({
          data: mocks.templates,
          isLoading: false,
        }),
      },
      saveFacebookPostTemplates: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutateAsync: async (input: unknown) => {
            mocks.savedTemplates = input;
            opts?.onSuccess?.();
            return { success: true };
          },
          isPending: false,
        }),
      },
      resetFacebookPostTemplates: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutateAsync: async () => {
            mocks.savedTemplates = null;
            opts?.onSuccess?.();
            return { success: true };
          },
          isPending: false,
        }),
      },
      setFacebookPostStatus: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (input: unknown, callbacks?: { onSuccess?: () => void }) => {
            mocks.postStatusInput = input;
            callbacks?.onSuccess?.();
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
      listPostedJobs: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.liveData, isLoading: false, isError: false, error: null };
        },
      },
      jobFilterOptions: {
        useQuery: () => ({
          data: {
            tuitionTypes: ["home", "online"],
            daysPerWeek: [3, 4],
            cities: [],
            locationsByCity: {},
            classesByCategory: {},
            subjectsByClass: {},
          },
        }),
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("AdminFacebookPostsContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isOwner = true;
    mocks.templates = null;
    mocks.savedTemplates = null;
    mocks.postStatusInput = null;
    mocks.liveData.items[0].isFacebookPosted = false;
    mocks.liveData.items[0].facebookPostedAt = null;
    mocks.liveData.items[0].facebookPostedByAdminId = null;
    mocks.liveData.items[0].facebookPostedByAdminName = null;
    localStorage.clear();
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("queries only live tuitions with stage: 'live'", () => {
    render(<AdminFacebookPostsContent />);
    expect(mocks.lastInput).toMatchObject({
      stage: "live",
      page: 1,
      pageSize: 20,
    });
  });

  it("renders live tuition details in the table columns", () => {
    render(<AdminFacebookPostsContent />);

    // Class & Medium
    expect(screen.getByText("Class 10")).toBeDefined();
    expect(screen.getByText("National Curriculum")).toBeDefined();

    // Subjects
    expect(screen.getByText("Higher Math, Physics")).toBeDefined();

    // Location
    expect(screen.getByText("Dhanmondi, Dhaka")).toBeDefined();
    expect(screen.getByText("Road 8/A")).toBeDefined();

    // Salary & Schedule
    expect(screen.getByText("9,000 Taka")).toBeDefined();
    expect(screen.getByText("3 days / week")).toBeDefined();
    expect(screen.getByText("6:00 PM")).toBeDefined();

    // Student & Tutor Preference
    expect(screen.getByText("Female")).toBeDefined();
    expect(screen.getByText("BUET / DU")).toBeDefined();

    // Special notes
    expect(screen.getByText("Careful attention needed in Physics.")).toBeDefined();
  });

  it("copies single tuition in English inline pipe format on 'Copy (EN)' click", async () => {
    render(<AdminFacebookPostsContent />);

    const copyBtn = screen.getByRole("button", { name: /Copy English inline post for job/i });
    expect(copyBtn).toBeDefined();

    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    const calledText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];

    expect(calledText).toContain("Job ID: ");
    expect(calledText).toContain("Class 10 (National Curriculum)");
    expect(calledText).toContain("Higher Math, Physics");
    expect(calledText).toContain("Dhanmondi, Dhaka (Road 8/A)");
    expect(calledText).toContain("9,000 BDT/month");
    expect(calledText).toContain("3 Days/week, 6:00 PM");
    expect(calledText).toContain("Female Tutor (BUET / DU)");
    expect(calledText).toContain("1 Student (Male)");
    // Should not include redundant apply link per job
    expect(calledText).not.toContain("Apply:");

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeDefined();
    });
  });

  it("copies all filtered tuitions via 'Copy All Filtered' with Job ID and Connect Tutors", async () => {
    render(<AdminFacebookPostsContent />);

    const copyAllBtn = screen.getByRole("button", { name: /Copy All Filtered/i });
    expect(copyAllBtn).toBeDefined();

    fireEvent.click(copyAllBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    const calledText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledText).toContain("🔴 LIVE TUITION JOBS — CONNECT TUTORS 🔴");
    expect(calledText).toContain("Total 1");
    expect(calledText).toContain("Job ID: ");
    expect(calledText).toContain("Higher Math, Physics");
    expect(calledText).toContain("9,000 BDT/month");
    expect(calledText).toContain("🚀 How to Apply:");
    expect(calledText).toContain("/job-board");
    expect(calledText).toContain("Connect Tutors — The Most Trusted Digital Tuition Platform");
    expect(calledText).not.toContain("100% FREE");
    expect(calledText).not.toContain("Zero Media Fees");
  });

  it("opens bulk preview modal and allows switching formats live via pills", async () => {
    render(<AdminFacebookPostsContent />);

    const previewBulkBtn = screen.getByRole("button", { name: /Preview Bulk/i });
    fireEvent.click(previewBulkBtn);

    await waitFor(() => {
      expect(screen.getByText(/Bulk Facebook Post Preview/i)).toBeDefined();
    });

    // Initial format is Iconic (1-Line)
    expect(screen.getByRole("button", { name: /Iconic \(1-Line\)/i })).toBeDefined();

    // Switch to Mobile Card (2-Line)
    const mobileBtn = screen.getByRole("button", { name: /Mobile \(2-Line\)/i });
    fireEvent.click(mobileBtn);

    // Switch to Key Priority
    const keyPriorityBtn = screen.getByRole("button", { name: /Key Priority/i });
    fireEvent.click(keyPriorityBtn);

    // Switch to Area Grouped
    const areaGroupedBtn = screen.getByRole("button", { name: /Area Grouped/i });
    fireEvent.click(areaGroupedBtn);

    const copyModalBtn = screen.getByRole("button", { name: /Copy All to Clipboard/i });
    fireEvent.click(copyModalBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("allows selecting format from top toolbar dropdown", async () => {
    render(<AdminFacebookPostsContent />);

    const formatSelect = screen.getByLabelText(/Facebook post format/i) as HTMLSelectElement;
    expect(formatSelect).toBeDefined();

    fireEvent.change(formatSelect, { target: { value: "mobile-card" } });
    expect(formatSelect.value).toBe("mobile-card");

    const copyAllBtn = screen.getByRole("button", { name: /Copy All Filtered/i });
    fireEvent.click(copyAllBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    const calledText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledText).toContain("•");
  });

  it("opens single preview modal and allows toggling format", async () => {
    render(<AdminFacebookPostsContent />);

    const previewBtn = screen.getByRole("button", { name: /Preview Facebook post for job/i });
    fireEvent.click(previewBtn);

    expect(screen.getByText(/Facebook Post Preview/i)).toBeDefined();

    // Toggle inline format
    const inlineBtn = screen.getByRole("button", { name: /Inline Line Only/i });
    fireEvent.click(inlineBtn);

    expect(screen.getByText(/শুধুমাত্র ১টি লাইনে জবের সংক্ষিপ্ত তথ্য/i)).toBeDefined();

    const copyModalBtn = screen.getByRole("button", { name: /Copy to Clipboard/i });
    fireEvent.click(copyModalBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("opens template customizer modal and allows saving custom header and footer", async () => {
    render(<AdminFacebookPostsContent />);

    const customizeBtn = screen.getByRole("button", { name: /Customize Template/i });
    expect(customizeBtn).toBeDefined();

    fireEvent.click(customizeBtn);

    expect(screen.getByText(/Customize Facebook Post Template/i)).toBeDefined();

    // Edit the bulk header
    const headerInput = screen.getByPlaceholderText(/Enter header text for bulk post/i);
    fireEvent.change(headerInput, { target: { value: "🔥 CUSTOM TUITION HEADER ({count}) 🔥" } });

    // Save changes
    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Customize Facebook Post Template/i)).toBeNull();
    });

    // Copy all and verify custom header is used
    const copyAllBtn = screen.getByRole("button", { name: /Copy All Filtered/i });
    fireEvent.click(copyAllBtn);

    await waitFor(() => {
      const calls = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls;
      const lastCallText = calls[calls.length - 1][0];
      expect(lastCallText).toContain("🔥 CUSTOM TUITION HEADER (1) 🔥");
    });

    expect(mocks.savedTemplates).toMatchObject({
      bulkHeader: "🔥 CUSTOM TUITION HEADER ({count}) 🔥",
    });
  });

  it("hides 'Customize Template' button for regular (non-owner) admins", () => {
    mocks.isOwner = false;
    render(<AdminFacebookPostsContent />);

    // Regular admin sees Preview and Copy All Filtered
    expect(screen.getByRole("button", { name: /Preview Bulk/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Copy All Filtered/i })).toBeDefined();

    // But Customize Template button is hidden
    expect(screen.queryByRole("button", { name: /Customize Template/i })).toBeNull();
  });

  it("applies server-configured templates for regular admins when copying", async () => {
    mocks.isOwner = false;
    mocks.templates = {
      bulkHeader: "🌟 SERVER OWNER HEADER ({count}) 🌟",
      bulkFooter: "📞 OWNER FOOTER",
      singleHeader: "📢 OWNER SINGLE",
      singleFooter: "🌐 OWNER APPLY",
    };

    render(<AdminFacebookPostsContent />);

    const copyAllBtn = screen.getByRole("button", { name: /Copy All Filtered/i });
    fireEvent.click(copyAllBtn);

    await waitFor(() => {
      const calls = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls;
      const lastCallText = calls[calls.length - 1][0];
      expect(lastCallText).toContain("🌟 SERVER OWNER HEADER (1) 🌟");
    });
  });

  it("updates search query when typing in search input", () => {
    render(<AdminFacebookPostsContent />);

    const searchInput = screen.getByLabelText(/Search live tuitions for Facebook post/i);
    fireEvent.change(searchInput, { target: { value: "Physics" } });

    expect(mocks.lastInput).toMatchObject({
      query: "Physics",
      page: 1,
    });
  });

  it("renders FB Status column with Not Posted badge and toggles to Posted on click", async () => {
    render(<AdminFacebookPostsContent />);

    const notPostedBadge = screen.getByRole("button", { name: /Toggle Facebook post status for job/i });
    expect(notPostedBadge).toBeDefined();

    fireEvent.click(notPostedBadge);

    expect(mocks.postStatusInput).toEqual({
      requestIds: [101],
      isPosted: true,
    });
  });

  it("renders Posted badge when isFacebookPosted is true and toggles to Unposted on click", async () => {
    const originalItems = mocks.liveData.items;
    mocks.liveData = {
      ...mocks.liveData,
      items: [
        {
          ...originalItems[0],
          isFacebookPosted: true,
          facebookPostedAt: new Date(Date.now() - 3600000), // 1h ago
          facebookPostedByAdminId: 1,
          facebookPostedByAdminName: "Shafayet Admin",
        },
      ],
    };

    render(<AdminFacebookPostsContent />);

    const postedBadge = screen.getByRole("button", { name: /Toggle Facebook post status for job/i });
    expect(postedBadge).toBeDefined();
    expect(screen.getByText("1h ago")).toBeDefined();

    fireEvent.click(postedBadge);

    expect(mocks.postStatusInput).toEqual({
      requestIds: [101],
      isPosted: false,
    });

    // Reset back
    mocks.liveData = { ...mocks.liveData, items: originalItems };
  });

  it("filters live jobs by Facebook post status when clicking status filter buttons", () => {
    render(<AdminFacebookPostsContent />);

    // Default is all
    expect(mocks.lastInput).toMatchObject({
      stage: "live",
      facebookPosted: "all",
    });

    // Click Not Posted filter button
    const notPostedFilterBtn = screen.getByRole("button", { name: /Filter: Not Posted/i });
    fireEvent.click(notPostedFilterBtn);

    expect(mocks.lastInput).toMatchObject({
      stage: "live",
      facebookPosted: "not_posted",
      page: 1,
    });

    // Click Posted filter button
    const postedFilterBtn = screen.getByRole("button", { name: /Filter: Posted/i });
    fireEvent.click(postedFilterBtn);

    expect(mocks.lastInput).toMatchObject({
      stage: "live",
      facebookPosted: "posted",
      page: 1,
    });
  });

  it("automatically marks copied single tuition and bulk tuitions as Posted when autoMarkOnCopy is enabled", async () => {
    render(<AdminFacebookPostsContent />);

    // Single copy auto-marks
    const copyBtn = screen.getByRole("button", { name: /Copy English inline post for job/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mocks.postStatusInput).toEqual({
        requestIds: [101],
        isPosted: true,
      });
    });

    // Bulk copy auto-marks
    const copyAllBtn = screen.getByRole("button", { name: /Copy All Filtered/i });
    fireEvent.click(copyAllBtn);

    await waitFor(() => {
      expect(mocks.postStatusInput).toEqual({
        requestIds: [101],
        isPosted: true,
      });
    });
  });

  it("opens single tuition social poster modal with BTPA-077 and ratio controls", () => {
    render(<AdminFacebookPostsContent />);

    const posterBtn = screen.getByRole("button", { name: /Generate social poster for job/i });
    expect(posterBtn).toBeDefined();

    fireEvent.click(posterBtn);

    expect(screen.getByRole("heading", { name: /Facebook Social Poster/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /1:1 Square \(1080×1080\)/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /16:9 Landscape \(1200×675\)/i })).toBeDefined();
    expect(screen.getAllByText(/BTPA-077/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Download PNG/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Copy Image/i })).toBeDefined();

    // Click landscape ratio
    const landscapeBtn = screen.getByRole("button", { name: /16:9 Landscape \(1200×675\)/i });
    fireEvent.click(landscapeBtn);

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Close modal/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("heading", { name: /Facebook Social Poster/i })).toBeNull();
  });

  it("opens bulk tuitions social poster modal when clicking Bulk Poster button", async () => {
    render(<AdminFacebookPostsContent />);

    const bulkPosterBtn = screen.getByRole("button", { name: /Bulk Poster/i });
    expect(bulkPosterBtn).toBeDefined();

    fireEvent.click(bulkPosterBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Facebook Multi-Tuition Banner/i })).toBeDefined();
      expect(screen.getAllByText(/BTPA-077/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});


