import PaymentStatusPill from "@/components/PaymentStatusPill";
import type { ChargeSummary } from "@shared/platform-charge";
import { formatSalaryAmount } from "@shared/salary-amount";

export const onDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Where a tuition's charge stands and when each part falls due. The Admin's
 * payments dialog and the Tutor's own share it, so both read the same numbers
 * in the same words.
 */
export default function ChargeSummaryBlock({ charge, settled = false }: { charge: ChargeSummary; /** A cancelled tuition was settled at a figure of its own; the instalments no longer apply. */ settled?: boolean }) {
  return <section aria-label="Charge">
    <div className="flex flex-wrap items-center gap-2">
      <PaymentStatusPill status={charge.status} />
      {charge.discounted && !settled ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-800">Reduced total earned</span> : null}
    </div>
    <dl className="mt-3 grid grid-cols-3 gap-3">
      {([["Charge", charge.owed], ["Paid", charge.paid], ["Balance", charge.balance]] as const).map(([label, value]) => <div key={label}>
        <dt className="text-2xs font-bold uppercase tracking-wide text-j-ink-muted">{label}</dt>
        <dd className="mt-0.5 text-base font-bold tabular-nums text-j-ink">{formatSalaryAmount(value)}</dd>
      </div>)}
    </dl>
    {settled ? null : <table className="mt-3 w-full border-collapse text-sm">
      <caption className="sr-only">Schedule</caption>
      <tbody className="divide-y divide-[#eef4f9]">
        <tr><th scope="row" className="py-1.5 pr-3 text-left font-semibold text-j-ink-strong">First instalment</th><td className="tabular-nums">{formatSalaryAmount(charge.first)}</td><td className="text-right text-j-ink-soft">by {onDate(charge.windowEndsAt)}</td></tr>
        <tr><th scope="row" className="py-1.5 pr-3 text-left font-semibold text-j-ink-strong">Second instalment</th><td className="tabular-nums">{formatSalaryAmount(charge.second)}</td><td className="text-right text-j-ink-soft">by {onDate(charge.secondDueAt)}</td></tr>
        {charge.early < charge.total ? <tr><th scope="row" className="py-1.5 pr-3 text-left font-semibold text-j-ink-strong">Paid in full</th><td className="tabular-nums">{formatSalaryAmount(charge.early)}</td><td className="text-right text-j-ink-soft">by {onDate(charge.windowEndsAt)}</td></tr> : null}
      </tbody>
    </table>}
  </section>;
}
