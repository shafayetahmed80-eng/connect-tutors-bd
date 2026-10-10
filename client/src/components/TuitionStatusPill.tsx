export type TuitionStage = "pending" | "live" | "appointed" | "confirmed" | "closed" | "cancelled";

const stageStyles: Record<TuitionStage, string> = {
  pending: "bg-amber-50 text-amber-800",
  live: "bg-sky-50 text-sky-800",
  appointed: "bg-emerald-50 text-emerald-800",
  confirmed: "bg-indigo-50 text-indigo-800",
  closed: "bg-teal-50 text-teal-800",
  cancelled: "bg-slate-100 text-slate-600",
};

/** A tuition's stage as a pill - the same stages the Posted jobs tabs name. */
export default function TuitionStatusPill({ stage, label }: { stage: TuitionStage; label: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-2xs font-bold ${stageStyles[stage]}`}>{label}</span>;
}
