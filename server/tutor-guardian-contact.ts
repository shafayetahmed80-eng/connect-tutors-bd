/**
 * What a Tutor may read about the Guardian of a tuition they are appointed to.
 *
 * Kept apart from the query so the rule - whose name and number leave the
 * server, and at which stage - can be tested without a database, as the
 * Guardian's side of it is (`guardian-applicants.ts`).
 */
import {
  getTutorApplicationStage,
  stageShowsGuardianContact,
  type TutorApplicationRecord,
} from "@shared/tutor-application-stages";

/**
 * Whether the Guardian's name and number go to this Tutor for this application:
 * the application is at a stage that puts the two in touch, and the tuition's
 * own Tutor is this one. An application left behind - the tuition went back to
 * Live, or on to another Tutor - gets nothing, whatever stage it once reached.
 */
export function tutorMaySeeGuardianContact(
  application: TutorApplicationRecord,
  appointedTutorId: string | null,
  tutorId: string,
) {
  return appointedTutorId !== null
    && appointedTutorId === tutorId
    && stageShowsGuardianContact(getTutorApplicationStage(application));
}

export type TutorGuardianContact = { appointedTutorId: string | null; name: string | null; phone: string | null };

/**
 * The Guardian's contact as the Status tab carries it: the trimmed name and
 * number when the rule releases them, and null for each otherwise - never
 * missing, so a row always has the same two keys.
 */
export function tutorGuardianContactFor(
  application: TutorApplicationRecord,
  contact: TutorGuardianContact | undefined,
  tutorId: string,
): { guardianName: string | null; guardianPhone: string | null } {
  if (!contact || !tutorMaySeeGuardianContact(application, contact.appointedTutorId, tutorId)) {
    return { guardianName: null, guardianPhone: null };
  }
  return { guardianName: contact.name?.trim() || null, guardianPhone: contact.phone?.trim() || null };
}
