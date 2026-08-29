import SiteHeader from "@/components/SiteHeader";
import { CapsLockWarning, useCapsLockWarning } from "@/components/CapsLockWarning";
import { TutorWorkspaceTransition } from "@/components/TutorWorkspaceTransition";
import { trpc } from "@/lib/trpc";
import { clearCurrentTutorPortalLoginHandoff, clearCurrentTutorPortalToken, consumeCurrentTutorSignedOutNotice, getCurrentTutorPortalToken, markCurrentTutorPortalLoginHandoff, storeCurrentTutorPortalToken } from "@/lib/tutorPortalSession";
import { completeTutorLoginHandoff } from "@/lib/tutorLoginHandoff";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import React, { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const fieldClass = "mt-2 w-full border-0 border-b border-[#b7c6d1] bg-transparent px-0 pb-2 text-sm text-[#183d60] outline-none transition placeholder:text-[#a4afba] focus:border-[#167ddd] focus:ring-0";

export default function TutorLogin() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const loginTutor = trpc.auth.loginTutor.useMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const capsLockWarning = useCapsLockWarning();
  const [signedOutSuccessfully, setSignedOutSuccessfully] = useState(false);
  const [isEnteringTutorWorkspace, setIsEnteringTutorWorkspace] = useState(false);

  useEffect(() => {
    setSignedOutSuccessfully(consumeCurrentTutorSignedOutNotice());
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === "tutor" && getCurrentTutorPortalToken()) navigate("/tutor/dashboard");
  }, [authLoading, navigate, user?.role]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsEnteringTutorWorkspace(false);
    try {
      const result = await loginTutor.mutateAsync({ email: email.trim(), password });
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
      const message = cause instanceof Error && cause.message.includes("Invalid email")
        ? "The email or password is incorrect."
        : "We could not sign you in. Please check your details and try again.";
      setError(message);
    }
  };

  return <div className="site-page min-h-screen bg-[#f5f8ff] text-[#173b60]">
    <SiteHeader />
    <main className="px-4 py-10 sm:px-6 lg:py-20">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[1.7rem] border border-[#d6e2eb] bg-white shadow-[0_24px_70px_rgba(27,84,122,0.14)] lg:grid-cols-[0.88fr_1.12fr]">
        <div className="relative overflow-hidden bg-[#dff3ff] px-7 py-10 sm:px-12 sm:py-14">
          <Link href="/" className="text-sm font-bold text-[#176da3]">Connect Tutors BD</Link>
          <div className="relative z-10 mt-20 max-w-sm"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1479bf]">Tutor workspace</p><h1 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.05em] text-[#173b60]">Continue building your teaching profile.</h1><p className="mt-5 text-sm leading-7 text-[#5d7891]">Sign in to manage your Tutor ID, profile information, requests, and account settings.</p></div>
          <div className="absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-[#b9e4fb]" />
          <div className="absolute right-12 top-24 h-24 w-24 rounded-full border-[18px] border-white/60" />
        </div>
        <div className="px-7 py-10 sm:px-14 sm:py-14">
          <div className="mx-auto max-w-md"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2782c7]">Tutor sign in</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#173b60]">Welcome back</h2><p className="mt-3 text-sm leading-7 text-[#728ba0]">Use the email address and password you created during Tutor registration.</p>
            {signedOutSuccessfully ? <p role="status" className="mt-6 rounded-xl border border-[#b9e7cf] bg-[#f0fbf5] px-4 py-3 text-sm font-semibold text-[#22784c]">Signed out successfully.</p> : null}
            {isEnteringTutorWorkspace ? <div className="mt-8"><TutorWorkspaceTransition /></div> : <form onSubmit={submit} className="mt-8 space-y-6">
              <label htmlFor="tutor-login-email" className="block text-sm font-semibold">Email address <span className="text-[#dd4b4b]">*</span><span className="mt-2 flex items-center border-b border-[#b7c6d1] pb-2 transition focus-within:border-[#167ddd]"><Mail size={16} className="mr-2 text-[#5b86a3]" /><input id="tutor-login-email" required type="email" value={email} onChange={event => setEmail(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[#183d60] outline-none placeholder:text-[#a4afba]" placeholder="name@example.com" autoComplete="email" /></span></label>
              <div><label htmlFor="tutor-login-password" className="block text-sm font-semibold">Password <span className="text-[#dd4b4b]">*</span><span className="mt-2 flex items-center border-b border-[#b7c6d1] pb-2 transition focus-within:border-[#167ddd]"><input id="tutor-login-password" required type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} onKeyDown={capsLockWarning.updateCapsLockState} onKeyUp={capsLockWarning.updateCapsLockState} onBlur={capsLockWarning.clearCapsLockWarning} className="min-w-0 flex-1 bg-transparent text-sm text-[#183d60] outline-none placeholder:text-[#a4afba]" placeholder="Your password" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} className="ml-2 rounded-md p-1 text-[#5b86a3] transition hover:bg-[#edf7fc] hover:text-[#147fc0] focus:outline-none focus:ring-2 focus:ring-[#167ddd]/40">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><CapsLockWarning isCapsLockOn={capsLockWarning.isCapsLockOn} /></div>
              {error ? <p role="alert" className="rounded-xl bg-[#fff1f1] px-4 py-3 text-sm font-medium text-[#a82d2d]">{error}</p> : null}
              <button type="submit" disabled={loginTutor.isPending} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#147fc0] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(20,127,192,0.23)] transition hover:bg-[#096eaf] disabled:cursor-wait disabled:opacity-70">{loginTutor.isPending ? <><LoaderCircle className="animate-spin" size={17} /> Signing in…</> : <>Sign in to Tutor Dashboard <ArrowRight size={17} /></>}</button>
            </form>}
            <div className="mt-8 space-y-5 text-center">
              <p className="flex items-center justify-center gap-2 text-xs text-[#6c8295]"><LockKeyhole size={14} className="text-[#147fc0]" /> Passwords are protected with a one-way server-side hash.</p>
              <p className="text-sm text-[#59748b]">New Tutor? <Link href="/become-tutor" className="font-bold text-[#147fc0]">Create an account</Link></p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>;
}
