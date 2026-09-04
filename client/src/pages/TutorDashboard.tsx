import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { type DashboardNavigationItem } from "@/components/DashboardLayout";
import { TutorDashboardDataSkeleton } from "@/components/TutorDashboardDataSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  clearCurrentTutorPortalToken,
  getCurrentTutorPortalToken,
  getTutorPortalRenewalIntervalMs,
  markCurrentTutorPortalReauthNotice,
  markCurrentTutorSignedOutNotice,
  shouldRequireTutorPortalSignIn,
  subscribeToTutorPortalGlobalLogout,
} from "@/lib/tutorPortalSession";
import { readTutorOnboardingDraft, type TutorOnboardingDraft } from "@/lib/tutorOnboarding";
import { buildTutorApplyJobBoardPath, getTutorApplyReturnFromLocation, readStoredTutorApplyReturnPath } from "@/lib/tutorApplyReturn";
import { TutorProfileWorkspace } from "./TutorProfileWorkspace";
import { shouldAllowTutorProfileNavigation } from "./TutorProfileNavigationGuard";
import { JobBoardContent } from "./JobBoard";
import { BadgeCheck, BookOpenCheck, BriefcaseBusiness, CircleHelp, ClipboardList, CreditCard, FileCheck2, FilePenLine, GraduationCap, HeartHandshake, IdCard, LayoutDashboard, LogOut, Mail, MapPin, Settings, Share2, Sparkles, UserRound, UsersRound } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export const tutorDashboardNavigation: DashboardNavigationItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/tutor/dashboard", sectionLabel: "Active workspace" },
  { icon: UserRound, label: "Profile", path: "/tutor/dashboard/profile", sectionLabel: "Active workspace" },
  { icon: BadgeCheck, label: "Status", path: "/tutor/dashboard/status", sectionLabel: "Active workspace" },
  { icon: BookOpenCheck, label: "Tuition preferences", path: "/tutor/dashboard/preferences", sectionLabel: "Active workspace" },
  { icon: ClipboardList, label: "Tutor requests", path: "/tutor/dashboard/requests", sectionLabel: "Active workspace" },
  { icon: Settings, label: "Settings", path: "/tutor/dashboard/settings", sectionLabel: "Active workspace" },
  { icon: BriefcaseBusiness, label: "Job Board", path: "/tutor/dashboard/jobs", sectionLabel: "Active workspace" },
  { icon: FileCheck2, label: "Confirmation Letter", path: "/tutor/dashboard/confirmation-letter", sectionLabel: "Active workspace" },
  { icon: CreditCard, label: "Payment", path: "/tutor/dashboard/payment", sectionLabel: "Coming later", planned: true },
  { icon: GraduationCap, label: "Certificate", path: "/tutor/dashboard/certificate", sectionLabel: "Coming later", planned: true },
  { icon: Share2, label: "Refer & Earn", path: "/tutor/dashboard/refer-earn", sectionLabel: "Coming later", planned: true },
  { icon: Sparkles, label: "Exclusively Yours", path: "/tutor/dashboard/exclusively-yours", sectionLabel: "Coming later", planned: true },
  { icon: CircleHelp, label: "How It Works", path: "/tutor/dashboard/how-it-works", sectionLabel: "Coming later", planned: true },
  { icon: UsersRound, label: "Join our Community", path: "/tutor/dashboard/community", sectionLabel: "Coming later", planned: true },
  { icon: LogOut, label: "Sign Out", path: "/tutor/dashboard/sign-out", sectionLabel: "Account", action: "signout" },
];

export function getTutorNavigationGroups(items: DashboardNavigationItem[]) {
  return items.reduce<Array<{ label: string; items: string[] }>>((groups, item) => {
    const label = item.sectionLabel ?? "Workspace";
    const group = groups.find(candidate => candidate.label === label);
    if (group) group.items.push(item.label);
    else groups.push({ label, items: [item.label] });
    return groups;
  }, []);
}

export const tutorDashboardSections = [
  "dashboard",
  "jobs",
  "profile",
  "status",
  "confirmation-letter",
  "payment",
  "certificate",
  "refer-earn",
  "settings",
  "exclusively-yours",
  "how-it-works",
  "community",
  "preferences",
  "requests",
] as const;

export type TutorDashboardSection = typeof tutorDashboardSections[number];

export function getTutorDashboardSection(location: string): TutorDashboardSection {
  const pathname = location.split(/[?#]/, 1)[0] || "/tutor/dashboard";
  const rawSection = pathname.split("/").filter(Boolean).pop() || "dashboard";
  return tutorDashboardSections.includes(rawSection as TutorDashboardSection) ? rawSection as TutorDashboardSection : "dashboard";
}

function statusLabel(status?: "draft" | "pending" | "changes_requested" | "approved" | "suspended") {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending review";
  if (status === "changes_requested") return "Changes requested";
  if (status === "suspended") return "Profile suspended";
  return "Profile required";
}

export function formatTutorSince(registeredAt?: Date | string | null) {
  if (!registeredAt) return "Joined date is being prepared";
  return `Joined ${new Date(registeredAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`;
}

type TutorSidebarIdentityInput = {
  user?: { name?: string | null; email?: string | null } | null;
  profile?: { name?: string | null; contactEmail?: string | null; profilePhotoUrl?: string | null } | null;
  registration?: { tutorNumber?: string | number | null; registeredAt?: Date | string | null } | null;
};

export function getTutorSidebarIdentity({ user, profile, registration }: TutorSidebarIdentityInput) {
  const name = profile?.name?.trim() || user?.name?.trim() || "Tutor profile";
  const email = profile?.contactEmail?.trim() || user?.email?.trim() || "Email is being prepared";
  const profilePhotoUrl = profile?.profilePhotoUrl?.trim() || null;
  const tutorNumber = registration?.tutorNumber ? String(registration.tutorNumber) : "Tutor ID preparing";

  return {
    name,
    email,
    profilePhotoUrl,
    tutorNumber,
    joined: formatTutorSince(registration?.registeredAt),
  };
}

function TutorSidebarIdentity({ identity }: { identity: ReturnType<typeof getTutorSidebarIdentity> }) {
  const initials = identity.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "T";

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#f7fbfe] p-2.5 ring-1 ring-[#dcebf5] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-1.5">
      <Avatar className="h-11 w-11 shrink-0 border-2 border-white shadow-sm">
        {identity.profilePhotoUrl ? <AvatarImage src={identity.profilePhotoUrl} alt={`${identity.name}'s profile`} /> : null}
        <AvatarFallback className="bg-[#dff3ff] text-xs font-bold text-[#126fb5]">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <p className="truncate text-sm font-bold tracking-[-0.015em] text-[#173b60]">{identity.name}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-[#587489]">{identity.email}</p>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#dcebf5] pt-2 text-[10px] text-[#6c8799]">
          <span className="flex min-w-0 items-center gap-1 font-bold text-[#173b60]">
            <IdCard size={13} className="shrink-0 text-[#8fa6b6]" aria-hidden={true} />
            <span className="truncate">{identity.tutorNumber.startsWith("Tutor ID") ? identity.tutorNumber : `Tutor ID: ${identity.tutorNumber}`}</span>
          </span>
          <span className="shrink-0 font-semibold">{identity.joined}</span>
        </div>
      </div>
    </div>
  );
}

export function formatTutorDashboardLocation(locationLabel?: string | null) {
  return locationLabel?.trim() || "Location to be added";
}

export function getTutorRequestInboxSummary(request: {
  category: string;
  classCourse: string;
  subjects: unknown;
  tuitionType: string;
  daysPerWeek: number;
  monthlyBudget: number | null;
  locationText: string | null;
}) {
  let subjects = "Subjects to be confirmed";
  if (Array.isArray(request.subjects)) subjects = request.subjects.filter((item): item is string => typeof item === "string").join(", ");
  else if (typeof request.subjects === "string") {
    try {
      const parsed: unknown = JSON.parse(request.subjects);
      subjects = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").join(", ") : request.subjects;
    } catch {
      subjects = request.subjects;
    }
  }
  const tuitionType = request.tuitionType === "both" ? "Home & online" : request.tuitionType === "online" ? "Online" : "Home";
  return {
    title: `${request.category} · ${request.classCourse}`,
    subjects,
    tuition: `${tuitionType} tuition · ${request.daysPerWeek} days/week`,
    location: request.locationText?.trim() || "Location coordinated privately",
    budget: request.monthlyBudget === null ? "Budget to be coordinated" : `৳${request.monthlyBudget.toLocaleString("en-US")}/month`,
  };
}

export function getTutorAssignedRequestDetails(request: {
  tuitionType: string;
  studentCount?: number | null;
  addressDetails?: string | null;
  studentGender?: "male" | "female" | null;
}) {
  const supportsStudentCount = request.tuitionType === "home" || request.tuitionType === "online" || request.tuitionType === "package";
  const studentCount = supportsStudentCount && Number.isInteger(request.studentCount) && request.studentCount && request.studentCount > 0
    ? `${request.studentCount} student${request.studentCount === 1 ? "" : "s"}`
    : null;
  return { studentCount, addressDetails: request.addressDetails?.trim() || null };
}

export default function TutorDashboard() {
  const [location, navigate] = useLocation();
  const section = getTutorDashboardSection(location);
  const [tutorPortalToken, setTutorPortalToken] = useState(() => getCurrentTutorPortalToken());
  const storedTutorApplyReturnTo = useMemo(() => typeof window !== "undefined" ? readStoredTutorApplyReturnPath(window.sessionStorage) : null, []);
  const tutorApplyReturnTo = getTutorApplyReturnFromLocation(location) ?? storedTutorApplyReturnTo;
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/tutor/login" });
  const hasTutorPortalToken = Boolean(tutorPortalToken);
  const profileQuery = trpc.tutor.getMyProfile.useQuery(undefined, { enabled: user?.role === "tutor" && hasTutorPortalToken });
  const { data: profile } = profileQuery;
  const statsQuery = trpc.tutor.getDashboardStats.useQuery(undefined, { enabled: user?.role === "tutor" && hasTutorPortalToken });
  const { data: stats } = statsQuery;
  const assignedRequestsQuery = trpc.tutorRequests.assigned.useQuery(undefined, { enabled: user?.role === "tutor" && hasTutorPortalToken && section === "requests" });
  const draftAtLoad = useMemo(() => readTutorOnboardingDraft(), []);
  const onboardingFallback = useMemo<TutorOnboardingDraft | null>(() => {
    if (draftAtLoad) return draftAtLoad;
    if (!user) return null;
    return {
      name: user.name ?? "",
      phone: "",
      contactEmail: profile?.contactEmail ?? "",
      // Existing forms use this initial selection. Legacy accounts must still
      // review it and select their real current Bangladesh location before save.
      gender: "male",
      locationId: "",
    };
  }, [draftAtLoad, profile?.contactEmail, user]);
  const [hasUnsavedProfileChanges, setHasUnsavedProfileChanges] = useState(false);

  const confirmProfileNavigation = useCallback((item: DashboardNavigationItem) => {
    if (item.path === location || !hasUnsavedProfileChanges) return true;
    return shouldAllowTutorProfileNavigation(true, () => window.confirm("আপনার সংরক্ষণ না করা Profile পরিবর্তন আছে। এই পৃষ্ঠা ছাড়লে পরিবর্তনগুলো হারিয়ে যাবে। তবুও এগোবেন কি?"));
  }, [hasUnsavedProfileChanges, location]);

  const returnToSelectedTutorJob = useCallback(() => {
    if (tutorApplyReturnTo) navigate(buildTutorApplyJobBoardPath(tutorApplyReturnTo));
  }, [navigate, tutorApplyReturnTo]);

  useEffect(() => {
    if (!authLoading && user && user.role !== "tutor") navigate("/");
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (authLoading || !shouldRequireTutorPortalSignIn(user?.role, tutorPortalToken)) return;
    // The account cookie is valid but this tab holds no portal proof (a fresh
    // tab, a restored session). Explain why sign-in is needed again here.
    markCurrentTutorPortalReauthNotice();
    navigate("/tutor/login");
  }, [authLoading, navigate, tutorPortalToken, user?.role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    return subscribeToTutorPortalGlobalLogout(window, () => {
      clearCurrentTutorPortalToken();
      setTutorPortalToken(null);
      navigate("/tutor/login");
    });
  }, [navigate]);

  useEffect(() => {
    if (user?.role !== "tutor" || !tutorPortalToken) return;

    const renewTutorPortalSession = async () => {
      const result = await statsQuery.refetch();
      if (!result.error) return;
      // A transient network or server error must not sign the Tutor out
      // mid-session — the next tick simply retries. Only an expired tab proof
      // (UNAUTHORIZED) or an account that is no longer active (FORBIDDEN) ends
      // the session; on FORBIDDEN the sign-in screen surfaces the real reason.
      const code = result.error.data?.code;
      if (code !== "UNAUTHORIZED" && code !== "FORBIDDEN") return;
      if (
        hasUnsavedProfileChanges &&
        !window.confirm("আপনার Tutor সেশনের মেয়াদ শেষ হয়েছে। আবার sign in করলে এই পেজে সংরক্ষণ না করা পরিবর্তনগুলো হারিয়ে যাবে। এখনই sign in করবেন?")
      ) {
        return;
      }
      clearCurrentTutorPortalToken();
      setTutorPortalToken(null);
      navigate("/tutor/login");
    };
    const renewalTimer = window.setInterval(() => { void renewTutorPortalSession(); }, getTutorPortalRenewalIntervalMs());
    return () => window.clearInterval(renewalTimer);
  }, [hasUnsavedProfileChanges, navigate, statsQuery.refetch, tutorPortalToken, user?.role]);

  if (authLoading || !user || user.role !== "tutor" || shouldRequireTutorPortalSignIn(user.role, tutorPortalToken)) return <main className="min-h-screen bg-[#f4f8fb] p-8 text-center text-sm text-[#5b7287]">Checking Tutor account access…</main>;

  const identity = stats?.tutorRegistration;
  const sidebarIdentity = getTutorSidebarIdentity({ user, profile, registration: identity });
  return <DashboardLayout navigationItems={tutorDashboardNavigation} title="Tutor Portal" loginPath="/tutor/login" signOutPath="/tutor/login" onBeforeNavigation={confirmProfileNavigation} sidebarIdentity={<TutorSidebarIdentity identity={sidebarIdentity} />} workspaceHeader={{ portal: "Tutor Portal", name: sidebarIdentity.name, profilePhotoUrl: sidebarIdentity.profilePhotoUrl, details: [{ label: "Tutor ID", value: sidebarIdentity.tutorNumber }] }} onTutorSignOutSuccess={markCurrentTutorSignedOutNotice} sidebarPanel="tutor">
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 pb-10">
      {section === "dashboard" && (profileQuery.isLoading || statsQuery.isLoading) && <TutorDashboardDataSkeleton />}
      {section === "profile" && <TutorProfileWorkspace profile={profile} onboardingFallback={onboardingFallback} onDirtyChange={setHasUnsavedProfileChanges} tutorApplyReturnTo={tutorApplyReturnTo} onReturnToSelectedJob={returnToSelectedTutorJob} />}
      {section === "preferences" && <Preferences profile={profile} navigate={navigate} />}
      {section === "requests" && <TutorRequests requests={assignedRequestsQuery.data ?? []} isLoading={assignedRequestsQuery.isLoading} />}
      {section === "settings" && <TutorSettings email={profile?.contactEmail ?? "Secure account email unavailable"} />}
      {section === "jobs" && <JobBoardContent embedded />}
      {section === "confirmation-letter" && <TutorConfirmationLetterPanel />}
      {["status", "payment", "certificate", "refer-earn", "exclusively-yours", "how-it-works", "community"].includes(section) && <DashboardDesignPreview section={section} status={stats?.profileStatus} />}
    </div>
  </DashboardLayout>;
}

function DashboardDesignPreview({ section, status }: { section: string; status?: "draft" | "pending" | "changes_requested" | "approved" | "suspended" }) {
  const descriptions: Record<string, string> = {
    jobs: "The visual structure is ready. Tutor-to-job matching will be connected after the matching and assignment workflow is defined.",
    status: `Your current profile status is ${statusLabel(status)}. A detailed review timeline will be added with the Admin moderation workflow.`,
    "confirmation-letter": "The secure confirmation-letter download workflow will be connected after Tutor approval rules are finalised.",
    payment: "The payment dashboard design is reserved for the future payment workflow; no transaction or payment data is shown yet.",
    certificate: "Certificate eligibility and generation rules will be added before this section becomes active.",
    "refer-earn": "Referral terms and reward tracking will be connected when the programme is launched.",
    "exclusively-yours": "This personal area is reserved for curated Tutor resources and future benefits.",
    "how-it-works": "Complete your profile, wait for moderation, then receive suitable job opportunities through the protected Tutor workflow.",
    community: "Community joining options will be added when the Connect Tutors BD community channels are finalised.",
  };
  return <section className="rounded-xl border border-[#dce8f0] bg-white p-7 text-center shadow-[0_12px_30px_rgba(38,83,117,0.06)] sm:p-10"><HeartHandshake className="mx-auto text-[#167ddd]" size={38} /><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#167ddd]">Dashboard design preview</p><h2 className="mt-2 text-xl font-bold text-[#173b60]">This section is ready for its next workflow</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#627e94]">{descriptions[section]}</p></section>;
}

function formatTutorLetterDate(value?: Date | string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function TutorConfirmationLetterDownloadButton({ letterId }: { letterId: number }) {
  const downloadQuery = trpc.confirmationLetters.download.useQuery({ letterId }, { enabled: false, retry: false });
  const requestDownload = async () => {
    const result = await downloadQuery.refetch();
    if (result.data?.downloadUrl) window.open(result.data.downloadUrl, "_blank", "noopener,noreferrer");
    else if (result.error) toast.error(result.error.message);
  };
  return <Button type="button" variant="outline" disabled={downloadQuery.isFetching} aria-busy={downloadQuery.isFetching} data-motion={downloadQuery.isFetching ? "pending" : undefined} onClick={() => { void requestDownload(); }}><FileCheck2 className="size-4" /> {downloadQuery.isFetching ? "Preparing…" : "View PDF"}</Button>;
}

function TutorConfirmationLetterPanel() {
  const lettersQuery = trpc.confirmationLetters.tutorMine.useQuery();
  const letters = lettersQuery.data ?? [];
  return <section className="rounded-xl border border-[#dce8f0] bg-white shadow-[0_12px_30px_rgba(38,83,117,0.06)]"><div className="border-b border-j-border p-6 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#167ddd]">Private match record</p><h2 className="mt-2 text-xl font-bold text-[#173b60]">Issued confirmation letters</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#627e94]">Only letters issued for a request assigned to your account appear here. They exclude Guardian addresses, contacts, and private notes.</p></div>{lettersQuery.isLoading ? <p className="p-7 text-sm text-[#627e94]">Loading your private confirmation letters…</p> : null}{lettersQuery.error ? <div className="p-7"><p className="font-bold text-rose-800">Confirmation letters are temporarily unavailable.</p><Button type="button" variant="outline" className="mt-4" onClick={() => { void lettersQuery.refetch(); }}>Try again</Button></div> : null}{!lettersQuery.isLoading && !lettersQuery.error && letters.length === 0 ? <div className="p-8 text-center"><FileCheck2 className="mx-auto text-[#167ddd]" size={34} /><h3 className="mt-4 text-lg font-bold text-[#173b60]">No issued letter yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#627e94]">When an Admin confirms your assigned Tutor match and approves the official bilingual letter, it will appear here.</p><Link href="/tutor/dashboard/requests" className="mt-5 inline-flex"><Button variant="outline">View Tutor requests</Button></Link></div> : null}{!lettersQuery.isLoading && !lettersQuery.error && letters.length > 0 ? <div className="divide-y divide-j-border">{letters.map(letter => <div key={letter.id} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-7"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-[#173b60]">Letter {letter.letterNumber}</p><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${letter.status === "issued" ? "bg-emerald-50 text-emerald-800" : "bg-j-surface-muted text-j-ink-soft"}`}>{letter.status === "issued" ? "Issued" : "Superseded"}</span><span className="text-xs font-semibold text-[#627e94]">Version {letter.version}</span></div><p className="mt-2 text-sm leading-6 text-[#627e94]">Issued {formatTutorLetterDate(letter.issuedAt)}. This bilingual document confirms the approved tutor-match schedule.</p>{letter.supersededAt ? <p className="mt-2 text-xs font-semibold text-amber-800">This letter was superseded on {formatTutorLetterDate(letter.supersededAt)}.</p> : null}</div>{letter.status === "issued" ? <TutorConfirmationLetterDownloadButton letterId={letter.id} /> : null}</div>)}</div> : null}</section>;
}

function Preferences({ profile, navigate }: { profile: any; navigate: (path: string) => void }) { if (!profile) return <EmptyPanel title="Complete your Tutor Profile first" copy="Subjects, class levels, tuition mode, fee, and availability are saved in your Tutor Profile." action="Complete profile" onClick={() => navigate("/tutor/dashboard/profile")} />; return <section className="grid gap-5 md:grid-cols-2"><SummaryCard icon={BookOpenCheck} title="Teaching subjects" value={profile.subjects.join(", ")} /><SummaryCard icon={BriefcaseBusiness} title="Class levels" value={profile.levels.join(", ")} /><SummaryCard icon={MapPin} title="Tuition delivery" value={`${profile.mode === "both" ? "Home & Online" : profile.mode === "home" ? "Home Tuition" : "Online Tuition"} · ${profile.locationLabel}`} /><SummaryCard icon={CircleHelp} title="Fee & availability" value={`BDT ${profile.fee.toLocaleString()} per month · ${profile.availability}`} /><div className="md:col-span-2 rounded-xl border border-[#dce8f0] bg-white p-6"><p className="text-sm leading-6 text-[#617d92]">Need to revise a subject, class level, fee, or availability? Update your full Tutor Profile. The updated profile is submitted for review.</p><Button onClick={() => navigate("/tutor/dashboard/profile")} className="mt-4 rounded-xl bg-[#167ddd] font-bold hover:bg-[#0e6dc2]"><FilePenLine size={16} /> Edit tuition preferences</Button></div></section>; }
function SummaryCard({ icon: Icon, title, value }: { icon: typeof BookOpenCheck; title: string; value: string }) { return <article className="rounded-xl border border-[#dce8f0] bg-white p-6 shadow-[0_10px_25px_rgba(38,83,117,0.05)]"><Icon className="text-[#167ddd]" size={22} /><h2 className="mt-4 text-sm font-bold text-[#244a6a]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#647f93]">{value}</p></article>; }
function TutorRequests({ requests, isLoading }: { requests: any[]; isLoading: boolean }) {
  if (isLoading) return <section className="rounded-xl border border-[#dce8f0] bg-white p-8 text-center shadow-[0_12px_30px_rgba(38,83,117,0.06)]"><p className="text-sm font-semibold text-[#688297]">Loading assigned requests…</p></section>;
  if (!requests.length) return <section className="rounded-xl border border-[#dce8f0] bg-white p-6 text-center shadow-[0_12px_30px_rgba(38,83,117,0.06)] sm:p-10"><ClipboardList className="mx-auto text-[#167ddd]" size={36} /><h2 className="mt-4 text-xl font-bold text-[#173b60]">No assigned requests yet</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#688297]">When an Admin finds a suitable request for your approved Tutor Profile, its learning requirements will appear here. Guardian contact details remain private during matching.</p></section>;
  return <section className="space-y-4">{requests.map(request => {
    const summary = getTutorRequestInboxSummary(request);
    const privateDetails = getTutorAssignedRequestDetails(request);
    return <article key={request.id} className="rounded-xl border border-[#dce8f0] bg-white p-6 shadow-[0_12px_30px_rgba(38,83,117,0.06)]"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1680c2]">Assigned request #{request.id}</p><h2 className="mt-2 text-lg font-bold text-[#173b60]">{summary.title}</h2><p className="mt-2 text-sm text-[#627e94]">{summary.subjects}</p></div><span className="w-fit rounded-full bg-[#eaf8ef] px-3 py-1 text-xs font-bold text-[#18724d]">Matched</span></div><div className="mt-5 grid gap-3 border-t border-[#e8f0f5] pt-5 text-sm sm:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#718aa0]">Tuition</p><p className="mt-1 font-semibold text-[#244a6a]">{summary.tuition}</p></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#718aa0]">Area</p><p className="mt-1 font-semibold text-[#244a6a]">{summary.location}</p></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#718aa0]">Salary</p><p className="mt-1 font-semibold text-[#244a6a]">{summary.budget}</p></div>{privateDetails.studentCount ? <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#718aa0]">Number of students</p><p className="mt-1 font-semibold text-[#244a6a]">{privateDetails.studentCount}</p></div> : null}</div>{privateDetails.addressDetails ? <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-5 text-[#244a6a]"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#1680c2]">Private address details</p><p className="mt-1">{privateDetails.addressDetails}</p></div> : null}<p className="mt-5 rounded-xl bg-[#f2f8fc] px-4 py-3 text-xs leading-5 text-[#5d778e]">A coordinator will handle the next steps. Guardian name, phone number, email, Student Gender, and private notes are not shown here.</p></article>;
  })}</section>;
}
  function TutorSettings({ email }: { email: string }) { return <section className="max-w-3xl rounded-xl border border-[#dce8f0] bg-white p-6 shadow-[0_12px_30px_rgba(38,83,117,0.06)]"><div className="flex items-start gap-4"><span className="rounded-xl bg-[#edf8ff] p-3 text-[#167ddd]"><Mail size={22} /></span><div><h2 className="text-lg font-bold text-[#173b60]">Secure account</h2><p className="mt-2 text-sm leading-6 text-[#647e92]">Your Tutor account uses email/password sign-in. Passwords are stored only as one-way server-side hashes.</p><p className="mt-4 rounded-xl bg-[#f5f9fc] px-4 py-3 text-sm font-semibold text-[#315b78]">{email}</p></div></div><div className="mt-6 border-t border-[#e7eef3] pt-5"><Link href="/tutors" className="text-sm font-bold text-[#167ddd]">View public Tutor Directory</Link></div></section>; }
function EmptyPanel({ title, copy, action, onClick }: { title: string; copy: string; action: string; onClick: () => void }) { return <section className="rounded-xl border border-dashed border-[#b6d9ec] bg-[#f3fbff] p-8 text-center"><FilePenLine className="mx-auto text-[#167ddd]" size={34} /><h2 className="mt-4 text-xl font-bold text-[#173b60]">{title}</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#668197]">{copy}</p><Button onClick={onClick} className="mt-6 rounded-xl bg-[#167ddd] font-bold hover:bg-[#0e6dc2]">{action}</Button></section>; }
