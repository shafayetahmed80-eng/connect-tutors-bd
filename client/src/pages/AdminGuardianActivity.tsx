import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { formatSalaryAmount } from "@shared/salary-amount";
import { trpc } from "@/lib/trpc";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { RecordIcon } from "@/components/recordIcons";
import { ChevronLeft, ChevronRight, Eye, Loader2, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

type GuardianFilters = {
  query: string;
  status: "all" | "new" | "reviewing" | "matched" | "closed";
  contactConsent: "all" | "not_required" | "pending" | "approved" | "declined";
  tuitionType: "all" | "home" | "online" | "both" | "group" | "package";
  location: string;
  page: number;
  pageSize: number;
};

const initialFilters: GuardianFilters = { query: "", status: "all", contactConsent: "all", tuitionType: "all", location: "", page: 1, pageSize: 20 };

export const guardianActionPresets = [
  { id: "new", label: "Review new requests", status: "new", contactConsent: "all" },
  { id: "consent", label: "Resolve consent decisions", status: "all", contactConsent: "pending" },
  { id: "matching", label: "Open matching workspace", href: "/admin/matching" },
] as const;

function formatSubjects(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").join(", ") : value;
  } catch {
    return value;
  }
}

function formatBudget(request: { budgetAmount: number | null }) {
  return formatSalaryAmount(request.budgetAmount);
}

export function getAdminGuardianPrivateDetails(request: {
  tuitionType: "home" | "online" | "both" | "group" | "package";
  studentCount: number | null;
  studentGender: "male" | "female" | null;
  addressDetails: string | null;
}) {
  return [
    ...(request.tuitionType !== "group" && request.studentCount !== null
      ? [{ label: "Number of students", value: `${request.studentCount} student${request.studentCount === 1 ? "" : "s"}` }]
      : []),
    ...(request.studentGender ? [{ label: "Student gender", value: request.studentGender === "female" ? "Female" : "Male" }] : []),
    ...(request.addressDetails?.trim() ? [{ label: "Address details", value: request.addressDetails.trim() }] : []),
  ];
}

function GuardianActivityContent() {
  const [filters, setFilters] = useState<GuardianFilters>(initialFilters);
  const [contactRequestId, setContactRequestId] = useState<number | null>(null);
  // The contact dialog is rendered inline, so the lock follows its open state.
  useBodyScrollLock(contactRequestId !== null);
  const requests = trpc.admin.listGuardianRequests.useQuery(filters);
  const contact = trpc.admin.getGuardianContact.useQuery({ requestId: contactRequestId ?? 1 }, { enabled: contactRequestId !== null, retry: false });
  const updateFilter = (change: Partial<GuardianFilters>) => setFilters(current => ({ ...current, ...change, page: change.page ?? 1 }));
  const totalPages = requests.data?.totalPages ?? 1;

  return <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
    
    <section className="rounded-3xl border border-[#bfe4f6] bg-[linear-gradient(135deg,#f1faff,#ffffff)] p-5 shadow-[0_10px_24px_rgba(38,83,117,0.05)] sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#167ddd]">Action queue</p><h2 className="mt-1 text-xl font-bold tracking-[-0.025em] text-[#173b60]">Choose the next protected workflow</h2></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">{guardianActionPresets.map(preset => "href" in preset ? <Link key={preset.id} href={preset.href} className="group flex min-h-20 items-center rounded-2xl border border-[#d9e9f2] bg-white px-4 text-sm font-bold text-[#315b7d] transition hover:-translate-y-0.5 hover:border-[#8acbee] hover:shadow-sm">{preset.label}<ChevronRight className="ml-auto h-4 w-4 text-[#167ddd] transition group-hover:translate-x-0.5" /></Link> : <button type="button" key={preset.id} onClick={() => updateFilter({ status: preset.status, contactConsent: preset.contactConsent })} className="group flex min-h-20 items-center rounded-2xl border border-[#d9e9f2] bg-white px-4 text-left text-sm font-bold text-[#315b7d] transition hover:-translate-y-0.5 hover:border-[#8acbee] hover:shadow-sm">{preset.label}<ChevronRight className="ml-auto h-4 w-4 text-[#167ddd] transition group-hover:translate-x-0.5" /></button>)}</div>
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative sm:col-span-2"><span className="sr-only">Search requests</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={filters.query} onChange={e => updateFilter({ query: e.target.value })} placeholder="Search subject, class, category or location" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100" /></label>
        <select value={filters.status} onChange={e => updateFilter({ status: e.target.value as GuardianFilters["status"] })} aria-label="Request status" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All request statuses</option><option value="new">New</option><option value="reviewing">Reviewing</option><option value="matched">Matched</option><option value="closed">Closed</option></select>
        <select value={filters.contactConsent} onChange={e => updateFilter({ contactConsent: e.target.value as GuardianFilters["contactConsent"] })} aria-label="Contact consent status" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All consent states</option><option value="not_required">Not required</option><option value="pending">Consent pending</option><option value="approved">Consent approved</option><option value="declined">Consent declined</option></select>
        <select value={filters.tuitionType} onChange={e => updateFilter({ tuitionType: e.target.value as GuardianFilters["tuitionType"] })} aria-label="Tuition type" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All tuition modes</option><option value="home">Home Tutoring</option><option value="online">Online Tutoring</option><option value="group">Group Tutoring</option><option value="package">Package Tutoring</option><option value="both">Home and Online Tutoring (legacy)</option></select>
        <input value={filters.location} onChange={e => updateFilter({ location: e.target.value })} placeholder="Location" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
        <button type="button" onClick={() => setFilters(initialFilters)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Clear filters</button>
      </div>
    </section>
    {requests.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Guardian requests…</div> : null}
    {requests.isError ? <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Guardian activity could not be loaded.</div> : null}
    {!requests.isLoading && !requests.isError ? <section className="space-y-4">{(requests.data?.items ?? []).map(request => {
      const privateDetails = getAdminGuardianPrivateDetails(request);
      return <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900"><RecordIcon name="requestId" size={13} className="text-slate-400" />Request #{request.id}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">{request.status}</span><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800">{request.contactConsent.replaceAll("_", " ")}</span></div><h2 className="mt-3 text-lg font-bold text-slate-900">{request.category} · {request.classCourse}</h2><p className="mt-1 text-sm font-medium text-[#116fc4]">{formatSubjects(request.subjects)}</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><RecordIcon name="location" size={12} className="text-slate-400" />Location</dt><dd className="mt-1 text-slate-800">{request.tuitionLocationLabel ?? request.locationText ?? "Online / not required"}</dd></div><div><dt className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><RecordIcon name="salary" size={12} className="text-slate-400" />Salary</dt><dd className="mt-1 text-slate-800">{formatBudget(request)}</dd></div><div><dt className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><RecordIcon name="created" size={12} className="text-slate-400" />Created</dt><dd className="mt-1 text-slate-800">{new Date(request.createdAt).toLocaleDateString()}</dd></div>{privateDetails.map(detail => <div key={detail.label}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{detail.label}</dt><dd className="mt-1 whitespace-pre-wrap text-slate-800">{detail.value}</dd></div>)}</dl></div><button type="button" disabled={contact.isFetching} onClick={() => setContactRequestId(request.id)} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#116fc4] bg-white px-3 text-sm font-bold text-[#116fc4] hover:bg-sky-50 disabled:opacity-50"><Eye size={16} /> View Guardian contact</button></div></article>;
    })}{requests.data?.items.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">No Guardian request matches the active filters.</div> : null}</section> : null}
    {totalPages > 1 ? <nav aria-label="Guardian request pages" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-sm text-slate-600">Page {filters.page} of {totalPages}</p><div className="flex gap-2"><button type="button" disabled={filters.page <= 1} onClick={() => updateFilter({ page: filters.page - 1 })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-bold disabled:opacity-40"><ChevronLeft size={15} /> Previous</button><button type="button" disabled={filters.page >= totalPages} onClick={() => updateFilter({ page: filters.page + 1 })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-bold disabled:opacity-40">Next <ChevronRight size={15} /></button></div></nav> : null}
    {contactRequestId !== null ? <div role="dialog" aria-modal="true" aria-labelledby="guardian-contact-title" className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-3 sm:items-center sm:justify-center"><section className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-[#116fc4]" /><div><h2 id="guardian-contact-title" className="text-xl font-bold text-slate-900">Guardian contact · Request #{contactRequestId}</h2><p className="mt-1 text-sm leading-6 text-slate-600">This access has been recorded for Admin accountability. Use it only for the related Guardian request.</p></div></div>{contact.isLoading ? <div className="flex min-h-36 items-center justify-center text-sm text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading contact…</div> : contact.isError ? <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{contact.error.message}</p> : contact.data ? <dl className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm"><div><dt className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><RecordIcon name="guardianId" size={12} className="text-slate-400" />Name</dt><dd className="mt-1 font-semibold text-slate-900">{contact.data.name}</dd></div><div><dt className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><RecordIcon name="phone" size={12} className="text-slate-400" />Phone</dt><dd className="mt-1 font-semibold text-slate-900">{contact.data.phone}</dd></div><div><dt className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><RecordIcon name="email" size={12} className="text-slate-400" />Email</dt><dd className="mt-1 font-semibold text-slate-900">{contact.data.email ?? "Not provided"}</dd></div><div><dt className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><RecordIcon name="location" size={12} className="text-slate-400" />Location</dt><dd className="mt-1 font-semibold text-slate-900">{contact.data.locationLabel ?? "Not provided"}</dd></div></dl> : null}<button type="button" onClick={() => setContactRequestId(null)} className="mt-5 h-11 w-full rounded-xl bg-[#116fc4] px-4 text-sm font-bold text-white">Close contact view</button></section></div> : null}
  </div>;
}

export default function AdminGuardianActivity() { return <AdminWorkspaceLayout title="Guardian activity"><GuardianActivityContent /></AdminWorkspaceLayout>; }
