export type TutorOnboardingFallback = {
  name: string;
  phone: string;
  contactEmail: string;
  gender: "male" | "female";
  locationId: string;
};

export type PersistedTutorProfileForForm = {
  name: string;
  phone: string | null;
  contactEmail: string | null;
  gender: "male" | "female";
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
  studyStatus: "studying" | "graduated" | "professional" | null;
  graduationYear: number | null;
  tuitionType?: "home" | "online" | "both" | null;
  preferredStudentGender?: "male" | "female" | "both" | null;
  preferredClassSizes?: string[];
  preferredTeachingDays?: string[];
  preferredTimeSlots?: string[];
  feeMin?: number | null;
  feeMax?: number | null;
  travelDistanceKm?: number | null;
  teachingLanguageIds?: number[];
  communicationPreferences?: string[];
  aboutMe?: string | null;
  teachingApproach?: string | null;
  whyChooseMe?: string | null;
  additionalNotes?: string | null;
  privateDetails?: TutorProfilePrivateDetails;
  educationRecords?: TutorProfileEducationRecord[];
  universityIdDocumentStatus?: "uploaded" | "not_uploaded";
};

export type TutorProfilePrivateDetails = {
  additionalPhone?: string;
  presentAddress?: string;
  permanentAddress?: string;
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

export type TutorProfileEducationRecord = {
  qualificationLevel: string;
  instituteName: string;
  degreeExamTitle: string;
  majorGroup: string;
  resultGpa: string;
  curriculum: string;
  studyStartDate: string;
  studyEndDate: string;
  passingYear: string;
  currentlyStudying: boolean;
  instituteIdCardNumber: string;
};

const emptyPrivateDetails = (): TutorProfilePrivateDetails => ({
  additionalPhone: "", presentAddress: "", permanentAddress: "", nationality: "", religion: "", socialProfileLinks: "",
  fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", emergencyContactName: "", emergencyContactRelation: "",
  emergencyContactPhone: "", emergencyContactAddress: "",
});

const emptyEducationRecord = (): TutorProfileEducationRecord => ({
  qualificationLevel: "", instituteName: "", degreeExamTitle: "", majorGroup: "", resultGpa: "", curriculum: "",
  studyStartDate: "", studyEndDate: "", passingYear: "", currentlyStudying: false, instituteIdCardNumber: "",
});

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
  currentLocationId: string;
  teachingAreaIds: string[];
  availableNationwide: boolean;
  highestEducation: string;
  universityId: string;
  facultyDepartmentId: string;
  studyStatus: "" | "studying" | "graduated" | "professional";
  graduationYear: string;
  tuitionType: "" | "home" | "online" | "both";
  preferredStudentGender: "" | "male" | "female" | "both";
  preferredClassSizes: string[];
  preferredTeachingDays: string[];
  preferredTimeSlots: string[];
  feeMin: string;
  feeMax: string;
  travelDistanceKm: string;
  teachingLanguageIds: string[];
  communicationPreferences: string[];
  aboutMe: string;
  teachingApproach: string;
  whyChooseMe: string;
  additionalNotes: string;
  privateDetails: TutorProfilePrivateDetails;
  educationRecords: TutorProfileEducationRecord[];
  universityIdDocumentStatus: "uploaded" | "not_uploaded";
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
      currentLocationId: onboardingFallback?.locationId ?? "",
      teachingAreaIds: [],
      availableNationwide: false,
      highestEducation: "",
      universityId: "",
      facultyDepartmentId: "",
      studyStatus: "",
      graduationYear: "",
      tuitionType: "",
      preferredStudentGender: "",
      preferredClassSizes: [],
      preferredTeachingDays: [],
      preferredTimeSlots: [],
      feeMin: "",
      feeMax: "",
      travelDistanceKm: "",
      teachingLanguageIds: [],
      communicationPreferences: [],
      aboutMe: "",
      teachingApproach: "",
      whyChooseMe: "",
      additionalNotes: "",
      privateDetails: emptyPrivateDetails(),
      educationRecords: [emptyEducationRecord()],
      universityIdDocumentStatus: "not_uploaded",
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
    currentLocationId: profile.currentLocationId ?? "",
    teachingAreaIds: profile.teachingAreaIds,
    availableNationwide: profile.availableNationwide,
    highestEducation: profile.highestEducation ?? "",
    universityId: profile.universityId ? String(profile.universityId) : "",
    facultyDepartmentId: profile.facultyDepartmentId ? String(profile.facultyDepartmentId) : "",
    studyStatus: profile.studyStatus ?? "",
    graduationYear: profile.graduationYear ? String(profile.graduationYear) : "",
    tuitionType: profile.tuitionType ?? "",
    preferredStudentGender: profile.preferredStudentGender ?? "",
    preferredClassSizes: toStringList(profile.preferredClassSizes),
    preferredTeachingDays: toStringList(profile.preferredTeachingDays),
    preferredTimeSlots: toStringList(profile.preferredTimeSlots),
    feeMin: profile.feeMin === null || profile.feeMin === undefined ? "" : String(profile.feeMin),
    feeMax: profile.feeMax === null || profile.feeMax === undefined ? "" : String(profile.feeMax),
    travelDistanceKm: profile.travelDistanceKm === null || profile.travelDistanceKm === undefined ? "" : String(profile.travelDistanceKm),
    teachingLanguageIds: toStringList(profile.teachingLanguageIds),
    communicationPreferences: toStringList(profile.communicationPreferences),
    aboutMe: profile.aboutMe ?? "",
    teachingApproach: profile.teachingApproach ?? "",
    whyChooseMe: profile.whyChooseMe ?? "",
    additionalNotes: profile.additionalNotes ?? "",
    privateDetails: { ...emptyPrivateDetails(), ...(profile.privateDetails ?? {}) },
    educationRecords: profile.educationRecords?.length ? profile.educationRecords.map(record => ({ ...emptyEducationRecord(), ...record })) : [emptyEducationRecord()],
    universityIdDocumentStatus: profile.universityIdDocumentStatus ?? "not_uploaded",
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
    currentLocationId: optionalText(form.currentLocationId),
    ...(form.teachingAreaIds.length > 0 ? { teachingAreaIds: form.teachingAreaIds } : {}),
    availableNationwide: form.availableNationwide,
    highestEducation: optionalText(form.highestEducation),
    universityId: optionalId(form.universityId),
    facultyDepartmentId: optionalId(form.facultyDepartmentId),
    studyStatus: form.studyStatus || undefined,
    graduationYear: Number.isInteger(graduationYear) ? graduationYear : undefined,
    tuitionType: form.tuitionType || undefined,
    preferredStudentGender: form.preferredStudentGender || undefined,
    ...(form.preferredClassSizes.length > 0 ? { preferredClassSizes: form.preferredClassSizes } : {}),
    ...(form.preferredTeachingDays.length > 0 ? { preferredTeachingDays: form.preferredTeachingDays } : {}),
    ...(form.preferredTimeSlots.length > 0 ? { preferredTimeSlots: form.preferredTimeSlots } : {}),
    feeMin: optionalInteger(form.feeMin),
    feeMax: optionalInteger(form.feeMax),
    travelDistanceKm: optionalInteger(form.travelDistanceKm),
    ...(form.teachingLanguageIds.length > 0
      ? { teachingLanguageIds: form.teachingLanguageIds.map(Number).filter(Number.isInteger) }
      : {}),
    ...(form.communicationPreferences.length > 0
      ? { communicationPreferences: form.communicationPreferences }
      : {}),
    aboutMe: optionalText(form.aboutMe),
    teachingApproach: optionalText(form.teachingApproach),
    whyChooseMe: optionalText(form.whyChooseMe),
    additionalNotes: optionalText(form.additionalNotes),
    privateDetails: {
      additionalPhone: form.privateDetails.additionalPhone?.trim() ?? "",
      presentAddress: form.privateDetails.presentAddress?.trim() ?? "",
      permanentAddress: form.privateDetails.permanentAddress?.trim() ?? "",
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
    educationRecords: form.educationRecords.filter(record => [record.qualificationLevel, record.instituteName, record.degreeExamTitle, record.majorGroup, record.studyStartDate].some(Boolean)).map(record => ({
      qualificationLevel: record.qualificationLevel.trim(),
      instituteName: record.instituteName.trim(),
      degreeExamTitle: record.degreeExamTitle.trim(),
      majorGroup: record.majorGroup.trim(),
      resultGpa: optionalText(record.resultGpa),
      curriculum: optionalText(record.curriculum),
      studyStartDate: record.studyStartDate,
      studyEndDate: record.currentlyStudying ? undefined : record.studyEndDate || undefined,
      passingYear: record.currentlyStudying || !record.passingYear ? undefined : Number(record.passingYear),
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
