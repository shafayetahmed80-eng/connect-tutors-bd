import { SignInForm, SignInHeading, SignInShell } from "@/components/SignInLayout";
import { TutorWorkspaceTransition } from "@/components/TutorWorkspaceTransition";
import { SiteText } from "@/lib/siteContent";
import { rememberSignInRole } from "@/lib/signInRoleMemory";
import { trpc } from "@/lib/trpc";
import { clearCurrentTutorPortalToken, consumeCurrentTutorPortalReauthNotice, consumeCurrentTutorSignedOutNotice, getCurrentTutorPortalToken, storeCurrentTutorPortalToken } from "@/lib/tutorPortalSession";
import { completeTutorLoginHandoff } from "@/lib/tutorLoginHandoff";
import { TRPCClientError } from "@trpc/client";
import React, { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

/**
 * UNAUTHORIZED means wrong credentials — keep the generic hint, unless the
 * details were right for a Guardian account, when the server says so. Every other
 * coded error (FORBIDDEN for suspended/closed, TOO_MANY_REQUESTS for a rate
 * block) carries an actionable server message, so show it verbatim — otherwise
 * the Tutor is left thinking their password is wrong and keeps retrying.
 */
export function getTutorSignInErrorMessage(cause: unknown): string {
  if (cause instanceof TRPCClientError && cause.data?.code === "UNAUTHORIZED") {
    if ((cause.data as { accountRole?: unknown }).accountRole === "guardian" && cause.message.trim()) return cause.message;
    return "The email/mobile number or password is incorrect.";
  }
  if (cause instanceof TRPCClientError && typeof cause.message === "string" && cause.message.trim()) {
    return cause.message;
  }
  return "We could not sign you in. Please check your details and try again.";
}

export default function TutorLogin() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const loginAccount = trpc.auth.loginAccount.useMutation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
        clearTutorPortalToken: clearCurrentTutorPortalToken,
        fetchAuthenticatedUser: () => utils.auth.me.fetch(),
        navigate,
      });
      rememberSignInRole("tutor");
      toast.success("Welcome back. Your Tutor dashboard is ready.");
    } catch (cause) {
      setIsEnteringTutorWorkspace(false);
      setError(getTutorSignInErrorMessage(cause));
    }
  };

  return <SignInShell>
    <SignInHeading slotPrefix="tutor-sign-in" />
    {signedOutSuccessfully ? <p role="status" className="mt-6 rounded-xl border border-j-ok-border bg-j-ok-wash px-4 py-3 text-sm font-semibold text-j-ok">Signed out successfully.</p> : null}
    {needsTabReauth && !signedOutSuccessfully ? <p role="status" className="mt-6 rounded-xl border border-j-border bg-j-accent-wash px-4 py-3 text-sm font-semibold leading-6 text-j-ink-soft">For your security, each browser tab signs in separately. Please sign in again to open your Tutor Dashboard here.</p> : null}
    {isEnteringTutorWorkspace
      ? <div className="mt-8"><TutorWorkspaceTransition /></div>
      : <SignInForm forgotHref="/forgot-password?role=tutor" idPrefix="tutor-login" identifier={identifier} onIdentifier={setIdentifier} password={password} onPassword={setPassword} error={error} pending={loginAccount.isPending} submitLabel={<SiteText slotId="button-section.signIn.tutorDashboard" />} onSubmit={submit} />}
    <p className="mt-6 text-center text-sm text-j-ink-muted">New Tutor? <Link href="/become-tutor" className="font-extrabold text-j-accent underline underline-offset-2">Create an account</Link></p>
  </SignInShell>;
}
