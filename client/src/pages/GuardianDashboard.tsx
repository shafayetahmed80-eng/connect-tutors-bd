import DashboardLayout, { type DashboardNavigationItem } from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuardianRequestTracking } from "@/pages/GuardianRequestTracking";
import GuardianRequestJourney from "@/pages/GuardianRequestJourney";
import { GuardianWorkspaceSkeleton, GuardianWorkspaceState } from "@/components/GuardianWorkspaceState";
import { Bell, Clock3, FileText, HelpCircle, ImagePlus, KeyRound, LayoutDashboard, MapPin, MessageCircle, Plus, Settings, ShieldCheck, Trash2, UserRound, Users } from "lucide-react";
import { Link, useRoute } from "wouter";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const guardianDashboardNavigation: DashboardNavigationItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/guardian/dashboard", sectionLabel: "Workspace" },
  { icon: Plus, label: "Hire a tutor", path: "/guardian/dashboard/hire" },
  { icon: UserRound, label: "Profile", path: "/guardian/dashboard/profile" },
  { icon: Clock3, label: "Attendance", path: "/guardian/dashboard/attendance" },
  { icon: FileText, label: "Posted jobs", path: "/guardian/dashboard/posted-jobs" },
  { icon: Bell, label: "Notifications", path: "/guardian/dashboard/notifications" },
  { icon: ShieldCheck, label: "Confirmation Letter", path: "/guardian/dashboard/confirmation-letter" },
  { icon: Settings, label: "Settings", path: "/guardian/dashboard/settings", sectionLabel: "Account" },
  { icon: MessageCircle, label: "Exclusively yours", path: "/guardian/dashboard/exclusive", planned: true },
  { icon: HelpCircle, label: "How it works", path: "/guardian/dashboard/how-it-works", planned: false },
  { icon: Users, label: "Join Guardian Community", path: "/guardian/dashboard/community", planned: true },
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
    case "closed": return { label: "Request closed", detail: "This request is no longer active. You can submit another request when needed.", tone: "text-slate-700 bg-slate-100 border-slate-200" };
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

function GuardianOpenRequestsPanel({
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

  return <Card role="region" aria-label="Open requests" className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-xl font-black text-slate-950">Open requests</CardTitle></CardHeader><CardContent className="space-y-3 p-6 pt-0">
    {isLoading ? <p className="text-sm text-slate-600">Loading your private requests…</p> : null}
    {!isLoading && hasError ? <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4"><p className="font-extrabold text-rose-950">We could not load your requests</p><p className="mt-1 text-sm leading-5 text-rose-900">Your private request status is not available right now. Please try again.</p><Button type="button" variant="outline" onClick={onRetry} className="mt-3 border-rose-200 bg-white text-rose-800 hover:bg-rose-100">Try again</Button></div> : null}
    {!isLoading && !hasError && openRequests.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5"><p className="font-extrabold text-slate-950">No open requests yet</p><p className="mt-1 text-sm leading-6 text-slate-600">Start a private tutor request whenever you are ready.</p><Link href="/guardian/dashboard/hire" className="mt-4 inline-flex rounded-xl bg-[#1677c8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0e4f85] focus:outline-none focus:ring-2 focus:ring-[#1677c8]">Hire a tutor</Link></div> : null}
    {!isLoading && !hasError ? openRequests.map(request => {
      const progress = requestProgress(request.status);
      const action = requestAction(request);
      const submittedDate = formatRequestSubmittedDate(request.createdAt);
      const learningNeed = [request.category, request.classCourse].filter(Boolean).join(" · ");
      return <article key={request.id} className={`rounded-2xl border p-4 ${progress.tone}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-extrabold text-slate-950">Request #{request.id} · {progress.label}</p>{learningNeed ? <p className="mt-1 text-sm leading-5 text-slate-700">{learningNeed}</p> : null}{submittedDate ? <p className="mt-1 text-xs text-slate-600">Submitted {submittedDate}</p> : null}</div><Link href={action.href} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-[#0e4f85] shadow-sm ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1677c8]">{action.label}</Link></div><p className="mt-3 text-sm leading-5">{progress.detail}</p></article>;
    }) : null}
  </CardContent></Card>;
}

function GuardianSidebarIdentity() {
  const profileQuery = trpc.guardianProfile.me.useQuery();
  const photoQuery = trpc.guardianProfile.photo.useQuery();
  const profile = profileQuery.data;
  const approvedPhotoUrl = photoQuery.data?.photoStatus === "approved" ? photoQuery.data.photoUrl : null;
  const name = profile?.name || "Guardian";
  return <div className="rounded-2xl bg-[#f4f9fd] p-3 group-data-[collapsible=icon]:p-1.5" aria-label="Guardian account identity">
    <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"><div className="grid size-10 shrink-0 overflow-hidden rounded-xl bg-[#1677c8] text-sm font-black text-white">{approvedPhotoUrl ? <img src={approvedPhotoUrl} alt="Approved Guardian profile photo" className="size-full object-cover" /> : initials(name)}</div><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-extrabold text-slate-950">{name}</p><p className="truncate text-xs text-slate-600">{profile?.email || "Private account"}</p></div></div>
    <div className="mt-3 space-y-1.5 text-xs text-slate-600 group-data-[collapsible=icon]:hidden"><p><span className="font-bold text-slate-700">Guardian ID:</span> {profile?.guardianId || "Loading…"}</p><p><span className="font-bold text-slate-700">Created:</span> {formatGuardianDate(profile?.accountCreatedAt)}</p></div>
  </div>;
}

function GuardianProfilePanel() {
  const profileQuery = trpc.guardianProfile.me.useQuery();
  const locationsQuery = trpc.locations.list.useQuery();
  const utils = trpc.useUtils();
  const profile = profileQuery.data;
  const [form, setForm] = useState({ name: "", gender: "female" as "male" | "female", cityLocationId: "", locationId: "" });

  useEffect(() => {
    if (!profile) return;
    setForm({ name: profile.name ?? "", gender: profile.gender ?? "female", cityLocationId: profile.cityLocationId ?? "", locationId: profile.locationId ?? "" });
  }, [profile]);

  const locations = locationsQuery.data ?? [];
  const cities = useMemo(() => locations.filter(location => location.type === "city"), [locations]);
  const areas = useMemo(() => locations.filter(location => location.parentId === form.cityLocationId), [locations, form.cityLocationId]);
  const updateMutation = trpc.guardianProfile.update.useMutation({
    onSuccess: async () => { await utils.guardianProfile.me.invalidate(); toast.success("Your Guardian profile has been updated."); },
    onError: error => toast.error(error.message),
  });

  if (profileQuery.isLoading) return <GuardianWorkspaceSkeleton label="Loading your private Guardian profile" />;
  if (profileQuery.error) return <GuardianWorkspaceState kind="error" title="Profile is temporarily unavailable" message="We could not load your private profile details. Please try again." onRetry={() => { void profileQuery.refetch(); }} />;
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1677c8]">Guardian workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Profile</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Update the account details used to coordinate your tutor requests. Your email and mobile remain protected login/contact details.</p></div><Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-7"><form className="grid gap-5 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); updateMutation.mutate(form); }}><label className="grid gap-2 text-sm font-bold text-slate-800 sm:col-span-2">Full name<input required minLength={2} maxLength={120} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 font-medium outline-none ring-[#1677c8] focus:ring-2" /></label><label className="grid gap-2 text-sm font-bold text-slate-800">Guardian ID<input value={profile?.guardianId || ""} readOnly aria-readonly className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-600" /></label><label className="grid gap-2 text-sm font-bold text-slate-800">Gender<select value={form.gender} onChange={event => setForm(current => ({ ...current, gender: event.target.value as "male" | "female" }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-medium outline-none ring-[#1677c8] focus:ring-2"><option value="female">Female</option><option value="male">Male</option></select></label><label className="grid gap-2 text-sm font-bold text-slate-800">City<select required value={form.cityLocationId} onChange={event => setForm(current => ({ ...current, cityLocationId: event.target.value, locationId: "" }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-medium outline-none ring-[#1677c8] focus:ring-2"><option value="">Select city</option>{cities.map(city => <option key={city.id} value={city.id}>{city.label}</option>)}</select></label><label className="grid gap-2 text-sm font-bold text-slate-800">Location<select required value={form.locationId} onChange={event => setForm(current => ({ ...current, locationId: event.target.value }))} disabled={!form.cityLocationId} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-medium outline-none ring-[#1677c8] focus:ring-2 disabled:bg-slate-100"><option value="">Select location</option>{areas.map(area => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label><div className="sm:col-span-2 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5"><Button type="submit" disabled={updateMutation.isPending} aria-busy={updateMutation.isPending} data-motion={updateMutation.isPending ? "pending" : undefined} className="bg-[#1677c8] hover:bg-[#0e4f85]">{updateMutation.isPending ? "Saving…" : "Save profile"}</Button><p className="text-xs leading-5 text-slate-500">For a mobile or email change, contact support so verification can be completed safely.</p></div></form></CardContent></Card></div>;
}

function GuardianPhotoPanel() {
  const profileQuery = trpc.guardianProfile.me.useQuery();
  const photoQuery = trpc.guardianProfile.photo.useQuery();
  const utils = trpc.useUtils();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const photo = photoQuery.data;
  const photoStatus = photo?.photoStatus ?? "no_photo";
  const photoUrl = photo?.photoUrl ?? null;
  const rejectionReason = photo?.rejectionReason ?? null;
  const moderationNote = photo?.moderationNote ?? null;

  const uploadPhoto = async (file: File) => {
    const acceptedTypes = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(file.type.toLowerCase())) {
      setFeedback({ type: "error", message: "Choose a JPEG, PNG, or WebP image. HEIC images are not supported." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Profile photos must be 5 MB or smaller." });
      return;
    }
    setFeedback(null);
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append("photo", file);
      const response = await fetch("/api/guardian/profile-photo", { method: "POST", body: data, credentials: "same-origin" });
      const result = await response.json().catch(() => ({})) as { error?: string; photoStatus?: string };
      if (!response.ok || result.photoStatus !== "pending_review") throw new Error(result.error || "Unable to upload the profile photo.");
      await utils.guardianProfile.photo.invalidate();
      setFeedback({ type: "success", message: "Your profile photo was submitted for Admin review. It will replace your initials after approval." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to upload the profile photo." });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!photo || !window.confirm("Remove this profile photo? Your Guardian identity header will use initials until another photo is approved.")) return;
    setFeedback(null);
    setIsUploading(true);
    try {
      const response = await fetch("/api/guardian/profile-photo", { method: "DELETE", credentials: "same-origin" });
      const result = await response.json().catch(() => ({})) as { error?: string; photoStatus?: string };
      if (!response.ok || result.photoStatus !== "no_photo") throw new Error(result.error || "Unable to remove the profile photo.");
      await utils.guardianProfile.photo.invalidate();
      setFeedback({ type: "success", message: "Your profile photo was removed. Your Guardian identity header now uses initials." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to remove the profile photo." });
    } finally {
      setIsUploading(false);
    }
  };

  const status = photoStatus === "approved"
    ? { title: "Photo approved", detail: "Your approved photo is shown in the Guardian identity header. It is not shown on the public Job Board.", tone: "border-emerald-200 bg-emerald-50 text-emerald-950" }
    : photoStatus === "pending_review"
      ? { title: "Photo pending Admin review", detail: "This private preview is not shown in the Guardian identity header until it is approved.", tone: "border-amber-200 bg-amber-50 text-amber-950" }
      : photoStatus === "rejected"
        ? { title: "Photo needs replacement", detail: moderationNote || "Please upload a clear, recent portrait that follows the photo guidelines.", tone: "border-rose-200 bg-rose-50 text-rose-950" }
        : { title: "No profile photo yet", detail: "Upload a clear, recent portrait. Your initials remain visible until an Admin approves the photo.", tone: "border-sky-200 bg-sky-50 text-sky-950" };
  const photoAlt = photoStatus === "approved" ? "Approved Guardian profile photo" : photoStatus === "pending_review" ? "Guardian photo pending review" : "Guardian photo awaiting replacement";
  const uploadLabel = photoStatus === "rejected" ? "Upload a new profile photo" : photoUrl ? "Replace profile photo" : "Upload profile photo";

  return <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950"><ImagePlus className="size-5 text-[#1677c8]" /> Profile photo</CardTitle></CardHeader><CardContent className="p-7 pt-0"><div className="grid gap-6 sm:grid-cols-[8rem_1fr]"><div className="grid aspect-square size-32 place-items-center overflow-hidden rounded-3xl border border-dashed border-sky-200 bg-[#f4f9fd] text-2xl font-black text-[#1677c8]">{photoUrl ? <img src={photoUrl} alt={photoAlt} className="size-full object-cover" /> : initials(profileQuery.data?.name || "Guardian")}</div><div className="min-w-0"><div className={`rounded-2xl border p-4 text-sm leading-6 ${status.tone}`}><p className="font-extrabold">{status.title}</p><p className="mt-1">{status.detail}</p>{photoStatus === "rejected" && rejectionReason ? <p className="mt-2 text-xs font-semibold">Reason: {rejectionReason.replaceAll("_", " ")}</p> : null}</div><input ref={photoInputRef} className="sr-only" id="guardian-profile-photo" type="file" accept="image/jpeg,image/jpg,image/pjpeg,image/png,image/webp" aria-label="Upload Guardian profile photo" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadPhoto(file); }} /><div className="mt-4 flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={isUploading} aria-busy={isUploading} data-motion={isUploading ? "pending" : undefined} onClick={() => photoInputRef.current?.click()} className="border-[#9dcde7] text-[#1677c8]"><ImagePlus className="size-4" /> {isUploading ? "Uploading…" : uploadLabel}</Button>{photoUrl ? <Button type="button" variant="ghost" disabled={isUploading} aria-busy={isUploading} data-motion={isUploading ? "pending" : undefined} onClick={() => void removePhoto()} className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"><Trash2 className="size-4" /> Remove photo</Button> : null}</div><p className="mt-3 text-xs leading-5 text-slate-500">JPEG, PNG, or WebP only; up to 5 MB; minimum 300 × 300 pixels. Uploads are private and must be approved before they appear in your Guardian identity header.</p>{feedback ? <p role="status" className={`mt-3 text-sm font-semibold ${feedback.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>{feedback.message}</p> : null}</div></div></CardContent></Card>;
}

function GuardianProfileWorkspace() {
  return <div className="space-y-6"><GuardianProfilePanel /><GuardianPhotoPanel /></div>;
}

function GuardianSettingsPanel() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const mutation = trpc.guardianProfile.changePassword.useMutation({
    onSuccess: () => { setForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" }); toast.success("Password changed. Use your new password next time you sign in."); },
    onError: error => toast.error(error.message),
  });
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1677c8]">Account settings</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Use your current password to protect this change. We never display or store your password in the workspace.</p></div><Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950"><KeyRound className="size-5 text-[#1677c8]" /> Change password</CardTitle></CardHeader><CardContent className="p-7 pt-0"><form className="grid max-w-xl gap-5" onSubmit={event => { event.preventDefault(); mutation.mutate(form); }}><label className="grid gap-2 text-sm font-bold text-slate-800">Current password<input required type="password" autoComplete="current-password" value={form.currentPassword} onChange={event => setForm(current => ({ ...current, currentPassword: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none ring-[#1677c8] focus:ring-2" /></label><label className="grid gap-2 text-sm font-bold text-slate-800">New password<input required minLength={8} type="password" autoComplete="new-password" value={form.newPassword} onChange={event => setForm(current => ({ ...current, newPassword: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none ring-[#1677c8] focus:ring-2" /><span className="text-xs font-medium text-slate-500">Use at least 8 characters.</span></label><label className="grid gap-2 text-sm font-bold text-slate-800">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={form.confirmNewPassword} onChange={event => setForm(current => ({ ...current, confirmNewPassword: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none ring-[#1677c8] focus:ring-2" /></label><Button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending} data-motion={mutation.isPending ? "pending" : undefined} className="w-fit bg-[#1677c8] hover:bg-[#0e4f85]">{mutation.isPending ? "Changing…" : "Change password"}</Button></form><div className="mt-7 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-950"><p className="font-extrabold">Phone and email changes</p><p className="mt-1">To protect your account, phone and email changes require support-assisted verification. Contact us on WhatsApp at <a className="font-bold underline" href="https://wa.me/8801516131411" target="_blank" rel="noreferrer">01516 131 411</a>.</p></div></CardContent></Card></div>;
}

function GuardianHowItWorksPanel() {
  const steps = [["1", "Submit a private request", "Share the student’s learning needs, schedule, budget, City, and area. You can review the request before submission."], ["2", "Coordinator review", "Our team checks the request and may call you to confirm or clarify information before any publication."], ["3", "Job Board publication", "If suitable and confirmed, an Admin may publish a privacy-safe tuition opportunity. Your phone, email, exact address, student identity, and notes are never public."], ["4", "Tutor coordination", "Interested Tutors are reviewed by the Admin team. If a match is ready, you decide whether coordination contact may proceed."], ["5", "Next steps", "Your coordinator guides the private next step. Attendance, payment, and session records are not part of this first release."]];
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1677c8]">Guardian guidance</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">How it works</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A clear view of the matching journey and the privacy protections around your request.</p></div><Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="divide-y divide-slate-100 p-7">{steps.map(([number, title, detail]) => <div key={number} className="flex gap-4 py-5 first:pt-0 last:pb-0"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-sm font-black text-[#1677c8]">{number}</div><div><h2 className="font-extrabold text-slate-950">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p></div></div>)}</CardContent></Card><Card className="rounded-3xl border-sky-100 bg-sky-50 shadow-sm"><CardContent className="p-6"><p className="font-extrabold text-sky-950">Need help with a request?</p><p className="mt-1 text-sm leading-6 text-sky-900">Our support team can help you understand the current request status without exposing private details.</p><a href="https://wa.me/8801516131411" target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl bg-[#1677c8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0e4f85]">Contact support on WhatsApp</a></CardContent></Card></div>;
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
  return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1677c8]">Guardian workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Notifications</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Private updates about your tutor request and any action needed from you.</p></div>{unreadCount > 0 ? <Button type="button" variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} aria-busy={markAllReadMutation.isPending}>{markAllReadMutation.isPending ? "Updating…" : `Mark all read (${unreadCount})`}</Button> : null}</div><Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-0">{notificationsQuery.isLoading ? <div className="p-7 text-sm text-slate-600">Loading your private notifications…</div> : null}{notificationsQuery.error ? <div className="p-7"><GuardianWorkspaceState kind="error" title="Notifications are temporarily unavailable" message="Please try again. Your request details remain private." onRetry={() => { void notificationsQuery.refetch(); }} /></div> : null}{!notificationsQuery.isLoading && !notificationsQuery.error && notifications.length === 0 ? <div className="p-8 text-center"><Bell className="mx-auto size-8 text-[#1677c8]" /><h2 className="mt-4 text-lg font-black text-slate-950">No notifications yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">When your request status changes or a coordinator needs something from you, the update will appear here.</p></div> : null}{!notificationsQuery.isLoading && !notificationsQuery.error && notifications.length > 0 ? <div className="divide-y divide-slate-100">{notifications.map(notification => <Link key={notification.id} href={notification.actionPath} onClick={() => { if (!notification.readAt) markReadMutation.mutate({ notificationId: notification.id }); }} className={`block p-5 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1677c8] ${notification.readAt ? "bg-white" : "bg-sky-50/70"}`}><div className="flex items-start gap-3"><div className={`mt-1 grid size-9 shrink-0 place-items-center rounded-xl ${notification.readAt ? "bg-slate-100 text-slate-600" : "bg-[#dff2ff] text-[#1677c8]"}`}><Bell className="size-4" aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><p className="font-extrabold text-slate-950">{notification.title}</p><time className="text-xs font-medium text-slate-500">{formatNotificationDate(notification.createdAt)}</time></div><p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>{notification.followUpKind ? <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#0e4f85]">Action requested</p> : null}</div>{!notification.readAt ? <span className="mt-1 size-2 shrink-0 rounded-full bg-[#1677c8]" aria-label="Unread" /> : null}</div></Link>)}</div> : null}</CardContent></Card></div>;
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
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1677c8]">Guardian workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Confirmation letter</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your issued bilingual tutor-match confirmation letters are private. They never display address details, contacts, or private request notes.</p></div><Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-0">{lettersQuery.isLoading ? <div className="p-7 text-sm text-slate-600">Loading your private confirmation letters…</div> : null}{lettersQuery.error ? <div className="p-7"><GuardianWorkspaceState kind="error" title="Confirmation letters are temporarily unavailable" message="Please try again. Your private request information remains protected." onRetry={() => { void lettersQuery.refetch(); }} /></div> : null}{!lettersQuery.isLoading && !lettersQuery.error && letters.length === 0 ? <div className="p-8 text-center"><ShieldCheck className="mx-auto size-8 text-[#1677c8]" /><h2 className="mt-4 text-lg font-black text-slate-950">No issued letter yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">When your coordinator confirms a Tutor match and approves the official letter, it will appear here.</p><Link href="/guardian/dashboard/posted-jobs" className="mt-5 inline-flex"><Button variant="outline">Review posted jobs</Button></Link></div> : null}{!lettersQuery.isLoading && !lettersQuery.error && letters.length > 0 ? <div className="divide-y divide-slate-100">{letters.map(letter => <div key={letter.id} className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold text-slate-950">Letter {letter.letterNumber}</p><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${letter.status === "issued" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{letter.status === "issued" ? "Issued" : "Superseded"}</span><span className="text-xs font-semibold text-slate-500">Version {letter.version}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">Issued {formatGuardianDate(letter.issuedAt)}. This bilingual document confirms the approved tutor-match schedule.</p>{letter.supersededAt ? <p className="mt-2 text-xs font-semibold text-amber-800">A later request change superseded this record on {formatGuardianDate(letter.supersededAt)}.</p> : null}</div>{letter.status === "issued" ? <GuardianConfirmationLetterDownloadButton letterId={letter.id} /> : null}</div></div>)}</div> : null}</CardContent></Card></div>;
}

export function GuardianDashboardContent({ section, requestId }: { section?: string; requestId?: number }) {
  const { user } = useAuth();
  const profileQuery = trpc.guardianProfile.me.useQuery();
  const requestsQuery = trpc.tutorRequests.mine.useQuery();
  const requests = requestsQuery.data ?? [];
  const displayName = user?.name || "Guardian";
  const selectedLocation = profileQuery.data?.locationId ? "Saved tuition location" : "Location not added";
  const sectionLabel = section ? guardianDashboardNavigation.find(item => item.path.endsWith(`/${section}`))?.label : "Dashboard";

  if (section && section !== "hire" && section !== "profile" && section !== "posted-jobs" && section !== "notifications" && section !== "confirmation-letter" && section !== "attendance" && section !== "settings" && section !== "how-it-works") {
    return <div className="space-y-6"><GuardianWorkspaceState kind="planned" title={`${sectionLabel} is coming soon`} message="This Guardian workspace section is planned and will be introduced after its data and privacy rules are ready." /><Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold text-slate-900">Need help now?</p><p className="mt-1 text-sm text-slate-600">Start a tutor request or review your existing requests.</p></div><div className="flex flex-wrap gap-3"><Link href="/guardian/dashboard/hire"><Button className="bg-[#1677c8] hover:bg-[#0e4f85]">Hire a tutor</Button></Link><Link href="/guardian/requests"><Button variant="outline">View requests</Button></Link></div></CardContent></Card></div>;
  }

  if (section === "hire") {
    return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1677c8]">Guardian workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Hire a tutor</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Tell us what the student needs. Your request stays private and enters Pending review until an Admin approves a public tuition opportunity.</p></div><GuardianRequestJourney embedded /></div>;
  }

  if (section === "profile") return <GuardianProfileWorkspace />;

  if (section === "settings") return <GuardianSettingsPanel />;

  if (section === "how-it-works") return <GuardianHowItWorksPanel />;

  if (section === "notifications") return <GuardianNotificationInbox />;

  if (section === "confirmation-letter") return <GuardianConfirmationLetterPanel />;

  if (section === "posted-jobs") {
    return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1677c8]">Guardian workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Posted jobs</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review the private request history created by your account. Published Job Board entries never reveal your phone, email, exact address, student identity, or notes.</p></div><GuardianRequestTracking embedded detailRequestId={requestId} /></div>;
  }

  if (section === "attendance") {
    const hasConfirmedMatch = requests.some(request => request.status === "matched");
    return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1677c8]">Guardian workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Attendance</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Attendance tracking is not available in this first release.</p></div><Card className="rounded-3xl border-sky-100 bg-gradient-to-br from-[#f3faff] to-white shadow-sm"><CardContent className="p-7 sm:p-9"><div className="flex max-w-2xl gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#dff2ff] text-[#1677c8]"><Clock3 className="size-6" /></div><div><h2 className="text-xl font-black text-slate-950">{hasConfirmedMatch ? "Attendance setup is not available yet" : "Available after a Tutor is confirmed"}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{hasConfirmedMatch ? "A Tutor match has been recorded, but this version does not create an attendance schedule, percentage, payment record, or session log. Your coordinator will guide the next step privately." : "Once a Tutor is confirmed for your request, the coordinator will guide the next step. This version does not show attendance schedules, percentages, payments, or session records."}</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/guardian/dashboard/posted-jobs"><Button className="bg-[#1677c8] hover:bg-[#0e4f85]">Review posted jobs</Button></Link><Link href="/guardian/dashboard/hire"><Button variant="outline">Hire a tutor</Button></Link></div></div></div></CardContent></Card></div>;
  }

  return <div className="space-y-7">
    <div className="rounded-3xl bg-gradient-to-br from-[#0e4f85] via-[#1269a8] to-[#1677c8] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-9"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">Guardian dashboard</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Welcome, {displayName}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">Manage your tutor requests, review progress, and keep your student’s learning journey moving.</p></div><div className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-2xl font-black ring-1 ring-white/25" aria-label={`${displayName} profile initials`}>{initials(displayName)}</div></div></div>
    <div className="grid gap-5 md:grid-cols-3"><Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-sm text-slate-500">Tutor requests</CardTitle></CardHeader><CardContent><p className="text-3xl font-black text-slate-950">{requestsQuery.isLoading ? "—" : requests.length}</p><p className="mt-2 text-sm text-slate-600">Private requests created from your account.</p></CardContent></Card><Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-sm text-slate-500">Current location</CardTitle></CardHeader><CardContent><p className="flex items-center gap-2 text-lg font-black text-slate-950"><MapPin className="size-5 text-[#1677c8]" />{selectedLocation}</p><p className="mt-2 text-sm text-slate-600">Used to guide relevant tuition matching.</p></CardContent></Card><Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-sm text-slate-500">Account status</CardTitle></CardHeader><CardContent><p className="text-lg font-black text-emerald-700">Active</p><p className="mt-2 text-sm text-slate-600">Your private Guardian workspace is protected.</p></CardContent></Card></div>
    <GuardianOpenRequestsPanel requests={requests} isLoading={requestsQuery.isLoading} hasError={Boolean(requestsQuery.error)} onRetry={() => { void requestsQuery.refetch(); }} />
    <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-xl font-black text-slate-950">Choose your next step</CardTitle></CardHeader><CardContent className="grid gap-4 p-6 pt-0 sm:grid-cols-2"><Link href="/guardian/dashboard/hire" className="rounded-2xl bg-blue-50 p-5 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-[#1677c8]"><p className="font-extrabold text-[#0e4f85]">Hire a tutor</p><p className="mt-2 text-sm leading-6 text-slate-600">Create a new learning request with location and tuition preferences.</p></Link><Link href="/guardian/dashboard/posted-jobs" className="rounded-2xl bg-slate-50 p-5 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1677c8]"><p className="font-extrabold text-slate-900">Review posted requests</p><p className="mt-2 text-sm leading-6 text-slate-600">Track review progress and any contact-consent decision.</p></Link></CardContent></Card>
  </div>;
}

export default function GuardianDashboard() {
  const [, detailParams] = useRoute<{ section?: string; requestId?: string }>("/guardian/dashboard/:section/:requestId");
  const [, params] = useRoute<{ section?: string }>("/guardian/dashboard/:section");
  const section = detailParams?.section ?? params?.section;
  const requestId = detailParams?.requestId ? Number(detailParams.requestId) : undefined;
  return <DashboardLayout title="Guardian workspace" loginPath="/auth" navigationItems={guardianDashboardNavigation} sidebarIdentity={<GuardianSidebarIdentity />}><GuardianDashboardContent section={section} requestId={Number.isFinite(requestId) ? requestId : undefined} /></DashboardLayout>;
}
