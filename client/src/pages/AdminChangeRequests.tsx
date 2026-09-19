import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import StatusTabRow from "@/components/StatusTabRow";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
  ACCOUNT_CHANGE_REASON_MAX,
  ACCOUNT_CHANGE_REASON_MIN,
  accountChangeTypeLabels,
  accountChangeTypeValues,
  type AccountChangeRole,
  type AccountChangeType,
} from "@shared/account-change-requests";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export const ADMIN_CHANGE_REQUESTS_PATH = "/admin/change-requests";

type QueueStatus = "pending" | "approved" | "declined";

export type ChangeRequestRow = {
  id: number;
  userId: number;
  role: AccountChangeRole;
  type: AccountChangeType;
  status: string;
  currentValue: string | null;
  requestedValue: string | null;
  reason: string | null;
  declineReason: string | null;
  createdAt: string | Date;
  decidedAt: string | Date | null;
  accountName: string | null;
  tutorId: string | null;
  tutorNumber: string | number | null;
  guardianId: string | null;
  decidedByName: string | null;
};

const statusTabs: Array<{ key: QueueStatus; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
];

const roleLabels: Record<AccountChangeRole, string> = { guardian: "Guardian", tutor: "Tutor", admin: "Admin" };
const roleTones: Record<AccountChangeRole, string> = {
  guardian: "bg-emerald-50 text-emerald-800",
  tutor: "bg-sky-50 text-sky-800",
  admin: "bg-violet-50 text-violet-800",
};

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function AccountCell({ row }: { row: ChangeRequestRow }) {
  const name = row.accountName?.trim() || "Unnamed account";
  const id = row.role === "tutor" && row.tutorNumber ? `Tutor ID ${row.tutorNumber}` : row.role === "guardian" && row.guardianId ? `Guardian ID ${row.guardianId}` : null;
  const href = row.role === "tutor" && row.tutorId ? `/admin/tutor-profiles/${row.tutorId}` : row.role === "admin" ? `/admin/profile/${row.userId}` : null;
  return <div className="min-w-0">
    <div className="flex flex-wrap items-center gap-1.5">
      {href ? <Link href={href} className="font-bold text-j-ink hover:text-j-accent hover:underline">{name}</Link> : <span className="font-bold text-j-ink">{name}</span>}
      <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${roleTones[row.role]}`}>{roleLabels[row.role]}</span>
    </div>
    {id ? <p className="mt-0.5 text-xs tabular-nums text-j-ink-soft">{id}</p> : null}
  </div>;
}

/** Old -> new for a name or a mobile; the reason for a delete; the NID check for a verification. */
function ChangeCell({ row }: { row: ChangeRequestRow }) {
  if (row.type === "name" || row.type === "mobile") {
    return <span className="inline-flex flex-wrap items-center gap-1.5 break-words">
      <span className="text-j-ink-soft line-through decoration-j-ink-faint">{row.currentValue || "—"}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-j-ink-faint" aria-label="to" />
      <span className="font-semibold text-j-ink">{row.requestedValue}</span>
    </span>;
  }
  if (row.type === "verification") return <span className="text-j-ink-soft">Both NID sides uploaded</span>;
  return <span className="whitespace-pre-line break-words text-j-ink">{row.reason}</span>;
}

function outcomeText(row: ChangeRequestRow) {
  switch (row.type) {
    case "name":
      return `The account's name changes to ${row.requestedValue}.`;
    case "mobile":
      return row.role === "admin"
        ? `${row.requestedValue} becomes this Admin's mobile number.`
        : `${row.requestedValue} becomes the profile's mobile number and the number this account signs in with.`;
    case "verification":
      return "The Guardian's profile is marked Verified.";
    case "close_account":
      return row.role === "admin"
        ? "The account is closed and signed out, and loses Admin access. It cannot sign in again."
        : "The account is closed and signed out. It cannot sign in again.";
  }
}

function ApproveDialog({ row, busy, onClose, onApprove }: { row: ChangeRequestRow; busy: boolean; onClose: () => void; onApprove: () => void }) {
  const closing = row.type === "close_account";
  return <Modal size="sm" onClose={onClose} busy={busy}>
    <ModalHeader title={`Approve ${accountChangeTypeLabels[row.type].toLowerCase()}?`} meta={`${roleLabels[row.role]} · ${row.accountName ?? "Unnamed account"}`} />
    <ModalBody className="space-y-3">
      <div className="rounded-xl border border-j-border bg-j-surface-sunken p-3 text-sm">
        <p className="text-2xs font-bold uppercase tracking-wide text-j-ink-muted">{closing ? "Reason" : "Change"}</p>
        <div className="mt-1"><ChangeCell row={row} /></div>
      </div>
      <p className="text-sm leading-6 text-j-ink-soft">{outcomeText(row)}</p>
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Back</button>
      <button type="button" disabled={busy} onClick={onApprove}
        className={`h-10 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50 ${closing ? "bg-red-600 hover:bg-red-700" : "bg-[#0f7048] hover:bg-[#0c5b3a]"}`}
      >{busy ? "Approving…" : "Approve"}</button>
    </ModalFooter>
  </Modal>;
}

function DeclineDialog({ row, busy, onClose, onDecline }: { row: ChangeRequestRow; busy: boolean; onClose: () => void; onDecline: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const ready = reason.trim().length >= ACCOUNT_CHANGE_REASON_MIN;
  return <Modal size="sm" onClose={onClose} busy={busy}>
    <ModalHeader title={`Decline ${accountChangeTypeLabels[row.type].toLowerCase()}?`} meta={`${roleLabels[row.role]} · ${row.accountName ?? "Unnamed account"}`} />
    <ModalBody className="space-y-2">
      <label htmlFor="decline-reason" className="text-sm font-bold text-j-ink">Reason <span className="text-red-600">*</span></label>
      <textarea id="decline-reason" value={reason} maxLength={ACCOUNT_CHANGE_REASON_MAX} rows={3} onChange={event => setReason(event.target.value)}
        className="w-full rounded-xl border border-j-border bg-white px-3 py-2 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Back</button>
      <button type="button" disabled={busy || !ready} onClick={() => onDecline(reason.trim())}
        className="h-10 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
      >{busy ? "Declining…" : "Decline"}</button>
    </ModalFooter>
  </Modal>;
}

/**
 * Name, mobile, verification and account-delete requests from the three
 * panels' Settings pages, one status at a time. Approving makes the change;
 * declining needs a reason, which the account is shown.
 */
export function AdminChangeRequestsContent() {
  const [status, setStatus] = useState<QueueStatus>("pending");
  const [role, setRole] = useState<AccountChangeRole | "all">("all");
  const [type, setType] = useState<AccountChangeType | "all">("all");
  const [approving, setApproving] = useState<ChangeRequestRow | null>(null);
  const [declining, setDeclining] = useState<ChangeRequestRow | null>(null);
  const isOwner = Boolean(trpc.admin.getWorkspaceAccess.useQuery().data?.isOwner);
  const requests = trpc.accountChanges.list.useQuery({ status, role, type });
  const utils = trpc.useUtils();
  const refresh = () => {
    void utils.accountChanges.list.invalidate();
    void utils.accountChanges.pendingCount.invalidate();
  };
  const decide = trpc.accountChanges.decide.useMutation({
    onSuccess: result => {
      refresh();
      setApproving(null);
      setDeclining(null);
      toast.success(result.status === "approved" ? "Request approved." : "Request declined.");
    },
    // A refusal can mean another Admin answered first, so the list is read again.
    onError: error => { toast.error(error.message); refresh(); },
  });

  const counts = requests.data?.counts;
  const rows = (requests.data?.items ?? []) as ChangeRequestRow[];
  const columns: RecordColumn<ChangeRequestRow>[] = [
    { key: "account", label: "Account", place: "head", cell: row => <AccountCell row={row} /> },
    { key: "type", label: "Request", cell: row => <span className="whitespace-nowrap font-semibold text-j-ink">{accountChangeTypeLabels[row.type]}</span> },
    { key: "change", label: "Change", wide: true, cell: row => <ChangeCell row={row} /> },
    { key: "requested", label: "Requested", cell: row => <span className="whitespace-nowrap tabular-nums">{formatDate(row.createdAt)}</span> },
    ...(status === "pending"
      ? [{
          key: "actions", label: "Actions", place: "action" as const, headingHidden: true,
          cell: (row: ChangeRequestRow) => <span className="inline-flex gap-1.5">
            <button type="button" disabled={decide.isPending} onClick={() => setApproving(row)} aria-label={`Approve ${accountChangeTypeLabels[row.type].toLowerCase()} for ${row.accountName ?? "this account"}`}
              className="inline-flex h-8 items-center rounded-lg bg-j-accent px-3 text-xs font-bold text-white hover:bg-j-accent-hover disabled:opacity-40">Approve</button>
            <button type="button" disabled={decide.isPending} onClick={() => setDeclining(row)} aria-label={`Decline ${accountChangeTypeLabels[row.type].toLowerCase()} for ${row.accountName ?? "this account"}`}
              className="inline-flex h-8 items-center rounded-lg border border-j-border px-3 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-40">Decline</button>
          </span>,
        }]
      : [
          { key: "decided", label: status === "approved" ? "Approved" : "Declined", cell: (row: ChangeRequestRow) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.decidedAt)}{row.decidedByName ? <span className="block text-xs text-j-ink-soft">by {row.decidedByName}</span> : null}</span> },
          ...(status === "declined" ? [{ key: "declineReason", label: "Decline reason", wide: true, cell: (row: ChangeRequestRow) => <span className="whitespace-pre-line break-words">{row.declineReason}</span> }] : []),
        ]),
  ];

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:border-b sm:border-[#dce9f1]">
      <StatusTabRow label="Request status" flush items={statusTabs.map(tab => ({ ...tab, count: counts?.[tab.key] }))} selected={status} onSelect={key => setStatus(key ?? "pending")} />
      <div className="grid grid-cols-2 gap-2 pb-2 sm:flex">
        <select value={role} onChange={event => setRole(event.target.value as AccountChangeRole | "all")} aria-label="Panel" className="h-9 rounded-lg border border-j-border bg-white px-2.5 text-xs font-semibold text-j-ink">
          <option value="all">All panels</option>
          <option value="guardian">Guardian</option>
          <option value="tutor">Tutor</option>
          {isOwner ? <option value="admin">Admin</option> : null}
        </select>
        <select value={type} onChange={event => setType(event.target.value as AccountChangeType | "all")} aria-label="Request type" className="h-9 rounded-lg border border-j-border bg-white px-2.5 text-xs font-semibold text-j-ink">
          <option value="all">All requests</option>
          {accountChangeTypeValues.map(value => <option key={value} value={value}>{accountChangeTypeLabels[value]}</option>)}
        </select>
      </div>
    </div>

    {requests.isLoading ? <div className="flex min-h-40 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading change requests…</div> : null}
    {requests.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Change requests could not be loaded.</div> : null}
    {!requests.isLoading && !requests.isError
      ? <RecordTable caption="Change requests" columns={columns} rows={rows} rowKey={row => row.id} empty={`No ${status} change requests.`} tableClassName="min-w-[56rem]" />
      : null}

    {approving ? <ApproveDialog row={approving} busy={decide.isPending} onClose={() => setApproving(null)} onApprove={() => decide.mutate({ requestId: approving.id, decision: "approve" })} /> : null}
    {declining ? <DeclineDialog row={declining} busy={decide.isPending} onClose={() => setDeclining(null)} onDecline={reason => decide.mutate({ requestId: declining.id, decision: "decline", declineReason: reason })} /> : null}
  </div>;
}

export default function AdminChangeRequests() {
  return <AdminWorkspaceLayout title="Change requests"><AdminChangeRequestsContent /></AdminWorkspaceLayout>;
}
