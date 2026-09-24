import { useSiteContact, useSiteContentText, useSiteContentTextStyle } from "@/lib/siteContent";
import React, { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { primaryButton } from "@/components/journeyField";
import { SignInForm, SignInHeading, SignInShell, type SignInRail } from "@/components/SignInLayout";
import { TutorWorkspaceTransition } from "@/components/TutorWorkspaceTransition";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { getSafeTutorApplyReturnPath, getTutorApplyPostLoginPath, storeTutorApplyReturnPath } from "@/lib/tutorApplyReturn";
import { clearCurrentTutorPortalToken, storeCurrentTutorPortalToken } from "@/lib/tutorPortalSession";

/**
 * Thrown when the server accepted the credentials but the session cannot be
 * used - a missing portal proof, or an account of the wrong role. Kept distinct
 * so the form never blames the password for something the password did not do.
 */
class SignedInButBlockedError extends Error {}

type PublicAccountRole = "guardian" | "tutor";
type AuthMode = "login" | "register";

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

const roleContent: Record<PublicAccountRole, { title: string; description: string }> = {
  guardian: {
    title: "Guardian",
    description: "Find tutors and manage your learning requests.",
  },
  tutor: {
    title: "Tutor",
    description: "Create a professional profile and receive enquiries.",
  },
};

const registerJourney: Record<PublicAccountRole, {
  heading: string;
  summary: string;
  steps: readonly string[];
  privacyCue: string;
  registerLabel: string;
  registerHref: string;
}> = {
  guardian: {
    heading: "Request a Tutor with a private Guardian account",
    summary: "Your account is created within the guided Tutor Request journey, so we can understand the student’s needs before matching begins.",
    steps: ["Confirm mobile", "Create private account", "Request a Tutor"],
    privacyCue: "Your contact details and request stay private from public Tutor profiles.",
    registerLabel: "Start your Tutor Request",
    registerHref: "/request-tutor",
  },
  tutor: {
    heading: "Register as a Tutor",
    summary: "Create your account on one form. Your teaching profile can be completed from the Tutor Dashboard.",
    steps: ["Create Tutor account", "Complete your profile"],
    privacyCue: "Your contact details stay private while you prepare your public teaching profile.",
    registerLabel: "Start Tutor Registration",
    registerHref: "/become-tutor",
  },
};

const authRail: SignInRail = {
  eyebrow: "A calmer next step",
  title: "Find the right learning connection.",
  body: "Sign in to manage a tutor request or your teaching profile. Each account type keeps its own private workspace.",
  points: [
    { icon: CheckCircle2, label: "Verified professional profiles" },
    { icon: ShieldCheck, label: "Privacy-conscious contact flow" },
    { icon: LockKeyhole, label: "Role-specific account access" },
  ],
};

function getInitialRole(): PublicAccountRole {
  if (typeof window === "undefined") return "guardian";
  const roles = new URLSearchParams(window.location.search).getAll("role");
  return roles.length === 1 && roles[0] === "tutor" ? "tutor" : "guardian";
}

function getInitialMode(location: string): AuthMode {
  return location.split("?")[0] === "/register" ? "register" : "login";
}

/**
 * One of the two access-mode pills, sized by its own text.
 *
 * The Owner sets the label size from the Button Section, so the pill has to
 * follow it: with a fixed `px-4 py-3` the chip kept its height and width no
 * matter how small the label got, leaving the empty space around it. Every
 * measurement below is in `em`, so the chip tracks whatever size is set.
 */
function AccessModeTab({ slotId, fallback, active, onSelect }: { slotId: string; fallback: string; active: boolean; onSelect: () => void }) {
  const label = useSiteContentText(slotId, fallback);
  const textStyle = useSiteContentTextStyle(slotId);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      style={textStyle}
      className={`min-w-max rounded-full px-[1.35em] py-[0.5em] text-sm font-bold leading-[1.45] transition ${active ? "bg-white text-j-accent shadow-sm" : "text-[#7590a5]"}`}
    >{label}</button>
  );
}

function RoleChoice({ role, selected, onSelect }: { role: PublicAccountRole; selected: boolean; onSelect: (role: PublicAccountRole) => void }) {
  const content = roleContent[role];
  const Icon = role === "guardian" ? UsersRound : GraduationCap;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`Select ${content.title} account`}
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
      <Icon className="text-j-accent" size="1.75em" aria-hidden="true" />
      <strong className="mt-[0.9em] block text-[1.3em] leading-[1.3]">{content.title}</strong>
      <span className="mt-[0.35em] block leading-[1.55] text-[#7890a4]">{content.description}</span>
    </button>
  );
}

export default function AuthPage() {
  const contact = useSiteContact();
  const [location, navigate] = useLocation();
  const [mode, setMode] = useState<AuthMode>(() => getInitialMode(location));
  const [role, setRole] = useState<PublicAccountRole>(getInitialRole);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isEnteringTutorWorkspace, setIsEnteringTutorWorkspace] = useState(false);
  const utils = trpc.useUtils();
  const loginAccount = trpc.auth.loginAccount.useMutation();

  const chooseRole = (nextRole: PublicAccountRole) => {
    setRole(nextRole);
    setFormError(null);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFormError(null);
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsEnteringTutorWorkspace(false);
    let tutorPortalTokenStored = false;
    try {
      const result = await loginAccount.mutateAsync({ role, identifier, password });
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

  const selectedRole = roleContent[role];
  const selectedJourney = registerJourney[role];

  return (
    <SignInShell rail={authRail}>
      {isEnteringTutorWorkspace ? <TutorWorkspaceTransition /> : <>
      <div className="mb-8 inline-flex w-max max-w-full gap-1 overflow-x-auto rounded-full bg-j-surface-muted p-1" aria-label="Account access mode">
        <AccessModeTab slotId="button-section.auth.signIn" fallback="Sign in" active={mode === "login"} onSelect={() => switchMode("login")} />
        <AccessModeTab slotId="button-section.auth.register" fallback="Register" active={mode === "register"} onSelect={() => switchMode("register")} />
      </div>

      <SignInHeading
        eyebrow={mode === "login" ? "Welcome back" : "Join the community"}
        title={mode === "login" ? "Sign in to your account" : "Choose your next step"}
        body={mode === "login" ? "Choose the account type you registered with, then use your email address or Bangladesh mobile number." : undefined}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
        <RoleChoice role="guardian" selected={role === "guardian"} onSelect={chooseRole} />
        <RoleChoice role="tutor" selected={role === "tutor"} onSelect={chooseRole} />
      </div>

      {mode === "login" ? (
        <SignInForm idPrefix="account" identifier={identifier} onIdentifier={setIdentifier} password={password} onPassword={setPassword} error={formError} pending={loginAccount.isPending} submitLabel={`Sign in as ${selectedRole.title}`} onSubmit={submitLogin} />
      ) : (
        <div className="mt-8 rounded-xl border border-j-border bg-j-surface-sunken p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-j-accent">Your {selectedRole.title} journey</p>
          <h3 className="mt-2 text-xl font-bold text-j-ink">{selectedJourney.heading}</h3>
          <p className="mt-2 text-sm leading-7 text-j-ink-muted">{selectedJourney.summary}</p>
          <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={`${selectedRole.title} registration steps`}>
            {selectedJourney.steps.map((step, index) => (
              <li key={step} className="flex min-h-11 items-center gap-2 rounded-xl border border-j-border bg-white px-3 py-2.5 text-sm font-semibold leading-5 text-j-ink-strong">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-j-accent-wash text-xs font-extrabold text-j-accent">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 flex gap-2 rounded-xl bg-j-accent-wash px-4 py-3 text-sm leading-6 text-j-ink-soft"><ShieldCheck className="mt-0.5 shrink-0 text-j-accent" size={17} aria-hidden="true" />{selectedJourney.privacyCue}</p>
          <Link href={selectedJourney.registerHref} className={`${primaryButton} mt-6 w-full`}>
            {selectedJourney.registerLabel}
          </Link>
          <a className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-j-accent underline-offset-4 hover:underline" href={contact.whatsapp("Hello Connect Tutors, I need help with my account.")}><MessageCircle size={17} aria-hidden="true" />Contact support via WhatsApp</a>
          <button type="button" onClick={() => switchMode("login")} className="mt-5 block text-sm font-semibold text-j-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2">Already registered? Sign in</button>
        </div>
      )}
      </>}
    </SignInShell>
  );
}
