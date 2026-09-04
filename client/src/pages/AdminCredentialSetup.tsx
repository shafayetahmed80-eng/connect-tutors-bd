import { useAuth } from "@/_core/hooks/useAuth";
import SiteHeader from "@/components/SiteHeader";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

/**
 * This Owner-verified bridge supports both first-password setup and password
 * recovery. It is not an Admin workspace login method: it only proves
 * ownership before routing to the Owner-only credential management screen.
 */
export default function AdminCredentialSetup() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const workspaceAccess = trpc.admin.getWorkspaceAccess.useQuery(undefined, { enabled: user?.role === "admin", retry: false });

  useEffect(() => {
    if (user?.role === "admin" && workspaceAccess.data?.isOwner) navigate("/admin/security");
  }, [navigate, user?.role, workspaceAccess.data?.isOwner]);

  return <div className="site-page min-h-screen bg-j-page text-j-ink"><SiteHeader /><main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10 sm:px-6"><section className="w-full rounded-xl border border-[#d6e2eb] bg-white p-7 shadow-[0_24px_70px_rgba(27,84,122,0.12)] sm:p-10"><div className="inline-flex rounded-xl bg-[#e9f6ff] p-3 text-j-accent"><KeyRound size={30} /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#2782c7]">Credential recovery</p><h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-j-ink">Set or reset an Admin password</h1><p className="mt-3 text-sm leading-7 text-[#657f94]">This secure bridge verifies the Project Owner before opening the Owner-only credential screen. It does not reveal account details or grant Admin access to any other account.</p>{loading || (user?.role === "admin" && workspaceAccess.isLoading) ? <div className="mt-7 flex items-center gap-3 rounded-xl bg-[#f2f8fc] px-4 py-4 text-sm font-semibold text-[#56738d]"><LoaderCircle className="animate-spin text-j-accent" size={18} /> Checking Owner access…</div> : null}{!loading && !user ? <button type="button" onClick={startLogin} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-j-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-[#102f4c] active:scale-[0.97]"><ShieldCheck size={17} /> Verify Project Owner identity</button> : null}{!loading && user && (user.role !== "admin" || !workspaceAccess.data?.isOwner) ? <div className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">This signed-in account is not the Project Owner. Sign out and use the Owner account to continue.</div> : null}<Link href="/admin/login" className="mt-7 block text-center text-sm font-bold text-[#39779e]">Return to Admin sign in</Link></section></main></div>;
}
