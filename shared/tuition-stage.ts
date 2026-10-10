/**
 * Closed: a Confirmed tuition whose fee is Full Paid.
 *
 * It is not stored as a stage of its own. The Guardian reads five stages
 * (Pending, Live, Appointed, Confirmed, Cancelled) and keeps reading them; the
 * Admin and the Tutor read a sixth, Closed, which is a Confirmed tuition once the
 * Payment Status the ledger works out reaches Full Paid, and Confirmed again if
 * a payment is taken back. So the stage follows the money and nothing has to be
 * moved by hand.
 */
export const tuitionStageValues = ["pending", "live", "appointed", "confirmed", "closed", "cancelled"] as const;
export type TuitionStageWithClosed = (typeof tuitionStageValues)[number];

export function withClosedStage<Stage extends string>(stage: Stage, paymentStatus: string | null | undefined): Stage | "closed" {
  return stage === "confirmed" && paymentStatus === "full_paid" ? "closed" : stage;
}
