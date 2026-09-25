import ChargeSummaryBlock, { onDate } from "@/components/ChargeSummaryBlock";
import PaymentForm from "@/components/PaymentForm";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { jobIdForRequest } from "@shared/job-id";
import {
  chargeKindLabels,
  tuitionPaymentMethodValues,
  tuitionPaymentMethodLabels,
  tuitionPaymentStatusLabels,
  type TuitionPaymentStatus,
} from "@shared/platform-charge";
import { formatSalaryAmount } from "@shared/salary-amount";
import { LoadingCradle } from "@/components/BrandMark";
import { useState } from "react";
import { toast } from "sonner";

export const statusTone: Record<TuitionPaymentStatus, string> = {
  submitted: "border-amber-200 bg-amber-50 text-amber-800",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
};

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

  const [clearSignal, setClearSignal] = useState(0);
  const record = trpc.admin.recordTuitionPayment.useMutation({
    onSuccess: () => { refresh(); setClearSignal(signal => signal + 1); toast.success("Payment recorded."); },
    onError: error => toast.error(error.message),
  });
  const decide = trpc.admin.decideTuitionPayment.useMutation({
    onSuccess: result => { refresh(); toast.success(result.status === "verified" ? "Payment verified." : "Payment rejected."); },
    onError: error => toast.error(error.message),
  });
  const chooseKind = trpc.admin.setTuitionChargeKind.useMutation({
    onSuccess: () => { refresh(); toast.success("Saved."); },
    onError: error => toast.error(error.message),
  });

  const charge = ledger.data?.charge ?? null;

  return <Modal size="lg" onClose={onClose} busy={record.isPending || decide.isPending || chooseKind.isPending}>
    <ModalHeader title={`Payments · Job ID ${jobIdForRequest(requestId)}`} />
    <ModalBody>
      {ledger.isLoading ? <div className="flex min-h-32 items-center justify-center text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading payments…</div> : null}
      {ledger.isError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Payments could not be loaded.</p> : null}

      {ledger.data ? <div className="space-y-5">
        {/* A tuition open to Home or Online is charged as one of them, at that one's rates. */}
        {ledger.data.tuitionType === "both" ? <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="charged-as" className="text-2xs font-bold uppercase tracking-wide text-j-ink-muted">Charged as</label>
          <select
            id="charged-as"
            value={ledger.data.kind}
            disabled={!ledger.data.canChooseKind || chooseKind.isPending}
            onChange={event => chooseKind.mutate({ requestId, kind: event.target.value as "home" | "online" })}
            className="h-10 rounded-xl border border-j-border bg-j-surface-sunken px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100 disabled:opacity-60"
          >
            <option value="home">{chargeKindLabels.home}</option>
            <option value="online">{chargeKindLabels.online}</option>
          </select>
        </div> : null}

        {charge ? <ChargeSummaryBlock charge={charge} /> : <p className="rounded-xl border border-dashed border-[#c9dce9] p-4 text-sm text-j-ink-muted">This tuition has no salary, so there is no charge.</p>}

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

        {charge ? <PaymentForm
          label="Record a payment"
          methods={tuitionPaymentMethodValues}
          submitLabel="Record payment"
          pendingLabel="Recording…"
          pending={record.isPending}
          clearSignal={clearSignal}
          onSubmit={values => record.mutate({ requestId, ...values })}
        /> : null}
      </div> : null}
    </ModalBody>
  </Modal>;
}
