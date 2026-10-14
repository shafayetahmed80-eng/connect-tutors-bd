import { jobPaymentStatusLabels, type JobPaymentStatus } from "@shared/job-payment-status";

/** Owed reads warm, paid reads green, the two part-payments sit between. */
export const paymentTone: Record<JobPaymentStatus, string> = {
  full_due: "border-red-200 bg-red-50 text-red-800",
  half_paid: "border-amber-200 bg-amber-50 text-amber-800",
  partial_paid: "border-sky-200 bg-sky-50 text-sky-800",
  full_paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export const paymentDotConfig: Record<JobPaymentStatus, { dot: string; ping?: string; pulse: boolean }> = {
  full_due: { dot: "bg-red-500", ping: "bg-red-400", pulse: true },
  half_paid: { dot: "bg-amber-500", ping: "bg-amber-400", pulse: true },
  partial_paid: { dot: "bg-sky-500", ping: "bg-sky-400", pulse: true },
  full_paid: { dot: "bg-emerald-500", pulse: false },
};

/** A tuition's Payment Status, as it is worked out from its verified payments. */
export default function PaymentStatusPill({ status }: { status: JobPaymentStatus }) {
  const config = paymentDotConfig[status];

  return (
    <span
      data-status={status}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-2xs font-bold ${paymentTone[status]}`}
    >
      <span className="relative flex size-2 shrink-0 items-center justify-center" aria-hidden="true">
        {config.pulse && config.ping ? (
          <span
            data-testid="status-dot-ping"
            className={`status-dot-ping absolute inline-flex size-full rounded-full opacity-75 ${config.ping}`}
          />
        ) : null}
        <span
          data-testid="status-dot"
          className={`relative inline-flex size-1.5 rounded-full ${config.dot}`}
        />
      </span>
      <span>{jobPaymentStatusLabels[status]}</span>
    </span>
  );
}

