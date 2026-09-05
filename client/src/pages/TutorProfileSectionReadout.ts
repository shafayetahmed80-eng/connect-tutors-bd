import { tutorSupportingDocumentLabels, type TutorSupportingDocumentType } from "@shared/tutor-documents";
import {
  defaultTutorProfileFieldConfig,
  tutorProfileFieldSections,
  type ResolvedTutorProfileField,
  type ResolvedTutorProfileFieldConfig,
  type TutorProfileFieldPanel,
  type TutorProfileFieldSubGroup,
} from "@shared/tutor-profile-field-registry";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";
import type { TeachingProfileState } from "./TutorProfileWorkspace";

/** Turns saved profile values into label -> display-string rows for the read view. */

const staticLabels = {
  gender: { male: "Male", female: "Female" },
  studyStatus: { studying: "Studying", graduated: "Graduated", professional: "Professional" },
  tuitionType: { home: "Home tuition", online: "Online tuition", both: "Home & online" },
  preferredStudentGender: { male: "Male", female: "Female", both: "Both" },
  classSize: { one_to_one: "One-to-one", small_group: "Small group", group: "Group" },
  day: {
    monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday",
    friday: "Friday", saturday: "Saturday", sunday: "Sunday",
  },
  timeSlot: { morning: "Morning", afternoon: "Afternoon", evening: "Evening", flexible: "Flexible" },
  communication: { phone: "Phone", whatsapp: "WhatsApp", platform_message: "Platform message" },
} as const;

/** Name maps built from the loaded catalogs; each returns the display name for an id. */
export type TutorProfileReadoutResolvers = {
  subject: (id: string) => string;
  classLevel: (id: string) => string;
  curriculum: (id: string) => string;
  language: (id: string) => string;
  university: (id: string) => string;
  department: (id: string) => string;
  location: (id: string) => string;
  area: (id: string) => string;
};

/**
 * `optional` rows are ones the resolved field config does not require for
 * submission. Every empty field reads "Not given" whether or not it is
 * optional - a dash left the tutor guessing what it meant. The flag still
 * decides the colour, so an optional blank stays muted rather than red, and it
 * is still left out of the per-section filled/total count.
 */
export type TutorProfileReadoutRow = { label: string; value: string; missing: boolean; optional?: boolean };
export type TutorProfileReadoutGroup = {
  heading?: string;
  rows: TutorProfileReadoutRow[];
  /**
   * The sub-group this card's pencil opens, or absent when the whole section
   * is edited in one popup. Carried here so the tab editor never has to pair
   * cards to edit targets by position.
   */
  editTarget?: TutorProfileFieldSubGroup;
};
export type TutorProfileReadoutSection = { id: TutorProfileSectionId; title: string; groups: TutorProfileReadoutGroup[] };

const NOT_GIVEN = "Not given";

function text(value: string | null | undefined): TutorProfileReadoutRow["value"] {
  const trimmed = (value ?? "").trim();
  return trimmed;
}

function list(ids: readonly string[], resolve: (id: string) => string): string {
  return ids.map(resolve).filter(Boolean).join(", ");
}

function fromMap<K extends string>(map: Record<K, string>, key: string): string {
  return (map as Record<string, string>)[key] ?? "";
}

function educationSummary(form: TeachingProfileState): string {
  const filled = form.educationRecords.filter(record =>
    [record.qualificationLevel, record.instituteName, record.degreeExamTitle].some(part => part.trim()));
  if (filled.length === 0) return "";
  return filled
    .map(record => [record.degreeExamTitle || record.qualificationLevel, record.instituteName].filter(Boolean).join(" · "))
    .join("; ");
}

const sectionTitles: Record<TutorProfileSectionId, string> = {
  a: "Personal Information",
  c: "Education and teaching expertise",
  d: "Tuition, location and communication",
  e: "Introduction and review",
};

/** A card's heading when its fields sit in a sub-group (which owns its own popup). */
const subGroupHeadings: Record<TutorProfileFieldSubGroup, string> = {
  "a-identity": "Identity and contact",
  "a-family": "Family and emergency contact",
  "c-education": "Education",
  "c-teaching": "Teaching expertise",
};

/** A card's heading when the section has no sub-groups, so each panel is its own card. */
const panelHeadings: Record<TutorProfileFieldPanel, string> = {
  identity: "Identity and contact",
  family: "Family and emergency contact",
  education: "Education",
  qualifications: "Qualifications",
  documents: "Documents",
  "what-you-teach": "Teaching expertise",
  "own-words": "In your own words",
  "how-you-teach": "Availability",
  "location-fee": "Location and fee",
  communication: "Communication",
  introduction: "Your introduction",
  review: "For the review team",
};

type ReadoutRowContent = { label: string; value: string };
type ReadoutRowBuilder = (form: TeachingProfileState, resolve: TutorProfileReadoutResolvers) => ReadoutRowContent | null;

function documentRowBuilder(documentType: TutorSupportingDocumentType): ReadoutRowBuilder {
  return form => ({
    label: tutorSupportingDocumentLabels[documentType],
    value: form.uploadedSupportingDocuments.includes(documentType) ? "Uploaded for private review" : "",
  });
}

/**
 * One row per field id. A field with no entry here simply has no read-out row -
 * the profile photo (it lives in the identity rail) and every
 * `educationRecords.*` field (they are summarised by `educationRecords` itself,
 * not listed one per record).
 */
const rowBuilders: Record<string, ReadoutRowBuilder> = {
  name: form => ({ label: "Full name", value: text(form.name) }),
  gender: form => ({ label: "Gender", value: fromMap(staticLabels.gender, form.gender) }),
  dateOfBirth: form => ({ label: "Date of birth", value: text(form.dateOfBirth) }),
  headline: form => ({ label: "Professional headline", value: text(form.headline) }),
  phone: form => ({ label: "Mobile number", value: text(form.phone) }),
  contactEmail: form => ({ label: "Email address", value: text(form.contactEmail) }),
  "privateDetails.nationality": form => ({ label: "Nationality", value: text(form.privateDetails.nationality) }),
  "privateDetails.religion": form => ({ label: "Religion", value: text(form.privateDetails.religion) }),
  "privateDetails.additionalPhone": form => ({ label: "Additional phone", value: text(form.privateDetails.additionalPhone) }),
  "privateDetails.socialProfileLinks": form => ({ label: "Social profile links", value: text(form.privateDetails.socialProfileLinks) }),

  "privateDetails.fatherName": form => ({ label: "Father's name", value: text(form.privateDetails.fatherName) }),
  "privateDetails.fatherPhone": form => ({ label: "Father's phone number", value: text(form.privateDetails.fatherPhone) }),
  "privateDetails.motherName": form => ({ label: "Mother's name", value: text(form.privateDetails.motherName) }),
  "privateDetails.motherPhone": form => ({ label: "Mother's phone number", value: text(form.privateDetails.motherPhone) }),
  "privateDetails.emergencyContactName": form => ({ label: "Emergency contact name", value: text(form.privateDetails.emergencyContactName) }),
  "privateDetails.emergencyContactRelation": form => ({ label: "Emergency contact relation", value: text(form.privateDetails.emergencyContactRelation) }),
  "privateDetails.emergencyContactPhone": form => ({ label: "Emergency contact phone", value: text(form.privateDetails.emergencyContactPhone) }),
  "privateDetails.emergencyContactAddress": form => ({ label: "Emergency contact address", value: text(form.privateDetails.emergencyContactAddress) }),

  highestEducation: form => ({ label: "Education level", value: text(form.highestEducation) }),
  studyStatus: form => ({ label: "Current study status", value: fromMap(staticLabels.studyStatus, form.studyStatus) }),
  universityId: (form, resolve) => ({ label: "Institute", value: form.universityId ? resolve.university(form.universityId) : "" }),
  facultyDepartmentId: (form, resolve) => ({ label: "Related department / subject", value: form.facultyDepartmentId ? resolve.department(form.facultyDepartmentId) : "" }),
  degreeExamTitle: form => ({ label: "Degree / exam title", value: text(form.degreeExamTitle) }),
  resultGpa: form => ({ label: "Result / GPA", value: text(form.resultGpa) }),
  deptId: form => ({ label: "Dept ID", value: text(form.deptId) }),
  // Only the half of the study timeline that the chosen status asks for.
  yearSemester: form => form.studyStatus === "studying" ? { label: "Year/semester", value: text(form.yearSemester) } : null,
  graduationYear: form => form.studyStatus === "studying" ? null : { label: "Graduation year", value: text(form.graduationYear) },
  educationRecords: form => ({ label: "Qualification history", value: educationSummary(form) }),
  universityIdDocumentStatus: form => ({ label: "University ID card", value: form.universityIdDocumentStatus === "uploaded" ? "Uploaded for private review" : "" }),
  "supportingDocument.nid_card": documentRowBuilder("nid_card"),
  "supportingDocument.ssc_certificate": documentRowBuilder("ssc_certificate"),
  "supportingDocument.hsc_certificate": documentRowBuilder("hsc_certificate"),
  "supportingDocument.hons_ms_certificate": documentRowBuilder("hons_ms_certificate"),

  primarySubjectIds: (form, resolve) => ({ label: "Primary subjects", value: list(form.primarySubjectIds, resolve.subject) }),
  additionalSubjectIds: (form, resolve) => ({ label: "Additional subjects", value: list(form.additionalSubjectIds, resolve.subject) }),
  classLevelIds: (form, resolve) => ({ label: "Class / level", value: list(form.classLevelIds, resolve.classLevel) }),
  curriculumIds: (form, resolve) => ({ label: "Curriculum", value: list(form.curriculumIds, resolve.curriculum) }),
  teachingExperienceYears: form => ({ label: "Teaching experience (years)", value: text(form.teachingExperienceYears) }),
  priorTeachingExperience: form => ({ label: "Prior teaching experience", value: text(form.priorTeachingExperience) }),
  specialExpertise: form => ({ label: "Special expertise", value: text(form.specialExpertise) }),
  academicAchievement: form => ({ label: "Academic achievement", value: text(form.academicAchievement) }),

  tuitionType: form => ({ label: "Tuition type", value: fromMap(staticLabels.tuitionType, form.tuitionType) }),
  preferredStudentGender: form => ({ label: "Preferred student gender", value: fromMap(staticLabels.preferredStudentGender, form.preferredStudentGender) }),
  preferredClassSizes: form => ({ label: "Preferred class size", value: list(form.preferredClassSizes, id => fromMap(staticLabels.classSize, id)) }),
  preferredTeachingDays: form => ({ label: "Preferred teaching days", value: list(form.preferredTeachingDays, id => fromMap(staticLabels.day, id)) }),
  preferredTimeSlots: form => ({ label: "Preferred time slots", value: list(form.preferredTimeSlots, id => fromMap(staticLabels.timeSlot, id)) }),
  availableNationwide: form => ({ label: "Available nationwide", value: form.availableNationwide ? "Yes" : "No" }),
  currentCityId: (form, resolve) => ({ label: "Current City", value: form.currentCityId ? resolve.location(form.currentCityId) : "" }),
  currentLocationId: (form, resolve) => ({ label: "Current location", value: form.currentLocationId ? resolve.location(form.currentLocationId) : "" }),
  teachingAreaIds: (form, resolve) => ({ label: "Teaching areas", value: list(form.teachingAreaIds, resolve.area) }),
  feeMin: form => ({ label: "Minimum monthly fee", value: text(form.feeMin) }),
  feeMax: form => ({ label: "Maximum monthly fee", value: text(form.feeMax) }),
  travelDistanceKm: form => ({ label: "Travel distance (km)", value: text(form.travelDistanceKm) }),
  teachingLanguageIds: (form, resolve) => ({ label: "Teaching languages", value: list(form.teachingLanguageIds, resolve.language) }),
  communicationPreferences: form => ({ label: "Communication preferences", value: list(form.communicationPreferences, id => fromMap(staticLabels.communication, id)) }),

  aboutMe: form => ({ label: "About me", value: text(form.aboutMe) }),
  teachingApproach: form => ({ label: "Teaching approach", value: text(form.teachingApproach) }),
  whyChooseMe: form => ({ label: "Why choose me", value: text(form.whyChooseMe) }),
  additionalNotes: form => ({ label: "Additional notes", value: text(form.additionalNotes) }),
};

function toRow(field: ResolvedTutorProfileField, content: ReadoutRowContent): TutorProfileReadoutRow {
  const missing = content.value.trim().length === 0;
  const base: TutorProfileReadoutRow = { label: content.label, value: content.value || NOT_GIVEN, missing };
  return field.required ? base : { ...base, optional: true };
}

/**
 * A card groups the fields that are edited together: the sub-group where a
 * section has them, otherwise the panel. That is why Personal Information
 * shows two cards with their own popups while Tuition & location shows three
 * cards that all open the same one.
 */
export function getTutorProfileReadoutSections(
  form: TeachingProfileState,
  resolve: TutorProfileReadoutResolvers,
  config: ResolvedTutorProfileFieldConfig = defaultTutorProfileFieldConfig(),
): TutorProfileReadoutSection[] {
  return tutorProfileFieldSections.map(sectionId => {
    const groups: TutorProfileReadoutGroup[] = [];
    const groupByKey = new Map<string, TutorProfileReadoutGroup>();

    for (const field of config.bySection.get(sectionId) ?? []) {
      const content = rowBuilders[field.id]?.(form, resolve);
      if (!content) continue;

      const key = field.subGroup ?? `panel:${field.panel}`;
      let group = groupByKey.get(key);
      if (!group) {
        group = field.subGroup
          ? { heading: subGroupHeadings[field.subGroup], rows: [], editTarget: field.subGroup }
          : { heading: panelHeadings[field.panel], rows: [] };
        groupByKey.set(key, group);
        groups.push(group);
      }
      group.rows.push(toRow(field, content));
    }

    return { id: sectionId, title: sectionTitles[sectionId], groups };
  }).filter(section => section.groups.length > 0);
}
