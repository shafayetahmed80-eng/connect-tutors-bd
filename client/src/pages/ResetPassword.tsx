// Where an Admin-issued reset link lands: /reset-password/<token>. The same card
// as the sign-in pages, the same password fields as registration.

import { TRPCClientError } from "@trpc/client";
import { LoaderCircle } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import React, { FormEvent, useState } from "react";
import { Link, useRoute } from "wouter";
import { primaryButton } from "@/components/journeyField";
import { confirmPasswordBorder, getPasswordMatch, PasswordField, PasswordMatch, PasswordStrength, RegistrationFieldError } from "@/components/registrationFields";
import { SignInShell } from "@/components/SignInLayout";
import { rememberSignInRole } from "@/lib/signInRoleMemory";
import { trpc } from "@/lib/trpc";
import { PASSWORD_RESET_LINK_MESSAGES, PASSWORD_RESET_TOKEN_PATTERN } from "@shared/password-reset";

type ResetRole = "guardian" | "tutor";

const signInHref = (role: ResetRole) => (role === "tutor" ? "/tutor/login" : "/auth?role=guardian");

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <>
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-j-accent">{eyebrow}</p>
    <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-j-ink">{title}</h1>
  </>;
}

export default function ResetPassword() {
  const [, params] = useRoute("/reset-password/:token");
  const token = params?.token ?? "";
  const wellFormed = PASSWORD_RESET_TOKEN_PATTERN.test(token);
  const link = trpc.auth.checkPasswordResetLink.useQuery({ token }, { enabled: wellFormed, retry: false, refetchOnWindowFocus: false });
  const reset = trpc.auth.resetPasswordWithLink.useMutation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState("");
  const [doneRole, setDoneRole] = useState<ResetRole | null>(null);
  const passwordMatch = getPasswordMatch(password, confirmPassword);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const nextErrors: typeof errors = {};
    if (password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    else if (password.length > 128) nextErrors.password = "Password must be 128 characters or fewer.";
    if (!confirmPassword) nextErrors.confirmPassword = "Confirm your password.";
    else if (password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      const result = await reset.mutateAsync({ token, password, confirmPassword });
      rememberSignInRole(result.role);
      setDoneRole(result.role);
    } catch (cause) {
      setFormError(cause instanceof TRPCClientError && cause.message.trim() ? cause.message : "Your new password could not be saved. Please try again.");
    }
  };

  if (doneRole) {
    return <SignInShell>
      <Heading eyebrow="Password reset" title="Password changed" />
      <Link href={signInHref(doneRole)} className={`${primaryButton} mt-8 w-full`}>Sign in</Link>
    </SignInShell>;
  }

  if (wellFormed && link.isLoading) {
    return <SignInShell><p className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-j-ink-soft"><LoadingCradle /> Checking your link…</p></SignInShell>;
  }

  const problem = !wellFormed || link.isError ? "invalid" : link.data && link.data.status !== "valid" ? link.data.status : null;
  if (problem || !link.data || link.data.status !== "valid") {
    return <SignInShell>
      <Heading eyebrow="Password reset" title="This link cannot be used" />
      <p role="alert" className="mt-6 rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{PASSWORD_RESET_LINK_MESSAGES[problem ?? "invalid"]}</p>
      <Link href="/auth" className={`${primaryButton} mt-6 w-full`}>Go to sign in</Link>
    </SignInShell>;
  }

  const role = link.data.role;
  return <SignInShell>
    <Heading eyebrow={role === "tutor" ? "Tutor account" : "Guardian account"} title="Set a new password" />
    {link.data.name ? <p className="mt-3 text-sm font-semibold text-j-ink-soft">{link.data.name}</p> : null}
    <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
      <RegistrationFieldError id="new-password-error" message={errors.password}>
        <PasswordField id="new-password" label="New password" value={password} onChange={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined })); }} placeholder="At least 8 characters" invalid={Boolean(errors.password)} describedBy={errors.password ? "new-password-error" : "new-password-strength"}>
          <PasswordStrength id="new-password-strength" password={password} />
        </PasswordField>
      </RegistrationFieldError>
      <RegistrationFieldError id="confirm-new-password-error" message={errors.confirmPassword}>
        <PasswordField id="confirm-new-password" label="Confirm password" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setErrors((current) => ({ ...current, confirmPassword: undefined })); }} placeholder="Re-enter your password" invalid={errors.confirmPassword ? true : passwordMatch ? !passwordMatch.matches : undefined} describedBy={errors.confirmPassword ? "confirm-new-password-error" : passwordMatch ? "new-password-match" : undefined} inputClassName={confirmPasswordBorder(password, confirmPassword, errors.confirmPassword)}>
          <PasswordMatch id="new-password-match" password={password} confirmPassword={confirmPassword} />
        </PasswordField>
      </RegistrationFieldError>
      {formError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{formError}</p> : null}
      <button type="submit" disabled={reset.isPending} className={`${primaryButton} w-full`}>{reset.isPending ? <><LoaderCircle className="animate-spin" size={17} /> Saving…</> : "Save new password"}</button>
    </form>
  </SignInShell>;
}
