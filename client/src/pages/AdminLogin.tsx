import SiteHeader from "@/components/SiteHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CapsLockWarning, useCapsLockWarning } from "@/components/CapsLockWarning";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import React, { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export function getAdminDashboardDestination(role: string | null | undefined) {
  return role === "admin" ? "/admin/matching" : null;
}

export const adminLoginHelpLink = { label: "See Admin Help", href: "/admin/help" } as const;
export const adminPasswordRecoveryLink = {
  label: "Forgot password?",
  href: "/admin/credential-setup",
  helper: "Project Owner verification is required to reset an Admin password.",
} as const;
export const adminCredentialLoginForm = {
  userIdLabel: "User ID",
  passwordLabel: "Password",
  submitLabel: "Sign in to Admin",
} as const;
export const adminCredentialLoginChecklist = [
  "Assigned Admin User ID",
  "Password",
  "Protected workspace access",
] as const;

function getErrorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "We could not complete your Admin sign-in. Try again.";
}

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation();
  const loginAdmin = trpc.auth.loginAdmin.useMutation();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const capsLockWarning = useCapsLockWarning();
  const dashboardDestination = getAdminDashboardDestination(user?.role);

  useEffect(() => {
    if (!isLoading && dashboardDestination) navigate(dashboardDestination);
  }, [dashboardDestination, isLoading, navigate]);

  const signOutCurrentAccount = async () => {
    await logout.mutateAsync();
    await utils.auth.me.invalidate();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    try {
      const result = await loginAdmin.mutateAsync({ userId, password });
      // The page-load `auth.me` cached `null`; invalidate so this reads the
      // post-login session instead of the still-fresh cached value.
      await utils.auth.me.invalidate();
      const authenticatedUser = await utils.auth.me.fetch();
      if (result.user.role !== "admin" || authenticatedUser?.role !== "admin") {
        throw new Error("This account does not have Admin access.");
      }
      setPassword("");
      navigate("/admin/matching");
    } catch (cause) {
      setPassword("");
      setFormError(getErrorMessage(cause));
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
          <div className="z-10 mt-20 max-w-sm"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8fd0f5]">Restricted access</p><h1 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.04em]">Admin workspace sign in.</h1><p className="mt-5 text-sm leading-7 text-[#c8ddf0]">Use your assigned Admin User ID and password to manage matching requests and protected workflow actions.</p></div>
          </div>
        </div>
        <div className="flex items-center px-7 py-10 sm:px-14 sm:py-14">
          <div className="mx-auto w-full max-w-md">
            <div className="inline-flex rounded-2xl bg-j-accent-wash p-3 text-j-accent"><ShieldCheck size={30} /></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#2782c7]">Admin sign in</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-j-ink">Access the matching workspace</h2>
            <p className="mt-3 text-sm leading-7 text-[#728ba0]">Only active accounts assigned the <strong>Admin</strong> role and a dedicated User ID can open this workspace.</p>

            <ol aria-label="Admin access requirements" className="mt-6 grid gap-2 sm:grid-cols-3">
              {adminCredentialLoginChecklist.map((step, index) => <li key={step} className="rounded-xl border border-j-border bg-j-surface-sunken px-3 py-3 text-xs font-semibold leading-5 text-j-ink-soft"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-j-accent-wash text-[10px] font-black text-j-accent">{index + 1}</span>{step}</li>)}
            </ol>

            {isLoading ? <div className="mt-8 flex items-center gap-3 rounded-xl bg-j-surface-sunken px-4 py-4 text-sm font-semibold text-[#56738d]"><LoaderCircle className="animate-spin text-j-accent" size={18} /> Checking account access…</div> : null}
            {!isLoading && !user ? <form className="mt-8 space-y-5" onSubmit={event => void submit(event)} noValidate>
              <div className="space-y-2"><Label htmlFor="admin-user-id" className="font-bold text-j-ink-soft">{adminCredentialLoginForm.userIdLabel}</Label><Input id="admin-user-id" autoComplete="username" value={userId} onChange={event => setUserId(event.target.value)} disabled={loginAdmin.isPending} required maxLength={64} className="h-12 border-j-field-border bg-j-surface-sunken" /></div>
              <div className="space-y-2"><div className="flex items-center justify-between gap-3"><Label htmlFor="admin-password" className="font-bold text-j-ink-soft">{adminCredentialLoginForm.passwordLabel}</Label><Link href={adminPasswordRecoveryLink.href} className="text-xs font-bold text-j-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2">{adminPasswordRecoveryLink.label}</Link></div><div className="relative"><Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} onKeyDown={capsLockWarning.updateCapsLockState} onKeyUp={capsLockWarning.updateCapsLockState} onBlur={capsLockWarning.clearCapsLockWarning} disabled={loginAdmin.isPending} required maxLength={128} className="h-12 border-j-field-border bg-j-surface-sunken pr-12" /><button type="button" onClick={() => setShowPassword(current => !current)} disabled={loginAdmin.isPending} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-[#5b86a3] transition hover:text-j-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-j-accent disabled:cursor-not-allowed disabled:opacity-50">{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div><CapsLockWarning isCapsLockOn={capsLockWarning.isCapsLockOn} /></div>
              <p className="-mt-2 text-xs leading-5 text-[#6c8295]">{adminPasswordRecoveryLink.helper}</p>
              {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold text-j-err">{formError}</p> : null}
              <button type="submit" disabled={loginAdmin.isPending} className="flex w-full items-center justify-center gap-2 rounded-md bg-j-accent px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,59,96,0.24)] transition hover:bg-j-accent-hover active:scale-[0.97] disabled:cursor-wait disabled:opacity-70">{loginAdmin.isPending ? <><LoaderCircle className="animate-spin" size={17} /> Signing in…</> : <>{adminCredentialLoginForm.submitLabel} <ArrowRight size={17} /></>}</button>
            </form> : null}
            {!isLoading && user && !dashboardDestination ? <div className="mt-8 rounded-2xl border border-j-err-border bg-j-err-wash p-5"><p className="text-sm font-bold text-j-err">This account does not have Admin access.</p><p className="mt-2 text-sm leading-6 text-[#755d65]">Sign out before continuing with an established Admin account. Guardian and Tutor permissions cannot access the matching workspace.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void signOutCurrentAccount()} disabled={logout.isPending} className="rounded-md bg-j-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-j-accent-hover disabled:cursor-wait disabled:opacity-70">{logout.isPending ? "Signing out…" : "Sign out"}</button><Link href="/account" className="rounded-md border border-j-field-border px-4 py-2.5 text-sm font-bold text-j-ink-soft transition hover:bg-white">Return to account</Link></div></div> : null}
            <p className="mt-6 flex items-center gap-2 text-xs leading-5 text-[#6c8295]"><LockKeyhole size={14} className="shrink-0 text-j-accent" /> Passwords are stored as secure hashes, and every Admin workspace action remains authorized on the server.</p>
            <p className="mt-4 text-sm text-[#647f95]">Need help with Admin sign-in? <Link href={adminLoginHelpLink.href} className="font-bold text-j-accent underline-offset-4 hover:underline">{adminLoginHelpLink.label}</Link>.</p>
            <p className="mt-3 flex items-center gap-2 text-xs leading-5 text-[#6c8295]"><KeyRound size={14} className="shrink-0 text-j-accent" /> First-time setup and password reset are restricted to the <Link href={adminPasswordRecoveryLink.href} className="font-bold text-j-accent underline-offset-4 hover:underline">Project Owner</Link>.</p>
          </div>
        </div>
      </section>
    </main>
  </div>;
}
