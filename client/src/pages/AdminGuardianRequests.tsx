import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { ApproveGuardianTuitionRequestDialog, useAdminGuardianTuitionRequest } from "@/components/AdminGuardianTuitionRequest";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import StatusTabRow from "@/components/StatusTabRow";
import { TutorListPager } from "@/components/TutorListPager";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { jobIdForRequest } from "@shared/job-id";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, Redirect, useRoute } from "wouter";

export const guardianRequestKinds = ["shortlist", "appoint", "confirm", "cancel"] as const;
export type GuardianRequestKind = (typeof guardianRequestKinds)[number];

type Status = "pending" | "approved" | "declined";
type RequestType = "shortlist" | "appoint" | "confirm" | "remove_tutor" | "cancel_tuition";

export type GuardianRequestRow = {
  key: number;
  requestId: number;
  interestId?: number;
  guardianRequestId?: number;
  type: RequestType;
  reason: string | null;
  status: string;
  createdAt: string | Date | null;
  decidedAt: string | Date | null;
  tuitionConfirmed: boolean;
  guardianUserId: number;
  guardianName: string | null;
  guardianId: string | null;
  tutorId: string | null;
  tutorName: string | null;
  tutorNumber: string | number | null;
};

/** What each screen is for, said once, in the words the sidebar uses. */
const kindCopy: Record<GuardianRequestKind, { title: string; empty: string; dateLabel: string; caption: string }> = {
  shortlist: { title: "Shortlist Requests", empty: "No Guardian has shortlisted an applicant.", dateLabel: "Shortlisted", caption: "Applicants Guardians have shortlisted" },
  appoint: { title: "Appoint Requests", empty: "No appointment request is waiting.", dateLabel: "Requested", caption: "Appointment requests" },
  confirm: { title: "Confirm Requests", empty: "No confirmation request.", dateLabel: "Requested", caption: "Confirmation requests" },
  cancel: { title: "Cancel Requests", empty: "No cancellation or removal request.", dateLabel: "Requested", caption: "Cancellation and removal requests" },
};

const typeLabels: Record<RequestType, string> = {
  shortlist: "Shortlisted",
  appoint: "Appointment",
  confirm: "Confirmation",
  remove_tutor: "Remove Tutor",
  cancel_tuition: "Cancel tuition",
};

const statusTabs: Array<{ key: Status; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
];

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function PersonCell({ name, ids, href }: { name: string | null; ids: string | null; href?: string }) {
  const shown = name?.trim() || "—";
  return <div className="min-w-0">
    {href && name ? <Link href={href} className="font-bold text-j-ink hover:text-j-accent hover:underline">{shown}</Link> : <span className="font-bold text-j-ink">{shown}</span>}
    {ids ? <p className="text-xs tabular-nums text-j-ink-soft">{ids}</p> : null}
  </div>;
}

/**
 * One Guardian action, one screen: the Shortlist, Appoint, Confirm and Cancel
 * rows under Guardian Requests in the sidebar. A shortlist is only a signal,
 * so it has nothing to answer; the other three carry Approve and Decline, which
 * are the very moves Applied Tutors makes.
 */
export function AdminGuardianRequestsContent({ kind }: { kind: GuardianRequestKind }) {
  const copy = kindCopy[kind];
  const [status, setStatus] = useState<Status>("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [approving, setApproving] = useState<GuardianRequestRow | null>(null);
  useEffect(() => { setStatus("pending"); setPage(1); }, [kind]);

  const list = trpc.admin.listGuardianRequestActions.useQuery({ kind, status, page, pageSize });
  const utils = trpc.useUtils();
  const refresh = () => {
    void utils.admin.listGuardianRequestActions.invalidate();
    void utils.admin.guardianRequestCounts.invalidate();
    void utils.admin.listAppliedTutors.invalidate();
  };
  const onError = (error: { message: string }) => { toast.error(error.message); refresh(); };
  const tuitionAnswer = useAdminGuardianTuitionRequest(() => { setApproving(null); refresh(); });
  const appointApprove = trpc.admin.approveAppointmentRequest.useMutation({ onSuccess: () => { setApproving(null); refresh(); toast.success("Tutor appointed."); }, onError });
  const appointDecline = trpc.admin.declineAppointmentRequest.useMutation({ onSuccess: () => { refresh(); toast.success("Request declined."); }, onError });
  const busy = tuitionAnswer.busy || appointApprove.isPending || appointDecline.isPending;

  const rows = (list.data?.items ?? []) as GuardianRequestRow[];
  const answerable = kind !== "shortlist" && status === "pending";
  const decline = (row: GuardianRequestRow) => {
    if (row.type === "appoint" && row.interestId) appointDecline.mutate({ interestId: row.interestId });
    else if (row.guardianRequestId) tuitionAnswer.decline.mutate({ guardianRequestId: row.guardianRequestId }, { onSettled: refresh });
  };
  const rowLabel = (row: GuardianRequestRow) => `${typeLabels[row.type].toLowerCase()} for Job ID ${jobIdForRequest(row.requestId)}`;

  const columns: RecordColumn<GuardianRequestRow>[] = [
    {
      key: "job", label: "Job ID", place: "head",
      cell: row => <Link href={`/admin/applied-tutors/${row.requestId}`} className="whitespace-nowrap font-bold tabular-nums text-j-accent hover:underline">{jobIdForRequest(row.requestId)}</Link>,
    },
    ...(kind === "confirm" || kind === "cancel"
      ? [{ key: "type", label: "Request", place: "head" as const, cell: (row: GuardianRequestRow) => <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-2xs font-bold text-amber-800">{typeLabels[row.type]}</span> }]
      : []),
    { key: "guardian", label: "Guardian", cell: row => <PersonCell name={row.guardianName} ids={row.guardianId ? `Guardian ID ${row.guardianId}` : null} href={`/admin/guardians/${row.guardianUserId}`} /> },
    {
      key: "tutor", label: "Tutor",
      cell: row => <PersonCell name={row.tutorName} ids={row.tutorNumber ? `Tutor ID ${row.tutorNumber}` : null} href={row.tutorId ? `/admin/tutor-profiles/${row.tutorId}` : undefined} />,
    },
    ...(kind === "cancel" || kind === "confirm"
      ? [{ key: "reason", label: "Guardian's reason", wide: true, cell: (row: GuardianRequestRow) => row.reason ? <span className="whitespace-pre-line break-words">{row.reason}</span> : <span className="text-j-ink-faint">—</span> }]
      : []),
    { key: "date", label: copy.dateLabel, cell: row => <span className="whitespace-nowrap tabular-nums">{formatDate(row.createdAt)}</span> },
    ...(kind !== "shortlist" && status !== "pending"
      ? [{ key: "decided", label: status === "approved" ? "Approved" : "Declined", cell: (row: GuardianRequestRow) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.decidedAt)}</span> }]
      : []),
    ...(answerable
      ? [{
          key: "actions", label: "Actions", place: "action" as const, headingHidden: true,
          cell: (row: GuardianRequestRow) => <span className="inline-flex gap-1.5">
            <button type="button" disabled={busy} onClick={() => setApproving(row)} aria-label={`Approve ${rowLabel(row)}`} className="inline-flex h-8 items-center rounded-lg bg-j-accent px-3 text-xs font-bold text-white hover:bg-j-accent-hover disabled:opacity-40">Approve</button>
            <button type="button" disabled={busy} onClick={() => decline(row)} aria-label={`Decline ${rowLabel(row)}`} className="inline-flex h-8 items-center rounded-lg border border-j-border px-3 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-40">Decline</button>
          </span>,
        }]
      : []),
  ];

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <h1 className="sr-only">{copy.title}</h1>
    {kind === "confirm" || kind === "cancel"
      ? <StatusTabRow label="Request status" items={statusTabs.map(tab => ({ ...tab, count: list.data?.counts[tab.key] }))} selected={status} onSelect={key => { setStatus(key ?? "pending"); setPage(1); }} />
      : null}

    {list.isLoading ? <div className="flex min-h-40 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div> : null}
    {list.isError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{copy.title} could not be loaded.</div> : null}
    {!list.isLoading && !list.isError
      ? <RecordTable caption={copy.caption} columns={columns} rows={rows} rowKey={row => row.key} empty={copy.empty} tableClassName="min-w-[56rem]" />
      : null}
    <TutorListPager
      page={page}
      totalPages={list.data?.totalPages ?? 1}
      onPage={setPage}
      label={`${copy.title} pages`}
      pageSize={pageSize}
      pageSizeOptions={[20, 50, 100]}
      onPageSize={next => { setPageSize(next); setPage(1); }}
      totalItems={list.data?.total}
    />

    {approving && approving.type === "appoint" ? <Modal size="sm" onClose={() => setApproving(null)} busy={appointApprove.isPending}>
      <ModalHeader title={`Appoint ${approving.tutorName ?? "this Tutor"}?`} meta={`Tutor ID ${approving.tutorNumber ?? "not set"} · Job ID ${jobIdForRequest(approving.requestId)}`} />
      <ModalBody>
        <p className="text-sm leading-6 text-j-ink-soft">The Tutor receives the Guardian's name and mobile number, and the Guardian sees the Tutor's. The tuition stays on the Job Board for the demo class.</p>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setApproving(null)} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Cancel</button>
        <button type="button" disabled={appointApprove.isPending || !approving.interestId} onClick={() => { if (approving.interestId) appointApprove.mutate({ interestId: approving.interestId }); }} className="h-10 rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-50">{appointApprove.isPending ? "Approving…" : "Approve"}</button>
      </ModalFooter>
    </Modal> : null}

    {approving && approving.type !== "appoint" && approving.type !== "shortlist" && approving.guardianRequestId ? <ApproveGuardianTuitionRequestDialog
      request={{ id: approving.guardianRequestId, type: approving.type, tutorId: approving.tutorId, reason: approving.reason }}
      jobId={jobIdForRequest(approving.requestId)}
      tutorName={approving.tutorName ?? undefined}
      confirmed={approving.tuitionConfirmed}
      busy={tuitionAnswer.approve.isPending}
      onClose={() => setApproving(null)}
      onApprove={() => tuitionAnswer.approve.mutate({ guardianRequestId: approving.guardianRequestId! })}
    /> : null}
  </div>;
}

export default function AdminGuardianRequests() {
  const [match, params] = useRoute("/admin/guardian-requests/:kind");
  const kind = params?.kind as GuardianRequestKind | undefined;
  if (!match || !kind || !guardianRequestKinds.includes(kind)) return <Redirect to="/admin/guardian-requests/appoint" />;
  return <AdminWorkspaceLayout title={kindCopy[kind].title}><AdminGuardianRequestsContent kind={kind} /></AdminWorkspaceLayout>;
}
