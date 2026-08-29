import { useAuth } from "@/_core/hooks/useAuth";
import SiteHeader from "@/components/SiteHeader";
import { trpc } from "@/lib/trpc";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AccessDenied, InlineError } from "./AdminTwoFactorSetup";
import { getAdminTwoFactorDestination } from "./admin-two-factor-routing";

export default function AdminTwoFactorChallenge() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/admin/login" });
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const status = trpc.admin.getTwoFactorStatus.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const challenge = trpc.admin.challengeTwoFactor.useMutation();
  const [code, setCode] = useState("");

  useEffect(() => {
    if (status.data?.verified || status.data?.enrolled === false) navigate(getAdminTwoFactorDestination(status.data));
  }, [navigate, status.data]);

  if (loading || status.isLoading) return <div className="flex min-h-screen items-center justify-center text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking Admin security…</div>;
  if (user?.role !== "admin") return <AccessDenied />;

  return <div className="min-h-screen bg-[#f5f8ff]"><SiteHeader /><main className="mx-auto flex min-h-[76vh] max-w-xl items-center px-4 py-10"><section className="w-full rounded-[1.8rem] border border-[#d6e2eb] bg-white p-7 shadow-[0_24px_70px_rgba(27,84,122,0.14)] sm:p-10"><span className="inline-flex rounded-2xl bg-[#e9f6ff] p-3 text-[#167ddd]"><KeyRound size={28} /></span><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#2782c7]">Admin verification</p><h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#173b60]">Confirm it is you</h1><p className="mt-3 text-sm leading-7 text-slate-600">Enter the current 6-digit code from your authenticator app. You can also enter one saved recovery code if your app is unavailable.</p><label className="mt-7 block"><span className="text-sm font-bold text-slate-800">Authenticator or recovery code</span><input autoFocus autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.trim().slice(0, 32))} placeholder="000000 or recovery code" className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-center font-mono text-base tracking-[0.12em] outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100" /></label>{challenge.isError ? <InlineError message={challenge.error.message || "The verification code is invalid."} /> : null}<button type="button" disabled={code.length < 6 || challenge.isPending} onClick={() => challenge.mutate({ code }, { onSuccess: async () => { await utils.admin.getTwoFactorStatus.invalidate(); navigate("/admin/matching"); } })} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173b60] px-4 text-sm font-bold text-white transition hover:bg-[#102f4c] disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={17} /> {challenge.isPending ? "Verifying…" : "Verify and continue"}</button><p className="mt-5 text-center text-xs leading-5 text-slate-500">If you no longer have your authenticator or recovery codes, ask the Project Owner to reset your two-factor enrollment.</p><Link href="/admin/login" className="mt-6 block text-center text-sm font-semibold text-[#39779e]">Return to Admin sign in</Link></section></main></div>;
}
