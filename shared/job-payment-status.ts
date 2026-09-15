/**
 * How much of a Confirmed tuition's fee has been paid, as an Admin records it.
 * A tuition starts at Full Due the moment it is confirmed.
 *
 * `drizzle/schema.ts` repeats these values for the column (it imports nothing
 * from here); a test keeps the two lists the same.
 */
export const jobPaymentStatusValues = ["full_due", "half_paid", "partial_paid", "full_paid"] as const;

export type JobPaymentStatus = (typeof jobPaymentStatusValues)[number];

export const DEFAULT_JOB_PAYMENT_STATUS: JobPaymentStatus = "full_due";

export const jobPaymentStatusLabels: Record<JobPaymentStatus, string> = {
  full_due: "Full Due",
  half_paid: "Half Paid",
  partial_paid: "Partial Paid",
  full_paid: "Full Paid",
};

export function isJobPaymentStatus(value: unknown): value is JobPaymentStatus {
  return jobPaymentStatusValues.some(status => status === value);
}
