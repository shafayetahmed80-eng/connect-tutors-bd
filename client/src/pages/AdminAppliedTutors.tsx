import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { AdminJobFilterBar, useAdminJobFilters } from "@/components/AdminJobFilters";
import { AdminGuardianTuitionRequestMark, ApproveGuardianTuitionRequestDialog, useAdminGuardianTuitionRequest } from "@/components/AdminGuardianTuitionRequest";
import { CancelTuitionDialog, TutorMoveDialog } from "@/components/AdminTuitionActionDialogs";
import AdminTutorRows, { type AdminApplicantRowActions, type AdminAppointmentRequestActions, type AdminTutorRow } from "@/components/AdminTutorRows";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import AppliedJobFacts, { JobFact } from "@/components/AppliedJobFacts";
import PostTypeBadge from "@/components/PostTypeBadge";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import TuitionStatusPill from "@/components/TuitionStatusPill";
import { getAdminTuitionStage } from "@/lib/adminTuitionStage";
import { getGuardianRequestLifecycle } from "@/pages/GuardianRequestTracking";
import { countActiveFilters } from "@/components/activeFilterCount";
import { TutorListPager } from "@/components/TutorListPager";
import { TutorDirectoryFilters, defaultTutorFilters, type TutorFilters } from "./AdminTutorProfiles";
import { formatDaysPerWeek, formatSubjects } from "@shared/job-card";
import { formatSalaryAmount } from "@shared/salary-amount";
import { jobIdForRequest } from "@shared/job-id";
import { getTutorApplicationStage } from "@shared/tutor-application-stages";
import { applicantActions, canCancelTuition } from "@shared/admin-applicant-actions";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ChevronRight, CircleX, Search, SlidersHorizontal } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

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
  const tuitionStage = job ? getGuardianRequestLifecycle({ ...job, tutorId: job.appointedTutorId }).key : null;

  const utils = trpc.useUtils();
  const [approving, setApproving] = useState<AdminTutorRow | null>(null);
  const refresh = () => {
    void utils.admin.listAppliedTutors.invalidate();
    void utils.admin.listPostedJobs.invalidate();
    // A move here changes the Appointed and Confirmed lists and the Tutor's own job stages too.
    void utils.admin.listAppointedJobs.invalidate();
    void utils.admin.listConfirmedJobs.invalidate();
    void utils.admin.listClosedJobs.invalidate();
    void utils.admin.listTutorDirectory.invalidate();
    void utils.admin.listTutorApplications.invalidate();
    // A move answers any request waiting on the tuition, which the sidebar counts.
    void utils.admin.guardianRequestCounts.invalidate();
  };
  const onError = (error: { message: string }) => { toast.error(error.message); };
  const approve = trpc.admin.approveAppointmentRequest.useMutation({ onSuccess: () => { setApproving(null); refresh(); }, onError });
  const decline = trpc.admin.declineAppointmentRequest.useMutation({ onSuccess: refresh, onError });
  const appointmentActions: AdminAppointmentRequestActions = {
    busy: approve.isPending || decline.isPending,
    // Approving hands both people each other's number, so it is confirmed first.
    onApprove: tutor => setApproving(tutor),
    onDecline: tutor => { if (tutor.interestId) decline.mutate({ interestId: tutor.interestId }); },
  };

  // A Guardian's Confirm, Remove or Cancel request is answered here: Approve makes that move.
  const guardianRequest = applied.data?.guardianRequest ?? null;
  const [approvingGuardianRequest, setApprovingGuardianRequest] = useState(false);
  const guardianAnswer = useAdminGuardianTuitionRequest(() => setApprovingGuardianRequest(false));

  const review = trpc.admin.reviewTutorJobInterest.useMutation({ onError: error => { toast.error(error.message); refresh(); } });
  const confirmTutor = trpc.admin.confirmTutorRequestAppointment.useMutation({ onError: error => { toast.error(error.message); refresh(); } });
  const removeTutor = trpc.admin.reopenAppointedTuition.useMutation({ onError: error => { toast.error(error.message); refresh(); } });
  const removeConfirmed = trpc.admin.removeConfirmedTutor.useMutation({ onError: error => { toast.error(error.message); refresh(); } });
  const [deciding, setDeciding] = useState<{ tutor: AdminTutorRow; action: "appoint" | "confirm" | "remove_appointed" | "remove_confirmed" } | null>(null);
  const actionPending = review.isPending || confirmTutor.isPending || removeTutor.isPending || removeConfirmed.isPending;
  const settle = (message: string) => { setDeciding(null); refresh(); toast.success(message); };
  const rowActions: AdminApplicantRowActions = {
    busy: actionPending || guardianAnswer.busy,
    optionsFor: tutor => !job || !tuitionStage || !tutor.applicationStatus ? [] : applicantActions({
      tuitionStage,
      applicationStatus: tutor.applicationStatus,
      holdsTuition: tutor.id === job.appointedTutorId,
      tutorApproved: tutor.profileStatus === "approved",
    }).filter(({ action }) =>
      // A Guardian's waiting request is answered by Approve beside it, which appoints the same way.
      !(action === "appoint" && tutor.appointmentRequestedAt)
      // So is a Confirm or Remove the Guardian asked for about this Tutor.
      && !(guardianRequest?.tutorId === tutor.id && (
        (guardianRequest.type === "confirm" && action === "confirm")
        || (guardianRequest.type === "remove_tutor" && (action === "remove_appointed" || action === "remove_confirmed"))
      ))),
    onAction: (tutor, action) => {
      if (action === "shortlist" || action === "unshortlist") {
        if (!tutor.interestId) return;
        review.mutate(
          { interestId: tutor.interestId, status: action === "shortlist" ? "shortlisted" : "interested" },
          { onSuccess: () => { refresh(); toast.success(action === "shortlist" ? `${tutor.name} is shortlisted.` : `${tutor.name} is off the shortlist.`); } },
        );
      } else {
        setDeciding({ tutor, action });
      }
    },
  };
  const decide = () => {
    if (!deciding) return;
    const { tutor, action } = deciding;
    if (action === "appoint" && tutor.interestId) {
      review.mutate({ interestId: tutor.interestId, status: "matched" }, { onSuccess: () => settle(`${tutor.name} is appointed.`) });
    } else if (action === "confirm") {
      confirmTutor.mutate({ requestId, tutorId: tutor.id }, { onSuccess: () => settle(`${tutor.name} is confirmed.`) });
    } else if (action === "remove_appointed") {
      removeTutor.mutate({ requestId, tutorId: tutor.id }, { onSuccess: () => settle(`${tutor.name} is removed. The tuition is Live again.`) });
    } else if (action === "remove_confirmed") {
      removeConfirmed.mutate({ requestId, tutorId: tutor.id }, { onSuccess: () => settle(`${tutor.name} is removed. The tuition is Live again.`) });
    }
  };

  // Cancelling is the tuition's, not an applicant's: the Guardian is not taking a Tutor from us.
  const [cancelling, setCancelling] = useState(false);
  const cancelTuition = trpc.admin.cancelTutorRequest.useMutation({
    onSuccess: () => { setCancelling(false); refresh(); toast.success(`Job ID ${jobIdForRequest(requestId)} is cancelled.`); },
    onError: error => { toast.error(error.message); refresh(); },
  });

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <Link href="/admin/posted-jobs" className="inline-flex items-center gap-1.5 text-sm font-bold text-j-accent hover:underline">
      <ArrowLeft size={15} /> Back to Posted jobs
    </Link>

    <section className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-j-border bg-white p-4 shadow-sm lg:justify-start">
      <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#eaf4fd] px-3.5 text-sm font-bold text-[#1267c8]">
        Applied: <span className="tabular-nums">{applied.data?.appliedTotal ?? 0}</span>
      </span>

      {job ? <AppliedJobFacts job={job} afterJobId={<>
        <span className="inline-flex items-center gap-1.5 text-[#173d60]">Posted By <PostTypeBadge postedByAdmin={job.postedByAdmin} format="short" /></span>
        <span className="inline-flex items-center gap-1.5 text-[#173d60]">Tuition Status <TuitionStatus job={{ ...job, tutorId: job.appointedTutorId }} /></span>
      </>}>
        <JobFact icon="phone" value={job.guardianPhone || "Not given"} wide />
      </AppliedJobFacts> : <div className="min-w-0 flex-1" />}

      {guardianRequest?.type === "cancel_tuition"
        ? <AdminGuardianTuitionRequestMark request={guardianRequest} busy={guardianAnswer.busy} onApprove={() => setApprovingGuardianRequest(true)} onDecline={() => guardianAnswer.decline.mutate({ guardianRequestId: guardianRequest.id })} />
        : tuitionStage && canCancelTuition(tuitionStage) ? <button
        type="button"
        onClick={() => setCancelling(true)}
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 text-sm font-bold text-red-700 hover:bg-red-50"
      >
        <CircleX className="h-4 w-4" /> Cancel Tuition
      </button> : null}

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

    {applied.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading applied Tutors…</div> : null}
    {applied.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{applied.error?.message ?? "The applied Tutors could not be loaded."}</div> : null}

    {!applied.isLoading && !applied.isError
      ? <AdminTutorRows
          tutors={(applied.data?.items ?? []).map(row => ({
            ...row,
            applicationStage: getTutorApplicationStage({
              status: row.applicationStatus,
              appointmentConfirmedAt: job?.appointmentConfirmedAt ?? null,
              paymentStatus: job?.paymentStatus ?? null,
              tuitionCancelled: tuitionStage === "cancelled",
            }),
          }))}
          caption="Tutors who applied to this tuition"
          emptyLabel={activeFilterCount ? "No applicant matches the active filters." : "No Tutor has applied to this tuition yet."}
          serialFrom={(filters.page - 1) * filters.pageSize + 1}
          showApplicationStage
          showGuardianMarks
          appointmentActions={appointmentActions}
          guardianTuitionRequest={guardianRequest ? {
            request: guardianRequest,
            busy: guardianAnswer.busy,
            onApprove: () => setApprovingGuardianRequest(true),
            onDecline: () => guardianAnswer.decline.mutate({ guardianRequestId: guardianRequest.id }),
          } : undefined}
          applicantRowActions={rowActions}
        />
      : null}

    <TutorListPager page={filters.page} totalPages={applied.data?.totalPages ?? 1} onPage={next => updateFilter({ page: next })} label="Applied Tutor pages" />

    {approving ? <Modal size="sm" onClose={() => setApproving(null)} busy={approve.isPending}>
      <ModalHeader title={`Appoint ${approving.name}?`} meta={`Tutor ID ${approving.tutorNumber ?? "not set"} · Job ID ${jobIdForRequest(requestId)}`} />
      <ModalBody>
        <p className="text-sm leading-6 text-j-ink-soft">The Tutor receives the Guardian's name and mobile number, and the Guardian sees the Tutor's. The tuition stays on the Job Board for the demo class.</p>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setApproving(null)} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Cancel</button>
        <button type="button" disabled={approve.isPending || !approving.interestId} onClick={() => { if (approving.interestId) approve.mutate({ interestId: approving.interestId }); }} className="h-10 rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-50">{approve.isPending ? "Approving…" : "Approve"}</button>
      </ModalFooter>
    </Modal> : null}

    {approvingGuardianRequest && guardianRequest ? <ApproveGuardianTuitionRequestDialog
      request={guardianRequest}
      jobId={jobIdForRequest(requestId)}
      tutorName={applied.data?.items.find(row => row.id === guardianRequest.tutorId)?.name}
      confirmed={tuitionStage === "confirmed"}
      busy={guardianAnswer.approve.isPending}
      onClose={() => setApprovingGuardianRequest(false)}
      onApprove={() => guardianAnswer.approve.mutate({ guardianRequestId: guardianRequest.id })}
    /> : null}

    {cancelling ? <CancelTuitionDialog
      jobId={jobIdForRequest(requestId)}
      guardianName={job?.guardianName}
      busy={cancelTuition.isPending}
      onClose={() => setCancelling(false)}
      onCancel={reason => cancelTuition.mutate({ requestId, reason })}
    /> : null}

    {deciding ? <TutorMoveDialog
      move={deciding.action}
      tutorName={deciding.tutor.name}
      tutorNumber={deciding.tutor.tutorNumber}
      jobId={jobIdForRequest(requestId)}
      busy={actionPending}
      onClose={() => setDeciding(null)}
      onDecide={decide}
    /> : null}
  </div>;
}

/** A tuition's stage, named by the same rule as the Posted jobs cards. */
export function TuitionStatus({ job }: { job: Parameters<typeof getGuardianRequestLifecycle>[0] & { paymentStatus?: string | null } }) {
  const lifecycle = getAdminTuitionStage(job);
  return <TuitionStatusPill stage={lifecycle.key} label={lifecycle.label} />;
}

const APPLIED_PAGE_SIZE = 20;

/** Every stage a tuition can have applicants in: on the Job Board, or past it. */
export const appliedTuitionStages = ["live", "appointed", "confirmed"] as const;

/**
 * Which tuition's applicants to read.
 *
 * The sidebar tab lands here, because the page below it is about one tuition
 * and arriving from the sidebar you have not chosen one yet. Every tuition that
 * reached the Job Board and was not cancelled is listed - Live, Appointed and
 * Confirmed, each with its stage - since an Appointed or Confirmed tuition
 * keeps the applicants it had. It reads the same `admin.listPostedJobs` the
 * Posted jobs board reads, so the counts on the two screens cannot disagree.
 *
 * The card above the list and its Filter panel are the Posted jobs board's, with
 * the choices that fit a list of three stages: which of them to show, how many
 * Tutors applied, and whether any is shortlisted.
 */
export function AdminAppliedTuitionsContent({ basePath = "/admin/applied-tutors", linkLabel = "applicants" }: { basePath?: string; linkLabel?: string } = {}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filterPanel = useAdminJobFilters({ onChange: () => setPage(1) });
  const chosenStages = appliedTuitionStages.filter(stage => filterPanel.applied.listStages.includes(stage));
  const stages = chosenStages.length ? chosenStages : [...appliedTuitionStages];
  const jobs = trpc.admin.listPostedJobs.useQuery({ stages, query, page, pageSize: APPLIED_PAGE_SIZE, filters: filterPanel.input });
  const items = jobs.data?.items ?? [];

  type PostedTuition = (typeof items)[number];
  const tuitionColumns: RecordColumn<PostedTuition>[] = [
    { key: "jobId", label: "Job ID", place: "head", cell: job => <span className="font-mono text-2xs text-j-ink-muted">{jobIdForRequest(job.id)}</span> },
    { key: "postedBy", label: "Posted By", place: "head", cell: job => <PostTypeBadge postedByAdmin={job.postedByAdmin} format="short" /> },
    { key: "tuitionStatus", label: "Tuition Status", place: "head", cell: job => <TuitionStatus job={job} /> },
    { key: "classCourse", label: "Class / Level", cell: job => <span className="font-bold text-j-ink">{job.classCourse}</span> },
    { key: "subjects", label: "Subjects", wide: true, cellClassName: "max-w-[16rem]", cell: job => <span className="text-j-ink-strong">{formatSubjects(job.subjects)}</span> },
    { key: "location", label: "Location", cell: job => <span className="text-j-ink-strong">{job.tuitionLocationLabel ?? job.locationText ?? "Online"}</span> },
    { key: "salary", label: "Salary", cell: job => <span className="text-j-ink-strong">{formatSalaryAmount(job.budgetAmount)}</span> },
    { key: "days", label: "Days / Week", cell: job => <span className="text-j-ink-strong">{formatDaysPerWeek(job.daysPerWeek)}</span> },
    { key: "guardian", label: "Guardian", cell: job => <span className="text-j-ink-strong">{job.guardianName}</span> },
    { key: "applied", label: "Applied", cell: job => <span className="inline-flex rounded-full bg-[#eaf4fd] px-2.5 py-1 text-2xs font-bold tabular-nums text-[#1267c8]">{job.appliedTutorCount}</span> },
    {
      key: "applicants", label: "Applicants", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: job => <Link href={`${basePath}/${job.id}`} aria-label={`Open the ${linkLabel} of Job ID ${jobIdForRequest(job.id)}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
        <ChevronRight size={16} />
      </Link>,
    },
  ];

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <label className="relative block max-w-sm">
      <span className="sr-only">Search tuitions</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
      <input
        value={query}
        onChange={event => { setQuery(event.target.value); setPage(1); }}
        placeholder="Search subject, class, location or Guardian"
        className="h-11 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
      />
    </label>

    <AdminJobFilterBar
      filters={filterPanel}
      stage="applied"
      eyebrow="Tuitions"
      count={jobs.data?.total}
      total={jobs.data?.total}
      loading={jobs.isLoading}
      searching={query.trim().length > 0}
      idleCaption="live, appointed and confirmed"
      matchingCaption="matching tuitions"
      panelLabel="Tuition filters"
    />

    {jobs.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading tuitions…</div> : null}
    {jobs.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Tuitions could not be loaded.</div> : null}

    {!jobs.isLoading && !jobs.isError ? <RecordTable
      caption="Tuitions, their stage, and how many Tutors applied to each"
      columns={tuitionColumns}
      rows={items}
      rowKey={job => job.id}
      empty={`No live, appointed or confirmed tuition${query.trim() || filterPanel.activeCount > 0 ? " for this search" : ""}. A tuition has to be Live before a Tutor can apply to it.`}
      tableClassName="min-w-[70rem]"
    /> : null}

    <TutorListPager page={page} totalPages={jobs.data?.totalPages ?? 1} onPage={setPage} label="Tuition pages" />
  </div>;
}

export default function AdminAppliedTutors() {
  const [, params] = useRoute("/admin/applied-tutors/:requestId");
  const requestId = Number(params?.requestId);
  const chosen = Number.isInteger(requestId) && requestId > 0;
  return <AdminWorkspaceLayout title="Applied Tutors">
    {chosen ? <AdminAppliedTutorsContent requestId={requestId} /> : <AdminAppliedTuitionsContent />}
  </AdminWorkspaceLayout>;
}
