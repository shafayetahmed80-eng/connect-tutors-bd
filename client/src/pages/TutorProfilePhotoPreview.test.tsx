// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  saveDraft: vi.fn(),
  submitProfile: vi.fn(),
}));

vi.mock("@/lib/trpc", () => {
  const emptyQuery = () => ({ data: [] });
  return {
    trpc: {
      useUtils: () => ({
        tutor: {
          getMyProfile: { invalidate: trpcMocks.invalidate },
          getDashboardStats: { invalidate: trpcMocks.invalidate },
        },
      }),
      tutor: {
        saveProfileDraft: { useMutation: () => ({ mutateAsync: trpcMocks.saveDraft, isPending: false }) },
        submitProfile: { useMutation: () => ({ mutateAsync: trpcMocks.submitProfile, isPending: false }) },
      },
      catalog: {
        searchUniversities: { useQuery: emptyQuery },
        searchAcademicFaculties: { useQuery: emptyQuery },
        searchFacultyDepartments: { useQuery: emptyQuery },
        searchDegreeMajors: { useQuery: emptyQuery },
        searchSubjects: { useQuery: emptyQuery },
        searchClassLevels: { useQuery: emptyQuery },
        searchCurricula: { useQuery: emptyQuery },
        searchStudentTypes: { useQuery: emptyQuery },
        searchLanguages: { useQuery: emptyQuery },
        searchBangladeshLocations: { useQuery: emptyQuery },
      },
    },
  };
});

vi.mock("react-easy-crop", () => ({
  default: ({ image }: { image: string }) => <img alt="Selected photo crop preview" src={image} />,
}));

import { TutorProfileWorkspace } from "./TutorProfileWorkspace";

const completeProfile = {
  tutorNumber: 1504,
  registeredAt: "2026-08-19T00:00:00.000Z",
  profileStatus: "draft",
  accountStatus: "active",
  completionPercentage: 100,
  assignedRequestCount: 0,
  lastUpdatedAt: "2026-08-19T00:00:00.000Z",
  profilePhotoUrl: "https://example.test/private-photo.jpg",
  name: "Test Tutor",
  gender: "male" as const,
  dateOfBirth: "1998-02-10",
  headline: "Experienced Mathematics Tutor",
  phone: "+8801712345678",
  contactEmail: "tutor@example.test",
  currentLocationId: "1",
  teachingAreaIds: ["1"],
  availableNationwide: true,
  highestEducation: "BSc",
  universityId: 1,
  facultyId: 1,
  facultyDepartmentId: 1,
  degreeMajorId: 1,
  studyStatus: "graduated" as const,
  graduationYear: 2020,
  primarySubjectIds: ["1"],
  additionalSubjectIds: [],
  classLevelIds: ["1"],
  curriculumIds: ["1"],
  teachingExperienceYears: 3,
  studentTypeIds: ["1"],
  tuitionType: "both" as const,
  preferredStudentGender: "both" as const,
  preferredClassSizes: ["one-to-one"],
  preferredTeachingDays: ["saturday"],
  preferredTimeSlots: ["evening"],
  feeMin: 5000,
  feeMax: 7000,
  travelDistanceKm: null,
  teachingLanguageIds: [1],
  communicationPreferences: ["whatsapp"],
  aboutMe: null,
  teachingApproach: null,
  whyChooseMe: null,
  additionalNotes: null,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TutorProfileWorkspace photo preview", () => {
  it("opens the real crop editor and renders a preview of a newly selected photo before confirmation", () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:selected-profile-photo"),
      revokeObjectURL: vi.fn(),
    });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    // The photo control lives on the identity rail, not inside a section popup.
    fireEvent.change(screen.getByLabelText("Upload Tutor profile photo"), {
      target: { files: [new File(["source"], "selected.png", { type: "image/png" })] },
    });

    expect(screen.getByRole("heading", { name: /crop photo/i })).toBeTruthy();
    expect(screen.getByTestId("tutor-profile-photo-editor-crop-stage")).toBeTruthy();
    expect(screen.getByAltText("Selected photo crop preview").getAttribute("src")).toBe("blob:selected-profile-photo");
    expect(screen.getByRole("button", { name: /use this photo/i }).hasAttribute("disabled")).toBe(true);
  });
});
