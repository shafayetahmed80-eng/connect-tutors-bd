// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  TutorProfileBottomNav,
  getSectionStatus,
  ORDERED_PROFILE_SECTION_IDS,
  type TutorProfileBottomNavProps,
} from "./TutorProfileBottomNav";
import type { TutorProfileReadoutSection } from "@/pages/TutorProfileSectionReadout";

beforeEach(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockSections: TutorProfileReadoutSection[] = [
  {
    id: "a",
    title: "Personal Information",
    groups: [
      {
        heading: "Identity and contact",
        editTarget: "a-identity",
        rows: [
          { label: "Full Name", value: "Rahim Ahmed", missing: false },
          { label: "Phone", value: "01712345678", missing: false },
        ],
      },
      {
        heading: "Family",
        editTarget: "a-family",
        rows: [
          { label: "Father Name", value: "", missing: true, optional: false },
        ],
      },
    ],
  },
  {
    id: "c",
    title: "Educational Qualifications",
    groups: [
      {
        heading: "University",
        editTarget: "c-university",
        rows: [
          { label: "University", value: "BUET", missing: false },
        ],
      },
    ],
  },
  {
    id: "d",
    title: "Tuition Preferences",
    groups: [
      {
        heading: "Availability",
        editTarget: "d-availability",
        rows: [
          { label: "Salary", value: "10000", missing: false },
        ],
      },
    ],
  },
  {
    id: "f",
    title: "Credentials and ID",
    groups: [
      {
        heading: "Documents",
        rows: [
          { label: "NID Card", value: "", missing: true, optional: false },
        ],
      },
    ],
  },
  {
    id: "e",
    title: "Introduction and Bio",
    groups: [
      {
        heading: "Bio",
        rows: [
          { label: "About Me", value: "Experienced math tutor", missing: false },
        ],
      },
    ],
  },
];

describe("TutorProfileBottomNav Component", () => {
  it("renders all 5 section navigation buttons with localized Bengali labels", () => {
    const onTabChange = vi.fn();
    render(
      <TutorProfileBottomNav
        sections={mockSections}
        activeTab="a"
        onTabChange={onTabChange}
        completionPercentage={75}
        requiredLeft={2}
      />
    );

    expect(screen.getByText("ব্যক্তিগত")).toBeTruthy();
    expect(screen.getByText("শিক্ষা")).toBeTruthy();
    expect(screen.getByText("টিউশন")).toBeTruthy();
    expect(screen.getByText("ডকুমেন্ট")).toBeTruthy();
    expect(screen.getByText("পরিচিতি")).toBeTruthy();
  });

  it("marks the active section button as selected", () => {
    render(
      <TutorProfileBottomNav
        sections={mockSections}
        activeTab="c"
        onTabChange={vi.fn()}
        completionPercentage={75}
      />
    );

    const educationButton = screen.getByRole("button", { name: /Education section/i });
    expect(educationButton.getAttribute("aria-current")).toBe("page");

    const personalButton = screen.getByRole("button", { name: /Personal section/i });
    expect(personalButton.getAttribute("aria-current")).toBeNull();
  });

  it("displays completion checkmark for completed sections and alert for incomplete sections", () => {
    render(
      <TutorProfileBottomNav
        sections={mockSections}
        activeTab="a"
        onTabChange={vi.fn()}
        completionPercentage={60}
      />
    );

    // Section 'c' (Education) has BUET filled and no missing rows -> complete
    expect(screen.getByTestId("badge-complete-c")).toBeTruthy();
    // Section 'e' (Bio) is complete
    expect(screen.getByTestId("badge-complete-e")).toBeTruthy();

    // Section 'a' has fatherName missing -> incomplete
    expect(screen.getByTestId("badge-incomplete-a")).toBeTruthy();
    // Section 'f' has nid missing -> incomplete
    expect(screen.getByTestId("badge-incomplete-f")).toBeTruthy();
  });

  it("calls onTabChange when a section button is clicked", () => {
    const onTabChange = vi.fn();
    render(
      <TutorProfileBottomNav
        sections={mockSections}
        activeTab="a"
        onTabChange={onTabChange}
        completionPercentage={60}
      />
    );

    const tuitionButton = screen.getByRole("button", { name: /Tuition section/i });
    fireEvent.click(tuitionButton);

    expect(onTabChange).toHaveBeenCalledWith("d");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("renders back to dashboard button and calls onBackToDashboard when clicked", () => {
    const onBackToDashboard = vi.fn();
    render(
      <TutorProfileBottomNav
        sections={mockSections}
        activeTab="a"
        onTabChange={vi.fn()}
        completionPercentage={60}
        onBackToDashboard={onBackToDashboard}
      />
    );

    const backButton = screen.getByRole("button", { name: /ড্যাশবোর্ড/i });
    expect(backButton).toBeTruthy();

    fireEvent.click(backButton);
    expect(onBackToDashboard).toHaveBeenCalledTimes(1);
  });

  it("opens the overview bottom drawer when progress trigger is clicked", () => {
    render(
      <TutorProfileBottomNav
        sections={mockSections}
        activeTab="a"
        onTabChange={vi.fn()}
        completionPercentage={80}
        requiredLeft={1}
      />
    );

    const progressTrigger = screen.getByRole("button", { name: /অগ্রগতি: 80%/i });
    expect(progressTrigger).toBeTruthy();

    fireEvent.click(progressTrigger);

    expect(screen.getByText("📋 প্রোফাইল অগ্রগতি ও সেকশন তালিকা")).toBeTruthy();
    expect(screen.getByText("সার্বিক অগ্রগতি")).toBeTruthy();
    expect(screen.getByText("80%")).toBeTruthy();
    expect(screen.getByText(/1টি তথ্য বাকি/i)).toBeTruthy();
  });

  it("allows jumping to a section from inside the overview drawer", () => {
    const onTabChange = vi.fn();
    render(
      <TutorProfileBottomNav
        sections={mockSections}
        activeTab="a"
        onTabChange={onTabChange}
        completionPercentage={80}
      />
    );

    // Open drawer
    fireEvent.click(screen.getByRole("button", { name: /অগ্রগতি: 80%/i }));

    // Inside drawer, click on "শিক্ষা (Education)"
    const educationRow = screen.getByText("বিশ্ববিদ্যালয়, বিভাগ, ডিগ্রি, কলেজ ও স্কুল").closest("button");
    expect(educationRow).toBeTruthy();

    fireEvent.click(educationRow!);
    expect(onTabChange).toHaveBeenCalledWith("c");
  });
});

describe("getSectionStatus helper", () => {
  it("calculates filled, total, complete, and missing fields correctly", () => {
    const sectionComplete: TutorProfileReadoutSection = {
      id: "c",
      title: "Education",
      groups: [
        {
          heading: "University",
          rows: [
            { label: "Univ", value: "DU", missing: false },
            { label: "Dept", value: "CSE", missing: false },
          ],
        },
      ],
    };

    const status1 = getSectionStatus(sectionComplete);
    expect(status1.total).toBe(2);
    expect(status1.filled).toBe(2);
    expect(status1.missing).toBe(0);
    expect(status1.complete).toBe(true);

    const sectionIncomplete: TutorProfileReadoutSection = {
      id: "a",
      title: "Personal",
      groups: [
        {
          heading: "Personal",
          rows: [
            { label: "Name", value: "A", missing: false },
            { label: "Email", value: "", missing: true, optional: false },
            { label: "Note", value: "", missing: true, optional: true },
          ],
        },
      ],
    };

    const status2 = getSectionStatus(sectionIncomplete);
    expect(status2.total).toBe(2); // Only non-optional rows count in required total
    expect(status2.filled).toBe(1);
    expect(status2.missing).toBe(1);
    expect(status2.complete).toBe(false);
  });
});
