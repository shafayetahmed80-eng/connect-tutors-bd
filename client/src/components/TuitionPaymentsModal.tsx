import PaymentStatusPill from "@/components/PaymentStatusPill";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { jobIdForRequest } from "@shared/job-id";
import {
  tuitionPaymentMethodLabels,
  tuitionPaymentMethodValues,
  tuitionPaymentStatusLabels,
  type TuitionPaymentMethod,
  type TuitionPaymentStatus,
} from "@shared/platform-charge";
import { formatSalaryAmount } from "@shared/salary-amount";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const onDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** Today as the Dhaka calendar reads it, in the `YYYY-MM-DD` a date box wants. */
function todayInDhaka() {
  return new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const statusTone: Record<TuitionPaymentStatus, string> = {
  submitted: "border-amber-200 bg-amber-50 text-amber-800",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
};

const fieldClass = "h-10 w-full rounded-xl border border-j-border bg-j-surface-sunken px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100";
const labelClass = "mb-1 block text-2xs font-bold uppercase tracking-wide text-j-ink-muted";

/**
 * One Confirmed tuition's payments: what the Tutor owes and when, what is
 * on file, and a way to add to it.
 *
 * A payment an Admin records is verified as it is recorded. One a Tutor
 * reported waits here for the Admin to say whether the money arrived.
 */
export default function TuitionPaymentsModal({ requestId, onClose }: { requestId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const ledger = trpc.admin.listTuitionPayments.useQuery({ requestId });
  const refresh = () => {
    void utils.admin.listTuitionPayments.invalidate({ requestId });
    void utils.admin.listConfirmedJobs.invalidate();
  };

  const record = trpc.admin.recordTuitionPayment.useMutation({
    onSuccess: () => {
      refresh();
      setAmount("");
      setReference("");
      setNote("");
      toast.success("Payment recorded.");
    },
    onError: error => toast.error(error.message),
  });
  const decide = trpc.admin.decideTuitionPayment.useMutation({
    onSuccess: result => { refresh(); toast.success(result.status === "verified" ? "Payment verified." : "Payment rejected."); },
    onError: error => toast.error(error.message),
  });

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<TuitionPaymentMethod>("bkash");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(todayInDhaka);
  const [note, setNote] = useState("");

  const charge = ledger.data?.charge ?? null;
  const parsedAmount = Number.parseInt(amount, 10);
  const canRecord = Number.isInteger(parsedAmount) && parsedAmount > 0 && Boolean(paidOn) && !record.isPending;

  return <Modal size="lg" onClose={onClose} busy={record.isPending || decide.isPending}>
    <ModalHeader title={`Payments · Job ID ${jobIdForRequest(requestId)}`} />
    <ModalBody>
      {ledger.isLoading ? <div className="flex min-h-32 items-center justify-center text-sm text-j-ink-soft"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading payments…</div> : null}
      {ledger.isError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Payments could not be loaded.</p> : null}

      {ledger.data ? <div className="space-y-5">
        {charge ? <section aria-label="Charge">
          <div className="flex flex-wrap items-center gap-2">
            <PaymentStatusPill status={charge.status} />
            {charge.discounted ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-800">Reduced total earned</span> : null}
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            {[["Charge", charge.owed], ["Paid", charge.paid], ["Balance", charge.balance]].map(([label, value]) => <div key={label as string}>
              <dt className="text-2xs font-bold uppercase tracking-wide text-j-ink-muted">{label}</dt>
              <dd className="mt-0.5 text-base font-bold tabular-nums text-j-ink">{formatSalaryAmount(value as number)}</dd>
            </div>)}
          </dl>
          <table className="mt-3 w-full border-collapse text-sm">
            <caption className="sr-only">Schedule</caption>
            <tbody className="divide-y divide-[#eef4f9]">
              <tr><th scope="row" className="py-1.5 pr-3 text-left font-semibold text-j-ink-strong">First instalment</th><td className="tabular-nums">{formatSalaryAmount(charge.first)}</td><td className="text-right text-j-ink-soft">by {onDate(charge.windowEndsAt)}</td></tr>
              <tr><th scope="row" className="py-1.5 pr-3 text-left font-semibold text-j-ink-strong">Second instalment</th><td className="tabular-nums">{formatSalaryAmount(charge.second)}</td><td className="text-right text-j-ink-soft">by {onDate(charge.secondDueAt)}</td></tr>
              {charge.early < charge.total ? <tr><th scope="row" className="py-1.5 pr-3 text-left font-semibold text-j-ink-strong">Paid in full</th><td className="tabular-nums">{formatSalaryAmount(charge.early)}</td><td className="text-right text-j-ink-soft">by {onDate(charge.windowEndsAt)}</td></tr> : null}
            </tbody>
          </table>
        </section> : <p className="rounded-xl border border-dashed border-[#c9dce9] p-4 text-sm text-j-ink-muted">This tuition has no salary, so there is no charge.</p>}

        <section aria-label="Payments on file">
          <h3 className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">On file</h3>
          {ledger.data.payments.length === 0
            ? <p className="mt-2 text-sm text-j-ink-muted">No payments yet.</p>
            : <ul className="mt-2 divide-y divide-[#eef4f9] rounded-xl border border-j-border">
              {ledger.data.payments.map(payment => <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5 text-sm">
                <span className="w-24 shrink-0 tabular-nums text-j-ink-strong">{onDate(payment.paidAt)}</span>
                <span className="w-24 shrink-0 font-bold tabular-nums text-j-ink">{formatSalaryAmount(payment.amount)}</span>
                <span className="min-w-0 flex-1 text-j-ink-soft">
                  {tuitionPaymentMethodLabels[payment.method]}{payment.reference ? ` · ${payment.reference}` : ""}
                  {payment.fromCurrentTutor ? null : <span className="ml-2 text-2xs font-bold uppercase text-j-ink-faint">Previous Tutor</span>}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-2xs font-bold ${statusTone[payment.status]}`}>{tuitionPaymentStatusLabels[payment.status]}</span>
                {payment.status === "submitted" ? <span className="flex gap-2">
                  <button type="button" disabled={decide.isPending} onClick={() => decide.mutate({ paymentId: payment.id, decision: "verified" })} className="h-8 rounded-lg bg-j-accent px-3 text-2xs font-bold text-white disabled:opacity-50">Verify</button>
                  <button type="button" disabled={decide.isPending} onClick={() => decide.mutate({ paymentId: payment.id, decision: "rejected" })} className="h-8 rounded-lg border border-j-border px-3 text-2xs font-bold text-j-ink-soft disabled:opacity-50">Reject</button>
                </span> : null}
              </li>)}
            </ul>}
        </section>

        {charge ? <form
          aria-label="Record a payment"
          className="grid grid-cols-2 gap-3 border-t border-[#eef4f9] pt-4"
          onSubmit={event => {
            event.preventDefault();
            if (!canRecord) return;
            record.mutate({ requestId, amount: parsedAmount, method, reference: reference.trim() || null, paidOn, note: note.trim() || null });
          }}
        >
          <div>
            <label htmlFor="payment-amount" className={labelClass}>Amount (Taka)</label>
            <input id="payment-amount" inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value.replace(/\D/g, ""))} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="payment-method" className={labelClass}>Method</label>
            <select id="payment-method" value={method} onChange={event => setMethod(event.target.value as TuitionPaymentMethod)} className={fieldClass}>
              {tuitionPaymentMethodValues.map(value => <option key={value} value={value}>{tuitionPaymentMethodLabels[value]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="payment-reference" className={labelClass}>Transaction ID</label>
            <input id="payment-reference" value={reference} maxLength={80} onChange={event => setReference(event.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="payment-date" className={labelClass}>Paid on</label>
            <input id="payment-date" type="date" value={paidOn} max={todayInDhaka()} onChange={event => setPaidOn(event.target.value)} className={fieldClass} />
          </div>
          <div className="col-span-2">
            <label htmlFor="payment-note" className={labelClass}>Note</label>
            <input id="payment-note" value={note} maxLength={280} onChange={event => setNote(event.target.value)} className={fieldClass} />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={!canRecord} className="h-10 rounded-xl bg-j-accent px-5 text-sm font-bold text-white disabled:opacity-40">
              {record.isPending ? "Recording…" : "Record payment"}
            </button>
          </div>
        </form> : null}
      </div> : null}
    </ModalBody>
  </Modal>;
}
