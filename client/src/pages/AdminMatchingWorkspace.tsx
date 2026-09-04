import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { formatSalaryAmount } from "@shared/salary-amount";
import { formatInstituteName, formatRequestSource } from "@shared/request-source";
import { MoneyAmountField } from "@/components/MoneyAmountField";
import { RecordIcon } from "@/components/recordIcons";
import { trpc } from "@/lib/trpc";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FilePenLine,
  FileText,
  History,
  Loader2,
  PhoneCall,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Star,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  sanitizeAdminMatchingSavedViewFilters,
  type AdminMatchingSavedViewFilters,
} from "@shared/admin-matching-saved-views";

type AdminRequestStatus = "new" | "reviewing" | "matched" | "closed";
type AdminPublicationState = "submitted" | "reviewing" | "changes_requested" | "approved" | "unpublished" | "published" | "closed";
type TutorInterestReviewStatus = "interested" | "shortlisted" | "declined" | "matched" | "withdrawn";
type AdminStatusFilter = "all" | AdminRequestStatus;
type AdminMatchingFilters = {
  query: string;
  status: AdminStatusFilter;
  lifecycle: "all" | "pending" | "live" | "appointed" | "confirmed" | "cancelled";
  tuitionType: "all" | "home" | "online" | "both" | "group" | "package";
  preferredGender: "all" | "male" | "female" | "any";
  contactConsent: "all" | "not_required" | "pending" | "approved" | "declined";
  subject: string;
  category: string;
  location: string;
  assignmentState: "all" | "assigned" | "unassigned";
  appointmentState: "all" | "confirmed" | "pending";
  cancellationState: "all" | "active" | "cancelled";
  budgetMinimum?: number;
  budgetMaximum?: number;
  createdAfter: string;
  createdBefore: string;
  lastActivityAfter: string;
  lastActivityBefore: string;
  page: number;
  pageSize: number;
};

export type MatchingRequest = {
  id: number;
  status: AdminRequestStatus;
  publicationState: AdminPublicationState;
  tutorId: string | null;
  guardianConfirmedAt: Date | null;
  guardianReconfirmedAt: Date | null;
  appointmentConfirmedAt: Date | null;
  cancellationReason: string | null;
  tuitionType: "home" | "online" | "both" | "group" | "package";
  groupCapacity: number | null;
  packageDurationMonths: number | null;
  studentCount: number | null;
  category: string;
  classCourse: string;
  subjects: string;
  daysPerWeek: number;
  preferredGender: "male" | "female" | "any";
  tuitionLocationLabel: string | null;
  locationText: string;
  budgetAmount: number | null;
  instituteName: string | null;
  heardAboutUs: string | null;
  monthlyBudget: number | null;
  studentFirstName: string | null;
  studentGender: "male" | "female" | null;
  addressDetails: string | null;
  notes: string | null;
  contactConsent: "not_required" | "pending" | "approved" | "declined";
};

export type AdminTutorInterest = {
  interestId: number;
  status: TutorInterestReviewStatus;
  tutorId: string;
  tutorName: string;
  tutorNumber: string | null;
  publicJobId: string;
  jobId: number;
  jobTitle: string;
};

export type AdminGuardianPhotoReview = {
  photoId: number;
  guardianId: string;
  status: "pending_review";
  submittedAt: Date;
  photoUrl: string;
};

type GuardianPhotoRejectionReason =
  | "not_clear_guardian_portrait"
  | "contains_child_or_sensitive_personal_data"
  | "contains_contact_or_promotional_content"
  | "inappropriate_or_unsafe_content"
  | "low_quality_or_unrelated_image";

const guardianPhotoRejectionOptions: Array<{ value: GuardianPhotoRejectionReason; label: string }> = [
  { value: "not_clear_guardian_portrait", label: "Not a clear Guardian portrait" },
  { value: "contains_child_or_sensitive_personal_data", label: "Contains a child or sensitive personal data" },
  { value: "contains_contact_or_promotional_content", label: "Contains contact details or promotional content" },
  { value: "inappropriate_or_unsafe_content", label: "Inappropriate or unsafe content" },
  { value: "low_quality_or_unrelated_image", label: "Low-quality or unrelated image" },
];

type PublicationAction = "verify" | "guardian_confirmed" | "guardian_reconfirmed" | "approve" | "publish" | "extend_expiry" | "unpublish";

const initialFilters: AdminMatchingFilters = {
  query: "",
  status: "all",
  lifecycle: "all",
  tuitionType: "all",
  preferredGender: "all",
  contactConsent: "all",
  subject: "",
  category: "",
  location: "",
  assignmentState: "all",
  appointmentState: "all",
  cancellationState: "all",
  createdAfter: "",
  createdBefore: "",
  lastActivityAfter: "",
  lastActivityBefore: "",
  page: 1,
  pageSize: 20,
};

export function buildAdminMatchingQuery(input: Partial<AdminMatchingFilters>) {
  return {
    ...initialFilters,
    ...input,
    query: (input.query ?? initialFilters.query).trim(),
    page: 1,
  };
}

/** Persists only the allowlisted, serializable matching filter state — never page position or request data. */
export function serializeAdminMatchingSavedViewFilters(input: Partial<AdminMatchingFilters>) {
  const { page: _page, ...filters } = input;
  return sanitizeAdminMatchingSavedViewFilters(filters);
}

export function formatAdminTuitionType(type: MatchingRequest["tuitionType"]) {
  return type === "home" ? "Home Tutoring" : type === "online" ? "Online Tutoring" : type === "group" ? "Group Tutoring" : type === "package" ? "Package Tutoring" : "Home and Online Tutoring";
}

export function getAdminGroupCapacityDisplay(request: Pick<MatchingRequest, "tuitionType" | "groupCapacity">) {
  return request.tuitionType === "group" && request.groupCapacity ? String(request.groupCapacity) : null;
}

export function getAdminPackageDurationDisplay(request: Pick<MatchingRequest, "tuitionType" | "packageDurationMonths">) {
  if (request.tuitionType !== "package" || !request.packageDurationMonths) return null;
  return `${request.packageDurationMonths} month${request.packageDurationMonths === 1 ? "" : "s"}`;
}

export function getAdminStudentCountDisplay(request: Pick<MatchingRequest, "tuitionType" | "studentCount">) {
  return request.tuitionType === "group" || !request.studentCount ? null : String(request.studentCount);
}

export function getAdminRequestStatusPresentation(status: AdminRequestStatus) {
  const presentations = {
    new: { label: "New", tone: "sky", className: "bg-sky-50 text-sky-700 ring-sky-200" },
    reviewing: { label: "Reviewing", tone: "amber", className: "bg-amber-50 text-amber-800 ring-amber-200" },
    matched: { label: "Matched", tone: "emerald", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
    closed: { label: "Closed", tone: "slate", className: "bg-j-surface-muted text-j-ink-soft ring-j-border" },
  } as const;
  return presentations[status];
}

export function getAdminPublicationStatePresentation(state: AdminPublicationState) {
  const presentations = {
    submitted: { label: "Submitted", className: "bg-j-surface-muted text-j-ink-soft ring-j-border" },
    reviewing: { label: "Verification in progress", className: "bg-amber-50 text-amber-800 ring-amber-200" },
    changes_requested: { label: "Guardian follow-up", className: "bg-orange-50 text-orange-800 ring-orange-200" },
    approved: { label: "Approved for Job Board", className: "bg-sky-50 text-sky-800 ring-sky-200" },
    unpublished: { label: "Unpublished", className: "bg-j-surface-muted text-j-ink-soft ring-j-border" },
    published: { label: "Published", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
    closed: { label: "Closed", className: "bg-j-surface-muted text-j-ink-soft ring-j-border" },
  } as const;
  return presentations[state];
}

export function getAdminPublicationActions(input: { state: AdminPublicationState; guardianConfirmed: boolean; guardianReconfirmed: boolean }) {
  const actions: PublicationAction[] = [];
  if (input.state === "submitted" || input.state === "changes_requested") actions.push("verify");
  if (input.state === "reviewing" && !input.guardianConfirmed) actions.push("guardian_confirmed");
  if (input.state === "reviewing" && input.guardianConfirmed) actions.push("approve");
  if ((input.state === "approved" || input.state === "unpublished") && input.guardianConfirmed) actions.push("publish");
  if (input.state === "published" && !input.guardianReconfirmed) actions.push("guardian_reconfirmed");
  if (input.state === "published" && input.guardianReconfirmed) actions.push("extend_expiry");
  if (input.state === "published") actions.push("unpublish");
  return actions;
}

function formatSubjects(subjects: string) {
  try {
    const parsed = JSON.parse(subjects);
    return Array.isArray(parsed) ? parsed.join(", ") : subjects;
  } catch {
    return subjects;
  }
}

function subjectsForEdit(subjects: string) {
  try {
    const parsed = JSON.parse(subjects);
    return Array.isArray(parsed) ? parsed.join(", ") : subjects;
  } catch {
    return subjects;
  }
}

function formatBudget(request: Pick<MatchingRequest, "budgetAmount">) {
  return formatSalaryAmount(request.budgetAmount);
}

function formatEventTime(value: Date | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

function PublicationAuditTrail({ requestId }: { requestId: number }) {
  const [open, setOpen] = useState(false);
  const input = useMemo(() => ({ requestId }), [requestId]);
  const events = trpc.admin.listTutorRequestPublicationEvents.useQuery(input, { enabled: open });
  return <details className="rounded-xl border border-j-border bg-white p-3" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-j-ink-soft"><History className="h-4 w-4 text-j-accent" /> Audit history</summary>
    {!open ? null : events.isLoading ? <p className="mt-3 text-xs text-j-ink-muted">Loading recorded operations…</p> : events.isError ? <p className="mt-3 text-xs text-red-700">Audit history could not be loaded.</p> : events.data?.length ? <ol className="mt-3 space-y-2 border-l border-j-border pl-3">{events.data.map(event => <li key={event.id} className="text-xs leading-5 text-j-ink-soft"><strong className="capitalize text-j-ink-strong">{event.action.replaceAll("_", " ")}</strong> · {event.previousState} → {event.nextState}<span className="block text-j-ink-muted">{formatEventTime(event.createdAt)} · safe before/after snapshot recorded</span>{event.reason ? <span className="block text-j-ink-muted">{event.reason}</span> : null}</li>)}</ol> : <p className="mt-3 text-xs text-j-ink-muted">No verification or publication operation has been recorded yet.</p>}
  </details>;
}

function AssignmentNotes({ requestId }: { requestId: number }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<"matching" | "guardian_contact" | "tutor_follow_up" | "internal_risk">("matching");
  const [body, setBody] = useState("");
  const utils = trpc.useUtils();
  const notes = trpc.admin.listTutorRequestAssignmentNotes.useQuery({ requestId }, { enabled: open });
  const addNote = trpc.admin.addTutorRequestAssignmentNote.useMutation({
    onSuccess: () => {
      setBody("");
      void utils.admin.listTutorRequestAssignmentNotes.invalidate({ requestId });
      void utils.admin.listMatchingRequests.invalidate();
    },
  });
  const label = category === "guardian_contact" ? "Guardian contact" : category === "tutor_follow_up" ? "Tutor follow-up" : category === "internal_risk" ? "Internal risk" : "Matching";
  return <details className="rounded-xl border border-violet-100 bg-white p-3" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-j-ink-soft"><FilePenLine className="h-4 w-4 text-violet-700" /> Assignment notes</summary>
    {!open ? null : <div className="mt-3 space-y-3">
      <p className="text-xs leading-5 text-j-ink-muted">Private Admin timeline. Entries remain in history; correct an entry with a new follow-up note.</p>
      {notes.isLoading ? <p className="text-xs text-j-ink-muted">Loading assignment notes…</p> : notes.isError ? <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-800">Assignment notes could not be loaded.</p> : notes.data?.length ? <ol className="space-y-2 border-l border-violet-100 pl-3">{notes.data.map(note => <li key={note.id} className="rounded-lg bg-violet-50/70 p-2 text-xs leading-5 text-j-ink-soft"><span className="font-semibold text-violet-800">{note.category.replaceAll("_", " ")}</span><span className="block whitespace-pre-wrap">{note.body}</span><span className="block text-j-ink-muted">{formatEventTime(note.createdAt)}</span></li>)}</ol> : <p className="rounded-lg bg-j-surface-sunken p-2 text-xs text-j-ink-muted">No assignment notes yet.</p>}
      {addNote.isError ? <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-800">{addNote.error.message}</p> : null}
      <form onSubmit={event => { event.preventDefault(); if (body.trim()) addNote.mutate({ requestId, category, body: body.trim() }); }} className="space-y-2 rounded-xl border border-violet-100 bg-violet-50/50 p-3">
        <div className="flex items-center justify-between gap-2"><label className="text-xs font-semibold text-j-ink-soft" htmlFor={`note-category-${requestId}`}>Category</label><select id={`note-category-${requestId}`} value={category} onChange={event => setCategory(event.target.value as typeof category)} className="h-9 rounded-lg border border-j-border bg-white px-2 text-xs text-j-ink-strong"><option value="matching">Matching</option><option value="guardian_contact">Guardian contact</option><option value="tutor_follow_up">Tutor follow-up</option><option value="internal_risk">Internal risk</option></select></div>
        <label className="sr-only" htmlFor={`assignment-note-${requestId}`}>{label} note</label><textarea id={`assignment-note-${requestId}`} value={body} onChange={event => setBody(event.target.value)} maxLength={1000} placeholder="Add a private operational note" className="min-h-20 w-full rounded-lg border border-j-border bg-white p-2 text-sm text-j-ink placeholder:text-j-ink-faint" />
        <button type="submit" disabled={!body.trim() || addNote.isPending} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-3 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"><FilePenLine className="h-3.5 w-3.5" /> {addNote.isPending ? "Saving note…" : "Add private note"}</button>
      </form>
    </div>}
  </details>;
}

function RequestLifecycleControls({ request, busy }: {
  request: MatchingRequest;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();
  const confirmAppointment = trpc.admin.confirmTutorRequestAppointment.useMutation({ onSuccess: () => void utils.admin.listMatchingRequests.invalidate() });
  const cancelRequest = trpc.admin.cancelTutorRequest.useMutation({ onSuccess: () => void utils.admin.listMatchingRequests.invalidate() });
  const lifecycleBusy = busy || confirmAppointment.isPending || cancelRequest.isPending;
  const canConfirm = request.status === "matched" && Boolean(request.tutorId) && !request.appointmentConfirmedAt;
  const canCancel = request.status !== "closed";
  return <section aria-label={`Lifecycle actions for request ${request.id}`} className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
    <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700">Guardian request lifecycle</p></div>
    {request.appointmentConfirmedAt ? <p className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white p-2.5 text-xs font-semibold text-emerald-800"><BadgeCheck className="h-4 w-4" /> Guardian and Tutor confirmation recorded</p> : null}
    {confirmAppointment.isError || cancelRequest.isError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs leading-5 text-red-800">{confirmAppointment.error?.message ?? cancelRequest.error?.message}</p> : null}
    {canConfirm ? <button type="button" disabled={lifecycleBusy} onClick={() => confirmAppointment.mutate({ requestId: request.id })} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><BadgeCheck className="h-4 w-4" /> Confirm Guardian and Tutor appointment</button> : null}
    {request.cancellationReason ? <p className="rounded-xl border border-j-border bg-white p-2.5 text-xs leading-5 text-j-ink-soft"><strong>Closure reason:</strong> {request.cancellationReason}</p> : null}
    {canCancel ? <div className="rounded-xl border border-violet-100 bg-white p-3"><label className="block text-xs font-semibold text-j-ink-soft" htmlFor={`cancel-reason-${request.id}`}>Cancellation reason<textarea id={`cancel-reason-${request.id}`} aria-label="Cancellation reason" value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={280} placeholder="Explain why this request is being closed" className="mt-1.5 min-h-20 w-full rounded-lg border border-j-border p-2 text-sm text-j-ink placeholder:text-j-ink-faint" /></label><button type="button" disabled={lifecycleBusy || reason.trim().length < 3} onClick={() => cancelRequest.mutate({ requestId: request.id, reason: reason.trim() })} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"><XCircle className="h-4 w-4" /> Cancel request</button></div> : null}
  </section>;
}

function ConfirmationLetterControls({ request, busy }: { request: MatchingRequest; busy: boolean }) {
  const [letterId, setLetterId] = useState<number | null>(null);
  const [agreedStartDate, setAgreedStartDate] = useState("");
  const [agreedFeeMinimum, setAgreedFeeMinimum] = useState("");
  const [agreedFeeMaximum, setAgreedFeeMaximum] = useState("");
  const utils = trpc.useUtils();
  const createDraft = trpc.admin.createConfirmationLetterDraft.useMutation({
    onSuccess: result => {
      if (result.letterId) setLetterId(result.letterId);
      void utils.admin.listMatchingRequests.invalidate();
    },
  });
  const issueLetter = trpc.admin.issueConfirmationLetter.useMutation({
    onSuccess: () => {
      setLetterId(null);
      setAgreedStartDate("");
      setAgreedFeeMinimum("");
      setAgreedFeeMaximum("");
      void utils.admin.listMatchingRequests.invalidate();
    },
  });
  const eligible = request.status === "matched" && Boolean(request.tutorId) && Boolean(request.appointmentConfirmedAt) && !request.cancellationReason;
  const busyState = busy || createDraft.isPending || issueLetter.isPending;
  const feeMinimum = Number(agreedFeeMinimum);
  const feeMaximum = Number(agreedFeeMaximum);
  const canIssue = Boolean(letterId && agreedStartDate && agreedFeeMinimum && agreedFeeMaximum && Number.isFinite(feeMinimum) && Number.isFinite(feeMaximum) && feeMaximum >= feeMinimum);
  if (!eligible) return null;
  return <section aria-label={`Confirmation letter for request ${request.id}`} className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
    <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">Confirmation Letter</p><p className="mt-1 text-xs leading-5 text-j-ink-soft">Create a bilingual draft only after the Guardian and assigned Tutor agreement is recorded. Issuance is final and creates private dashboard copies.</p></div>
    {createDraft.isError || issueLetter.isError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs leading-5 text-red-800">{createDraft.error?.message ?? issueLetter.error?.message}</p> : null}
    {!letterId ? <button type="button" disabled={busyState} onClick={() => createDraft.mutate({ requestId: request.id })} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"><FileText className="h-4 w-4" /> {createDraft.isPending ? "Creating draft…" : "Create bilingual letter draft"}</button> : <form className="space-y-2 rounded-xl border border-emerald-100 bg-white p-3" onSubmit={event => { event.preventDefault(); if (canIssue && letterId) issueLetter.mutate({ letterId, agreedStartDate, agreedFeeMinimum: feeMinimum, agreedFeeMaximum: feeMaximum }); }}>
      <p className="text-xs font-semibold text-emerald-800">Draft ready for Admin review</p>
      <label className="block text-xs font-medium text-j-ink-soft" htmlFor={`letter-start-date-${request.id}`}>Agreed start date<input id={`letter-start-date-${request.id}`} type="date" required value={agreedStartDate} onChange={event => setAgreedStartDate(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-j-border px-2 text-sm text-j-ink" /></label>
      <div className="grid grid-cols-2 gap-2"><label className="block text-xs font-medium text-j-ink-soft" htmlFor={`letter-fee-minimum-${request.id}`}>Agreed fee from<input id={`letter-fee-minimum-${request.id}`} type="number" min="0" required value={agreedFeeMinimum} onChange={event => setAgreedFeeMinimum(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-j-border px-2 text-sm text-j-ink" /></label><label className="block text-xs font-medium text-j-ink-soft" htmlFor={`letter-fee-maximum-${request.id}`}>Agreed fee to<input id={`letter-fee-maximum-${request.id}`} type="number" min="0" required value={agreedFeeMaximum} onChange={event => setAgreedFeeMaximum(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-j-border px-2 text-sm text-j-ink" /></label></div>
      <p className="text-xs leading-5 text-j-ink-muted">The issued letter excludes address details, Guardian notes, direct contacts, and student identity. It cannot be edited after issue.</p>
      <button type="submit" disabled={!canIssue || busyState} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><ShieldCheck className="h-4 w-4" /> {issueLetter.isPending ? "Issuing letter…" : "Review and issue private letter"}</button>
    </form>}
  </section>;
}

export function PublicationControls({ request, busy, onAction, onEdit }: {
  request: MatchingRequest;
  busy: boolean;
  onAction: (action: PublicationAction) => void;
  onEdit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const actions = getAdminPublicationActions({ state: request.publicationState, guardianConfirmed: Boolean(request.guardianConfirmedAt), guardianReconfirmed: Boolean(request.guardianReconfirmedAt) });
  const state = getAdminPublicationStatePresentation(request.publicationState);
  return <section aria-label={`Job Board verification for request ${request.id}`} className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
    {request.studentGender || request.studentCount || request.addressDetails ? <div className="rounded-xl border border-j-border bg-white p-3 text-sm text-j-ink-soft"><p className="text-xs font-bold uppercase tracking-[0.12em] text-j-ink-muted">Private matching details</p><dl className="mt-2 grid gap-2"><div><dt className="inline-flex items-center gap-1.5 text-xs font-medium text-j-ink-muted"><RecordIcon name="students" size={12} className="text-j-ink-faint" />Number of students</dt><dd className="text-j-ink-strong">{getAdminStudentCountDisplay(request) ?? "Not applicable for Group Tutoring"}</dd></div>{request.studentGender ? <div><dt className="inline-flex items-center gap-1.5 text-xs font-medium text-j-ink-muted"><RecordIcon name="studentGender" size={12} className="text-j-ink-faint" />Student gender</dt><dd className="text-j-ink-strong">{request.studentGender === "female" ? "Female" : "Male"}</dd></div> : null}{request.addressDetails ? <div><dt className="inline-flex items-center gap-1.5 text-xs font-medium text-j-ink-muted"><RecordIcon name="location" size={12} className="text-j-ink-faint" />Address details</dt><dd className="leading-5 text-j-ink-strong">{request.addressDetails}</dd></div> : null}</dl></div> : null}
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-j-ink-muted">Job Board verification</p><span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${state.className}`}>{state.label}</span></div>{request.publicationState === "published" && request.guardianReconfirmedAt ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><BadgeCheck className="h-4 w-4" /> Extension call recorded</span> : request.guardianConfirmedAt ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><BadgeCheck className="h-4 w-4" /> Call recorded</span> : null}</div>
    {request.publicationState === "reviewing" && !request.guardianConfirmedAt ? <p className="flex gap-2 text-xs leading-5 text-amber-800"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> Call the Guardian and confirm the current request before approval or publication.</p> : null}
    <div className="grid gap-2">
      {actions.includes("verify") ? <button type="button" disabled={busy} onClick={() => onAction("verify")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Start verification</button> : null}
      {actions.includes("guardian_confirmed") ? <button type="button" disabled={busy} onClick={() => onAction("guardian_confirmed")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-j-accent px-3 text-sm font-semibold text-white hover:bg-j-accent-hover disabled:opacity-50"><PhoneCall className="h-4 w-4" /> Record Guardian call confirmation</button> : null}
      {actions.includes("approve") ? <button type="button" disabled={busy} onClick={() => onAction("approve")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"><BadgeCheck className="h-4 w-4" /> Approve for Job Board</button> : null}
      {actions.includes("publish") ? <button type="button" disabled={busy} onClick={() => onAction("publish")} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><Send className="h-4 w-4" /> Publish to Job Board</button> : null}
      {actions.includes("guardian_reconfirmed") ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs leading-5 text-amber-900">Published jobs expire after 14 days. Call the Guardian to confirm that this tuition is still available before extending it.</p><button type="button" disabled={busy} onClick={() => onAction("guardian_reconfirmed")} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"><PhoneCall className="h-4 w-4" /> Record extension call</button></div> : null}
      {actions.includes("extend_expiry") ? <button type="button" disabled={busy} onClick={() => onAction("extend_expiry")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Extend visibility for 14 days</button> : null}
      {actions.includes("unpublish") ? <button type="button" disabled={busy} onClick={() => onAction("unpublish")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-j-border bg-white px-3 text-sm font-semibold text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Unpublish</button> : null}
    </div>
    {request.publicationState === "reviewing" ? <details className="rounded-xl border border-sky-100 bg-white p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-j-ink-soft"><FilePenLine className="h-4 w-4 text-j-accent" /> Edit job-facing details</summary><p className="mt-2 text-xs leading-5 text-j-ink-muted">Changes clear the recorded Guardian confirmation. City and area are intentionally Guardian-controlled and cannot be altered here.</p><form className="mt-3 grid gap-2" onSubmit={onEdit}><label className="text-xs font-medium text-j-ink-soft">Category<input name="category" required defaultValue={request.category} className="mt-1 h-10 w-full rounded-lg border border-j-border px-2 text-sm" /></label><label className="text-xs font-medium text-j-ink-soft">Class / course<input name="classCourse" required defaultValue={request.classCourse} className="mt-1 h-10 w-full rounded-lg border border-j-border px-2 text-sm" /></label><label className="text-xs font-medium text-j-ink-soft">Subjects, separated by commas<input name="subjects" required defaultValue={subjectsForEdit(request.subjects)} className="mt-1 h-10 w-full rounded-lg border border-j-border px-2 text-sm" /></label><div className="grid grid-cols-2 gap-2"><label className="text-xs font-medium text-j-ink-soft">Days / week<input name="daysPerWeek" type="number" min="1" max="7" required defaultValue={request.daysPerWeek} className="mt-1 h-10 w-full rounded-lg border border-j-border px-2 text-sm" /></label><label className="text-xs font-medium text-j-ink-soft">Tutor preference<select name="preferredGender" defaultValue={request.preferredGender} className="mt-1 h-10 w-full rounded-lg border border-j-border px-2 text-sm"><option value="any">Any</option><option value="female">Female</option><option value="male">Male</option></select></label></div><button type="submit" disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50"><FilePenLine className="h-4 w-4" /> Save approved edit</button></form></details> : null}
    <AssignmentNotes requestId={request.id} />
    <RequestLifecycleControls request={request} busy={busy} />
    <ConfirmationLetterControls request={request} busy={busy} />
  </section>;
}

function getTutorInterestReviewPresentation(status: TutorInterestReviewStatus) {
  const presentations = {
    interested: { label: "Awaiting review", className: "bg-sky-50 text-sky-800 ring-sky-200" },
    shortlisted: { label: "Shortlisted", className: "bg-amber-50 text-amber-800 ring-amber-200" },
    declined: { label: "Declined", className: "bg-j-surface-muted text-j-ink-soft ring-j-border" },
    matched: { label: "Matched", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
    withdrawn: { label: "Withdrawn", className: "bg-j-surface-muted text-j-ink-soft ring-j-border" },
  } as const;
  return presentations[status];
}

export function TutorInterestQueue({ interests, isLoading, isError, isSaving, onReview }: {
  interests: AdminTutorInterest[];
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  onReview: (interestId: number, status: Extract<TutorInterestReviewStatus, "shortlisted" | "declined" | "matched">) => void;
}) {
  return <section role="region" aria-label="Tutor Apply review queue" className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-j-accent"><UserCheck className="h-4 w-4" /> Tutor Apply</div><h2 className="mt-1 text-lg font-bold text-j-ink">Tutor applications awaiting coordination</h2></div><span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-800">{isLoading ? "—" : interests.filter(interest => interest.status === "interested").length} awaiting</span></div>
    {isLoading ? <p className="mt-4 flex items-center gap-2 rounded-xl bg-j-surface-sunken p-4 text-sm text-j-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading Tutor applications…</p> : null}
    {isError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Tutor applications could not be loaded. Please refresh before making a matching decision.</p> : null}
    {!isLoading && !isError && interests.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-j-field-border bg-j-surface-sunken p-4 text-sm text-j-ink-soft">No Tutor applications have been received for published tuition opportunities yet.</p> : null}
    {!isLoading && !isError && interests.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{interests.map(interest => {
      const presentation = getTutorInterestReviewPresentation(interest.status);
      const canReview = interest.status === "interested" || interest.status === "shortlisted";
      return <article key={interest.interestId} className="rounded-xl border border-j-border bg-j-surface-sunken/60 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-j-ink">{interest.tutorName}</p><p className="mt-0.5 text-xs text-j-ink-muted">Tutor ID {interest.tutorId} · Job {interest.publicJobId}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${presentation.className}`}>{presentation.label}</span></div><p className="mt-3 text-sm text-j-ink-soft">Job: <strong>{interest.jobTitle}</strong></p><div className="mt-3 rounded-xl border border-sky-100 bg-white p-3"><p className="text-xs font-semibold uppercase tracking-wide text-j-ink-muted">Private Tutor contact</p>{interest.tutorNumber ? <a href={`tel:${interest.tutorNumber}`} aria-label={`Call ${interest.tutorName}`} className="mt-1 inline-flex font-semibold text-j-accent underline underline-offset-2 hover:text-[#0d5da4]">{interest.tutorNumber}</a> : <p className="mt-1 text-sm text-j-ink-soft">No phone number available; review the Tutor profile before contacting.</p>}</div>{canReview ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{interest.status === "interested" ? <button type="button" disabled={isSaving} onClick={() => onReview(interest.interestId, "shortlisted")} className="inline-flex h-10 items-center justify-center rounded-xl bg-j-accent px-3 text-sm font-semibold text-white hover:bg-j-accent-hover disabled:opacity-50">Shortlist Tutor</button> : <button type="button" disabled={isSaving} onClick={() => onReview(interest.interestId, "matched")} className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Mark matched</button>}<button type="button" disabled={isSaving} onClick={() => onReview(interest.interestId, "declined")} className="inline-flex h-10 items-center justify-center rounded-xl border border-j-field-border bg-white px-3 text-sm font-semibold text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-50">Decline application</button></div> : <p className="mt-3 text-xs leading-5 text-j-ink-muted">This application is closed for further review changes.</p>}</article>;
    })}</div> : null}
  </section>;
}

export function GuardianPhotoModerationQueue({ photos, isLoading, isError, isSaving, onReview }: {
  photos: AdminGuardianPhotoReview[];
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  onReview: (photoId: number, nextStatus: "approved" | "rejected", rejectionReason?: GuardianPhotoRejectionReason, moderationNote?: string) => void;
}) {
  const [rejections, setRejections] = useState<Record<number, { reason: GuardianPhotoRejectionReason; note: string }>>({});
  const getRejection = (photoId: number) => rejections[photoId] ?? { reason: "not_clear_guardian_portrait" as const, note: "" };
  const setRejection = (photoId: number, next: Partial<{ reason: GuardianPhotoRejectionReason; note: string }>) => {
    setRejections(current => ({ ...current, [photoId]: { ...getRejection(photoId), ...next } }));
  };
  return <section role="region" aria-label="Guardian photo moderation queue" className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700"><ShieldCheck className="h-4 w-4" /> Guardian photo moderation</div><h2 className="mt-1 text-lg font-bold text-j-ink">Guardian photos awaiting review</h2></div><span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-800">{isLoading ? "—" : photos.length} awaiting</span></div>
    {isLoading ? <p className="mt-4 flex items-center gap-2 rounded-xl bg-j-surface-sunken p-4 text-sm text-j-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading Guardian photo review queue…</p> : null}
    {isError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Guardian photos could not be loaded. Refresh before making a moderation decision.</p> : null}
    {!isLoading && !isError && photos.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-j-field-border bg-j-surface-sunken p-4 text-sm text-j-ink-soft">No Guardian profile photos are awaiting review.</p> : null}
    {!isLoading && !isError && photos.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{photos.map(photo => {
      const rejection = getRejection(photo.photoId);
      return <article key={photo.photoId} className="overflow-hidden rounded-xl border border-j-border bg-j-surface-sunken/60"><img src={photo.photoUrl} alt={`Guardian ${photo.guardianId} profile photo awaiting review`} className="h-52 w-full bg-j-surface-muted object-contain" referrerPolicy="no-referrer" /><div className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-j-ink">{photo.guardianId}</p><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Pending review</span></div><p className="mt-1 text-xs text-j-ink-muted">Submitted {new Date(photo.submittedAt).toLocaleString()}</p><div className="mt-4 grid gap-3"><label className="text-xs font-semibold text-j-ink-soft">Rejection reason for {photo.guardianId}<select value={rejection.reason} onChange={event => setRejection(photo.photoId, { reason: event.target.value as GuardianPhotoRejectionReason })} className="mt-1.5 h-10 w-full rounded-xl border border-j-border bg-white px-3 text-sm text-j-ink-strong"><option value="not_clear_guardian_portrait">Select if rejecting</option>{guardianPhotoRejectionOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="text-xs font-semibold text-j-ink-soft">Optional note for {photo.guardianId}<textarea value={rejection.note} onChange={event => setRejection(photo.photoId, { note: event.target.value })} maxLength={280} placeholder="A short, practical instruction for the Guardian" className="mt-1.5 min-h-20 w-full rounded-xl border border-j-border bg-white p-3 text-sm text-j-ink-strong" /></label><div className="grid gap-2 sm:grid-cols-2"><button type="button" disabled={isSaving} onClick={() => onReview(photo.photoId, "approved")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><BadgeCheck className="h-4 w-4" /> Approve photo</button><button type="button" disabled={isSaving} onClick={() => onReview(photo.photoId, "rejected", rejection.reason, rejection.note.trim() || undefined)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><XCircle className="h-4 w-4" /> Reject photo</button></div></div></div></article>;
    })}</div> : null}
  </section>;
}

export type AdminMatchingSavedView = {
  id: number;
  name: string;
  filters: AdminMatchingSavedViewFilters;
  isDefault: boolean;
};

export function getDefaultAdminMatchingSavedView(views: AdminMatchingSavedView[]) {
  return views.find(view => view.isDefault) ?? null;
}

export function shouldAutoApplyDefaultSavedView({
  hasHandledInitialDefaultView,
  hasExplicitSavedViewIntent,
  isLoading,
  isError,
}: {
  hasHandledInitialDefaultView: boolean;
  hasExplicitSavedViewIntent: boolean;
  isLoading: boolean;
  isError: boolean;
}) {
  return !hasHandledInitialDefaultView && !hasExplicitSavedViewIntent && !isLoading && !isError;
}

export function AdminMatchingSavedViews({
  views,
  isLoading,
  isError,
  isSaving,
  errorMessage,
  selectedViewId,
  onApply,
  onCreate,
  onDelete,
  onSetDefault,
  onClearDefault,
  onRename,
}: {
  views: AdminMatchingSavedView[];
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  errorMessage?: string;
  selectedViewId: number | null;
  onApply: (view: AdminMatchingSavedView) => void;
  onCreate: (name: string) => void;
  onDelete: (savedViewId: number) => void;
  onSetDefault: (savedViewId: number) => void;
  onClearDefault: () => void;
  onRename: (savedViewId: number, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [editingViewId, setEditingViewId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");
  const selectedView = views.find(view => view.id === selectedViewId) ?? null;
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSaving) return;
    onCreate(trimmedName);
    setName("");
  };
  const startRename = (view: AdminMatchingSavedView) => {
    setPendingDeleteId(null);
    setEditingViewId(view.id);
    setRenameName(view.name);
  };
  const submitRename = (event: React.FormEvent<HTMLFormElement>, view: AdminMatchingSavedView) => {
    event.preventDefault();
    const trimmedName = renameName.trim();
    if (!trimmedName || isSaving) return;
    onRename(view.id, trimmedName);
    setEditingViewId(null);
  };

  return <section aria-label="Matching Saved Views" className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-2xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800"><Save className="h-4 w-4" /> Personal workspace</div><h2 className="mt-1 font-semibold text-j-ink">Saved Views</h2></div>
      <form onSubmit={submit} className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-md">
        <label className="text-xs font-semibold text-j-ink-soft">Name this filter setup<input aria-label="Saved View name" value={name} onChange={event => setName(event.target.value)} maxLength={80} required placeholder="e.g. Pending Mirpur" className="mt-1.5 h-11 w-full rounded-xl border border-j-border bg-white px-3 text-sm font-normal text-j-ink-strong outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100" /></label>
        <button type="submit" disabled={isSaving || !name.trim()} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" /> {isSaving ? "Saving…" : "Save filters"}</button>
      </form>
    </div>
    {isLoading ? <p className="mt-4 flex items-center gap-2 rounded-xl bg-white/80 p-3 text-sm text-j-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading your Saved Views…</p> : null}
    {isError ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">Your Saved Views could not be loaded. Refresh before applying or deleting a filter setup.</p> : null}
    {errorMessage ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</p> : null}
    {!isLoading && !isError && views.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-cyan-200 bg-white/80 p-3 text-sm text-j-ink-soft">No Saved Views yet.</p> : null}
    {selectedView ? <p aria-live="polite" className="mt-4 rounded-xl border border-cyan-100 bg-white/80 px-3 py-2 text-sm text-j-ink-soft">Showing: <strong>{selectedView.name}</strong>{selectedView.isDefault ? <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"><Star className="h-3 w-3 fill-current" /> Default</span> : null}</p> : null}
    {!isLoading && !isError && views.length ? <div className="mt-4 flex flex-wrap gap-2">{views.map(view => {
      const confirmingDelete = pendingDeleteId === view.id;
      const isEditing = editingViewId === view.id;
      const isSelected = selectedViewId === view.id;
      return <div key={view.id} className={`flex max-w-full flex-wrap items-center rounded-xl border bg-white p-1 shadow-sm ${isSelected ? "border-cyan-500 ring-2 ring-cyan-100" : "border-j-border"}`}>
        {isEditing ? <form onSubmit={event => submitRename(event, view)} className="flex w-full flex-wrap items-center gap-2 px-2 py-1 sm:w-auto"><label className="sr-only" htmlFor={`rename-saved-view-${view.id}`}>New name for Saved View {view.name}</label><input id={`rename-saved-view-${view.id}`} aria-label={`New name for Saved View ${view.name}`} value={renameName} onChange={event => setRenameName(event.target.value)} maxLength={80} required autoFocus className="h-9 min-w-40 flex-1 rounded-lg border border-cyan-300 bg-white px-2 text-sm text-j-ink-strong outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100" /><button type="submit" disabled={isSaving || !renameName.trim()} className="rounded-lg bg-cyan-700 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 focus-visible:ring-offset-2 disabled:opacity-60" aria-label={`Save new name for Saved View ${view.name}`}>Save name</button><button type="button" onClick={() => setEditingViewId(null)} disabled={isSaving} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-j-ink-soft transition hover:bg-j-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-ink-muted" aria-label={`Cancel renaming Saved View ${view.name}`}>Cancel</button></form> : <><button type="button" onClick={() => onApply(view)} className="min-w-0 truncate rounded-xl px-3 py-2 text-left text-sm font-semibold text-j-ink-strong transition hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700" aria-pressed={isSelected} title={`Apply ${view.name}`}>{view.name}{view.isDefault ? <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200"><Star className="h-3 w-3 fill-current" /> Default</span> : null}</button>
        {view.isDefault ? <button type="button" onClick={onClearDefault} disabled={isSaving} className="rounded-xl px-2.5 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-60" aria-label={`Clear default Saved View ${view.name}`}>Clear default</button> : <button type="button" onClick={() => onSetDefault(view.id)} disabled={isSaving} className="rounded-xl p-2 text-j-ink-muted transition hover:bg-amber-50 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-60" aria-label={`Set ${view.name} as default Saved View`} title="Set as default Saved View"><Star className="h-4 w-4" /></button>}
        <button type="button" onClick={() => startRename(view)} disabled={isSaving} className="rounded-xl p-2 text-j-ink-muted transition hover:bg-cyan-50 hover:text-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 disabled:opacity-60" aria-label={`Rename Saved View ${view.name}`} title="Rename Saved View"><FilePenLine className="h-4 w-4" /></button>
        {confirmingDelete ? <><button type="button" onClick={() => { onDelete(view.id); setPendingDeleteId(null); }} disabled={isSaving} className="rounded-xl bg-rose-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:opacity-60" aria-label={`Confirm delete Saved View ${view.name}`}>Delete</button><button type="button" onClick={() => setPendingDeleteId(null)} disabled={isSaving} className="rounded-xl px-2.5 py-2 text-xs font-semibold text-j-ink-soft hover:bg-j-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-ink-muted" aria-label={`Cancel deleting Saved View ${view.name}`}>Cancel</button></> : <button type="button" onClick={() => setPendingDeleteId(view.id)} className="rounded-xl p-2 text-j-ink-faint transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600" aria-label={`Delete Saved View ${view.name}`}><Trash2 className="h-4 w-4" /></button>}</>}
      </div>;
    })}</div> : null}
  </section>;
}

function MatchingWorkspaceContent() {
  const [filters, setFilters] = useState<AdminMatchingFilters>(initialFilters);
  const [selectedTutorByRequest, setSelectedTutorByRequest] = useState<Record<number, string>>({});
  const [selectedSavedViewId, setSelectedSavedViewId] = useState<number | null>(null);
  const hasHandledInitialDefaultView = useRef(false);
  const hasExplicitSavedViewIntent = useRef(false);
  const utils = trpc.useUtils();
  const matchingInput = useMemo(() => ({
    ...filters,
    createdAfter: filters.createdAfter ? new Date(`${filters.createdAfter}T00:00:00`) : undefined,
    createdBefore: filters.createdBefore ? new Date(`${filters.createdBefore}T23:59:59.999`) : undefined,
    lastActivityAfter: filters.lastActivityAfter ? new Date(`${filters.lastActivityAfter}T00:00:00`) : undefined,
    lastActivityBefore: filters.lastActivityBefore ? new Date(`${filters.lastActivityBefore}T23:59:59.999`) : undefined,
  }), [filters]);
  const matchingQueue = trpc.admin.listMatchingRequests.useQuery(matchingInput);
  const tutors = trpc.admin.listMatchingTutors.useQuery();
  const tutorInterests = trpc.admin.listTutorJobInterests.useQuery({});
  const guardianPhotos = trpc.admin.listPendingGuardianPhotos.useQuery();
  const savedViews = trpc.admin.listMatchingSavedViews.useQuery();
  const assignTutor = trpc.admin.assignTutorRequest.useMutation({ onSuccess: () => void utils.admin.listMatchingRequests.invalidate() });
  const confirmAppointment = trpc.admin.confirmTutorRequestAppointment.useMutation({ onSuccess: () => void utils.admin.listMatchingRequests.invalidate() });
  const cancelRequest = trpc.admin.cancelTutorRequest.useMutation({ onSuccess: () => void utils.admin.listMatchingRequests.invalidate() });
  const publishAction = trpc.admin.moderateTutorRequestPublication.useMutation({
    onSuccess: () => {
      void utils.admin.listMatchingRequests.invalidate();
    },
  });
  const reviewTutorInterest = trpc.admin.reviewTutorJobInterest.useMutation({ onSuccess: () => void utils.admin.listTutorJobInterests.invalidate() });
  const reviewGuardianPhoto = trpc.admin.reviewGuardianPhoto.useMutation({ onSuccess: () => void utils.admin.listPendingGuardianPhotos.invalidate() });
  const createSavedView = trpc.admin.createMatchingSavedView.useMutation({
    onSuccess: result => {
      setSelectedSavedViewId(result.id);
      void utils.admin.listMatchingSavedViews.invalidate();
    },
  });
  const deleteSavedView = trpc.admin.deleteMatchingSavedView.useMutation({
    onSuccess: () => {
      setSelectedSavedViewId(null);
      void utils.admin.listMatchingSavedViews.invalidate();
    },
  });
  const setDefaultSavedView = trpc.admin.setMatchingDefaultSavedView.useMutation({
    onSuccess: () => {
      void utils.admin.listMatchingSavedViews.invalidate();
    },
  });
  const clearDefaultSavedView = trpc.admin.clearMatchingDefaultSavedView.useMutation({
    onSuccess: () => {
      void utils.admin.listMatchingSavedViews.invalidate();
    },
  });
  const renameSavedView = trpc.admin.renameMatchingSavedView.useMutation({
    onSuccess: () => {
      void utils.admin.listMatchingSavedViews.invalidate();
    },
  });
  const applyFilters = (changes: Partial<AdminMatchingFilters>) => {
    hasExplicitSavedViewIntent.current = true;
    setSelectedSavedViewId(null);
    setFilters(current => buildAdminMatchingQuery({ ...current, ...changes }));
  };
  const applySavedView = (view: AdminMatchingSavedView) => {
    hasExplicitSavedViewIntent.current = true;
    setFilters(buildAdminMatchingQuery(view.filters));
    setSelectedSavedViewId(view.id);
  };
  useEffect(() => {
    if (!shouldAutoApplyDefaultSavedView({
      hasHandledInitialDefaultView: hasHandledInitialDefaultView.current,
      hasExplicitSavedViewIntent: hasExplicitSavedViewIntent.current,
      isLoading: savedViews.isLoading,
      isError: savedViews.isError,
    })) return;
    const defaultView = getDefaultAdminMatchingSavedView((savedViews.data ?? []) as AdminMatchingSavedView[]);
    if (defaultView) {
      setFilters(buildAdminMatchingQuery(defaultView.filters));
      setSelectedSavedViewId(defaultView.id);
    }
    hasHandledInitialDefaultView.current = true;
  }, [savedViews.data, savedViews.isError, savedViews.isLoading]);
  const clearFilters = () => {
    hasExplicitSavedViewIntent.current = true;
    setSelectedSavedViewId(null);
    setFilters(initialFilters);
  };
  const requests = (matchingQueue.data?.items ?? []) as MatchingRequest[];
  const total = matchingQueue.data?.total ?? 0;
  const page = matchingQueue.data?.page ?? filters.page;
  const totalPages = matchingQueue.data?.totalPages ?? 1;
  const runAction = (requestId: number, action: PublicationAction) => publishAction.mutate({ requestId, action });
  const saveEdit = (requestId: number, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subjects = String(form.get("subjects") ?? "").split(",").map(value => value.trim()).filter(Boolean);
    publishAction.mutate({ requestId, action: "edit", edit: {
      category: String(form.get("category") ?? "").trim(),
      classCourse: String(form.get("classCourse") ?? "").trim(),
      subjects,
      daysPerWeek: Number(form.get("daysPerWeek")),
      preferredGender: String(form.get("preferredGender")) as "male" | "female" | "any",
    } });
  };
  return <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
    
    <GuardianPhotoModerationQueue photos={(guardianPhotos.data ?? []) as AdminGuardianPhotoReview[]} isLoading={guardianPhotos.isLoading} isError={guardianPhotos.isError} isSaving={reviewGuardianPhoto.isPending} onReview={(photoId, nextStatus, rejectionReason, moderationNote) => reviewGuardianPhoto.mutate({ photoId, nextStatus, ...(rejectionReason ? { rejectionReason } : {}), ...(moderationNote ? { moderationNote } : {}) })} />
    <TutorInterestQueue interests={(tutorInterests.data ?? []) as AdminTutorInterest[]} isLoading={tutorInterests.isLoading} isError={tutorInterests.isError} isSaving={reviewTutorInterest.isPending} onReview={(interestId, status) => reviewTutorInterest.mutate({ interestId, status })} />
    <AdminMatchingSavedViews views={(savedViews.data ?? []) as AdminMatchingSavedView[]} isLoading={savedViews.isLoading} isError={savedViews.isError} isSaving={createSavedView.isPending || deleteSavedView.isPending || setDefaultSavedView.isPending || clearDefaultSavedView.isPending || renameSavedView.isPending} errorMessage={createSavedView.error?.message ?? deleteSavedView.error?.message ?? setDefaultSavedView.error?.message ?? clearDefaultSavedView.error?.message ?? renameSavedView.error?.message} selectedViewId={selectedSavedViewId} onApply={applySavedView} onCreate={name => createSavedView.mutate({ name, filters: serializeAdminMatchingSavedViewFilters(filters) })} onDelete={savedViewId => deleteSavedView.mutate({ savedViewId })} onSetDefault={savedViewId => setDefaultSavedView.mutate({ savedViewId })} onClearDefault={() => clearDefaultSavedView.mutate()} onRename={(savedViewId, name) => renameSavedView.mutate({ savedViewId, name })} />
    <section className="rounded-xl border border-j-border bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-j-accent" /><h2 className="font-semibold text-j-ink">Advanced filters</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="relative sm:col-span-2"><span className="sr-only">Search requests</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" /><input value={filters.query} onChange={event => applyFilters({ query: event.target.value })} placeholder="Search subject, class, category or location" className="h-11 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none transition focus:border-j-accent focus:ring-2 focus:ring-sky-100" /></label><select aria-label="Request status" value={filters.status} onChange={event => applyFilters({ status: event.target.value as AdminStatusFilter })} className="h-11 min-w-0 w-full rounded-xl border border-j-border bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"><option value="all">All statuses</option><option value="new">New</option><option value="reviewing">Reviewing</option><option value="matched">Matched</option><option value="closed">Closed</option></select><select aria-label="Tuition type" value={filters.tuitionType} onChange={event => applyFilters({ tuitionType: event.target.value as AdminMatchingFilters["tuitionType"] })} className="h-11 min-w-0 w-full rounded-xl border border-j-border bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"><option value="all">All tuition modes</option><option value="home">Home Tutoring</option><option value="online">Online Tutoring</option><option value="group">Group Tutoring</option><option value="package">Package Tutoring</option><option value="both">Home and Online Tutoring (legacy)</option></select><input value={filters.subject} onChange={event => applyFilters({ subject: event.target.value })} placeholder="Subject contains" className="h-11 min-w-0 w-full rounded-xl border border-j-border bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" /><input value={filters.category} onChange={event => applyFilters({ category: event.target.value })} placeholder="Category" className="h-11 min-w-0 w-full rounded-xl border border-j-border bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" /><select aria-label="Tutor gender preference" value={filters.preferredGender} onChange={event => applyFilters({ preferredGender: event.target.value as AdminMatchingFilters["preferredGender"] })} className="h-11 min-w-0 w-full rounded-xl border border-j-border bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"><option value="all">Any Tutor gender</option><option value="male">Male Tutor</option><option value="female">Female Tutor</option><option value="any">Any</option></select><select aria-label="Contact consent" value={filters.contactConsent} onChange={event => applyFilters({ contactConsent: event.target.value as AdminMatchingFilters["contactConsent"] })} className="h-11 min-w-0 w-full rounded-xl border border-j-border bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"><option value="all">Any contact state</option><option value="not_required">Not required</option><option value="pending">Consent pending</option><option value="approved">Consent approved</option><option value="declined">Consent declined</option></select><div className="flex min-w-0 gap-2"><MoneyAmountField ariaLabel="Minimum budget in Taka" value={filters.budgetMinimum === undefined ? "" : String(filters.budgetMinimum)} onChange={value => { const digits = value.replace(/D/g, ""); applyFilters({ budgetMinimum: digits ? Number(digits) : undefined }); }} placeholder="Min budget" inputClassName="h-11 min-w-0 flex-1 rounded-xl border border-j-border bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" /><MoneyAmountField ariaLabel="Maximum budget in Taka" value={filters.budgetMaximum === undefined ? "" : String(filters.budgetMaximum)} onChange={value => { const digits = value.replace(/D/g, ""); applyFilters({ budgetMaximum: digits ? Number(digits) : undefined }); }} placeholder="Max budget" inputClassName="h-11 min-w-0 flex-1 rounded-xl border border-j-border bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" /></div></div><div className="mt-4 flex justify-end"><button type="button" onClick={clearFilters} className="rounded-lg px-3 py-2 text-sm font-semibold text-j-accent hover:bg-sky-50">Clear filters</button></div></section>
    <section aria-label="Operational matching filters" className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-2"><SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" /><div><h2 className="font-semibold text-j-ink">Operational queue filters</h2></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-j-ink-soft">Guardian lifecycle<select aria-label="Guardian lifecycle" value={filters.lifecycle} onChange={event => applyFilters({ lifecycle: event.target.value as AdminMatchingFilters["lifecycle"] })} className="mt-1.5 h-11 w-full rounded-xl border border-j-border bg-white px-3 text-sm font-normal text-j-ink-strong outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"><option value="all">Any lifecycle</option><option value="pending">Pending</option><option value="live">Live</option><option value="appointed">Appointed</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select></label>
        <label className="text-xs font-semibold text-j-ink-soft">Tutor assignment<select aria-label="Tutor assignment state" value={filters.assignmentState} onChange={event => applyFilters({ assignmentState: event.target.value as AdminMatchingFilters["assignmentState"] })} className="mt-1.5 h-11 w-full rounded-xl border border-j-border bg-white px-3 text-sm font-normal text-j-ink-strong outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"><option value="all">Any assignment</option><option value="unassigned">Unassigned</option><option value="assigned">Assigned</option></select></label>
        <label className="text-xs font-semibold text-j-ink-soft">Appointment<select aria-label="Appointment state" value={filters.appointmentState} onChange={event => applyFilters({ appointmentState: event.target.value as AdminMatchingFilters["appointmentState"] })} className="mt-1.5 h-11 w-full rounded-xl border border-j-border bg-white px-3 text-sm font-normal text-j-ink-strong outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"><option value="all">Any appointment state</option><option value="pending">Confirmation pending</option><option value="confirmed">Confirmed</option></select></label>
        <label className="text-xs font-semibold text-j-ink-soft">Closure<select aria-label="Cancellation state" value={filters.cancellationState} onChange={event => applyFilters({ cancellationState: event.target.value as AdminMatchingFilters["cancellationState"] })} className="mt-1.5 h-11 w-full rounded-xl border border-j-border bg-white px-3 text-sm font-normal text-j-ink-strong outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"><option value="all">Any closure state</option><option value="active">Active requests</option><option value="cancelled">Cancelled requests</option></select></label>
        <label className="text-xs font-semibold text-j-ink-soft">Location<input aria-label="Operational location" value={filters.location} onChange={event => applyFilters({ location: event.target.value })} placeholder="City, area or location" className="mt-1.5 h-11 w-full rounded-xl border border-j-border bg-white px-3 text-sm font-normal text-j-ink-strong placeholder:text-j-ink-faint outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100" /></label>
        <label className="text-xs font-semibold text-j-ink-soft">Created from<input aria-label="Created from" type="date" value={filters.createdAfter} onChange={event => applyFilters({ createdAfter: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-j-border bg-white px-3 text-sm font-normal text-j-ink-strong outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100" /></label>
        <label className="text-xs font-semibold text-j-ink-soft">Created to<input aria-label="Created to" type="date" value={filters.createdBefore} onChange={event => applyFilters({ createdBefore: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-j-border bg-white px-3 text-sm font-normal text-j-ink-strong outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100" /></label>
        <label className="text-xs font-semibold text-j-ink-soft">Activity from<input aria-label="Last activity from" type="date" value={filters.lastActivityAfter} onChange={event => applyFilters({ lastActivityAfter: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-j-border bg-white px-3 text-sm font-normal text-j-ink-strong outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100" /></label>
        <label className="text-xs font-semibold text-j-ink-soft">Activity to<input aria-label="Last activity to" type="date" value={filters.lastActivityBefore} onChange={event => applyFilters({ lastActivityBefore: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-j-border bg-white px-3 text-sm font-normal text-j-ink-strong outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100" /></label>
      </div>
    </section>
    {publishAction.isError || confirmAppointment.isError || cancelRequest.isError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{publishAction.error?.message ?? confirmAppointment.error?.message ?? cancelRequest.error?.message}</p> : null}
    {matchingQueue.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading requests…</div> : matchingQueue.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">The matching queue could not be loaded. Please refresh and try again.</div> : requests.length === 0 ? <div className="rounded-xl border border-dashed border-j-field-border bg-white p-10 text-center"><ClipboardList className="mx-auto h-10 w-10 text-j-ink-faint" /><h2 className="mt-4 font-semibold text-j-ink">No requests match these filters</h2></div> : <section className="space-y-4">{requests.map(request => {
      const status = getAdminRequestStatusPresentation(request.status); const selectedTutor = selectedTutorByRequest[request.id] ?? ""; const isBusy = publishAction.isPending || assignTutor.isPending || confirmAppointment.isPending || cancelRequest.isPending; const assignmentBlocked = request.status === "matched" || request.status === "closed" || request.publicationState === "published" || tutors.isLoading;
      const groupCapacity = getAdminGroupCapacityDisplay(request); const packageDuration = getAdminPackageDurationDisplay(request); const studentCount = getAdminStudentCountDisplay(request);
      return <article key={request.id} className="overflow-hidden rounded-xl border border-j-border bg-white shadow-sm"><div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 text-sm font-bold text-j-ink"><RecordIcon name="requestId" size={13} className="text-j-ink-faint" />Request #{request.id}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.className}`}>{status.label}</span><span className="rounded-full bg-j-surface-muted px-2.5 py-1 text-xs font-semibold text-j-ink-soft">{formatAdminTuitionType(request.tuitionType)}</span>{request.contactConsent === "pending" ? <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">Consent pending</span> : null}</div><h2 className="mt-3 text-lg font-bold text-j-ink">{request.category} · {request.classCourse}</h2><p className="mt-1 text-sm font-medium text-j-accent">{formatSubjects(request.subjects)}</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><dt className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-j-ink-muted"><RecordIcon name="location" size={12} className="text-j-ink-faint" />Location</dt><dd className="mt-1 text-j-ink-strong">{request.tuitionLocationLabel ?? request.locationText ?? "Online / not required"}</dd></div><div><dt className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-j-ink-muted"><RecordIcon name="daysPerWeek" size={12} className="text-j-ink-faint" />Schedule</dt><dd className="mt-1 text-j-ink-strong">{request.daysPerWeek} day(s) weekly</dd></div>{groupCapacity ? <div><dt className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-j-ink-muted"><RecordIcon name="students" size={12} className="text-j-ink-faint" />Maximum students</dt><dd className="mt-1 text-j-ink-strong">{groupCapacity}</dd></div> : null}{packageDuration ? <div><dt className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-j-ink-muted"><RecordIcon name="packageDuration" size={12} className="text-j-ink-faint" />Package duration</dt><dd className="mt-1 text-j-ink-strong">{packageDuration}</dd></div> : null}<div><dt className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-j-ink-muted"><RecordIcon name="institute" size={12} className="text-j-ink-faint" />Institute Name</dt><dd className="mt-1 text-j-ink-strong">{formatInstituteName(request.instituteName)}</dd></div><div><dt className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-j-ink-muted"><RecordIcon name="referral" size={12} className="text-j-ink-faint" />Heard About Us</dt><dd className="mt-1 text-j-ink-strong">{formatRequestSource(request.heardAboutUs)}</dd></div><div><dt className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-j-ink-muted"><RecordIcon name="salary" size={12} className="text-j-ink-faint" />Salary</dt><dd className="mt-1 text-j-ink-strong">{formatBudget(request)}</dd></div><div><dt className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-j-ink-muted"><RecordIcon name="tutorGender" size={12} className="text-j-ink-faint" />Tutor preference</dt><dd className="mt-1 capitalize text-j-ink-strong">{request.preferredGender}</dd></div></dl>{request.studentFirstName || request.notes ? <div className="mt-4 rounded-xl bg-j-surface-sunken p-3 text-sm text-j-ink-soft"><strong>Admin-only note</strong>{request.studentFirstName ? <span> · Student: {request.studentFirstName}</span> : null}{request.notes ? <p className="mt-1 leading-6">{request.notes}</p> : null}</div> : null}</div><div className="grid w-full gap-3 lg:w-80"><PublicationControls request={request} busy={isBusy} onAction={action => runAction(request.id, action)} onEdit={event => saveEdit(request.id, event)} /><PublicationAuditTrail requestId={request.id} /><div className="grid gap-2 border-t border-j-border pt-3"><select aria-label={`Select Tutor for request ${request.id}`} value={selectedTutor} onChange={event => setSelectedTutorByRequest(current => ({ ...current, [request.id]: event.target.value }))} disabled={assignmentBlocked} className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-j-surface-muted"><option value="">{tutors.isLoading ? "Loading approved Tutors…" : "Select approved Tutor"}</option>{(tutors.data ?? []).map(tutor => <option key={tutor.id} value={tutor.id}>{tutor.name} · {tutor.subjects.slice(0, 2).join(", ") || "Profile subject"}</option>)}</select><button type="button" disabled={!selectedTutor || assignmentBlocked || isBusy} onClick={() => assignTutor.mutate({ requestId: request.id, tutorId: selectedTutor })} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-j-accent px-3 text-sm font-semibold text-white transition hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-50"><UserCheck className="h-4 w-4" /> {assignTutor.isPending ? "Assigning…" : "Assign Tutor"}</button>{request.publicationState === "published" ? <p className="text-xs leading-5 text-j-ink-muted">Unpublish before manual tutor assignment to prevent conflicting availability.</p> : null}</div></div></div></article>;
    })}</section>}
    {totalPages > 1 ? <nav aria-label="Matching request pages" className="flex items-center justify-between rounded-xl border border-j-border bg-white p-3 shadow-sm"><p className="text-sm text-j-ink-soft">Page {page} of {totalPages}</p><div className="flex gap-2"><button type="button" onClick={() => setFilters(current => ({ ...current, page: Math.max(1, page - 1) }))} disabled={page <= 1} className="inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-3 text-sm font-semibold text-j-ink-soft disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button><button type="button" onClick={() => setFilters(current => ({ ...current, page: Math.min(totalPages, page + 1) }))} disabled={page >= totalPages} className="inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-3 text-sm font-semibold text-j-ink-soft disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button></div></nav> : null}
  </div>;
}

export default function AdminMatchingWorkspace() {
  return <AdminWorkspaceLayout title="Matching workspace"><MatchingWorkspaceContent /></AdminWorkspaceLayout>;
}
