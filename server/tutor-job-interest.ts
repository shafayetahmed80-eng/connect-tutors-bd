export const tutorJobInterestStatusValues = [
  "interested",
  "shortlisted",
  "declined",
  "matched",
  "withdrawn",
] as const;

export type TutorJobInterestStatus = (typeof tutorJobInterestStatusValues)[number];
export type TutorInterestActor = "tutor" | "admin";

type SubmitTutorInterestInput = {
  tutorId: string | null | undefined;
  jobStatus: "published" | "unpublished" | "closed";
  expiresAt: Date;
  now: Date;
  existingStatus: TutorJobInterestStatus | null;
};

export function canSubmitTutorInterest(input: SubmitTutorInterestInput):
  | { allowed: true }
  | { allowed: false; reason: "already_interested" | "job_unavailable" | "tutor_required" } {
  if (!input.tutorId) return { allowed: false, reason: "tutor_required" };
  if (input.jobStatus !== "published" || input.expiresAt <= input.now) {
    return { allowed: false, reason: "job_unavailable" };
  }
  if (["interested", "shortlisted", "matched"].includes(input.existingStatus ?? "")) {
    return { allowed: false, reason: "already_interested" };
  }
  return { allowed: true };
}

export function transitionTutorInterest(
  from: TutorJobInterestStatus,
  to: TutorJobInterestStatus,
  actor: TutorInterestActor
): { allowed: true } | { allowed: false; reason: "admin_only" | "invalid_transition" } {
  if (actor === "tutor") {
    if (to === "withdrawn" && ["interested", "shortlisted"].includes(from)) {
      return { allowed: true };
    }
    return { allowed: false, reason: "admin_only" };
  }

  const allowedTransitions: Partial<Record<TutorJobInterestStatus, TutorJobInterestStatus[]>> = {
    interested: ["shortlisted", "declined", "matched"],
    shortlisted: ["interested", "declined", "matched"],
  };
  return allowedTransitions[from]?.includes(to)
    ? { allowed: true }
    : { allowed: false, reason: "invalid_transition" };
}
