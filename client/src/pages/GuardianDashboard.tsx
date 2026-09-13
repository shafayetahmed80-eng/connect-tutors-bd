import { useSiteContact } from "@/lib/siteContent";
import DashboardLayout, { type DashboardNavigationItem } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { SiteBlocks, SiteContentProvider, SiteText, useSiteContentText } from "@/lib/siteContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuardianRequestTracking } from "@/pages/GuardianRequestTracking";
import GuardianRequestJourney from "@/pages/GuardianRequestJourney";
import { GuardianWorkspaceState } from "@/components/GuardianWorkspaceState";
import { Bell, Clock3, FileText, HelpCircle, KeyRound, LayoutDashboard, LogOut, MessageCircle, Plus, Settings, ShieldCheck, UserRound, Users } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { GuardianHireSheet } from "@/components/GuardianHireSheet";
import GuardianProfileWorkspaceBody from "@/pages/GuardianProfileWorkspace";
import { GuardianAppliedTuitionsContent, GuardianAppliedTutorsContent } from "@/pages/GuardianAppliedTutors";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const guardianDashboardNavigation: DashboardNavigationItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/guardian/dashboard", sectionLabel: "Workspace" },
  { icon: Plus, label: "Hire a tutor", path: "/guardian/dashboard/hire" },
  { icon: UserRound, label: "Profile", path: "/guardian/dashboard/profile" },
  { icon: Clock3, label: "Attendance", path: "/guardian/dashboard/attendance" },
  { icon: FileText, label: "Posted jobs", path: "/guardian/dashboard/posted-jobs" },
  { icon: Users, label: "Applied Tutors", path: "/guardian/dashboard/applied-tutors" },
  { icon: Bell, label: "Notifications", path: "/guardian/dashboard/notifications" },
  { icon: ShieldCheck, label: "Confirmation Letter", path: "/guardian/dashboard/confirmation-letter" },
  { icon: Settings, label: "Settings", path: "/guardian/dashboard/settings", sectionLabel: "Account" },
  { icon: MessageCircle, label: "Exclusively yours", path: "/guardian/dashboard/exclusive", planned: true },
  { icon: HelpCircle, label: "How it works", path: "/guardian/dashboard/how-it-works", planned: false },
  { icon: Users, label: "Join Guardian Community", path: "/guardian/dashboard/community", planned: true },
  // Last, as in the Tutor sidebar. The path is never navigated to - the layout
  // sees `action: "signout"` and signs out instead - but a nav item needs one.
  { icon: LogOut, label: "Sign Out", path: "/guardian/dashboard/sign-out", sectionLabel: "Account", action: "signout" },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "G";
}

function formatGuardianDate(value?: Date | string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function requestProgress(status: string) {
  switch (status) {
    case "reviewing": return { label: "Coordinator reviewing", detail: "A coordinator is checking the request and may contact you to confirm details.", tone: "text-amber-700 bg-amber-50 border-amber-200" };
    case "matched": return { label: "Tutor match confirmed", detail: "Your coordinator will guide the next private coordination step.", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    case "closed": return { label: "Request closed", detail: "This request is no longer active. You can submit another request when needed.", tone: "text-j-ink-soft bg-j-surface-muted border-j-border" };
    default: return { label: "Submitted", detail: "Your request is in the coordinator queue and has not yet been reviewed.", tone: "text-blue-700 bg-blue-50 border-blue-200" };
  }
}

type GuardianRequestSummary = {
  id: number;
  status: string;
  nextAction?: string;
  category?: string | null;
  classCourse?: string | null;
  createdAt?: Date | string | number | null;
};

function requestAction(request: GuardianRequestSummary) {
  if (request.nextAction === "decide_contact_consent") {
    return {
      label: "Decide coordination",
      detail: "A private coordination decision is ready for this request.",
      href: "/guardian/dashboard/posted-jobs",
    };
  }
  return {
    label: "Review request",
    detail: "See the latest private status and next guidance for this request.",
    href: "/guardian/dashboard/posted-jobs",
  };
}

function formatRequestSubmittedDate(value: Date | string | number | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function GuardianOpenRequestsPanel({
  requests,
  isLoading,
  hasError,
  onRetry,
}: {
  requests: GuardianRequestSummary[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}) {
  const openRequests = requests.filter(request => request.status !== "closed").slice(0, 3);

  return <Card role="region" aria-label="Open requests" className="rounded-xl border-j-border shadow-sm"><CardHeader><CardTitle className="text-xl font-black text-j-ink">Open requests</CardTitle></CardHeader><CardContent className="space-y-3 p-6 pt-0">
    {isLoading ? <p className="text-sm text-j-ink-soft">Loading your private requests…</p> : null}
    {!isLoading && hasError ? <div className="rounded-xl border border-rose-100 bg-rose-50 p-4"><p className="font-extrabold text-rose-950">We could not load your requests</p><p className="mt-1 text-sm leading-5 text-rose-900">Your private request status is not available right now. Please try again.</p><Button type="button" variant="outline" onClick={onRetry} className="mt-3 border-rose-200 bg-white text-rose-800 hover:bg-rose-100">Try again</Button></div> : null}
    {!isLoading && !hasError && openRequests.length === 0 ? <div className="rounded-xl border border-dashed border-j-field-border bg-j-surface-sunken p-5"><p className="font-extrabold text-j-ink">No open requests yet</p><Link href="/guardian/dashboard/hire" className="mt-4 inline-flex rounded-xl bg-[#1677c8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0e4f85] focus:outline-none focus:ring-2 focus:ring-[#1677c8]">Hire a tutor</Link></div> : null}
    {!isLoading && !hasError ? openRequests.map(request => {
      const progress = requestProgress(request.status);
      const action = requestAction(request);
      const submittedDate = formatRequestSubmittedDate(request.createdAt);
      const learningNeed = [request.category, request.classCourse].filter(Boolean).join(" · ");
      return <article key={request.id} className={`rounded-xl border p-4 ${progress.tone}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-extrabold text-j-ink">Request #{request.id} · {progress.label}</p>{learningNeed ? <p className="mt-1 text-sm leading-5 text-j-ink-soft">{learningNeed}</p> : null}{submittedDate ? <p className="mt-1 text-xs text-j-ink-soft">Submitted {submittedDate}</p> : null}</div><Link href={action.href} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-[#0e4f85] shadow-sm ring-1 ring-inset ring-j-border transition hover:bg-j-surface-sunken focus:outline-none focus:ring-2 focus:ring-[#1677c8]">{action.label}</Link></div><p className="mt-3 text-sm leading-5">{progress.detail}</p></article>;
    }) : null}
  </CardContent></Card>;
}

function GuardianSidebarIdentity() {
  const profileQuery = trpc.guardianProfile.me.useQuery();
  const photoQuery = trpc.guardianProfile.photo.useQuery();
  const profile = profileQuery.data;
  const photoUrl = photoQuery.data?.photoUrl ?? null;
  const name = profile?.name || "Guardian";
  return <div className="rounded-xl bg-[#f4f9fd] p-3 text-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0" aria-label="Guardian account identity">
    <div className="mx-auto grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#1677c8] text-lg font-black text-white group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:text-2xs">{photoUrl ? <img src={photoUrl} alt="Guardian profile photo" className="size-full object-cover" /> : initials(name)}</div>
    <div className="mt-2.5 group-data-[collapsible=icon]:hidden">
      <p className="truncate text-sm font-extrabold text-j-ink">{name}</p>
      <p className="truncate text-xs text-j-ink-soft">{profile?.email || "Private account"}</p>
      <div className="mt-2.5 space-y-0.5 border-t border-[#dbe9f2] pt-2 text-2xs text-j-ink-soft">
        <p><span className="font-bold text-j-ink">Guardian ID:</span> {profile?.guardianId || "Loading…"}</p>
        <p><span className="font-bold text-j-ink">Created:</span> {formatGuardianDate(profile?.accountCreatedAt)}</p>
      </div>
    </div>
  </div>;
}

function GuardianProfileWorkspace() {
  // Provider scoped to this section: the rest of the dashboard has no slots yet.
  return <SiteContentProvider page="guardian-profile">
    <div className="space-y-6">
      <SiteBlocks anchorId="guardian-profile.top" />
      <GuardianProfileWorkspaceBody />
    </div>
  </SiteContentProvider>;
}

function GuardianSettingsPanel() {
  const contact = useSiteContact();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const mutation = trpc.guardianProfile.changePassword.useMutation({
    onSuccess: () => { setForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" }); toast.success("Password changed. Use your new password next time you sign in."); },
    onError: error => toast.error(error.message),
  });
  return <div className="space-y-6"><Card className="rounded-xl border-j-border shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-xl font-black text-j-ink"><KeyRound className="size-5 text-[#1677c8]" /> Change password</CardTitle></CardHeader><CardContent className="p-7 pt-0"><form className="grid max-w-xl gap-5" onSubmit={event => { event.preventDefault(); mutation.mutate(form); }}><label className="grid gap-2 text-sm font-bold text-j-ink-strong">Current password<input required type="password" autoComplete="current-password" value={form.currentPassword} onChange={event => setForm(current => ({ ...current, currentPassword: event.target.value }))} className="rounded-xl border border-j-field-border px-3 py-2.5 outline-none ring-[#1677c8] focus:ring-2" /></label><label className="grid gap-2 text-sm font-bold text-j-ink-strong">New password<input required minLength={8} type="password" autoComplete="new-password" value={form.newPassword} onChange={event => setForm(current => ({ ...current, newPassword: event.target.value }))} className="rounded-xl border border-j-field-border px-3 py-2.5 outline-none ring-[#1677c8] focus:ring-2" /></label><label className="grid gap-2 text-sm font-bold text-j-ink-strong">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={form.confirmNewPassword} onChange={event => setForm(current => ({ ...current, confirmNewPassword: event.target.value }))} className="rounded-xl border border-j-field-border px-3 py-2.5 outline-none ring-[#1677c8] focus:ring-2" /></label><Button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending} data-motion={mutation.isPending ? "pending" : undefined} className="w-fit bg-[#1677c8] hover:bg-[#0e4f85]">{mutation.isPending ? "Changing…" : "Change password"}</Button></form><div className="mt-7 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-950"><p className="font-extrabold">Phone and email changes</p><p className="mt-1">Contact us on WhatsApp at <a className="font-bold underline" href={contact.whatsapp()} target="_blank" rel="noreferrer">01516 131 411</a>.</p></div></CardContent></Card></div>;
}

function GuardianHowItWorksPanel() {
  const contact = useSiteContact();
  const steps = [["1", "Submit a private request", "Share the student’s learning needs, schedule, budget, City, and area. You can review the request before submission."], ["2", "Coordinator review", "Our team checks the request and may call you to confirm or clarify information before any publication."], ["3", "Job Board publication", "If suitable and confirmed, an Admin may publish a privacy-safe tuition opportunity. Your phone, email, exact address, student identity, and notes are never public."], ["4", "Tutor coordination", "Interested Tutors are reviewed by the Admin team. If a match is ready, you decide whether coordination contact may proceed."], ["5", "Next steps", "Your coordinator guides the private next step. Attendance, payment, and session records are not part of this first release."]];
  return <div className="space-y-6"><Card className="rounded-xl border-j-border shadow-sm"><CardContent className="divide-y divide-j-border p-7">{steps.map(([number, title, detail]) => <div key={number} className="flex gap-4 py-5 first:pt-0 last:pb-0"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-sm font-black text-[#1677c8]">{number}</div><div><h2 className="font-extrabold text-j-ink">{title}</h2><p className="mt-1 text-sm leading-6 text-j-ink-soft">{detail}</p></div></div>)}</CardContent></Card><Card className="rounded-xl border-sky-100 bg-sky-50 shadow-sm"><CardContent className="p-6"><p className="font-extrabold text-sky-950">Need help with a request?</p><a href={contact.whatsapp()} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl bg-[#1677c8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0e4f85]">Contact support on WhatsApp</a></CardContent></Card></div>;
}

function formatNotificationDate(value: Date | string | number | null | undefined) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function GuardianNotificationInbox() {
  const utils = trpc.useUtils();
  const notificationsQuery = trpc.guardianNotifications.mine.useQuery({ limit: 20 });
  const unreadCountQuery = trpc.guardianNotifications.unreadCount.useQuery();
  const markReadMutation = trpc.guardianNotifications.markRead.useMutation({
    onSuccess: async () => { await Promise.all([utils.guardianNotifications.mine.invalidate(), utils.guardianNotifications.unreadCount.invalidate()]); },
    onError: error => toast.error(error.message),
  });
  const markAllReadMutation = trpc.guardianNotifications.markAllRead.useMutation({
    onSuccess: async () => { await Promise.all([utils.guardianNotifications.mine.invalidate(), utils.guardianNotifications.unreadCount.invalidate()]); toast.success("All notifications have been marked as read."); },
    onError: error => toast.error(error.message),
  });
  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;
  return <div className="space-y-6">{unreadCount > 0 ? <div className="flex justify-end"><Button type="button" variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} aria-busy={markAllReadMutation.isPending}>{markAllReadMutation.isPending ? "Updating…" : `Mark all read (${unreadCount})`}</Button></div> : null}<Card className="rounded-xl border-j-border shadow-sm"><CardContent className="p-0">{notificationsQuery.isLoading ? <div className="p-7 text-sm text-j-ink-soft">Loading your private notifications…</div> : null}{notificationsQuery.error ? <div className="p-7"><GuardianWorkspaceState kind="error" title="Notifications are temporarily unavailable" message="Please try again. Your request details remain private." onRetry={() => { void notificationsQuery.refetch(); }} /></div> : null}{!notificationsQuery.isLoading && !notificationsQuery.error && notifications.length === 0 ? <div className="p-8 text-center"><Bell className="mx-auto size-8 text-[#1677c8]" /><h2 className="mt-4 text-lg font-black text-j-ink">No notifications yet</h2></div> : null}{!notificationsQuery.isLoading && !notificationsQuery.error && notifications.length > 0 ? <div className="divide-y divide-j-border">{notifications.map(notification => <Link key={notification.id} href={notification.actionPath} onClick={() => { if (!notification.readAt) markReadMutation.mutate({ notificationId: notification.id }); }} className={`block p-5 transition hover:bg-j-surface-sunken focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1677c8] ${notification.readAt ? "bg-white" : "bg-sky-50/70"}`}><div className="flex items-start gap-3"><div className={`mt-1 grid size-9 shrink-0 place-items-center rounded-xl ${notification.readAt ? "bg-j-surface-muted text-j-ink-soft" : "bg-[#dff2ff] text-[#1677c8]"}`}><Bell className="size-4" aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><p className="font-extrabold text-j-ink">{notification.title}</p><time className="text-xs font-medium text-j-ink-muted">{formatNotificationDate(notification.createdAt)}</time></div><p className="mt-1 text-sm leading-6 text-j-ink-soft">{notification.message}</p>{notification.followUpKind ? <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#0e4f85]">Action requested</p> : null}</div>{!notification.readAt ? <span className="mt-1 size-2 shrink-0 rounded-full bg-[#1677c8]" aria-label="Unread" /> : null}</div></Link>)}</div> : null}</CardContent></Card></div>;
}

function GuardianConfirmationLetterDownloadButton({ letterId }: { letterId: number }) {
  const downloadQuery = trpc.confirmationLetters.download.useQuery({ letterId }, { enabled: false, retry: false });
  const requestDownload = async () => {
    const result = await downloadQuery.refetch();
    if (result.data?.downloadUrl) window.open(result.data.downloadUrl, "_blank", "noopener,noreferrer");
    else if (result.error) toast.error(result.error.message);
  };
  return <Button type="button" variant="outline" className="shrink-0" disabled={downloadQuery.isFetching} aria-busy={downloadQuery.isFetching} data-motion={downloadQuery.isFetching ? "pending" : undefined} onClick={() => { void requestDownload(); }}><FileText className="size-4" /> {downloadQuery.isFetching ? "Preparing…" : "View PDF"}</Button>;
}

function GuardianConfirmationLetterPanel() {
  const lettersQuery = trpc.confirmationLetters.guardianMine.useQuery();
  const letters = lettersQuery.data ?? [];
  return <div className="space-y-6"><Card className="rounded-xl border-j-border shadow-sm"><CardContent className="p-0">{lettersQuery.isLoading ? <div className="p-7 text-sm text-j-ink-soft">Loading your private confirmation letters…</div> : null}{lettersQuery.error ? <div className="p-7"><GuardianWorkspaceState kind="error" title="Confirmation letters are temporarily unavailable" message="Please try again. Your private request information remains protected." onRetry={() => { void lettersQuery.refetch(); }} /></div> : null}{!lettersQuery.isLoading && !lettersQuery.error && letters.length === 0 ? <div className="p-8 text-center"><ShieldCheck className="mx-auto size-8 text-[#1677c8]" /><h2 className="mt-4 text-lg font-black text-j-ink">No issued letter yet</h2><Link href="/guardian/dashboard/posted-jobs" className="mt-5 inline-flex"><Button variant="outline">Review posted jobs</Button></Link></div> : null}{!lettersQuery.isLoading && !lettersQuery.error && letters.length > 0 ? <div className="divide-y divide-j-border">{letters.map(letter => <div key={letter.id} className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold text-j-ink">Letter {letter.letterNumber}</p><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${letter.status === "issued" ? "bg-emerald-50 text-emerald-800" : "bg-j-surface-muted text-j-ink-soft"}`}>{letter.status === "issued" ? "Issued" : "Superseded"}</span><span className="text-xs font-semibold text-j-ink-muted">Version {letter.version}</span></div><p className="mt-2 text-sm leading-6 text-j-ink-soft">Issued {formatGuardianDate(letter.issuedAt)}. This bilingual document confirms the approved tutor-match schedule.</p>{letter.supersededAt ? <p className="mt-2 text-xs font-semibold text-amber-800">A later request change superseded this record on {formatGuardianDate(letter.supersededAt)}.</p> : null}</div>{letter.status === "issued" ? <GuardianConfirmationLetterDownloadButton letterId={letter.id} /> : null}</div></div>)}</div> : null}</CardContent></Card></div>;
}

export function GuardianDashboardContent({ section, requestId }: { section?: string; requestId?: number }) {
  const [, navigate] = useLocation();
  const requestsQuery = trpc.tutorRequests.mine.useQuery();
  const requests = requestsQuery.data ?? [];
  const sectionLabel = section ? guardianDashboardNavigation.find(item => item.path.endsWith(`/${section}`))?.label : "Dashboard";
  // The sheet is named from the Admin panel, like the headings inside it.
  const hireSheetTitle = useSiteContentText("request-tutor.sheet.title", "Hire a tutor");

  if (section && section !== "hire" && section !== "profile" && section !== "posted-jobs" && section !== "applied-tutors" && section !== "notifications" && section !== "confirmation-letter" && section !== "attendance" && section !== "settings" && section !== "how-it-works") {
    return <div className="space-y-6"><GuardianWorkspaceState kind="planned" title={`${sectionLabel} is coming soon`} message="This Guardian workspace section is planned and will be introduced after its data and privacy rules are ready." /><Card className="rounded-xl border-j-border shadow-sm"><CardContent className="flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold text-j-ink">Need help now?</p></div><div className="flex flex-wrap gap-3"><Link href="/guardian/dashboard/hire"><Button className="bg-[#1677c8] hover:bg-[#0e4f85]">Hire a tutor</Button></Link><Link href="/guardian/requests"><Button variant="outline">View requests</Button></Link></div></CardContent></Card></div>;
  }

  if (section === "hire") {
    return <>
      <div className="space-y-6"><GuardianRequestTracking embedded /></div>
      <GuardianHireSheet title={hireSheetTitle} onClose={() => navigate("/guardian/dashboard/posted-jobs")}>
        <GuardianRequestJourney embedded />
      </GuardianHireSheet>
    </>;
  }

  if (section === "profile") return <GuardianProfileWorkspace />;

  if (section === "settings") return <GuardianSettingsPanel />;

  if (section === "how-it-works") return <GuardianHowItWorksPanel />;

  if (section === "notifications") return <GuardianNotificationInbox />;

  if (section === "confirmation-letter") return <GuardianConfirmationLetterPanel />;

  // The tab lands on the tuitions that can have applicants; one of them opens its list.
  if (section === "applied-tutors") {
    return requestId
      ? <GuardianAppliedTutorsContent requestId={requestId} />
      : <GuardianAppliedTuitionsContent requests={requests} isLoading={requestsQuery.isLoading} isError={requestsQuery.isError} />;
  }

  if (section === "posted-jobs") {
    return <div className="space-y-6"><GuardianRequestTracking embedded detailRequestId={requestId} /></div>;
  }

  if (section === "attendance") {
    const hasConfirmedMatch = requests.some(request => request.status === "matched");
    return <div className="space-y-6"><Card className="rounded-xl border-sky-100 bg-gradient-to-br from-[#f3faff] to-white shadow-sm"><CardContent className="p-7 sm:p-9"><div className="flex max-w-2xl gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#dff2ff] text-[#1677c8]"><Clock3 className="size-6" /></div><div><h2 className="text-xl font-black text-j-ink">{hasConfirmedMatch ? "Attendance setup is not available yet" : "Available after a Tutor is confirmed"}</h2><p className="mt-3 text-sm leading-6 text-j-ink-soft">{hasConfirmedMatch ? "A Tutor match has been recorded, but this version does not create an attendance schedule, percentage, payment record, or session log. Your coordinator will guide the next step privately." : "Once a Tutor is confirmed for your request, the coordinator will guide the next step. This version does not show attendance schedules, percentages, payments, or session records."}</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/guardian/dashboard/posted-jobs"><Button className="bg-[#1677c8] hover:bg-[#0e4f85]">Review posted jobs</Button></Link><Link href="/guardian/dashboard/hire"><Button variant="outline">Hire a tutor</Button></Link></div></div></div></CardContent></Card></div>;
  }

  // Dashboard home content intentionally cleared — a new layout will be added to spec.
  return <div data-testid="guardian-dashboard-home" className="space-y-6" />;
}

/**
 * The Guardian's line in the workspace header. Same two queries the sidebar
 * identity already runs, so the header costs no extra round trip.
 */
function useGuardianWorkspaceHeader() {
  const profileQuery = trpc.guardianProfile.me.useQuery();
  const photoQuery = trpc.guardianProfile.photo.useQuery();
  const profile = profileQuery.data;
  return {
    portal: "Guardian Portal",
    name: profile?.name || "Guardian",
    profilePhotoUrl: photoQuery.data?.photoUrl ?? null,
    details: profile?.guardianId ? [{ label: "Guardian ID", value: profile.guardianId }] : [],
  };
}

export default function GuardianDashboard() {
  const [, detailParams] = useRoute<{ section?: string; requestId?: string }>("/guardian/dashboard/:section/:requestId");
  const [, params] = useRoute<{ section?: string }>("/guardian/dashboard/:section");
  const section = detailParams?.section ?? params?.section;
  const requestId = detailParams?.requestId ? Number(detailParams.requestId) : undefined;
  const workspaceHeader = useGuardianWorkspaceHeader();
  return <DashboardLayout workspaceHeader={workspaceHeader} title="Guardian workspace" loginPath="/auth" navigationItems={guardianDashboardNavigation} sidebarIdentity={<GuardianSidebarIdentity />} sidebarPanel="guardian"><GuardianDashboardContent section={section} requestId={Number.isFinite(requestId) ? requestId : undefined} /></DashboardLayout>;
}
