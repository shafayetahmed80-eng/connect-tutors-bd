import { isSchoolQualification } from "@shared/tutor-education";
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
  tuitionType: { home: "Home tuition", online: "Online tuition", group: "Group tuition", package: "Package tuition" },
  preferredStudentGender: { male: "Male", female: "Female", both: "Both" },
  day: {
    monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday",
    friday: "Friday", saturday: "Saturday", sunday: "Sunday",
  },
  timeSlot: { morning: "Morning", afternoon: "Afternoon", evening: "Evening", flexible: "Flexible" },
} as const;

/** Name maps built from the loaded catalogs; each returns the display name for an id. */
export type TutorProfileReadoutResolvers = {
  subject: (id: string) => string;
  classLevel: (id: string) => string;
  curriculum: (id: string) => string;
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
export type TutorProfileReadoutRow = { fieldId?: string; label: string; value: string; missing: boolean; optional?: boolean };
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

/**
 * The Qualification history, a degree at a time with everything it holds, each
 * row named by its level so two degrees never blur into one. Secondary and
 * Higher Secondary are read out by their own cards.
 */
function historyRows(form: TeachingProfileState): ReadoutRowContent[] {
  const of = (value: string | null | undefined) => (value ?? "").trim();
  const filled = form.educationRecords.filter(record =>
    !isSchoolQualification(record.qualificationLevel)
    && [record.qualificationLevel, record.instituteName, record.degreeExamTitle, record.majorGroup].some(part => of(part)));
  if (filled.length === 0) return [{ label: "Qualification history", value: "" }];
  return filled.flatMap(record => {
    const level = of(record.qualificationLevel) || "Qualification";
    const period = record.currentlyStudying
      ? [of(record.studyStartYear), "Ongoing"].filter(Boolean).join(" - ")
      : [of(record.studyStartYear), of(record.studyEndYear)].filter(Boolean).join(" - ");
    return [
      { label: `${level} · Institute name`, value: of(record.instituteName) },
      { label: `${level} · Degree / exam title`, value: of(record.degreeExamTitle) },
      { label: `${level} · Subject / group`, value: of(record.majorGroup) },
      { label: `${level} · Curriculum`, value: of(record.curriculum) },
      { label: `${level} · Study period`, value: period },
      { label: `${level} · Result / GPA`, value: of(record.resultGpa), optional: true },
      { label: `${level} · Institute ID card number`, value: of(record.instituteIdCardNumber), optional: true },
    ];
  });
}

/**
 * The rows a fixed school section shows: everything its record holds, one row
 * to a detail. Its record is found by level, not by position, the same way the
 * editor finds it.
 */
function schoolRows(form: TeachingProfileState, level: "SSC" | "HSC"): ReadoutRowContent[] {
  const record = form.educationRecords.find(entry => entry.qualificationLevel === level);
  const of = (value: string | null | undefined) => (value ?? "").trim();
  return [
    { label: "Institute name", value: of(record?.instituteName) },
    { label: "Degree / exam title", value: of(record?.degreeExamTitle) },
    { label: "Subject / group", value: of(record?.majorGroup) },
    { label: "Curriculum", value: of(record?.curriculum) },
    { label: "Result / GPA", value: of(record?.resultGpa), optional: true },
    { label: "Roll number", value: of(record?.rollNumber), optional: true },
    { label: "Registration number", value: of(record?.registrationNumber), optional: true },
    { label: "Passing year", value: of(record?.passingYear) },
  ];
}

const sectionTitles: Record<TutorProfileSectionId, string> = {
  a: "Personal Information",
  c: "Education",
  d: "Tuition Related",
  f: "Credential",
  e: "Introduction and review",
};

/** A card's heading when its fields sit in a sub-group (which owns its own popup). */
const subGroupHeadings: Record<TutorProfileFieldSubGroup, string> = {
  "a-identity": "Identity and contact",
  "a-family": "Family and emergency contact",
  "c-university": "University Section",
  "c-higher-secondary": "Higher Secondary",
  "c-secondary": "Secondary",
  "d-availability": "Tuition Preferences & Availability",
  "d-teaching": "Teaching Expertise",
};

/** A card's heading when the section has no sub-groups, so each panel is its own card. */
const panelHeadings: Record<TutorProfileFieldPanel, string> = {
  identity: "Identity and contact",
  family: "Family and emergency contact",
  education: "University Section",
  secondary: "Secondary",
  "higher-secondary": "Higher Secondary",
  qualifications: "Qualifications",
  documents: "Documents",
  "what-you-teach": "Teaching expertise",
  "own-words": "In your own words",
  "how-you-teach": "Availability",
  "location-fee": "Location and fee",
  introduction: "Your introduction",
  review: "For the review team",
};

type ReadoutRowContent = { label: string; value: string; optional?: boolean };
type ReadoutRowBuilder = (form: TeachingProfileState, resolve: TutorProfileReadoutResolvers) => ReadoutRowContent | ReadoutRowContent[] | null;

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
  "privateDetails.permanentAddress": form => ({ label: "Permanent address", value: text(form.privateDetails.permanentAddress) }),
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
  secondaryRecord: form => schoolRows(form, "SSC"),
  higherSecondaryRecord: form => schoolRows(form, "HSC"),
  educationRecords: form => historyRows(form),
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
  priorTeachingExperience: form => ({ label: "Teaching experience details", value: text(form.priorTeachingExperience) }),
  specialExpertise: form => ({ label: "Special expertise", value: text(form.specialExpertise) }),
  academicAchievement: form => ({ label: "Academic achievement", value: text(form.academicAchievement) }),

  tuitionType: form => ({ label: "Tuition type", value: list(form.tuitionTypes, id => fromMap(staticLabels.tuitionType, id)) }),
  preferredStudentGender: form => ({ label: "Preferred student gender", value: fromMap(staticLabels.preferredStudentGender, form.preferredStudentGender) }),
  preferredTeachingDays: form => ({ label: "Preferred teaching days", value: list(form.preferredTeachingDays, id => fromMap(staticLabels.day, id)) }),
  preferredTimeSlots: form => ({ label: "Preferred time slots", value: list(form.preferredTimeSlots, id => fromMap(staticLabels.timeSlot, id)) }),
  currentCityId: (form, resolve) => ({ label: "Current City", value: form.currentCityId ? resolve.location(form.currentCityId) : "" }),
  currentLocationId: (form, resolve) => ({ label: "Current location", value: form.currentLocationId ? resolve.location(form.currentLocationId) : "" }),
  teachingAreaIds: (form, resolve) => ({ label: "Teaching areas", value: list(form.teachingAreaIds, resolve.area) }),
  feeMin: form => ({ label: "Minimum monthly fee", value: text(form.feeMin) }),
  feeMax: form => ({ label: "Maximum monthly fee", value: text(form.feeMax) }),
  travelDistanceKm: form => ({ label: "Travel distance (km)", value: text(form.travelDistanceKm) }),

  aboutMe: form => ({ label: "About me", value: text(form.aboutMe) }),
  teachingApproach: form => ({ label: "Teaching approach", value: text(form.teachingApproach) }),
  whyChooseMe: form => ({ label: "Why choose me", value: text(form.whyChooseMe) }),
  additionalNotes: form => ({ label: "Additional notes", value: text(form.additionalNotes) }),
};

function toRow(field: ResolvedTutorProfileField, content: ReadoutRowContent): TutorProfileReadoutRow {
  const missing = content.value.trim().length === 0;
  const base: TutorProfileReadoutRow = { fieldId: field.id, label: content.label, value: content.value || NOT_GIVEN, missing };
  return field.required && !content.optional ? base : { ...base, optional: true };
}

/**
 * A card groups the fields that are edited together: the sub-group where a
 * section has them, otherwise the panel. That is why Personal Information
 * shows two cards and Education shows three (University Section, Higher
 * Secondary, Secondary) - each with its own pencil and popup.
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
      for (const row of Array.isArray(content) ? content : [content]) group.rows.push(toRow(field, row));
    }

    return { id: sectionId, title: sectionTitles[sectionId], groups };
  }).filter(section => section.groups.length > 0);
}

/**
 * The read-out with its empty rows taken out, along with any card or section
 * left with nothing in it. For a reader who is not the Tutor: "Not given" is a
 * prompt to the Tutor, and to anyone else it is only noise.
 */
export function withoutMissingRows(sections: TutorProfileReadoutSection[]): TutorProfileReadoutSection[] {
  return sections
    .map(section => ({
      ...section,
      groups: section.groups
        .map(group => ({ ...group, rows: group.rows.filter(row => !row.missing) }))
        .filter(group => group.rows.length > 0),
    }))
    .filter(section => section.groups.length > 0);
}
