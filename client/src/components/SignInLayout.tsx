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
import { Link } from "wouter";
import { SiteContentProvider, useSiteContentText } from "@/lib/siteContent";


/**
 * One centred card under the site header - no side panel, at the Owner's
 * request - that widens on a laptop so the Guardian/Tutor cards and fields are
 * not squeezed into a phone-width column. Its copy is the Owner's, edited on the
 * Public pages screen.
 */
export function SignInShell({ children }: { children: ReactNode }) {
  return <SiteContentProvider page="info-pages"><div className="site-page min-h-screen bg-j-page text-j-ink">
    <SiteHeader />
    <main className="px-4 py-10 sm:px-6 lg:py-16">
      <section className="mx-auto max-w-xl rounded-[1.65rem] border border-j-border bg-white p-6 shadow-[0_20px_56px_rgba(27,84,122,0.13)] sm:p-10 lg:max-w-3xl lg:p-12">{children}</section>
    </main>
    <SiteFooter />
  </div></SiteContentProvider>;
}

/**
 * Eyebrow, h1 and the line under it, read from `<slotPrefix>.eyebrow|title|copy`.
 * /auth has no line under its heading (the Owner removed it), so it has no
 * `sign-in.copy` slot and nothing renders there.
 */
export function SignInHeading({ slotPrefix }: { slotPrefix: "sign-in" | "tutor-sign-in" }) {
  const eyebrow = useSiteContentText(`${slotPrefix}.eyebrow`);
  const title = useSiteContentText(`${slotPrefix}.title`);
  const copy = useSiteContentText(`${slotPrefix}.copy`);
  return <>
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-j-accent">{eyebrow}</p>
    <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-j-ink">{title}</h1>
    {copy ? <p className="mt-3 text-sm leading-7 text-j-ink-muted">{copy}</p> : null}
  </>;
}

/** Email-or-mobile + password, the error box and the submit button. */
export function SignInForm({ idPrefix, identifier, onIdentifier, password, onPassword, error, errorAction, pending, submitLabel, onSubmit, forgotHref }: {
  idPrefix: string;
  identifier: string;
  onIdentifier: (value: string) => void;
  password: string;
  onPassword: (value: string) => void;
  error?: string | null;
  /** A way out of the error, shown inside its box - the switch to the right account type. */
  errorAction?: ReactNode;
  pending: boolean;
  submitLabel: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** The SMS-code password reset, opened on the right account type. */
  forgotHref: string;
}) {
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
        <Link className="text-xs font-semibold text-j-accent underline-offset-4 hover:underline" href={forgotHref}>Forgot password?</Link>
      </div>
      <span className="relative mt-2 block">
        <input id={passwordId} name="password" required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => onPassword(event.target.value)} onKeyDown={capsLock.updateCapsLockState} onKeyUp={capsLock.updateCapsLockState} onBlur={capsLock.clearCapsLockWarning} placeholder="Your password" className={`${filledField} pr-12`} />
        <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 inline-flex items-center rounded-r-xl px-3 text-j-ink-soft transition hover:text-j-accent focus:outline-none focus:ring-2 focus:ring-j-accent/40">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </span>
      <CapsLockWarning isCapsLockOn={capsLock.isCapsLockOn} />
    </div>

    {error ? <div role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{error}{errorAction ? <div className="mt-3">{errorAction}</div> : null}</div> : null}

    {/* A slow breathing glow while the request is in flight - reinforcement, not a second spinner. */}
    <button type="submit" disabled={pending} className={`${primaryButton} w-full ${pending ? "sign-in-submit-glow" : ""}`}>{pending ? <><LoaderCircle className="animate-spin" size={17} /> Signing in…</> : submitLabel}</button>
  </form>;
}
