import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import PostTypeBadge from "@/components/PostTypeBadge";
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

    {!jobs.isLoading && !jobs.isError ? <div className="overflow-x-auto rounded-xl border border-j-border bg-white shadow-sm">
      <table className="w-full min-w-[92rem] border-collapse text-sm">
        <caption className="sr-only">Confirmed jobs, the Tutor confirmed on each, and its payment status</caption>
        <thead>
          <tr className="border-b border-j-border text-left text-2xs font-bold uppercase tracking-wide text-j-ink-muted">
            <th scope="col" className="px-3 py-2.5">Job ID</th>
            <th scope="col" className="px-3 py-2.5">Posted By</th>
            <th scope="col" className="px-3 py-2.5">Tutor ID</th>
            <th scope="col" className="px-3 py-2.5">Name</th>
            <th scope="col" className="px-3 py-2.5">Mobile</th>
            <th scope="col" className="px-3 py-2.5">Appointed</th>
            <th scope="col" className="px-3 py-2.5">Confirmed</th>
            <th scope="col" className="px-3 py-2.5">Payment Status</th>
            <th scope="col" className="px-3 py-2.5">Class</th>
            <th scope="col" className="px-3 py-2.5">Subjects</th>
            <th scope="col" className="px-3 py-2.5">Location</th>
            <th scope="col" className="px-3 py-2.5">Salary</th>
            <th scope="col" className="px-3 py-2.5">Days</th>
            <th scope="col" className="px-3 py-2.5"><span className="sr-only">Tutor profile</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map(job => {
            const saving = setPayment.isPending && setPayment.variables?.requestId === job.id;
            return <tr key={job.id} className="border-b border-[#eef4f9] last:border-b-0 hover:bg-j-surface-sunken/60">
              <td className="px-3 py-2.5 align-top font-mono text-2xs text-j-ink-muted">{jobIdForRequest(job.id)}</td>
              <td className="px-3 py-2.5 align-top"><PostTypeBadge postedByAdmin={job.postedByAdmin} format="short" /></td>
              <td className="px-3 py-2.5 align-top font-mono text-2xs text-j-ink-muted">{job.tutorNumber ?? notSet}</td>
              <td className="px-3 py-2.5 align-top font-bold text-j-ink">{job.tutorName}</td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-j-ink-strong">{job.tutorPhone || notSet}</td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-j-ink-strong">{onDate(job.appointedAt) ?? notSet}</td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-j-ink-strong">{onDate(job.confirmedAt) ?? notSet}</td>
              <td className="px-3 py-2 align-top">
                <select
                  aria-label={`Payment status of Job ID ${jobIdForRequest(job.id)}`}
                  value={job.paymentStatus}
                  disabled={saving}
                  onChange={event => setPayment.mutate({ requestId: job.id, paymentStatus: event.target.value as JobPaymentStatus })}
                  className={`h-8 cursor-pointer rounded-full border px-2.5 text-2xs font-bold outline-none transition-colors focus:ring-2 focus:ring-sky-100 disabled:cursor-wait disabled:opacity-60 ${paymentTone[job.paymentStatus]}`}
                >
                  {jobPaymentStatusValues.map(value => <option key={value} value={value}>{jobPaymentStatusLabels[value]}</option>)}
                </select>
              </td>
              <td className="px-3 py-2.5 align-top font-bold text-j-ink">{job.classCourse}</td>
              <td className="max-w-[16rem] px-3 py-2.5 align-top text-j-ink-strong">{formatSubjects(job.subjects)}</td>
              <td className="px-3 py-2.5 align-top text-j-ink-strong">{job.tuitionLocationLabel ?? job.locationText ?? "Online"}</td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-j-ink-strong">{formatSalaryAmount(job.budgetAmount)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-j-ink-strong">{formatDaysPerWeek(job.daysPerWeek)}</td>
              <td className="px-3 py-2.5 align-top text-right">
                <Link href={`/admin/tutor-profiles/${encodeURIComponent(job.tutorId)}`} aria-label={`Open the profile of ${job.tutorName}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
                  <ChevronRight size={16} />
                </Link>
              </td>
            </tr>;
          })}
          {items.length === 0 ? <tr><td colSpan={14} className="px-3 py-10 text-center text-sm text-j-ink-soft">No confirmed job{query.trim() ? " for this search" : ""}.</td></tr> : null}
        </tbody>
      </table>
    </div> : null}

    <TutorListPager page={page} totalPages={jobs.data?.totalPages ?? 1} onPage={setPage} label="Confirmed job pages" />
  </div>;
}

export default function AdminConfirmedJobs() {
  return <AdminWorkspaceLayout title="Confirmed Jobs"><AdminConfirmedJobsContent /></AdminWorkspaceLayout>;
}
