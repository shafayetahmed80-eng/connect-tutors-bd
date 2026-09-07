import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import AdminTutorRows from "@/components/AdminTutorRows";
import { RecordIcon, type RecordIconName } from "@/components/recordIcons";
import { countActiveFilters } from "@/components/activeFilterCount";
import { TutorDirectoryFilters, TutorListPager, defaultTutorFilters, type TutorFilters } from "./AdminTutorProfiles";
import { formatDaysPerWeek, formatSubjects, formatTutorPreference } from "@shared/job-card";
import { formatSalaryAmount } from "@shared/salary-amount";
import { jobIdForRequest } from "@shared/job-id";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ChevronRight, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Link, useRoute } from "wouter";

/** One fact of the tuition, in the strip the applicants are read against. */
function JobFact({ icon, value }: { icon: RecordIconName; value: string }) {
  return <span className="inline-flex min-w-0 items-center gap-1.5">
    <RecordIcon name={icon} size={12} className="shrink-0 text-[#8fb4d0]" />
    <span className="truncate text-[#173d60]">{value}</span>
  </span>;
}

/**
 * Everyone who applied to one tuition.
 *
 * The rows are the Admin's own Tutor Profiles rows - the same component, not a
 * copy - with the application order in front of them, so a Tutor reads the same
 * on both screens and the arrow leads to the same profile. What this page adds
 * above them is the tuition itself: an Admin is judging these applicants
 * against one job, and should not have to hold its subjects and salary in their
 * head while they scroll.
 */
export function AdminAppliedTutorsContent({ requestId }: { requestId: number }) {
  const [filters, setFilters] = useState<TutorFilters>(defaultTutorFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = countActiveFilters(filters, defaultTutorFilters, { ignore: ["page", "pageSize"] });
  const applied = trpc.admin.listAppliedTutors.useQuery({ ...filters, requestId }, { retry: false });
  const updateFilter = (change: Partial<TutorFilters>) => setFilters(current => ({ ...current, ...change, page: change.page ?? 1 }));
  const job = applied.data?.job;

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <Link href="/admin/posted-jobs" className="inline-flex items-center gap-1.5 text-sm font-bold text-j-accent hover:underline">
      <ArrowLeft size={15} /> Back to Posted jobs
    </Link>

    <section className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-j-border bg-white p-4 shadow-sm">
      <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#eaf4fd] px-3.5 text-sm font-bold text-[#1267c8]">
        Applied: <span className="tabular-nums">{applied.data?.appliedTotal ?? 0}</span>
      </span>

      {job ? <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-j-surface-sunken px-3.5 py-2.5 text-2xs">
        <span className="inline-flex items-center gap-1.5 font-bold text-[#173d60]">
          <RecordIcon name="jobId" size={12} className="text-[#8fb4d0]" />Job ID {jobIdForRequest(job.id)}
        </span>
        <JobFact icon="tutorGender" value={`${formatTutorPreference(job.preferredGender)} Tutor`} />
        <JobFact icon="location" value={job.tuitionLocationLabel ?? job.locationText ?? "Online"} />
        <JobFact icon="classLevel" value={job.classCourse} />
        <JobFact icon="subjects" value={formatSubjects(job.subjects)} />
        <JobFact icon="salary" value={formatSalaryAmount(job.budgetAmount)} />
        <JobFact icon="daysPerWeek" value={formatDaysPerWeek(job.daysPerWeek)} />
        <JobFact icon="phone" value={job.guardianPhone || "Not given"} />
      </div> : <div className="min-w-0 flex-1" />}

      <button
        type="button"
        onClick={() => setFiltersOpen(open => !open)}
        aria-expanded={filtersOpen}
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-j-border px-3.5 text-sm font-bold text-j-ink-soft hover:bg-j-surface-sunken"
      >
        <SlidersHorizontal className="h-4 w-4" /> Filter
        {activeFilterCount ? <span className="rounded-full bg-[#eaf4fd] px-1.5 text-2xs tabular-nums text-[#1267c8]">{activeFilterCount}</span> : null}
      </button>
    </section>

    {filtersOpen ? <section className="rounded-2xl border border-j-border bg-white p-4 shadow-sm">
      <TutorDirectoryFilters filters={filters} onChange={updateFilter} onClear={() => setFilters(defaultTutorFilters)} />
    </section> : null}

    {applied.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading applied Tutors…</div> : null}
    {applied.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{applied.error?.message ?? "The applied Tutors could not be loaded."}</div> : null}

    {!applied.isLoading && !applied.isError
      ? <AdminTutorRows
          tutors={applied.data?.items ?? []}
          caption="Tutors who applied to this tuition"
          emptyLabel={activeFilterCount ? "No applicant matches the active filters." : "No Tutor has applied to this tuition yet."}
          serialFrom={(filters.page - 1) * filters.pageSize + 1}
        />
      : null}

    <TutorListPager page={filters.page} totalPages={applied.data?.totalPages ?? 1} onPage={next => updateFilter({ page: next })} label="Applied Tutor pages" />
  </div>;
}

const LIVE_PAGE_SIZE = 20;

/**
 * Which tuition's applicants to read.
 *
 * The sidebar tab lands here, because the page below it is about one tuition
 * and arriving from the sidebar you have not chosen one yet. Only live
 * tuitions are listed - a tuition that never reached the Job Board cannot have
 * been applied to - and it reads the same `admin.listPostedJobs` the Posted
 * jobs board reads, so the counts on the two screens cannot disagree.
 */
export function AdminLiveTuitionsContent() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const jobs = trpc.admin.listPostedJobs.useQuery({ stage: "live", query, page, pageSize: LIVE_PAGE_SIZE });
  const items = jobs.data?.items ?? [];

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <label className="relative block max-w-sm">
      <span className="sr-only">Search live tuitions</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
      <input
        value={query}
        onChange={event => { setQuery(event.target.value); setPage(1); }}
        placeholder="Search subject, class, location or Guardian"
        className="h-11 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
      />
    </label>

    {jobs.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading live tuitions…</div> : null}
    {jobs.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Live tuitions could not be loaded.</div> : null}

    {!jobs.isLoading && !jobs.isError ? <div className="overflow-x-auto rounded-xl border border-j-border bg-white shadow-sm">
      <table className="w-full min-w-[64rem] border-collapse text-sm">
        <caption className="sr-only">Live tuitions and how many Tutors applied to each</caption>
        <thead>
          <tr className="border-b border-j-border text-left text-2xs font-bold uppercase tracking-wide text-j-ink-muted">
            <th scope="col" className="px-3 py-2.5">Job ID</th>
            <th scope="col" className="px-3 py-2.5">Class / Level</th>
            <th scope="col" className="px-3 py-2.5">Subjects</th>
            <th scope="col" className="px-3 py-2.5">Location</th>
            <th scope="col" className="px-3 py-2.5">Salary</th>
            <th scope="col" className="px-3 py-2.5">Days / Week</th>
            <th scope="col" className="px-3 py-2.5">Guardian</th>
            <th scope="col" className="px-3 py-2.5">Applied</th>
            <th scope="col" className="px-3 py-2.5"><span className="sr-only">Applicants</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map(job => <tr key={job.id} className="border-b border-[#eef4f9] last:border-b-0 hover:bg-j-surface-sunken/60">
            <td className="px-3 py-2.5 align-top font-mono text-2xs text-j-ink-muted">{jobIdForRequest(job.id)}</td>
            <td className="px-3 py-2.5 align-top font-bold text-j-ink">{job.classCourse}</td>
            <td className="max-w-[16rem] px-3 py-2.5 align-top text-j-ink-strong">{formatSubjects(job.subjects)}</td>
            <td className="px-3 py-2.5 align-top text-j-ink-strong">{job.tuitionLocationLabel ?? job.locationText ?? "Online"}</td>
            <td className="px-3 py-2.5 align-top text-j-ink-strong">{formatSalaryAmount(job.budgetAmount)}</td>
            <td className="px-3 py-2.5 align-top text-j-ink-strong">{formatDaysPerWeek(job.daysPerWeek)}</td>
            <td className="px-3 py-2.5 align-top text-j-ink-strong">{job.guardianName}</td>
            <td className="px-3 py-2.5 align-top">
              <span className="inline-flex rounded-full bg-[#eaf4fd] px-2.5 py-1 text-2xs font-bold tabular-nums text-[#1267c8]">{job.appliedTutorCount}</span>
            </td>
            <td className="px-3 py-2.5 align-top text-right">
              <Link href={`/admin/applied-tutors/${job.id}`} aria-label={`Open the applicants of Job ID ${jobIdForRequest(job.id)}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
                <ChevronRight size={16} />
              </Link>
            </td>
          </tr>)}
          {items.length === 0 ? <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-j-ink-soft">No live tuition{query.trim() ? " for this search" : ""}. A tuition has to be Live before a Tutor can apply to it.</td></tr> : null}
        </tbody>
      </table>
    </div> : null}

    <TutorListPager page={page} totalPages={jobs.data?.totalPages ?? 1} onPage={setPage} label="Live tuition pages" />
  </div>;
}

export default function AdminAppliedTutors() {
  const [, params] = useRoute("/admin/applied-tutors/:requestId");
  const requestId = Number(params?.requestId);
  const chosen = Number.isInteger(requestId) && requestId > 0;
  return <AdminWorkspaceLayout title="Applied Tutors">
    {chosen ? <AdminAppliedTutorsContent requestId={requestId} /> : <AdminLiveTuitionsContent />}
  </AdminWorkspaceLayout>;
}
