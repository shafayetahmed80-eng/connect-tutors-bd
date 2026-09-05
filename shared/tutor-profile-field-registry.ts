/**
 * The canonical, code-shipped default for every configurable Tutor Profile
 * field: which section/sub-group it lives in, its position there, and
 * whether profile submission requires it.
 *
 * This is the same "flat registry + lookup" shape as `option-catalogs.ts`
 * and `site-limits.ts` - an Admin override (`tutor_profile_field_overrides`)
 * changes one axis at a time on top of this, and an empty overrides table
 * renders/validates exactly what's declared here. Nothing outside the
 * resolve layer (`server/tutor-profile-field-config.ts`) should read this
 * array directly and treat it as the live configuration.
 *
 * Ids use dot-notation for a field that only exists inside a container:
 * `privateDetails.<key>` for the private-details group, `educationRecords.<key>`
 * for one field repeated across every education record, and
 * `supportingDocument.<type>` for one of the four optional certificate
 * uploads. `educationRecords` itself (no suffix) governs the repeatable block
 * as a whole - whether it renders at all, and whether at least one complete
 * record is required.
 */

export type TutorProfileFieldSection = "a" | "c" | "d" | "e";
export type TutorProfileFieldSubGroup = "a-identity" | "a-family" | "c-education" | "c-teaching";

/**
 * The titled block a field is drawn in, inside whichever section it belongs to.
 *
 * Panel ids are deliberately section-agnostic: a panel travels with its fields.
 * Move "what-you-teach" fields into section `d` and they arrive there still
 * grouped under their own heading, rather than being scattered into whatever
 * block happens to come first.
 *
 * A sub-group (own card, own popup) is a different thing from a panel (a
 * heading inside one editor). Section `d` has three panels and no sub-groups:
 * one popup, three blocks in it.
 */
export const tutorProfileFieldPanels = [
  "identity",
  "family",
  "education",
  "qualifications",
  "documents",
  "what-you-teach",
  "own-words",
  "how-you-teach",
  "location-fee",
  "communication",
  "introduction",
  "review",
] as const;
export type TutorProfileFieldPanel = (typeof tutorProfileFieldPanels)[number];

export type TutorProfileFieldMeta = {
  id: string;
  label: string;
  section: TutorProfileFieldSection;
  /** Absent for a field belonging directly to a section with no sub-groups (d, e). */
  subGroup?: TutorProfileFieldSubGroup;
  /** The titled block it is drawn in; travels with the field across sections. */
  panel: TutorProfileFieldPanel;
  /** Default position within its section+subGroup. Not necessarily contiguous. */
  sortOrder: number;
  requiredByDefault: boolean;
  /**
   * False for a field whose requiredness already branches on another field's
   * value in code (`yearSemester`/`graduationYear` on `studyStatus`,
   * `educationRecords.studyEndYear`/`.currentlyStudying` on each other) - an
   * admin flipping a flat toggle on one of these would fight that branch
   * rather than mean anything. Everything else can be toggled required/optional.
   */
  requiredConfigurable: boolean;
  /**
   * True only for `profilePhotoUrl`, which renders in the identity rail
   * outside every section's field grid - the Admin editor gives it Enabled/
   * Required controls but never a reorder control.
   */
  excludedFromReorder?: boolean;
};

export const tutorProfileFieldRegistry: readonly TutorProfileFieldMeta[] = [
  // Section a - Personal Information
  { id: "profilePhotoUrl", label: "Profile Photo", section: "a", panel: "identity", sortOrder: 1, requiredByDefault: true, requiredConfigurable: true, excludedFromReorder: true },

  // a-identity
  { id: "name", label: "Full Name", section: "a", subGroup: "a-identity", panel: "identity", sortOrder: 10, requiredByDefault: true, requiredConfigurable: true },
  { id: "gender", label: "Gender", section: "a", subGroup: "a-identity", panel: "identity", sortOrder: 20, requiredByDefault: true, requiredConfigurable: true },
  { id: "dateOfBirth", label: "Date of Birth", section: "a", subGroup: "a-identity", panel: "identity", sortOrder: 30, requiredByDefault: true, requiredConfigurable: true },
  { id: "headline", label: "Professional Headline", section: "a", subGroup: "a-identity", panel: "identity", sortOrder: 40, requiredByDefault: true, requiredConfigurable: true },
  { id: "phone", label: "Mobile Number", section: "a", subGroup: "a-identity", panel: "identity", sortOrder: 50, requiredByDefault: true, requiredConfigurable: true },
  { id: "contactEmail", label: "Email Address", section: "a", subGroup: "a-identity", panel: "identity", sortOrder: 60, requiredByDefault: true, requiredConfigurable: true },
  { id: "privateDetails.nationality", label: "Nationality", section: "a", subGroup: "a-identity", panel: "identity", sortOrder: 70, requiredByDefault: true, requiredConfigurable: true },
  { id: "privateDetails.religion", label: "Religion", section: "a", subGroup: "a-identity", panel: "identity", sortOrder: 80, requiredByDefault: true, requiredConfigurable: true },
  { id: "privateDetails.additionalPhone", label: "Additional Phone", section: "a", subGroup: "a-identity", panel: "identity", sortOrder: 90, requiredByDefault: false, requiredConfigurable: true },
  { id: "privateDetails.socialProfileLinks", label: "Social Profile Links", section: "a", subGroup: "a-identity", panel: "identity", sortOrder: 100, requiredByDefault: false, requiredConfigurable: true },

  // a-family
  { id: "privateDetails.fatherName", label: "Father's Name", section: "a", subGroup: "a-family", panel: "family", sortOrder: 110, requiredByDefault: true, requiredConfigurable: true },
  { id: "privateDetails.fatherPhone", label: "Father's Phone Number", section: "a", subGroup: "a-family", panel: "family", sortOrder: 120, requiredByDefault: true, requiredConfigurable: true },
  { id: "privateDetails.motherName", label: "Mother's Name", section: "a", subGroup: "a-family", panel: "family", sortOrder: 130, requiredByDefault: false, requiredConfigurable: true },
  { id: "privateDetails.motherPhone", label: "Mother's Phone Number", section: "a", subGroup: "a-family", panel: "family", sortOrder: 140, requiredByDefault: false, requiredConfigurable: true },
  { id: "privateDetails.emergencyContactName", label: "Emergency Contact Name", section: "a", subGroup: "a-family", panel: "family", sortOrder: 150, requiredByDefault: false, requiredConfigurable: true },
  { id: "privateDetails.emergencyContactRelation", label: "Emergency Contact Relation", section: "a", subGroup: "a-family", panel: "family", sortOrder: 160, requiredByDefault: false, requiredConfigurable: true },
  { id: "privateDetails.emergencyContactPhone", label: "Emergency Contact Phone", section: "a", subGroup: "a-family", panel: "family", sortOrder: 170, requiredByDefault: false, requiredConfigurable: true },
  { id: "privateDetails.emergencyContactAddress", label: "Emergency Contact Address", section: "a", subGroup: "a-family", panel: "family", sortOrder: 180, requiredByDefault: false, requiredConfigurable: true },

  // c-education
  { id: "highestEducation", label: "Education Level", section: "c", subGroup: "c-education", panel: "education", sortOrder: 10, requiredByDefault: false, requiredConfigurable: true },
  { id: "universityId", label: "Institute", section: "c", subGroup: "c-education", panel: "education", sortOrder: 20, requiredByDefault: true, requiredConfigurable: true },
  { id: "facultyDepartmentId", label: "Related Department / Subject", section: "c", subGroup: "c-education", panel: "education", sortOrder: 30, requiredByDefault: true, requiredConfigurable: true },
  { id: "degreeExamTitle", label: "Degree / Exam Title", section: "c", subGroup: "c-education", panel: "education", sortOrder: 40, requiredByDefault: true, requiredConfigurable: true },
  { id: "resultGpa", label: "Result / GPA", section: "c", subGroup: "c-education", panel: "education", sortOrder: 50, requiredByDefault: false, requiredConfigurable: true },
  { id: "deptId", label: "Dept ID", section: "c", subGroup: "c-education", panel: "education", sortOrder: 60, requiredByDefault: false, requiredConfigurable: true },
  { id: "studyStatus", label: "Current Study Status", section: "c", subGroup: "c-education", panel: "education", sortOrder: 15, requiredByDefault: true, requiredConfigurable: true },
  { id: "yearSemester", label: "Year/Semester", section: "c", subGroup: "c-education", panel: "education", sortOrder: 80, requiredByDefault: true, requiredConfigurable: false },
  { id: "graduationYear", label: "Graduation Year", section: "c", subGroup: "c-education", panel: "education", sortOrder: 90, requiredByDefault: true, requiredConfigurable: false },
  { id: "educationRecords", label: "Qualification History", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 100, requiredByDefault: true, requiredConfigurable: true },
  { id: "educationRecords.qualificationLevel", label: "Qualification Level", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 101, requiredByDefault: true, requiredConfigurable: true },
  { id: "educationRecords.instituteName", label: "Institute Name", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 102, requiredByDefault: true, requiredConfigurable: true },
  { id: "educationRecords.degreeExamTitle", label: "Degree / Exam Title (record)", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 103, requiredByDefault: true, requiredConfigurable: true },
  { id: "educationRecords.majorGroup", label: "Major / Group", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 104, requiredByDefault: true, requiredConfigurable: true },
  { id: "educationRecords.curriculum", label: "Curriculum (record)", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 105, requiredByDefault: true, requiredConfigurable: true },
  { id: "educationRecords.studyStartYear", label: "Study Start Year", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 107, requiredByDefault: true, requiredConfigurable: true },
  { id: "educationRecords.studyEndYear", label: "Study End Year", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 108, requiredByDefault: true, requiredConfigurable: false },
  { id: "educationRecords.currentlyStudying", label: "Currently Studying", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 109, requiredByDefault: false, requiredConfigurable: false },
  { id: "educationRecords.resultGpa", label: "Result / GPA (record)", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 106, requiredByDefault: false, requiredConfigurable: true },
  { id: "educationRecords.instituteIdCardNumber", label: "Institute ID Card Number", section: "c", subGroup: "c-education", panel: "qualifications", sortOrder: 110, requiredByDefault: false, requiredConfigurable: true },
  { id: "universityIdDocumentStatus", label: "University ID Card", section: "c", subGroup: "c-education", panel: "documents", sortOrder: 120, requiredByDefault: true, requiredConfigurable: true },
  { id: "supportingDocument.nid_card", label: "NID Card Image", section: "c", subGroup: "c-education", panel: "documents", sortOrder: 130, requiredByDefault: false, requiredConfigurable: true },
  { id: "supportingDocument.ssc_certificate", label: "SSC Certificate", section: "c", subGroup: "c-education", panel: "documents", sortOrder: 140, requiredByDefault: false, requiredConfigurable: true },
  { id: "supportingDocument.hsc_certificate", label: "HSC Certificate", section: "c", subGroup: "c-education", panel: "documents", sortOrder: 150, requiredByDefault: false, requiredConfigurable: true },
  { id: "supportingDocument.hons_ms_certificate", label: "Hons/MS Certificate", section: "c", subGroup: "c-education", panel: "documents", sortOrder: 160, requiredByDefault: false, requiredConfigurable: true },

  // c-teaching
  { id: "primarySubjectIds", label: "Primary Subjects", section: "d", panel: "what-you-teach", sortOrder: 71, requiredByDefault: true, requiredConfigurable: true },
  { id: "additionalSubjectIds", label: "Additional Subjects", section: "d", panel: "what-you-teach", sortOrder: 72, requiredByDefault: false, requiredConfigurable: true },
  { id: "classLevelIds", label: "Class / Level", section: "d", panel: "what-you-teach", sortOrder: 73, requiredByDefault: true, requiredConfigurable: true },
  { id: "curriculumIds", label: "Curriculum", section: "d", panel: "what-you-teach", sortOrder: 74, requiredByDefault: true, requiredConfigurable: true },
  { id: "teachingExperienceYears", label: "Teaching Experience (Years)", section: "d", panel: "what-you-teach", sortOrder: 75, requiredByDefault: true, requiredConfigurable: true },
  { id: "priorTeachingExperience", label: "Prior Teaching Experience", section: "d", panel: "own-words", sortOrder: 76, requiredByDefault: false, requiredConfigurable: true },
  { id: "specialExpertise", label: "Special Expertise", section: "d", panel: "own-words", sortOrder: 77, requiredByDefault: false, requiredConfigurable: true },
  { id: "academicAchievement", label: "Academic Achievement", section: "d", panel: "own-words", sortOrder: 78, requiredByDefault: false, requiredConfigurable: true },

  // Section d - Tuition, location and communication (no sub-groups)
  { id: "tuitionType", label: "Tuition Type", section: "d", panel: "how-you-teach", sortOrder: 10, requiredByDefault: true, requiredConfigurable: true },
  { id: "availableNationwide", label: "Available Nationwide", section: "d", panel: "how-you-teach", sortOrder: 70, requiredByDefault: true, requiredConfigurable: true },
  { id: "preferredStudentGender", label: "Preferred Student Gender", section: "d", panel: "how-you-teach", sortOrder: 30, requiredByDefault: true, requiredConfigurable: true },
  { id: "preferredClassSizes", label: "Preferred Class Size", section: "d", panel: "how-you-teach", sortOrder: 40, requiredByDefault: true, requiredConfigurable: true },
  { id: "preferredTeachingDays", label: "Preferred Teaching Days", section: "d", panel: "how-you-teach", sortOrder: 50, requiredByDefault: true, requiredConfigurable: true },
  { id: "preferredTimeSlots", label: "Preferred Time Slots", section: "d", panel: "how-you-teach", sortOrder: 60, requiredByDefault: true, requiredConfigurable: true },
  { id: "currentCityId", label: "Current City", section: "d", panel: "location-fee", sortOrder: 80, requiredByDefault: true, requiredConfigurable: true },
  { id: "currentLocationId", label: "Current Location", section: "d", panel: "location-fee", sortOrder: 90, requiredByDefault: true, requiredConfigurable: true },
  { id: "teachingAreaIds", label: "Teaching Areas", section: "d", panel: "location-fee", sortOrder: 100, requiredByDefault: true, requiredConfigurable: true },
  { id: "feeMin", label: "Minimum Monthly Fee", section: "d", panel: "location-fee", sortOrder: 110, requiredByDefault: true, requiredConfigurable: true },
  { id: "feeMax", label: "Maximum Monthly Fee", section: "d", panel: "location-fee", sortOrder: 120, requiredByDefault: true, requiredConfigurable: true },
  { id: "travelDistanceKm", label: "Travel Distance (km)", section: "d", panel: "location-fee", sortOrder: 130, requiredByDefault: false, requiredConfigurable: true },
  { id: "teachingLanguageIds", label: "Teaching Languages", section: "d", panel: "communication", sortOrder: 140, requiredByDefault: true, requiredConfigurable: true },
  { id: "communicationPreferences", label: "Communication Preferences", section: "d", panel: "communication", sortOrder: 150, requiredByDefault: true, requiredConfigurable: true },

  // Section e - Introduction and review (no sub-groups)
  { id: "aboutMe", label: "About Me", section: "e", panel: "introduction", sortOrder: 10, requiredByDefault: false, requiredConfigurable: true },
  { id: "teachingApproach", label: "Teaching Approach", section: "e", panel: "introduction", sortOrder: 20, requiredByDefault: false, requiredConfigurable: true },
  { id: "whyChooseMe", label: "Why Choose Me", section: "e", panel: "introduction", sortOrder: 30, requiredByDefault: false, requiredConfigurable: true },
  { id: "additionalNotes", label: "Additional Notes", section: "e", panel: "review", sortOrder: 40, requiredByDefault: false, requiredConfigurable: true },
] as const;

export function findTutorProfileFieldMeta(id: string): TutorProfileFieldMeta | undefined {
  return tutorProfileFieldRegistry.find(field => field.id === id);
}

export const tutorProfileFieldSections: readonly TutorProfileFieldSection[] = ["a", "c", "d", "e"];
export const tutorProfileFieldSubGroups: readonly TutorProfileFieldSubGroup[] = ["a-identity", "a-family", "c-education", "c-teaching"];

/** Sub-groups a section opens one at a time, or `undefined` for a section edited as one popup. */
export function subGroupsForSection(section: TutorProfileFieldSection): readonly TutorProfileFieldSubGroup[] | undefined {
  const groups = tutorProfileFieldSubGroups.filter(group => tutorProfileFieldRegistry.some(field => field.section === section && field.subGroup === group));
  return groups.length > 0 ? groups : undefined;
}

/**
 * One stored override row, exactly as the `tutor_profile_field_overrides`
 * table holds it - every axis independently nullable, and a `null` always
 * means "use the registry default for this one axis", never "explicitly
 * cleared to nothing". A row only needs to exist once any one axis differs.
 */
export type TutorProfileFieldOverrideRow = {
  fieldId: string;
  section: string | null;
  subGroup: string | null;
  sortOrder: number | null;
  enabled: number | null;
  required: number | null;
};

export type ResolvedTutorProfileField = TutorProfileFieldMeta & {
  enabled: boolean;
  required: boolean;
};

export type ResolvedTutorProfileFieldConfig = {
  /** Every field, enabled or not, in registry order - the shape sent over the wire. */
  all: readonly ResolvedTutorProfileField[];
  byId: ReadonlyMap<string, ResolvedTutorProfileField>;
  /** Enabled fields only, sorted by resolved `sortOrder`. */
  bySection: ReadonlyMap<TutorProfileFieldSection, readonly ResolvedTutorProfileField[]>;
  /** Enabled fields only, sorted by resolved `sortOrder`. */
  bySubGroup: ReadonlyMap<TutorProfileFieldSubGroup, readonly ResolvedTutorProfileField[]>;
};

function isValidSection(value: string | null): value is TutorProfileFieldSection {
  return value !== null && (tutorProfileFieldSections as readonly string[]).includes(value);
}

function isValidSubGroup(value: string | null): value is TutorProfileFieldSubGroup {
  return value !== null && (tutorProfileFieldSubGroups as readonly string[]).includes(value);
}

/**
 * Merges stored overrides onto the shipped defaults - unknown field ids and
 * out-of-range/invalid values are ignored rather than clamped, the same
 * policy `resolveSiteLimits` uses, so a bound tightened in a later deploy
 * can't silently reinterpret an old row.
 *
 * Moving a field to a section that has sub-groups is only meaningful when
 * the override also names a valid `subGroup` in that same section - the
 * Admin editor (not this function) is responsible for always writing both
 * together; a `section` override with no matching `subGroup` override simply
 * keeps the field's previous sub-group assignment (or none, for a field that
 * never had one).
 */
export function resolveTutorProfileFieldConfig(overrides: readonly TutorProfileFieldOverrideRow[]): ResolvedTutorProfileFieldConfig {
  const overrideById = new Map(overrides.map(row => [row.fieldId, row] as const));

  const resolved: ResolvedTutorProfileField[] = tutorProfileFieldRegistry.map(field => {
    const override = overrideById.get(field.id);
    const section = isValidSection(override?.section ?? null) ? (override!.section as TutorProfileFieldSection) : field.section;
    const storedSubGroup = isValidSubGroup(override?.subGroup ?? null) ? (override!.subGroup as TutorProfileFieldSubGroup) : field.subGroup;
    // A sub-group belongs to exactly one section (its id is prefixed with it),
    // so one carried across a move is meaningless - the field simply lands in
    // its new section directly. This is also the only way to express "no
    // sub-group", since a null override column means "use the default".
    const subGroup = storedSubGroup?.startsWith(`${section}-`) ? storedSubGroup : undefined;
    const sortOrder = typeof override?.sortOrder === "number" ? override.sortOrder : field.sortOrder;
    const enabled = override?.enabled === 0 ? false : true;
    const required = field.requiredConfigurable && (override?.required === 0 || override?.required === 1)
      ? override.required === 1
      : field.requiredByDefault;
    return { ...field, section, subGroup, sortOrder, enabled, required };
  });

  return indexResolvedFields(resolved);
}

/**
 * Rebuilds the by-id/by-section/by-sub-group lookups from a flat field list.
 *
 * The wire format is the flat list - sending the lookups instead would repeat
 * every field three times - so the client calls this on what it receives.
 */
export function indexResolvedFields(fields: readonly ResolvedTutorProfileField[]): ResolvedTutorProfileFieldConfig {
  const byId = new Map(fields.map(field => [field.id, field] as const));
  const bySection = new Map<TutorProfileFieldSection, ResolvedTutorProfileField[]>();
  const bySubGroup = new Map<TutorProfileFieldSubGroup, ResolvedTutorProfileField[]>();
  for (const field of fields) {
    if (!field.enabled) continue;
    (bySection.get(field.section) ?? bySection.set(field.section, []).get(field.section)!).push(field);
    if (field.subGroup) {
      (bySubGroup.get(field.subGroup) ?? bySubGroup.set(field.subGroup, []).get(field.subGroup)!).push(field);
    }
  }
  for (const list of Array.from(bySection.values())) list.sort((a, b) => a.sortOrder - b.sortOrder);
  for (const list of Array.from(bySubGroup.values())) list.sort((a, b) => a.sortOrder - b.sortOrder);

  return { all: fields, byId, bySection, bySubGroup };
}

export function defaultTutorProfileFieldConfig(): ResolvedTutorProfileFieldConfig {
  return resolveTutorProfileFieldConfig([]);
}

export type ResolvedTutorProfilePanel = {
  panel: TutorProfileFieldPanel;
  fields: readonly ResolvedTutorProfileField[];
};

/**
 * Splits an already-ordered field list into its panels, keeping both the
 * fields' order and the order the panels first appear in. A panel with no
 * enabled fields left simply doesn't come back, so its heading stops being
 * drawn rather than sitting over an empty block.
 */
export function groupFieldsByPanel(fields: readonly ResolvedTutorProfileField[]): ResolvedTutorProfilePanel[] {
  const panels: ResolvedTutorProfilePanel[] = [];
  const byPanel = new Map<TutorProfileFieldPanel, ResolvedTutorProfileField[]>();
  for (const field of fields) {
    const existing = byPanel.get(field.panel);
    if (existing) {
      existing.push(field);
      continue;
    }
    const created = [field];
    byPanel.set(field.panel, created);
    panels.push({ panel: field.panel, fields: created });
  }
  return panels;
}
