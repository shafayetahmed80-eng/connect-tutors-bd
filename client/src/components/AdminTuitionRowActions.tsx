import {
  ApproveGuardianTuitionRequestDialog,
  useAdminGuardianTuitionRequest,
  type AdminGuardianTuitionRequest,
} from "@/components/AdminGuardianTuitionRequest";
import { CancelTuitionDialog, TutorMoveDialog, type TutorMove } from "@/components/AdminTuitionActionDialogs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { applicantActionLabels, applicantActions, canCancelTuition } from "@shared/admin-applicant-actions";
import { jobIdForRequest } from "@shared/job-id";
import { CircleCheck, CircleX, Ellipsis, UserMinus } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

/** What a row on Appointed or Confirmed Jobs needs to act on its tuition. */
export type TutorHeldTuitionRow = {
  id: number;
  tutorId: string;
  tutorName: string;
  tutorNumber: number | null;
  guardianRequest: AdminGuardianTuitionRequest | null;
};

type HeldMove = Exclude<TutorMove, "appoint">;

type Pending =
  | { kind: "move"; row: TutorHeldTuitionRow; move: HeldMove }
  | { kind: "cancel"; row: TutorHeldTuitionRow }
  | { kind: "answer"; row: TutorHeldTuitionRow };

const isHeldMove = (action: string): action is HeldMove =>
  action === "confirm" || action === "remove_appointed" || action === "remove_confirmed";

/**
 * The next move on a tuition a Tutor holds, from its own row.
 *
 * Applied Tutors is where a tuition's applicants are worked through to a
 * Confirmed Tutor; the Appointed and Confirmed lists are where an Admin finds
 * a tuition after that, so the moves left to make - confirm, remove the Tutor,
 * cancel the tuition, answer the Guardian's own request - are made here too.
 * What each row offers comes from `applicantActions`, the rule Applied Tutors
 * uses, and the server checks every move again.
 *
 * `renderMenu` is the row's control; `dialogs` goes once on the page.
 */
export function useAdminTuitionRowActions(stage: "appointed" | "confirmed") {
  const utils = trpc.useUtils();
  const refresh = () => {
    void utils.admin.listAppliedTutors.invalidate();
    void utils.admin.listPostedJobs.invalidate();
    void utils.admin.listAppointedJobs.invalidate();
    void utils.admin.listConfirmedJobs.invalidate();
    void utils.admin.listCancelledCharges.invalidate();
    void utils.admin.listTutorDirectory.invalidate();
    void utils.admin.listTutorApplications.invalidate();
    // A move answers any request waiting on the tuition, which the sidebar counts.
    void utils.admin.guardianRequestCounts.invalidate();
  };
  const [pending, setPending] = useState<Pending | null>(null);
  const close = () => setPending(null);
  // A dialog opens once the menu that chose it has closed: while the menu is open it holds the focus, and the dialog's own focus would be pulled back out.
  const chosen = useRef<Pending | null>(null);
  const choose = (next: Pending) => { chosen.current = next; };
  // A refusal can mean the tuition moved on meanwhile, so the lists are read again.
  const onError = (error: { message: string }) => { toast.error(error.message); refresh(); };

  const confirmTutor = trpc.admin.confirmTutorRequestAppointment.useMutation({ onError });
  const removeAppointed = trpc.admin.reopenAppointedTuition.useMutation({ onError });
  const removeConfirmed = trpc.admin.removeConfirmedTutor.useMutation({ onError });
  const cancelTuition = trpc.admin.cancelTutorRequest.useMutation({ onError });
  // A cancellation the Guardian asked for lands on the Cancelled tab too.
  const guardianAnswer = useAdminGuardianTuitionRequest(() => { close(); void utils.admin.listCancelledCharges.invalidate(); });

  const movePending = confirmTutor.isPending || removeAppointed.isPending || removeConfirmed.isPending;
  const busy = movePending || cancelTuition.isPending || guardianAnswer.busy;

  const settle = (message: string) => () => { close(); refresh(); toast.success(message); };

  const decide = () => {
    if (pending?.kind !== "move") return;
    const { row, move } = pending;
    const input = { requestId: row.id, tutorId: row.tutorId };
    if (move === "confirm") confirmTutor.mutate(input, { onSuccess: settle(`${row.tutorName} is confirmed.`) });
    else if (move === "remove_appointed") removeAppointed.mutate(input, { onSuccess: settle(`${row.tutorName} is removed. The tuition is Live again.`) });
    else removeConfirmed.mutate(input, { onSuccess: settle(`${row.tutorName} is removed. The tuition is Live again.`) });
  };

  const renderMenu = (row: TutorHeldTuitionRow): ReactNode => {
    const request = row.guardianRequest;
    const asked = request?.tutorId === row.tutorId ? request : null;
    const moves = applicantActions({ tuitionStage: stage, applicationStatus: "matched", holdsTuition: true, tutorApproved: true })
      .map(option => option.action)
      .filter(isHeldMove)
      // The Guardian's waiting Confirm or Remove is answered by Approve, which makes the same move.
      .filter(move => !(asked?.type === "confirm" && move === "confirm")
        && !(asked?.type === "remove_tutor" && (move === "remove_appointed" || move === "remove_confirmed")));
    const canCancel = canCancelTuition(stage) && request?.type !== "cancel_tuition";
    const jobId = jobIdForRequest(row.id);

    return <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={busy}
          aria-label={`Actions of Job ID ${jobId}`}
          className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50 disabled:opacity-40"
        >
          <Ellipsis size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44" onCloseAutoFocus={() => { if (chosen.current) { setPending(chosen.current); chosen.current = null; } }}>
        {request ? <>
          <DropdownMenuItem className="min-h-10 font-bold text-j-accent" onSelect={() => choose({ kind: "answer", row })}>
            <CircleCheck /> Approve request
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-10 font-bold" onSelect={() => guardianAnswer.decline.mutate({ guardianRequestId: request.id })}>
            <CircleX /> Decline request
          </DropdownMenuItem>
          {moves.length > 0 || canCancel ? <DropdownMenuSeparator /> : null}
        </> : null}
        {moves.map(move => <DropdownMenuItem
          key={move}
          variant={move === "confirm" ? "default" : "destructive"}
          className={`min-h-10 font-bold ${move === "confirm" ? "text-[#0f7048]" : ""}`}
          onSelect={() => choose({ kind: "move", row, move })}
        >
          {move === "confirm" ? <CircleCheck className="text-[#0f7048]" /> : <UserMinus />} {applicantActionLabels[move]}
        </DropdownMenuItem>)}
        {canCancel ? <DropdownMenuItem variant="destructive" className="min-h-10 font-bold" onSelect={() => choose({ kind: "cancel", row })}>
          <CircleX /> Cancel Tuition
        </DropdownMenuItem> : null}
      </DropdownMenuContent>
    </DropdownMenu>;
  };

  const dialogs = <>
    {pending?.kind === "move" ? <TutorMoveDialog
      move={pending.move}
      tutorName={pending.row.tutorName}
      tutorNumber={pending.row.tutorNumber}
      jobId={jobIdForRequest(pending.row.id)}
      busy={movePending}
      onClose={close}
      onDecide={decide}
    /> : null}
    {pending?.kind === "cancel" ? <CancelTuitionDialog
      jobId={jobIdForRequest(pending.row.id)}
      busy={cancelTuition.isPending}
      onClose={close}
      onCancel={reason => cancelTuition.mutate(
        { requestId: pending.row.id, reason },
        { onSuccess: settle(`Job ID ${jobIdForRequest(pending.row.id)} is cancelled.`) },
      )}
    /> : null}
    {pending?.kind === "answer" && pending.row.guardianRequest ? <ApproveGuardianTuitionRequestDialog
      request={pending.row.guardianRequest}
      jobId={jobIdForRequest(pending.row.id)}
      tutorName={pending.row.tutorName}
      confirmed={stage === "confirmed"}
      busy={guardianAnswer.approve.isPending}
      onClose={close}
      onApprove={() => guardianAnswer.approve.mutate({ guardianRequestId: pending.row.guardianRequest!.id })}
    /> : null}
  </>;

  return { renderMenu, dialogs };
}
