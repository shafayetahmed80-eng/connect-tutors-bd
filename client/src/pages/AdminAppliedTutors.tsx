import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { AdminJobFilterBar, useAdminJobFilters } from "@/components/AdminJobFilters";
import { AdminGuardianTuitionRequestMark, ApproveGuardianTuitionRequestDialog, useAdminGuardianTuitionRequest } from "@/components/AdminGuardianTuitionRequest";
import { CancelTuitionDialog, TutorMoveDialog } from "@/components/AdminTuitionActionDialogs";
import AdminTutorRows, { type AdminApplicantRowActions, type AdminAppointmentRequestActions, type AdminTutorRow } from "@/components/AdminTutorRows";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import AppliedJobFacts, { JobFact } from "@/components/AppliedJobFacts";
import { PhoneContact } from "@/components/PhoneContact";
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
import { ChevronRight, CircleX, Clock, Search, SlidersHorizontal } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import BackLink from "@/components/BackLink";
import RecentSearches from "@/components/RecentSearches";
import SearchInput from "@/components/SearchInput";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useRoute, useSearch } from "wouter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { JobIdTag } from "@/components/JobIdTag";

export type AppliedTutorTimeframe = "all" | "1h" | "3h" | "7h" | "10h" | "24h" | "3d" | "7d";
export type AppliedTutorFilters = TutorFilters & { appliedTimeframe: AppliedTutorTimeframe };
export const defaultAppliedTutorFilters: AppliedTutorFilters = {
  ...defaultTutorFilters,
  appliedTimeframe: "all",
};

export const timeframeOptions: Array<{
  key: AppliedTutorTimeframe;
  label: string;
  countKey: "all" | "h1" | "h3" | "h7" | "h10" | "h24" | "d3" | "d7";
}> = [
  { key: "all", label: "All Applicants", countKey: "all" },
  { key: "1h", label: "Last 1h", countKey: "h1" },
  { key: "3h", label: "Last 3h", countKey: "h3" },
  { key: "7h", label: "Last 7h", countKey: "h7" },
  { key: "10h", label: "Last 10h", countKey: "h10" },
  { key: "24h", label: "Last 24h", countKey: "h24" },
  { key: "3d", label: "Last 3 days", countKey: "d3" },
  { key: "7d", label: "Last 7 days", countKey: "d7" },
];

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
  const search = useSearch();
  const searchTimeframe = new URLSearchParams(search).get("timeframe") as AppliedTutorTimeframe | null;
  const initialTimeframe = searchTimeframe && timeframeOptions.some(opt => opt.key === searchTimeframe)
    ? searchTimeframe
    : "all";
  const [filters, setFilters] = useState<AppliedTutorFilters>(() => ({
    ...defaultAppliedTutorFilters,
    appliedTimeframe: initialTimeframe,
  }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = countActiveFilters(filters, defaultAppliedTutorFilters, { ignore: ["page", "pageSize", "appliedTimeframe"] });
  const applied = trpc.admin.listAppliedTutors.useQuery({ ...filters, requestId }, { retry: false });
  const updateFilter = (change: Partial<AppliedTutorFilters>) => setFilters(current => ({ ...current, ...change, page: change.page ?? 1 }));
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
    <BackLink href="/admin/posted-jobs">Back to Posted jobs</BackLink>

    <section className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-j-border bg-white p-4 shadow-sm lg:justify-start">
      <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#eaf4fd] px-3.5 text-sm font-bold text-[#1267c8]">
        Applied: <span className="tabular-nums">{applied.data?.appliedTotal ?? 0}</span>
      </span>

      {job ? <AppliedJobFacts job={job} afterJobId={<>
        <span className="inline-flex items-center gap-1.5 text-[#173d60]">Posted By <PostTypeBadge postedByAdmin={job.postedByAdmin} format="short" /></span>
        <span className="inline-flex items-center gap-1.5 text-[#173d60]">Tuition Status <TuitionStatus job={{ ...job, tutorId: job.appointedTutorId }} /></span>
      </>}>
        <JobFact icon={job.guardianPhone ? undefined : "phone"} value={job.guardianPhone ? <PhoneContact phone={job.guardianPhone} size="table" showCopy={false} formatDisplay={false} className="col-span-2 lg:col-span-1" /> : "Not given"} wide />
      </AppliedJobFacts> : <div className="min-w-0 flex-1" />}

      {guardianRequest?.type === "cancel_tuition"
        ? <AdminGuardianTuitionRequestMark request={guardianRequest} busy={guardianAnswer.busy} onApprove={() => setApprovingGuardianRequest(true)} onDecline={() => guardianAnswer.decline.mutate({ guardianRequestId: guardianRequest.id })} />
        : tuitionStage && canCancelTuition(tuitionStage) ? <button
        type="button"
        onClick={() => setCancelling(true)}
        className="inline-flex h-control shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 text-sm font-bold text-red-700 hover:bg-red-50"
      >
        <CircleX className="h-4 w-4" /> Cancel Tuition
      </button> : null}

      <button
        type="button"
        onClick={() => setFiltersOpen(open => !open)}
        aria-expanded={filtersOpen}
        className="inline-flex h-control shrink-0 items-center gap-2 rounded-xl border border-j-border px-3.5 text-sm font-bold text-j-ink-soft hover:bg-j-surface-sunken"
      >
        <SlidersHorizontal className="h-4 w-4" /> Filter
        {activeFilterCount ? <span className="rounded-full bg-[#eaf4fd] px-1.5 text-2xs tabular-nums text-[#1267c8]">{activeFilterCount}</span> : null}
      </button>
    </section>

    {/* Quick Timeframe Filter */}
    <section className="flex flex-wrap items-center gap-2 rounded-xl border border-j-border bg-white p-3 shadow-sm" aria-label="Filter applicants by time">
      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-j-ink-muted">
        <Clock className="h-3.5 w-3.5 text-j-ink-soft" />
        <span>Applied Within:</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {timeframeOptions.map(({ key, label, countKey }) => {
          const count = applied.data?.timeCounts ? applied.data.timeCounts[countKey] : undefined;
          const active = filters.appliedTimeframe === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => updateFilter({ appliedTimeframe: key })}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-[#1267c8] text-white shadow-xs"
                  : "border border-j-border bg-white text-j-ink-soft hover:bg-j-surface-sunken hover:text-j-ink"
              }`}
            >
              <span>{label}</span>
              {count !== undefined ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-3xs font-bold tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-j-surface-muted text-j-ink-muted"
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>

    {filtersOpen ? <section className="rounded-xl border border-j-border bg-white p-4 shadow-sm">
      <TutorDirectoryFilters filters={filters} onChange={updateFilter} onClear={() => setFilters(current => ({ ...defaultAppliedTutorFilters, appliedTimeframe: current.appliedTimeframe }))} />
    </section> : null}

    {applied.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading applied Tutors…</div> : null}
    {applied.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{applied.error?.message ?? "The applied Tutors could not be loaded."}</div> : null}

    {!applied.isLoading && !applied.isError
      ? <AdminTutorRows
          tutors={(applied.data?.items ?? []).map(row => ({
            ...row,
            appliedAt: row.appliedAt,
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

    {approving ? <Modal size="dialog" onClose={() => setApproving(null)} busy={approve.isPending}>
      <ModalHeader title={`Appoint ${approving.name}?`} meta={<>Tutor ID {approving.tutorNumber ?? "not set"} · <JobIdTag colon={false} iconSize={11} jobId={jobIdForRequest(requestId)} /></>} />
      <ModalBody>
        <p className="text-sm leading-6 text-j-ink-soft">The Tutor receives the Guardian's name and mobile number, and the Guardian sees the Tutor's. The tuition stays on the Job Board for the demo class.</p>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setApproving(null)} className="h-control rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Cancel</button>
        <button type="button" disabled={approve.isPending || !approving.interestId} onClick={() => { if (approving.interestId) approve.mutate({ interestId: approving.interestId }); }} className="h-control rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-50">{approve.isPending ? "Approving…" : "Approve"}</button>
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

export function TuitionAppliedBadge({
  job,
  basePath = "/admin/applied-tutors",
  isCard = false,
}: {
  job: {
    id: number;
    appliedTutorCount: number;
    appliedTimeCounts?: {
      all: number;
      h1: number;
      h3: number;
      h7: number;
      h10: number;
      h24: number;
      d3: number;
      d7: number;
    };
  };
  basePath?: string;
  isCard?: boolean;
}) {
  const count = job.appliedTutorCount;
  const timeCounts = job.appliedTimeCounts;

  let recentPill: { label: string; count: number; urgent: boolean } | null = null;
  if (timeCounts?.h1 && timeCounts.h1 > 0) {
    recentPill = { label: "1h", count: timeCounts.h1, urgent: true };
  } else if (timeCounts?.h3 && timeCounts.h3 > 0) {
    recentPill = { label: "3h", count: timeCounts.h3, urgent: true };
  } else if (timeCounts?.h7 && timeCounts.h7 > 0) {
    recentPill = { label: "7h", count: timeCounts.h7, urgent: false };
  } else if (timeCounts?.h24 && timeCounts.h24 > 0) {
    recentPill = { label: "24h", count: timeCounts.h24, urgent: false };
  }

  if (count === 0) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-2xs font-bold tabular-nums text-slate-500">
        0
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={e => e.stopPropagation()}
          aria-label={`View applied timeframe breakdown for Job ID ${jobIdForRequest(job.id)}`}
          className="group inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-[#eaf4fd] px-2.5 py-1 text-2xs font-bold text-[#1267c8] transition-all hover:bg-sky-100 hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
        >
          <span className="tabular-nums">{count}</span>
          {recentPill ? (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.2 text-3xs font-extrabold ${
                recentPill.urgent
                  ? "bg-emerald-600 text-white shadow-xs animate-pulse"
                  : "bg-sky-600 text-white"
              }`}
              title={`${recentPill.count} applied in last ${recentPill.label}`}
            >
              <span>+{recentPill.count}</span>
              <span className="opacity-90">{recentPill.label}</span>
            </span>
          ) : (
            <Clock className="size-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={isCard ? "start" : "center"}
        side="bottom"
        sideOffset={6}
        className="w-56 p-2 rounded-xl shadow-lg border border-j-border bg-white text-xs z-50"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-j-border px-2 text-2xs font-bold uppercase tracking-wider text-j-ink-muted">
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-j-ink-soft" /> Applied Within
          </span>
          <span className="tabular-nums text-j-ink font-semibold">Total: {count}</span>
        </div>
        <div className="space-y-0.5">
          {timeframeOptions.map(({ key, label, countKey }) => {
            const timeCount = timeCounts ? timeCounts[countKey] : (key === "all" ? count : 0);
            return (
              <Link
                key={key}
                href={`${basePath}/${job.id}?timeframe=${key}`}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#eaf4fd] hover:text-[#1267c8] transition-colors group text-j-ink font-medium"
              >
                <span className="group-hover:translate-x-0.5 transition-transform">{label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-3xs font-bold tabular-nums ${
                    timeCount > 0
                      ? "bg-[#eaf4fd] text-[#1267c8] group-hover:bg-[#1267c8] group-hover:text-white"
                      : "bg-j-surface-muted text-j-ink-muted"
                  }`}
                >
                  {timeCount}
                </span>
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
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
  const [appliedTimeframe, setAppliedTimeframe] = useState<AppliedTutorTimeframe>("all");
  const filterPanel = useAdminJobFilters({ onChange: () => setPage(1) });
  const chosenStages = appliedTuitionStages.filter(stage => filterPanel.applied.listStages.includes(stage));
  const stages = chosenStages.length ? chosenStages : [...appliedTuitionStages];
  const jobs = trpc.admin.listPostedJobs.useQuery({
    stages,
    query,
    page,
    pageSize: APPLIED_PAGE_SIZE,
    filters: filterPanel.input,
    appliedTimeframe: appliedTimeframe === "all" ? undefined : appliedTimeframe,
  });
  const items = jobs.data?.items ?? [];

  type PostedTuition = (typeof items)[number];
  const tuitionColumns: RecordColumn<PostedTuition>[] = [
    { key: "jobId", label: "Job ID", place: "head", cell: job => <JobIdTag bare className="text-2xs" jobId={jobIdForRequest(job.id)} />, cardCell: job => <JobIdTag className="text-xs" jobId={jobIdForRequest(job.id)} /> },
    { key: "postedBy", label: "Posted By", place: "head", cell: job => <PostTypeBadge postedByAdmin={job.postedByAdmin} format="short" /> },
    { key: "tuitionStatus", label: "Tuition Status", place: "head", cell: job => <TuitionStatus job={job} /> },
    { key: "classCourse", label: "Class / Level", cell: job => <span className="font-bold text-j-ink">{job.classCourse}</span> },
    { key: "subjects", label: "Subjects", wide: true, cellClassName: "max-w-[16rem]", cell: job => <span className="text-j-ink-strong">{formatSubjects(job.subjects)}</span> },
    { key: "location", label: "Location", cell: job => <span className="text-j-ink-strong">{job.tuitionLocationLabel ?? job.locationText ?? "Online"}</span> },
    { key: "salary", label: "Salary", cell: job => <span className="text-j-ink-strong">{formatSalaryAmount(job.budgetAmount)}</span> },
    { key: "days", label: "Days / Week", cell: job => <span className="text-j-ink-strong">{formatDaysPerWeek(job.daysPerWeek)}</span> },
    { key: "guardian", label: "Guardian", cell: job => <span className="text-j-ink-strong">{job.guardianName}</span> },
    {
      key: "applied",
      label: "Applied",
      cell: job => <TuitionAppliedBadge job={job} basePath={basePath} />,
      cardCell: job => <TuitionAppliedBadge job={job} basePath={basePath} isCard />,
    },
    {
      key: "applicants", label: "Applicants", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: job => <Link href={`${basePath}/${job.id}`} aria-label={`Open the ${linkLabel} of Job ID ${jobIdForRequest(job.id)}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
        <ChevronRight size={16} />
      </Link>,
    },
  ];

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <RecentSearches page="applied-tutors" value={query} onPick={term => { setQuery(term); setPage(1); }} className="max-w-sm">
      <SearchInput
        value={query}
        onChange={val => { setQuery(val); setPage(1); }}
        onClear={() => { setQuery(""); setPage(1); }}
        placeholder="Search subject, class, location or Guardian"
        label="Search applications"
        variant="sunken"
      />
    </RecentSearches>

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

    {/* Global Applied Within Filter */}
    <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-j-border bg-white p-3 shadow-sm" aria-label="Filter tuitions by applied timeframe">
      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-j-ink-muted">
        <Clock className="h-3.5 w-3.5 text-j-ink-soft" />
        <span>Applied Within:</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {timeframeOptions.map(({ key, label }) => {
          const active = appliedTimeframe === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { setAppliedTimeframe(key); setPage(1); }}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-[#1267c8] text-white shadow-xs"
                  : "border border-j-border bg-white text-j-ink-soft hover:bg-j-surface-sunken hover:text-j-ink"
              }`}
            >
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </section>

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
