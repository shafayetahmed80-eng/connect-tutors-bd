# Register Panel Journey Launcher — Implementation Tickets

**Status:** Ready for implementation approval  
**Scope:** Option A from the journey review — enrich the public `/auth` Register tab with truthful role-specific registration guidance and canonical journey links. No registration form, database, server procedure, authorization rule, or Admin flow changes are in scope.

## Guardrails

| Guardrail | Requirement |
|---|---|
| Canonical journeys | Guardian registration remains `/request-tutor`; Tutor registration remains `/become-tutor`. |
| Privacy | No account existence, mobile number, email address, or request data is rendered from the Register panel. |
| Account creation | `/auth` Register mode must not contain registration fields or call a registration mutation. |
| Role boundaries | Only `guardian` and `tutor` are preselectable. Query state cannot create, promote, or alter an account role. Admin access and mandatory TOTP remain separate. |
| Source of truth | Step counts, required-input summaries, and profile expectations must match the current Guardian and Tutor journeys. |

## RP-01 — Safe role-preselected public account entry

**Purpose:** Let contextual registration links open the unified account access page with the intended public role visibly selected.

| Item | Detail |
|---|---|
| Likely surfaces | `client/src/pages/Auth.tsx`, `client/src/pages/Auth.test.tsx` |
| Dependency | None |
| Work | Add a narrow client-side parser for `role=guardian` and `role=tutor` on `/auth` or `/register`. Ignore unknown, duplicate, malformed, and Admin values; fall back to Guardian. Preserve the selected role while switching between Sign in and Register. |
| Explicit exclusion | The URL parameter must not be sent as authority beyond the existing selected-role sign-in input, and must not alter any server role/session data. |
| Acceptance criteria | `/auth?role=tutor` visibly selects Tutor. `/auth?role=guardian` selects Guardian. `/auth?role=admin` and arbitrary values select no privileged role and safely fall back to Guardian. Keyboard role selection remains operable. |
| Verification | Focused Auth UI tests; `pnpm test`; `pnpm exec tsc --noEmit`. |

## RP-02 — Role-specific Register journey launcher

**Purpose:** Replace the current generic Register CTA card with a richer, accurate journey map based on the existing forms.

| Item | Detail |
|---|---|
| Likely surfaces | `client/src/pages/Auth.tsx`, `client/src/pages/Auth.test.tsx`, existing shared visual primitives where appropriate |
| Dependency | RP-01 |
| Work | For Guardian, present a compact three-step map: **Confirm mobile**, **Create private account**, **Request a Tutor**; explain that a Guardian account is created within the secure request journey and include an accurate privacy cue. For Tutor, present a compact two-step map: **Secure account details**, **Teaching location and consent**; explain that profile preferences are completed from the Tutor Dashboard after registration. Keep a single canonical role CTA: Guardian to `/request-tutor`, Tutor to `/become-tutor`. |
| Accessibility | Use semantic ordered content or labelled step groups; preserve visible focus states, readable colour contrast, and at least 44px touch targets. Do not use a step map that appears to be a completed or clickable registration form. |
| Responsive behaviour | The step map is horizontally concise on wider screens and stacks cleanly at 375px without clipped labels or horizontal scrolling. |
| Acceptance criteria | Each selected role shows only its accurate journey, no inline credential inputs, no registration mutation, clear CTA labels, and a low-emphasis WhatsApp support link. Switching roles updates every journey detail and destination. |
| Verification | Focused Auth UI tests for Guardian and Tutor copy, canonical links, absence of registration fields/mutations, role switching, keyboard selection, and mobile-safe structure. |

## RP-03 — Contextual return to unified Tutor sign-in

**Purpose:** Align the existing Tutor Registration page with email-or-mobile public account access after a Tutor decides to sign in instead.

| Item | Detail |
|---|---|
| Likely surfaces | `client/src/pages/JoinTutor.tsx`, its existing UI tests, potentially `Auth.test.tsx` |
| Dependency | RP-01 |
| Work | Replace the Tutor Registration step-one legacy “Sign in with email” link with an accurately labelled unified access link to `/auth?role=tutor`. Keep it a navigation-only action; do not change Tutor registration validation, mutations, onboarding draft behaviour, or Dashboard redirect. |
| Acceptance criteria | The contextual link opens `/auth` with Tutor visibly selected and the unified page continues to accept email or Bangladesh mobile number. Existing `/tutor/login` remains untouched for backwards compatibility unless a separately approved deprecation ticket is created. |
| Verification | Focused route/link regression; `pnpm test`; `pnpm exec tsc --noEmit`. |

## RP-04 — Regression, visual, and release verification

**Purpose:** Prove the updated Register panel is truthful, accessible, responsive, and does not weaken account-access safeguards.

| Item | Detail |
|---|---|
| Likely surfaces | `client/src/pages/Auth.test.tsx`, `client/src/pages/JoinTutor*.test.tsx`, `todo.md` |
| Dependency | RP-01 through RP-03 |
| Work | Add or update regression coverage for safe query fallback, role persistence, exact Guardian/Tutor CTA destinations, expected journey steps, role-aware sign-in return, absence of Admin registration, and no inline registration interaction. Review desktop plus 375px mobile layouts and the runtime logs. |
| Acceptance criteria | Guardian and Tutor canonical flows remain unchanged; Admin authentication and mandatory TOTP are untouched; no private fields are introduced on the public page; tests, TypeScript, and production build pass. |
| Verification | `pnpm test && pnpm exec tsc --noEmit && pnpm build`; desktop and 375px visual review; server/browser runtime-log review; checklist completion before checkpoint. |

## Delivery Order

| Order | Ticket | Outcome |
|---:|---|---|
| 1 | RP-01 | Safe route-state role preselection foundation |
| 2 | RP-02 | Truthful role-specific Register journey launcher |
| 3 | RP-03 | Unified Tutor sign-in handoff from existing registration |
| 4 | RP-04 | Coverage, responsive validation, and release gate |

## Approval Boundary

Implementation may begin only after approval. Approval authorizes the enriched journey-launcher approach; it does **not** authorize embedded registration forms, a new registration API, OTP, password-reset delivery, database changes, or any Admin-authentication change.
