import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useSecondsUntil } from "@/components/registrationFields";
import { LoadingCradle } from "@/components/BrandMark";
import { LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";

function getErrorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "We could not confirm that. Try again.";
}

/** Only a path on this site: a `next` of `//elsewhere.example` or `https://...` must not carry anyone off it. */
export function safeNextPath(raw: string | null, fallback: string) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

/** How long the finished tick stays on screen before the page moves on. */
const VERIFIED_HOLD_MS = 900;

function VerifiedMark() {
  return <svg aria-hidden="true" viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle className="login-verified-ring" cx="14" cy="14" r="11.5" pathLength={1} />
    <path className="login-verified-tick" d="M8.5 14.5l3.8 3.8 7.2-7.6" pathLength={1} />
  </svg>;
}

export default function LoginTwoFactorChallenge() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const isMember = user?.role === "tutor" || user?.role === "guardian" || user?.role === "user";
  const home = user?.role === "tutor" ? "/tutor/dashboard" : "/guardian/dashboard";
  const [requestedNext] = useState(() => new URLSearchParams(window.location.search).get("next"));
  const next = safeNextPath(requestedNext, home);
  const utils = trpc.useUtils();
  const status = trpc.auth.loginTwoFactorStatus.useQuery(undefined, { enabled: isMember, retry: false, refetchOnWindowFocus: false });
  const sendCode = trpc.auth.sendLoginTwoFactorCode.useMutation();
  const verifyCode = trpc.auth.verifyLoginTwoFactorCode.useMutation();
  const [code, setCode] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const resendInSeconds = useSecondsUntil(sentAt);
  const askedOnce = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    else if (!authLoading && user && !isMember) navigate("/");
  }, [authLoading, user, isMember, navigate]);

  const owed = Boolean(status.data?.required && !status.data.cleared);

  useEffect(() => {
    // Once the code is accepted the status refetches as "nothing owed"; the tick, not that, decides when to leave.
    if (status.data && !owed && !verified) navigate(next);
  }, [status.data, owed, verified, next, navigate]);

  const requestCode = async () => {
    setFormError(null);
    try {
      const result = await sendCode.mutateAsync();
      setSentAt(Date.now() + result.resendAfterSeconds * 1000);
    } catch (cause) {
      setFormError(getErrorMessage(cause));
    }
  };

  useEffect(() => {
    if (!owed || askedOnce.current) return;
    askedOnce.current = true;
    void requestCode();
    // The first code goes out once, when the page learns it is owed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owed]);

  const runVerify = async (candidate: string) => {
    if (verifyCode.isPending) return;
    setFormError(null);
    try {
      await verifyCode.mutateAsync({ code: candidate });
      setVerified(true);
      const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      await Promise.all([utils.invalidate(), new Promise(resolve => setTimeout(resolve, reduceMotion ? 0 : VERIFIED_HOLD_MS))]);
      navigate(next);
    } catch (cause) {
      setCode("");
      setFormError(getErrorMessage(cause));
    }
  };

  // Four digits is a complete code, so there is nothing for a button click to wait on.
  const handleCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setCode(digits);
    if (digits.length === 4) void runVerify(digits);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runVerify(code);
  };

  const busy = authLoading || status.isLoading;
  const maskedPhone = status.data?.maskedPhone ?? "your phone";

  return <div className="site-page min-h-screen bg-j-page text-j-ink">
    <SiteHeader />
    <main className="px-4 py-10 sm:px-6 lg:py-20">
      <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-j-border bg-white px-6 py-9 shadow-[0_1px_2px_rgba(16,49,77,.05),0_20px_54px_-14px_rgba(16,49,77,.20)] ring-1 ring-[rgba(16,49,77,.035)] sm:px-10 sm:py-11">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,var(--j-accent),transparent)]" />
        <div className="flex flex-col items-center text-center">
          <span className={`inline-flex rounded-xl bg-j-accent-wash p-3.5 text-j-accent shadow-[0_8px_20px_-8px_rgba(22,125,221,.55)]${verified ? " login-verified-badge" : ""}`}>{verified ? <VerifiedMark /> : <ShieldCheck size={28} />}</span>
          <h1 className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#2782c7]">{verified ? "Verified" : "Verify it is you"}</h1>
          <p role="status" className="mt-2 text-sm leading-6 text-j-ink-soft">{verified ? "Taking you in…" : sentAt ? `Enter the 4-digit code sent to ${maskedPhone}.` : "Sending a code to your phone…"}</p>
        </div>

        {busy ? <div className="mt-8 flex items-center gap-3 rounded-xl bg-j-surface-sunken px-4 py-4 text-sm font-semibold text-[#56738d]"><LoadingCradle /> Checking your account…</div> : null}

        {owed && !verified ? <form className="mt-8 grid gap-3" onSubmit={submit} noValidate>
          <label htmlFor="login-2fa-code" className="text-sm font-bold text-j-ink-soft">4-digit code</label>
          <input id="login-2fa-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{4}" maxLength={4} autoFocus value={code} onChange={event => handleCodeChange(event.target.value)} disabled={verifyCode.isPending || sendCode.isPending} required className="h-12 rounded-lg border border-j-field-border bg-j-surface-sunken px-4 text-center font-mono text-lg tracking-[0.3em] transition-colors focus-visible:border-j-accent focus-visible:outline-none focus-visible:ring-0" />
          {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold text-j-err">{formError}</p> : null}
          <button type="submit" disabled={code.length !== 4 || verifyCode.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-j-accent px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,59,96,0.24)] transition hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-60">{verifyCode.isPending ? "Checking…" : "Verify"}</button>
          <button type="button" onClick={() => void requestCode()} disabled={sendCode.isPending || resendInSeconds > 0} className="mt-1 text-xs font-bold text-j-accent underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-j-ink-faint disabled:no-underline">{resendInSeconds > 0 ? `Send another code (${resendInSeconds}s)` : "Send another code"}</button>
        </form> : null}

        <div className="mt-8 flex justify-center border-t border-j-border pt-5">
          <button type="button" onClick={() => void logout().then(() => navigate("/auth"))} className="inline-flex items-center gap-1.5 text-xs font-bold text-j-ink-soft underline-offset-4 hover:underline"><LogOut size={13} /> Sign out</button>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
