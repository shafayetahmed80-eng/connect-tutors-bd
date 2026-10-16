// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFacebookPostsContent } from "./AdminFacebookPosts";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  fetchFn: vi.fn(),
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
        createdAt: new Date("2026-10-15T10:00:00.000Z"),
      },
    ],
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
      },
    }),
    admin: {
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
  },
}));

describe("AdminFacebookPostsContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(calledText).toContain("Job #");
    expect(calledText).toContain("Class 10 (National Curriculum)");
    expect(calledText).toContain("Higher Math, Physics");
    expect(calledText).toContain("Dhanmondi, Dhaka (Road 8/A)");
    expect(calledText).toContain("9,000 BDT/month");
    expect(calledText).toContain("3 Days/week, 6:00 PM");
    expect(calledText).toContain("Female Tutor (BUET / DU)");
    expect(calledText).toContain("1 Student (Male)");
    expect(calledText).toContain("Apply:");

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeDefined();
    });
  });

  it("copies all filtered tuitions in English side-by-side format via 'Copy All Filtered'", async () => {
    render(<AdminFacebookPostsContent />);

    const copyAllBtn = screen.getByRole("button", { name: /Copy All Filtered/i });
    expect(copyAllBtn).toBeDefined();

    fireEvent.click(copyAllBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    const calledText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledText).toContain("🔴 LIVE TUITION JOBS — CONNECT TUTORS BD 🔴");
    expect(calledText).toContain("Total 1");
    expect(calledText).toContain("1. Job #");
    expect(calledText).toContain("Higher Math, Physics");
    expect(calledText).toContain("9,000 BDT/month");
    expect(calledText).toContain("/job-board");
  });

  it("opens bulk preview modal when 'Preview Bulk' button is clicked", async () => {
    render(<AdminFacebookPostsContent />);

    const previewBulkBtn = screen.getByRole("button", { name: /Preview Bulk/i });
    fireEvent.click(previewBulkBtn);

    await waitFor(() => {
      expect(screen.getByText(/Bulk Facebook Post Preview/i)).toBeDefined();
    });

    const copyModalBtn = screen.getByRole("button", { name: /Copy All to Clipboard/i });
    fireEvent.click(copyModalBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("opens single preview modal and allows toggling format", async () => {
    render(<AdminFacebookPostsContent />);

    const previewBtn = screen.getByRole("button", { name: /Preview Facebook post for job/i });
    fireEvent.click(previewBtn);

    expect(screen.getByText(/Facebook Post Preview/i)).toBeDefined();

    // Toggle Bengali format
    const bnBtn = screen.getByRole("button", { name: /Bengali \(Detailed Post\)/i });
    fireEvent.click(bnBtn);

    expect(screen.getByText(/ফেসবুক গ্রুপ বা পেইজে বিস্তারিত পোস্ট করার উপযোগী ফরম্যাট/i)).toBeDefined();

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
});


