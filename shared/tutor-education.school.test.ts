import { describe, expect, it } from "vitest";
import {
  educationRecordFieldApplies,
  fixedSchoolRecords,
  historyQualificationLevels,
  isSchoolQualification,
  schoolQualificationLevels,
  schoolSubjectGroups,
} from "./tutor-education";

describe("which qualification-history fields a record draws", () => {
  it("counts SSC and HSC as school records, and nothing else", () => {
    expect(schoolQualificationLevels).toEqual(["SSC", "HSC"]);
    expect(isSchoolQualification("SSC")).toBe(true);
    expect(isSchoolQualification("HSC")).toBe(true);
    expect(isSchoolQualification("Honours")).toBe(false);
    expect(isSchoolQualification("Masters")).toBe(false);
    // A record whose level has not been picked yet is not a school record, so
    // it draws the university set until the Tutor says otherwise.
    expect(isSchoolQualification("")).toBe(false);
    expect(isSchoolQualification(null)).toBe(false);
  });

  it("gives a board exam a passing year, a roll and a registration number", () => {
    for (const level of ["SSC", "HSC"]) {
      expect(educationRecordFieldApplies("educationRecords.passingYear", level), level).toBe(true);
      expect(educationRecordFieldApplies("educationRecords.rollNumber", level), level).toBe(true);
      expect(educationRecordFieldApplies("educationRecords.registrationNumber", level), level).toBe(true);
    }
  });

  it("keeps the study span and the ID card off a board exam", () => {
    // A board exam is passed in one year: asking it for a start year, an end
    // year, whether it is ongoing, or an institute ID card asks for something
    // that does not exist.
    for (const field of ["studyStartYear", "studyEndYear", "currentlyStudying", "instituteIdCardNumber"]) {
      expect(educationRecordFieldApplies(`educationRecords.${field}`, "SSC"), field).toBe(false);
      expect(educationRecordFieldApplies(`educationRecords.${field}`, "Honours"), field).toBe(true);
    }
  });

  it("keeps the board-exam fields off a degree", () => {
    for (const field of ["passingYear", "rollNumber", "registrationNumber"]) {
      expect(educationRecordFieldApplies(`educationRecords.${field}`, "Masters"), field).toBe(false);
    }
  });

  it("draws the fields both kinds share whichever level it is", () => {
    for (const field of ["qualificationLevel", "instituteName", "degreeExamTitle", "majorGroup", "curriculum", "resultGpa"]) {
      expect(educationRecordFieldApplies(`educationRecords.${field}`, "HSC"), field).toBe(true);
      expect(educationRecordFieldApplies(`educationRecords.${field}`, "Honours"), field).toBe(true);
    }
  });

  it("offers the three groups a board exam is sat under", () => {
    expect(schoolSubjectGroups).toEqual(["Science", "Arts", "Commerce"]);
  });
});

describe("the two fixed school sections", () => {
  it("names them by stage, not by the Bangla-board exam", () => {
    // A Tutor who read English Medium sat O and A Levels and has no SSC, so the
    // headings have to fit them too; what they sat is carried by the record's
    // own Curriculum and Degree / Exam Title.
    expect(fixedSchoolRecords.map(record => record.heading)).toEqual(["Secondary", "Higher Secondary"]);
  });

  it("still stores the levels the rest of the system already knows", () => {
    expect(fixedSchoolRecords.map(record => record.level)).toEqual(["SSC", "HSC"]);
    for (const { level } of fixedSchoolRecords) expect(isSchoolQualification(level)).toBe(true);
  });

  it("offers degrees only in the repeatable history", () => {
    // Secondary and Higher Secondary have sections of their own; offering them
    // here would invite a second, contradictory copy of a filled-in record.
    expect(historyQualificationLevels).toEqual(["Honours", "Masters"]);
    for (const level of historyQualificationLevels) expect(isSchoolQualification(level)).toBe(false);
  });
});
