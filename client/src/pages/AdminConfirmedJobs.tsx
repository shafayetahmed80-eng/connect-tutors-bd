import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { AdminGuardianTuitionRequestPill } from "@/components/AdminGuardianTuitionRequest";
import PostTypeBadge from "@/components/PostTypeBadge";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import { TutorListPager } from "@/components/TutorListPager";
import { trpc } from "@/lib/trpc";
import { formatDaysPerWeek, formatSubjects } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import { jobPaymentStatusLabels, jobPaymentStatusValues, type JobPaymentStatus } from "@shared/job-payment-status";
import { formatSalaryAmount } from "@shared/salary-amount";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const PAGE_SIZE = 20;

const onDate = (value: Date | string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

const notSet = <span className="italic text-j-ink-faint">Not set</span>;

/** Owed reads warm, paid reads green, the two part-payments sit between. */
const paymentTone: Record<JobPaymentStatus, string> = {
  full_due: "border-red-200 bg-red-50 text-red-800",
  half_paid: "border-amber-200 bg-amber-50 text-amber-800",
  partial_paid: "border-sky-200 bg-sky-50 text-sky-800",
  full_paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

/**
 * Every Confirmed tuition - the Guardian kept the Tutor after the demo class -
 * with that Tutor, when they were appointed and confirmed, and how much of the
 * fee has been paid.
 *
 * It reads like Applied Tutors' own list of tuitions. The payment status is
 * the one thing an Admin changes here, straight from its row; a tuition starts
 * at Full Due. The arrow opens the Tutor's profile.
 */
export function AdminConfirmedJobsContent() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const jobs = trpc.admin.listConfirmedJobs.useQuery({ query, page, pageSize: PAGE_SIZE });
  const items = jobs.data?.items ?? [];

  const utils = trpc.useUtils();
  const setPayment = trpc.admin.setJobPaymentStatus.useMutation({
    onSuccess: () => { void utils.admin.listConfirmedJobs.invalidate(); toast.success("Payment status saved."); },
    onError: error => toast.error(error.message),
  });

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
    {
      key: "paymentStatus", label: "Payment Status", place: "action", cellClassName: "py-2",
      cell: job => <select
        aria-label={`Payment status of Job ID ${jobIdForRequest(job.id)}`}
        value={job.paymentStatus}
        disabled={setPayment.isPending && setPayment.variables?.requestId === job.id}
        onChange={event => setPayment.mutate({ requestId: job.id, paymentStatus: event.target.value as JobPaymentStatus })}
        className={`h-8 cursor-pointer rounded-full border px-2.5 text-2xs font-bold outline-none transition-colors focus:ring-2 focus:ring-sky-100 disabled:cursor-wait disabled:opacity-60 ${paymentTone[job.paymentStatus]}`}
      >
        {jobPaymentStatusValues.map(value => <option key={value} value={value}>{jobPaymentStatusLabels[value]}</option>)}
      </select>,
    },
    { key: "classCourse", label: "Class", cell: job => <span className="font-bold text-j-ink">{job.classCourse}</span> },
    { key: "subjects", label: "Subjects", wide: true, cellClassName: "max-w-[16rem]", cell: job => <span className="text-j-ink-strong">{formatSubjects(job.subjects)}</span> },
    { key: "location", label: "Location", cell: job => <span className="text-j-ink-strong">{job.tuitionLocationLabel ?? job.locationText ?? "Online"}</span> },
    { key: "salary", label: "Salary", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{formatSalaryAmount(job.budgetAmount)}</span> },
    { key: "days", label: "Days", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{formatDaysPerWeek(job.daysPerWeek)}</span> },
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

    {jobs.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading confirmed jobs…</div> : null}
    {jobs.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Confirmed jobs could not be loaded.</div> : null}

    {!jobs.isLoading && !jobs.isError ? <RecordTable
      caption="Confirmed jobs, the Tutor confirmed on each, and its payment status"
      columns={columns}
      rows={items}
      rowKey={job => job.id}
      empty={`No confirmed job${query.trim() ? " for this search" : ""}.`}
      tableClassName="min-w-[92rem]"
    /> : null}

    <TutorListPager page={page} totalPages={jobs.data?.totalPages ?? 1} onPage={setPage} label="Confirmed job pages" />
  </div>;
}

export default function AdminConfirmedJobs() {
  return <AdminWorkspaceLayout title="Confirmed Jobs"><AdminConfirmedJobsContent /></AdminWorkspaceLayout>;
}
