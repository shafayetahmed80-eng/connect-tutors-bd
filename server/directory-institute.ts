import { academicEducationLevels } from "@shared/tutor-education";

type AcademicSource = { highestEducation: string | null; universityName: string | null; departmentName: string | null };
type RecordSource = { qualificationLevel: string | null; instituteName: string | null; majorGroup?: string | null };
export type DirectoryEducation = { instituteName: string | null; departmentName: string | null };

const text = (value: string | null | undefined) => value?.trim() || null;

/**
 * The institute, and the department beside it, an Admin means when they say
 * "প্রতিষ্ঠান": Masters, then Honours, then Higher Secondary, then Secondary -
 * the first level the Tutor actually filled in. The department always comes
 * from that same level, so an institute is never paired with a subject read
 * somewhere else; at school level it is the Science / Arts / Commerce group.
 * The University Section counts as the level it says it holds. The caller adds
 * the loose `tutors.institution` text older directory rows carry when none of
 * these is named.
 */
export function pickDirectoryEducation(academic: AcademicSource | null, records: RecordSource[]): DirectoryEducation {
  const academicLevel = academic && (academicEducationLevels as readonly string[]).includes(academic.highestEducation ?? "") ? academic.highestEducation : null;
  const fromAcademic = (level: string | null) => academic && academicLevel === level && text(academic.universityName)
    ? { instituteName: text(academic.universityName), departmentName: text(academic.departmentName) }
    : null;
  const fromRecord = (level: string) => {
    const record = records.find(entry => entry.qualificationLevel === level && text(entry.instituteName));
    return record ? { instituteName: text(record.instituteName), departmentName: text(record.majorGroup) } : null;
  };
  return fromAcademic("Masters") ?? fromRecord("Masters")
    ?? fromAcademic("Honours") ?? fromRecord("Honours")
    // A University Section with no Education Level picked is still a university, and outranks a school.
    ?? fromAcademic(null)
    ?? fromRecord("HSC") ?? fromRecord("SSC")
    ?? { instituteName: null, departmentName: null };
}
