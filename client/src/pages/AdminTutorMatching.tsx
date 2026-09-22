import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { AdminGuardianTuitionRequestMark, ApproveGuardianTuitionRequestDialog, useAdminGuardianTuitionRequest } from "@/components/AdminGuardianTuitionRequest";
import AdminTutorRows, { type AdminApplicantRowActions, type AdminAppointmentRequestActions, type AdminTutorRow } from "@/components/AdminTutorRows";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import AppliedJobFacts, { JobFact } from "@/components/AppliedJobFacts";
import PostTypeBadge from "@/components/PostTypeBadge";
import { TutorListPager } from "@/components/TutorListPager";
import { getGuardianRequestLifecycle } from "@/pages/GuardianRequestTracking";
import { jobIdForRequest } from "@shared/job-id";
import { getTutorApplicationStage } from "@shared/tutor-application-stages";
import { applicantActions, canCancelTuition } from "@shared/admin-applicant-actions";
import { trpc } from "@/lib/trpc";
import { AdminAppliedTuitionsContent, TuitionStatus } from "./AdminAppliedTutors";
import { ArrowLeft, CircleX, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

export type TutorMatchingFilters = {
  query: string;
  verified: "all" | "verified" | "unverified";
  location: string;
  subject: string;
  tuitionType: "all" | "home" | "online" | "group" | "package";
  page: number;
  pageSize: 20 | 50 | 100;
};

export const defaultTutorMatchingFilters: TutorMatchingFilters = { query: "", verified: "all", location: "", subject: "", tuitionType: "all", page: 1, pageSize: 20 };

const matchingPageSizeOptions = [20, 50, 100] as const;

/**
 * How many active filters read differently from the defaults, for the badge
 * on the Filter button. Page and page size are navigation, not a filter.
 */
function countMatchingFilters(filters: TutorMatchingFilters): number {
  return (Object.keys(defaultTutorMatchingFilters) as Array<keyof TutorMatchingFilters>)
    .filter(key => key !== "page" && key !== "pageSize")
    .filter(key => filters[key] !== defaultTutorMatchingFilters[key]).length;
}

function TutorMatchingFilterBar({ filters, onChange, onClear }: {
  filters: TutorMatchingFilters;
  onChange: (change: Partial<TutorMatchingFilters>) => void;
  onClear: () => void;
}) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <label className="relative sm:col-span-2">
      <span className="sr-only">Search Tutors</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
      <input value={filters.query} onChange={event => onChange({ query: event.target.value })} placeholder="Search Tutor name, ID, institution or headline" className="h-11 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
    </label>
    <select value={filters.verified} onChange={event => onChange({ verified: event.target.value as TutorMatchingFilters["verified"] })} aria-label="Verification status" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All verification states</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
    <input value={filters.location} onChange={event => onChange({ location: event.target.value })} placeholder="Location" className="h-11 rounded-xl border border-j-border px-3 text-sm" />
    <input value={filters.subject} onChange={event => onChange({ subject: event.target.value })} placeholder="Subject" className="h-11 rounded-xl border border-j-border px-3 text-sm" />
    <select value={filters.tuitionType} onChange={event => onChange({ tuitionType: event.target.value as TutorMatchingFilters["tuitionType"] })} aria-label="Tuition type" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All tuition modes</option><option value="home">Home tuition</option><option value="online">Online tuition</option><option value="group">Group tuition</option><option value="package">Package tuition</option></select>
    <button type="button" onClick={onClear} className="h-11 rounded-xl border border-j-border px-3 text-sm font-bold text-j-ink-soft hover:bg-j-surface-sunken">Clear filters</button>
  </div>;
}

/**
 * One tuition's best-matching Tutors, first to worst.
 *
 * Applied Tutors starts from who applied; this starts from every approved
 * Tutor Profile and ranks them against the tuition instead, so an Admin can
 * shortlist or appoint a strong match who never saw the Job Board. Rows are
 * the same `AdminTutorRows` component with the same actions - a Tutor already
 * on this tuition's applicant list carries that application here too, and
 * reads identically on both screens. A Tutor met here for the first time gets
 * one silently created the moment an Admin shortlists or appoints them, the
 * same way applying themselves would have.
 */
export function AdminTutorMatchingContent({ requestId }: { requestId: number }) {
  const [filters, setFilters] = useState<TutorMatchingFilters>(defaultTutorMatchingFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = countMatchingFilters(filters);
  const matching = trpc.admin.listMatchingCandidates.useQuery({ ...filters, requestId }, { retry: false });
  const updateFilter = (change: Partial<TutorMatchingFilters>) => setFilters(current => ({ ...current, ...change, page: change.page ?? 1 }));
  const job = matching.data?.job;
  const lifecycleStage = job ? getGuardianRequestLifecycle({ ...job, tutorId: job.appointedTutorId }).key : null;

  const utils = trpc.useUtils();
  const refresh = () => {
    void utils.admin.listMatchingCandidates.invalidate();
    void utils.admin.listAppliedTutors.invalidate();
    void utils.admin.listPostedJobs.invalidate();
    void utils.admin.listAppointedJobs.invalidate();
    void utils.admin.listConfirmedJobs.invalidate();
    void utils.admin.listTutorDirectory.invalidate();
    void utils.admin.listTutorApplications.invalidate();
  };
  const onError = (error: { message: string }) => { toast.error(error.message); };

  const [approving, setApproving] = useState<AdminTutorRow | null>(null);
  const approve = trpc.admin.approveAppointmentRequest.useMutation({ onSuccess: () => { setApproving(null); refresh(); }, onError });
  const decline = trpc.admin.declineAppointmentRequest.useMutation({ onSuccess: refresh, onError });
  const appointmentActions: AdminAppointmentRequestActions = {
    busy: approve.isPending || decline.isPending,
    onApprove: tutor => setApproving(tutor),
    onDecline: tutor => { if (tutor.interestId) decline.mutate({ interestId: tutor.interestId }); },
  };

  const guardianRequest = matching.data?.guardianRequest ?? null;
  const [approvingGuardianRequest, setApprovingGuardianRequest] = useState(false);
  const guardianAnswer = useAdminGuardianTuitionRequest(() => setApprovingGuardianRequest(false));

  const review = trpc.admin.reviewTutorJobInterest.useMutation({ onError: error => { toast.error(error.message); refresh(); } });
  // A candidate who never applied has no application yet - this creates one and moves it in the same step.
  const matchTutor = trpc.admin.matchTutorToRequest.useMutation({ onError: error => { toast.error(error.message); refresh(); } });
  const confirmTutor = trpc.admin.confirmTutorRequestAppointment.useMutation({ onError: error => { toast.error(error.message); refresh(); } });
  const removeTutor = trpc.admin.reopenAppointedTuition.useMutation({ onError: error => { toast.error(error.message); refresh(); } });
  const removeConfirmed = trpc.admin.removeConfirmedTutor.useMutation({ onError: error => { toast.error(error.message); refresh(); } });
  const [deciding, setDeciding] = useState<{ tutor: AdminTutorRow; action: "appoint" | "confirm" | "remove_appointed" | "remove_confirmed" } | null>(null);
  const actionPending = review.isPending || matchTutor.isPending || confirmTutor.isPending || removeTutor.isPending || removeConfirmed.isPending;
  const settle = (message: string) => { setDeciding(null); refresh(); toast.success(message); };

  const rowActions: AdminApplicantRowActions = {
    busy: actionPending || guardianAnswer.busy,
    optionsFor: tutor => {
      if (!job || !lifecycleStage) return [];
      // No application yet reads as a fresh, un-shortlisted applicant - unless
      // this Tutor already holds the tuition without one, the one shape a
      // manual assignment from the old Matching workspace can still leave.
      const status = tutor.applicationStatus ?? (tutor.id === job.appointedTutorId ? "matched" : "interested");
      return applicantActions({
        tuitionStage: lifecycleStage,
        applicationStatus: status,
        holdsTuition: tutor.id === job.appointedTutorId,
        tutorApproved: tutor.profileStatus === "approved",
      }).filter(({ action }) =>
        !(action === "appoint" && tutor.appointmentRequestedAt)
        && !(guardianRequest?.tutorId === tutor.id && (
          (guardianRequest.type === "confirm" && action === "confirm")
          || (guardianRequest.type === "remove_tutor" && (action === "remove_appointed" || action === "remove_confirmed"))
        )));
    },
    onAction: (tutor, action) => {
      if (action === "shortlist" || action === "unshortlist") {
        if (tutor.interestId) {
          review.mutate(
            { interestId: tutor.interestId, status: action === "shortlist" ? "shortlisted" : "interested" },
            { onSuccess: () => { refresh(); toast.success(action === "shortlist" ? `${tutor.name} is shortlisted.` : `${tutor.name} is off the shortlist.`); } },
          );
        } else {
          matchTutor.mutate(
            { requestId, tutorId: tutor.id, status: "shortlisted" },
            { onSuccess: () => { refresh(); toast.success(`${tutor.name} is shortlisted.`); } },
          );
        }
      } else {
        setDeciding({ tutor, action });
      }
    },
  };
  const decide = () => {
    if (!deciding) return;
    const { tutor, action } = deciding;
    if (action === "appoint") {
      if (tutor.interestId) {
        review.mutate({ interestId: tutor.interestId, status: "matched" }, { onSuccess: () => settle(`${tutor.name} is appointed.`) });
      } else {
        matchTutor.mutate({ requestId, tutorId: tutor.id, status: "matched" }, { onSuccess: () => settle(`${tutor.name} is appointed.`) });
      }
    } else if (action === "confirm") {
      confirmTutor.mutate({ requestId, tutorId: tutor.id }, { onSuccess: () => settle(`${tutor.name} is confirmed.`) });
    } else if (action === "remove_appointed") {
      removeTutor.mutate({ requestId, tutorId: tutor.id }, { onSuccess: () => settle(`${tutor.name} is removed. The tuition is Live again.`) });
    } else if (action === "remove_confirmed") {
      removeConfirmed.mutate({ requestId, tutorId: tutor.id }, { onSuccess: () => settle(`${tutor.name} is removed. The tuition is Live again.`) });
    }
  };

  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const cancelTuition = trpc.admin.cancelTutorRequest.useMutation({
    onSuccess: () => { setCancelling(false); setCancelReason(""); refresh(); toast.success(`Job ID ${jobIdForRequest(requestId)} is cancelled.`); },
    onError: error => { toast.error(error.message); refresh(); },
  });

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <Link href="/admin/tutor-matching" className="inline-flex items-center gap-1.5 text-sm font-bold text-j-accent hover:underline">
      <ArrowLeft size={15} /> Back to Tutor Matching
    </Link>

    <section className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-j-border bg-white p-4 shadow-sm lg:justify-start">
      <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#eaf4fd] px-3.5 text-sm font-bold text-[#1267c8]">
        Applied: <span className="tabular-nums">{matching.data?.appliedTotal ?? 0}</span>
      </span>

      {job ? <AppliedJobFacts job={job} afterJobId={<>
        <span className="inline-flex items-center gap-1.5 text-[#173d60]">Posted By <PostTypeBadge postedByAdmin={job.postedByAdmin} format="short" /></span>
        <span className="inline-flex items-center gap-1.5 text-[#173d60]">Tuition Status <TuitionStatus job={{ ...job, tutorId: job.appointedTutorId }} /></span>
      </>}>
        <JobFact icon="phone" value={job.guardianPhone || "Not given"} wide />
      </AppliedJobFacts> : <div className="min-w-0 flex-1" />}

      {guardianRequest?.type === "cancel_tuition"
        ? <AdminGuardianTuitionRequestMark request={guardianRequest} busy={guardianAnswer.busy} onApprove={() => setApprovingGuardianRequest(true)} onDecline={() => guardianAnswer.decline.mutate({ guardianRequestId: guardianRequest.id })} />
        : lifecycleStage && canCancelTuition(lifecycleStage) ? <button
        type="button"
        onClick={() => { setCancelReason(""); setCancelling(true); }}
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
      <TutorMatchingFilterBar filters={filters} onChange={updateFilter} onClear={() => setFilters(defaultTutorMatchingFilters)} />
    </section> : null}

    {matching.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading matching Tutors…</div> : null}
    {matching.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{matching.error?.message ?? "Matching Tutors could not be loaded."}</div> : null}

    {!matching.isLoading && !matching.isError
      ? <AdminTutorRows
          tutors={(matching.data?.items ?? []).map(row => ({
            ...row,
            interestId: row.interestId ?? undefined,
            applicationStatus: row.applicationStatus ?? undefined,
            applicationStage: row.applicationStatus || row.id === job?.appointedTutorId
              ? getTutorApplicationStage({
                  status: row.applicationStatus ?? "matched",
                  appointmentConfirmedAt: job?.appointmentConfirmedAt ?? null,
                  tuitionCancelled: lifecycleStage === "cancelled",
                })
              : undefined,
          }))}
          caption="Approved Tutors, best match first"
          emptyLabel={activeFilterCount ? "No Tutor matches the active filters." : "No approved Tutor is available to match against this tuition."}
          serialFrom={(filters.page - 1) * filters.pageSize + 1}
          showApplicationStage
          showGuardianMarks
          showMatchNotes
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

    <TutorListPager
      page={filters.page}
      totalPages={matching.data?.totalPages ?? 1}
      onPage={next => updateFilter({ page: next })}
      label="Tutor Matching pages"
      pageSize={filters.pageSize}
      pageSizeOptions={matchingPageSizeOptions}
      onPageSize={next => updateFilter({ pageSize: next as TutorMatchingFilters["pageSize"] })}
    />

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
      tutorName={matching.data?.items.find(row => row.id === guardianRequest.tutorId)?.name}
      confirmed={lifecycleStage === "confirmed"}
      busy={guardianAnswer.approve.isPending}
      onClose={() => setApprovingGuardianRequest(false)}
      onApprove={() => guardianAnswer.approve.mutate({ guardianRequestId: guardianRequest.id })}
    /> : null}

    {cancelling ? <Modal size="sm" onClose={() => setCancelling(false)} busy={cancelTuition.isPending}>
      <ModalHeader title={`Cancel Job ID ${jobIdForRequest(requestId)}?`} meta={job ? `Guardian ${job.guardianName}` : undefined} />
      <ModalBody className="space-y-3">
        <p className="text-sm leading-6 text-j-ink-soft">The tuition closes and leaves the Job Board. The Guardian is told, and so is its Tutor if it has one.</p>
        <label className="block text-sm font-bold text-j-ink-strong">Reason (required)
          <textarea
            value={cancelReason}
            onChange={event => setCancelReason(event.target.value)}
            rows={3}
            maxLength={280}
            className="mt-2 w-full rounded-xl border border-j-field-border p-3 text-sm font-normal outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setCancelling(false)} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Keep Tuition</button>
        <button
          type="button"
          disabled={cancelTuition.isPending || cancelReason.trim().length < 3}
          onClick={() => cancelTuition.mutate({ requestId, reason: cancelReason.trim() })}
          className="h-10 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >{cancelTuition.isPending ? "Cancelling…" : "Cancel Tuition"}</button>
      </ModalFooter>
    </Modal> : null}

    {deciding ? <Modal size="sm" onClose={() => setDeciding(null)} busy={actionPending}>
      <ModalHeader
        title={deciding.action === "appoint" ? `Appoint ${deciding.tutor.name}?` : deciding.action === "confirm" ? `Confirm ${deciding.tutor.name}?` : `Remove ${deciding.tutor.name}?`}
        meta={`Tutor ID ${deciding.tutor.tutorNumber ?? "not set"} · Job ID ${jobIdForRequest(requestId)}`}
      />
      <ModalBody>
        <p className="text-sm leading-6 text-j-ink-soft">{deciding.action === "appoint"
          ? "The Tutor receives the Guardian's name and mobile number, and the Guardian sees the Tutor's. The tuition stays on the Job Board for the demo class."
          : deciding.action === "confirm"
            ? "The Guardian keeps the Tutor. The tuition leaves the Job Board."
            : deciding.action === "remove_confirmed"
              ? "The Tutor is removed and told. The tuition goes back on the Job Board, its payment status starts again at Full Due, and the Guardian can appoint another applicant."
              : "The Tutor is removed and told. The tuition is Live again, and the Guardian can appoint another applicant."}</p>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setDeciding(null)} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Cancel</button>
        <button
          type="button"
          disabled={actionPending}
          onClick={decide}
          className={`h-10 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50 ${deciding.action === "remove_appointed" || deciding.action === "remove_confirmed" ? "bg-red-600 hover:bg-red-700" : deciding.action === "confirm" ? "bg-[#0f7048] hover:bg-[#0c5b3a]" : "bg-j-accent hover:bg-j-accent-hover"}`}
        >{actionPending
          ? (deciding.action === "appoint" ? "Appointing…" : deciding.action === "confirm" ? "Confirming…" : "Removing…")
          : (deciding.action === "appoint" ? "Appoint" : deciding.action === "confirm" ? "Confirm" : "Remove Tutor")}</button>
      </ModalFooter>
    </Modal> : null}
  </div>;
}

export default function AdminTutorMatching() {
  const [, params] = useRoute("/admin/tutor-matching/:requestId");
  const requestId = Number(params?.requestId);
  const chosen = Number.isInteger(requestId) && requestId > 0;
  return <AdminWorkspaceLayout title="Tutor Matching">
    {chosen ? <AdminTutorMatchingContent requestId={requestId} /> : <AdminAppliedTuitionsContent basePath="/admin/tutor-matching" linkLabel="matching Tutors" />}
  </AdminWorkspaceLayout>;
}
