# Protected Workspace UI/UX — Approved Implementation Tickets

## Delivery boundary

This package implements the approved protected-workspace direction: **all Tutor, Admin, and Owner workspaces receive one coherent visual system; Tutor navigation separates active work from upcoming tools; Admin and Owner screens foreground real action queues and operational status; mobile navigation retains the existing sidebar-sheet model with clearer role and active-context cues; and Admin Login plus mandatory two-factor screens use the same secure visual language.**

No database migration, server procedure, role permission, matching rule, contact-disclosure workflow, profile moderation transition, sign-out contract, two-factor requirement, recovery-code handling, audit-log content, or public/private data boundary may change in this phase. Protected pages must not introduce decorative human imagery, fabricated metrics, reviews, testimonials, future availability, payment, certificate, reward, community, or referral claims.

| Ticket | Outcome | Depends on |
|---|---|---|
| PWS-01 | Clear Tutor workspace navigation that distinguishes active work from upcoming tools | None |
| PWS-02 | Tutor dashboard overview and honest planned-tool states | PWS-01 |
| PWS-03 | Action-queue-first Admin and Owner workspace presentation | PWS-01 |
| PWS-04 | Shared mobile protected navigation and secure-access visual consistency | PWS-01 |
| PWS-05 | Regression, accessibility, privacy, and release verification | PWS-01–PWS-04 |

## PWS-01 — Reorganize the Tutor workspace navigation

**Purpose.** Make the Tutor sidebar immediately understandable by grouping available account work separately from tools whose supporting workflow is not yet enabled. Keep real Profile, Status, Requests, Preferences, and Settings destinations reachable without inventing functionality.

**Likely surfaces.** `client/src/pages/TutorDashboard.tsx`, `client/src/components/DashboardLayout.tsx`, Tutor navigation tests, and shared protected-workspace styles.

**Dependencies.** None.

**Acceptance criteria.** The Tutor sidebar provides a clear **Active workspace** group for routes backed by current data or editing capability, and a separately labelled **Coming later** group for Job Board, Confirmation Letter, Payment, Certificate, Refer & Earn, Exclusively Yours, How It Works, and Community. Planned items remain navigable only where the existing route already exists; their destination must make the non-live state explicit. Dashboard, Profile, Preferences, Requests, Settings, sign-out, unsaved-profile navigation protection, and all Tutor authorization behavior remain unchanged.

**Verification.** Add a focused deterministic navigation-group regression; run relevant Tutor Dashboard tests and `pnpm vitest run client/src/pages/TutorDashboard*.test.ts`.

## PWS-02 — Clarify Tutor overview and planned-tool states

**Purpose.** Present the Tutor dashboard as a calm, actionable account workspace rather than a catalogue of future modules. Give each profile state one truthful next action while retaining existing profile and assigned-request data contracts.

**Likely surfaces.** `client/src/pages/TutorDashboard.tsx`, `client/src/styles/brand-foundation.css`, existing Tutor Dashboard tests.

**Dependencies.** PWS-01.

**Acceptance criteria.** The overview makes current status, verification, profile completion, and assigned-request availability scannable. The primary action directs to an existing safe route only. Planned sections display an accessible badge and a concise, factual explanation that no supporting workflow is enabled; they do not imply data, downloads, rewards, payments, certificates, jobs, or messages that do not exist. Tutor phone, email, and Guardian private data remain absent unless existing protected procedures already authorize them.

**Verification.** Add focused status/action and planned-state rendering regressions; inspect loading, empty, no-profile, and assigned-request states at desktop and 375px.

## PWS-03 — Make Admin and Owner operations action-queue-first

**Purpose.** Improve operational scanning on Admin Monitoring, Tutor Management, Guardian Activity, Matching, and Owner Activity Report without changing any moderation, matching, audit, or reporting contract.

**Likely surfaces.** `client/src/pages/AdminMonitoringOverview.tsx`, `client/src/pages/AdminTutorManagement.tsx`, `client/src/pages/AdminGuardianActivity.tsx`, `client/src/pages/AdminMatchingWorkspace.tsx`, `client/src/pages/AdminActivityReport.tsx`, `client/src/components/AdminWorkspaceLayout.tsx`, protected-workspace styles, and existing Admin tests.

**Dependencies.** PWS-01.

**Acceptance criteria.** Admin screens visibly distinguish actionable counts from informational records; the first prominent action always routes to an existing authorized workspace. Queue, consent, moderation, matching, and security labels remain factual. Owner-only reporting remains Owner-gated and explicitly excludes Guardian contact details, student notes, credentials, recovery codes, TOTP material, IP addresses, and raw audit metadata. No Admin sees more data than before; no non-Owner sees Owner report data.

**Verification.** Add focused presentation/helper regressions plus existing Admin authorization and privacy suites. Confirm unauthorized and unverified-two-factor states remain safe.

## PWS-04 — Align protected mobile navigation and secure access surfaces

**Purpose.** Strengthen the existing mobile sidebar-sheet pattern and make Admin Login, two-factor setup, two-factor challenge, invitation acceptance, access denial, loading, and recovery states visually consistent with protected operational screens.

**Likely surfaces.** `client/src/components/DashboardLayout.tsx`, `client/src/components/AdminWorkspaceLayout.tsx`, `client/src/pages/AdminLogin.tsx`, `client/src/pages/AdminTwoFactorSetup.tsx`, `client/src/pages/AdminTwoFactorChallenge.tsx`, `client/src/pages/AdminInvitationAccept.tsx`, shared protected styles, and existing tests.

**Dependencies.** PWS-01.

**Acceptance criteria.** On mobile, the sidebar header exposes the signed-in role and active workspace context, all interactive controls retain visible focus, and navigation closes after destination selection. Secure-access screens explain only the next safe action. They must not disclose whether a particular account, invitation, authenticator, recovery code, or Admin record exists beyond existing behavior. Mandatory TOTP and Owner reset controls remain server-enforced.

**Verification.** Add focused mobile-navigation and secure-access presentation regressions; keyboard review; 375px screenshots of a permitted protected route plus denied and sign-in states where session constraints allow.

## PWS-05 — Release quality gates

**Purpose.** Verify that protected-workspace polish is cohesive and does not regress safety-critical functionality.

**Likely surfaces.** Related tests, `todo.md`, runtime logs, and final visual captures. No migration is expected.

**Dependencies.** PWS-01–PWS-04.

**Acceptance criteria.** Every new visual decision has a focused deterministic regression where appropriate. Existing Tutor profile, assigned-request privacy, Admin invitation, role revocation, mandatory TOTP, recovery-code, audit-log, moderation, matching, Guardian-contact disclosure, and Owner reporting tests continue to pass. Desktop and 375px views show no horizontal overflow and retain keyboard-focus visibility. No new external integration or secret is required.

**Verification.** `pnpm test && pnpm exec tsc && pnpm build`; whitespace and diff review; recent runtime-log inspection; desktop and mobile visual review; code review.
