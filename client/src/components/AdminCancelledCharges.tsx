import PaymentStatusPill from "@/components/PaymentStatusPill";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import TuitionPaymentsModal from "@/components/TuitionPaymentsModal";
import TuitionSettlementModal from "@/components/TuitionSettlementModal";
import { TutorListPager } from "@/components/TutorListPager";
import { trpc } from "@/lib/trpc";
import { jobIdForRequest } from "@shared/job-id";
import { formatSalaryAmount } from "@shared/salary-amount";
import { ChevronRight, Loader2, Scale, Search, Wallet } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const onDate = (value: Date | string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

const notSet = <span className="italic text-j-ink-faint">Not set</span>;

/**
 * Tuitions that were cancelled after being confirmed, and where the Tutor's
 * charge for each stands: not settled yet, or what came of it.
 *
 * Settling is the Admin's call - see `TuitionSettlementModal`. Once a tuition
 * is settled, what the Tutor still owes on it is paid the same way as on any
 * other, from its payments button.
 */
export default function AdminCancelledChargesContent() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const jobs = trpc.admin.listCancelledCharges.useQuery({ query, page, pageSize });
  const items = jobs.data?.items ?? [];
  const [settlingId, setSettlingId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  type CancelledJob = (typeof items)[number];
  const settlementCell = (job: CancelledJob) => {
    const settlement = job.settlement;
    if (!settlement) return <span className="inline-flex whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-2xs font-bold text-amber-800">Not settled</span>;
    if (settlement.refund > 0) {
      return <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-800">
        Refund {formatSalaryAmount(settlement.refund)} · {settlement.disposition === "credited" ? "Credited" : "Sent back"}
      </span>;
    }
    if ((job.charge?.balance ?? 0) > 0) {
      return <span className="inline-flex whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-2xs font-bold text-red-800">Due {formatSalaryAmount(job.charge!.balance)}</span>;
    }
    return <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-800">Settled</span>;
  };

  const columns: RecordColumn<CancelledJob>[] = [
    { key: "jobId", label: "Job ID", place: "head", cell: job => <span className="font-mono text-2xs text-j-ink-muted">{jobIdForRequest(job.id)}</span> },
    { key: "settlement", label: "Settlement", place: "head", cell: settlementCell },
    { key: "tutorNumber", label: "Tutor ID", cell: job => <span className="font-mono text-2xs text-j-ink-muted">{job.tutorNumber ?? notSet}</span> },
    { key: "tutorName", label: "Name", cell: job => <span className="font-bold text-j-ink">{job.tutorName}</span> },
    { key: "confirmedAt", label: "Confirmed", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{onDate(job.confirmedAt) ?? notSet}</span> },
    { key: "cancelledAt", label: "Cancelled", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{onDate(job.cancelledAt) ?? notSet}</span> },
    { key: "status", label: "Payment Status", cell: job => job.charge ? <PaymentStatusPill status={job.charge.status} /> : notSet },
    { key: "charge", label: "Charge", cellClassName: "whitespace-nowrap", cell: job => <span className="tabular-nums text-j-ink-strong">{job.charge ? formatSalaryAmount(job.charge.owed) : notSet}</span> },
    { key: "paid", label: "Paid", cellClassName: "whitespace-nowrap", cell: job => <span className="tabular-nums text-j-ink-strong">{job.charge ? formatSalaryAmount(job.charge.paid) : notSet}</span> },
    { key: "classCourse", label: "Class", cell: job => <span className="font-bold text-j-ink">{job.classCourse}</span> },
    {
      key: "settle", label: "Settle", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: job => <button
        type="button"
        onClick={() => setSettlingId(job.id)}
        aria-label={`Settle Job ID ${jobIdForRequest(job.id)}`}
        className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50"
      ><Scale size={16} /></button>,
    },
    {
      key: "payments", label: "Payments", place: "action", headingHidden: true, cellClassName: "text-right",
      // Only a settled tuition has a figure to pay against.
      cell: job => job.settlement ? <button
        type="button"
        onClick={() => setPayingId(job.id)}
        aria-label={`Payments of Job ID ${jobIdForRequest(job.id)}`}
        className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50"
      ><Wallet size={16} /></button> : null,
    },
    {
      key: "profile", label: "Tutor profile", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: job => <Link href={`/admin/tutor-profiles/${encodeURIComponent(job.tutorId)}`} aria-label={`Open the profile of ${job.tutorName}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
        <ChevronRight size={16} />
      </Link>,
    },
  ];

  const settling = items.find(job => job.id === settlingId) ?? null;

  return <div className="space-y-4">
    <label className="relative block max-w-sm">
      <span className="sr-only">Search cancelled jobs</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
      <input
        value={query}
        onChange={event => { setQuery(event.target.value); setPage(1); }}
        placeholder="Search class, subject or Tutor"
        className="h-11 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
      />
    </label>

    {jobs.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading cancelled jobs…</div> : null}
    {jobs.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Cancelled jobs could not be loaded.</div> : null}

    {!jobs.isLoading && !jobs.isError ? <RecordTable
      caption="Tuitions cancelled after they were confirmed, and how each was settled"
      columns={columns}
      rows={items}
      rowKey={job => job.id}
      empty={`No cancelled job${query.trim() ? " for this search" : ""}.`}
      tableClassName="min-w-[84rem]"
    /> : null}

    <TutorListPager
      page={page}
      totalPages={jobs.data?.totalPages ?? 1}
      onPage={setPage}
      label="Cancelled job pages"
      pageSize={pageSize}
      pageSizeOptions={[20, 50, 100]}
      onPageSize={next => { setPageSize(next); setPage(1); }}
      totalItems={jobs.data?.total}
    />

    {settlingId !== null ? <TuitionSettlementModal
      requestId={settlingId}
      existing={settling?.settlement ? { reason: settling.settlement.reason, retained: settling.settlement.retained, disposition: settling.settlement.disposition } : null}
      onClose={() => setSettlingId(null)}
    /> : null}
    {payingId !== null ? <TuitionPaymentsModal requestId={payingId} onClose={() => setPayingId(null)} /> : null}
  </div>;
}
