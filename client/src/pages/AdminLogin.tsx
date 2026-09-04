import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CapsLockWarning, useCapsLockWarning } from "@/components/CapsLockWarning";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import React, { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export function getAdminDashboardDestination(role: string | null | undefined) {
  return role === "admin" ? "/admin/matching" : null;
}

export const adminLoginHelpLink = { label: "See Admin Help", href: "/admin/help" } as const;
export const adminPasswordRecoveryLink = {
  label: "Forgot password?",
  href: "/admin/credential-setup",
} as const;
export const adminCredentialLoginForm = {
  userIdLabel: "User ID",
  passwordLabel: "Password",
  submitLabel: "Sign in to Admin",
} as const;
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
      <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-j-border bg-white px-6 py-9 shadow-[0_1px_2px_rgba(16,49,77,.05),0_20px_54px_-14px_rgba(16,49,77,.20)] ring-1 ring-[rgba(16,49,77,.035)] sm:px-10 sm:py-11 lg:max-w-3xl lg:px-14">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,var(--j-accent),transparent)]" />
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex rounded-xl bg-j-accent-wash p-3.5 text-j-accent shadow-[0_8px_20px_-8px_rgba(22,125,221,.55)]"><ShieldCheck size={28} /></span>
          <h1 className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#2782c7]">Admin sign in</h1>
        </div>
        {isLoading ? <div className="mt-8 flex items-center gap-3 rounded-xl bg-j-surface-sunken px-4 py-4 text-sm font-semibold text-[#56738d]"><LoaderCircle className="animate-spin text-j-accent" size={18} /> Checking account access…</div> : null}
        {!isLoading && !user ? <form className="mt-8 grid gap-5 lg:grid-cols-2" onSubmit={event => void submit(event)} noValidate>
          <div className="space-y-2"><Label htmlFor="admin-user-id" className="font-bold text-j-ink-soft">{adminCredentialLoginForm.userIdLabel}</Label><Input id="admin-user-id" autoComplete="username" value={userId} onChange={event => setUserId(event.target.value)} disabled={loginAdmin.isPending} required maxLength={64} className="h-12 border-j-field-border bg-j-surface-sunken transition-colors focus-visible:border-j-accent focus-visible:ring-0" /></div>
          <div className="space-y-2"><div className="flex items-center justify-between gap-3"><Label htmlFor="admin-password" className="font-bold text-j-ink-soft">{adminCredentialLoginForm.passwordLabel}</Label><Link href={adminPasswordRecoveryLink.href} className="text-xs font-bold text-j-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2">{adminPasswordRecoveryLink.label}</Link></div><div className="relative"><Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} onKeyDown={capsLockWarning.updateCapsLockState} onKeyUp={capsLockWarning.updateCapsLockState} onBlur={capsLockWarning.clearCapsLockWarning} disabled={loginAdmin.isPending} required maxLength={128} className="h-12 border-j-field-border bg-j-surface-sunken pr-12 transition-colors focus-visible:border-j-accent focus-visible:ring-0" /><button type="button" onClick={() => setShowPassword(current => !current)} disabled={loginAdmin.isPending} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-[#5b86a3] transition hover:text-j-accent focus-visible:text-j-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50">{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div><CapsLockWarning isCapsLockOn={capsLockWarning.isCapsLockOn} /></div>
          {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold text-j-err lg:col-span-2">{formError}</p> : null}
          <button type="submit" disabled={loginAdmin.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-j-accent px-5 py-3.5 lg:col-span-2 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,59,96,0.24)] transition hover:bg-j-accent-hover active:scale-[0.97] disabled:cursor-wait disabled:opacity-70">{loginAdmin.isPending ? <><LoaderCircle className="animate-spin" size={17} /> Signing in…</> : <>{adminCredentialLoginForm.submitLabel} <ArrowRight size={17} /></>}</button>
        </form> : null}
        {!isLoading && user && !dashboardDestination ? <div className="mt-8 rounded-xl border border-j-err-border bg-j-err-wash p-5"><p className="text-sm font-bold text-j-err">This account does not have Admin access.</p><p className="mt-2 text-sm leading-6 text-[#755d65]">Sign out before continuing with an established Admin account. Guardian and Tutor permissions cannot access the matching workspace.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void signOutCurrentAccount()} disabled={logout.isPending} className="rounded-lg bg-j-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-j-accent-hover disabled:cursor-wait disabled:opacity-70">{logout.isPending ? "Signing out…" : "Sign out"}</button><Link href="/account" className="rounded-lg border border-j-field-border px-4 py-2.5 text-sm font-bold text-j-ink-soft transition hover:bg-white">Return to account</Link></div></div> : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-j-border pt-5 text-sm">
          <Link href={adminLoginHelpLink.href} className="font-bold text-j-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2">{adminLoginHelpLink.label}</Link>
          <span aria-hidden="true" className="text-j-border">|</span>
          <Link href={adminPasswordRecoveryLink.href} className="font-bold text-j-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2">Project Owner</Link>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
