import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { type DashboardNavigationItem } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { BarChart3, ClipboardList, ContactRound, LayoutDashboard, Loader2, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
import { type ReactNode } from "react";

export const ADMIN_WORKSPACE_OWNER_QUERY_OPTIONS = {
  retry: false,
  refetchOnMount: "always",
  refetchOnWindowFocus: "always",
  staleTime: 0,
  gcTime: 0,
} as const;

export function buildAdminWorkspaceNavigation(isOwner: boolean): DashboardNavigationItem[] {
  const items: DashboardNavigationItem[] = [
    { icon: LayoutDashboard, label: "Overview", path: "/admin/dashboard", sectionLabel: "Operations" },
    { icon: UserRoundCog, label: "Tutor management", path: "/admin/tutors", sectionLabel: "Operations" },
    { icon: ContactRound, label: "Guardian activity", path: "/admin/guardians", sectionLabel: "Operations" },
    { icon: ClipboardList, label: "Matching workspace", path: "/admin/matching", sectionLabel: "Operations" },
    { icon: UsersRound, label: "Public Tutor directory", path: "/tutors", sectionLabel: "Public reference", requiresSignOut: true },
  ];
  if (isOwner) {
    items.push({ icon: BarChart3, label: "Admin activity report", path: "/admin/reports", sectionLabel: "Owner controls" });
    items.push({ icon: ShieldCheck, label: "Admin security", path: "/admin/security", sectionLabel: "Owner controls" });
  }
  return items;
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
    return <div className="flex min-h-[60vh] items-center justify-center text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening Admin workspace…</div>;
  }
  if (displayState === "denied") {
    return <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><ShieldCheck className="mb-4 h-12 w-12 text-slate-400" /><h1 className="text-2xl font-bold text-slate-900">Admin access required</h1><p className="mt-2 text-sm leading-6 text-slate-600">This workspace is available only to authorized Connect Tutors BD administrators.</p></section>;
  }
  return <DashboardLayout navigationItems={buildAdminWorkspaceNavigation(Boolean(workspaceAccess.data?.isOwner))} title={title} loginPath="/admin/login">{children}</DashboardLayout>;
}
