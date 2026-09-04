import { useSiteContact } from "@/lib/siteContent";
import SiteHeader from "@/components/SiteHeader";
import { fieldLabel } from "@/components/journeyField";
import { CapsLockWarning, useCapsLockWarning } from "@/components/CapsLockWarning";
import { TutorWorkspaceTransition } from "@/components/TutorWorkspaceTransition";
import { trpc } from "@/lib/trpc";
import { RecordIcon } from "@/components/recordIcons";
import { clearCurrentTutorPortalLoginHandoff, clearCurrentTutorPortalToken, consumeCurrentTutorPortalReauthNotice, consumeCurrentTutorSignedOutNotice, getCurrentTutorPortalToken, markCurrentTutorPortalLoginHandoff, storeCurrentTutorPortalToken } from "@/lib/tutorPortalSession";
import { completeTutorLoginHandoff } from "@/lib/tutorLoginHandoff";
import { TRPCClientError } from "@trpc/client";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import React, { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const fieldRow = "mt-2 flex items-center gap-2 rounded-xl border border-j-field-border bg-j-surface-sunken px-3.5 transition focus-within:border-j-accent focus-within:bg-white focus-within:ring-4 focus-within:ring-j-accent/12";
const fieldInput = "min-w-0 flex-1 bg-transparent py-3 text-sm text-j-ink outline-none placeholder:text-[#9aabbb]";

/**
 * UNAUTHORIZED means wrong credentials — keep the generic hint. Every other
 * coded error (FORBIDDEN for suspended/closed, TOO_MANY_REQUESTS for a rate
 * block) carries an actionable server message, so show it verbatim — otherwise
 * the Tutor is left thinking their password is wrong and keeps retrying.
 */
export function getTutorSignInErrorMessage(cause: unknown): string {
  if (cause instanceof TRPCClientError && cause.data?.code === "UNAUTHORIZED") {
    return "The email/mobile number or password is incorrect.";
  }
  if (cause instanceof TRPCClientError && typeof cause.message === "string" && cause.message.trim()) {
    return cause.message;
  }
  return "We could not sign you in. Please check your details and try again.";
}

const RECOVERY_MESSAGE = "Hello Connect Tutors BD, I need help recovering my account.";

export default function TutorLogin() {
  const contact = useSiteContact();
  const [, navigate] = useLocation();
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const loginAccount = trpc.auth.loginAccount.useMutation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const capsLockWarning = useCapsLockWarning();
  const [signedOutSuccessfully, setSignedOutSuccessfully] = useState(false);
  const [needsTabReauth, setNeedsTabReauth] = useState(false);
  const [hadPortalTokenAtLoad] = useState(() => Boolean(getCurrentTutorPortalToken()));
  const [isEnteringTutorWorkspace, setIsEnteringTutorWorkspace] = useState(false);

  useEffect(() => {
    setSignedOutSuccessfully(consumeCurrentTutorSignedOutNotice());
    setNeedsTabReauth(consumeCurrentTutorPortalReauthNotice());
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === "tutor" && hadPortalTokenAtLoad) navigate("/tutor/dashboard");
  }, [authLoading, hadPortalTokenAtLoad, navigate, user?.role]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsEnteringTutorWorkspace(false);
    try {
      const result = await loginAccount.mutateAsync({ role: "tutor", identifier: identifier.trim(), password });
      if (!result.tutorPortalToken) throw new Error("Tutor portal proof was not issued.");
      setIsEnteringTutorWorkspace(true);
      await completeTutorLoginHandoff({
        tutorPortalToken: result.tutorPortalToken,
        storeTutorPortalToken: storeCurrentTutorPortalToken,
        markPortalLoginHandoff: markCurrentTutorPortalLoginHandoff,
        clearTutorPortalToken: clearCurrentTutorPortalToken,
        clearPortalLoginHandoff: clearCurrentTutorPortalLoginHandoff,
        fetchAuthenticatedUser: () => utils.auth.me.fetch(),
        navigate,
      });
      toast.success("Welcome back. Your Tutor dashboard is ready.");
    } catch (cause) {
      setIsEnteringTutorWorkspace(false);
      setError(getTutorSignInErrorMessage(cause));
    }
  };

  return <div className="site-page min-h-screen bg-j-page text-j-ink">
    <SiteHeader />
    <main className="px-4 py-10 sm:px-6 lg:py-20">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[1.7rem] border border-j-border bg-white shadow-[0_24px_70px_rgba(27,84,122,0.14)] lg:grid-cols-[0.88fr_1.12fr]">
        <div className="relative overflow-hidden bg-j-rail px-7 py-10 text-white sm:px-12 sm:py-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#0a4c85]/50 blur-2xl" />
          <div className="relative">
            <Link href="/" className="text-sm font-bold text-[#bde9ff]">Connect Tutors BD</Link>
            <div className="mt-20 max-w-sm"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8fd0f5]">Tutor workspace</p><h1 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.04em]">Continue building your teaching profile.</h1><p className="mt-5 text-sm leading-7 text-[#c8ddf0]">Sign in to manage your Tutor ID, profile information, requests, and account settings.</p></div>
          </div>
        </div>
        <div className="px-7 py-10 sm:px-14 sm:py-14">
          <div className="mx-auto max-w-md"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2782c7]">Tutor sign in</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-j-ink">Welcome back</h2><p className="mt-3 text-sm leading-7 text-[#728ba0]">Use the email address or Bangladesh mobile number and password you created during Tutor registration.</p>
            {signedOutSuccessfully ? <p role="status" className="mt-6 rounded-xl border border-[#b9e7cf] bg-[#f0fbf5] px-4 py-3 text-sm font-semibold text-[#22784c]">Signed out successfully.</p> : null}
            {needsTabReauth && !signedOutSuccessfully ? <p role="status" className="mt-6 rounded-xl border border-[#bcdcf0] bg-[#eef7fd] px-4 py-3 text-sm font-semibold leading-6 text-[#1f5f8a]">For your security, each browser tab signs in separately. Please sign in again to open your Tutor Dashboard here.</p> : null}
            {isEnteringTutorWorkspace ? <div className="mt-8"><TutorWorkspaceTransition /></div> : <form onSubmit={submit} className="mt-8 space-y-6">
              <label htmlFor="tutor-login-identifier" className={fieldLabel}>Email or mobile number <span className="text-[#dd4b4b]">*</span><span className={fieldRow}><Mail size={16} className="text-[#5b86a3]" aria-hidden="true" /><input id="tutor-login-identifier" required type="text" inputMode="text" value={identifier} onChange={event => setIdentifier(event.target.value)} className={fieldInput} placeholder="name@example.com or 017XXXXXXXX" autoComplete="username" /></span></label>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="tutor-login-password" className={fieldLabel}><span className="inline-flex items-center gap-1.5"><RecordIcon name="password" size={14} className="text-j-accent" />Password</span> <span className="text-[#dd4b4b]">*</span></label>
                  <a className="text-xs font-semibold text-j-accent underline-offset-4 hover:underline" href={contact.whatsapp(RECOVERY_MESSAGE)}>Need help signing in?</a>
                </div>
                <span className={fieldRow}><input id="tutor-login-password" required type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} onKeyDown={capsLockWarning.updateCapsLockState} onKeyUp={capsLockWarning.updateCapsLockState} onBlur={capsLockWarning.clearCapsLockWarning} className={fieldInput} placeholder="Your password" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} className="-mr-1.5 rounded-lg p-1 text-[#5b86a3] transition hover:text-j-accent focus:outline-none focus:ring-2 focus:ring-j-accent/40">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
                <CapsLockWarning isCapsLockOn={capsLockWarning.isCapsLockOn} />
              </div>
              {error ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold text-j-err">{error}</p> : null}
              <button type="submit" disabled={loginAccount.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-j-accent px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(20,127,192,0.23)] transition hover:bg-j-accent-hover disabled:cursor-wait disabled:opacity-70">{loginAccount.isPending ? <><LoaderCircle className="animate-spin" size={17} /> Signing in…</> : <>Sign in to Tutor Dashboard <ArrowRight size={17} /></>}</button>
            </form>}
            <div className="mt-8 space-y-5 text-center">
              <p className="flex items-center justify-center gap-2 text-xs text-[#6c8295]"><LockKeyhole size={14} className="text-j-accent" /> Passwords are protected with a one-way server-side hash.</p>
              <p className="text-xs leading-5 text-[#7b95a9]">For password recovery, contact support on WhatsApp. We do not offer email reset links yet.</p>
              <p className="text-sm text-[#59748b]">New Tutor? <Link href="/become-tutor" className="font-bold text-j-accent">Create an account</Link></p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>;
}
