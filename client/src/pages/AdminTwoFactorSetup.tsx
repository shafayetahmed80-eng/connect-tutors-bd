import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ADMIN_HOME_PATH } from "@/lib/adminHome";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LoadingCradle } from "@/components/BrandMark";
import { CheckCircle2, ClipboardCopy, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";

function getErrorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "That code could not be confirmed. Try again.";
}

export default function AdminTwoFactorSetup() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const status = trpc.admin.twoFactorStatus.useQuery(undefined, { enabled: isAdmin, retry: false });
  const startSetup = trpc.admin.startTwoFactorSetup.useMutation();
  const confirmSetup = trpc.admin.confirmTwoFactorSetup.useMutation();
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Already enrolled: nothing to set up here. Verified sends them straight in;
  // enrolled-but-not-verified (this is a different browser, or a reload mid-way
  // through an earlier setup) belongs on the challenge instead.
  useEffect(() => {
    if (!status.data || recoveryCodes) return;
    if (status.data.enrolled) navigate(status.data.verified ? ADMIN_HOME_PATH : "/admin/2fa-challenge");
  }, [status.data, recoveryCodes, navigate]);

  // One secret for the whole flow: requesting a new one on every keystroke
  // would invalidate the QR code the Admin just scanned.
  useEffect(() => {
    if (isAdmin && status.data && !status.data.enrolled && !startSetup.data && !startSetup.isPending) {
      startSetup.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, status.data]);

  const runConfirm = async (candidate: string) => {
    if (!startSetup.data || confirmSetup.isPending) return;
    setFormError(null);
    try {
      const result = await confirmSetup.mutateAsync({ secret: startSetup.data.secret, code: candidate });
      setRecoveryCodes(result.recoveryCodes);
      setCode("");
    } catch (cause) {
      setCode("");
      setFormError(getErrorMessage(cause));
    }
  };

  // Six digits is a complete code, so there is nothing to wait for a button click to do.
  const handleCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void runConfirm(digits);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runConfirm(code);
  };

  const copy = async (text: string, mark: (value: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    mark(true);
    setTimeout(() => mark(false), 2000);
  };

  const busy = authLoading || status.isLoading;

  return <div className="site-page min-h-screen bg-j-page text-j-ink">
    <SiteHeader />
    <main className="px-4 py-10 sm:px-6 lg:py-20">
      <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-j-border bg-white px-6 py-9 shadow-[0_1px_2px_rgba(16,49,77,.05),0_20px_54px_-14px_rgba(16,49,77,.20)] ring-1 ring-[rgba(16,49,77,.035)] sm:px-10 sm:py-11 lg:max-w-lg">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,var(--j-accent),transparent)]" />
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex rounded-xl bg-j-accent-wash p-3.5 text-j-accent shadow-[0_8px_20px_-8px_rgba(22,125,221,.55)]"><ShieldCheck size={28} /></span>
          <h1 className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#2782c7]">Set up two-factor authentication</h1>
          <p className="mt-2 text-sm leading-6 text-j-ink-soft">Every Admin account needs this before it can open the workspace. You need an authenticator app - Google Authenticator, Authy, or similar.</p>
        </div>

        {busy || !isAdmin ? <div className="mt-8 flex items-center gap-3 rounded-xl bg-j-surface-sunken px-4 py-4 text-sm font-semibold text-[#56738d]"><LoadingCradle /> Checking your account…</div> : null}

        {isAdmin && !busy && recoveryCodes ? <div className="mt-8 space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><p className="text-sm font-bold text-emerald-900">Two-factor authentication is on.</p><p className="mt-1 text-sm leading-6 text-emerald-800">Save these 10 recovery codes somewhere safe. Each works once, and this is the only time they are shown.</p></div></div>
          <div className="rounded-xl border border-j-field-border bg-j-surface-sunken p-4">
            <ol className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-sm text-j-ink">{recoveryCodes.map(recoveryCode => <li key={recoveryCode}>{recoveryCode}</li>)}</ol>
          </div>
          <button type="button" onClick={() => void copy(recoveryCodes.join("\n"), setCopiedCodes)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-j-field-border bg-white px-4 py-2.5 text-sm font-bold text-j-ink-soft transition hover:bg-j-surface-muted"><ClipboardCopy size={15} /> {copiedCodes ? "Copied" : "Copy all 10 codes"}</button>
          <button type="button" onClick={() => navigate(ADMIN_HOME_PATH)} className="flex w-full items-center justify-center rounded-lg bg-j-accent px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,59,96,0.24)] transition hover:bg-j-accent-hover">Continue to the Admin workspace</button>
        </div> : null}

        {isAdmin && !busy && !recoveryCodes ? <div className="mt-8 space-y-6">
          {startSetup.isPending || !startSetup.data ? <div className="flex items-center gap-3 rounded-xl bg-j-surface-sunken px-4 py-4 text-sm font-semibold text-[#56738d]"><LoadingCradle /> Preparing your setup code…</div> : <>
            <div className="flex flex-col items-center gap-3 rounded-xl border border-j-field-border bg-j-surface-sunken p-5">
              <img src={startSetup.data.qrDataUrl} alt="Scan this QR code in your authenticator app" width={200} height={200} className="rounded-lg border border-j-border bg-white" />
              <p className="text-xs font-semibold text-j-ink-muted">Can't scan it? Enter this key by hand:</p>
              <div className="flex w-full items-center gap-2 rounded-lg border border-j-field-border bg-white px-3 py-2"><KeyRound size={14} className="shrink-0 text-j-accent" /><code className="min-w-0 flex-1 truncate font-mono text-xs text-j-ink">{startSetup.data.secret}</code><button type="button" onClick={() => void copy(startSetup.data!.secret, setCopiedSecret)} className="shrink-0 text-xs font-bold text-j-accent hover:underline">{copiedSecret ? "Copied" : "Copy"}</button></div>
            </div>
            <form className="grid gap-3" onSubmit={event => void submit(event)} noValidate>
              <label htmlFor="admin-2fa-setup-code" className="text-sm font-bold text-j-ink-soft">Enter the 6-digit code your app shows</label>
              <input id="admin-2fa-setup-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} value={code} onChange={event => handleCodeChange(event.target.value)} disabled={confirmSetup.isPending} required className="h-12 rounded-lg border border-j-field-border bg-j-surface-sunken px-4 text-center font-mono text-lg tracking-[0.3em] transition-colors focus-visible:border-j-accent focus-visible:outline-none focus-visible:ring-0" />
              {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold text-j-err">{formError}</p> : null}
              <button type="submit" disabled={code.length !== 6 || confirmSetup.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-j-accent px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,59,96,0.24)] transition hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-60">{confirmSetup.isPending ? "Confirming…" : "Confirm and turn on"}</button>
            </form>
          </>}
        </div> : null}
      </section>
    </main>
    <SiteFooter />
  </div>;
}
