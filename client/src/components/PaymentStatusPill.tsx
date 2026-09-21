import { jobPaymentStatusLabels, type JobPaymentStatus } from "@shared/job-payment-status";

/** Owed reads warm, paid reads green, the two part-payments sit between. */
export const paymentTone: Record<JobPaymentStatus, string> = {
  full_due: "border-red-200 bg-red-50 text-red-800",
  half_paid: "border-amber-200 bg-amber-50 text-amber-800",
  partial_paid: "border-sky-200 bg-sky-50 text-sky-800",
  full_paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

/** A tuition's Payment Status, as it is worked out from its verified payments. */
export default function PaymentStatusPill({ status }: { status: JobPaymentStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-2xs font-bold ${paymentTone[status]}`}>
    {jobPaymentStatusLabels[status]}
  </span>;
}
