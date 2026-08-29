export const guardianRequestLifecycleValues = ["pending", "live", "appointed", "confirmed", "cancelled"] as const;
export type GuardianRequestLifecycle = (typeof guardianRequestLifecycleValues)[number];

type LifecycleSource = {
  status: "new" | "reviewing" | "matched" | "closed";
  publicationState: "submitted" | "reviewing" | "changes_requested" | "approved" | "unpublished" | "published" | "closed";
  tutorId: string | null;
  appointmentConfirmedAt: Date | null;
};

/** Maps internal moderation/matching data into the five Guardian-approved stages. */
export function getGuardianRequestLifecycle(source: LifecycleSource): GuardianRequestLifecycle {
  if (source.status === "closed" || source.publicationState === "closed") return "cancelled";
  if (source.appointmentConfirmedAt) return "confirmed";
  if (source.status === "matched" && source.tutorId) return "appointed";
  if (source.publicationState === "published") return "live";
  return "pending";
}
