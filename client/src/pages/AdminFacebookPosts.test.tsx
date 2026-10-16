// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFacebookPostsContent } from "./AdminFacebookPosts";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
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
        tutoringTime: "সন্ধ্যা ৬:০০",
        studentGender: "male",
        studentCount: 1,
        preferredGender: "female",
        instituteName: "BUET / DU",
        notes: "পদার্থবিজ্ঞানে বিশেষ যত্ন নিতে হবে।",
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

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        listPostedJobs: { invalidate: vi.fn() },
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
    expect(screen.getByText("সন্ধ্যা ৬:০০")).toBeDefined();

    // Student & Tutor Preference
    expect(screen.getByText("Female")).toBeDefined();
    expect(screen.getByText("BUET / DU")).toBeDefined();

    // Special notes
    expect(screen.getByText("পদার্থবিজ্ঞানে বিশেষ যত্ন নিতে হবে।")).toBeDefined();
  });

  it("copies formatted Facebook post text to clipboard on 'Copy Post' click", async () => {
    render(<AdminFacebookPostsContent />);

    const copyBtn = screen.getByRole("button", { name: /Copy Facebook post for job/i });
    expect(copyBtn).toBeDefined();

    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    const calledText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];

    expect(calledText).toContain("🔴 নতুন টিউশন অফার — কানেক্ট টিউটরস (Connect Tutors BD) 🔴");
    expect(calledText).toContain("📚 শ্রেণি/কোর্স: Class 10 (National Curriculum)");
    expect(calledText).toContain("📝 বিষয়সমূহ: Higher Math, Physics");
    expect(calledText).toContain("📍 লোকেশন: Dhanmondi, Dhaka (Road 8/A)");
    expect(calledText).toContain("💰 পারিশ্রমিক/বেতন: 9,000 Taka");
    expect(calledText).toContain("📅 সপ্তাহে দিন: 3 দিন/সপ্তাহ");
    expect(calledText).toContain("⏰ পড়ার সময়: সন্ধ্যা ৬:০০");
    expect(calledText).toContain("🎓 টিউটর অগ্রাধিকার: Female টিউটর (BUET / DU)");
    expect(calledText).toContain("📋 বিশেষ শর্তাবলী: পদার্থবিজ্ঞানে বিশেষ যত্ন নিতে হবে।");
    expect(calledText).toContain("/job-board?job=");

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeDefined();
    });
  });

  it("opens preview modal when Preview Post button is clicked", async () => {
    render(<AdminFacebookPostsContent />);

    const previewBtn = screen.getByRole("button", { name: /Preview Facebook post for job/i });
    fireEvent.click(previewBtn);

    expect(screen.getByText(/Facebook Post Preview/i)).toBeDefined();
    expect(screen.getByText(/Copy to Clipboard/i)).toBeDefined();

    const copyModalBtn = screen.getByRole("button", { name: /Copy to Clipboard/i });
    fireEvent.click(copyModalBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
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
