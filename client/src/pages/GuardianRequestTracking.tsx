import { Link, useLocation } from "wouter";
import { formatSalaryAmount } from "@shared/salary-amount";
import { CheckCircle2, ChevronDown, FilePenLine, MapPin, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { GuardianWorkspaceSkeleton, GuardianWorkspaceState } from "@/components/GuardianWorkspaceState";
import { trpc } from "@/lib/trpc";
import JobCard, { DetailsAction } from "@/components/JobCard";
import { PostAnotherRequestButton } from "@/components/PostAnotherRequestButton";
import JobDetailsModal from "@/components/JobDetailsModal";
import { formatPostedDate } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import { buildJobTitle } from "@shared/job-title";

type GuardianRequestStatusTone = "blue" | "amber" | "green" | "slate";
type GuardianLifecycleKey = "pending" | "live" | "appointed" | "confirmed" | "cancelled";
type RequestRecord = {
  id: number; status: string; publicationState?: string | null; tutorId?: string | null; assignedTutorId?: string | null;
  publishedJob?: boolean; appointmentConfirmedAt?: Date | string | null; cancellationReason?: string | null;
  createdAt: Date | string | null; category: string; classCourse: string; subjects: unknown; tuitionType: string; daysPerWeek: number;
  groupCapacity: number | null; packageDurationMonths: number | null; studentCount: number | null; preferredGender: string;
  studentFirstName?: string | null; studentGender?: string | null; addressDetails?: string | null; notes?: string | null;
  budgetAmount: number | null; tuitionLocationLabel?: string | null;
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
function formatBudget(request: Pick<RequestRecord, "budgetAmount">) { return formatSalaryAmount(request.budgetAmount); }
function formatRequestDate(value: Date | string | number | null) { return value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : ""; }
function displayTuitionType(value: string) { return value === "home" ? "Home Tutoring" : value === "online" ? "Online Tutoring" : value === "group" ? "Group Tutoring" : "Package Tutoring"; }
const statusToneClass: Record<GuardianRequestStatusTone, string> = { blue: "bg-blue-50 text-blue-800 ring-blue-700/15", amber: "bg-amber-50 text-amber-800 ring-amber-700/15", green: "bg-emerald-50 text-emerald-800 ring-emerald-700/15", slate: "bg-j-surface-muted text-j-ink-soft ring-j-ink-muted/15" };

function RequestTimeline({ request }: { request: RequestRecord }) {
  const lifecycle = getGuardianRequestLifecycle(request);
  return <ol className="grid gap-2 sm:grid-cols-5" aria-label={`Request #${request.id} status timeline`}>{guardianLifecycleSteps.map((step, index) => {
    const isCurrent = lifecycle.key === step.key;
    const isComplete = lifecycle.key !== "cancelled" && index + 1 < lifecycle.activeIndex;
    const isCancelledEnd = lifecycle.key === "cancelled" && step.key === "cancelled";
    return <li key={step.key} aria-current={isCurrent ? "step" : undefined} className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold ${isCurrent || isCancelledEnd ? "border-[#78c6f2] bg-[#e9f7ff] text-[#126ea9]" : isComplete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-j-border bg-j-surface-sunken text-j-ink-faint"}`}><span className={`grid size-5 shrink-0 place-items-center rounded-full text-2xs ${isCurrent || isCancelledEnd ? "bg-[#1677c8] text-white" : isComplete ? "bg-emerald-600 text-white" : "bg-white text-j-ink-muted ring-1 ring-j-border"}`}>{index + 1}</span>{step.label}</li>;
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
  return <div className="space-y-5 border-t border-j-border px-5 py-6 sm:px-7">
    <RequestTimeline request={request} />
    <div className="grid gap-4 text-sm sm:grid-cols-2"><Detail label="Subjects" value={formatSubjects(request.subjects)} /><Detail label="Tuition type" value={displayTuitionType(request.tuitionType)} /><Detail label="Days per week" value={`${request.daysPerWeek} days`} /><Detail label="Tutor preference" value={request.preferredGender === "any" ? "Any" : request.preferredGender} /><Detail label="Salary" value={formatBudget(request)} />{studentCount ? <Detail label="Number of students" value={studentCount} /> : null}{groupCapacity ? <Detail label="Maximum students" value={groupCapacity} /> : null}{packageDuration ? <Detail label="Package duration" value={packageDuration} /> : null}{request.tuitionLocationLabel ? <Detail label="Tuition location" value={request.tuitionLocationLabel} icon /> : null}</div>
    <section className="rounded-xl border border-[#dceaf2] bg-j-surface-sunken p-4"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#5a819b]">Private student details</p><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{request.studentFirstName ? <Detail label="Student name" value={request.studentFirstName} /> : null}{request.studentGender ? <Detail label="Student gender" value={request.studentGender === "female" ? "Female" : "Male"} /> : null}{request.addressDetails ? <Detail label="Address details" value={request.addressDetails} /> : null}{request.notes ? <Detail label="Additional notes" value={request.notes} /> : null}</div></section>
    {editable ? <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold text-amber-950">You can still update this Pending request</p></div><button type="button" onClick={() => navigate(getGuardianPendingEditDestination(request.id))} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-amber-800"><FilePenLine size={16} /> Edit request</button></div> : null}
    {needsConsent ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-700" size={21} /><div><h3 className="font-extrabold text-emerald-950">A Tutor match is ready for coordination</h3><p className="mt-1 text-sm leading-6 text-emerald-900">Your contact details remain private unless you approve this coordination.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><button type="button" disabled={consentMutation.isPending} onClick={() => consentMutation.mutate({ requestId: request.id, decision: "approved" }, { onSuccess: () => { toast.success("Your contact-coordination consent has been recorded."); void requestsQuery.refetch(); }, onError: error => toast.error(error.message) })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"><CheckCircle2 size={16} /> Approve coordination</button><button type="button" disabled={consentMutation.isPending} onClick={() => consentMutation.mutate({ requestId: request.id, decision: "declined" }, { onSuccess: () => { toast.success("Your response was recorded."); void requestsQuery.refetch(); }, onError: error => toast.error(error.message) })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"><XCircle size={16} /> Decline</button></div></div></div></div> : null}
    {!embedded ? <button type="button" onClick={() => navigate("/guardian/dashboard/posted-jobs")} className="text-sm font-extrabold text-[#1677c8] underline underline-offset-4">Back to Posted jobs</button> : null}
  </div>;
}

function Detail({ label, value, icon = false }: { label: string; value: string; icon?: boolean }) { return <div><p className="text-xs font-bold uppercase tracking-[.12em] text-j-ink-muted">{label}</p><p className="mt-1 flex items-start gap-1.5 font-semibold leading-6 text-j-ink">{icon ? <MapPin className="mt-1 size-4 shrink-0 text-[#1677c8]" /> : null}{value}</p></div>; }

export function GuardianRequestTracking({ embedded = false, detailRequestId }: { embedded?: boolean; detailRequestId?: number }) {
  const requestsQuery = trpc.tutorRequests.mine.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(detailRequestId ?? null);
  const requests = (requestsQuery.data ?? []) as RequestRecord[];
  const counts = useMemo(() => getGuardianStatusCounts(requests), [requests]);
  const orderedRequests = useMemo(() => [...requests].sort((left, right) => { const leftStage = getGuardianRequestLifecycle(left).activeIndex; const rightStage = getGuardianRequestLifecycle(right).activeIndex; return leftStage - rightStage || new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime(); }), [requests]);
  const requestedDetail = detailRequestId ? requests.find(item => item.id === detailRequestId) : null;
  const isPrivateRouteError = Boolean(requestsQuery.error);

  const [activeStage, setActiveStage] = useState<GuardianLifecycleKey>("pending");
  const visibleRequests = useMemo(
    () => orderedRequests.filter(request => getGuardianRequestLifecycle(request).key === activeStage),
    [orderedRequests, activeStage],
  );
  const openRequest = expandedId ? requests.find(item => item.id === expandedId) ?? null : null;

  return <div className={embedded ? "" : "site-page min-h-screen bg-j-surface-sunken"}>{embedded ? null : <SiteHeader />}<main className={embedded ? "w-full" : "shell py-10"}>
    {requestedDetail ? <section aria-label={`Private request #${requestedDetail.id}`} className="overflow-hidden rounded-xl border border-j-border bg-white shadow-sm"><PrivateRequestDetails request={requestedDetail} embedded={false} /></section> : <>
      {/* No page hero: the workspace header already names this screen, and the
          five stages carry the counts that the old summary cards showed. */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#dce9f1]">
        <div role="tablist" aria-label="Request stages" className="flex flex-wrap items-end gap-5">
          {guardianLifecycleSteps.map(step => {
            const selected = step.key === activeStage;
            return <button
              key={step.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => { setActiveStage(step.key); setExpandedId(null); }}
              className={`relative pb-2.5 pt-1.5 text-xs font-semibold transition-colors ${selected ? "font-bold text-[#1267c8]" : "text-j-ink-muted hover:text-[#173d60]"}`}
            >
              {step.label} <span className={`ml-1 tabular-nums ${selected ? "text-[#1267c8]" : "text-j-ink-faint"}`}>{String(counts[step.key]).padStart(2, "0")}</span>
              {selected ? <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-t bg-[#1677e8]" /> : null}
            </button>;
          })}
        </div>
        <PostAnotherRequestButton href="/guardian/dashboard/hire" variant="solid" className="mb-2" />
      </div>

      {requestsQuery.isLoading ? <div className="mt-5"><GuardianWorkspaceSkeleton label="Loading your private tutor requests" /></div> : null}
      {!requestsQuery.isLoading && isPrivateRouteError ? <div className="mt-5"><GuardianWorkspaceState kind="error" title="Private requests are temporarily unavailable" message="Your requests could not be loaded just now. Please try again." onRetry={() => requestsQuery.refetch()} /></div> : null}

      {!requestsQuery.isLoading && !isPrivateRouteError && requests.length === 0
        ? <div className="mt-5"><GuardianWorkspaceState kind="empty" title="No requests yet" message="Post your first tutor request and it will appear here." /></div>
        : null}

      {!requestsQuery.isLoading && !isPrivateRouteError && requests.length > 0 && visibleRequests.length === 0
        ? <p className="mt-6 rounded-xl border border-dashed border-[#c9dce9] bg-white px-4 py-8 text-center text-sm text-j-ink-muted">
            No {guardianLifecycleSteps.find(step => step.key === activeStage)?.label.toLowerCase()} requests. Your other requests are under the stages above.
          </p>
        : null}

      {/* Two to a row, and the grid stretches each card in a row to the height
          of its tallest neighbour, so a long subject list cannot leave the card
          beside it looking clipped. */}
      {visibleRequests.length > 0
        ? <div className="mt-5 grid items-stretch gap-3.5 lg:grid-cols-2">
            {visibleRequests.map(request => {
              const lifecycle = getGuardianRequestLifecycle(request);
              return <JobCard
                key={request.id}
                job={{
                  jobId: jobIdForRequest(request.id),
                  title: buildJobTitle({ category: request.category, classCourse: request.classCourse, studentCount: request.studentCount ?? 1, daysPerWeek: request.daysPerWeek }),
                  postedAt: formatPostedDate(request.createdAt),
                  statusLabel: lifecycle.label,
                  statusTone: lifecycle.key,
                  tuitionType: request.tuitionType,
                  budgetAmount: request.budgetAmount,
                  subjects: request.subjects,
                  locationLabel: request.tuitionLocationLabel ?? null,
                  preferredTutorGender: request.preferredGender,
                }}
                onOpen={() => setExpandedId(request.id)}
                action={<DetailsAction />}
                showMapLink={false}
              />;
            })}
          </div>
        : null}

      {openRequest ? <JobDetailsModal
        job={{
          jobId: jobIdForRequest(openRequest.id),
          title: buildJobTitle({ category: openRequest.category, classCourse: openRequest.classCourse, studentCount: openRequest.studentCount ?? 1, daysPerWeek: openRequest.daysPerWeek }),
          postedAt: formatPostedDate(openRequest.createdAt),
          statusLabel: getGuardianRequestLifecycle(openRequest).label,
          statusTone: getGuardianRequestLifecycle(openRequest).key,
          tuitionType: openRequest.tuitionType,
          budgetAmount: openRequest.budgetAmount,
          subjects: openRequest.subjects,
          locationLabel: openRequest.tuitionLocationLabel ?? null,
          preferredTutorGender: openRequest.preferredGender,
          studentGender: openRequest.studentGender ?? null,
          daysPerWeek: openRequest.daysPerWeek,
          studentCount: openRequest.studentCount,
          notes: openRequest.notes ?? null,
        }}
        onClose={() => setExpandedId(null)}
        showMapLink={false}
        action={<>
          <button type="button" onClick={() => setExpandedId(null)} className="h-8 rounded-lg border border-[#dce9f1] bg-white px-3.5 text-xs font-bold text-[#173d60] hover:bg-[#f1f6fa]">Close</button>
          {/* Only while Pending: once a tuition is Live it is out of the
              Guardian's hands and a coordinator is working on it. */}
          {getGuardianRequestLifecycle(openRequest).key === "pending"
            ? <Link href={getGuardianPendingEditDestination(openRequest.id)} className="inline-flex h-8 items-center rounded-lg bg-[#1677e8] px-4 text-xs font-bold text-white hover:bg-[#1267c8]">Update</Link>
            : null}
        </>}
      /> : null}
    </>}
  </main>{embedded ? null : <SiteFooter />}</div>;
}


export default function GuardianRequestTrackingPage() { return <GuardianRequestTracking />; }
