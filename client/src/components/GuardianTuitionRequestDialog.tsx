import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { requiredMark } from "@/components/journeyField";
import { useState } from "react";

export type GuardianTuitionRequestType = "confirm" | "remove_tutor" | "cancel_tuition";

/** A waiting request as a Guardian's own screens carry it: what was asked, and about which Tutor. */
export type WaitingTuitionRequest = { type: GuardianTuitionRequestType; tutorId: string | null } | null;

/** The mark a waiting request wears, on the Guardian's screens and the Admin's alike. */
export const tuitionRequestWaitingLabels: Record<GuardianTuitionRequestType, string> = {
  confirm: "Confirm requested",
  remove_tutor: "Removal requested",
  cancel_tuition: "Cancellation requested",
};

/** The reason a removal or cancellation carries, bounded as the server bounds it. */
export const TUITION_REQUEST_REASON_MIN_LENGTH = 3;
export const TUITION_REQUEST_REASON_MAX_LENGTH = 280;

export function tuitionRequestNeedsReason(type: GuardianTuitionRequestType) {
  return type !== "confirm";
}

/**
 * The one dialog a Guardian sends a Confirm, Remove or Cancel request from.
 *
 * It names what is being asked and, for a removal or cancellation, takes the
 * reason; nothing else. The request goes to an Admin, so the button says it
 * sends a request rather than doing the thing.
 */
export function GuardianTuitionRequestDialog({ type, jobId, tutorLabel, busy, onClose, onSend }: {
  type: GuardianTuitionRequestType;
  jobId: string;
  /** Who a confirm or remove request is about, as the Guardian knows them - their name, or their Tutor ID. */
  tutorLabel?: string;
  busy: boolean;
  onClose: () => void;
  onSend: (reason: string | undefined) => void;
}) {
  const [reason, setReason] = useState("");
  const needsReason = tuitionRequestNeedsReason(type);
  const ready = !needsReason || reason.trim().length >= TUITION_REQUEST_REASON_MIN_LENGTH;
  const title = type === "confirm"
    ? `Ask to confirm ${tutorLabel ?? "the Tutor"}?`
    : type === "remove_tutor"
      ? `Ask to remove ${tutorLabel ?? "the Tutor"}?`
      : `Ask to cancel Job ID ${jobId}?`;

  return <Modal size="sm" onClose={onClose} busy={busy}>
    <ModalHeader title={title} meta={type === "cancel_tuition" ? undefined : `Job ID ${jobId}`} />
    {needsReason ? <ModalBody>
      <label className="block text-sm font-bold text-j-ink-strong">
        Reason<span className={requiredMark}> *</span>
        <textarea
          value={reason}
          onChange={event => setReason(event.target.value)}
          rows={3}
          maxLength={TUITION_REQUEST_REASON_MAX_LENGTH}
          className="mt-2 w-full rounded-xl border border-j-field-border p-3 text-sm font-normal outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
        />
      </label>
    </ModalBody> : null}
    <ModalFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Back</button>
      <button
        type="button"
        disabled={busy || !ready}
        onClick={() => onSend(needsReason ? reason.trim() : undefined)}
        className={`h-10 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50 ${type === "confirm" ? "bg-[#0f7048] hover:bg-[#0c5b3a]" : "bg-red-600 hover:bg-red-700"}`}
      >{busy ? "Sending…" : "Send request"}</button>
    </ModalFooter>
  </Modal>;
}

/** A waiting request's mark, and the way to take it back. */
export function WaitingTuitionRequestMark({ type, busy, onWithdraw }: { type: GuardianTuitionRequestType; busy: boolean; onWithdraw: () => void }) {
  return <span className="inline-flex flex-wrap items-center gap-2">
    <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-2xs font-bold text-amber-800">{tuitionRequestWaitingLabels[type]}</span>
    <button
      type="button"
      disabled={busy}
      onClick={onWithdraw}
      aria-label={`Withdraw: ${tuitionRequestWaitingLabels[type]}`}
      className="text-2xs font-bold text-j-ink-soft underline-offset-2 hover:underline disabled:opacity-40"
    >
      Withdraw
    </button>
  </span>;
}
