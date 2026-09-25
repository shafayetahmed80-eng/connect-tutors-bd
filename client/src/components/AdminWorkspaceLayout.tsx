import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { getDashboardAvatarInitials, type DashboardNavigationItem } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { CircleCheckBig, CircleX, Inbox, IdCard, Newspaper, Palette, Star, UserCheck, BadgeCheck, ClipboardPen, UserCog, Building2, MousePointerClick, Type, SquareDashed, BarChart3, ClipboardList, Compass, CalendarCheck2, ContactRound, FileBadge, FileText, FileUser, Globe, House, LayoutDashboard, LayoutTemplate, ListChecks, LogOut, MapPin, CircleUserRound, Settings, PanelsTopLeft, Scale, School, ShieldCheck, SlidersHorizontal, Squircle, Target, ToggleRight, UserRoundCog, Users } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { type ReactNode, useEffect, useRef } from "react";

export const ADMIN_WORKSPACE_OWNER_QUERY_OPTIONS = {
  retry: false,
  refetchOnMount: "always",
  refetchOnWindowFocus: "always",
  staleTime: 0,
  gcTime: 0,
} as const;

/**
 * Site-content control for the Tutor and Guardian pages. Owner-only, because
 * editing published copy changes what every visitor sees.
 */
const dynamicProfileForms = { label: "Profile forms", icon: IdCard };
const dynamicSiteContent = { label: "Site content", icon: Newspaper };
const dynamicOptionLists = { label: "Option lists", icon: ListChecks };
const dynamicAppearance = { label: "Appearance", icon: Palette };
const dynamicControls = { label: "Controls", icon: SlidersHorizontal };

const dynamicSectionItems: DashboardNavigationItem[] = [
  { icon: Compass, label: "Section guide", path: "/admin/dynamic", sectionLabel: "Dynamic Section" },
  { icon: FileUser, label: "Tutor Profile", path: "/admin/dynamic/tutor-profile", sectionLabel: "Dynamic Section", subgroup: dynamicProfileForms },
  { icon: LayoutTemplate, label: "Guardian Profile", path: "/admin/dynamic/guardian-profile", sectionLabel: "Dynamic Section", subgroup: dynamicProfileForms },
  { icon: House, label: "Home page", path: "/admin/dynamic/home", sectionLabel: "Dynamic Section", subgroup: dynamicSiteContent },
  { icon: Globe, label: "Public pages", path: "/admin/dynamic/public-pages", sectionLabel: "Dynamic Section", subgroup: dynamicSiteContent },
  { icon: Scale, label: "Legal pages", path: "/admin/dynamic/legal-pages", sectionLabel: "Dynamic Section", subgroup: dynamicSiteContent },
  { icon: ListChecks, label: "Form options", path: "/admin/dynamic/form-options", sectionLabel: "Dynamic Section", subgroup: dynamicOptionLists },
  { icon: School, label: "Institutes & departments", path: "/admin/dynamic/institutes", sectionLabel: "Dynamic Section", subgroup: dynamicOptionLists },
  { icon: Building2, label: "Schools & colleges", path: "/admin/dynamic/schools", sectionLabel: "Dynamic Section", subgroup: dynamicOptionLists },
  { icon: MapPin, label: "Cities & locations", path: "/admin/dynamic/locations", sectionLabel: "Dynamic Section", subgroup: dynamicOptionLists },
  { icon: PanelsTopLeft, label: "Sidebar Tabs", path: "/admin/dynamic/sidebar-tabs", sectionLabel: "Dynamic Section", subgroup: dynamicAppearance },
  { icon: SquareDashed, label: "Modals", path: "/admin/dynamic/modals", sectionLabel: "Dynamic Section", subgroup: dynamicAppearance },
  { icon: Type, label: "Input Field Text", path: "/admin/dynamic/input-field-text", sectionLabel: "Dynamic Section", subgroup: dynamicAppearance },
  { icon: MousePointerClick, label: "Button Section", path: "/admin/dynamic/button-section", sectionLabel: "Dynamic Section", subgroup: dynamicAppearance },
  { icon: Squircle, label: "Navigation & Sections", path: "/admin/dynamic/navigation", sectionLabel: "Dynamic Section", subgroup: dynamicAppearance },
  { icon: SlidersHorizontal, label: "Limits", path: "/admin/dynamic/limits", sectionLabel: "Dynamic Section", subgroup: dynamicControls },
  { icon: ToggleRight, label: "Admin Control", path: "/admin/dynamic/admin-control", sectionLabel: "Dynamic Section", subgroup: dynamicControls },
];

/** How many of each Guardian request wait for an answer - the counts beside the Guardian Requests rows. */
export type GuardianRequestCounts = { shortlist: number; appoint: number; confirm: number; cancel: number };

export function buildAdminWorkspaceNavigation(isOwner: boolean, pendingChangeRequests = 0, guardianRequests?: GuardianRequestCounts): DashboardNavigationItem[] {
  const requests = { label: "Guardian Requests", icon: Inbox };
  // Order matters twice over: it is the visible order, and DashboardLayout
  // starts a new section heading wherever `sectionLabel` changes.
  return [
    { icon: LayoutDashboard, label: "Overview", path: "/admin/dashboard", sectionLabel: "Operations" },
    { icon: CircleUserRound, label: "Admin Profile", path: "/admin/profile", sectionLabel: "Operations" },
    { icon: UserRoundCog, label: "Tutor Profiles", path: "/admin/tutor-profiles", sectionLabel: "Operations" },
    { icon: ContactRound, label: "Guardian Profiles", path: "/admin/guardians", sectionLabel: "Operations" },
    { icon: ClipboardPen, label: "Change requests", path: "/admin/change-requests", sectionLabel: "Operations", badge: pendingChangeRequests },
    { icon: FileText, label: "Posted jobs", path: "/admin/posted-jobs", sectionLabel: "Operations" },
    { icon: CalendarCheck2, label: "Appointed Jobs", path: "/admin/appointed-jobs", sectionLabel: "Operations" },
    { icon: BadgeCheck, label: "Confirmed Jobs", path: "/admin/confirmed-jobs", sectionLabel: "Operations" },
    { icon: FileBadge, label: "Admin Posted Jobs", path: "/admin/admin-posted-jobs", sectionLabel: "Operations" },
    { icon: Users, label: "Applied Tutors", path: "/admin/applied-tutors", sectionLabel: "Operations" },
    { icon: Target, label: "Tutor Matching", path: "/admin/tutor-matching", sectionLabel: "Operations" },
    // The shortlist is a signal, not a question, so it carries no count.
    { icon: Star, label: "Shortlist Requests", path: "/admin/guardian-requests/shortlist", sectionLabel: "Operations", subgroup: requests },
    { icon: UserCheck, label: "Appoint Requests", path: "/admin/guardian-requests/appoint", sectionLabel: "Operations", subgroup: requests, badge: guardianRequests?.appoint },
    { icon: CircleCheckBig, label: "Confirm Requests", path: "/admin/guardian-requests/confirm", sectionLabel: "Operations", subgroup: requests, badge: guardianRequests?.confirm },
    { icon: CircleX, label: "Cancel Requests", path: "/admin/guardian-requests/cancel", sectionLabel: "Operations", subgroup: requests, badge: guardianRequests?.cancel },
    { icon: ClipboardList, label: "Matching workspace", path: "/admin/matching", sectionLabel: "Operations" },
    ...(isOwner ? dynamicSectionItems : []),
    ...(isOwner
      ? [
          { icon: UserCog, label: "Admin Profiles", path: "/admin/admin-profiles", sectionLabel: "Owner controls" },
          { icon: BarChart3, label: "Admin activity report", path: "/admin/reports", sectionLabel: "Owner controls" },
          { icon: ShieldCheck, label: "Admin security", path: "/admin/security", sectionLabel: "Owner controls" },
        ]
      : []),
    // Last, as in the Tutor sidebar. The path is never navigated to - the
    // layout sees `action: "signout"` and signs out instead - but a nav item
    // needs one.
    { icon: Settings, label: "Settings", path: "/admin/settings", sectionLabel: "Account" },
    { icon: LogOut, label: "Sign Out", path: "/admin/sign-out", sectionLabel: "Account", action: "signout" },
  ];
}

/**
 * Whether the workspace is shown, held behind a loader, or refused.
 *
 * The Owner check is re-run on every mount and every return to the window.
 * A re-run for the session already on screen does not hide the page - it used
 * to, and every return to the tab threw away an open dialog, the reason typed
 * into it, the scroll and the filters. What still waits is an answer that
 * belongs to another session: Owner navigation must never be shown to the
 * wrong Admin, even for a moment.
 */
export function getAdminWorkspaceDisplayState({
  authLoading,
  isAdmin,
  ownerAccessLoading,
  ownerAccessFromOtherSession,
}: {
  authLoading: boolean;
  isAdmin: boolean;
  ownerAccessLoading: boolean;
  /** The Owner check on hand was answered for a different Admin than the one signed in. */
  ownerAccessFromOtherSession: boolean;
}) {
  if (authLoading || (isAdmin && (ownerAccessLoading || ownerAccessFromOtherSession))) return "loading" as const;
  if (!isAdmin) return "denied" as const;
  return "ready" as const;
}

function formatAdminDate(value?: Date | string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

/** The account block at the top of the sidebar, as the Guardian and Tutor panels have. */
function AdminSidebarIdentity({ photoUrl }: { photoUrl: string | null }) {
  const profile = trpc.adminProfile.me.useQuery().data;
  const name = profile?.name || "Admin";
  return <div className="sb-card rounded-xl p-3 text-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0" aria-label="Admin account identity">
    <div className="mx-auto grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--sb-avatar-bg)] text-lg font-black text-white group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:text-2xs">
      {photoUrl ? <img src={photoUrl} alt="Admin profile photo" className="size-full object-cover" /> : getDashboardAvatarInitials(name, "A")}
    </div>
    <div className="mt-2.5 group-data-[collapsible=icon]:hidden">
      <p className="truncate text-sm font-extrabold text-white">{name}</p>
      <p className="truncate text-xs text-[var(--sb-soft)]">{profile?.email || "Private account"}</p>
      <div className="mt-2.5 space-y-0.5 border-t border-[var(--sb-card-border)] pt-2 text-2xs text-[var(--sb-soft)]">
        <p><span className="font-bold text-white">User ID:</span> {profile ? profile.loginId ?? "Not set" : "Loading…"}</p>
        <p><span className="font-bold text-white">Role:</span> {profile ? (profile.isOwner ? "Project Owner" : "Administrator") : "Loading…"}</p>
        <p><span className="font-bold text-white">Created:</span> {formatAdminDate(profile?.accountCreatedAt)}</p>
      </div>
    </div>
  </div>;
}

export default function AdminWorkspaceLayout({ children, title = "Admin workspace" }: { children: ReactNode; title?: string }) {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const workspaceAccess = trpc.admin.getWorkspaceAccess.useQuery(undefined, {
    ...ADMIN_WORKSPACE_OWNER_QUERY_OPTIONS,
    enabled: isAdmin,
  });
  // One photo for both places it shows: the sidebar block and the header avatar.
  const photoUrl = trpc.adminProfile.photo.useQuery(undefined, { enabled: Boolean(isAdmin), retry: false }).data?.photoUrl ?? null;
  const pendingChangeRequests = trpc.accountChanges.pendingCount.useQuery(undefined, { enabled: Boolean(isAdmin), retry: false }).data ?? 0;
  const guardianRequestCounts = trpc.admin.guardianRequestCounts.useQuery(undefined, { enabled: Boolean(isAdmin), retry: false }).data;
  const ownerAccessFromOtherSession = Boolean(workspaceAccess.data && user && workspaceAccess.data.userId !== user.id);
  const displayState = getAdminWorkspaceDisplayState({
    authLoading: loading,
    isAdmin: Boolean(isAdmin),
    ownerAccessLoading: workspaceAccess.isLoading,
    ownerAccessFromOtherSession,
  });

  // The two answers disagree when the session changed somewhere this page did
  // not see - a sign-in in another tab. Either one may be the stale one, so both
  // are asked again, once per disagreement; they read the same cookie and agree.
  const utils = trpc.useUtils();
  const reconciled = useRef<string | null>(null);
  const { isFetching, refetch } = workspaceAccess;
  const mismatch = ownerAccessFromOtherSession ? `${workspaceAccess.data?.userId}:${user?.id}` : null;
  useEffect(() => {
    if (!mismatch || isFetching || reconciled.current === mismatch) return;
    reconciled.current = mismatch;
    void refetch();
    void utils.auth.me.invalidate();
  }, [mismatch, isFetching, refetch, utils]);

  if (displayState === "loading") {
    return <div className="flex min-h-[60vh] items-center justify-center text-j-ink-soft"><LoadingCradle className="mr-2" /> Opening Admin workspace…</div>;
  }
  if (displayState === "denied") {
    return <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center rounded-xl border border-j-border bg-white p-8 text-center shadow-sm"><ShieldCheck className="mb-4 h-12 w-12 text-j-ink-faint" /><h1 className="text-2xl font-bold text-j-ink">Admin access required</h1><p className="mt-2 text-sm leading-6 text-j-ink-soft">This workspace is available only to authorized Connect Tutors administrators.</p></section>;
  }
  const access = workspaceAccess.data;
  return <DashboardLayout
    navigationItems={buildAdminWorkspaceNavigation(Boolean(access?.isOwner), pendingChangeRequests, guardianRequestCounts)}
    title={title}
    loginPath="/admin/login"
    sidebarPanel="admin"
    sidebarIdentity={<AdminSidebarIdentity photoUrl={photoUrl} />}
    workspaceHeader={{
      portal: "Admin Panel",
      name: access?.name ?? "Admin",
      profilePhotoUrl: photoUrl,
      settingsPath: "/admin/settings",
      details: [
        // The User ID, not the display name: it is what they type at
        // /admin/login, and with more than one Admin the name alone does not
        // say which account is open.
        ...(access?.loginId ? [{ label: "User ID", value: access.loginId }] : []),
        { label: "Role", value: access?.isOwner ? "Project Owner" : "Administrator" },
      ],
    }}
  >{children}</DashboardLayout>;
}
