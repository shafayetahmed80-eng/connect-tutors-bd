import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { AdminGuardianTuitionRequestPill } from "@/components/AdminGuardianTuitionRequest";
import { AdminJobFilterBar, useAdminJobFilters } from "@/components/AdminJobFilters";
import { useAdminTuitionRowActions } from "@/components/AdminTuitionRowActions";
import PostTypeBadge from "@/components/PostTypeBadge";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import { TutorListPager } from "@/components/TutorListPager";
import { trpc } from "@/lib/trpc";
import { formatDaysPerWeek, formatSubjects } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import { formatSalaryAmount } from "@shared/salary-amount";
import { ChevronRight, Search } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import RecentSearches from "@/components/RecentSearches";
import SearchInput from "@/components/SearchInput";
import { PhoneContact } from "@/components/PhoneContact";
import { useState } from "react";
import { Link } from "wouter";
import { JobIdTag } from "@/components/JobIdTag";

const appointedOn = (value: Date | string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

const notSet = <span className="italic text-j-ink-faint">Not set</span>;

/**
 * Every tuition with a Tutor Appointed to it - the demo-class stage between
 * Live and Confirmed - and that Tutor.
 *
 * The row reads like Applied Tutors' own list of tuitions, with the appointed
 * Tutor's ID, name and number where the applicant count was, and its arrow
 * opens that Tutor's profile. The Actions menu makes the next move without
 * leaving the list: confirm the Tutor, remove them, or cancel the tuition.
 */
export function AdminAppointedJobsContent() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filterPanel = useAdminJobFilters({ onChange: () => setPage(1) });
  const jobs = trpc.admin.listAppointedJobs.useQuery({ query, page, pageSize, filters: filterPanel.input });
  const items = jobs.data?.items ?? [];
  const rowActions = useAdminTuitionRowActions("appointed");

  type AppointedJob = (typeof items)[number];
  const columns: RecordColumn<AppointedJob>[] = [
    {
      key: "jobId", label: "Job ID", place: "head",
      cell: job => <span className="inline-flex flex-wrap items-center gap-2">
        <JobIdTag bare className="text-2xs" jobId={jobIdForRequest(job.id)} />
        {/* A Guardian's waiting request is answered from the row's Actions menu. */}
        {job.guardianRequest ? <AdminGuardianTuitionRequestPill type={job.guardianRequest.type} /> : null}
      </span>,
      cardCell: job => <span className="inline-flex flex-wrap items-center gap-2">
        <JobIdTag className="text-xs" jobId={jobIdForRequest(job.id)} />
        {job.guardianRequest ? <AdminGuardianTuitionRequestPill type={job.guardianRequest.type} /> : null}
      </span>,
    },
    { key: "postedBy", label: "Posted By", place: "head", cell: job => <PostTypeBadge postedByAdmin={job.postedByAdmin} format="short" /> },
    { key: "classCourse", label: "Class", cell: job => <span className="font-bold text-j-ink">{job.classCourse}</span> },
    { key: "subjects", label: "Subjects", wide: true, cellClassName: "max-w-[16rem]", cell: job => <span className="text-j-ink-strong">{formatSubjects(job.subjects)}</span> },
    { key: "location", label: "Location", cell: job => <span className="text-j-ink-strong">{job.tuitionLocationLabel ?? job.locationText ?? "Online"}</span> },
    { key: "salary", label: "Salary", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{formatSalaryAmount(job.budgetAmount)}</span> },
    { key: "days", label: "Days", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{formatDaysPerWeek(job.daysPerWeek)}</span> },
    { key: "tutorNumber", label: "Tutor ID", cell: job => <span className="font-mono text-2xs text-j-ink-muted">{job.tutorNumber ?? notSet}</span> },
    { key: "tutorName", label: "Name", cell: job => <span className="font-bold text-j-ink">{job.tutorName}</span> },
    {
      key: "tutorPhone",
      label: "Mobile",
      cellClassName: "whitespace-nowrap",
      cell: job => job.tutorPhone ? <PhoneContact phone={job.tutorPhone} size="table" showCopy={false} formatDisplay={false} /> : notSet,
      cardCell: job => job.tutorPhone ? <PhoneContact phone={job.tutorPhone} size="card" showCopy={false} formatDisplay={false} /> : notSet,
    },
    { key: "appointedAt", label: "Appointed", cellClassName: "whitespace-nowrap", cell: job => <span className="text-j-ink-strong">{appointedOn(job.appointedAt) ?? notSet}</span> },
    { key: "actions", label: "Actions", place: "action", headingHidden: true, cellClassName: "text-right", cell: job => rowActions.renderMenu(job) },
    {
      key: "profile", label: "Tutor profile", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: job => <Link href={`/admin/tutor-profiles/${encodeURIComponent(job.tutorId)}`} aria-label={`Open the profile of ${job.tutorName}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
        <ChevronRight size={16} />
      </Link>,
    },
  ];

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <RecentSearches page="appointed-jobs" value={query} onPick={term => { setQuery(term); setPage(1); }} className="max-w-sm">
      <SearchInput
        value={query}
        onChange={val => { setQuery(val); setPage(1); }}
        onClear={() => { setQuery(""); setPage(1); }}
        placeholder="Search class, subject, location or Tutor"
        label="Search appointed jobs"
        variant="sunken"
      />
    </RecentSearches>

    <AdminJobFilterBar
      filters={filterPanel}
      stage="appointed"
      eyebrow="Appointed Jobs"
      count={jobs.data?.total}
      total={jobs.data?.total}
      loading={jobs.isLoading}
      searching={query.trim().length > 0}
      idleCaption="currently appointed"
      matchingCaption="matching appointed jobs"
      panelLabel="Appointed jobs filters"
    />

    {jobs.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading appointed jobs…</div> : null}
    {jobs.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Appointed jobs could not be loaded.</div> : null}

    {!jobs.isLoading && !jobs.isError ? <RecordTable
      caption="Appointed jobs and the Tutor appointed to each"
      columns={columns}
      rows={items}
      rowKey={job => job.id}
      empty={`No appointed job${query.trim() || filterPanel.activeCount > 0 ? " for this search" : ""}.`}
      tableClassName="min-w-[80rem]"
      animateEntrance
    /> : null}

    <TutorListPager
      page={page}
      totalPages={jobs.data?.totalPages ?? 1}
      onPage={setPage}
      label="Appointed job pages"
      pageSize={pageSize}
      pageSizeOptions={[20, 50, 100]}
      onPageSize={next => { setPageSize(next); setPage(1); }}
      totalItems={jobs.data?.total}
    />

    {rowActions.dialogs}
  </div>;
}

export default function AdminAppointedJobs() {
  return <AdminWorkspaceLayout title="Appointed Jobs"><AdminAppointedJobsContent /></AdminWorkspaceLayout>;
}
