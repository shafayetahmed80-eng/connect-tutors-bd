import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { type DashboardNavigationItem } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { SquareDashed, BarChart3, ClipboardList, ContactRound, FileUser, Globe, House, LayoutDashboard, LayoutTemplate, ListChecks, Loader2, LogOut, MapPin, PanelsTopLeft, Scale, School, ShieldCheck, SlidersHorizontal, UserRoundCog, UsersRound } from "lucide-react";
import { type ReactNode } from "react";

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
  { icon: SlidersHorizontal, label: "Limits", path: "/admin/dynamic/limits", sectionLabel: "Dynamic Section" },
];

export function buildAdminWorkspaceNavigation(isOwner: boolean): DashboardNavigationItem[] {
  // Order matters twice over: it is the visible order, and DashboardLayout
  // starts a new section heading wherever `sectionLabel` changes.
  return [
    { icon: LayoutDashboard, label: "Overview", path: "/admin/dashboard", sectionLabel: "Operations" },
    { icon: UserRoundCog, label: "Tutor management", path: "/admin/tutors", sectionLabel: "Operations" },
    { icon: ContactRound, label: "Guardian activity", path: "/admin/guardians", sectionLabel: "Operations" },
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

export function getAdminWorkspaceDisplayState({
  authLoading,
  isAdmin,
  ownerAccessLoading,
  ownerAccessFetching,
}: {
  authLoading: boolean;
  isAdmin: boolean;
  ownerAccessLoading: boolean;
  ownerAccessFetching: boolean;
}) {
  if (authLoading || (isAdmin && (ownerAccessLoading || ownerAccessFetching))) return "loading" as const;
  if (!isAdmin) return "denied" as const;
  return "ready" as const;
}

export default function AdminWorkspaceLayout({ children, title = "Admin workspace" }: { children: ReactNode; title?: string }) {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const workspaceAccess = trpc.admin.getWorkspaceAccess.useQuery(undefined, {
    ...ADMIN_WORKSPACE_OWNER_QUERY_OPTIONS,
    enabled: isAdmin,
  });
  const displayState = getAdminWorkspaceDisplayState({
    authLoading: loading,
    isAdmin: Boolean(isAdmin),
    ownerAccessLoading: workspaceAccess.isLoading,
    ownerAccessFetching: workspaceAccess.isFetching,
  });

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
    workspaceHeader={{
      portal: "Admin Panel",
      name: access?.name ?? "Admin",
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
