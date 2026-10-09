import type { tutorEducationRecords } from "../drizzle/schema";

/**
 * A stored education record, as the profile's own input shape.
 *
 * Every column below except `currentlyStudying` is nullable, and the input
 * schema takes "absent" but never `null`. A school record (SSC, HSC) has no
 * study years, so those are always null in the database; passing that straight
 * through made every later save of any other section - which re-validates the
 * stored records along with the new values - refuse with "expected number,
 * received null", and the same for final submission.
 */
export function educationRecordFromRow(record: typeof tutorEducationRecords.$inferSelect) {
  return {
    qualificationLevel: record.qualificationLevel ?? undefined,
    instituteName: record.instituteName ?? undefined,
    degreeExamTitle: record.degreeExamTitle ?? undefined,
    majorGroup: record.majorGroup ?? undefined,
    resultGpa: record.resultGpa ?? undefined,
    curriculum: record.curriculum ?? undefined,
    studyStartYear: record.studyStartYear ?? undefined,
    studyEndYear: record.studyEndYear ?? undefined,
    currentlyStudying: Boolean(record.currentlyStudying),
    instituteIdCardNumber: record.instituteIdCardNumber ?? undefined,
    passingYear: record.passingYear ?? undefined,
    rollNumber: record.rollNumber ?? undefined,
    registrationNumber: record.registrationNumber ?? undefined,
  };
}
