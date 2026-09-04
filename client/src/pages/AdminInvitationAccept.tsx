import { useAuth } from "@/_core/hooks/useAuth";
import SiteHeader from "@/components/SiteHeader";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";

function InlineError({ message }: { message: string }) {
  return <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{message}</p>;
}

export default function AdminInvitationAccept() {
  const [, params] = useRoute("/admin/invitation/:token");
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const accept = trpc.admin.acceptInvitation.useMutation();
  const token = params?.token ?? "";

  if (loading) return <div className="flex min-h-screen items-center justify-center text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking invitation…</div>;
  return <div className="min-h-screen bg-j-page"><SiteHeader /><main className="mx-auto flex min-h-[76vh] max-w-xl items-center px-4 py-10"><section className="w-full rounded-[1.8rem] border border-[#d6e2eb] bg-white p-7 text-center shadow-[0_24px_70px_rgba(27,84,122,0.14)] sm:p-10"><span className="inline-flex rounded-xl bg-[#e9f6ff] p-3 text-j-accent"><ShieldCheck size={28} /></span><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#2782c7]">Admin invitation</p><h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-j-ink">Join the Admin team</h1>{!user ? <><p className="mt-3 text-sm leading-7 text-j-ink-soft">Sign in with the exact email address that received this invitation. Invitation links expire and can only be used once.</p><button type="button" onClick={startLogin} className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-j-ink px-4 text-sm font-bold text-white transition hover:bg-[#102f4c]">Sign in to accept invitation</button></> : user.role === "admin" ? <><p className="mt-3 text-sm leading-7 text-j-ink-soft">This account already has Admin access. The Project Owner can assign or reset its dedicated User ID and password.</p><Link href="/admin/login" className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-j-ink px-4 text-sm font-bold text-white">Go to Admin sign in</Link></> : accept.isSuccess ? <><CheckCircle2 className="mx-auto mt-6 h-11 w-11 text-emerald-600" /><p className="mt-4 text-sm leading-7 text-j-ink-soft">Your Admin role is active. The Project Owner will provide your dedicated User ID and temporary password through a verified private channel.</p><Link href="/admin/login" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-j-accent px-4 text-sm font-bold text-white">Go to Admin sign in</Link></> : <><p className="mt-3 text-sm leading-7 text-j-ink-soft">You are signed in to this account. Accept only if this invitation was shared with you by the Project Owner.</p>{accept.isError ? <InlineError message={accept.error.message || "This invitation cannot be accepted."} /> : null}<button type="button" disabled={!/^[a-f0-9]{64}$/i.test(token) || accept.isPending} onClick={() => accept.mutate({ token }, { onSuccess: async () => { await utils.auth.me.invalidate(); } })} className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-j-ink px-4 text-sm font-bold text-white transition hover:bg-[#102f4c] disabled:opacity-50">{accept.isPending ? "Accepting…" : "Accept Admin invitation"}</button></>}</section></main></div>;
}
