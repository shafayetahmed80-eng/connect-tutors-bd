import {
  tuitionPaymentMethodLabels,
  tuitionPaymentMethodValues,
  type TuitionPaymentMethod,
} from "@shared/platform-charge";
import { useEffect, useState } from "react";

/** Today as the Dhaka calendar reads it, in the `YYYY-MM-DD` a date box wants. */
export function todayInDhaka() {
  return new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export type PaymentFormValues = {
  amount: number;
  method: TuitionPaymentMethod;
  reference: string | null;
  paidOn: string;
  note: string | null;
};

const fieldClass = "h-10 w-full rounded-xl border border-j-border bg-j-surface-sunken px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100";
const labelClass = "mb-1 block text-2xs font-bold uppercase tracking-wide text-j-ink-muted";

/**
 * The fields for one payment, the same whoever is typing them: an Admin
 * recording money that arrived, or a Tutor reporting money they sent.
 *
 * The amount takes digits only, so a stray letter cannot become a payment.
 * `clearSignal` empties the fields when it changes - the parent bumps it once
 * a payment has gone through.
 */
export default function PaymentForm({ label, submitLabel, pendingLabel, pending, clearSignal, onSubmit }: {
  label: string;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  clearSignal: number;
  onSubmit: (values: PaymentFormValues) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<TuitionPaymentMethod>("bkash");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(todayInDhaka);
  const [note, setNote] = useState("");

  useEffect(() => {
    setAmount("");
    setReference("");
    setNote("");
  }, [clearSignal]);

  const parsed = Number.parseInt(amount, 10);
  const canSubmit = Number.isInteger(parsed) && parsed > 0 && Boolean(paidOn) && !pending;

  return <form
    aria-label={label}
    className="grid grid-cols-2 gap-3 border-t border-[#eef4f9] pt-4"
    onSubmit={event => {
      event.preventDefault();
      if (!canSubmit) return;
      onSubmit({ amount: parsed, method, reference: reference.trim() || null, paidOn, note: note.trim() || null });
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
      <button type="submit" disabled={!canSubmit} className="h-10 rounded-xl bg-j-accent px-5 text-sm font-bold text-white disabled:opacity-40">
        {pending ? pendingLabel : submitLabel}
      </button>
    </div>
  </form>;
}
