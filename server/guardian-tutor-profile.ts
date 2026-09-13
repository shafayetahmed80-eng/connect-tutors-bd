/**
 * A Tutor's profile as a Guardian may read it.
 *
 * Built by naming what goes in rather than deleting what should not: a field
 * the Tutor profile gains tomorrow stays out of this object until someone
 * decides a Guardian should see it. Two gates apply to every field, and both
 * run here, on the server:
 *
 * - the code-owned floor (`isGuardianPrivateField`) - contact, family and
 *   emergency contact, documents, notes for the review team - which no
 *   configuration can open, however it arrives;
 * - the Admin's choice (`guardianVisible`), on a field that is enabled at all.
 */
import { isSchoolQualification } from "@shared/tutor-education";
import {
  isGuardianPrivateField,
  type ResolvedTutorProfileField,
  type ResolvedTutorProfileFieldConfig,
} from "@shared/tutor-profile-field-registry";

type RecordSource = { qualificationLevel: string | null } & Record<string, unknown>;

/** The parts of the owner's profile DTO this reads. Everything else on it is never looked at. */
export type GuardianProfileSource = {
  tutorId: string;
  educationRecords?: RecordSource[];
  privateDetails?: Record<string, unknown>;
} & Record<string, unknown>;

export type GuardianTutorProfile = {
  /** The internal key, for addressing the profile. Never shown. */
  tutorId: string;
  /** The Tutor ID people see. */
  tutorNumber: number | null;
  name?: string;
  profilePhotoUrl?: string;
  headline?: string;
} & Record<string, unknown>;

/** Fields stored under their own id on the profile. */
const valueFieldIds = [
  "name", "profilePhotoUrl", "gender", "dateOfBirth", "headline",
  "highestEducation", "universityId", "facultyDepartmentId", "degreeExamTitle", "resultGpa", "deptId",
  "studyStatus", "yearSemester", "graduationYear",
  "teachingExperienceYears", "priorTeachingExperience", "specialExpertise", "academicAchievement",
  "tuitionType", "preferredStudentGender", "currentCityId", "currentLocationId",
  "feeMin", "feeMax", "travelDistanceKm",
  "aboutMe", "teachingApproach", "whyChooseMe",
] as const;

/** List fields: sent empty rather than absent, because the read-out maps over them. */
const listFieldIds = [
  "primarySubjectIds", "additionalSubjectIds", "classLevelIds", "curriculumIds",
  "preferredClassSizes", "preferredTeachingDays", "preferredTimeSlots", "teachingAreaIds",
] as const;

/** The private-details keys that are not on the floor. */
const privateDetailKeys = ["nationality", "religion"] as const;

/**
 * Keys of one education record, each shown by its own `educationRecords.<key>`
 * field. The level itself always goes: it is what sorts a record into
 * Secondary, Higher Secondary or the history, and it is not personal.
 */
const recordKeys = [
  "instituteName", "degreeExamTitle", "majorGroup", "resultGpa", "curriculum",
  "studyStartYear", "studyEndYear", "currentlyStudying", "instituteIdCardNumber",
  "passingYear", "rollNumber", "registrationNumber",
] as const;

export function guardianCanReadField(config: ResolvedTutorProfileFieldConfig, fieldId: string): boolean {
  if (isGuardianPrivateField(fieldId)) return false;
  const field = config.byId.get(fieldId);
  return Boolean(field?.enabled && field.guardianVisible);
}

export function projectTutorProfileForGuardian(profile: GuardianProfileSource, config: ResolvedTutorProfileFieldConfig): GuardianTutorProfile {
  const readable = (fieldId: string) => guardianCanReadField(config, fieldId);
  const tutorNumber = typeof profile.tutorNumber === "number" ? profile.tutorNumber : null;
  const projected: Record<string, unknown> = { tutorId: profile.tutorId, tutorNumber };

  for (const fieldId of valueFieldIds) {
    if (readable(fieldId) && profile[fieldId] !== undefined && profile[fieldId] !== null) projected[fieldId] = profile[fieldId];
  }
  for (const fieldId of listFieldIds) {
    projected[fieldId] = readable(fieldId) && Array.isArray(profile[fieldId]) ? profile[fieldId] : [];
  }
  projected.availableNationwide = readable("availableNationwide") ? Boolean(profile.availableNationwide) : false;

  const privateDetails: Record<string, unknown> = {};
  for (const key of privateDetailKeys) {
    const value = profile.privateDetails?.[key];
    if (readable(`privateDetails.${key}`) && value !== undefined && value !== null) privateDetails[key] = value;
  }
  projected.privateDetails = privateDetails;

  const recordReadable = (level: string | null) => level === "SSC" ? readable("secondaryRecord")
    : level === "HSC" ? readable("higherSecondaryRecord")
      : !isSchoolQualification(level) && readable("educationRecords");
  projected.educationRecords = (profile.educationRecords ?? [])
    .filter(record => recordReadable(record.qualificationLevel))
    .map(record => {
      const out: Record<string, unknown> = { qualificationLevel: record.qualificationLevel };
      for (const key of recordKeys) {
        if (readable(`educationRecords.${key}`) && record[key] !== undefined && record[key] !== null) out[key] = record[key];
      }
      return out;
    });

  return projected as GuardianTutorProfile;
}

/**
 * The field config sent with the profile: only what the Guardian can read,
 * and nothing marked required - the Tutor's own "still missing" colouring
 * means nothing to a Guardian.
 */
export function guardianReadableFields(config: ResolvedTutorProfileFieldConfig): ResolvedTutorProfileField[] {
  return config.all
    .filter(field => guardianCanReadField(config, field.id))
    .map(field => ({ ...field, required: false }));
}

const asIds = (value: unknown): Array<number | string> => Array.isArray(value) ? value.filter(id => id !== null && id !== undefined) as Array<number | string> : [];
const asId = (value: unknown): number | string | null => typeof value === "number" || typeof value === "string" ? value : null;

/** The catalog ids to name, read from the projected profile so a hidden field's names are never looked up. */
export function guardianCatalogIds(profile: GuardianTutorProfile) {
  return {
    subjects: [...asIds(profile.primarySubjectIds), ...asIds(profile.additionalSubjectIds)],
    classLevels: asIds(profile.classLevelIds),
    curricula: asIds(profile.curriculumIds),
    universityId: asId(profile.universityId),
    facultyDepartmentId: asId(profile.facultyDepartmentId),
    locations: [asId(profile.currentCityId), asId(profile.currentLocationId), ...asIds(profile.teachingAreaIds)]
      .filter((id): id is string => typeof id === "string" && id !== ""),
  };
}
