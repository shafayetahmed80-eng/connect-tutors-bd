// /forgot-password: a Guardian or Tutor resets their own password with a
// 4-digit SMS code to the mobile their account signs in with. The server
// answers the same whether or not the number has an account; only a real one
// gets the SMS.

import { TRPCClientError } from "@trpc/client";
import { LoaderCircle } from "lucide-react";
import React, { FormEvent, useState } from "react";
import { Link } from "wouter";
import { fieldLabel, primaryButton } from "@/components/journeyField";
import { confirmPasswordBorder, getPasswordMatch, PasswordField, PasswordMatch, PasswordStrength, PhoneCodeField, PhoneField, RegistrationFieldError, RequiredMark, useSecondsUntil } from "@/components/registrationFields";
import { SignInShell } from "@/components/SignInLayout";
import { useSiteContact } from "@/lib/siteContent";
import { readRememberedSignInRole, rememberSignInRole } from "@/lib/signInRoleMemory";
import { trpc } from "@/lib/trpc";
import { formatBangladeshMobile, isValidBangladeshLocalMobile, normalizeBangladeshLocalMobile } from "@/lib/tutorOnboarding";

type ResetRole = "guardian" | "tutor";
type Errors = Partial<Record<"phone" | "code" | "password" | "confirmPassword", string>>;

const roleNames: Record<ResetRole, string> = { guardian: "Guardian", tutor: "Tutor" };
const signInHref = (role: ResetRole) => (role === "tutor" ? "/tutor/login" : "/auth?role=guardian");

function initialRole(): ResetRole {
  if (typeof window === "undefined") return "guardian";
  const role = new URLSearchParams(window.location.search).get("role");
  if (role === "guardian" || role === "tutor") return role;
  return readRememberedSignInRole() ?? "guardian";
}

function Heading({ title }: { title: string }) {
  return <>
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-j-accent">Password reset</p>
    <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-j-ink">{title}</h1>
  </>;
}

function RoleSwitch({ value, onChange, disabled }: { value: ResetRole; onChange: (role: ResetRole) => void; disabled: boolean }) {
  return <fieldset disabled={disabled}>
    <legend className={fieldLabel}>Account type<RequiredMark /></legend>
    <div className="mt-2 inline-flex rounded-xl bg-j-surface-muted p-1">
      {(["guardian", "tutor"] as const).map(role => <label key={role} className={`cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-j-accent/50 ${value === role ? "bg-white text-j-accent shadow-[0_2px_6px_rgba(30,74,110,.12)]" : "text-j-ink-muted hover:text-j-ink-soft"}`}>
        <input type="radio" name="reset-role" className="sr-only" checked={value === role} onChange={() => onChange(role)} />{roleNames[role]}
      </label>)}
    </div>
  </fieldset>;
}

export default function ForgotPassword() {
  const contact = useSiteContact();
  const sendCode = trpc.auth.sendPasswordResetCode.useMutation();
  const reset = trpc.auth.resetPasswordWithCode.useMutation();
  const [role, setRole] = useState<ResetRole>(initialRole);
  const [phone, setPhone] = useState("");
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const resendInSeconds = useSecondsUntil(resendAt);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(false);
  const passwordMatch = getPasswordMatch(password, confirmPassword);

  const clearError = (key: keyof Errors) => setErrors(current => ({ ...current, [key]: undefined }));

  const requestCode = async (target: string) => {
    setFormError("");
    try {
      const result = await sendCode.mutateAsync({ role, phone: target });
      setCodeSentTo(target);
      setResendAt(Date.now() + result.resendAfterSeconds * 1000);
      window.requestAnimationFrame(() => document.getElementById("reset-code")?.focus());
    } catch (cause) {
      const message = cause instanceof TRPCClientError && cause.message.trim() ? cause.message : "The code could not be sent right now. Please try again in a few minutes.";
      if (codeSentTo) setErrors(current => ({ ...current, code: message }));
      else setFormError(message);
    }
  };

  const submitPhone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidBangladeshLocalMobile(phone)) {
      setErrors({ phone: "Enter a valid 10-digit Bangladesh mobile number after +880." });
      return;
    }
    void requestCode(formatBangladeshMobile(phone));
  };

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const next: Errors = {};
    if (!/^\d{4}$/.test(code)) next.code = "Enter the 4-digit code sent to your mobile.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    else if (password.length > 128) next.password = "Password must be 128 characters or fewer.";
    if (!confirmPassword) next.confirmPassword = "Confirm your password.";
    else if (password !== confirmPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length || !codeSentTo) return;
    try {
      await reset.mutateAsync({ role, phone: codeSentTo, code, password, confirmPassword });
      rememberSignInRole(role);
      setDone(true);
    } catch (cause) {
      const trpcError = cause instanceof TRPCClientError ? cause : null;
      const fields = (trpcError?.data as { zodFieldErrors?: Record<string, string[]> } | null | undefined)?.zodFieldErrors;
      const codeMessage = fields?.phoneCode?.[0] ?? fields?.code?.[0];
      if (codeMessage) { setErrors(current => ({ ...current, code: codeMessage })); return; }
      if (fields?.password?.[0] || fields?.confirmPassword?.[0]) { setErrors(current => ({ ...current, password: fields.password?.[0], confirmPassword: fields.confirmPassword?.[0] })); return; }
      setFormError(trpcError?.message?.trim() || "Your new password could not be saved. Please try again.");
    }
  };

  if (done) {
    return <SignInShell>
      <Heading title="Password changed" />
      <Link href={signInHref(role)} className={`${primaryButton} mt-8 w-full`}>Sign in</Link>
    </SignInShell>;
  }

  const footer = <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
    <Link href={signInHref(role)} className="font-extrabold text-j-accent underline underline-offset-2">Back to sign in</Link>
    <a href={contact.whatsapp("Hello Connect Tutors, I need help recovering my account.")} className="font-semibold text-j-ink-muted underline underline-offset-2 hover:text-j-ink-soft">Need help? WhatsApp</a>
  </div>;

  if (!codeSentTo) {
    return <SignInShell>
      <Heading title="Forgot your password?" />
      <form className="mt-8 space-y-5" onSubmit={submitPhone} noValidate>
        <RoleSwitch value={role} onChange={setRole} disabled={sendCode.isPending} />
        <RegistrationFieldError id="reset-phone-error" message={errors.phone}>
          <PhoneField id="reset-phone" label="Mobile number" value={phone} onChange={value => { setPhone(normalizeBangladeshLocalMobile(value)); clearError("phone"); }} placeholder="1XXXXXXXXX" invalid={Boolean(errors.phone)} describedBy={errors.phone ? "reset-phone-error" : undefined} />
        </RegistrationFieldError>
        {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{formError}</p> : null}
        <button type="submit" disabled={sendCode.isPending} className={`${primaryButton} w-full`}>{sendCode.isPending ? <><LoaderCircle className="animate-spin" size={17} /> Sending code…</> : "Send code"}</button>
      </form>
      {footer}
    </SignInShell>;
  }

  return <SignInShell>
    <Heading title="Set a new password" />
    <form className="mt-8 space-y-5" onSubmit={submitReset} noValidate>
      <PhoneCodeField
        id="reset-code"
        label="Verification code"
        sentTo={`If a ${roleNames[role]} account signs in with ${codeSentTo}, the code has been sent to it.`}
        value={code}
        onChange={value => { setCode(value); clearError("code"); }}
        error={errors.code}
        resendInSeconds={resendInSeconds}
        resending={sendCode.isPending}
        onResend={() => { clearError("code"); void requestCode(codeSentTo); }}
        resendLabel="Send a new code"
        onChangeNumber={() => { setCodeSentTo(null); setCode(""); setErrors({}); }}
        changeNumberLabel="Change number"
      />
      <RegistrationFieldError id="reset-password-error" message={errors.password}>
        <PasswordField id="reset-password" label="New password" value={password} onChange={value => { setPassword(value); clearError("password"); }} placeholder="At least 8 characters" invalid={Boolean(errors.password)} describedBy={errors.password ? "reset-password-error" : "reset-password-strength"}>
          <PasswordStrength id="reset-password-strength" password={password} />
        </PasswordField>
      </RegistrationFieldError>
      <RegistrationFieldError id="reset-confirm-error" message={errors.confirmPassword}>
        <PasswordField id="reset-confirm" label="Confirm password" value={confirmPassword} onChange={value => { setConfirmPassword(value); clearError("confirmPassword"); }} placeholder="Re-enter your password" invalid={errors.confirmPassword ? true : passwordMatch ? !passwordMatch.matches : undefined} describedBy={errors.confirmPassword ? "reset-confirm-error" : passwordMatch ? "reset-password-match" : undefined} inputClassName={confirmPasswordBorder(password, confirmPassword, errors.confirmPassword)}>
          <PasswordMatch id="reset-password-match" password={password} confirmPassword={confirmPassword} />
        </PasswordField>
      </RegistrationFieldError>
      {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{formError}</p> : null}
      <button type="submit" disabled={reset.isPending} className={`${primaryButton} w-full`}>{reset.isPending ? <><LoaderCircle className="animate-spin" size={17} /> Saving…</> : "Save new password"}</button>
    </form>
    {footer}
  </SignInShell>;
}
