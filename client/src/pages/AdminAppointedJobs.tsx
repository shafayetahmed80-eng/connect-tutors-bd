import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import PostTypeBadge from "@/components/PostTypeBadge";
import { TutorListPager } from "@/components/TutorListPager";
import { trpc } from "@/lib/trpc";
import { formatDaysPerWeek, formatSubjects } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import { formatSalaryAmount } from "@shared/salary-amount";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const PAGE_SIZE = 20;

const appointedOn = (value: Date | string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

const notSet = <span className="italic text-j-ink-faint">Not set</span>;

/**
 * Every tuition with a Tutor Appointed to it - the demo-class stage between
 * Live and Confirmed - and that Tutor.
 *
 * The row reads like Applied Tutors' own list of tuitions, with the appointed
 * Tutor's ID, name and number where the applicant count was, and its arrow
 * opens that Tutor's profile.
 */
export function AdminAppointedJobsContent() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const jobs = trpc.admin.listAppointedJobs.useQuery({ query, page, pageSize: PAGE_SIZE });
  const items = jobs.data?.items ?? [];

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <label className="relative block max-w-sm">
      <span className="sr-only">Search appointed jobs</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
      <input
        value={query}
        onChange={event => { setQuery(event.target.value); setPage(1); }}
        placeholder="Search class, subject, location or Tutor"
        className="h-11 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
      />
    </label>

    {jobs.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading appointed jobs…</div> : null}
    {jobs.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Appointed jobs could not be loaded.</div> : null}

    {!jobs.isLoading && !jobs.isError ? <div className="overflow-x-auto rounded-xl border border-j-border bg-white shadow-sm">
      <table className="w-full min-w-[80rem] border-collapse text-sm">
        <caption className="sr-only">Appointed jobs and the Tutor appointed to each</caption>
        <thead>
          <tr className="border-b border-j-border text-left text-2xs font-bold uppercase tracking-wide text-j-ink-muted">
            <th scope="col" className="px-3 py-2.5">Job ID</th>
            <th scope="col" className="px-3 py-2.5">Posted By</th>
            <th scope="col" className="px-3 py-2.5">Class</th>
            <th scope="col" className="px-3 py-2.5">Subjects</th>
            <th scope="col" className="px-3 py-2.5">Location</th>
            <th scope="col" className="px-3 py-2.5">Salary</th>
            <th scope="col" className="px-3 py-2.5">Days</th>
            <th scope="col" className="px-3 py-2.5">Tutor ID</th>
            <th scope="col" className="px-3 py-2.5">Name</th>
            <th scope="col" className="px-3 py-2.5">Mobile</th>
            <th scope="col" className="px-3 py-2.5">Appointed</th>
            <th scope="col" className="px-3 py-2.5"><span className="sr-only">Tutor profile</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map(job => {
            const appointed = appointedOn(job.appointedAt);
            return <tr key={job.id} className="border-b border-[#eef4f9] last:border-b-0 hover:bg-j-surface-sunken/60">
              <td className="px-3 py-2.5 align-top font-mono text-2xs text-j-ink-muted">{jobIdForRequest(job.id)}</td>
              <td className="px-3 py-2.5 align-top"><PostTypeBadge postedByAdmin={job.postedByAdmin} format="short" /></td>
              <td className="px-3 py-2.5 align-top font-bold text-j-ink">{job.classCourse}</td>
              <td className="max-w-[16rem] px-3 py-2.5 align-top text-j-ink-strong">{formatSubjects(job.subjects)}</td>
              <td className="px-3 py-2.5 align-top text-j-ink-strong">{job.tuitionLocationLabel ?? job.locationText ?? "Online"}</td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-j-ink-strong">{formatSalaryAmount(job.budgetAmount)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-j-ink-strong">{formatDaysPerWeek(job.daysPerWeek)}</td>
              <td className="px-3 py-2.5 align-top font-mono text-2xs text-j-ink-muted">{job.tutorNumber ?? notSet}</td>
              <td className="px-3 py-2.5 align-top font-bold text-j-ink">{job.tutorName}</td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-j-ink-strong">{job.tutorPhone || notSet}</td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-j-ink-strong">{appointed ?? notSet}</td>
              <td className="px-3 py-2.5 align-top text-right">
                <Link href={`/admin/tutor-profiles/${encodeURIComponent(job.tutorId)}`} aria-label={`Open the profile of ${job.tutorName}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
                  <ChevronRight size={16} />
                </Link>
              </td>
            </tr>;
          })}
          {items.length === 0 ? <tr><td colSpan={12} className="px-3 py-10 text-center text-sm text-j-ink-soft">No appointed job{query.trim() ? " for this search" : ""}.</td></tr> : null}
        </tbody>
      </table>
    </div> : null}

    <TutorListPager page={page} totalPages={jobs.data?.totalPages ?? 1} onPage={setPage} label="Appointed job pages" />
  </div>;
}

export default function AdminAppointedJobs() {
  return <AdminWorkspaceLayout title="Appointed Jobs"><AdminAppointedJobsContent /></AdminWorkspaceLayout>;
}
