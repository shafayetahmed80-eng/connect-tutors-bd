/**
 * What a Guardian may read about the Tutors who applied to their tuition.
 *
 * Kept apart from the query so the privacy rules - which applications show,
 * whose number leaves the server, which school introduces a Tutor - can be
 * tested without a database.
 */
import { academicEducationLevels } from "@shared/tutor-education";
import type { GuardianRequestLifecycle } from "./tutor-request-lifecycle";

/**
 * The stages a tuition's applicants are the Guardian's to read in. Before Live
 * nobody can have applied; once Confirmed the choice is made.
 */
export const guardianApplicantStages = ["live", "appointed"] as const;

export function isGuardianApplicantStage(lifecycle: GuardianRequestLifecycle) {
  return (guardianApplicantStages as readonly string[]).includes(lifecycle);
}

/**
 * The applications a Guardian sees. A withdrawn one is not an application any
 * more, and one the Admin declined is a decision already taken.
 */
export const guardianVisibleInterestStatuses = ["interested", "shortlisted", "matched"] as const;

/**
 * Whether one applicant's mobile number goes to the Guardian: only the Tutor
 * appointed to this tuition, and only once they are. Every other number stays
 * on the server rather than being sent and hidden by the page.
 */
export function guardianMaySeeApplicantPhone(
  request: { lifecycle: GuardianRequestLifecycle; tutorId: string | null },
  applicantId: string,
) {
  return (request.lifecycle === "appointed" || request.lifecycle === "confirmed") && request.tutorId === applicantId;
}

type AcademicSource = { highestEducation: string | null; universityName: string | null; departmentName: string | null };
type RecordSource = { qualificationLevel: string | null; instituteName: string | null; majorGroup: string | null };
export type GuardianApplicantEducation = { instituteName: string | null; departmentName: string | null };

const text = (value: string | null | undefined) => value?.trim() || null;

/**
 * The school a Guardian meets an applicant by: Honours, then Masters, then
 * Higher Secondary, then Secondary - the first level the Tutor actually filled
 * in. The department always comes from that same level, so an institute is
 * never paired with a subject read somewhere else; at school level it is the
 * Science / Arts / Commerce group.
 *
 * A level lives in one of two places. The University Section holds the degree
 * the Tutor is on now, as catalog names; the Qualification history holds the
 * others as typed text. The section is read first within a level.
 */
export function pickGuardianApplicantEducation(
  academic: AcademicSource | null,
  records: RecordSource[],
): GuardianApplicantEducation {
  const academicLevel = academic && (academicEducationLevels as readonly string[]).includes(academic.highestEducation ?? "")
    ? academic.highestEducation
    : null;
  const fromAcademic = (level: string | null) => academic && academicLevel === level && text(academic.universityName)
    ? { instituteName: text(academic.universityName), departmentName: text(academic.departmentName) }
    : null;
  const fromRecord = (level: string) => {
    const record = records.find(entry => entry.qualificationLevel === level && text(entry.instituteName));
    return record ? { instituteName: text(record.instituteName), departmentName: text(record.majorGroup) } : null;
  };

  return fromAcademic("Honours") ?? fromRecord("Honours")
    ?? fromAcademic("Masters") ?? fromRecord("Masters")
    // A University Section with no Education Level picked is still a
    // university, and outranks a school.
    ?? fromAcademic(null)
    ?? fromRecord("HSC") ?? fromRecord("SSC")
    ?? { instituteName: null, departmentName: null };
}
