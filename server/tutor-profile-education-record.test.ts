import { describe, expect, it } from "vitest";
import { educationRecordFromRow } from "./tutor-profile-education-record";
import { tutorProfileDraftSchema } from "./tutor-profile.validation";

type Row = Parameters<typeof educationRecordFromRow>[0];

/** A row as MariaDB hands it back: every column the Tutor was never shown is null. */
const emptyRow: Row = {
  id: 1,
  tutorId: "t-1",
  qualificationLevel: null,
  instituteName: null,
  degreeExamTitle: null,
  majorGroup: null,
  resultGpa: null,
  curriculum: null,
  studyStartYear: null,
  studyEndYear: null,
  currentlyStudying: 0,
  instituteIdCardNumber: null,
  passingYear: null,
  rollNumber: null,
  registrationNumber: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
} as Row;

describe("educationRecordFromRow", () => {
  it("reads a stored school record back so the profile still validates - no study years, no nulls", () => {
    const record = educationRecordFromRow({
      ...emptyRow,
      qualificationLevel: "SSC",
      instituteName: "Dhanmondi Government Boys' High School",
      degreeExamTitle: "Secondary School Certificate",
      majorGroup: "Science",
      curriculum: "Bangla Version",
      passingYear: 2013,
    });

    expect(record.studyStartYear).toBeUndefined();
    expect(Object.values(record)).not.toContain(null);
    expect(tutorProfileDraftSchema.safeParse({ educationRecords: [record] }).success).toBe(true);
  });

  it("reads a half-typed record back too, whichever columns were left empty", () => {
    const record = educationRecordFromRow({ ...emptyRow, qualificationLevel: "HSC", passingYear: 2015 });

    expect(Object.values(record)).not.toContain(null);
    expect(tutorProfileDraftSchema.safeParse({ educationRecords: [record] }).success).toBe(true);
  });

  it("keeps what was stored, and reads the 0/1 flag as a boolean", () => {
    const record = educationRecordFromRow({
      ...emptyRow,
      qualificationLevel: "Honours",
      instituteName: "University of Dhaka",
      studyStartYear: 2018,
      studyEndYear: 2022,
      currentlyStudying: 1,
    });

    expect(record).toMatchObject({ qualificationLevel: "Honours", instituteName: "University of Dhaka", studyStartYear: 2018, studyEndYear: 2022, currentlyStudying: true });
  });
});
