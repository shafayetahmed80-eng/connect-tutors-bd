export type TuitionStage = "pending" | "live" | "appointed" | "confirmed" | "closed" | "cancelled";

const stageStyles: Record<TuitionStage, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  live: "bg-sky-50 text-sky-800 border-sky-200",
  appointed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  confirmed: "bg-indigo-50 text-indigo-800 border-indigo-200",
  closed: "bg-teal-50 text-teal-800 border-teal-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

export const tuitionDotConfig: Record<TuitionStage, { dot: string; ping?: string; pulse: boolean }> = {
  pending: { dot: "bg-amber-500", ping: "bg-amber-400", pulse: true },
  live: { dot: "bg-sky-500", ping: "bg-sky-400", pulse: true },
  appointed: { dot: "bg-emerald-500", ping: "bg-emerald-400", pulse: true },
  confirmed: { dot: "bg-indigo-500", pulse: false },
  closed: { dot: "bg-teal-500", pulse: false },
  cancelled: { dot: "bg-slate-400", pulse: false },
};

/** A tuition's stage as a pill - the same stages the Posted jobs tabs name. */
export default function TuitionStatusPill({ stage, label }: { stage: TuitionStage; label: string }) {
  const config = tuitionDotConfig[stage] ?? { dot: "bg-slate-400", pulse: false };

  return (
    <span
      data-stage={stage}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-2xs font-bold ${stageStyles[stage] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
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
      <span>{label}</span>
    </span>
  );
}

