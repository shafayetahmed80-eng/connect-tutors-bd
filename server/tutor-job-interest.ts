import type { GuardianRequestLifecycle } from "./tutor-request-lifecycle";

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
  existingStatus: TutorJobInterestStatus | null;
};

export function canSubmitTutorInterest(input: SubmitTutorInterestInput):
  | { allowed: true }
  | { allowed: false; reason: "already_interested" | "job_unavailable" | "tutor_required" } {
  if (!input.tutorId) return { allowed: false, reason: "tutor_required" };
  if (input.jobStatus !== "published") {
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
/**
 * Whether an Admin can still move an application on or off the shortlist: while
 * the tuition can take a Tutor, or a backup for the one it has appointed. A
 * listing with no tuition behind it predates requests and keeps the old rule.
 */
export function canShortlistOnTuition(lifecycle: GuardianRequestLifecycle | null): boolean {
  return lifecycle === null || lifecycle === "live" || lifecycle === "appointed";
}

/** What the Tutor is told about an Admin's decision on their application. Coming off a shortlist says nothing. */
export function adminInterestDecisionNotice(status: TutorJobInterestStatus, jobId: string) {
  if (status === "shortlisted") return { title: `${jobId}-এর জন্য আপনাকে শর্টলিস্ট করা হয়েছে`, message: "আপনার আবেদন এখন কোথায় আছে দেখতে Status ট্যাবে যান।" };
  if (status === "declined") return { title: `${jobId}-এর জন্য আপনার আবেদন এগিয়ে নেওয়া হয়নি`, message: "Job Board-এ অন্য টিউশন এখনো আপনার জন্য খোলা আছে।" };
  return null;
}
