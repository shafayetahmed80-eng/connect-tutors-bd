// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultTutorProfileFieldConfig } from "@shared/tutor-profile-field-registry";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  result: {} as Record<string, unknown>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    tutorRequests: {
      appliedTutorProfile: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return mocks.result;
        },
      },
    },
  },
}));

vi.mock("@/lib/siteContent", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/siteContent")>()),
  SiteContentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SiteText: ({ fallback, className }: { fallback?: string; className?: string }) => <span className={className}>{fallback}</span>,
  useSiteContentSpacingClass: () => "",
  useSiteContentTextStyle: () => undefined,
}));

import { GuardianTutorProfileContent } from "./GuardianTutorProfile";
import { withoutMissingRows, type TutorProfileReadoutSection } from "./TutorProfileSectionReadout";

/** What the server sends: the readable fields only, none of them required. */
const fieldConfig = defaultTutorProfileFieldConfig().all
  .filter(field => field.guardianVisible)
  .map(field => ({ ...field, required: false }));

function loaded() {
  mocks.result = {
    data: {
      profile: {
        tutorId: "tutor-175",
        tutorNumber: 777,
        name: "Tania Sultana",
        headline: "Physics made simple",
        gender: "female",
        highestEducation: "Honours",
        universityId: 7,
        facultyDepartmentId: 12,
        studyStatus: "studying",
        yearSemester: "3rd year",
        primarySubjectIds: [1],
        additionalSubjectIds: [],
        classLevelIds: [4],
        curriculumIds: [],
        preferredClassSizes: [],
        preferredTeachingDays: ["monday"],
        preferredTimeSlots: [],
        teachingAreaIds: [],
        availableNationwide: false,
        privateDetails: {},
        educationRecords: [{ qualificationLevel: "HSC", instituteName: "Notre Dame College", majorGroup: "Science", passingYear: 2017 }],
        aboutMe: "I teach with patience.",
      },
      catalogLabels: {
        subjects: { 1: "Physics" }, classLevels: { 4: "Class 9" }, curricula: {},
        universities: { 7: "University of Dhaka" }, facultyDepartments: { 12: "Applied Physics" }, locations: {},
      },
      fieldConfig,
    },
    isLoading: false, isError: false, error: null,
  };
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("an applicant's profile, as a Guardian reads it", () => {
  it("asks for this Tutor through this tuition and leads back to its list", () => {
    loaded();
    render(<GuardianTutorProfileContent requestId={13} tutorId="tutor-175" />);

    expect(mocks.lastInput).toEqual({ requestId: 13, tutorId: "tutor-175" });
    expect(screen.getByRole("link", { name: /Back to Applied Tutors/ }).getAttribute("href")).toBe("/guardian/dashboard/applied-tutors/13");
    expect(screen.getByRole("heading", { name: "Tania Sultana" })).toBeTruthy();
    expect(screen.getByText("Tutor ID 777")).toBeTruthy();
    // The internal key addresses the profile; it is never shown.
    expect(screen.queryByText(/tutor-175/)).toBeNull();
  });

  it("reads out what was sent, with the catalog names the server supplied", () => {
    loaded();
    render(<GuardianTutorProfileContent requestId={13} tutorId="tutor-175" />);

    expect(screen.getByText("University of Dhaka")).toBeTruthy();
    expect(screen.getByText("Applied Physics")).toBeTruthy();
    expect(screen.getByText("Physics")).toBeTruthy();
    expect(screen.getByText("Notre Dame College · Science · 2017")).toBeTruthy();
    expect(screen.getByText("I teach with patience.")).toBeTruthy();
  });

  it("shows no empty rows and none of the Tutor's own progress counts", () => {
    loaded();
    render(<GuardianTutorProfileContent requestId={13} tutorId="tutor-175" />);

    expect(screen.queryByText("Not given")).toBeNull();
    expect(screen.queryByText(/required filled/)).toBeNull();
    expect(screen.queryByText("Profile preview")).toBeNull();
  });

  it("says so when the profile cannot be opened", () => {
    mocks.result = { data: undefined, isLoading: false, isError: true, error: { message: "This Tutor profile is unavailable." } };
    render(<GuardianTutorProfileContent requestId={13} tutorId="tutor-404" />);
    expect(screen.getByText("This Tutor profile is unavailable.")).toBeTruthy();
  });
});

describe("withoutMissingRows", () => {
  it("drops empty rows, then any card and section left with nothing", () => {
    const sections: TutorProfileReadoutSection[] = [
      { id: "a", title: "Personal Information", groups: [
        { heading: "Identity and contact", rows: [{ label: "Full name", value: "Tania", missing: false }, { label: "Gender", value: "Not given", missing: true }] },
        { heading: "Family", rows: [{ label: "Father", value: "Not given", missing: true }] },
      ] },
      { id: "e", title: "Introduction and review", groups: [{ rows: [{ label: "About me", value: "Not given", missing: true, optional: true }] }] },
    ];

    expect(withoutMissingRows(sections)).toEqual([
      { id: "a", title: "Personal Information", groups: [{ heading: "Identity and contact", rows: [{ label: "Full name", value: "Tania", missing: false }] }] },
    ]);
  });
});
