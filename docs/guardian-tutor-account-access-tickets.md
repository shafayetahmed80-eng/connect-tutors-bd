# Guardian and Tutor Account Access Implementation Tickets

## ATA-01 — Add private normalized login-phone foundation

**Purpose:** Allow existing and new Guardian/Tutor accounts to use a Bangladesh mobile number as a role-scoped sign-in identifier without exposing it publicly.

**Surfaces:** `drizzle/schema.ts`, a new Drizzle migration, `server/db.ts`, Tutor registration, Guardian registration, and password-auth tests.

**Dependencies:** None.

**Acceptance criteria:** A nullable `users.loginPhone` field exists; valid Bangladesh phone values normalize to `+8801XXXXXXXXX`; email remains usable for all legacy accounts; role-scoped duplicate phone values are safely rejected; no public API response exposes `loginPhone`.

**Verification:** Focused database/helper tests and generated migration review before a single non-destructive SQL application.

## ATA-02 — Implement role-safe email-or-mobile password login

**Purpose:** Provide one generic, non-enumerating password login contract for Guardian and Tutor accounts.

**Surfaces:** `server/db.ts`, `server/routers.ts`, validation schemas, and router tests.

**Dependencies:** ATA-01.

**Acceptance criteria:** `auth.loginAccount` accepts only Guardian/Tutor; it resolves selected-role email or normalized mobile, verifies scrypt hashes, sets the existing session only on success, and returns one generic error for all authentication failures. `auth.loginTutor` remains compatible through the shared verifier. Admin cannot use the procedure.

**Verification:** Router-level success, role mismatch, unknown identifier, bad password, and no-session-on-failure tests.

## ATA-03 — Build the approved account-access screen

**Purpose:** Deliver the screenshot-aligned Login/Register interface with real Guardian/Tutor authentication and safe registration handoff.

**Surfaces:** `client/src/pages/Auth.tsx`, route tests, shared styles, and existing Auth-related components only where necessary.

**Dependencies:** ATA-02.

**Acceptance criteria:** The role choice controls the accessible sign-in form and post-success route; password visibility works; loading/error states are clear and non-enumerating; Guardian Register links to `/request-tutor`; Tutor Register links to `/become-tutor`; Admin has no public-selector option.

**Verification:** Deterministic UI contract tests, keyboard checks, and desktop/375px screenshots.

## ATA-04 — Complete security and release verification

**Purpose:** Confirm the change does not weaken privacy, session security, role separation, or mandatory Admin 2FA.

**Surfaces:** affected tests, `todo.md`, runtime logs, and release checkpoint.

**Dependencies:** ATA-01 through ATA-03.

**Acceptance criteria:** All relevant tests pass; type and production build pass; phone values are absent from public tutor outputs; Admin access remains at `/admin/login` with its existing 2FA behavior; visual verification has no mobile overflow.

**Verification:** `pnpm test && pnpm exec tsc --noEmit && pnpm build`, runtime log review, and responsive screenshots.

