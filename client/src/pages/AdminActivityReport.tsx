import { useAuth } from "@/_core/hooks/useAuth";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { trpc } from "@/lib/trpc";
import { BarChart3, CheckCircle2, ClipboardCheck, ContactRound, Loader2, ShieldCheck, UsersRound, XCircle } from "lucide-react";
import { useState } from "react";

const windows = [
  { value: 7 as const, label: "Last 7 days" },
  { value: 30 as const, label: "Last 30 days" },
  { value: 90 as const, label: "Last 90 days" },
];

type OwnerActivityReport = {
  windowDays: 7 | 30 | 90;
  generatedAt: Date;
  totals: {
    activeAdmins: number;
    securityEvents: number;
    successfulLogins: number;
    failedLogins: number;
    twoFactorVerifications: number;
    tutorModerations: number;
    guardianContactViews: number;
  };
  adminSummaries: Array<{
    userId: number;
    name: string;
    email: string | null;
    active: boolean;
    securityEvents: number;
    successfulLogins: number;
    failedLogins: number;
    twoFactorVerifications: number;
    tutorModerations: number;
    guardianContactViews: number;
    lastActivityAt: Date | null;
  }>;
  recentEvents: Array<{
    id: string;
    category: "security" | "tutor_moderation" | "guardian_contact";
    label: string;
    adminUserId: number;
    adminName: string;
    createdAt: Date;
  }>;
};

function formatDate(value: Date | null | undefined) {
  return value ? new Date(value).toLocaleString() : "No recorded activity";
}

function eventLabel(category: "security" | "tutor_moderation" | "guardian_contact", label: string) {
  if (category === "security") return label.replaceAll("_", " ");
  if (category === "tutor_moderation") return `Tutor profile ${label.replaceAll("_", " ")}`;
  return "Guardian contact viewed";
}

function OwnerReportContent() {
  const { user, loading } = useAuth();
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const isAdmin = user?.role === "admin";
  const workspaceAccess = trpc.admin.getWorkspaceAccess.useQuery(undefined, { enabled: isAdmin, retry: false });
  const report = trpc.admin.getActivityReport.useQuery({ windowDays }, {
    enabled: Boolean(workspaceAccess.data?.isOwner),
    retry: false,
  });

  if (loading || (isAdmin && workspaceAccess.isLoading)) {
    return <div className="flex min-h-[58vh] items-center justify-center text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying Owner access…</div>;
  }
  if (!isAdmin || !workspaceAccess.data?.isOwner) {
    return <section className="mx-auto flex min-h-[58vh] max-w-xl flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm"><ShieldCheck className="mb-4 h-12 w-12 text-amber-600" /><h1 className="text-2xl font-bold text-j-ink">Owner access required</h1><p className="mt-2 text-sm leading-6 text-j-ink-soft">Admin activity reports are restricted to the Project Owner. No activity data is loaded for other accounts.</p></section>;
  }

  return <AdminWorkspaceLayout title="Owner activity report">
    <main className="mx-auto w-full max-w-7xl space-y-5 pb-10">
      <section className="rounded-xl bg-[linear-gradient(125deg,#172554,#115e9d_58%,#38bdf8)] p-6 text-white shadow-[0_18px_42px_rgba(20,83,133,0.2)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-100">Owner reporting</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em]">Admin activity summary</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100">Review aggregate sign-in security, Tutor moderation, and logged Guardian contact access. This report never displays Guardian contact details or credential material.</p></div><div className="flex flex-wrap gap-2">{windows.map(option => <button type="button" key={option.value} onClick={() => setWindowDays(option.value)} className={`rounded-xl px-3 py-2 text-sm font-bold ring-1 transition ${windowDays === option.value ? "bg-white text-[#0f4d7f] ring-white" : "bg-[#062946]/25 text-white ring-white/25 hover:bg-white/15"}`}>{option.label}</button>)}</div></div>
      </section>

      {report.isLoading ? <div className="flex min-h-[34vh] items-center justify-center text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing the activity report…</div> : report.isError || !report.data ? <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">The Owner activity report could not be loaded. Please refresh and try again.</section> : <ReportData data={report.data as OwnerActivityReport} />}
    </main>
  </AdminWorkspaceLayout>;
}

function ReportData({ data }: { data: OwnerActivityReport }) {
  const metrics = [
    { label: "Active Admins", value: data.totals.activeAdmins, detail: "Current Admin-role accounts", icon: UsersRound, tone: "bg-sky-50 text-sky-900 ring-sky-200" },
    { label: "Successful sign-ins", value: data.totals.successfulLogins, detail: "Credential sign-in events", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-900 ring-emerald-200" },
    { label: "Failed sign-ins", value: data.totals.failedLogins, detail: `${data.totals.securityEvents} security events`, icon: XCircle, tone: "bg-rose-50 text-rose-900 ring-rose-200" },
    { label: "Tutor moderation", value: data.totals.tutorModerations, detail: "Recorded profile decisions", icon: ClipboardCheck, tone: "bg-amber-50 text-amber-900 ring-amber-200" },
    { label: "Guardian contact views", value: data.totals.guardianContactViews, detail: "Deliberate audited disclosures", icon: ContactRound, tone: "bg-violet-50 text-violet-900 ring-violet-200" },
  ];
  return <>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(metric => { const Icon = metric.icon; return <article key={metric.label} className={`rounded-xl p-5 ring-1 shadow-sm ${metric.tone}`}><Icon className="h-5 w-5" /><p className="mt-5 text-3xl font-bold">{metric.value.toLocaleString()}</p><h2 className="mt-1 text-sm font-bold">{metric.label}</h2><p className="mt-2 text-xs leading-5 opacity-75">{metric.detail}</p></article>; })}</section>
    <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <article className="overflow-hidden rounded-xl border border-j-border bg-white shadow-sm"><div className="border-b border-j-border p-5 sm:p-6"><div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-j-accent" /><div><h2 className="text-lg font-bold text-j-ink">Per-Admin activity</h2></div></div></div><div className="overflow-x-auto"><table className="w-full min-w-[670px] text-left text-sm"><thead className="bg-j-surface-sunken text-xs uppercase tracking-wide text-j-ink-muted"><tr><th className="px-5 py-3 font-bold">Admin account</th><th className="px-4 py-3 font-bold">Sign-ins</th><th className="px-4 py-3 font-bold">Moderation</th><th className="px-4 py-3 font-bold">Contact views</th><th className="px-5 py-3 font-bold">Last activity</th></tr></thead><tbody className="divide-y divide-j-border">{data.adminSummaries.map(admin => <tr key={admin.userId}><td className="px-5 py-4"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-j-ink">{admin.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${admin.active ? "bg-emerald-50 text-emerald-700" : "bg-j-surface-muted text-j-ink-soft"}`}>{admin.active ? "Active" : "Former"}</span></div><p className="mt-1 text-xs text-j-ink-muted">{admin.email ?? "No account email"}</p></td><td className="px-4 py-4 text-j-ink-soft"><span className="font-bold text-emerald-700">{admin.successfulLogins}</span><span className="mx-1 text-j-ink-faint">/</span><span className="font-bold text-rose-700">{admin.failedLogins}</span></td><td className="px-4 py-4 font-semibold text-j-ink-soft">{admin.tutorModerations}</td><td className="px-4 py-4 font-semibold text-j-ink-soft">{admin.guardianContactViews}</td><td className="px-5 py-4 text-xs leading-5 text-j-ink-muted">{formatDate(admin.lastActivityAt)}</td></tr>)}</tbody></table></div></article>
      <article className="rounded-xl border border-j-border bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-j-ink">Report boundary</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-j-ink-soft"><li className="rounded-xl bg-j-surface-sunken p-3"><strong className="text-j-ink">Included:</strong> authenticated Admin security events, Tutor profile decisions, and audited Guardian contact-view counts.</li><li className="rounded-xl bg-j-surface-sunken p-3"><strong className="text-j-ink">Excluded:</strong> Guardian phone/email, student notes, passwords, recovery codes, TOTP secrets, audit metadata, and IP addresses.</li><li className="rounded-xl bg-j-surface-sunken p-3"><strong className="text-j-ink">Generated:</strong> {formatDate(data.generatedAt)}</li></ul></article>
    </section>
    <section className="rounded-xl border border-j-border bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-j-ink">Recent recorded activity</h2>{data.recentEvents.length ? <ol className="mt-5 divide-y divide-j-border">{data.recentEvents.map(event => <li key={event.id} className="flex gap-3 py-4 first:pt-0"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${event.category === "security" ? "bg-sky-500" : event.category === "tutor_moderation" ? "bg-amber-500" : "bg-violet-500"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-bold capitalize text-j-ink">{eventLabel(event.category, event.label)}</p><p className="mt-1 text-sm text-j-ink-soft">Recorded for <strong>{event.adminName}</strong></p></div><time className="shrink-0 text-right text-xs leading-5 text-j-ink-muted">{formatDate(event.createdAt)}</time></li>)}</ol> : <p className="mt-5 rounded-xl bg-j-surface-sunken p-4 text-sm text-j-ink-soft">No Admin activity has been recorded in this reporting window.</p>}</section>
  </>;
}

export default function AdminActivityReport() { return <OwnerReportContent />; }
