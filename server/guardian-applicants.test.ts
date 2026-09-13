import { describe, expect, it } from "vitest";
import {
  guardianMaySeeApplicantPhone,
  isGuardianApplicantStage,
  pickGuardianApplicantEducation,
} from "./guardian-applicants";

const school = (qualificationLevel: string, instituteName: string, majorGroup: string | null) => ({ qualificationLevel, instituteName, majorGroup });
const noAcademic = { highestEducation: null, universityName: null, departmentName: null };

describe("which school introduces an applicant", () => {
  it("takes Honours first, with its own department", () => {
    expect(pickGuardianApplicantEducation(
      { highestEducation: "Honours", universityName: "University of Dhaka", departmentName: "Physics" },
      [school("HSC", "Notre Dame College", "Science"), school("Masters", "Jahangirnagar University", "Chemistry")],
    )).toEqual({ instituteName: "University of Dhaka", departmentName: "Physics" });
  });

  it("finds Honours in the Qualification history when the University Section is a Masters", () => {
    expect(pickGuardianApplicantEducation(
      { highestEducation: "Masters", universityName: "Jahangirnagar University", departmentName: "Chemistry" },
      [school("Honours", "Rajshahi University", "Botany")],
    )).toEqual({ instituteName: "Rajshahi University", departmentName: "Botany" });
  });

  it("falls to Masters, then Higher Secondary, then Secondary", () => {
    expect(pickGuardianApplicantEducation(
      { highestEducation: "Masters", universityName: "Jahangirnagar University", departmentName: "Chemistry" },
      [school("HSC", "Notre Dame College", "Science")],
    )).toEqual({ instituteName: "Jahangirnagar University", departmentName: "Chemistry" });

    expect(pickGuardianApplicantEducation(noAcademic, [school("SSC", "Motijheel Model School", "Commerce"), school("HSC", "Dhaka College", "Arts")]))
      .toEqual({ instituteName: "Dhaka College", departmentName: "Arts" });

    expect(pickGuardianApplicantEducation(null, [school("SSC", "Motijheel Model School", "Commerce")]))
      .toEqual({ instituteName: "Motijheel Model School", departmentName: "Commerce" });
  });

  it("never pairs an institute with a department from another level", () => {
    // Honours was started without a subject; the HSC group must not stand in for it.
    expect(pickGuardianApplicantEducation(null, [school("Honours", "BRAC University", null), school("HSC", "Dhaka College", "Science")]))
      .toEqual({ instituteName: "BRAC University", departmentName: null });
  });

  it("skips a level whose institute was left blank", () => {
    expect(pickGuardianApplicantEducation(
      { highestEducation: "Honours", universityName: null, departmentName: "Physics" },
      [school("Honours", "   ", "Physics"), school("HSC", "Dhaka College", "Science")],
    )).toEqual({ instituteName: "Dhaka College", departmentName: "Science" });
  });

  it("still ranks a University Section with no Education Level above school", () => {
    expect(pickGuardianApplicantEducation(
      { highestEducation: null, universityName: "North South University", departmentName: "Economics" },
      [school("HSC", "Dhaka College", "Commerce")],
    )).toEqual({ instituteName: "North South University", departmentName: "Economics" });
  });

  it("says nothing when the Tutor filled in no education", () => {
    expect(pickGuardianApplicantEducation(null, [])).toEqual({ instituteName: null, departmentName: null });
  });
});

describe("whose mobile number reaches the Guardian", () => {
  it("is only the appointed Tutor's, and only once appointed", () => {
    expect(guardianMaySeeApplicantPhone({ lifecycle: "appointed", tutorId: "tutor-175" }, "tutor-175")).toBe(true);
    expect(guardianMaySeeApplicantPhone({ lifecycle: "appointed", tutorId: "tutor-175" }, "tutor-404")).toBe(false);
    expect(guardianMaySeeApplicantPhone({ lifecycle: "live", tutorId: null }, "tutor-175")).toBe(false);
    // A Tutor recorded on a request that fell back to Live is no longer appointed.
    expect(guardianMaySeeApplicantPhone({ lifecycle: "live", tutorId: "tutor-175" }, "tutor-175")).toBe(false);
  });
});

describe("when a tuition's applicants can be read", () => {
  it("is while Live or Appointed", () => {
    expect(isGuardianApplicantStage("live")).toBe(true);
    expect(isGuardianApplicantStage("appointed")).toBe(true);
    for (const stage of ["pending", "confirmed", "cancelled"] as const) expect(isGuardianApplicantStage(stage)).toBe(false);
  });
});
