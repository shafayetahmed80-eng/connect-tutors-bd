import React, { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { CapsLockWarning, useCapsLockWarning } from "@/components/CapsLockWarning";
import { TutorWorkspaceTransition } from "@/components/TutorWorkspaceTransition";
import { trpc } from "@/lib/trpc";
import { getSafeTutorApplyReturnPath, getTutorApplyPostLoginPath, storeTutorApplyReturnPath } from "@/lib/tutorApplyReturn";
import { clearCurrentTutorPortalLoginHandoff, clearCurrentTutorPortalToken, markCurrentTutorPortalLoginHandoff, storeCurrentTutorPortalToken } from "@/lib/tutorPortalSession";

type PublicAccountRole = "guardian" | "tutor";
type AuthMode = "login" | "register";

export function getPostLoginPath(role: string, returnTo?: string | null, tutorProfileStatus?: string | null): string {
  if (role === "tutor") return getTutorApplyPostLoginPath(tutorProfileStatus, returnTo);
  return role === "guardian" || role === "user" ? "/guardian/dashboard/posted-jobs" : "/account";
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
    heading: "Register as a Tutor in two simple steps",
    summary: "Secure your account first, then choose your teaching location and consent preferences. Your teaching profile can be completed from the Tutor Dashboard.",
    steps: ["Secure account details", "Teaching location and consent"],
    privacyCue: "Your contact details stay private while you prepare your public teaching profile.",
    registerLabel: "Start Tutor Registration",
    registerHref: "/become-tutor",
  },
};

function getInitialRole(): PublicAccountRole {
  if (typeof window === "undefined") return "guardian";
  const roles = new URLSearchParams(window.location.search).getAll("role");
  return roles.length === 1 && roles[0] === "tutor" ? "tutor" : "guardian";
}

function getInitialMode(location: string): AuthMode {
  return location.split("?")[0] === "/register" ? "register" : "login";
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
      className={`rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2 ${selected ? "border-j-accent bg-j-accent-wash shadow-[0_12px_28px_rgba(36,136,214,0.12)]" : "border-j-border bg-white hover:border-j-accent/50"}`}
    >
      <Icon className="text-j-accent" size={25} aria-hidden="true" />
      <strong className="mt-4 block text-lg">{content.title}</strong>
      <span className="mt-1 block text-sm leading-6 text-[#7890a4]">{content.description}</span>
    </button>
  );
}

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const [mode, setMode] = useState<AuthMode>(() => getInitialMode(location));
  const [role, setRole] = useState<PublicAccountRole>(getInitialRole);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const capsLockWarning = useCapsLockWarning();
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
    let tutorPortalHandoffEstablished = false;
    try {
      const result = await loginAccount.mutateAsync({ role, identifier, password });
      if (result.user.role === "tutor") {
        if (!result.tutorPortalToken) throw new Error("Tutor portal proof was not issued.");
        storeCurrentTutorPortalToken(result.tutorPortalToken);
        markCurrentTutorPortalLoginHandoff();
        tutorPortalHandoffEstablished = true;
        setIsEnteringTutorWorkspace(true);
      }
      const authenticatedUser = await utils.auth.me.fetch();
      if (result.user.role === "tutor" && authenticatedUser?.role !== "tutor") {
        clearCurrentTutorPortalToken();
        clearCurrentTutorPortalLoginHandoff();
        throw new Error("This account is not a Tutor account.");
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
    } catch {
      setIsEnteringTutorWorkspace(false);
      if (tutorPortalHandoffEstablished) {
        clearCurrentTutorPortalToken();
        clearCurrentTutorPortalLoginHandoff();
      }
      setFormError("Email/mobile number or password is not correct. Choose the account type you used when registering.");
    }
  };

  const selectedRole = roleContent[role];
  const selectedJourney = registerJourney[role];

  return (
    <main className="min-h-screen bg-j-page px-4 py-8 text-j-ink sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-j-border bg-white shadow-[0_24px_80px_rgba(24,77,119,0.12)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden bg-j-rail px-7 py-9 text-white sm:px-12 sm:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#0a4c85]/50 blur-2xl" />
          <div className="relative">
            <Link href="/" className="text-sm font-bold text-[#bde9ff]">Connect Tutors BD</Link>
            <div className="z-10 mt-16 max-w-md sm:mt-20">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8fd0f5]">A calmer next step</p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl">Find the right learning connection.</h1>
              <p className="mt-6 text-base leading-7 text-[#c8dff0]">Sign in to manage a tutor request or your teaching profile. Each account type keeps its own private workspace.</p>
              <div className="mt-10 space-y-4 text-sm font-semibold">
                <div className="flex items-center gap-3"><CheckCircle2 className="text-[#ffd37a]" size={19} aria-hidden="true" />Verified professional profiles</div>
                <div className="flex items-center gap-3"><ShieldCheck className="text-[#ffd37a]" size={19} aria-hidden="true" />Privacy-conscious contact flow</div>
                <div className="flex items-center gap-3"><LockKeyhole className="text-[#ffd37a]" size={19} aria-hidden="true" />Role-specific account access</div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center px-7 py-10 sm:px-14">
          <div className="w-full max-w-lg">
            {isEnteringTutorWorkspace ? <TutorWorkspaceTransition /> : <>
            <div className="mb-8 flex gap-2 rounded-full bg-[#eef3f8] p-1" aria-label="Account access mode">
              <button type="button" onClick={() => switchMode("login")} aria-pressed={mode === "login"} className={`flex-1 rounded-full px-4 py-3 text-sm font-bold transition ${mode === "login" ? "bg-white text-j-accent shadow-sm" : "text-[#7590a5]"}`}>Sign in</button>
              <button type="button" onClick={() => switchMode("register")} aria-pressed={mode === "register"} className={`flex-1 rounded-full px-4 py-3 text-sm font-bold transition ${mode === "register" ? "bg-white text-j-accent shadow-sm" : "text-[#7590a5]"}`}>Register</button>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-j-accent">{mode === "login" ? "Welcome back" : "Join the community"}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-j-ink">{mode === "login" ? "Sign in to your account" : "Choose your next step"}</h2>
            <p className="mt-3 leading-7 text-[#728ba0]">{mode === "login" ? "Choose the account type you registered with, then use your email address or Bangladesh mobile number." : "Registration happens in the journey designed for your role. It is not completed on this screen."}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
              <RoleChoice role="guardian" selected={role === "guardian"} onSelect={chooseRole} />
              <RoleChoice role="tutor" selected={role === "tutor"} onSelect={chooseRole} />
            </div>

            {mode === "login" ? (
              <form className="mt-8 space-y-5" onSubmit={submitLogin} noValidate>
                <div>
                  <label htmlFor="account-identifier" className="mb-2 block text-sm font-bold text-j-ink-strong">Email or mobile number</label>
                  <input
                    id="account-identifier"
                    name="identifier"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={event => setIdentifier(event.target.value)}
                    placeholder="name@example.com or 017XXXXXXXX"
                    required
                    className="w-full rounded-xl border border-j-field-border bg-j-surface-sunken px-4 py-3.5 text-sm text-j-ink outline-none transition placeholder:text-[#9aabbb] focus:border-j-accent focus:bg-white focus:ring-4 focus:ring-j-accent/12"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label htmlFor="account-password" className="block text-sm font-bold text-j-ink-strong">Password</label>
                    <a className="text-xs font-semibold text-j-accent underline-offset-4 hover:underline" href="https://wa.me/8801516131411?text=Hello%20Connect%20Tutors%20BD%2C%20I%20need%20help%20recovering%20my%20account.">Need help signing in?</a>
                  </div>
                  <div className="relative">
                    <input
                      id="account-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      onKeyDown={capsLockWarning.updateCapsLockState}
                      onKeyUp={capsLockWarning.updateCapsLockState}
                      onBlur={capsLockWarning.clearCapsLockWarning}
                      required
                      className="w-full rounded-xl border border-j-field-border bg-j-surface-sunken py-3.5 pl-4 pr-12 text-sm text-j-ink outline-none transition placeholder:text-[#9aabbb] focus:border-j-accent focus:bg-white focus:ring-4 focus:ring-j-accent/12"
                    />
                    <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-[#5f84a1] transition hover:text-j-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-j-accent">
                      {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                    </button>
                  </div>
                  <CapsLockWarning isCapsLockOn={capsLockWarning.isCapsLockOn} />
                </div>

                {formError ? <div role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{formError}</div> : null}

                <button type="submit" disabled={loginAccount.isPending} className="flex w-full items-center justify-center gap-3 rounded-full bg-j-accent px-6 py-4 font-bold text-white shadow-[0_12px_25px_rgba(22,125,221,0.24)] transition hover:bg-j-accent-hover disabled:cursor-wait disabled:opacity-70">
                  {loginAccount.isPending ? "Signing in…" : `Sign in as ${selectedRole.title}`}
                  {!loginAccount.isPending && <ArrowRight size={18} aria-hidden="true" />}
                </button>
                <p className="text-center text-xs leading-5 text-[#7b95a9]">For password recovery, contact our support team on WhatsApp. We do not offer email reset links yet.</p>
              </form>
            ) : (
              <div className="mt-8 rounded-2xl border border-j-border bg-j-surface-sunken p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-j-accent">Your {selectedRole.title} journey</p>
                <h3 className="mt-2 text-xl font-bold text-j-ink">{selectedJourney.heading}</h3>
                <p className="mt-2 leading-7 text-[#668197]">{selectedJourney.summary}</p>
                <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={`${selectedRole.title} registration steps`}>
                  {selectedJourney.steps.map((step, index) => (
                    <li key={step} className="flex min-h-11 items-center gap-2 rounded-xl border border-j-border bg-white px-3 py-2.5 text-sm font-semibold leading-5 text-j-ink-strong">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-j-accent-wash text-xs font-extrabold text-[#126ea9]">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 flex gap-2 rounded-xl bg-j-accent-wash px-4 py-3 text-sm leading-6 text-[#1257a8]"><ShieldCheck className="mt-0.5 shrink-0 text-j-accent" size={17} aria-hidden="true" />{selectedJourney.privacyCue}</p>
                <Link href={selectedJourney.registerHref} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-j-accent px-6 py-4 font-bold text-white shadow-[0_12px_25px_rgba(22,125,221,0.24)] transition hover:bg-j-accent-hover">
                  {selectedJourney.registerLabel}<ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-j-accent underline-offset-4 hover:underline" href="https://wa.me/8801516131411?text=Hello%20Connect%20Tutors%20BD%2C%20I%20need%20help%20with%20my%20account."><MessageCircle size={17} aria-hidden="true" />Contact support via WhatsApp</a>
                <button type="button" onClick={() => switchMode("login")} className="mt-5 block text-sm font-semibold text-[#39779e] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2">Already registered? Sign in</button>
              </div>
            )}

            <p className="mt-7 text-center text-xs leading-5 text-[#8aa0b2]">Admin access is separate and requires an invited Admin account with two-factor authentication.</p>
            </>}
          </div>
        </section>
      </div>
    </main>
  );
}
