import { useAuth } from "@/_core/hooks/useAuth";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { trpc } from "@/lib/trpc";
import { Loader2, ShieldCheck } from "lucide-react";
import { type ReactNode } from "react";

/**
 * Shared shell for the Dynamic Section content-control pages.
 *
 * The sidebar already hides these links from non-Owner Admins, but the routes
 * are still reachable by URL, so the Owner check is repeated here rather than
 * trusted from navigation alone.
 */
export default function AdminDynamicSectionPage({
  title,
  children,
}: {
  /** Names the page in the workspace header; there is no second copy below it. */
  title: string;
  children?: ReactNode;
}) {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const workspaceAccess = trpc.admin.getWorkspaceAccess.useQuery(undefined, { enabled: isAdmin, retry: false });

  if (loading || (isAdmin && workspaceAccess.isLoading)) {
    return <div className="flex min-h-[58vh] items-center justify-center text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying Owner access…</div>;
  }

  if (!isAdmin || !workspaceAccess.data?.isOwner) {
    return <section className="mx-auto flex min-h-[58vh] max-w-xl flex-col items-center justify-center rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm"><ShieldCheck className="mb-4 h-12 w-12 text-amber-600" /><h1 className="text-2xl font-bold text-slate-900">Owner access required</h1><p className="mt-2 text-sm leading-6 text-slate-700">Site content control is restricted to the Project Owner. No content is loaded for other accounts.</p></section>;
  }

  return <AdminWorkspaceLayout title={title}>
    {/* No page hero: the workspace header already carries the page name, and a
        second copy of it in a navy block below said nothing new. */}
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
      {children ?? <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm font-bold text-slate-700">Content controls are not configured yet.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">This workspace is reserved for editing the published Tutor and Guardian page content. The editing tools will appear here once they are defined.</p>
      </section>}
    </div>
  </AdminWorkspaceLayout>;
}
