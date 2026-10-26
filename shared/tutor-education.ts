/**
 * Controlled vocabularies for the Tutor Profile "Education" section.
 *
 * These lists are editorial: the labels are expected to change as the catalog
 * is curated. They stay as plain `varchar` in the database and are enforced by
 * Zod on the server and by the `<select>` options on the client, so widening a
 * list never needs a schema migration. Both sides import from here, so the
 * dropdown and the validator can never drift apart.
 */

/** Section-level Education Level — the Tutor's current university-level study. */
export const academicEducationLevels = ["Honours", "Masters"] as const;
export type AcademicEducationLevel = (typeof academicEducationLevels)[number];

/** Per-record Education Level inside the qualification history. */
export const qualificationEducationLevels = ["SSC", "HSC", "Honours", "Masters"] as const;
export type QualificationEducationLevel = (typeof qualificationEducationLevels)[number];

/** Per-record curriculum inside the qualification history. */
export const qualificationCurricula = ["Bangla Version", "English Version", "English Medium"] as const;
export type QualificationCurriculum = (typeof qualificationCurricula)[number];

/**
 * A school record is a public-board one - SSC or HSC - and it is a different
 * shape of fact from a university one.
 *
 * A board exam is passed in a single year and identified by a roll and a
 * registration number, so those are what the record asks for. A degree is read
 * over a span of years and may still be in progress, which is what the start
 * year, end year and "currently studying" between them describe. One record
 * type cannot ask both sets without asking half of every Tutor for something
 * that does not exist.
 */
export const schoolQualificationLevels = ["SSC", "HSC"] as const;

export function isSchoolQualification(level: string | null | undefined): boolean {
  return typeof level === "string" && (schoolQualificationLevels as readonly string[]).includes(level);
}

/** The three groups a board exam is sat under. */
export const schoolSubjectGroups = ["Science", "Arts", "Commerce"] as const;
export type SchoolSubjectGroup = (typeof schoolSubjectGroups)[number];

/**
 * The two school records every Tutor fills in, each in its own section.
 *
 * Headed "Secondary" and "Higher Secondary" rather than SSC and HSC, because a
 * Tutor who read English Medium sat O and A Levels and has neither. What they
 * sat is carried by the record's own Curriculum and Degree / Exam Title; the
 * stored level stays SSC and HSC so nothing downstream has to learn a new
 * vocabulary.
 */
export const fixedSchoolRecords = [
  { level: "SSC", heading: "Secondary" },
  { level: "HSC", heading: "Higher Secondary" },
] as const;

/**
 * What the repeatable Qualification history offers.
 *
 * Secondary and Higher Secondary have sections of their own, so the history is
 * for degrees alone - offering SSC there would invite a second, contradictory
 * copy of a record the Tutor has already filled in above.
 */
export const historyQualificationLevels = ["Honours", "Masters"] as const;

/**
 * The University Section is the Tutor's own degree, and what the history under
 * it may add is the other one: with Masters there, an Honours; with Honours
 * there, a Masters - but only once the Honours is behind them, because someone
 * still reading for an Honours cannot have a Masters. Until the section says
 * which level it holds, either may be added.
 */
export function historyLevelsOffered(sectionLevel: string | null | undefined, studyStatus?: string | null): readonly (typeof historyQualificationLevels)[number][] {
  if (sectionLevel === "Masters") return ["Honours"];
  if (sectionLevel === "Honours") return studyStatus === "graduated" || studyStatus === "professional" ? ["Masters"] : [];
  return historyQualificationLevels;
}

/**
 * Of those, the history holds each level at most once, so a level another
 * qualification has already taken is not offered again, and once every level
 * is taken there is nothing left to add.
 */
export function historyLevelsLeft(takenLevels: ReadonlyArray<string | null | undefined>, sectionLevel?: string | null, studyStatus?: string | null) {
  return historyLevelsOffered(sectionLevel, studyStatus).filter(level => !takenLevels.includes(level));
}

/**
 * Names offered as suggestions in a record's Degree / Exam Title box, by the
 * record's level: a degree's for Honours and Masters, a board exam's for
 * Secondary and Higher Secondary. Only suggestions: a title that is not here is
 * typed as usual. A record whose level is not chosen yet is offered both degree lists.
 */
export const honoursDegreeTitles = ["BSc", "BA", "BBA", "BCom", "BSS", "BEd", "LLB", "BPharm", "BSc (Engineering)", "MBBS", "BDS"] as const;
export const mastersDegreeTitles = ["MSc", "MA", "MBA", "MCom", "MSS", "MEd", "LLM", "MPhil"] as const;

/** The same for the two school sections, which sit a board exam of their own kind. */
export const secondaryExamTitles = ["SSC", "Dakhil", "O Level", "SSC (Vocational)"] as const;
export const higherSecondaryExamTitles = ["HSC", "Alim", "A Level", "HSC (Vocational)"] as const;

export function degreeTitleSuggestions(level: string | null | undefined): readonly string[] {
  if (level === "SSC") return secondaryExamTitles;
  if (level === "HSC") return higherSecondaryExamTitles;
  if (level === "Honours") return honoursDegreeTitles;
  if (level === "Masters") return mastersDegreeTitles;
  return [...honoursDegreeTitles, ...mastersDegreeTitles];
}

/**
 * Narrows a stored value to one of `options`, or to `""` when it predates the
 * list (or was never set). Lets the form hydrate legacy free-text answers
 * without crashing: the Tutor simply re-picks from the dropdown.
 */
export function asEducationOption<T extends string>(options: readonly T[], value: unknown): T | "" {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : "";
}

/** Earliest study year a Tutor can claim; matches the legacy passing-year floor. */
export const MIN_STUDY_YEAR = 1950;

/**
 * Whether the Education tab holds enough to apply with: any one of Secondary,
 * Higher Secondary, the University Section or a degree added under it, filled
 * in completely. Plenty of teachers are SSC-only, so no one section is owed;
 * one that is started and left half done is simply not counted.
 *
 * Both the form and the server read this, so neither can turn back a Tutor the
 * other would let through. `records` are the education records as the caller
 * holds them (strings in the form, numbers on the server) and `university` is
 * the University Section's own details; `isEnabled` says whether the Owner
 * still shows a field, because a field switched off cannot be asked for.
 */
export type EducationSectionSource = {
  records: ReadonlyArray<Record<string, unknown>>;
  university: Record<string, unknown>;
};

export type EducationSectionState = { offered: boolean; complete: boolean };

const hasValue = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== "";
const hasYear = (value: unknown) => hasValue(value) && isStudyYear(Number(value));

export function educationSectionStatus(source: EducationSectionSource, isEnabled: (registryId: string) => boolean) {
  const complete = (ids: ReadonlyArray<string>, has: (id: string) => boolean) => ids.every(id => !isEnabled(id) || has(id));
  const recordOf = (level: string) => source.records.find(record => record.qualificationLevel === level);

  const school = (level: "SSC" | "HSC", blockId: string): EducationSectionState => {
    const record = recordOf(level);
    const offered = isEnabled(blockId);
    return {
      offered,
      complete: offered && Boolean(record) && complete(
        ["educationRecords.instituteName", "educationRecords.degreeExamTitle", "educationRecords.majorGroup", "educationRecords.curriculum", "educationRecords.passingYear"],
        id => {
          const key = id.slice("educationRecords.".length);
          return key === "passingYear" ? hasYear(record![key]) : hasValue(record![key]);
        },
      ),
    };
  };

  const universityIds = ["universityId", "facultyDepartmentId", "degreeExamTitle", "studyStatus"] as const;
  const timelineId = source.university.studyStatus === "studying" ? "yearSemester" : "graduationYear";
  const universityOffered = [...universityIds, "yearSemester", "graduationYear"].some(isEnabled);
  const university: EducationSectionState = {
    offered: universityOffered,
    complete: universityOffered && complete([...universityIds, timelineId], id => id === "graduationYear" ? hasYear(source.university[id]) : hasValue(source.university[id])),
  };

  const historyOffered = isEnabled("educationRecords");
  const history: EducationSectionState = {
    offered: historyOffered,
    complete: historyOffered && source.records.some(record => {
      if (record.qualificationLevel === "SSC" || record.qualificationLevel === "HSC") return false;
      const ids = ["educationRecords.qualificationLevel", "educationRecords.instituteName", "educationRecords.degreeExamTitle", "educationRecords.majorGroup", "educationRecords.curriculum", "educationRecords.studyStartYear"];
      const filled = complete(ids, id => {
        const key = id.slice("educationRecords.".length);
        return key === "studyStartYear" ? hasYear(record[key]) : hasValue(record[key]);
      });
      return filled && (record.currentlyStudying === true || hasYear(record.studyEndYear));
    }),
  };

  const sections = { secondary: school("SSC", "secondaryRecord"), higherSecondary: school("HSC", "higherSecondaryRecord"), university, history };
  const offered = Object.values(sections).filter(section => section.offered);
  return {
    ...sections,
    /** False only when the Owner has switched every education section off: nothing is then asked for. */
    applies: offered.length > 0,
    /** At least one offered section is complete. */
    met: offered.some(section => section.complete),
  };
}

/** Allows in-progress degrees to name an expected end year a few intakes ahead. */
export function maxStudyYear(now: Date = new Date()) {
  return now.getUTCFullYear() + 10;
}

/** Shared four-digit study-year guard used by both the form and the schema. */
export function isStudyYear(value: number, now?: Date) {
  return Number.isInteger(value) && value >= MIN_STUDY_YEAR && value <= maxStudyYear(now);
}

/**
 * Whether one qualification-history field belongs to a record of this level.
 *
 * SSC and HSC are board exams - one passing year, a roll and a registration
 * number. Honours and Masters are read over a span and may be in progress.
 * Both the form and the submission check read this, so a field can never be
 * demanded on a record that does not draw it.
 */
export function educationRecordFieldApplies(fieldId: string, qualificationLevel: string | null | undefined): boolean {
  const school = isSchoolQualification(qualificationLevel);
  if (SCHOOL_ONLY_RECORD_FIELDS.has(fieldId)) return school;
  if (UNIVERSITY_ONLY_RECORD_FIELDS.has(fieldId)) return !school;
  return true;
}

const SCHOOL_ONLY_RECORD_FIELDS = new Set([
  "educationRecords.passingYear",
  "educationRecords.rollNumber",
  "educationRecords.registrationNumber",
]);

const UNIVERSITY_ONLY_RECORD_FIELDS = new Set([
  "educationRecords.studyStartYear",
  "educationRecords.studyEndYear",
  "educationRecords.currentlyStudying",
  "educationRecords.instituteIdCardNumber",
]);

/**
 * Validates a Result / GPA string according to the qualification level.
 * - For school board exams (SSC, HSC): maximum numeric GPA is 5.00 (scale: 1.00 - 5.00).
 * - For university degrees (Honours, Masters): maximum numeric CGPA is 4.00 (scale: 1.00 - 4.00).
 * - Non-numeric grades like "Golden A+", "A+", "First Class", "Passed" are allowed.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateResultGpa(resultGpa: string | null | undefined, qualificationLevel?: string | null): string | null {
  if (resultGpa === null || resultGpa === undefined) return null;
  const trimmed = String(resultGpa).trim();
  if (!trimmed) return null;

  // Extract leading or isolated number e.g. "5.00", "4.5", "3.85 / 4.00"
  const match = trimmed.match(/^(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    const isSchool = isSchoolQualification(qualificationLevel);
    const maxScale = isSchool ? 5.00 : 4.00;
    const scaleLabel = isSchool ? "SSC/HSC (max 5.00)" : "Honours/Masters (max 4.00)";

    if (num > maxScale) {
      return `Result/GPA cannot exceed ${maxScale.toFixed(2)} for ${scaleLabel}.`;
    }
    if (num < 1.00 && num > 0) {
      return `Result/GPA must be at least 1.00.`;
    }
    if (num === 0) {
      return `Enter a valid Result/GPA.`;
    }
  }
  return null;
}

export type TimelineRecordItem = {
  qualificationLevel?: string | null;
  passingYear?: number | string | null;
  studyStartYear?: number | string | null;
  studyEndYear?: number | string | null;
};

export type TimelineUniversityItem = {
  graduationYear?: number | string | null;
  studyStartYear?: number | string | null;
};

/**
 * Validates the chronological sequence across education qualifications.
 * - HSC passing year cannot be earlier than or the same as SSC passing year.
 * - University graduation or study year cannot be earlier than HSC passing year.
 * - Masters study start year cannot be earlier than Honours completion year.
 * Returns an error message string if sequence is impossible, or null if valid.
 */
export function validateEducationTimelineSequence(
  records?: ReadonlyArray<TimelineRecordItem> | null,
  university?: TimelineUniversityItem | null,
): string | null {
  if (!records || records.length === 0) return null;

  const toYear = (val: unknown): number | null => {
    if (val === undefined || val === null || val === "") return null;
    const n = Number(val);
    return isStudyYear(n) ? n : null;
  };

  const sscRecord = records.find(r => r.qualificationLevel === "SSC");
  const hscRecord = records.find(r => r.qualificationLevel === "HSC");

  const sscYear = toYear(sscRecord?.passingYear);
  const hscYear = toYear(hscRecord?.passingYear);

  if (sscYear !== null && hscYear !== null && hscYear < sscYear) {
    return `HSC passing year (${hscYear}) cannot be earlier than SSC passing year (${sscYear}).`;
  }

  // Check University vs HSC
  const uniGradYear = toYear(university?.graduationYear);
  if (hscYear !== null && uniGradYear !== null && uniGradYear < hscYear) {
    return `University graduation year (${uniGradYear}) cannot be earlier than HSC passing year (${hscYear}).`;
  }

  // Check Honours vs Masters in records
  const honoursRecord = records.find(r => r.qualificationLevel === "Honours");
  const mastersRecord = records.find(r => r.qualificationLevel === "Masters");
  const honoursEnd = toYear(honoursRecord?.studyEndYear ?? honoursRecord?.studyStartYear);
  const mastersStart = toYear(mastersRecord?.studyStartYear);
  if (honoursEnd !== null && mastersStart !== null && mastersStart < honoursEnd) {
    return `Masters study start year (${mastersStart}) cannot be earlier than Honours completion year (${honoursEnd}).`;
  }

  return null;
}
