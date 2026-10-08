import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useState } from "react";

/** The moves on a Tutor that ask for a confirmation first. */
export type TutorMove = "appoint" | "confirm" | "remove_appointed" | "remove_confirmed";

const isRemoval = (move: TutorMove) => move === "remove_appointed" || move === "remove_confirmed";

/**
 * The step before an Admin appoints, confirms or removes a Tutor.
 *
 * Every screen that makes one of these moves - an applicant's row on Applied
 * Tutors, a tuition's row on Appointed or Confirmed Jobs - opens this, so the
 * move reads the same wherever it is made.
 */
export function TutorMoveDialog({ move, tutorName, tutorNumber, jobId, busy, onClose, onDecide }: {
  move: TutorMove;
  tutorName: string;
  tutorNumber: number | null;
  jobId: string;
  busy: boolean;
  onClose: () => void;
  onDecide: () => void;
}) {
  return <Modal size="sm" onClose={onClose} busy={busy}>
    <ModalHeader
      title={move === "appoint" ? `Appoint ${tutorName}?` : move === "confirm" ? `Confirm ${tutorName}?` : `Remove ${tutorName}?`}
      meta={`Tutor ID ${tutorNumber ?? "not set"} · Job ID ${jobId}`}
    />
    <ModalBody>
      <p className="text-sm leading-6 text-j-ink-soft">{move === "appoint"
        ? "The Tutor receives the Guardian's name and mobile number, and the Guardian sees the Tutor's. The tuition stays on the Job Board for the demo class."
        : move === "confirm"
          ? "The Guardian keeps the Tutor. The tuition leaves the Job Board."
          : move === "remove_confirmed"
            ? "The Tutor is removed and told. The tuition goes back on the Job Board, its payment status starts again at Full Due, and the Guardian can appoint another applicant."
            : "The Tutor is removed and told. The tuition is Live again, and the Guardian can appoint another applicant."}</p>
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Cancel</button>
      <button
        type="button"
        disabled={busy}
        onClick={onDecide}
        className={`h-10 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50 ${isRemoval(move) ? "bg-red-600 hover:bg-red-700" : move === "confirm" ? "bg-[#0f7048] hover:bg-[#0c5b3a]" : "bg-j-accent hover:bg-j-accent-hover"}`}
      >{busy
        ? (move === "appoint" ? "Appointing…" : move === "confirm" ? "Confirming…" : "Removing…")
        : (move === "appoint" ? "Appoint" : move === "confirm" ? "Confirm" : "Remove Tutor")}</button>
    </ModalFooter>
  </Modal>;
}

/**
 * Cancelling a tuition, which needs a reason the Guardian and the Tutor are
 * told. The reason is typed here, so it starts empty every time this opens.
 */
export function CancelTuitionDialog({ jobId, guardianName, busy, onClose, onCancel }: {
  jobId: string;
  guardianName?: string | null;
  busy: boolean;
  onClose: () => void;
  onCancel: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return <Modal size="sm" onClose={onClose} busy={busy}>
    <ModalHeader title={`Cancel Job ID ${jobId}?`} meta={guardianName ? `Guardian ${guardianName}` : undefined} />
    <ModalBody className="space-y-3">
      <p className="text-sm leading-6 text-j-ink-soft">The tuition closes and leaves the Job Board. The Guardian is told, and so is its Tutor if it has one.</p>
      <label className="block text-sm font-bold text-j-ink-strong">Reason (required)
        <textarea
          value={reason}
          onChange={event => setReason(event.target.value)}
          rows={3}
          maxLength={280}
          className="mt-2 w-full rounded-xl border border-j-field-border p-3 text-sm font-normal outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
        />
      </label>
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Keep Tuition</button>
      <button
        type="button"
        disabled={busy || reason.trim().length < 3}
        onClick={() => onCancel(reason.trim())}
        className="h-10 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
      >{busy ? "Cancelling…" : "Cancel Tuition"}</button>
    </ModalFooter>
  </Modal>;
}
