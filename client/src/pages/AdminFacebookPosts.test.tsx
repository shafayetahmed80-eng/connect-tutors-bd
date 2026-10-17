// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

// The video window draws on a canvas jsdom does not have; its own tests cover it. Here it shows what the page hands it.
vi.mock("@/components/FacebookVideoModal", () => ({
  default: ({ jobs, caption, onClose }: { jobs: Array<{ jobId: string }>; caption?: (shown: number) => string; onClose: () => void }) => (
    <div role="dialog" aria-label="Facebook Video">
      <h2>Facebook Video</h2>
      <p data-testid="video-jobs">{jobs.map(item => item.jobId).join(",")}</p>
      <pre data-testid="video-caption">{caption?.(jobs.length)}</pre>
      <button type="button" onClick={onClose}>Close video</button>
    </div>
  ),
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

    // Initial format is Standard Card
    expect(screen.getByRole("button", { name: /Standard Card/i })).toBeDefined();

    // Switch to Category Grouped
    const categoryBtn = screen.getByRole("button", { name: /Category Grouped/i });
    fireEvent.click(categoryBtn);

    // Switch to Gender Grouped
    const keyPriorityBtn = screen.getByRole("button", { name: /Gender Grouped/i });
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
    expect(calledText).toContain("📌 Job ID: 6900");
  });

  it("opens single preview modal and allows toggling format", async () => {
    render(<AdminFacebookPostsContent />);

    const previewBtn = screen.getByRole("button", { name: /Preview Facebook post for job/i });
    fireEvent.click(previewBtn);

    expect(screen.getByText(/Facebook Post Preview/i)).toBeDefined();

    const fullBtn = screen.getByRole("button", { name: /Full Post \(Standard Card\)/i });
    expect(fullBtn).toBeDefined();

    // Toggle inline format
    const inlineBtn = screen.getByRole("button", { name: /Inline Line Only/i });
    fireEvent.click(inlineBtn);

    expect(screen.getByText(/শুধুমাত্র ১টি লাইনে জবের সংক্ষিপ্ত তথ্য/i)).toBeDefined();

    // Toggle back to Standard Card
    fireEvent.click(fullBtn);
    expect(screen.getByText(/ফেসবুক গ্রুপ বা পেজে পোস্ট করার উপযোগী সম্পূর্ণ স্ট্যান্ডার্ড কার্ড পোস্ট/i)).toBeDefined();

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

  it("opens the one-tuition poster with language, size, the three single themes and a colour", () => {
    render(<AdminFacebookPostsContent />);

    fireEvent.click(screen.getByRole("button", { name: /Generate social poster for job/i }));

    expect(screen.getByRole("heading", { name: /Facebook Poster/i })).toBeDefined();
    expect(screen.getByRole("radio", { name: "বাংলা" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "English" })).toBeDefined();
    expect(screen.getByRole("radio", { name: /Square 1080×1080/i })).toBeDefined();
    expect(screen.getByRole("radio", { name: /Landscape 1200×675/i })).toBeDefined();
    const themes = within(screen.getByRole("radiogroup", { name: "Theme" }));
    for (const name of [/Navy/i, /Cream/i, /Mist/i]) expect(themes.getByRole("radio", { name })).toBeDefined();
    expect(themes.queryByRole("radio", { name: /Emerald/i })).toBeNull();
    // One tuition has no tall list.
    expect(screen.queryByRole("radio", { name: /Tall list/i })).toBeNull();
    expect(screen.getByRole("radiogroup", { name: "Colour" })).toBeDefined();
    expect(screen.getByRole("button", { name: /Download PNG/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Copy image/i })).toBeDefined();

    fireEvent.click(screen.getByRole("radio", { name: /Landscape 1200×675/i }));
    expect(screen.getByRole("radio", { name: /Landscape 1200×675/i }).getAttribute("aria-checked")).toBe("true");
    expect(JSON.parse(localStorage.getItem("connect_tutors_fb_poster_prefs_v1") ?? "{}").size).toBe("landscape");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("heading", { name: /Facebook Poster/i })).toBeNull();
  });

  it("opens the combined poster with the four combined themes and the tall list", async () => {
    render(<AdminFacebookPostsContent />);

    fireEvent.click(screen.getByRole("button", { name: /Bulk Poster/i }));

    expect(await screen.findByRole("heading", { name: /Facebook Multi-Tuition Banner/i })).toBeDefined();
    const themes = within(screen.getByRole("radiogroup", { name: "Theme" }));
    for (const name of [/Navy/i, /Emerald/i, /Crimson/i, /Mist/i]) expect(themes.getByRole("radio", { name })).toBeDefined();
    expect(themes.queryByRole("radio", { name: /Cream/i })).toBeNull();
    expect(screen.getByRole("radio", { name: /Tall list/i })).toBeDefined();
  });

  it("opens the Facebook video of the filtered tuitions, with an Area Grouped caption whatever format the page has chosen", async () => {
    render(<AdminFacebookPostsContent />);

    fireEvent.click(screen.getByRole("button", { name: /^Video \(1\)/ }));

    expect(await screen.findByRole("heading", { name: "Facebook Video" })).toBeDefined();
    expect(screen.getByTestId("video-jobs").textContent).toBe("6900");
    const caption = screen.getByTestId("video-caption").textContent ?? "";
    expect(caption).toContain("📌 Job ID: 6900");
    // The area heading of the Area Grouped format, underlined.
    expect(caption).toMatch(/📍 #\S+\n─+/);
    fireEvent.click(screen.getByRole("button", { name: "Close video" }));
    expect(screen.queryByRole("heading", { name: "Facebook Video" })).toBeNull();
  });

  it("toggles smart hashtags on and off and persists preference", () => {
    render(<AdminFacebookPostsContent />);

    const hashtagBtn = screen.getByRole("button", { name: /Toggle Smart Hashtags/i });
    expect(hashtagBtn).toBeDefined();
    expect(hashtagBtn.textContent).toContain("Hashtags: ON");

    fireEvent.click(hashtagBtn);
    expect(hashtagBtn.textContent).toContain("Hashtags: OFF");

    fireEvent.click(hashtagBtn);
    expect(hashtagBtn.textContent).toContain("Hashtags: ON");
  });

  it("opens Facebook Group Helper modal from toolbar and row button", () => {
    render(<AdminFacebookPostsContent />);

    const toolbarGroupBtn = screen.getByRole("button", { name: /Open Facebook Group Helper Directory/i });
    expect(toolbarGroupBtn).toBeDefined();

    fireEvent.click(toolbarGroupBtn);
    expect(screen.getByRole("heading", { name: /Facebook Group Helper/i })).toBeDefined();

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Close group helper/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("heading", { name: /Facebook Group Helper/i })).toBeNull();

    // Open from row button
    const rowGroupBtn = screen.getByRole("button", { name: /Open Facebook group helper for job/i });
    expect(rowGroupBtn).toBeDefined();
    fireEvent.click(rowGroupBtn);

    expect(screen.getByRole("heading", { name: /Facebook Group Helper/i })).toBeDefined();
  });
});


