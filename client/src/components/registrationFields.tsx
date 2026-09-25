// The account fields the Tutor registration and the Guardian account step share.
//
// The two forms were built separately and drifted: Gender ran Male/Female on
// one and Female/Male on the other, one password field had a "Show" word and a
// strength meter while the other had neither, and errors sat at two different
// gaps. Both now render from here, so a change lands on both at once.

import { Eye, EyeOff, Phone } from "lucide-react";
import React, { type ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { fieldLabel, filledField, requiredMark } from "@/components/journeyField";

export type RegistrationGender = "male" | "female";

export const registrationPolicyLinks = [
  { label: "Terms of Use", href: "/terms-conditions" },
  { label: "Privacy Policy", href: "/privacy-policy" },
] as const;

const inlineLink = "font-extrabold text-j-accent underline underline-offset-2";

export function RequiredMark() {
  return <span className={requiredMark} aria-label="required"> *</span>;
}

export function RegistrationFieldError({ id, message, children }: { id: string; message?: string; children: ReactNode }) {
  return <div>{children}{message ? <p id={id} role="alert" className="mt-1.5 text-xs font-semibold text-j-err">{message}</p> : null}</div>;
}

export function GenderField({ id, name, label, value, onSelect }: { id?: string; name: string; label: string; value: "" | RegistrationGender; onSelect: (value: RegistrationGender) => void }) {
  return <fieldset id={id}>
    <legend className={fieldLabel}>{label}<RequiredMark /></legend>
    <div className="mt-2 inline-flex rounded-xl bg-j-surface-muted p-1">
      {(["male", "female"] as const).map((option) => <label key={option} className={`cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-j-accent/50 ${value === option ? "bg-white text-j-accent shadow-[0_2px_6px_rgba(30,74,110,.12)]" : "text-j-ink-muted hover:text-j-ink-soft"}`}>
        <input type="radio" name={name} className="sr-only" checked={value === option} onChange={() => onSelect(option)} />{option === "male" ? "Male" : "Female"}
      </label>)}
    </div>
  </fieldset>;
}

/**
 * The +880 field. Editable on the Tutor form; read-only on the Guardian
 * account step, where the number was already confirmed on the phone step.
 */
export function PhoneField({ id, label, value, onChange, invalid, describedBy, placeholder, readOnly }: { id: string; label: string; value: string; onChange?: (value: string) => void; invalid?: boolean; describedBy?: string; placeholder?: string; readOnly?: boolean }) {
  return <label className="block" htmlFor={id}>
    <span className={fieldLabel}>{label}<RequiredMark /></span>
    <span className={`input-text-journey mt-2 flex items-stretch overflow-hidden rounded-xl border border-j-field-border transition ${readOnly ? "bg-j-surface-muted" : "bg-j-surface-sunken focus-within:border-j-accent focus-within:bg-white focus-within:ring-4 focus-within:ring-j-accent/12"}`}>
      <span className="flex items-center gap-1.5 border-r border-j-border px-3.5 font-bold text-j-ink-soft"><Phone size={14} aria-hidden="true" />+880</span>
      {readOnly
        ? <input id={id} readOnly aria-readonly="true" tabIndex={-1} value={value} className="min-w-0 flex-1 cursor-not-allowed bg-transparent px-3.5 py-3 text-j-ink-soft outline-none" />
        : <input id={id} required value={value} onChange={(event) => onChange?.(event.target.value)} aria-invalid={invalid} aria-describedby={describedBy} className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-j-ink outline-none placeholder:text-[#9aabbb]" placeholder={placeholder} inputMode="numeric" pattern="1[3-9][0-9]{8}" maxLength={10} autoComplete="tel-national" />}
    </span>
  </label>;
}

/** A password input with its own icon-only show/hide button. */
export function PasswordField({ id, label, value, onChange, placeholder, invalid, describedBy, inputClassName = "", children }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; invalid?: boolean; describedBy?: string; inputClassName?: string; children?: ReactNode }) {
  const [show, setShow] = useState(false);
  return <label className="block" htmlFor={id}>
    <span className={fieldLabel}>{label}<RequiredMark /></span>
    <span className="relative mt-2 block">
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid} aria-describedby={describedBy} className={`${filledField} pr-12 ${inputClassName}`} placeholder={placeholder} type={show ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} />
      <button type="button" onClick={() => setShow((current) => !current)} aria-label={show ? "Hide password" : "Show password"} title={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 inline-flex items-center rounded-r-xl px-3 text-j-ink-soft transition hover:text-j-accent focus:outline-none focus:ring-2 focus:ring-j-accent/40">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
    </span>
    {children}
  </label>;
}

export function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "" };
  const score = [password.length >= 8, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  if (score <= 1) return { score, label: "Weak", color: "bg-[#dc5b5b]" };
  if (score === 2) return { score, label: "Fair", color: "bg-j-warn" };
  if (score === 3) return { score, label: "Strong", color: "bg-j-ok" };
  return { score, label: "Excellent", color: "bg-j-accent" };
}

/** Four-segment meter plus a one-word rating - no advice sentence. */
export function PasswordStrength({ id, password }: { id: string; password: string }) {
  const strength = getPasswordStrength(password);
  return <div className="mt-2.5">
    <div role="progressbar" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.score} className="flex gap-1.5">{[0, 1, 2, 3].map((segment) => <span key={segment} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none ${segment < strength.score ? strength.color : "bg-j-border"}`} />)}</div>
    {strength.label ? <p id={id} role="status" aria-live="polite" aria-label={`Password strength: ${strength.label}`} className="mt-2 text-xs font-bold leading-5 text-j-ink-strong">{strength.label}</p> : null}
  </div>;
}

export function getPasswordMatch(password: string, confirmPassword: string) {
  if (!confirmPassword) return null;
  return password === confirmPassword ? { matches: true, label: "Passwords match" } : { matches: false, label: "Passwords do not match yet" };
}

export function PasswordMatch({ id, password, confirmPassword }: { id: string; password: string; confirmPassword: string }) {
  const match = getPasswordMatch(password, confirmPassword);
  if (!match) return null;
  return <p id={id} role="status" aria-live="polite" className={`mt-2 flex items-center gap-2 text-xs font-semibold leading-5 ${match.matches ? "text-j-ok" : "text-j-err"}`}><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${match.matches ? "bg-j-ok" : "bg-[#dc5b5b]"}`} />{match.label}</p>;
}

/** Border for the confirm field: red on an error or a mismatch, green once it matches. */
export function confirmPasswordBorder(password: string, confirmPassword: string, error?: string) {
  const match = getPasswordMatch(password, confirmPassword);
  if (error || (match && !match.matches)) return "border-[#dc5b5b] focus:border-[#dc5b5b]";
  return match?.matches ? "border-j-ok focus:border-j-ok" : "";
}

export function PolicyConsent({ id, checked, onChange }: { id: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const [terms, privacy] = registrationPolicyLinks;
  return <label className="mt-5 flex items-start gap-2.5 text-sm leading-6 text-j-ink-muted" htmlFor={id}>
    <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 rounded border-j-field-border text-j-accent" />
    <span>I agree to the <Link href={terms.href} className={inlineLink}>{terms.label}</Link> and <Link href={privacy.href} className={inlineLink}>{privacy.label}</Link>.</span>
  </label>;
}

export function SignInPrompt({ href }: { href: string }) {
  return <p className="text-sm text-j-ink-muted">Already registered? <Link href={href} className={inlineLink}>Sign in with email or mobile</Link></p>;
}

/** Seconds left until `until` (a Date.now() timestamp), ticking once a second; 0 when past. */
export function useSecondsUntil(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

/**
 * The 4-digit SMS code box. One plain input - `one-time-code` lets the phone
 * offer the code straight from the SMS - with the send-again control beside it,
 * which counts down until the server will accept another request.
 */
export function PhoneCodeField({ id, label, sentTo, value, onChange, error, resendInSeconds, resending, onResend, resendLabel, onChangeNumber, changeNumberLabel }: {
  id: string;
  label: string;
  /** The number the code went to, shown so a typo is easy to spot. */
  sentTo: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  resendInSeconds: number;
  resending: boolean;
  onResend: () => void;
  resendLabel: string;
  onChangeNumber: () => void;
  changeNumberLabel: string;
}) {
  return <div>
    <label className="block" htmlFor={id}>
      <span className={fieldLabel}>{label}<RequiredMark /></span>
      <span className="mt-1 block text-xs font-semibold text-j-ink-muted">{sentTo}</span>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{4}"
        maxLength={4}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        placeholder="••••"
        className={`${filledField} mt-2 max-w-[12rem] text-center text-xl font-bold tracking-[0.6em] tabular-nums`}
      />
    </label>
    {error ? <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-semibold text-j-err">{error}</p> : null}
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <button type="button" onClick={onResend} disabled={resending || resendInSeconds > 0} className="font-extrabold text-j-accent underline underline-offset-2 disabled:cursor-not-allowed disabled:text-j-ink-faint disabled:no-underline">
        {resendInSeconds > 0 ? `${resendLabel} (${resendInSeconds}s)` : resendLabel}
      </button>
      <button type="button" onClick={onChangeNumber} className="font-semibold text-j-ink-muted underline underline-offset-2 hover:text-j-ink-soft">{changeNumberLabel}</button>
    </div>
  </div>;
}

/** The divider row under the form that holds the sign-in link and the actions. */
export const registrationFooter = "mt-6 flex flex-col-reverse gap-4 border-t border-j-border pt-5 sm:flex-row sm:items-center sm:justify-between";
