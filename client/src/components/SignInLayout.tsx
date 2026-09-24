// The frame and form both sign-in pages share: /auth (Guardian or Tutor) and
// /tutor/login.
//
// The two pages were built apart and read as two products - one had the site
// header, a rounded-full button and plain inputs; the other a rounded-lg
// button, an icon inside the field and its own red for the asterisk. Both now
// render from here and use the same journey tokens as the registration forms.
// The blue side panel both pages had is gone too; the form stands alone.
// Labels and buttons carry no icons (no arrows either) - the Owner does not
// want them on sign-in or registration forms.

import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import React, { type FormEvent, type ReactNode, useState } from "react";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { CapsLockWarning, useCapsLockWarning } from "@/components/CapsLockWarning";
import { fieldLabel, filledField, primaryButton, requiredMark } from "@/components/journeyField";
import { useSiteContact } from "@/lib/siteContent";

export const SIGN_IN_RECOVERY_NOTE = "For password recovery, contact support on WhatsApp. We do not offer email reset links yet.";
const RECOVERY_MESSAGE = "Hello Connect Tutors, I need help recovering my account.";

/** One centred card under the site header - no side panel, at the Owner's request. */
export function SignInShell({ children }: { children: ReactNode }) {
  return <div className="site-page min-h-screen bg-j-page text-j-ink">
    <SiteHeader />
    <main className="px-4 py-10 sm:px-6 lg:py-16">
      <section className="mx-auto max-w-xl rounded-[1.65rem] border border-j-border bg-white p-6 shadow-[0_20px_56px_rgba(27,84,122,0.13)] sm:p-10">{children}</section>
    </main>
    <SiteFooter />
  </div>;
}

export function SignInHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <>
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-j-accent">{eyebrow}</p>
    <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-j-ink">{title}</h1>
    {body ? <p className="mt-3 text-sm leading-7 text-j-ink-muted">{body}</p> : null}
  </>;
}

/** Email-or-mobile + password, the error box, the submit button and the recovery note. */
export function SignInForm({ idPrefix, identifier, onIdentifier, password, onPassword, error, pending, submitLabel, onSubmit }: {
  idPrefix: string;
  identifier: string;
  onIdentifier: (value: string) => void;
  password: string;
  onPassword: (value: string) => void;
  error?: string | null;
  pending: boolean;
  submitLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const contact = useSiteContact();
  const capsLock = useCapsLockWarning();
  const [showPassword, setShowPassword] = useState(false);
  const identifierId = `${idPrefix}-identifier`;
  const passwordId = `${idPrefix}-password`;
  const star = <span className={requiredMark} aria-label="required"> *</span>;

  return <form className="mt-8 space-y-5" onSubmit={onSubmit}>
    <div>
      <label htmlFor={identifierId} className={fieldLabel}>Email or mobile number{star}</label>
      <input id={identifierId} name="identifier" required type="text" inputMode="text" autoComplete="username" value={identifier} onChange={(event) => onIdentifier(event.target.value)} placeholder="name@example.com or 017XXXXXXXX" className={`${filledField} mt-2`} />
    </div>
    <div>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={passwordId} className={fieldLabel}>Password{star}</label>
        <a className="text-xs font-semibold text-j-accent underline-offset-4 hover:underline" href={contact.whatsapp(RECOVERY_MESSAGE)}>Need help signing in?</a>
      </div>
      <span className="relative mt-2 block">
        <input id={passwordId} name="password" required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => onPassword(event.target.value)} onKeyDown={capsLock.updateCapsLockState} onKeyUp={capsLock.updateCapsLockState} onBlur={capsLock.clearCapsLockWarning} placeholder="Your password" className={`${filledField} pr-12`} />
        <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 inline-flex items-center rounded-r-xl px-3 text-j-ink-soft transition hover:text-j-accent focus:outline-none focus:ring-2 focus:ring-j-accent/40">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </span>
      <CapsLockWarning isCapsLockOn={capsLock.isCapsLockOn} />
    </div>

    {error ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{error}</p> : null}

    <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>{pending ? <><LoaderCircle className="animate-spin" size={17} /> Signing in…</> : submitLabel}</button>
    <p className="text-center text-xs leading-5 text-j-ink-muted">{SIGN_IN_RECOVERY_NOTE}</p>
  </form>;
}
