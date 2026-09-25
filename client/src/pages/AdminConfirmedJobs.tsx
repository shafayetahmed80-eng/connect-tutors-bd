import AdminCancelledChargesContent from "@/components/AdminCancelledCharges";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { AdminGuardianTuitionRequestPill } from "@/components/AdminGuardianTuitionRequest";
import PaymentStatusPill from "@/components/PaymentStatusPill";
import PostTypeBadge from "@/components/PostTypeBadge";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import TuitionPaymentsModal from "@/components/TuitionPaymentsModal";
import { TutorListPager } from "@/components/TutorListPager";
import { trpc } from "@/lib/trpc";
import { formatDaysPerWeek, formatSubjects } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import { formatSalaryAmount } from "@shared/salary-amount";
import { ChevronRight, Search, Wallet } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { useState } from "react";
import { Link } from "wouter";

const onDate = (value: Date | string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

const notSet = <span className="italic text-j-ink-faint">Not set</span>;

/**
 * Every Confirmed tuition - the Guardian kept the Tutor after the demo class -
 * with that Tutor, when they were appointed and confirmed, and how much of the
 * fee has been paid.
 *
 * It reads like Applied Tutors' own list of tuitions. The payment status is
 * worked out from the payments on file, never set by hand: the wallet button
 * opens them, and is where an Admin records or verifies one. The arrow opens
 * the Tutor's profile.
 */
export function AdminConfirmedJobsContent() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const jobs = trpc.admin.listConfirmedJobs.useQuery({ query, page, pageSize });
  const items = jobs.data?.items ?? [];

  const [payingRequestId, setPayingRequestId] = useState<number | null>(null);

  type ConfirmedJob = (typeof items)[number];
  const columns: RecordColumn<ConfirmedJob>[] = [
    {
      key: "jobId", label: "Job ID", place: "head",
      cell: job => <span className="inline-flex flex-wrap items-center gap-2">
        <span className="font-mono text-2xs text-j-ink-muted">{jobIdForRequest(job.id)}</span>
        {/* A Guardian's waiting request is answered on Applied Tutors, so the mark leads there. */}
        {job.guardianRequest ? <Link href={`/admin/applied-tutors/${job.id}`} className="hover:opacity-80"><AdminGuardianTuitionRequestPill type={job.guardianRequest.type} /></Link> : null}
      </span>,
    },
    { key: "postedBy", label: "Posted By", place: "head", cell: job => <PostTypeBadge postedByAdmin={job.postedByAdmin} format="short" /> },
    { key: "tutorNumber", label: "Tutor ID", cell: job => <span className="font-mono text-2xs text-j-ink-muted">{job.tutorNumber ?? notSet}</span> },
    { key: "tutorName", label: "Name", cell: job => <span className="font-bold text-j-ink">{job.tutorName}</span> },
    { key: "tutorPhone", label: "Mobile", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{job.tutorPhone || notSet}</span> },
    { key: "appointedAt", label: "Appointed", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{onDate(job.appointedAt) ?? notSet}</span> },
    { key: "confirmedAt", label: "Confirmed", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{onDate(job.confirmedAt) ?? notSet}</span> },
    // The stored status follows the ledger, and the ledger's own reading is what a row shows.
    { key: "paymentStatus", label: "Payment Status", cell: job => <PaymentStatusPill status={job.charge?.status ?? job.paymentStatus} /> },
    // What the Tutor owes Connect Tutors, worked out from the rates the tuition
    // was confirmed on and the payments verified so far.
    { key: "charge", label: "Charge", cellClassName: "whitespace-nowrap", cell: job => <span className="tabular-nums text-j-ink-strong">{job.charge ? formatSalaryAmount(job.charge.owed) : notSet}</span> },
    { key: "paid", label: "Paid", cellClassName: "whitespace-nowrap", cell: job => <span className="tabular-nums text-j-ink-strong">{job.charge ? formatSalaryAmount(job.charge.paid) : notSet}</span> },
    {
      key: "balance", label: "Balance", cellClassName: "whitespace-nowrap",
      cell: job => job.charge
        ? <span className={`tabular-nums font-bold ${job.charge.balance > 0 ? "text-red-800" : "text-emerald-800"}`}>{formatSalaryAmount(job.charge.balance)}</span>
        : notSet,
    },
    { key: "classCourse", label: "Class", cell: job => <span className="font-bold text-j-ink">{job.classCourse}</span> },
    { key: "subjects", label: "Subjects", wide: true, cellClassName: "max-w-[16rem]", cell: job => <span className="text-j-ink-strong">{formatSubjects(job.subjects)}</span> },
    { key: "location", label: "Location", cell: job => <span className="text-j-ink-strong">{job.tuitionLocationLabel ?? job.locationText ?? "Online"}</span> },
    { key: "salary", label: "Salary", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{formatSalaryAmount(job.budgetAmount)}</span> },
    { key: "days", label: "Days", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{formatDaysPerWeek(job.daysPerWeek)}</span> },
    {
      key: "payments", label: "Payments", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: job => <button
        type="button"
        onClick={() => setPayingRequestId(job.id)}
        aria-label={`Payments of Job ID ${jobIdForRequest(job.id)}`}
        className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50"
      >
        <Wallet size={16} />
      </button>,
    },
    {
      key: "profile", label: "Tutor profile", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: job => <Link href={`/admin/tutor-profiles/${encodeURIComponent(job.tutorId)}`} aria-label={`Open the profile of ${job.tutorName}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
        <ChevronRight size={16} />
      </Link>,
    },
  ];

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <label className="relative block max-w-sm">
      <span className="sr-only">Search confirmed jobs</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
      <input
        value={query}
        onChange={event => { setQuery(event.target.value); setPage(1); }}
        placeholder="Search class, subject, location or Tutor"
        className="h-11 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
      />
    </label>

    {jobs.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading confirmed jobs…</div> : null}
    {jobs.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Confirmed jobs could not be loaded.</div> : null}

    {!jobs.isLoading && !jobs.isError ? <RecordTable
      caption="Confirmed jobs, the Tutor confirmed on each, and its payment status"
      columns={columns}
      rows={items}
      rowKey={job => job.id}
      empty={`No confirmed job${query.trim() ? " for this search" : ""}.`}
      tableClassName="min-w-[92rem]"
    /> : null}

    <TutorListPager
      page={page}
      totalPages={jobs.data?.totalPages ?? 1}
      onPage={setPage}
      label="Confirmed job pages"
      pageSize={pageSize}
      pageSizeOptions={[20, 50, 100]}
      onPageSize={next => { setPageSize(next); setPage(1); }}
      totalItems={jobs.data?.total}
    />

    {payingRequestId !== null ? <TuitionPaymentsModal requestId={payingRequestId} onClose={() => setPayingRequestId(null)} /> : null}
  </div>;
}

const tabs = [
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

/**
 * Confirmed tuitions, and the ones cancelled after they were confirmed - where
 * an Admin settles what the Tutor owes or is owed back.
 */
export default function AdminConfirmedJobs() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("confirmed");
  return <AdminWorkspaceLayout title="Confirmed Jobs">
    <div className="mx-auto w-full max-w-[100rem] space-y-4">
      <div role="tablist" aria-label="Confirmed jobs" className="flex gap-5 border-b border-[#dce9f1]">
        {tabs.map(item => <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={tab === item.key}
          onClick={() => setTab(item.key)}
          className={`relative pb-2.5 pt-1.5 text-xs font-semibold transition-colors ${tab === item.key ? "font-bold text-[#1267c8]" : "text-j-ink-muted hover:text-[#173d60]"}`}
        >
          {item.label}
          {tab === item.key ? <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-t bg-[#1677e8]" /> : null}
        </button>)}
      </div>
      {tab === "confirmed" ? <AdminConfirmedJobsContent /> : <AdminCancelledChargesContent />}
    </div>
  </AdminWorkspaceLayout>;
}
