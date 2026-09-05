import {
  academicEducationLevels,
  asEducationOption,
  qualificationCurricula,
  qualificationEducationLevels,
  type AcademicEducationLevel,
  type QualificationCurriculum,
  type QualificationEducationLevel,
} from "@shared/tutor-education";
import { isTutorSupportingDocumentType, type TutorSupportingDocumentType } from "@shared/tutor-documents";
import { DEFAULT_TUTOR_NATIONALITY } from "@shared/tutor-personal-details";

export type TutorOnboardingFallback = {
  name: string;
  phone: string;
  contactEmail: string;
  gender: "male" | "female";
  cityId: string;
  locationId: string;
};

export type PersistedTutorProfileForForm = {
  name: string;
  phone: string | null;
  contactEmail: string | null;
  gender: "male" | "female";
  currentCityId: string | null;
  currentLocationId: string | null;
  tutorNumber: number | null;
  registeredAt: Date | string | null;
  profileStatus: string;
  accountStatus: string;
  completionPercentage: number;
  assignedRequestCount: number;
  lastUpdatedAt: Date | string | null;
  teachingAreaIds: string[];
  availableNationwide: boolean;
  universityId: number | null;
  facultyDepartmentId: number | null;
  degreeMajorId?: number | null;
  profilePhotoUrl?: string | null;
  dateOfBirth: Date | string | null;
  headline: string | null;
  highestEducation: string | null;
  degreeExamTitle?: string | null;
  resultGpa?: string | null;
  deptId?: string | null;
  studyStatus: "studying" | "graduated" | "professional" | null;
  yearSemester?: string | null;
  graduationYear: number | null;
  tuitionType?: "home" | "online" | "both" | null;
  preferredStudentGender?: "male" | "female" | "both" | null;
  preferredClassSizes?: string[];
  preferredTeachingDays?: string[];
  preferredTimeSlots?: string[];
  feeMin?: number | null;
  feeMax?: number | null;
  travelDistanceKm?: number | null;
  aboutMe?: string | null;
  teachingApproach?: string | null;
  whyChooseMe?: string | null;
  additionalNotes?: string | null;
  privateDetails?: TutorProfilePrivateDetails;
  educationRecords?: PersistedTutorEducationRecord[];
  universityIdDocumentStatus?: "uploaded" | "not_uploaded";
  uploadedSupportingDocuments?: string[];
  /** Why an Admin asked for changes. Set only while the profile is `changes_requested`. */
  moderationNote?: string | null;
  moderationNoteAt?: string | Date | null;
};

export type TutorProfilePrivateDetails = {
  additionalPhone?: string;
  nationality?: string;
  religion?: string;
  socialProfileLinks?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  emergencyContactAddress?: string;
};

/** The shape the form edits: every scalar is a string the inputs can hold. */
export type TutorProfileEducationRecord = {
  qualificationLevel: QualificationEducationLevel | "";
  instituteName: string;
  degreeExamTitle: string;
  majorGroup: string;
  resultGpa: string;
  curriculum: QualificationCurriculum | "";
  studyStartYear: string;
  studyEndYear: string;
  currentlyStudying: boolean;
  instituteIdCardNumber: string;
};

/**
 * The shape the server actually sends: the year columns are MySQL integers and
 * every nullable column can arrive as `undefined`. Kept separate from the form
 * record so the two can never be confused again — spreading the wire shape
 * straight into form state is what put numbers where strings were expected.
 */
export type PersistedTutorEducationRecord = {
  qualificationLevel?: string;
  instituteName?: string;
  degreeExamTitle?: string;
  majorGroup?: string;
  resultGpa?: string;
  curriculum?: string;
  studyStartYear?: number | string;
  studyEndYear?: number | string;
  currentlyStudying?: boolean;
  instituteIdCardNumber?: string;
};

const emptyPrivateDetails = (): TutorProfilePrivateDetails => ({
  additionalPhone: "", nationality: DEFAULT_TUTOR_NATIONALITY, religion: "", socialProfileLinks: "",
  fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", emergencyContactName: "", emergencyContactRelation: "",
  emergencyContactPhone: "", emergencyContactAddress: "",
});

const emptyEducationRecord = (): TutorProfileEducationRecord => ({
  qualificationLevel: "", instituteName: "", degreeExamTitle: "", majorGroup: "", resultGpa: "", curriculum: "",
  studyStartYear: "", studyEndYear: "", currentlyStudying: false, instituteIdCardNumber: "",
});

function toFormText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Same reason as `hydrateEducationRecord`: the server omits empty columns, and
 * spreading them over the defaults replaces `""` with `undefined`.
 */
function hydratePrivateDetails(details: TutorProfilePrivateDetails | undefined): TutorProfilePrivateDetails {
  const empty = emptyPrivateDetails();
  const hydrated = Object.fromEntries(
    (Object.keys(empty) as (keyof TutorProfilePrivateDetails)[]).map(key => [key, toFormText(details?.[key])]),
  ) as TutorProfilePrivateDetails;
  // Nationality now comes from a fixed list and defaults to Bangladeshi -
  // an older profile that never set it should show the default, not blank.
  if (!hydrated.nationality) hydrated.nationality = DEFAULT_TUTOR_NATIONALITY;
  return hydrated;
}

/**
 * Maps one stored record onto the form shape field by field. Deliberately not a
 * spread: the wire record carries integer years and `undefined` for empty
 * columns, both of which the string-typed inputs and payload builder choke on.
 */
function hydrateEducationRecord(record: PersistedTutorEducationRecord): TutorProfileEducationRecord {
  return {
    // Records saved before these lists existed fall back to the placeholder.
    qualificationLevel: asEducationOption(qualificationEducationLevels, record.qualificationLevel),
    curriculum: asEducationOption(qualificationCurricula, record.curriculum),
    instituteName: toFormText(record.instituteName),
    degreeExamTitle: toFormText(record.degreeExamTitle),
    majorGroup: toFormText(record.majorGroup),
    resultGpa: toFormText(record.resultGpa),
    studyStartYear: toFormText(record.studyStartYear),
    studyEndYear: toFormText(record.studyEndYear),
    currentlyStudying: Boolean(record.currentlyStudying),
    instituteIdCardNumber: toFormText(record.instituteIdCardNumber),
  };
}

export type TutorProfileFormState = {
  tutorNumber: number | null;
  registeredAt: Date | string | null;
  profilePhotoUrl: string | null;
  name: string;
  gender: "male" | "female";
  dateOfBirth: string;
  headline: string;
  phone: string;
  contactEmail: string;
  currentCityId: string;
  currentLocationId: string;
  teachingAreaIds: string[];
  availableNationwide: boolean;
  highestEducation: AcademicEducationLevel | "";
  universityId: string;
  facultyDepartmentId: string;
  degreeExamTitle: string;
  resultGpa: string;
  deptId: string;
  studyStatus: "" | "studying" | "graduated" | "professional";
  yearSemester: string;
  graduationYear: string;
  tuitionType: "" | "home" | "online" | "both";
  preferredStudentGender: "" | "male" | "female" | "both";
  preferredClassSizes: string[];
  preferredTeachingDays: string[];
  preferredTimeSlots: string[];
  feeMin: string;
  feeMax: string;
  travelDistanceKm: string;
  aboutMe: string;
  teachingApproach: string;
  whyChooseMe: string;
  additionalNotes: string;
  privateDetails: TutorProfilePrivateDetails;
  educationRecords: TutorProfileEducationRecord[];
  universityIdDocumentStatus: "uploaded" | "not_uploaded";
  uploadedSupportingDocuments: TutorSupportingDocumentType[];
};

function toDateInput(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function optionalId(value: string): number | undefined {
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

function optionalInteger(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : undefined;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function hydrateTutorProfileForm(
  profile: PersistedTutorProfileForForm | null | undefined,
  onboardingFallback: TutorOnboardingFallback | null,
): TutorProfileFormState {
  if (!profile) {
    return {
      tutorNumber: null,
      registeredAt: null,
      profilePhotoUrl: null,
      name: onboardingFallback?.name ?? "",
      gender: onboardingFallback?.gender ?? "male",
      dateOfBirth: "",
      headline: "",
      phone: onboardingFallback?.phone ?? "",
      contactEmail: onboardingFallback?.contactEmail ?? "",
      currentCityId: onboardingFallback?.cityId ?? "",
      currentLocationId: onboardingFallback?.locationId ?? "",
      teachingAreaIds: [],
      availableNationwide: false,
      highestEducation: "",
      universityId: "",
      facultyDepartmentId: "",
      degreeExamTitle: "",
      resultGpa: "",
      deptId: "",
      studyStatus: "",
      yearSemester: "",
      graduationYear: "",
      tuitionType: "",
      preferredStudentGender: "",
      preferredClassSizes: [],
      preferredTeachingDays: [],
      preferredTimeSlots: [],
      feeMin: "",
      feeMax: "",
      travelDistanceKm: "",
      aboutMe: "",
      teachingApproach: "",
      whyChooseMe: "",
      additionalNotes: "",
      privateDetails: emptyPrivateDetails(),
      educationRecords: [emptyEducationRecord()],
      universityIdDocumentStatus: "not_uploaded",
      uploadedSupportingDocuments: [],
    };
  }

  return {
    tutorNumber: profile.tutorNumber,
    registeredAt: profile.registeredAt,
    profilePhotoUrl: profile.profilePhotoUrl ?? null,
    name: profile.name,
    gender: profile.gender,
    dateOfBirth: toDateInput(profile.dateOfBirth),
    headline: profile.headline ?? "",
    phone: profile.phone ?? "",
    contactEmail: profile.contactEmail ?? "",
    currentCityId: profile.currentCityId ?? "",
    currentLocationId: profile.currentLocationId ?? "",
    teachingAreaIds: profile.teachingAreaIds,
    availableNationwide: profile.availableNationwide,
    highestEducation: asEducationOption(academicEducationLevels, profile.highestEducation),
    universityId: profile.universityId ? String(profile.universityId) : "",
    facultyDepartmentId: profile.facultyDepartmentId ? String(profile.facultyDepartmentId) : "",
    degreeExamTitle: profile.degreeExamTitle ?? "",
    resultGpa: profile.resultGpa ?? "",
    deptId: profile.deptId ?? "",
    studyStatus: profile.studyStatus ?? "",
    yearSemester: profile.yearSemester ?? "",
    graduationYear: profile.graduationYear ? String(profile.graduationYear) : "",
    tuitionType: profile.tuitionType ?? "",
    preferredStudentGender: profile.preferredStudentGender ?? "",
    preferredClassSizes: toStringList(profile.preferredClassSizes),
    preferredTeachingDays: toStringList(profile.preferredTeachingDays),
    preferredTimeSlots: toStringList(profile.preferredTimeSlots),
    feeMin: profile.feeMin === null || profile.feeMin === undefined ? "" : String(profile.feeMin),
    feeMax: profile.feeMax === null || profile.feeMax === undefined ? "" : String(profile.feeMax),
    travelDistanceKm: profile.travelDistanceKm === null || profile.travelDistanceKm === undefined ? "" : String(profile.travelDistanceKm),
    aboutMe: profile.aboutMe ?? "",
    teachingApproach: profile.teachingApproach ?? "",
    whyChooseMe: profile.whyChooseMe ?? "",
    additionalNotes: profile.additionalNotes ?? "",
    privateDetails: hydratePrivateDetails(profile.privateDetails),
    educationRecords: profile.educationRecords?.length
      ? profile.educationRecords.map(hydrateEducationRecord)
      : [emptyEducationRecord()],
    universityIdDocumentStatus: profile.universityIdDocumentStatus ?? "not_uploaded",
    uploadedSupportingDocuments: (profile.uploadedSupportingDocuments ?? []).filter(isTutorSupportingDocumentType),
  };
}

/**
 * Maps editable Sections A–G fields only. Identity, review state, and raw object
 * storage keys remain server-owned and can never be emitted from this client helper.
 */
export function createProfileDraftPayload(form: TutorProfileFormState) {
  const graduationYear = form.graduationYear ? Number(form.graduationYear) : undefined;
  return {
    name: form.name.trim(),
    gender: form.gender,
    dateOfBirth: optionalText(form.dateOfBirth),
    headline: optionalText(form.headline),
    phone: form.phone.trim(),
    contactEmail: form.contactEmail.trim(),
    currentCityId: optionalText(form.currentCityId),
    currentLocationId: optionalText(form.currentLocationId),
    ...(form.teachingAreaIds.length > 0 ? { teachingAreaIds: form.teachingAreaIds } : {}),
    availableNationwide: form.availableNationwide,
    highestEducation: form.highestEducation || undefined,
    universityId: optionalId(form.universityId),
    facultyDepartmentId: optionalId(form.facultyDepartmentId),
    degreeExamTitle: optionalText(form.degreeExamTitle),
    resultGpa: optionalText(form.resultGpa),
    deptId: optionalText(form.deptId),
    studyStatus: form.studyStatus || undefined,
    yearSemester: optionalText(form.yearSemester),
    graduationYear: Number.isInteger(graduationYear) ? graduationYear : undefined,
    tuitionType: form.tuitionType || undefined,
    preferredStudentGender: form.preferredStudentGender || undefined,
    ...(form.preferredClassSizes.length > 0 ? { preferredClassSizes: form.preferredClassSizes } : {}),
    ...(form.preferredTeachingDays.length > 0 ? { preferredTeachingDays: form.preferredTeachingDays } : {}),
    ...(form.preferredTimeSlots.length > 0 ? { preferredTimeSlots: form.preferredTimeSlots } : {}),
    feeMin: optionalInteger(form.feeMin),
    feeMax: optionalInteger(form.feeMax),
    travelDistanceKm: optionalInteger(form.travelDistanceKm),
    aboutMe: optionalText(form.aboutMe),
    teachingApproach: optionalText(form.teachingApproach),
    whyChooseMe: optionalText(form.whyChooseMe),
    additionalNotes: optionalText(form.additionalNotes),
    privateDetails: {
      additionalPhone: form.privateDetails.additionalPhone?.trim() ?? "",
      // The server keeps these two columns (existing rows are untouched); the
      // form no longer collects them, so nothing is ever sent for them.
      presentAddress: undefined,
      permanentAddress: undefined,
      nationality: form.privateDetails.nationality?.trim() ?? "",
      religion: form.privateDetails.religion?.trim() ?? "",
      socialProfileLinks: form.privateDetails.socialProfileLinks?.trim() ?? "",
      fatherName: form.privateDetails.fatherName?.trim() ?? "",
      fatherPhone: form.privateDetails.fatherPhone?.trim() ?? "",
      motherName: form.privateDetails.motherName?.trim() ?? "",
      motherPhone: form.privateDetails.motherPhone?.trim() ?? "",
      emergencyContactName: form.privateDetails.emergencyContactName?.trim() ?? "",
      emergencyContactRelation: form.privateDetails.emergencyContactRelation?.trim() ?? "",
      emergencyContactPhone: form.privateDetails.emergencyContactPhone?.trim() ?? "",
      emergencyContactAddress: form.privateDetails.emergencyContactAddress?.trim() ?? "",
    },
    educationRecords: form.educationRecords.filter(record => [record.qualificationLevel, record.instituteName, record.degreeExamTitle, record.majorGroup, record.studyStartYear].some(Boolean)).map(record => ({
      // A half-filled record is still sent so the server can answer with a
      // field-level error the editor can show. Casting here keeps that path:
      // dropping the record instead would silently discard what was typed.
      qualificationLevel: record.qualificationLevel as QualificationEducationLevel,
      instituteName: record.instituteName.trim(),
      degreeExamTitle: record.degreeExamTitle.trim(),
      majorGroup: record.majorGroup.trim(),
      resultGpa: optionalText(record.resultGpa),
      curriculum: record.curriculum as QualificationCurriculum,
      studyStartYear: optionalInteger(record.studyStartYear) as number,
      studyEndYear: record.currentlyStudying ? undefined : optionalInteger(record.studyEndYear),
      currentlyStudying: record.currentlyStudying,
      instituteIdCardNumber: optionalText(record.instituteIdCardNumber),
    })),
  };
}

/**
 * Provides immediate feedback for rules that can be evaluated without exposing
 * server-owned profile state. The server remains the final validation authority.
 */
export function getProfileDraftFeedback(form: TutorProfileFormState): string | null {
  const feeMin = optionalInteger(form.feeMin);
  const feeMax = optionalInteger(form.feeMax);

  if (feeMin !== undefined && feeMax !== undefined && feeMin > feeMax) {
    return "Maximum monthly fee must be greater than or equal to the minimum fee.";
  }

  return null;
}
