import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LoadingCradle } from "@/components/BrandMark";
import { CapsLockWarning, useCapsLockWarning } from "@/components/CapsLockWarning";
import { CredentialPasswordFields } from "@/pages/AdminSecurityWorkspace";
import { KeyRound, LogOut } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";

function getErrorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "We could not change the password. Try again.";
}

/** Where an Admin the Owner just created lands after signing in, until they have chosen their own password. */
export default function AdminPasswordChange() {
  const [, navigate] = useLocation();
  const { user, loading, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const access = trpc.admin.getWorkspaceAccess.useQuery(undefined, { enabled: isAdmin, retry: false, refetchOnWindowFocus: false });
  const changePassword = trpc.account.changePassword.useMutation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const currentCapsLock = useCapsLockWarning();

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/admin/login");
  }, [loading, isAdmin, navigate]);

  // Nothing to change (already done, or never required): straight on to the workspace.
  useEffect(() => {
    if (access.data && !access.data.passwordChangeRequired) navigate("/admin/matching");
  }, [access.data, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (newPassword === currentPassword) {
      setFormError("Choose a password different from the temporary one.");
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword, confirmNewPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      await utils.admin.getWorkspaceAccess.invalidate();
      navigate("/admin/matching");
    } catch (cause) {
      setFormError(getErrorMessage(cause));
    }
  };

  const busy = loading || access.isLoading;

  return <div className="site-page min-h-screen bg-j-page text-j-ink">
    <SiteHeader />
    <main className="px-4 py-10 sm:px-6 lg:py-20">
      <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-j-border bg-white px-6 py-9 shadow-[0_1px_2px_rgba(16,49,77,.05),0_20px_54px_-14px_rgba(16,49,77,.20)] ring-1 ring-[rgba(16,49,77,.035)] sm:px-10 sm:py-11">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,var(--j-accent),transparent)]" />
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex rounded-xl bg-j-accent-wash p-3.5 text-j-accent shadow-[0_8px_20px_-8px_rgba(22,125,221,.55)]"><KeyRound size={28} /></span>
          <h1 className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#2782c7]">Choose your password</h1>
        </div>

        {busy ? <div className="mt-8 flex items-center gap-3 rounded-xl bg-j-surface-sunken px-4 py-4 text-sm font-semibold text-[#56738d]"><LoadingCradle /> Checking your account…</div> : null}

        {isAdmin && access.data?.passwordChangeRequired ? <form className="mt-8 grid gap-3" onSubmit={submit} noValidate>
          <div>
            <label htmlFor="admin-current-password" className="text-xs font-bold text-j-ink-soft">Temporary password</label>
            <input id="admin-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} onKeyDown={currentCapsLock.updateCapsLockState} onKeyUp={currentCapsLock.updateCapsLockState} onBlur={currentCapsLock.clearCapsLockWarning} required className="mt-1 h-11 w-full rounded-xl border border-j-field-border bg-white px-3 outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
            <CapsLockWarning isCapsLockOn={currentCapsLock.isCapsLockOn} />
          </div>
          <CredentialPasswordFields idPrefix="change" password={newPassword} confirmPassword={confirmNewPassword} onPasswordChange={setNewPassword} onConfirmPasswordChange={setConfirmNewPassword} />
          {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold text-j-err">{formError}</p> : null}
          <button type="submit" disabled={!currentPassword || newPassword.length < 8 || newPassword !== confirmNewPassword || changePassword.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-j-accent px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,59,96,0.24)] transition hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-60">{changePassword.isPending ? "Saving…" : "Save password"}</button>
        </form> : null}

        <div className="mt-8 flex justify-center border-t border-j-border pt-5">
          <button type="button" onClick={() => void logout().then(() => navigate("/admin/login"))} className="inline-flex items-center gap-1.5 text-xs font-bold text-j-ink-soft underline-offset-4 hover:underline"><LogOut size={13} /> Sign out</button>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
