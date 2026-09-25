import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import { trpc } from "@/lib/trpc";
import { accountChangeTypeLabels, type AccountChangeStatus, type AccountChangeType } from "@shared/account-change-requests";
import { ArrowRight } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { Link } from "wouter";

type HistoryRow = {
  id: number;
  type: AccountChangeType;
  status: AccountChangeStatus;
  currentValue: string | null;
  requestedValue: string | null;
  reason: string | null;
  declineReason: string | null;
  createdAt: string | Date;
  decidedAt: string | Date | null;
  decidedByName: string | null;
};

const statusTones: Record<AccountChangeStatus, string> = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-800",
  declined: "bg-red-50 text-red-700",
  withdrawn: "bg-j-surface-muted text-j-ink-soft",
};
const statusLabels: Record<AccountChangeStatus, string> = { pending: "Pending", approved: "Approved", declined: "Declined", withdrawn: "Withdrawn" };

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function Change({ row }: { row: HistoryRow }) {
  if (row.type === "name" || row.type === "mobile") {
    return <span className="inline-flex flex-wrap items-center gap-1.5 break-words">
      <span className="text-j-ink-soft">{row.currentValue || "—"}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-j-ink-faint" aria-label="to" />
      <span className="font-semibold text-j-ink">{row.requestedValue}</span>
    </span>;
  }
  if (row.type === "close_account") return <span className="whitespace-pre-line break-words">{row.reason}</span>;
  return <span className="text-j-ink-soft">—</span>;
}

const columns: RecordColumn<HistoryRow>[] = [
  { key: "type", label: "Request", place: "head", cell: row => <span className="whitespace-nowrap font-semibold text-j-ink">{accountChangeTypeLabels[row.type]}</span> },
  { key: "status", label: "Status", place: "head", cell: row => <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span> },
  { key: "change", label: "Change", wide: true, cell: row => <Change row={row} /> },
  { key: "requested", label: "Requested", cell: row => <span className="whitespace-nowrap tabular-nums">{formatDate(row.createdAt)}</span> },
  {
    key: "decided", label: "Decided", cell: row => row.status === "approved" || row.status === "declined"
      ? <span className="whitespace-nowrap tabular-nums">{formatDate(row.decidedAt)}{row.decidedByName ? <span className="block text-xs text-j-ink-soft">by {row.decidedByName}</span> : null}</span>
      : <span className="text-j-ink-faint">—</span>,
  },
  { key: "declineReason", label: "Decline reason", wide: true, cell: row => row.declineReason ? <span className="whitespace-pre-line break-words">{row.declineReason}</span> : <span className="text-j-ink-faint">—</span> },
];

/**
 * Every name, mobile, verification and delete request one account made from
 * Settings, on that account's profile page. Waiting ones are answered in the
 * Change requests queue.
 */
export default function AccountChangeHistory({ userId }: { userId: number }) {
  const history = trpc.accountChanges.history.useQuery({ userId }, { retry: false });
  const rows = (history.data ?? []) as HistoryRow[];
  const waiting = rows.some(row => row.status === "pending");
  return <section aria-labelledby={`change-history-${userId}`} className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={`change-history-${userId}`} className="text-base font-bold text-j-ink">Change requests</h2>
      {waiting ? <Link href="/admin/change-requests" className="text-sm font-bold text-j-accent hover:underline">Open Change requests</Link> : null}
    </div>
    {history.isLoading ? <div className="flex min-h-24 items-center justify-center rounded-xl border border-j-border bg-white text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading requests…</div> : null}
    {history.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{history.error.message}</div> : null}
    {history.data ? <RecordTable caption="Change requests" columns={columns} rows={rows} rowKey={row => row.id} empty="No change requests." tableClassName="min-w-[48rem]" /> : null}
  </section>;
}
