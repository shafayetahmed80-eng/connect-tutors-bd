import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { jobIdForRequest } from "@shared/job-id";
import {
  cancellationReasonLabels,
  cancellationReasons,
  type CancellationReason,
  type SettlementDisposition,
} from "@shared/platform-charge";
import { formatSalaryAmount } from "@shared/salary-amount";
import { LoadingCradle } from "@/components/BrandMark";
import { useState } from "react";
import { toast } from "sonner";

const phaseLabels = {
  unpaid_first_month: "Ended in the first month, nothing paid",
  first_month: "Ended in the first month",
  second_month: "Ended in the second month",
  later: "Ended after two months",
} as const;

const fieldClass = "h-10 w-full rounded-xl border border-j-border bg-j-surface-sunken px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100";
const labelClass = "mb-1 block text-2xs font-bold uppercase tracking-wide text-j-ink-muted";

export type ExistingSettlement = { reason: CancellationReason; retained: number; disposition: SettlementDisposition };

/**
 * An Admin settles a tuition that was cancelled after it was confirmed: what
 * the Tutor keeps owing for it, and so what of their payments comes back.
 *
 * The figure starts from the rates for the grounds given, and the Admin can
 * move it - the grounds (a Guardian's valid reason, told to us in time) are a
 * judgement, and the record says who made it. A refund is sent back or kept as
 * credit for the Tutor's other tuitions.
 */
export default function TuitionSettlementModal({ requestId, existing, onClose }: { requestId: number; existing: ExistingSettlement | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [reason, setReason] = useState<CancellationReason>(existing?.reason ?? "guardian_valid");
  const [received, setReceived] = useState("");
  const [keepOverride, setKeepOverride] = useState(existing ? String(existing.retained) : "");
  const [disposition, setDisposition] = useState<Exclude<SettlementDisposition, "none">>(existing && existing.disposition !== "none" ? existing.disposition : "refunded");
  const [note, setNote] = useState("");

  const receivedSalary = received === "" ? null : Number.parseInt(received, 10);
  const preview = trpc.admin.previewTuitionSettlement.useQuery({ requestId, reason, receivedSalary }, { retry: false });
  const save = trpc.admin.saveTuitionSettlement.useMutation({
    onSuccess: () => {
      void utils.admin.listCancelledCharges.invalidate();
      toast.success("Settlement saved.");
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  const data = preview.data;
  const keep = keepOverride === "" ? data?.retained ?? 0 : Math.min(data?.total ?? 0, Number.parseInt(keepOverride, 10) || 0);
  const paid = data?.paid ?? 0;
  const refund = Math.max(0, paid - keep);
  const due = Math.max(0, keep - paid);
  const usesReceived = data?.phase === "unpaid_first_month" || (data?.phase === "first_month" && paid === 0);

  return <Modal size="lg" onClose={onClose} busy={save.isPending}>
    <ModalHeader title={`Settle · Job ID ${jobIdForRequest(requestId)}`} />
    <ModalBody>
      {preview.isError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{preview.error.message}</p> : null}
      {preview.isLoading ? <div className="flex min-h-24 items-center justify-center text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Working out the settlement…</div> : null}

      {data ? <div className="space-y-5">
        <p className="text-sm font-semibold text-j-ink">{phaseLabels[data.phase]}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="settle-reason" className={labelClass}>Why it ended</label>
            <select id="settle-reason" value={reason} onChange={event => { setReason(event.target.value as CancellationReason); setKeepOverride(""); }} className={fieldClass}>
              {cancellationReasons.map(value => <option key={value} value={value}>{cancellationReasonLabels[value]}</option>)}
            </select>
          </div>
          {usesReceived ? <div>
            <label htmlFor="settle-received" className={labelClass}>Salary received (Taka)</label>
            <input id="settle-received" inputMode="numeric" value={received} onChange={event => { setReceived(event.target.value.replace(/\D/g, "")); setKeepOverride(""); }} className={fieldClass} />
          </div> : null}
        </div>

        <dl className="grid grid-cols-3 gap-3">
          {([["Full charge", data.total], ["Paid", paid], ["Suggested to keep", data.retained]] as const).map(([label, value]) => <div key={label}>
            <dt className="text-2xs font-bold uppercase tracking-wide text-j-ink-muted">{label}</dt>
            <dd className="mt-0.5 text-base font-bold tabular-nums text-j-ink">{formatSalaryAmount(value)}</dd>
          </div>)}
        </dl>

        <div className="max-w-xs">
          <label htmlFor="settle-keep" className={labelClass}>Charge to keep (Taka)</label>
          <input id="settle-keep" inputMode="numeric" value={keepOverride === "" ? String(data.retained) : keepOverride} onChange={event => setKeepOverride(event.target.value.replace(/\D/g, ""))} className={fieldClass} />
          {keepOverride !== "" && Number(keepOverride) !== data.retained
            ? <button type="button" onClick={() => setKeepOverride("")} className="mt-1 text-2xs font-bold text-j-accent">Use the suggested {formatSalaryAmount(data.retained)}</button>
            : null}
        </div>

        <p aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm font-bold ${refund > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : due > 0 ? "border-red-200 bg-red-50 text-red-800" : "border-j-border bg-j-surface-sunken text-j-ink-strong"}`}>
          {refund > 0 ? `${formatSalaryAmount(refund)} comes back to the Tutor` : due > 0 ? `${formatSalaryAmount(due)} is still due from the Tutor` : "Nothing more is due either way"}
        </p>

        {refund > 0 ? <div role="radiogroup" aria-label="What becomes of the refund" className="inline-flex flex-wrap gap-1 rounded-xl border border-j-border bg-j-surface-sunken p-1">
          {([["refunded", "Send it back"], ["credited", "Credit to their other tuitions"]] as const).map(([value, label]) => <button
            key={value}
            type="button"
            role="radio"
            aria-checked={disposition === value}
            onClick={() => setDisposition(value)}
            className={`h-9 rounded-lg px-3.5 text-sm font-bold ${disposition === value ? "bg-white text-j-accent shadow-sm" : "text-j-ink-soft hover:text-j-ink-strong"}`}
          >{label}</button>)}
        </div> : null}

        <div>
          <label htmlFor="settle-note" className={labelClass}>Note</label>
          <input id="settle-note" value={note} maxLength={280} onChange={event => setNote(event.target.value)} className={fieldClass} />
        </div>
      </div> : null}
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} disabled={save.isPending} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft disabled:opacity-50">Cancel</button>
      <button
        type="button"
        disabled={!data || save.isPending}
        onClick={() => save.mutate({
          requestId,
          reason,
          receivedSalary,
          retained: keepOverride === "" ? null : keep,
          disposition: refund > 0 ? disposition : "none",
          note: note.trim() || null,
        })}
        className="h-10 rounded-xl bg-j-accent px-5 text-sm font-bold text-white disabled:opacity-40"
      >{save.isPending ? "Saving…" : "Save settlement"}</button>
    </ModalFooter>
  </Modal>;
}
