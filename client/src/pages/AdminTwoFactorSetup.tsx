import { useAuth } from "@/_core/hooks/useAuth";
import SiteHeader from "@/components/SiteHeader";
import { trpc } from "@/lib/trpc";
import QRCode from "qrcode";
import { AlertCircle, CheckCircle2, Copy, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { getAdminTwoFactorDestination } from "./admin-two-factor-routing";

export default function AdminTwoFactorSetup() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/admin/login" });
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const status = trpc.admin.getTwoFactorStatus.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const setup = trpc.admin.setupTwoFactor.useMutation();
  const verify = trpc.admin.verifyTwoFactorSetup.useMutation();
  const [code, setCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (status.data?.enrolled) navigate(getAdminTwoFactorDestination(status.data));
  }, [navigate, status.data]);

  useEffect(() => {
    if (!setup.data?.otpauthUri) return;
    let live = true;
    void QRCode.toDataURL(setup.data.otpauthUri, { margin: 1, width: 240, color: { dark: "#173b60", light: "#ffffff" } }).then((value: string) => {
      if (live) setQrDataUrl(value);
    });
    return () => { live = false; };
  }, [setup.data?.otpauthUri]);

  if (loading || status.isLoading) return <div className="flex min-h-screen items-center justify-center text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading secure enrollment…</div>;
  if (user?.role !== "admin") return <AccessDenied />;

  const enrollment = setup.data;
  const copyCodes = async () => {
    if (enrollment) await navigator.clipboard.writeText(enrollment.recoveryCodes.join("\n"));
  };

  return <div className="min-h-screen bg-[#f5f8ff] text-[#173b60]"><SiteHeader /><main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-16"><div className="grid overflow-hidden rounded-[1.8rem] border border-[#d6e2eb] bg-white shadow-[0_24px_70px_rgba(27,84,122,0.14)] lg:grid-cols-[0.78fr_1.22fr]"><section className="bg-[#173b60] p-7 text-white sm:p-10"><span className="inline-flex rounded-2xl bg-white/10 p-3 text-[#a9e2ff]"><ShieldCheck size={30} /></span><p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#69c4f2]">Required security step</p><h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">Set up your authenticator.</h1><p className="mt-5 text-sm leading-7 text-[#c8dbea]">Every Connect Tutors BD Admin uses a second factor. Your secret is encrypted on the server, and recovery codes are never shown again after this page.</p><ol className="mt-8 space-y-4 text-sm text-[#d7e8f5]"><li><strong className="text-white">1.</strong> Install or open an authenticator app.</li><li><strong className="text-white">2.</strong> Scan the QR code and save recovery codes offline.</li><li><strong className="text-white">3.</strong> Enter the current 6-digit code to activate access.</li></ol></section><section className="p-6 sm:p-10">{!enrollment ? <div className="mx-auto max-w-md"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2782c7]">Admin 2FA enrollment</p><h2 className="mt-3 text-2xl font-bold text-[#173b60]">Protect your workspace</h2><p className="mt-3 text-sm leading-6 text-slate-600">Start enrollment only when you are ready to save the one-time recovery codes in a private, offline location.</p>{setup.isError ? <InlineError message="We could not begin two-factor setup. Please refresh and try again." /> : null}<button type="button" onClick={() => setup.mutate()} disabled={setup.isPending} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173b60] px-4 text-sm font-bold text-white transition hover:bg-[#102f4c] disabled:opacity-60"><KeyRound size={17} /> {setup.isPending ? "Preparing…" : "Start authenticator setup"}</button><Link href="/admin/login" className="mt-6 block text-center text-sm font-semibold text-[#39779e]">Return to Admin sign in</Link></div> : <div className="mx-auto max-w-lg"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2782c7]">Step 2 of 2</p><h2 className="mt-3 text-2xl font-bold text-[#173b60]">Scan and verify</h2><p className="mt-2 text-sm leading-6 text-slate-600">Use your authenticator app to scan this code. Then securely retain each recovery code below before confirming.</p><div className="mt-6 grid gap-5 md:grid-cols-[auto_1fr] md:items-start"><div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">{qrDataUrl ? <img src={qrDataUrl} alt="Authenticator application QR code" className="h-52 w-52" /> : <div className="flex h-52 w-52 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating QR…</div>}</div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Keep these recovery codes private.</strong><p className="mt-1">Each code works once. They can restore Admin access if your authenticator is unavailable.</p><button type="button" onClick={() => void copyCodes()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"><Copy size={14} /> Copy codes</button></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{enrollment.recoveryCodes.map((recoveryCode, index) => <code key={recoveryCode} className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-bold tracking-wider text-slate-700">{index + 1}. {recoveryCode}</code>)}</div><label className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#116fc4]" /><span>I have securely saved these recovery codes. I understand they will not be shown again.</span></label><label className="mt-5 block"><span className="text-sm font-bold text-slate-800">Authenticator code</span><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-center font-mono text-lg tracking-[0.35em] outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100" /></label>{verify.isError ? <InlineError message={verify.error.message || "The authenticator code could not be verified."} /> : null}<button type="button" disabled={!acknowledged || code.length !== 6 || verify.isPending} onClick={() => verify.mutate({ secret: enrollment.secret, code, recoveryCodes: enrollment.recoveryCodes }, { onSuccess: async () => { await utils.admin.getTwoFactorStatus.invalidate(); navigate("/admin/matching"); } })} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#116fc4] px-4 text-sm font-bold text-white transition hover:bg-[#0d5da4] disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={17} /> {verify.isPending ? "Verifying…" : "Activate Admin protection"}</button></div>}</section></div></main></div>;
}

export function InlineError({ message }: { message: string }) {
  return <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {message}</p>;
}

export function AccessDenied() {
  return <div className="min-h-screen bg-[#f5f8ff]"><SiteHeader /><main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center"><ShieldCheck className="h-12 w-12 text-slate-400" /><h1 className="mt-5 text-2xl font-bold text-slate-900">Admin access required</h1><p className="mt-2 text-sm leading-6 text-slate-600">This security page is available only to established Connect Tutors BD Admin accounts.</p><Link href="/admin/login" className="mt-6 rounded-xl bg-[#173b60] px-4 py-3 text-sm font-bold text-white">Return to Admin sign in</Link></main></div>;
}
