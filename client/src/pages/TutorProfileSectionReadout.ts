import { tutorSupportingDocumentLabels } from "@shared/tutor-documents";
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
 * `optional` rows are ones the server does not require for submission
 * (`submissionRequiredKeys` in server/tutor-profile.validation.ts). Every empty
 * field reads "Not given" whether or not it is optional - a dash left the tutor
 * guessing what it meant. The flag still decides the colour, so an optional
 * blank stays muted rather than red, and it is still left out of the
 * per-section filled/total count.
 */
export type TutorProfileReadoutRow = { label: string; value: string; missing: boolean; optional?: boolean };
export type TutorProfileReadoutGroup = { heading?: string; rows: TutorProfileReadoutRow[] };
export type TutorProfileReadoutSection = { id: TutorProfileSectionId; title: string; groups: TutorProfileReadoutGroup[] };

const NOT_GIVEN = "Not given";

function text(value: string | null | undefined): TutorProfileReadoutRow["value"] {
  const trimmed = (value ?? "").trim();
  return trimmed;
}

function list(ids: readonly string[], resolve: (id: string) => string): string {
  return ids.map(resolve).filter(Boolean).join(", ");
}

function row(label: string, value: string, optional = false): TutorProfileReadoutRow {
  const missing = value.trim().length === 0;
  const base: TutorProfileReadoutRow = { label, value: value || NOT_GIVEN, missing };
  return optional ? { ...base, optional: true } : base;
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

export function getTutorProfileReadoutSections(
  form: TeachingProfileState,
  resolve: TutorProfileReadoutResolvers,
): TutorProfileReadoutSection[] {
  const pd = form.privateDetails;
  return [
    {
      id: "a",
      title: "Personal Information",
      groups: [
        {
          heading: "Identity and contact",
          rows: [
            row("Full name", text(form.name)),
            row("Gender", fromMap(staticLabels.gender, form.gender)),
            row("Date of birth", text(form.dateOfBirth)),
            row("Professional headline", text(form.headline)),
            row("Mobile number", text(form.phone)),
            row("Email address", text(form.contactEmail)),
            row("Nationality", text(pd.nationality)),
            row("Religion", text(pd.religion)),
            row("Additional phone", text(pd.additionalPhone), true),
            row("Social profile links", text(pd.socialProfileLinks), true),
          ],
        },
        {
          heading: "Family and emergency contact",
          rows: [
            row("Father's name", text(pd.fatherName)),
            row("Father's phone number", text(pd.fatherPhone)),
            row("Mother's name", text(pd.motherName), true),
            row("Mother's phone number", text(pd.motherPhone), true),
            row("Emergency contact name", text(pd.emergencyContactName), true),
            row("Emergency contact relation", text(pd.emergencyContactRelation), true),
            row("Emergency contact phone", text(pd.emergencyContactPhone), true),
            row("Emergency contact address", text(pd.emergencyContactAddress), true),
          ],
        },
      ],
    },
    {
      id: "c",
      title: "Education and teaching expertise",
      groups: [
        {
          heading: "Education",
          rows: [
            row("Education level", text(form.highestEducation), true),
            row("Current study status", fromMap(staticLabels.studyStatus, form.studyStatus)),
            row("Institute", form.universityId ? resolve.university(form.universityId) : ""),
            row("Related department / subject", form.facultyDepartmentId ? resolve.department(form.facultyDepartmentId) : ""),
            row("Degree / exam title", text(form.degreeExamTitle)),
            row("Result / GPA", text(form.resultGpa), true),
            row("Dept ID", text(form.deptId), true),
            // Only the half of the study timeline that the chosen status asks for.
            form.studyStatus === "studying"
              ? row("Year/semester", text(form.yearSemester))
              : row("Graduation year", text(form.graduationYear)),
            row("Qualification history", educationSummary(form)),
            row("University ID card", form.universityIdDocumentStatus === "uploaded" ? "Uploaded for private review" : ""),
            row("Supporting documents", form.uploadedSupportingDocuments.map(type => tutorSupportingDocumentLabels[type]).join(", "), true),
          ],
        },
        {
          heading: "Teaching expertise",
          rows: [
            row("Primary subjects", list(form.primarySubjectIds, resolve.subject)),
            row("Additional subjects", list(form.additionalSubjectIds, resolve.subject), true),
            row("Class / level", list(form.classLevelIds, resolve.classLevel)),
            row("Curriculum", list(form.curriculumIds, resolve.curriculum)),
            row("Teaching experience (years)", text(form.teachingExperienceYears)),
            row("Prior teaching experience", text(form.priorTeachingExperience), true),
            row("Special expertise", text(form.specialExpertise), true),
            row("Academic achievement", text(form.academicAchievement), true),
          ],
        },
      ],
    },
    {
      id: "d",
      title: "Tuition, location and communication",
      groups: [
        {
          heading: "Availability",
          rows: [
            row("Tuition type", fromMap(staticLabels.tuitionType, form.tuitionType)),
            row("Preferred student gender", fromMap(staticLabels.preferredStudentGender, form.preferredStudentGender)),
            row("Preferred class size", list(form.preferredClassSizes, id => fromMap(staticLabels.classSize, id))),
            row("Preferred teaching days", list(form.preferredTeachingDays, id => fromMap(staticLabels.day, id))),
            row("Preferred time slots", list(form.preferredTimeSlots, id => fromMap(staticLabels.timeSlot, id))),
            row("Available nationwide", form.availableNationwide ? "Yes" : "No"),
          ],
        },
        {
          heading: "Location and fee",
          rows: [
            row("Current City", form.currentCityId ? resolve.location(form.currentCityId) : ""),
            row("Current location", form.currentLocationId ? resolve.location(form.currentLocationId) : ""),
            row("Teaching areas", list(form.teachingAreaIds, resolve.area)),
            row("Minimum monthly fee", text(form.feeMin)),
            row("Maximum monthly fee", text(form.feeMax)),
            row("Travel distance (km)", text(form.travelDistanceKm), true),
          ],
        },
        {
          heading: "Communication",
          rows: [
            row("Teaching languages", list(form.teachingLanguageIds, resolve.language)),
            row("Communication preferences", list(form.communicationPreferences, id => fromMap(staticLabels.communication, id))),
          ],
        },
      ],
    },
    {
      id: "e",
      title: "Introduction and review",
      groups: [
        {
          rows: [
            row("About me", text(form.aboutMe), true),
            row("Teaching approach", text(form.teachingApproach), true),
            row("Why choose me", text(form.whyChooseMe), true),
            row("Additional notes", text(form.additionalNotes), true),
          ],
        },
      ],
    },
  ];
}
