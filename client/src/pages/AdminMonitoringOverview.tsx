import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ClipboardList, ContactRound, Loader2, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
import { Link } from "wouter";

export const ADMIN_WORKSPACE_SECURITY_BADGE = "Role-restricted workspace";

const metricCards = [
  { key: "pendingTutorReviews", label: "Tutor reviews pending", detail: "Pending and changes-requested profiles", icon: UserRoundCog, tone: "bg-amber-50 text-amber-900 ring-amber-200" },
  { key: "approvedTutors", label: "Approved Tutors", detail: "Profiles ready for matching", icon: UsersRound, tone: "bg-emerald-50 text-emerald-900 ring-emerald-200" },
  { key: "newRequests", label: "New Guardian requests", detail: "Needs initial matching review", icon: ClipboardList, tone: "bg-sky-50 text-sky-900 ring-sky-200" },
  { key: "consentBacklog", label: "Consent pending", detail: "Matched requests needing a Guardian decision", icon: ContactRound, tone: "bg-violet-50 text-violet-900 ring-violet-200" },
] as const;

export type AdminPriorityQueueMetrics = {
  pendingTutorReviews: number;
  newRequests: number;
  consentBacklog: number;
};

export function buildAdminPriorityQueue(metrics: AdminPriorityQueueMetrics) {
  return [
    metrics.pendingTutorReviews > 0 ? { count: metrics.pendingTutorReviews, label: "Review Tutor profiles", href: "/admin/tutors" } : null,
    metrics.newRequests > 0 ? { count: metrics.newRequests, label: "Review new Guardian requests", href: "/admin/matching" } : null,
    metrics.consentBacklog > 0 ? { count: metrics.consentBacklog, label: "Resolve consent decisions", href: "/admin/matching" } : null,
  ].filter((item): item is { count: number; label: string; href: string } => item !== null);
}

function OverviewContent() {
  const overview = trpc.admin.getMonitoringOverview.useQuery();
  if (overview.isLoading) return <div className="flex min-h-[48vh] items-center justify-center text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading operational overview…</div>;
  if (overview.isError || !overview.data) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">The Admin overview could not be loaded. Please refresh and try again.</div>;
  const { metrics } = overview.data;
  const priorityQueue = buildAdminPriorityQueue(metrics);
  return <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
    <section className="rounded-xl bg-[linear-gradient(125deg,#123d67,#167ddd_62%,#60bce8)] p-6 text-white shadow-[0_18px_42px_rgba(20,83,133,0.18)] sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9edff]">Protected operations</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em]">Admin monitoring dashboard</h1></div><div className="flex items-center gap-2 rounded-xl bg-[#062946]/25 px-4 py-3 text-sm font-bold ring-1 ring-white/25"><ShieldCheck size={17} /> {ADMIN_WORKSPACE_SECURITY_BADGE}</div></div></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metricCards.map(card => { const Icon = card.icon; return <article key={card.key} className={`rounded-xl p-5 ring-1 shadow-sm ${card.tone}`}><Icon className="h-5 w-5" /><p className="mt-5 text-3xl font-bold">{metrics[card.key].toLocaleString()}</p><h2 className="mt-1 text-sm font-bold">{card.label}</h2><p className="mt-2 text-xs leading-5 opacity-75">{card.detail}</p></article>; })}</section>
    <section className="rounded-xl border border-[#bfe4f6] bg-[linear-gradient(135deg,#f1faff,#ffffff)] p-5 shadow-[0_10px_24px_rgba(38,83,117,0.05)] sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#167ddd]">Action queue</p><h2 className="mt-1 text-xl font-bold tracking-[-0.025em] text-[#173b60]">Start with live work that needs attention</h2></div></div>
      {priorityQueue.length ? <div className="mt-5 grid gap-3 md:grid-cols-3">{priorityQueue.map(item => <Link key={item.label} href={item.href} className="group flex items-center justify-between rounded-xl border border-[#d9e9f2] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#8acbee] hover:shadow-sm"><span><strong className="text-xl text-[#173b60]">{item.count}</strong><span className="ml-2 text-sm font-bold text-[#315b7d]">{item.label}</span></span><ArrowRight className="h-4 w-4 text-[#167ddd] transition group-hover:translate-x-0.5" /></Link>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-[#c6dfe9] bg-white/70 px-4 py-4 text-sm leading-6 text-[#52718a]">No immediate review, matching, or consent queue needs attention.</div>}
    </section>
    <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-xl border border-j-border bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-j-ink">Tutor moderation queue</h2></div><UserRoundCog className="h-6 w-6 text-j-accent" /></div><div className="mt-5 flex items-center justify-between rounded-xl bg-j-surface-sunken p-4"><div><p className="text-xs font-bold uppercase tracking-wide text-j-ink-muted">Suspended profiles</p><p className="mt-1 text-xl font-bold text-j-ink">{metrics.suspendedTutors}</p></div><Link href="/admin/tutors" className="inline-flex items-center gap-1 rounded-xl bg-j-accent px-3 py-2 text-sm font-bold text-white hover:bg-j-accent-hover">Manage Tutors <ArrowRight size={15} /></Link></div></article><article className="rounded-xl border border-j-border bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-j-ink">Guardian request activity</h2><p className="mt-1 text-sm leading-6 text-j-ink-soft">Use request context for coordination. Contact detail access is deliberate and is recorded in an append-only audit trail.</p></div><ContactRound className="h-6 w-6 text-j-accent" /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-j-surface-sunken p-4"><p className="text-xs font-bold uppercase tracking-wide text-j-ink-muted">Reviewing</p><p className="mt-1 text-xl font-bold text-j-ink">{metrics.reviewingRequests}</p></div><div className="rounded-xl bg-j-surface-sunken p-4"><p className="text-xs font-bold uppercase tracking-wide text-j-ink-muted">Matched</p><p className="mt-1 text-xl font-bold text-j-ink">{metrics.matchedRequests}</p></div></div><Link href="/admin/guardians" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-j-accent hover:text-[#0d5da4]">Open Guardian activity <ArrowRight size={15} /></Link></article></section>
    <section className="rounded-xl border border-j-border bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-j-ink">Accountability activity</h2><div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-j-border p-4"><p className="text-xs font-bold uppercase tracking-wide text-j-ink-muted">Recent Tutor moderation</p>{overview.data.recentModeration.length ? <ul className="mt-3 space-y-2 text-sm text-j-ink-soft">{overview.data.recentModeration.map(event => <li key={event.id} className="flex justify-between gap-3"><span>Tutor {event.tutorId} → <strong className="capitalize">{event.nextStatus.replaceAll("_", " ")}</strong></span><time className="shrink-0 text-xs text-j-ink-muted">{new Date(event.createdAt).toLocaleString()}</time></li>)}</ul> : <p className="mt-3 text-sm text-j-ink-muted">No Tutor moderation events yet.</p>}</div><div className="rounded-xl border border-j-border p-4"><p className="text-xs font-bold uppercase tracking-wide text-j-ink-muted">Recent Guardian contact access</p>{overview.data.recentContactAccess.length ? <ul className="mt-3 space-y-2 text-sm text-j-ink-soft">{overview.data.recentContactAccess.map(event => <li key={event.id} className="flex justify-between gap-3"><span>Request #{event.tutorRequestId}</span><time className="shrink-0 text-xs text-j-ink-muted">{new Date(event.createdAt).toLocaleString()}</time></li>)}</ul> : <p className="mt-3 text-sm text-j-ink-muted">No Guardian contact disclosures yet.</p>}</div></div></section>
  </div>;
}

export default function AdminMonitoringOverview() { return <AdminWorkspaceLayout title="Admin dashboard"><OverviewContent /></AdminWorkspaceLayout>; }
