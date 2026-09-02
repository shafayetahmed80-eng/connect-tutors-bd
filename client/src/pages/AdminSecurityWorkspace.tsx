import { useAuth } from "@/_core/hooks/useAuth";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { CapsLockWarning, useCapsLockWarning } from "@/components/CapsLockWarning";
import { trpc } from "@/lib/trpc";
import { adminPasswordPolicy, getAdminPasswordFeedback } from "@/pages/admin-password-policy";
import { AlertTriangle, ClipboardCopy, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, UserMinus, Users } from "lucide-react";
import React, { useState } from "react";

const events = ["all", "login_success", "login_failure", "invitation_created", "invitation_accepted", "invitation_revoked", "credential_provisioned", "credential_reset"] as const;

/** Kept in sync with `authEventTypeValues` in drizzle/schema.ts (+ "all"). */
export const authEventTypeOptions = [
  "all", "login_success", "login_failure", "login_blocked", "login_account_suspended", "login_account_closed",
  "registration_success", "registration_rejected", "registration_blocked", "phone_intake", "phone_intake_blocked",
] as const;
const authRoleOptions = ["all", "tutor", "guardian", "admin"] as const;

function InlineError({ message }: { message: string }) {
  return <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{message}</p>;
}

function AccessDenied() {
  return <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><ShieldCheck className="mb-4 h-12 w-12 text-slate-400" /><h1 className="text-2xl font-bold text-slate-900">Owner access required</h1><p className="mt-2 text-sm leading-6 text-slate-600">Only the Project Owner can manage Admin credentials and security records.</p></section>;
}

function formatAuditMetadata(metadata: string | null) {
  if (!metadata) return "—";
  try {
    const value = JSON.parse(metadata) as { reason?: string; method?: string };
    return value.reason ?? value.method ?? "—";
  } catch {
    return "—";
  }
}

export function PasswordPolicyBanner({ password, confirmPassword }: { password: string; confirmPassword: string }) {
  const feedback = getAdminPasswordFeedback(password, confirmPassword);
  const strengthIndicator = !password
    ? { label: "Start typing", value: 0, textClass: "text-slate-700", fillClass: "bg-slate-400" }
    : feedback.strength === "Strong"
      ? { label: "Strong", value: 3, textClass: "text-emerald-800", fillClass: "bg-emerald-500" }
      : feedback.strength === "Good"
        ? { label: "Medium", value: 2, textClass: "text-sky-800", fillClass: "bg-sky-500" }
        : { label: "Weak", value: 1, textClass: "text-amber-900", fillClass: "bg-amber-500" };

  return <section aria-labelledby="admin-password-policy-title" className="rounded-xl border border-sky-200 bg-white p-3 text-xs text-slate-700">
    <h3 id="admin-password-policy-title" className="font-bold text-slate-950">{adminPasswordPolicy.title}</h3>
    <ul className="mt-2 list-disc space-y-1 pl-4">
      {adminPasswordPolicy.required.map(item => <li key={item}>{item}</li>)}
    </ul>
    <p className="mt-2 leading-5 text-slate-600">{adminPasswordPolicy.recommended}</p>
    <div className="mt-3" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className={`font-bold ${strengthIndicator.textClass}`}>Password strength: {strengthIndicator.label}</p>
        <span className="text-[11px] font-semibold text-slate-500">{strengthIndicator.value}/3</span>
      </div>
      <div role="progressbar" aria-label="Password strength" aria-valuemin={0} aria-valuemax={3} aria-valuenow={strengthIndicator.value} aria-valuetext={strengthIndicator.label} className="mt-1.5 flex gap-1" data-strength={strengthIndicator.label.toLowerCase()}>
        {[1, 2, 3].map(level => <span key={level} aria-hidden="true" className={`h-1.5 flex-1 rounded-full ${level <= strengthIndicator.value ? strengthIndicator.fillClass : "bg-slate-200"}`} />)}
      </div>
    </div>
    <p aria-live="polite" className={`mt-2 font-bold ${strengthIndicator.textClass}`}>
      {password
        ? `Live check: ${feedback.strength}. ${feedback.lengthMet ? "Length accepted." : "Use 8–128 characters."} ${confirmPassword ? (feedback.confirmationMet ? "Passwords match." : "Passwords do not match.") : ""}`
        : "Live check will appear as you type."}
    </p>
  </section>;
}

export function CredentialPasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}) {
  const newPasswordCapsLockWarning = useCapsLockWarning();
  const confirmationCapsLockWarning = useCapsLockWarning();
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);

  return <>
    <div>
      <label htmlFor="admin-new-password" className="text-xs font-bold text-slate-700">New password</label>
      <div className="relative mt-1">
        <input id="admin-new-password" type={isNewPasswordVisible ? "text" : "password"} value={password} onChange={e => onPasswordChange(e.target.value)} onKeyDown={newPasswordCapsLockWarning.updateCapsLockState} onKeyUp={newPasswordCapsLockWarning.updateCapsLockState} onBlur={newPasswordCapsLockWarning.clearCapsLockWarning} minLength={8} maxLength={128} required autoComplete="new-password" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-11 text-sm font-normal" />
        <button type="button" aria-controls="admin-new-password" aria-label={isNewPasswordVisible ? "Hide new password" : "Show new password"} aria-pressed={isNewPasswordVisible} onClick={() => setIsNewPasswordVisible(visible => !visible)} className="absolute inset-y-0 right-1 inline-flex w-9 items-center justify-center rounded-md text-slate-600 outline-none hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#116fc4] focus-visible:ring-offset-1">
          {isNewPasswordVisible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
        </button>
      </div>
      <CapsLockWarning isCapsLockOn={newPasswordCapsLockWarning.isCapsLockOn} />
    </div>
    <div>
      <label htmlFor="admin-confirm-new-password" className="text-xs font-bold text-slate-700">Confirm new password</label>
      <div className="relative mt-1">
        <input id="admin-confirm-new-password" type={isConfirmationVisible ? "text" : "password"} value={confirmPassword} onChange={e => onConfirmPasswordChange(e.target.value)} onKeyDown={confirmationCapsLockWarning.updateCapsLockState} onKeyUp={confirmationCapsLockWarning.updateCapsLockState} onBlur={confirmationCapsLockWarning.clearCapsLockWarning} minLength={8} maxLength={128} required autoComplete="new-password" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-11 text-sm font-normal" />
        <button type="button" aria-controls="admin-confirm-new-password" aria-label={isConfirmationVisible ? "Hide confirm new password" : "Show confirm new password"} aria-pressed={isConfirmationVisible} onClick={() => setIsConfirmationVisible(visible => !visible)} className="absolute inset-y-0 right-1 inline-flex w-9 items-center justify-center rounded-md text-slate-600 outline-none hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#116fc4] focus-visible:ring-offset-1">
          {isConfirmationVisible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
        </button>
      </div>
      <CapsLockWarning isCapsLockOn={confirmationCapsLockWarning.isCapsLockOn} />
    </div>
    <PasswordPolicyBanner password={password} confirmPassword={confirmPassword} />
  </>;
}

function SecurityWorkspaceContent() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const workspaceAccess = trpc.admin.getWorkspaceAccess.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const [email, setEmail] = useState("");
  const [hours, setHours] = useState(168);
  const [event, setEvent] = useState<(typeof events)[number]>("all");
  const [auditEmail, setAuditEmail] = useState("");
  const [page, setPage] = useState(1);
  const [authEvent, setAuthEvent] = useState<(typeof authEventTypeOptions)[number]>("all");
  const [authRole, setAuthRole] = useState<(typeof authRoleOptions)[number]>("all");
  const [authIp, setAuthIp] = useState("");
  const [authPage, setAuthPage] = useState(1);
  const [invitationLink, setInvitationLink] = useState("");
  const [credentialTarget, setCredentialTarget] = useState<{ id: number; name: string; existingLoginId: string | null } | null>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isOwner = Boolean(workspaceAccess.data?.isOwner);
  const admins = trpc.admin.listAdmins.useQuery(undefined, { enabled: isOwner });
  const audit = trpc.admin.getAuditLog.useQuery({ event, email: auditEmail.trim(), page, pageSize: 20 }, { enabled: isOwner });
  const authEvents = trpc.admin.getAuthEvents.useQuery({ event: authEvent, role: authRole, ip: authIp.trim(), page: authPage, pageSize: 20 }, { enabled: isOwner });
  const createInvitation = trpc.admin.createInvitation.useMutation({ onSuccess: result => { setInvitationLink(result.invitationLink); setEmail(""); void utils.admin.getAuditLog.invalidate(); } });
  const revoke = trpc.admin.revokeAdmin.useMutation({ onSuccess: () => { void utils.admin.listAdmins.invalidate(); void utils.admin.getAuditLog.invalidate(); } });
  const provision = trpc.admin.provisionPasswordCredential.useMutation({
    onSuccess: () => {
      setCredentialTarget(null);
      setPassword("");
      setConfirmPassword("");
      void utils.admin.listAdmins.invalidate();
      void utils.admin.getAuditLog.invalidate();
    },
  });

  const beginCredentialProvisioning = (admin: { id: number; name: string | null; email: string | null; loginId: string | null }) => {
    setCredentialTarget({ id: admin.id, name: admin.name ?? admin.email ?? "Admin account", existingLoginId: admin.loginId });
    setLoginId(admin.loginId ?? (admin.id === user?.id ? "Admin" : ""));
    setPassword("");
    setConfirmPassword("");
  };

  if (loading || workspaceAccess.isLoading) return <div className="flex min-h-[60vh] items-center justify-center text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking Owner permissions…</div>;
  if (user?.role !== "admin" || !isOwner) return <AccessDenied />;

  return <div className="mx-auto max-w-7xl space-y-5 pb-10">
    

    <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-slate-900">Invite an Admin</h2><p className="mt-1 text-sm leading-6 text-slate-600">The link works once, binds to this email, and expires after the chosen time. After acceptance, assign credentials below.</p><label className="mt-5 block text-sm font-semibold text-slate-800">Invitee email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100" /></label><label className="mt-4 block text-sm font-semibold text-slate-800">Link expiry<select value={hours} onChange={e => setHours(Number(e.target.value))} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100"><option value={24}>24 hours</option><option value={72}>3 days</option><option value={168}>7 days</option><option value={720}>30 days</option></select></label>{createInvitation.isError ? <InlineError message={createInvitation.error.message || "The invitation link could not be created."} /> : null}<button type="button" disabled={!/^\S+@\S+\.\S+$/.test(email) || createInvitation.isPending} onClick={() => createInvitation.mutate({ email, expiresInHours: hours })} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#173b60] px-4 text-sm font-bold text-white transition hover:bg-[#102f4c] disabled:opacity-50">{createInvitation.isPending ? "Creating…" : "Create secure invitation link"}</button>{invitationLink ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Share this link privately</p><p className="mt-2 break-all text-xs leading-5 text-emerald-950">{invitationLink}</p><button type="button" onClick={() => void navigator.clipboard.writeText(invitationLink)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-900"><ClipboardCopy size={14} /> Copy invitation link</button></div> : null}</article>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-slate-900">Active Admin accounts</h2><p className="mt-1 text-sm leading-6 text-slate-600">Set or reset a dedicated Admin User ID and password. Passwords are hashed; they are never shown again after submission.</p>{admins.isLoading ? <div className="mt-5 flex items-center text-sm text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Admin accounts…</div> : <div className="mt-5 space-y-3">{(admins.data ?? []).map(admin => <div key={admin.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-bold text-slate-900">{admin.name ?? admin.email ?? "Admin account"}</p><p className="truncate text-sm text-slate-600">{admin.email ?? "Email unavailable"}</p><p className="mt-1 text-xs font-semibold text-slate-500">User ID: {admin.loginId ?? "Not provisioned"}</p></div>{admin.id === user?.id ? <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">Project Owner</span> : <button type="button" onClick={() => revoke.mutate({ userId: admin.id })} disabled={revoke.isPending} className="inline-flex w-fit items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-100"><UserMinus size={13} /> Revoke role</button>}</div><button type="button" onClick={() => beginCredentialProvisioning(admin)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100"><KeyRound size={14} /> {admin.loginId ? "Reset credentials" : "Set credentials"}</button>{credentialTarget?.id === admin.id ? <form className="mt-4 grid gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4" onSubmit={event => { event.preventDefault(); provision.mutate({ userId: admin.id, loginId, password, confirmPassword }); }}><p className="text-sm font-bold text-sky-950">Credentials for {credentialTarget.name}</p><label className="text-xs font-bold text-slate-700">User ID<input value={loginId} onChange={e => setLoginId(e.target.value)} maxLength={64} required className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal" /></label><CredentialPasswordFields password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} />{provision.isError ? <InlineError message={provision.error.message || "Credentials could not be saved."} /> : null}<div className="flex flex-wrap gap-2"><button type="submit" disabled={provision.isPending} className="rounded-lg bg-[#173b60] px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{provision.isPending ? "Saving…" : "Save credentials"}</button><button type="button" onClick={() => { setCredentialTarget(null); setPassword(""); setConfirmPassword(""); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Cancel</button></div></form> : null}</div>)}{admins.data?.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No Admin accounts are available.</p> : null}</div>}</article>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">Security audit log</h2><p className="mt-1 text-sm text-slate-600">Events exclude passwords, invitation tokens, recovery codes, and authenticator secrets.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-sm font-semibold text-slate-800">Account email<input type="search" value={auditEmail} onChange={e => { setAuditEmail(e.target.value); setPage(1); }} placeholder="Filter by email" className="mt-2 block h-10 rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none focus:border-[#116fc4]" /></label><label className="text-sm font-semibold text-slate-800">Event<select value={event} onChange={e => { setEvent(e.target.value as typeof event); setPage(1); }} className="mt-2 block h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-[#116fc4]">{events.map(option => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label></div></div>{audit.isLoading ? <div className="mt-5 flex items-center text-sm text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading security events…</div> : audit.isError ? <InlineError message="The audit log could not be loaded." /> : <><div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Time</th><th className="px-3 py-3">Event</th><th className="px-3 py-3">Account</th><th className="px-3 py-3">Context</th></tr></thead><tbody>{(audit.data?.items ?? []).map(entry => <tr key={entry.id} className="border-b border-slate-100 text-slate-700"><td className="whitespace-nowrap px-3 py-3">{new Date(entry.createdAt).toLocaleString()}</td><td className="px-3 py-3 font-semibold capitalize">{entry.event.replaceAll("_", " ")}</td><td className="px-3 py-3">{entry.email ?? "—"}</td><td className="px-3 py-3 text-xs text-slate-500">{formatAuditMetadata(entry.metadata)}</td></tr>)}{audit.data?.items.length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No matching security events.</td></tr> : null}</tbody></table></div>{(audit.data?.totalPages ?? 1) > 1 ? <div className="mt-4 flex items-center justify-between"><p className="text-sm text-slate-600">Page {audit.data?.page} of {audit.data?.totalPages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Previous</button><button type="button" disabled={page >= (audit.data?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Next</button></div></div> : null}</>}</section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">Public authentication events</h2><p className="mt-1 text-sm text-slate-600">Sign-in, registration, and phone-intake outcomes for Tutor and Guardian flows. Identifiers are masked; no passwords, tokens, or raw emails/phones are stored.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-sm font-semibold text-slate-800">IP<input type="search" value={authIp} onChange={e => { setAuthIp(e.target.value); setAuthPage(1); }} placeholder="Filter by IP" className="mt-2 block h-10 rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none focus:border-[#116fc4]" /></label><label className="text-sm font-semibold text-slate-800">Role<select value={authRole} onChange={e => { setAuthRole(e.target.value as typeof authRole); setAuthPage(1); }} className="mt-2 block h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-[#116fc4]">{authRoleOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label><label className="text-sm font-semibold text-slate-800">Event<select value={authEvent} onChange={e => { setAuthEvent(e.target.value as typeof authEvent); setAuthPage(1); }} className="mt-2 block h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-[#116fc4]">{authEventTypeOptions.map(option => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label></div></div>{authEvents.isLoading ? <div className="mt-5 flex items-center text-sm text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading authentication events…</div> : authEvents.isError ? <InlineError message="The authentication events could not be loaded." /> : <><div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Time</th><th className="px-3 py-3">Event</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Identifier</th><th className="px-3 py-3">IP</th><th className="px-3 py-3">Reason</th></tr></thead><tbody>{(authEvents.data?.items ?? []).map(entry => <tr key={entry.id} className="border-b border-slate-100 text-slate-700"><td className="whitespace-nowrap px-3 py-3">{new Date(entry.createdAt).toLocaleString()}</td><td className="px-3 py-3 font-semibold capitalize">{entry.event.replaceAll("_", " ")}</td><td className="px-3 py-3 capitalize">{entry.role ?? "—"}</td><td className="px-3 py-3 font-mono text-xs">{entry.identifierMasked ?? "—"}</td><td className="px-3 py-3 font-mono text-xs">{entry.ip ?? "—"}</td><td className="px-3 py-3 text-xs text-slate-500">{entry.reason ?? "—"}</td></tr>)}{authEvents.data?.items.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No matching authentication events.</td></tr> : null}</tbody></table></div>{(authEvents.data?.totalPages ?? 1) > 1 ? <div className="mt-4 flex items-center justify-between"><p className="text-sm text-slate-600">Page {authEvents.data?.page} of {authEvents.data?.totalPages}</p><div className="flex gap-2"><button type="button" disabled={authPage <= 1} onClick={() => setAuthPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Previous</button><button type="button" disabled={authPage >= (authEvents.data?.totalPages ?? 1)} onClick={() => setAuthPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Next</button></div></div> : null}</>}</section>

    <p className="flex items-start gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-xs leading-5 text-sky-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Give temporary passwords only through a verified private channel and require the Admin to change it after their first successful sign-in. Historical 2FA records remain inactive and are not required for workspace access.</p>
  </div>;
}

export default function AdminSecurityWorkspace() {
  return <AdminWorkspaceLayout title="Admin security"><SecurityWorkspaceContent /></AdminWorkspaceLayout>;
}
