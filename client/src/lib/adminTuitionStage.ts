import { getGuardianRequestLifecycle } from "@/pages/GuardianRequestTracking";
import { withClosedStage } from "@shared/tuition-stage";

/**
 * A tuition's stage as the Admin reads it: the Guardian's five, with a Confirmed
 * tuition whose fee is Full Paid shown as Closed. The Guardian keeps reading
 * Confirmed, so this is for the Admin's screens only.
 */
export function getAdminTuitionStage(job: Parameters<typeof getGuardianRequestLifecycle>[0] & { paymentStatus?: string | null }) {
  const lifecycle = getGuardianRequestLifecycle(job);
  const key = withClosedStage(lifecycle.key, job.paymentStatus);
  return key === "closed" ? { key, label: "Closed", activeIndex: lifecycle.activeIndex } : lifecycle;
}
