/**
 * What an Admin can do from one tuition's Applied Tutors list.
 *
 * Every applicant's buttons come from the tuition's stage and the application's
 * own status, so the row only offers what the server will accept: shortlisting
 * while the tuition can still take a Tutor, appointing only while it is Live,
 * and confirming or removing only the Tutor who holds it. Cancelling is the
 * tuition's, not an applicant's, so it sits beside the rows rather than in one.
 *
 * The server checks each move again - these are the buttons, not the rules.
 */
import type { TutorApplicationRecord, TutorApplicationStage } from "./tutor-application-stages";

export type TuitionStage = "pending" | "live" | "appointed" | "confirmed" | "cancelled";

export type ApplicantAction = "shortlist" | "unshortlist" | "appoint" | "confirm" | "remove_appointed" | "remove_confirmed";

export type ApplicantActionInput = {
  tuitionStage: TuitionStage;
  applicationStatus: TutorApplicationRecord["status"];
  /** This applicant is the Tutor the tuition is appointed or confirmed to. */
  holdsTuition: boolean;
  /** Only an approved profile can be appointed. */
  tutorApproved: boolean;
};

export type ApplicantActionOption = { action: ApplicantAction; disabled: boolean };

const enabled = (action: ApplicantAction): ApplicantActionOption => ({ action, disabled: false });

export function applicantActions(input: ApplicantActionInput): ApplicantActionOption[] {
  const { tuitionStage: stage, applicationStatus: status } = input;
  const holder = input.holdsTuition && status === "matched";

  if (stage === "live" || stage === "appointed") {
    // After the demo class the Guardian keeps the Tutor, or does not.
    if (stage === "appointed" && holder) return [enabled("confirm"), enabled("remove_appointed")];
    const options: ApplicantActionOption[] = [];
    if (status === "interested") options.push(enabled("shortlist"));
    if (status === "shortlisted") options.push(enabled("unshortlist"));
    // One Tutor at a time: an Appointed tuition already has its Tutor.
    if (stage === "live" && (status === "interested" || status === "shortlisted")) {
      options.push({ action: "appoint", disabled: !input.tutorApproved });
    }
    return options;
  }
  // A filled tuition takes no more shortlisting; only its Tutor can be removed.
  if (stage === "confirmed" && holder) return [enabled("remove_confirmed")];
  return [];
}

/** A tuition an Admin can cancel from Applied Tutors: any stage with applicants that has not already ended. */
export function canCancelTuition(stage: TuitionStage): boolean {
  return stage === "live" || stage === "appointed" || stage === "confirmed";
}

export const applicantActionLabels: Record<ApplicantAction, string> = {
  shortlist: "Shortlist",
  unshortlist: "Remove from shortlist",
  appoint: "Appoint",
  confirm: "Confirm",
  remove_appointed: "Remove Tutor",
  remove_confirmed: "Remove Tutor",
};

/** An application's stage as its row names it: the Tutor's own five, without "Jobs". */
export const applicantStageLabels: Record<TutorApplicationStage, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  appointed: "Appointed",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};
