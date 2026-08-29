import { describe, expect, it } from "vitest";
import {
  JOB_BOARD_DISCLOSURE_NOTICE,
  getJobBoardApplicationCopy,
  getJobBoardCardFacts,
  getJobBoardDetailFacts,
  getTutorInterestPresentation,
} from "./JobBoard";

describe("public Job Board disclosures", () => {
  const genderedJob = { studentCount: 2, studentGender: "female" as const, preferredTutorGender: "male" as const };

  it("shows Student Gender only in the approved Job Board detail facts", () => {
    expect(getJobBoardCardFacts(genderedJob)).toEqual([
      { label: "Number of Students", value: "2 students" },
      { label: "Preferred Tutor", value: "Male tutor preferred" },
    ]);
    expect(getJobBoardDetailFacts(genderedJob)).toEqual([
      { label: "Number of Students", value: "2 students" },
      { label: "Student Gender", value: "Female" },
      { label: "Preferred Tutor", value: "Male tutor preferred" },
    ]);
  });

  it("hides an omitted optional Student Gender without hiding Teacher Preference", () => {
    expect(getJobBoardDetailFacts({ studentCount: 1, studentGender: null, preferredTutorGender: "any" })).toEqual([
      { label: "Number of Students", value: "1 student" },
      { label: "Preferred Tutor", value: "Any tutor preferred" },
    ]);
  });

  it("states that Student Gender is the only student-related disclosure while identity and Guardian contact details remain private", () => {
    expect(JOB_BOARD_DISCLOSURE_NOTICE).toMatch(/Only Student Gender may be shown/i);
    expect(JOB_BOARD_DISCLOSURE_NOTICE).toMatch(/Student name/i);
    expect(JOB_BOARD_DISCLOSURE_NOTICE).toMatch(/Guardian phone, email, exact address, and private notes/i);
  });

  it("keeps an Apply Now button for public and unapproved Tutor routes while using concise, safe helper copy", () => {
    expect(getJobBoardApplicationCopy({ isTutor: false, isApprovedTutor: false })).toEqual({
      label: "Apply Now",
      description: "Sign in as a Tutor to continue.",
    });
    expect(getJobBoardApplicationCopy({ isTutor: true, isApprovedTutor: false })).toEqual({
      label: "Apply Now",
      description: "Profile approval is required before applying.",
    });
  });

  it("removes helper copy for an approved Tutor's explicit application action without weakening application states", () => {
    expect(getJobBoardApplicationCopy({ isTutor: true, isApprovedTutor: true })).toEqual({
      label: "Apply Now",
      description: null,
    });
    expect(getTutorInterestPresentation()).toEqual({
      statusLabel: null,
      description: null,
      action: "express",
      actionLabel: "Apply Now",
    });
    expect(getTutorInterestPresentation("shortlisted")).toMatchObject({
      statusLabel: "Shortlisted",
      description: null,
      action: "withdraw",
    });
    expect(getTutorInterestPresentation("matched")).toMatchObject({
      statusLabel: "Matched",
      description: null,
      action: null,
    });
  });
});
