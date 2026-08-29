# Guardian and Tutor Account Access Specification

## Scope

This release replaces the public role-selector handoff with a first-party, password-based access experience for **Guardian** and **Tutor** accounts. The selected role may sign in with either a normalized email address or a Bangladesh mobile number and a password. Guardian registration remains inside the established request-for-tutor journey; Tutor registration remains at `/become-tutor`.

## Explicit non-goals

This release does not introduce SMS OTP, password-reset email delivery, Admin authentication changes, role switching, shared Guardian/Tutor identities, passwordless login, or public access to private phone data. Admin login continues to use the existing separate route and mandatory TOTP proof.

## Roles and journeys

| Persona | Sign-in destination | Registration destination | Successful destination |
|---|---|---|---|
| Guardian | `/auth` with Guardian selected | `/request-tutor` | `/account` |
| Tutor | `/auth` with Tutor selected | `/become-tutor` | `/tutor/dashboard` |
| Admin | `/admin/login` only | Owner invitation only | Existing protected Admin destination |

An account is bound to one product role. Existing database constraints continue to require distinct email credentials for separate accounts. The same Bangladesh mobile number may only identify one account within a role; duplicate values in a role are rejected during registration to keep password login unambiguous.

## Data contract and migration

Add a nullable private `loginPhone` field to `users`. It stores a canonical Bangladesh mobile string in the form `+8801XXXXXXXXX` and must never be returned by public Tutor procedures. Add a composite uniqueness constraint on `(role, loginPhone)` when `loginPhone` is present. Existing Tutor and Guardian phone values are normalized and backfilled where valid; accounts with legacy invalid or conflicting values retain `NULL` and remain able to sign in by email.

Tutor registration normalizes its supplied mobile number before writing both the private Tutor profile and `users.loginPhone`. Guardian registration copies the already-normalized private phone intake value to `users.loginPhone`. No browser code receives the account lookup value after sign-in.

## Server contract

The new public procedure is `auth.loginAccount` with input:

```ts
{
  role: "guardian" | "tutor";
  identifier: string; // email or Bangladesh mobile number
  password: string;
}
```

The server trims and normalizes the identifier. An email uses the existing lowercase email normalizer; a phone uses the existing Bangladesh mobile normalizer. It resolves only the selected role by either `users.email` or `users.loginPhone`, verifies the stored scrypt password hash, and issues the existing signed session only on success. The response exposes the same safe user session shape already used by password login.

Credential lookup, wrong password, wrong selected role, invalid identifier, missing password hash, and ambiguous legacy phone values all return the same `UNAUTHORIZED` response: `Email/mobile number or password is not correct.` The UI may add neutral guidance: `Choose the account type you used when registering.` This does not confirm that an account exists.

The existing `auth.loginTutor` procedure remains temporarily available for compatibility but delegates to the same role-safe verification path. `auth.loginAccount` accepts no `admin` role and cannot alter an account role.

## Public interface

`/auth` presents Login and Register tabs. Login includes a Guardian/Tutor account-type choice, an `Email or mobile number` input, a password input with a show/hide control, safe loading/error state, and a role-specific primary action. The Register tab never creates a new account inline: it describes the selected journey and links Guardian users to `/request-tutor` and Tutor users to `/become-tutor`.

The interface is English-first, keyboard accessible, mobile responsive, and uses labelled controls with no duplicated IDs. It includes a neutral support-recovery link rather than a non-functional password-reset promise. It never displays account email, mobile number, or role-discovery details after failure.

## Validation and acceptance criteria

| Scenario | Expected outcome |
|---|---|
| Guardian enters registered email or canonical/accepted Bangladesh phone plus correct password | A Guardian session is created and redirects to `/account`. |
| Tutor enters registered email or canonical/accepted Bangladesh phone plus correct password | A Tutor session is created and redirects to `/tutor/dashboard`. |
| Wrong role, invalid identifier, unknown account, or wrong password | No session is created; the same generic credential error is shown. |
| User selects Register as Guardian | They are directed to the existing private `/request-tutor` journey. |
| User selects Register as Tutor | They are directed to `/become-tutor`. |
| Admin tries the public account screen | The screen does not offer an Admin role or bypass mandatory Admin 2FA. |
| Existing legacy account has no valid normalized phone | Email/password login continues to work. |

## Verification

Focused Vitest coverage must include email and phone normalization, selected-role isolation, generic invalid credential handling, duplicate role-phone safeguards, session issuance, and UI registration routes. Release validation must run `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm build`, followed by desktop and 375px route review.
