import { Link, useLocation } from "wouter";
import { CheckCircle2, ChevronDown, FilePenLine, MapPin, Plus, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { GuardianWorkspaceSkeleton, GuardianWorkspaceState } from "@/components/GuardianWorkspaceState";
import { trpc } from "@/lib/trpc";

type GuardianRequestStatusTone = "blue" | "amber" | "green" | "slate";
type GuardianLifecycleKey = "pending" | "live" | "appointed" | "confirmed" | "cancelled";
type RequestRecord = {
  id: number; status: string; publicationState?: string | null; tutorId?: string | null; assignedTutorId?: string | null;
  publishedJob?: boolean; appointmentConfirmedAt?: Date | string | null; cancellationReason?: string | null;
  createdAt: Date | string | null; category: string; classCourse: string; subjects: unknown; tuitionType: string; daysPerWeek: number;
  groupCapacity: number | null; packageDurationMonths: number | null; studentCount: number | null; preferredGender: string;
  studentFirstName?: string | null; studentGender?: string | null; addressDetails?: string | null; notes?: string | null;
  budgetMode: string | null; budgetMinimum: number | null; budgetMaximum: number | null; tuitionLocationLabel?: string | null;
  nextAction?: string | null; contactConsent?: string | null;
};

const guardianLifecycleSteps: Array<{ key: GuardianLifecycleKey; label: string }> = [
  { key: "pending", label: "Pending" }, { key: "live", label: "Live" }, { key: "appointed", label: "Appointed" },
  { key: "confirmed", label: "Confirmed" }, { key: "cancelled", label: "Cancelled" },
];

export function getGuardianRequestLifecycle(input: Pick<RequestRecord, "status" | "publicationState" | "tutorId" | "assignedTutorId" | "publishedJob" | "appointmentConfirmedAt" | "cancellationReason">) {
  const published = input.publishedJob === true || input.publicationState === "published";
  const hasTutor = Boolean(input.tutorId ?? input.assignedTutorId);
  const key: GuardianLifecycleKey = input.status === "closed" || Boolean(input.cancellationReason)
    ? "cancelled"
    : input.appointmentConfirmedAt ? "confirmed"
    : hasTutor ? "appointed"
    : published ? "live"
    : "pending";
  const step = guardianLifecycleSteps.findIndex(item => item.key === key) + 1;
  return { key, label: guardianLifecycleSteps[step - 1].label, activeIndex: step };
}

export function getGuardianStatusCounts(requests: Array<Pick<RequestRecord, "status" | "publicationState" | "tutorId" | "assignedTutorId" | "publishedJob" | "appointmentConfirmedAt" | "cancellationReason">>) {
  const counts: Record<GuardianLifecycleKey, number> = { pending: 0, live: 0, appointed: 0, confirmed: 0, cancelled: 0 };
  requests.forEach(request => { counts[getGuardianRequestLifecycle(request).key] += 1; });
  return counts;
}

export function shouldUseDedicatedGuardianRequestDetails(viewportWidth: number) { return viewportWidth < 640; }

export function getGuardianRequestStatusPresentation(status: string): { label: string; tone: GuardianRequestStatusTone } {
  const lifecycle = getGuardianRequestLifecycle({ status });
  return lifecycle.key === "pending" ? { label: "Pending", tone: "amber" }
    : lifecycle.key === "live" ? { label: "Live", tone: "blue" }
      : lifecycle.key === "appointed" || lifecycle.key === "confirmed" ? { label: lifecycle.label, tone: "green" }
        : { label: "Cancelled", tone: "slate" };
}

export function shouldShowContactConsent(input: { status: string; nextAction?: string | null }) { return input.status === "matched" && input.nextAction === "decide_contact_consent"; }
export function getGuardianGroupCapacityDisplay(input: { tuitionType: string; groupCapacity: number | null }) { return input.tuitionType === "group" && input.groupCapacity ? `${input.groupCapacity} maximum students` : null; }
export function getGuardianPackageDurationDisplay(input: { tuitionType: string; packageDurationMonths: number | null }) { return input.tuitionType === "package" && input.packageDurationMonths ? `${input.packageDurationMonths} month${input.packageDurationMonths === 1 ? "" : "s"}` : null; }
export function getGuardianStudentCountDisplay(input: { tuitionType: string; studentCount: number | null }) { return input.studentCount && input.tuitionType !== "group" ? `${input.studentCount} student${input.studentCount === 1 ? "" : "s"}` : null; }
export function getGuardianPendingEditDestination(requestId: number) { return `/guardian/dashboard/hire?edit=${requestId}`; }

function formatSubjects(value: unknown) { if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").join(", "); if (typeof value !== "string") return "Not specified"; try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").join(", ") : value; } catch { return value; } }
function formatBudget(request: Pick<RequestRecord, "budgetMode" | "budgetMinimum" | "budgetMaximum">) { return request.budgetMode === "discuss" ? "Discuss with coordinator" : request.budgetMinimum !== null && request.budgetMaximum !== null ? `৳${request.budgetMinimum.toLocaleString()} – ৳${request.budgetMaximum.toLocaleString()}` : "Not specified"; }
function formatRequestDate(value: Date | string | number | null) { return value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : ""; }
function displayTuitionType(value: string) { return value === "home" ? "Home Tutoring" : value === "online" ? "Online Tutoring" : value === "group" ? "Group Tutoring" : "Package Tutoring"; }
const statusToneClass: Record<GuardianRequestStatusTone, string> = { blue: "bg-blue-50 text-blue-800 ring-blue-700/15", amber: "bg-amber-50 text-amber-800 ring-amber-700/15", green: "bg-emerald-50 text-emerald-800 ring-emerald-700/15", slate: "bg-slate-100 text-slate-700 ring-slate-500/15" };

function RequestTimeline({ request }: { request: RequestRecord }) {
  const lifecycle = getGuardianRequestLifecycle(request);
  return <ol className="grid gap-2 sm:grid-cols-5" aria-label={`Request #${request.id} status timeline`}>{guardianLifecycleSteps.map((step, index) => {
    const isCurrent = lifecycle.key === step.key;
    const isComplete = lifecycle.key !== "cancelled" && index + 1 < lifecycle.activeIndex;
    const isCancelledEnd = lifecycle.key === "cancelled" && step.key === "cancelled";
    return <li key={step.key} aria-current={isCurrent ? "step" : undefined} className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold ${isCurrent || isCancelledEnd ? "border-[#78c6f2] bg-[#e9f7ff] text-[#126ea9]" : isComplete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-400"}`}><span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] ${isCurrent || isCancelledEnd ? "bg-[#1677c8] text-white" : isComplete ? "bg-emerald-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>{index + 1}</span>{step.label}</li>;
  })}</ol>;
}

function PrivateRequestDetails({ request, embedded }: { request: RequestRecord; embedded: boolean }) {
  const [, navigate] = useLocation();
  const consentMutation = trpc.tutorRequests.decideContactConsent.useMutation();
  const requestsQuery = trpc.tutorRequests.mine.useQuery();
  const lifecycle = getGuardianRequestLifecycle(request);
  const editable = lifecycle.key === "pending" && request.status === "new" && request.publicationState === "submitted";
  const needsConsent = shouldShowContactConsent(request);
  const groupCapacity = getGuardianGroupCapacityDisplay(request); const packageDuration = getGuardianPackageDurationDisplay(request); const studentCount = getGuardianStudentCountDisplay(request);
  return <div className="space-y-5 border-t border-slate-100 px-5 py-6 sm:px-7">
    <RequestTimeline request={request} />
    <div className="grid gap-4 text-sm sm:grid-cols-2"><Detail label="Subjects" value={formatSubjects(request.subjects)} /><Detail label="Tuition type" value={displayTuitionType(request.tuitionType)} /><Detail label="Days per week" value={`${request.daysPerWeek} days`} /><Detail label="Tutor preference" value={request.preferredGender === "any" ? "No preference" : request.preferredGender} /><Detail label="Budget" value={formatBudget(request)} />{studentCount ? <Detail label="Number of students" value={studentCount} /> : null}{groupCapacity ? <Detail label="Maximum students" value={groupCapacity} /> : null}{packageDuration ? <Detail label="Package duration" value={packageDuration} /> : null}{request.tuitionLocationLabel ? <Detail label="Tuition location" value={request.tuitionLocationLabel} icon /> : null}</div>
    <section className="rounded-2xl border border-[#dceaf2] bg-[#f8fcff] p-4"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#5a819b]">Private student details</p><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{request.studentFirstName ? <Detail label="Student name" value={request.studentFirstName} /> : null}{request.studentGender ? <Detail label="Student gender" value={request.studentGender === "female" ? "Female" : "Male"} /> : null}{request.addressDetails ? <Detail label="Address details" value={request.addressDetails} /> : null}{request.notes ? <Detail label="Additional notes" value={request.notes} /> : null}</div><p className="mt-4 text-xs leading-5 text-[#55758b]">This information is visible only to you, authorised Admins, and a formally assigned Tutor. It is never shown on the Job Board.</p></section>
    {editable ? <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold text-amber-950">You can still update this Pending request</p><p className="mt-1 text-sm leading-6 text-amber-900">Edits remain private and are recorded for the coordinator before review begins.</p></div><button type="button" onClick={() => navigate(getGuardianPendingEditDestination(request.id))} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-amber-800"><FilePenLine size={16} /> Edit request</button></div> : null}
    {needsConsent ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-700" size={21} /><div><h3 className="font-extrabold text-emerald-950">A Tutor match is ready for coordination</h3><p className="mt-1 text-sm leading-6 text-emerald-900">Your contact details remain private unless you approve this coordination.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><button type="button" disabled={consentMutation.isPending} onClick={() => consentMutation.mutate({ requestId: request.id, decision: "approved" }, { onSuccess: () => { toast.success("Your contact-coordination consent has been recorded."); void requestsQuery.refetch(); }, onError: error => toast.error(error.message) })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"><CheckCircle2 size={16} /> Approve coordination</button><button type="button" disabled={consentMutation.isPending} onClick={() => consentMutation.mutate({ requestId: request.id, decision: "declined" }, { onSuccess: () => { toast.success("Your response was recorded."); void requestsQuery.refetch(); }, onError: error => toast.error(error.message) })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"><XCircle size={16} /> Decline</button></div></div></div></div> : null}
    {!embedded ? <button type="button" onClick={() => navigate("/guardian/dashboard/posted-jobs")} className="text-sm font-extrabold text-[#1677c8] underline underline-offset-4">Back to Posted jobs</button> : null}
  </div>;
}

function Detail({ label, value, icon = false }: { label: string; value: string; icon?: boolean }) { return <div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">{label}</p><p className="mt-1 flex items-start gap-1.5 font-semibold leading-6 text-slate-900">{icon ? <MapPin className="mt-1 size-4 shrink-0 text-[#1677c8]" /> : null}{value}</p></div>; }

export function GuardianRequestTracking({ embedded = false, detailRequestId }: { embedded?: boolean; detailRequestId?: number }) {
  const requestsQuery = trpc.tutorRequests.mine.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(detailRequestId ?? null);
  const requests = (requestsQuery.data ?? []) as RequestRecord[];
  const counts = useMemo(() => getGuardianStatusCounts(requests), [requests]);
  const orderedRequests = useMemo(() => [...requests].sort((left, right) => { const leftStage = getGuardianRequestLifecycle(left).activeIndex; const rightStage = getGuardianRequestLifecycle(right).activeIndex; return leftStage - rightStage || new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime(); }), [requests]);
  const requestedDetail = detailRequestId ? requests.find(item => item.id === detailRequestId) : null;
  const isPrivateRouteError = Boolean(requestsQuery.error);

  return <div className={embedded ? "" : "site-page min-h-screen bg-slate-50"}>{embedded ? null : <SiteHeader />}<main className={embedded ? "w-full" : "mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14"}>
    {requestedDetail ? <section aria-label={`Private request #${requestedDetail.id}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="bg-[#0e4f85] px-5 py-6 text-white sm:px-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-200">Guardian private request</p><h1 className="mt-2 text-2xl font-black">Request #{requestedDetail.id}</h1><p className="mt-2 text-sm text-blue-100">Submitted {formatRequestDate(requestedDetail.createdAt)} · {getGuardianRequestLifecycle(requestedDetail).label}</p></div><PrivateRequestDetails request={requestedDetail} embedded={embedded} /></section> : <>
      <div className="mb-6 flex flex-col gap-5 rounded-3xl bg-[#0e4f85] p-6 text-white shadow-xl shadow-blue-950/10 sm:flex-row sm:items-end sm:justify-between sm:p-9"><div className="max-w-2xl"><p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-200">Guardian account</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Posted jobs</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Your private requests are shown here. New Pending requests appear first; a published Job Board entry never reveals your private details.</p></div><Link href="/guardian/dashboard/hire" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold !text-[#0e4f85] transition hover:bg-blue-50"><Plus size={17} /> Post another request</Link></div>
      {requestsQuery.isLoading ? <GuardianWorkspaceSkeleton label="Loading your private tutor requests" /> : null}
      {!requestsQuery.isLoading && isPrivateRouteError ? <GuardianWorkspaceState kind="error" title="Private requests are temporarily unavailable" message="Request history is only available from the Guardian account that created it. Please try again securely." onRetry={() => { void requestsQuery.refetch(); }} /> : null}
      {!requestsQuery.isLoading && !isPrivateRouteError && requests.length === 0 ? <div className="space-y-4"><GuardianWorkspaceState kind="empty" title="No tutor requests yet" message="Tell us the student’s learning needs and our coordinator will begin reviewing suitable tutor options." /><div className="text-center"><Link href="/guardian/dashboard/hire" className="inline-flex items-center gap-2 rounded-xl bg-[#1677c8] px-5 py-3 text-sm font-bold text-white hover:bg-[#0e4f85]"><Plus size={17} /> Post a request</Link></div></div> : null}
      {!requestsQuery.isLoading && !isPrivateRouteError && requests.length > 0 ? <div className="space-y-5"><section aria-label="Request status overview" className="grid gap-2 sm:grid-cols-5">{guardianLifecycleSteps.map((step, index) => <div key={step.key} className={`rounded-2xl border p-3 ${index === 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}><p className="text-xs font-bold uppercase tracking-[.1em] text-slate-500">{step.label}</p><p className="mt-1 text-2xl font-black text-slate-950">{counts[step.key]}</p></div>)}</section><div className="space-y-4">{orderedRequests.map(request => { const lifecycle = getGuardianRequestLifecycle(request); const presentation = getGuardianRequestStatusPresentation(request.status); const isExpanded = expandedId === request.id; return <article key={request.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-500">Request #{request.id}</p><span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusToneClass[presentation.tone]}`}>{lifecycle.label}</span></div><h2 className="mt-2 truncate text-lg font-extrabold text-slate-900">{request.category} · {request.classCourse}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{formatSubjects(request.subjects)} · Submitted {formatRequestDate(request.createdAt)}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => setExpandedId(isExpanded ? null : request.id)} aria-expanded={isExpanded} className="hidden items-center justify-center gap-2 rounded-xl border border-[#9ccbe7] bg-white px-4 py-2.5 text-sm font-extrabold text-[#126ea9] hover:bg-[#f2faff] sm:inline-flex">Details <ChevronDown className={`size-4 transition ${isExpanded ? "rotate-180" : ""}`} /></button><Link href={`/guardian/dashboard/posted-jobs/${request.id}`} className="inline-flex items-center justify-center rounded-xl bg-[#1677c8] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#0e4f85] sm:hidden">Details</Link></div></div>{isExpanded ? <PrivateRequestDetails request={request} embedded /> : null}</article>; })}</div></div> : null}
    </>}
  </main>{embedded ? null : <SiteFooter />}</div>;
}

export default function GuardianRequestTrackingPage() { return <GuardianRequestTracking />; }
