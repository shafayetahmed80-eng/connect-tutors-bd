import React, { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { GraduationCap, UsersRound } from "lucide-react";
import { ghostButton } from "@/components/journeyField";
import { SignInForm, SignInHeading, SignInShell } from "@/components/SignInLayout";
import { TutorWorkspaceTransition } from "@/components/TutorWorkspaceTransition";
import { TRPCClientError } from "@trpc/client";
import { SiteText, useSiteContentText } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";
import { readRememberedSignInRole, rememberSignInRole } from "@/lib/signInRoleMemory";
import { getSafeTutorApplyReturnPath, getTutorApplyPostLoginPath, storeTutorApplyReturnPath } from "@/lib/tutorApplyReturn";
import { clearCurrentTutorPortalToken, storeCurrentTutorPortalToken } from "@/lib/tutorPortalSession";

/**
 * Thrown when the server accepted the credentials but the session cannot be
 * used - a missing portal proof, or an account of the wrong role. Kept distinct
 * so the form never blames the password for something the password did not do.
 */
class SignedInButBlockedError extends Error {}

type PublicAccountRole = "guardian" | "tutor";

export function getPostLoginPath(role: string, returnTo?: string | null, tutorProfileStatus?: string | null): string {
  if (role === "tutor") return getTutorApplyPostLoginPath(tutorProfileStatus, returnTo);
  return role === "guardian" || role === "user" ? "/guardian/dashboard/posted-jobs" : "/";
}

function getTutorApplyReturnFromLocation(location: string) {
  const query = location.split("?")[1];
  if (!query) return null;
  const parameters = new URLSearchParams(query.split("#", 1)[0]);
  if (Array.from(parameters.keys()).some(key => key !== "role" && key !== "returnTo")) return null;
  const roles = parameters.getAll("role");
  if (roles.length !== 1 || roles[0] !== "tutor") return null;
  const returnToValues = parameters.getAll("returnTo");
  return returnToValues.length === 1 ? getSafeTutorApplyReturnPath(returnToValues[0]) : null;
}

/** The fixed English name each card is announced by; what it shows is the Owner's slot. */
const roleNames: Record<PublicAccountRole, string> = { guardian: "Guardian", tutor: "Tutor" };

/** A `?role=` in the link wins; otherwise the role this device last used; otherwise Guardian. */
function getInitialRole(): PublicAccountRole {
  if (typeof window === "undefined") return "guardian";
  const roles = new URLSearchParams(window.location.search).getAll("role");
  if (roles.length === 1 && (roles[0] === "tutor" || roles[0] === "guardian")) return roles[0];
  return readRememberedSignInRole() ?? "guardian";
}

function signInButtonLabel(role: PublicAccountRole) {
  return <SiteText slotId={`button-section.signIn.${role}`} />;
}

/**
 * The way in for someone who has no account yet. The Register section left this
 * page (#216), so this one line is all that points to the two registrations.
 */
function RegisterLinks() {
  const newHere = useSiteContentText("sign-in.newHere");
  const guardian = useSiteContentText("sign-in.registerGuardian");
  const tutor = useSiteContentText("sign-in.registerTutor");
  const link = "font-extrabold text-j-accent underline underline-offset-2";
  return <p className="mt-6 text-center text-sm leading-6 text-j-ink-muted">
    {newHere} <Link href="/request-tutor" className={link}>{guardian}</Link> <span aria-hidden="true">/</span> <Link href="/become-tutor" className={link}>{tutor}</Link>
  </p>;
}

function RoleChoice({ role, selected, onSelect }: { role: PublicAccountRole; selected: boolean; onSelect: (role: PublicAccountRole) => void }) {
  const Icon = role === "guardian" ? UsersRound : GraduationCap;
  const name = useSiteContentText(`sign-in.role.${role}.title`);
  const line = useSiteContentText(`sign-in.role.${role}.line`);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`Select ${roleNames[role]} account`}
      onClick={() => onSelect(role)}
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          onSelect(role === "guardian" ? "tutor" : "guardian");
        }
      }}
      tabIndex={selected ? 0 : -1}
      className={`rounded-xl border p-[1.25em] text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2 ${selected ? "border-j-accent bg-j-accent-wash shadow-[0_12px_28px_rgba(36,136,214,0.12)]" : "border-j-border bg-white hover:border-j-accent/50"}`}
    >
      <span className="flex items-center gap-[0.6em]">
        {/* Idle in the ink-muted tone (3.75:1 on white); selecting pops it to the accent colour and up a touch. */}
        <Icon
          className={`shrink-0 transition-[color,transform] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none ${selected ? "scale-110 text-j-accent" : "scale-100 text-j-ink-muted"}`}
          size="1.5em"
          aria-hidden="true"
        />
        <strong className="text-[1.3em] leading-[1.3]">{name}</strong>
      </span>
      <span className="mt-[0.5em] block leading-[1.55] text-j-ink-muted">{line}</span>
    </button>
  );
}

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const [role, setRole] = useState<PublicAccountRole>(getInitialRole);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  // Set when the details were right but belong to the other card.
  const [accountRole, setAccountRole] = useState<PublicAccountRole | null>(null);
  const [isEnteringTutorWorkspace, setIsEnteringTutorWorkspace] = useState(false);
  const utils = trpc.useUtils();
  const loginAccount = trpc.auth.loginAccount.useMutation();

  const chooseRole = (nextRole: PublicAccountRole) => {
    setRole(nextRole);
    setFormError(null);
    setAccountRole(null);
  };

  const signIn = async (signInRole: PublicAccountRole) => {
    setFormError(null);
    setAccountRole(null);
    setIsEnteringTutorWorkspace(false);
    let tutorPortalTokenStored = false;
    try {
      const result = await loginAccount.mutateAsync({ role: signInRole, identifier, password });
      if (result.user.role === "tutor") {
        if (!result.tutorPortalToken) throw new SignedInButBlockedError("Signed in, but the Tutor portal proof was not issued. Please try again.");
        storeCurrentTutorPortalToken(result.tutorPortalToken);
        tutorPortalTokenStored = true;
        setIsEnteringTutorWorkspace(true);
      }
      // The page-load `auth.me` cached `null` under the app's 30s staleTime, so
      // `fetch()` alone would hand back that pre-login value and make a
      // successful sign-in look like a rejected one. AdminLogin already does
      // this; the public form did not, which is why only Admin was unaffected.
      await utils.auth.me.invalidate();
      const authenticatedUser = await utils.auth.me.fetch();
      if (result.user.role === "tutor" && authenticatedUser?.role !== "tutor") {
        clearCurrentTutorPortalToken();
        throw new SignedInButBlockedError("Signed in, but this account is not a Tutor account.");
      }
      rememberSignInRole(result.user.role);
      const tutorApplyReturnPath = getTutorApplyReturnFromLocation(location);
      if (result.user.role === "tutor" && tutorApplyReturnPath && typeof window !== "undefined") {
        storeTutorApplyReturnPath(window.sessionStorage, tutorApplyReturnPath);
      }
      let tutorProfileStatus: string | null | undefined;
      if (result.user.role === "tutor" && tutorApplyReturnPath) {
        try {
          tutorProfileStatus = (await utils.tutor.getMyProfile.fetch())?.profileStatus;
        } catch {
          tutorProfileStatus = null;
        }
      }
      navigate(getPostLoginPath(result.user.role, tutorApplyReturnPath, tutorProfileStatus));
    } catch (cause) {
      setIsEnteringTutorWorkspace(false);
      if (tutorPortalTokenStored) {
        clearCurrentTutorPortalToken();
      }
      // Right password, wrong card: the server names the account type, and the
      // error box offers a one-click sign-in as that type.
      const mismatchRole = cause instanceof TRPCClientError ? (cause.data as { accountRole?: unknown } | undefined)?.accountRole : undefined;
      if ((mismatchRole === "guardian" || mismatchRole === "tutor") && mismatchRole !== signInRole) {
        setAccountRole(mismatchRole);
        setFormError(cause instanceof Error ? cause.message : null);
        return;
      }
      // A suspended/closed account (FORBIDDEN) or a rate-limit block
      // (TOO_MANY_REQUESTS) carries an honest, actionable server message; show
      // it verbatim. Only UNAUTHORIZED (wrong credentials) keeps the generic hint.
      const actionableServerMessage =
        cause instanceof TRPCClientError && cause.data?.code !== "UNAUTHORIZED" && typeof cause.message === "string" && cause.message.trim()
          ? cause.message
          : null;
      // Only a rejected credential earns the credential message.
      const signedInButBlocked = cause instanceof SignedInButBlockedError ? cause.message : null;
      setFormError(signedInButBlocked ?? actionableServerMessage ?? "Email/mobile number or password is not correct. Choose the account type you used when registering.");
    }
  };

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void signIn(role);
  };

  const switchAndSignIn = (nextRole: PublicAccountRole) => {
    setRole(nextRole);
    void signIn(nextRole);
  };

  return (
    <SignInShell>
      {isEnteringTutorWorkspace ? <TutorWorkspaceTransition /> : <>
      <SignInHeading slotPrefix="sign-in" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
        <RoleChoice role="guardian" selected={role === "guardian"} onSelect={chooseRole} />
        <RoleChoice role="tutor" selected={role === "tutor"} onSelect={chooseRole} />
      </div>

      <SignInForm
        idPrefix="account"
        identifier={identifier}
        onIdentifier={setIdentifier}
        password={password}
        onPassword={setPassword}
        error={formError}
        errorAction={accountRole ? <button type="button" className={ghostButton} disabled={loginAccount.isPending} onClick={() => switchAndSignIn(accountRole)}>{signInButtonLabel(accountRole)}</button> : null}
        pending={loginAccount.isPending}
        submitLabel={signInButtonLabel(role)}
        onSubmit={submitLogin}
      />
      <RegisterLinks />
      </>}
    </SignInShell>
  );
}
