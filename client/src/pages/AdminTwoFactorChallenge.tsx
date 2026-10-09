import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ADMIN_HOME_PATH } from "@/lib/adminHome";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useSecondsUntil } from "@/components/registrationFields";
import { useWebOtp } from "@/lib/webOtp";
import { LoadingCradle } from "@/components/BrandMark";
import { KeyRound, LogOut, MessageSquareText, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";

function getErrorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "We could not confirm that. Try again.";
}

type ChallengeMode = "totp" | "recovery" | "sms";

export default function AdminTwoFactorChallenge() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const status = trpc.admin.twoFactorStatus.useQuery(undefined, { enabled: isAdmin, retry: false });
  const verifyCode = trpc.admin.verifyTwoFactorChallenge.useMutation();
  const verifyRecoveryCode = trpc.admin.verifyTwoFactorRecoveryCode.useMutation();
  const sendSms = trpc.admin.sendTwoFactorChallengeSms.useMutation();
  const verifySms = trpc.admin.verifyTwoFactorChallengeSms.useMutation();
  const [mode, setMode] = useState<ChallengeMode>("totp");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsSentAt, setSmsSentAt] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const resendInSeconds = useSecondsUntil(smsSentAt);

  useEffect(() => {
    if (!status.data) return;
    if (!status.data.enrolled) navigate("/admin/2fa-setup");
    else if (status.data.verified) navigate(ADMIN_HOME_PATH);
  }, [status.data, navigate]);

  const succeed = async () => {
    await utils.admin.getWorkspaceAccess.invalidate();
    navigate(ADMIN_HOME_PATH);
  };

  const runVerifyCode = async (candidate: string) => {
    if (verifyCode.isPending) return;
    setFormError(null);
    try {
      await verifyCode.mutateAsync({ code: candidate });
      await succeed();
    } catch (cause) {
      setCode("");
      setFormError(getErrorMessage(cause));
    }
  };

  // Six digits is a complete code, so there is nothing to wait for a button click to do.
  const handleCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void runVerifyCode(digits);
  };

  const submitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runVerifyCode(code);
  };

  const submitRecoveryCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    try {
      await verifyRecoveryCode.mutateAsync({ code: recoveryCode });
      await succeed();
    } catch (cause) {
      setRecoveryCode("");
      setFormError(getErrorMessage(cause));
    }
  };

  const requestSms = async () => {
    setFormError(null);
    try {
      const result = await sendSms.mutateAsync();
      setSmsSentAt(Date.now() + result.resendAfterSeconds * 1000);
    } catch (cause) {
      setFormError(getErrorMessage(cause));
    }
  };

  const openSmsMode = () => {
    setMode("sms");
    setFormError(null);
    void requestSms();
  };

  const runVerifySms = async (candidate: string) => {
    if (verifySms.isPending) return;
    setFormError(null);
    try {
      await verifySms.mutateAsync({ code: candidate });
      await succeed();
    } catch (cause) {
      setSmsCode("");
      setFormError(getErrorMessage(cause));
    }
  };

  const handleSmsCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setSmsCode(digits);
    if (digits.length === 4) void runVerifySms(digits);
  };

  useWebOtp(mode === "sms" && smsSentAt > 0, handleSmsCodeChange, smsSentAt);

  const submitSmsCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runVerifySms(smsCode);
  };

  const busy = authLoading || status.isLoading;
  const ready = isAdmin && !busy && status.data?.enrolled && !status.data.verified;
  const smsBackup = status.data?.smsBackup ?? null;

  const modeCopy: Record<ChallengeMode, string> = {
    totp: "Enter the 6-digit code from your authenticator app.",
    recovery: "Enter one of the recovery codes you saved when you turned this on.",
    sms: smsSentAt ? `Enter the 4-digit code sent to ${smsBackup?.maskedPhone ?? "your phone"}.` : "Sending a code to your phone…",
  };

  return <div className="site-page min-h-screen bg-j-page text-j-ink">
    <SiteHeader />
    <main className="px-4 py-10 sm:px-6 lg:py-20">
      <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-j-border bg-white px-6 py-9 shadow-[0_1px_2px_rgba(16,49,77,.05),0_20px_54px_-14px_rgba(16,49,77,.20)] ring-1 ring-[rgba(16,49,77,.035)] sm:px-10 sm:py-11">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,var(--j-accent),transparent)]" />
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex rounded-xl bg-j-accent-wash p-3.5 text-j-accent shadow-[0_8px_20px_-8px_rgba(22,125,221,.55)]"><ShieldCheck size={28} /></span>
          <h1 className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#2782c7]">Two-factor verification</h1>
          <p className="mt-2 text-sm leading-6 text-j-ink-soft">{modeCopy[mode]}</p>
        </div>

        {busy ? <div className="mt-8 flex items-center gap-3 rounded-xl bg-j-surface-sunken px-4 py-4 text-sm font-semibold text-[#56738d]"><LoadingCradle /> Checking your account…</div> : null}

        {ready && mode === "totp" ? <form className="mt-8 grid gap-3" onSubmit={event => void submitCode(event)} noValidate>
          <label htmlFor="admin-2fa-code" className="text-sm font-bold text-j-ink-soft">6-digit code</label>
          <input id="admin-2fa-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} autoFocus value={code} onChange={event => handleCodeChange(event.target.value)} disabled={verifyCode.isPending} required className="h-12 rounded-lg border border-j-field-border bg-j-surface-sunken px-4 text-center font-mono text-lg tracking-[0.3em] transition-colors focus-visible:border-j-accent focus-visible:outline-none focus-visible:ring-0" />
          {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold text-j-err">{formError}</p> : null}
          <button type="submit" disabled={code.length !== 6 || verifyCode.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-j-accent px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,59,96,0.24)] transition hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-60">{verifyCode.isPending ? "Checking…" : "Verify"}</button>
          <div className="mt-1 flex flex-col items-center gap-1.5">
            {smsBackup ? <button type="button" onClick={openSmsMode} className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-j-accent underline-offset-4 hover:underline"><MessageSquareText size={13} /> Send a code by SMS instead</button> : null}
            <button type="button" onClick={() => { setMode("recovery"); setFormError(null); }} className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-j-accent underline-offset-4 hover:underline"><KeyRound size={13} /> Use a recovery code instead</button>
          </div>
        </form> : null}

        {ready && mode === "sms" ? <form className="mt-8 grid gap-3" onSubmit={event => void submitSmsCode(event)} noValidate>
          <label htmlFor="admin-2fa-sms-code" className="text-sm font-bold text-j-ink-soft">4-digit code</label>
          <input id="admin-2fa-sms-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{4}" maxLength={4} autoFocus value={smsCode} onChange={event => handleSmsCodeChange(event.target.value)} disabled={verifySms.isPending || sendSms.isPending} required className="h-12 rounded-lg border border-j-field-border bg-j-surface-sunken px-4 text-center font-mono text-lg tracking-[0.3em] transition-colors focus-visible:border-j-accent focus-visible:outline-none focus-visible:ring-0" />
          {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold text-j-err">{formError}</p> : null}
          <button type="submit" disabled={smsCode.length !== 4 || verifySms.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-j-accent px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,59,96,0.24)] transition hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-60">{verifySms.isPending ? "Checking…" : "Verify"}</button>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            <button type="button" onClick={() => void requestSms()} disabled={sendSms.isPending || resendInSeconds > 0} className="text-xs font-bold text-j-accent underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-j-ink-faint disabled:no-underline">{resendInSeconds > 0 ? `Send another code (${resendInSeconds}s)` : "Send another code"}</button>
            <button type="button" onClick={() => { setMode("totp"); setFormError(null); }} className="text-xs font-bold text-j-accent underline-offset-4 hover:underline">Use my authenticator app instead</button>
          </div>
        </form> : null}

        {ready && mode === "recovery" ? <form className="mt-8 grid gap-3" onSubmit={event => void submitRecoveryCode(event)} noValidate>
          <label htmlFor="admin-2fa-recovery-code" className="text-sm font-bold text-j-ink-soft">Recovery code</label>
          <input id="admin-2fa-recovery-code" autoComplete="off" autoFocus value={recoveryCode} onChange={event => setRecoveryCode(event.target.value)} disabled={verifyRecoveryCode.isPending} required maxLength={40} className="h-12 rounded-lg border border-j-field-border bg-j-surface-sunken px-4 text-center font-mono text-sm tracking-widest transition-colors focus-visible:border-j-accent focus-visible:outline-none focus-visible:ring-0" />
          {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold text-j-err">{formError}</p> : null}
          <button type="submit" disabled={!recoveryCode.trim() || verifyRecoveryCode.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-j-accent px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,59,96,0.24)] transition hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-60">{verifyRecoveryCode.isPending ? "Checking…" : "Verify with recovery code"}</button>
          <button type="button" onClick={() => { setMode("totp"); setFormError(null); }} className="mt-1 text-xs font-bold text-j-accent underline-offset-4 hover:underline">Use my authenticator app instead</button>
        </form> : null}

        <div className="mt-8 flex justify-center border-t border-j-border pt-5">
          <button type="button" onClick={() => void logout().then(() => navigate("/admin/login"))} className="inline-flex items-center gap-1.5 text-xs font-bold text-j-ink-soft underline-offset-4 hover:underline"><LogOut size={13} /> Sign out</button>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
