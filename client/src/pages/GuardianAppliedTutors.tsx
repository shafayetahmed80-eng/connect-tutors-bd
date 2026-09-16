import AppliedJobFacts from "@/components/AppliedJobFacts";
import GuardianApplicantRows, { type GuardianApplicantActions } from "@/components/GuardianApplicantRows";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import { TutorListPager } from "@/components/TutorListPager";
import { formatDaysPerWeek, formatSubjects } from "@shared/job-card";
import { formatSalaryAmount } from "@shared/salary-amount";
import { jobIdForRequest } from "@shared/job-id";
import TuitionStatusPill from "@/components/TuitionStatusPill";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { getGuardianRequestLifecycle } from "./GuardianRequestTracking";

const APPLICANT_PAGE_SIZE = 20;

/**
 * Everyone who applied to one of the Guardian's tuitions: the Admin's Applied
 * Tutors page, with the Guardian's own columns and no filters.
 *
 * Nothing on this page decides what is private. The server sends only this
 * Guardian's tuition, only the applicants they may see, and a mobile number
 * only for the Tutor appointed to it; the page renders what arrived.
 */
export function GuardianAppliedTutorsContent({ requestId }: { requestId: number }) {
  const [page, setPage] = useState(1);
  const applied = trpc.tutorRequests.appliedTutors.useQuery({ requestId, page, pageSize: APPLICANT_PAGE_SIZE }, { retry: false });
  const job = applied.data?.job;

  const utils = trpc.useUtils();
  const refresh = () => utils.tutorRequests.appliedTutors.invalidate({ requestId });
  const onError = (error: { message: string }) => { toast.error(error.message); };
  const shortlist = trpc.tutorRequests.shortlistApplicant.useMutation({ onSuccess: refresh, onError });
  const requestAppointment = trpc.tutorRequests.requestAppointment.useMutation({ onSuccess: refresh, onError });
  const withdrawAppointment = trpc.tutorRequests.withdrawAppointmentRequest.useMutation({ onSuccess: refresh, onError });
  const actions: GuardianApplicantActions = {
    // Live, with no request already waiting - the same rule the server applies.
    canRequestAppointment: applied.data?.lifecycle === "live" && !applied.data.appointmentRequestPending,
    busy: shortlist.isPending || requestAppointment.isPending || withdrawAppointment.isPending,
    onShortlist: (tutor, shortlisted) => shortlist.mutate({ requestId, tutorId: tutor.id, shortlisted }),
    onRequestAppointment: tutor => requestAppointment.mutate({ requestId, tutorId: tutor.id }),
    onWithdrawAppointment: tutor => withdrawAppointment.mutate({ requestId, tutorId: tutor.id }),
  };

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <Link href="/guardian/dashboard/posted-jobs" className="inline-flex items-center gap-1.5 text-sm font-bold text-j-accent hover:underline">
      <ArrowLeft size={15} /> Back to Posted jobs
    </Link>

    {/* A tuition that cannot be opened has no count - "Applied: 0" beside the error would be untrue. */}
    {!applied.isError ? <section className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-j-border bg-white p-4 shadow-sm">
      <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#eaf4fd] px-3.5 text-sm font-bold text-[#1267c8]">
        Applied: <span className="tabular-nums">{applied.data?.total ?? 0}</span>
      </span>
      {job ? <AppliedJobFacts job={job} /> : <div className="min-w-0 flex-1" />}
    </section> : null}

    {applied.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading applied Tutors…</div> : null}
    {applied.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{applied.error?.message ?? "The applied Tutors could not be loaded."}</div> : null}

    {!applied.isLoading && !applied.isError
      ? <GuardianApplicantRows
          tutors={applied.data?.items ?? []}
          requestId={requestId}
          actions={actions}
          emptyLabel="No Tutor has applied to this tuition yet."
          serialFrom={(page - 1) * APPLICANT_PAGE_SIZE + 1}
        />
      : null}

    <TutorListPager page={page} totalPages={applied.data?.totalPages ?? 1} onPage={setPage} label="Applied Tutor pages" />
  </div>;
}

type GuardianTuition = Parameters<typeof getGuardianRequestLifecycle>[0] & {
  id: number;
  classCourse: string;
  subjects: unknown;
  tuitionLocationLabel?: string | null;
  budgetAmount: number | null;
  daysPerWeek: number;
  appliedTutorCount?: number;
};

/**
 * Where the sidebar tab lands: the Guardian's tuitions that can have
 * applicants, each with the count its Posted jobs button carries.
 */
export function GuardianAppliedTuitionsContent({ requests, isLoading, isError = false }: { requests: GuardianTuition[]; isLoading: boolean; isError?: boolean }) {
  const tuitions = requests
    .map(request => ({ request, lifecycle: getGuardianRequestLifecycle(request) }))
    .filter(({ lifecycle }) => lifecycle.key === "live" || lifecycle.key === "appointed");

  if (isLoading) {
    return <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your tuitions…</div>;
  }
  // A failed load is not an empty list: "No live or appointed tuition" would be untrue.
  if (isError) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Your tuitions could not be loaded.</div>;
  }

  type TuitionRow = (typeof tuitions)[number];
  const columns: RecordColumn<TuitionRow>[] = [
    { key: "jobId", label: "Job ID", place: "head", cell: ({ request }) => <span className="font-mono text-2xs text-j-ink-muted">{jobIdForRequest(request.id)}</span> },
    { key: "class", label: "Class / Level", cell: ({ request }) => <span className="font-bold text-j-ink">{request.classCourse}</span> },
    { key: "subjects", label: "Subjects", wide: true, cellClassName: "max-w-[16rem]", cell: ({ request }) => <span className="text-j-ink-strong">{formatSubjects(request.subjects)}</span> },
    { key: "location", label: "Location", cell: ({ request }) => <span className="text-j-ink-strong">{request.tuitionLocationLabel ?? "Online"}</span> },
    { key: "salary", label: "Salary", cell: ({ request }) => <span className="text-j-ink-strong">{formatSalaryAmount(request.budgetAmount)}</span> },
    { key: "days", label: "Days / Week", cell: ({ request }) => <span className="text-j-ink-strong">{formatDaysPerWeek(request.daysPerWeek)}</span> },
    { key: "status", label: "Status", place: "head", cell: ({ lifecycle }) => <TuitionStatusPill stage={lifecycle.key} label={lifecycle.label} /> },
    { key: "applied", label: "Applied", cell: ({ request }) => <span className="inline-flex rounded-full bg-[#eaf4fd] px-2.5 py-1 text-2xs font-bold tabular-nums text-[#1267c8]">{request.appliedTutorCount ?? 0}</span> },
    {
      key: "applicants", label: "Applicants", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: ({ request }) => <Link href={`/guardian/dashboard/applied-tutors/${request.id}`} aria-label={`Open the applicants of Job ID ${jobIdForRequest(request.id)}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
        <ChevronRight size={16} />
      </Link>,
    },
  ];

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    <RecordTable
      caption="Your tuitions and how many Tutors applied to each"
      columns={columns}
      rows={tuitions}
      rowKey={({ request }) => request.id}
      empty="No live or appointed tuition."
      tableClassName="min-w-[56rem]"
    />
  </div>;
}
