import { tuitionRequestWaitingLabels, type GuardianTuitionRequestType } from "@/components/GuardianTuitionRequestDialog";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/** A Guardian's Confirm, Remove or Cancel request as an Admin reads it: with its reason. */
export type AdminGuardianTuitionRequest = {
  id: number;
  type: GuardianTuitionRequestType;
  tutorId: string | null;
  reason: string | null;
};

/**
 * Approving and declining a Guardian's request.
 *
 * Approving makes the move the Guardian asked for, so every list a Confirm,
 * Remove or Cancel changes is refreshed after either.
 */
export function useAdminGuardianTuitionRequest(onApproved?: () => void) {
  const utils = trpc.useUtils();
  const refresh = () => {
    void utils.admin.listAppliedTutors.invalidate();
    void utils.admin.listPostedJobs.invalidate();
    void utils.admin.listAppointedJobs.invalidate();
    void utils.admin.listConfirmedJobs.invalidate();
    void utils.admin.listTutorDirectory.invalidate();
    void utils.admin.listTutorApplications.invalidate();
  };
  // A refusal can mean the tuition moved on and the request was closed, so the lists are read again then too.
  const onError = (error: { message: string }) => { toast.error(error.message); refresh(); };
  const approve = trpc.admin.approveGuardianTuitionRequest.useMutation({
    onSuccess: () => { refresh(); onApproved?.(); toast.success("Request approved."); },
    onError,
  });
  const decline = trpc.admin.declineGuardianTuitionRequest.useMutation({
    onSuccess: () => { refresh(); toast.success("Request declined."); },
    onError,
  });
  return { approve, decline, busy: approve.isPending || decline.isPending };
}

/** The mark a waiting request wears, with the Admin's two answers beside it. */
export function AdminGuardianTuitionRequestMark({ request, busy, onApprove, onDecline }: {
  request: AdminGuardianTuitionRequest;
  busy: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const label = tuitionRequestWaitingLabels[request.type];
  return <span className="inline-flex flex-wrap items-center gap-1.5">
    <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-2xs font-bold text-amber-800">{label}</span>
    <button type="button" disabled={busy} onClick={onApprove} aria-label={`Approve: ${label}`} className="inline-flex h-7 items-center rounded-lg bg-j-accent px-2.5 text-2xs font-bold text-white hover:bg-j-accent-hover disabled:opacity-40">Approve</button>
    <button type="button" disabled={busy} onClick={onDecline} aria-label={`Decline: ${label}`} className="inline-flex h-7 items-center rounded-lg border border-j-border px-2.5 text-2xs font-bold text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-40">Decline</button>
  </span>;
}

/** The mark alone, where the answer is given on another screen. */
export function AdminGuardianTuitionRequestPill({ type }: { type: GuardianTuitionRequestType }) {
  return <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-800">{tuitionRequestWaitingLabels[type]}</span>;
}

/**
 * The step before an approval runs: the move is the Admin's own Confirm,
 * Remove or Cancel, so it reads the same as when an Admin makes it directly,
 * with the Guardian's reason above it.
 */
export function ApproveGuardianTuitionRequestDialog({ request, jobId, tutorName, confirmed, busy, onClose, onApprove }: {
  request: AdminGuardianTuitionRequest;
  jobId: string;
  /** Who a confirm or remove request is about. */
  tutorName?: string;
  /** Whether the tuition is Confirmed, which changes what removing its Tutor does. */
  confirmed: boolean;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
}) {
  const tutor = tutorName ?? "the Tutor";
  const title = request.type === "confirm" ? `Confirm ${tutor}?` : request.type === "remove_tutor" ? `Remove ${tutor}?` : `Cancel Job ID ${jobId}?`;
  const outcome = request.type === "confirm"
    ? "The Guardian keeps the Tutor. The tuition leaves the Job Board."
    : request.type === "remove_tutor"
      ? confirmed
        ? "The Tutor is removed and told. The tuition goes back on the Job Board, its payment status starts again at Full Due, and the Guardian can appoint another applicant."
        : "The Tutor is removed and told. The tuition is Live again, and the Guardian can appoint another applicant."
      : "The tuition closes and leaves the Job Board. The Guardian is told, and so is its Tutor if it has one.";

  return <Modal size="sm" onClose={onClose} busy={busy}>
    <ModalHeader title={title} meta={`${tuitionRequestWaitingLabels[request.type]} · Job ID ${jobId}`} />
    <ModalBody className="space-y-3">
      {request.reason ? <div className="rounded-xl border border-j-border bg-j-surface-sunken p-3">
        <p className="text-2xs font-bold uppercase tracking-wide text-j-ink-muted">Guardian's reason</p>
        <p className="mt-1 whitespace-pre-line break-words text-sm text-j-ink-strong">{request.reason}</p>
      </div> : null}
      <p className="text-sm leading-6 text-j-ink-soft">{outcome}</p>
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Back</button>
      <button
        type="button"
        disabled={busy}
        onClick={onApprove}
        className={`h-10 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50 ${request.type === "confirm" ? "bg-[#0f7048] hover:bg-[#0c5b3a]" : "bg-red-600 hover:bg-red-700"}`}
      >{busy ? "Approving…" : "Approve"}</button>
    </ModalFooter>
  </Modal>;
}
