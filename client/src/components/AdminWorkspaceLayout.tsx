import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { getDashboardAvatarInitials, type DashboardNavigationItem } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, MousePointerClick, Type, SquareDashed, BarChart3, ClipboardList, Compass, CalendarCheck2, ContactRound, FileBadge, FileText, FileUser, Globe, House, LayoutDashboard, LayoutTemplate, ListChecks, Loader2, LogOut, MapPin, CircleUserRound, PanelsTopLeft, Scale, School, ShieldCheck, SlidersHorizontal, ToggleRight, UserRoundCog, Users, UsersRound } from "lucide-react";
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
const dynamicSectionItems: DashboardNavigationItem[] = [
  { icon: Compass, label: "Section guide", path: "/admin/dynamic", sectionLabel: "Dynamic Section" },
  { icon: FileUser, label: "Tutor Profile", path: "/admin/dynamic/tutor-profile", sectionLabel: "Dynamic Section" },
  { icon: LayoutTemplate, label: "Guardian Profile", path: "/admin/dynamic/guardian-profile", sectionLabel: "Dynamic Section" },
  { icon: ListChecks, label: "Form options", path: "/admin/dynamic/form-options", sectionLabel: "Dynamic Section" },
  { icon: PanelsTopLeft, label: "Sidebar Tabs", path: "/admin/dynamic/sidebar-tabs", sectionLabel: "Dynamic Section" },
  { icon: House, label: "Home page", path: "/admin/dynamic/home", sectionLabel: "Dynamic Section" },
  { icon: Globe, label: "Public pages", path: "/admin/dynamic/public-pages", sectionLabel: "Dynamic Section" },
  { icon: School, label: "Institutes & departments", path: "/admin/dynamic/institutes", sectionLabel: "Dynamic Section" },
  { icon: MapPin, label: "Cities & locations", path: "/admin/dynamic/locations", sectionLabel: "Dynamic Section" },
  { icon: Scale, label: "Legal pages", path: "/admin/dynamic/legal-pages", sectionLabel: "Dynamic Section" },
  { icon: SquareDashed, label: "Modals", path: "/admin/dynamic/modals", sectionLabel: "Dynamic Section" },
  { icon: Type, label: "Input Field Text", path: "/admin/dynamic/input-field-text", sectionLabel: "Dynamic Section" },
  { icon: MousePointerClick, label: "Button Section", path: "/admin/dynamic/button-section", sectionLabel: "Dynamic Section" },
  { icon: SlidersHorizontal, label: "Limits", path: "/admin/dynamic/limits", sectionLabel: "Dynamic Section" },
  { icon: ToggleRight, label: "Admin Control", path: "/admin/dynamic/admin-control", sectionLabel: "Dynamic Section" },
];

export function buildAdminWorkspaceNavigation(isOwner: boolean): DashboardNavigationItem[] {
  // Order matters twice over: it is the visible order, and DashboardLayout
  // starts a new section heading wherever `sectionLabel` changes.
  return [
    { icon: LayoutDashboard, label: "Overview", path: "/admin/dashboard", sectionLabel: "Operations" },
    { icon: CircleUserRound, label: "Admin Profile", path: "/admin/profile", sectionLabel: "Operations" },
    { icon: UserRoundCog, label: "Tutor Profiles", path: "/admin/tutor-profiles", sectionLabel: "Operations" },
    { icon: ContactRound, label: "Guardian activity", path: "/admin/guardians", sectionLabel: "Operations" },
    { icon: FileText, label: "Posted jobs", path: "/admin/posted-jobs", sectionLabel: "Operations" },
    { icon: CalendarCheck2, label: "Appointed Jobs", path: "/admin/appointed-jobs", sectionLabel: "Operations" },
    { icon: BadgeCheck, label: "Confirmed Jobs", path: "/admin/confirmed-jobs", sectionLabel: "Operations" },
    { icon: FileBadge, label: "Admin Posted Jobs", path: "/admin/admin-posted-jobs", sectionLabel: "Operations" },
    { icon: Users, label: "Applied Tutors", path: "/admin/applied-tutors", sectionLabel: "Operations" },
    { icon: ClipboardList, label: "Matching workspace", path: "/admin/matching", sectionLabel: "Operations" },
    ...(isOwner ? dynamicSectionItems : []),
    { icon: UsersRound, label: "Public Tutor directory", path: "/tutors", sectionLabel: "Public reference", requiresSignOut: true },
    ...(isOwner
      ? [
          { icon: BarChart3, label: "Admin activity report", path: "/admin/reports", sectionLabel: "Owner controls" },
          { icon: ShieldCheck, label: "Admin security", path: "/admin/security", sectionLabel: "Owner controls" },
        ]
      : []),
    // Last, as in the Tutor sidebar. The path is never navigated to - the
    // layout sees `action: "signout"` and signs out instead - but a nav item
    // needs one.
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
  return <div className="rounded-xl bg-[#f4f9fd] p-3 text-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0" aria-label="Admin account identity">
    <div className="mx-auto grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#1677c8] text-lg font-black text-white group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:text-2xs">
      {photoUrl ? <img src={photoUrl} alt="Admin profile photo" className="size-full object-cover" /> : getDashboardAvatarInitials(name, "A")}
    </div>
    <div className="mt-2.5 group-data-[collapsible=icon]:hidden">
      <p className="truncate text-sm font-extrabold text-j-ink">{name}</p>
      <p className="truncate text-xs text-j-ink-soft">{profile?.email || "Private account"}</p>
      <div className="mt-2.5 space-y-0.5 border-t border-[#dbe9f2] pt-2 text-2xs text-j-ink-soft">
        <p><span className="font-bold text-j-ink">User ID:</span> {profile ? profile.loginId ?? "Not set" : "Loading…"}</p>
        <p><span className="font-bold text-j-ink">Role:</span> {profile ? (profile.isOwner ? "Project Owner" : "Administrator") : "Loading…"}</p>
        <p><span className="font-bold text-j-ink">Created:</span> {formatAdminDate(profile?.accountCreatedAt)}</p>
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
    return <div className="flex min-h-[60vh] items-center justify-center text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening Admin workspace…</div>;
  }
  if (displayState === "denied") {
    return <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center rounded-xl border border-j-border bg-white p-8 text-center shadow-sm"><ShieldCheck className="mb-4 h-12 w-12 text-j-ink-faint" /><h1 className="text-2xl font-bold text-j-ink">Admin access required</h1><p className="mt-2 text-sm leading-6 text-j-ink-soft">This workspace is available only to authorized Connect Tutors BD administrators.</p></section>;
  }
  const access = workspaceAccess.data;
  return <DashboardLayout
    navigationItems={buildAdminWorkspaceNavigation(Boolean(access?.isOwner))}
    title={title}
    loginPath="/admin/login"
    sidebarPanel="admin"
    sidebarIdentity={<AdminSidebarIdentity photoUrl={photoUrl} />}
    workspaceHeader={{
      portal: "Admin Panel",
      name: access?.name ?? "Admin",
      profilePhotoUrl: photoUrl,
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
