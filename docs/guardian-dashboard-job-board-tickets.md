# Guardian Dashboard and Shared Job Board Implementation Tickets

## Ticket package status

This package decomposes the approved planning scope into independently reviewable tickets. It is **not implementation approval by itself**. Database, authorization, privacy, and public-visibility decisions must be approved at the stated gates before coding begins.

The package preserves the existing Guardian/Tutor public authentication boundary, Admin-only operational controls, mandatory Admin TOTP, Bangladesh canonical location hierarchy, and privacy-safe Guardian contact handling. The public Job Board is a separate tuition-opportunity surface; it must not reuse Tutor Directory semantics.

## Dependency overview

| Order | Ticket | Outcome | Depends on |
|---:|---|---|---|
| 1 | GD-01 | Confirm Guardian identity, student, route, and navigation contracts | Product decisions |
| 2 | JB-01 | Lock request/job lifecycle, publication mapping, Job ID, expiry, and filter contracts | GD-01 |
| 3 | JB-02 | Add tuition-job projection, audit events, indexes, and non-destructive migration | JB-01 |
| 4 | GD-02 | Add protected Guardian shell and truthful dashboard overview | GD-01 |
| 5 | GR-01 | Add authenticated three-step Hire a Tutor draft flow | JB-01, existing request journey |
| 6 | GR-02 | Add preview, edit recovery, idempotent submission, and receipt state | GR-01, JB-02 |
| 7 | AD-01 | Add Admin verification, contact confirmation, edit/publish controls, and audit trail | JB-02, existing Admin authorization/2FA |
| 8 | JB-03 | Add public/Tutor Job Board read model, filters, count, and pagination | JB-02, AD-01 |
| 9 | GD-03 | Add Guardian Posted Jobs and private status/history views | JB-02, GR-02 |
| 10 | GD-04 | Add Guardian Profile and Settings updates with sensitive-action safeguards | GD-02, existing auth/profile contracts |
| 11 | JB-04 | Add safe direction behavior, detail route, and share/deep-link rules | JB-03, Maps policy |
| 12 | GD-05 | Add Attendance, Confirmation Letter, Exclusively Yours, and Community only after contracts | Product decisions, relevant data models |
| 13 | QA-01 | Run cross-role, privacy, mobile, migration, and production release gates | All approved implementation tickets |

## GD-01 — Confirm Guardian identity, student, route, and navigation contracts

**Purpose.** Resolve the identity and product decisions needed before creating a protected Guardian workspace.

**Likely surfaces.** `client/src/App.tsx`, protected route guards, `DashboardLayout`, Guardian profile/account helpers, and a new product decision record.

**Required decisions.** Choose whether the header ID is the Guardian account ID, a new Guardian number, or a Student ID. Decide whether one Guardian can manage multiple students. Confirm the online-only City/Location rule. Decide which sidebar items are active in the first release and which show a truthful upcoming state.

**Acceptance criteria.** Only authenticated Guardians can enter Guardian routes. A Tutor, Admin, Owner, or unauthenticated visitor cannot read Guardian-private data. The identity header uses authenticated/profile data and never fabricated values. Every visible sidebar item has a working route or an explicit upcoming state; no dead-end navigation exists. A Home escape route and mobile sidebar close behavior are present.

**Verification.** Add route/role DOM regressions and run `pnpm vitest run client/src/pages`. Run TypeScript validation and a 375px keyboard-navigation review.

**Risk gate.** Do not invent Student IDs, Guardian IDs, or multi-student behavior in code before product approval.

## JB-01 — Lock request/job lifecycle and contracts

**Purpose.** Establish a single vocabulary for private requests, Admin review, publication, matching, closure, expiry, and public filtering.

**Likely surfaces.** `drizzle/schema.ts`, shared types/constants, planning documentation, and server validation schemas.

**Recommended contract.** Keep Guardian requests private and introduce explicit `draft`, `submitted`, `reviewing`, `changes_requested`, `approved`, `published`, `matched`, `closed`, and `cancelled` semantics. If changing the existing status enum is unsafe, keep current request status and add `reviewState` plus a separate publication state on the job projection. Never overload `matched` to mean published.

**Acceptance criteria.** The lifecycle transition table is documented. Invalid transitions are rejected. Publication and matching are independent. Expiry behavior is defined. Manual Job ID ownership, format, uniqueness, mutability, and audit behavior are defined. The filter contract includes canonical city/location IDs and server pagination metadata.

**Verification.** Add pure transition and validation tests before schema work; run `pnpm vitest run` for the new contract tests. Obtain approval for unresolved decisions before JB-02.

**Risk gate.** This ticket blocks schema migration and public UI. No database changes are made here.

## JB-02 — Add tuition-job projection and audit foundation

**Purpose.** Create a dedicated, privacy-safe published tuition-job entity instead of exposing raw Guardian request rows.

**Likely surfaces.** `drizzle/schema.ts`, generated migration, `server/db.ts`, `server/routers.ts`, audit helpers, and server tests.

**Data requirements.** Store source request ID, internal ID, public Job ID, publication state, normalized title inputs, tuition type, country/city/location references, category, class/course, subjects, student count, student gender, Tutor gender preference, days/week, budget, hire date, safe direction target, posted/published/expiry/closed timestamps, and audit metadata. Keep Guardian phone, email, exact address, student identity, private notes, and consent metadata out of the public read model.

**Acceptance criteria.** A source request has at most one active published projection. Auto Job IDs are unique and immutable after publication. Manual IDs are Admin-only, format-validated, collision-safe, and audited. Publication mutations and contact disclosure create append-only audit events containing actor, action, timestamp, target, and structured before/after summaries without secrets.

**Verification.** Generate the migration with the project’s Drizzle workflow, inspect SQL, apply it only through the approved database migration path, then verify indexes and constraints with safe read-only SQL. Add server tests for projection uniqueness, forbidden-field exclusion, transition safety, and audit creation. Run `pnpm test` and production build.

**Risk gate.** This is a non-destructive schema change. Do not drop or rename existing request columns without a separately approved migration.

## GD-02 — Build protected Guardian shell and truthful dashboard overview

**Purpose.** Provide the post-login Guardian workspace described in the brief while reusing the existing protected dashboard layout.

**Likely surfaces.** `DashboardLayout`, a new Guardian dashboard page/layout configuration, `App.tsx`, Guardian request tracking helpers, and dashboard tests.

**Acceptance criteria.** The shell includes logo, safe Guardian avatar fallback, name, email, approved ID field if available, and profile creation date. Navigation includes Dashboard, Hire a Tutor, Profile, Attendance, Posted Jobs, Confirmation Letter, Settings, Exclusively Yours, How it works, and Join Guardian Community, with unavailable features explicitly marked upcoming. The overview shows server-backed draft, submitted/reviewing, published/live, matched, and closed counts with loading, empty, and error states. No fake notices, fabricated activity, or invented community content appears.

**Verification.** Add role/access, loading/error/empty, mobile sidebar, and navigation regressions. Capture desktop and 375px screenshots. Run TypeScript, full Vitest, and build.

## GR-01 — Add authenticated three-step Hire a Tutor draft flow

**Purpose.** Convert the existing Guardian request journey into an authenticated, reusable three-step flow without losing current location validation or privacy safeguards.

**Likely surfaces.** `GuardianRequestJourney.tsx`, extracted validation/location helpers, `App.tsx`, request server procedures, and DOM/server tests.

**Step contract.** Step 1 contains tuition type, category, class/course, subjects, city, location, and student gender. Step 2 contains student count, Tutor gender preference, days/week, budget, hire date, and address details. Step 3 contains institute, tutoring time, referral source, and additional requirements. The intro is skippable and revisitable through How it works.

**Acceptance criteria.** Previous/Next preserves all entered state. Required fields block progression. City/location pairs are canonical and mismatched pairs are rejected. Online-only location behavior follows the approved rule. Text is bounded and sanitized. Draft data is private to the owning Guardian and never exposed to public/Tutor queries.

**Verification.** Add failing-first DOM tests for each step, keyboard reachability, mobile one-column layout, location dependency, and state preservation. Add server validation tests. Run `pnpm vitest run`, TypeScript, and 375px visual review.

## GR-02 — Add preview, edit recovery, idempotent submission, and receipt

**Purpose.** Ensure Guardians can review and safely submit a request after completing the three steps.

**Likely surfaces.** Guardian journey components, request mutation, server idempotency handling, and receipt/history components.

**Acceptance criteria.** Preview shows every submitted field grouped by section. Each section has an edit action returning to the correct step without data loss. Submit requires an explicit confirmation and repeated clicks cannot create duplicate requests. The receipt says the request was received and is pending Admin verification; it does not promise immediate publication. Submission state is recoverable after refresh according to the approved draft policy.

**Verification.** Test edit-to-step recovery, duplicate-submit protection, receipt wording, request ownership, and error recovery. Add a server test for idempotency and a DOM test for preview actions.

## AD-01 — Add Admin verification, edit, publish-without-edit, and audit controls

**Purpose.** Extend the existing Admin matching workspace into a controlled publication queue.

**Likely surfaces.** `AdminMatchingWorkspace.tsx`, `AdminGuardianActivity.tsx`, Admin routers/helpers, audit views, and server authorization tests.

**Acceptance criteria.** Only authorized Admins can view necessary request details or mutate publication state; Owner-only security controls remain separate. Contact lookup remains deliberate and audited. Admin can verify by the approved support process, edit with a before/after summary, or publish without edit through distinct actions. Admin can unpublish, close, or mark changes requested. Edited publication behavior follows the approved Guardian-confirmation decision. All invalid transitions fail safely.

**Verification.** Add authorization matrix tests for Guardian/Tutor/Admin/Owner, audit tests for contact disclosure and publication, and DOM tests for action labels and confirmation dialogs. Run full Vitest, TypeScript, build, and runtime log review.

**Risk gate.** This ticket handles sensitive contact and public-visibility mutations. Browser confirmation is required before any real submission or publication operation during manual QA.

## JB-03 — Build public/Tutor Job Board read model and filters

**Purpose.** Add a separate tuition-opportunity Job Board for public visitors and Tutors.

**Likely surfaces.** New Job Board page/components, `App.tsx`, tRPC router/procedure, `server/db.ts`, shared filter types, and tests.

**Acceptance criteria.** The route clearly identifies tuition opportunities, not Tutor profiles. Only approved, published, non-closed, non-expired jobs appear. Cards show server-generated dynamic title, Job ID, posted date, tuition type, approved location label, subjects, student gender, Tutor gender preference, days/week, budget, and safe Details/Share actions. No Guardian name, phone, email, student name, exact address, private notes, or consent metadata is returned. Filters include date range, country, city, location, tuition type, days/week, category, class/course, student gender, Tutor gender, and Job ID. Result count and pagination come from the same server query.

**Verification.** Add public privacy-contract tests that assert forbidden fields are absent. Add filter, count, pagination, deduplication, and dynamic-title tests. Add desktop and 375px mobile filter-sheet tests and screenshots. Run full test, TypeScript, and production build.

## GD-03 — Add Guardian Posted Jobs and status/history views

**Purpose.** Let a Guardian see their own submitted and published request/job history without exposing internal notes or other users.

**Acceptance criteria.** The page is Guardian-owned and returns only the authenticated Guardian’s records. It shows safe status, Job ID, submitted/published/closed dates, title, and next action. Draft, changes requested, published, matched, and closed states are truthful. Contact and Admin notes remain private.

**Verification.** Add ownership and forbidden-field server tests plus DOM tests for loading, empty, error, and lifecycle states.

## GD-04 — Add Guardian Profile and Settings updates

**Purpose.** Implement the concrete Name, Number, password, and verification-request settings requested in the brief.

**Acceptance criteria.** Authenticated Guardians can update only policy-approved fields. Bangladesh mobile validation and role-safe uniqueness remain enforced. Sensitive changes require reauthentication or an equivalent safeguard. Password recovery continues to respect the current WhatsApp-assisted contract until a self-service reset is separately approved. Profile verification requests create an auditable status, not an invented verification badge.

**Verification.** Add server authorization, validation, non-enumerating error, and DOM interaction tests. Run mobile review and full release checks.

## JB-04 — Add safe direction, detail, and share behavior

**Purpose.** Provide the requested Direction action without exposing a Guardian’s exact home location.

**Acceptance criteria.** Direction uses an approved city/location or area centroid by default. Exact address or coordinates never appear in public cards, URLs, logs, or share payloads. If authenticated exact directions are approved later, access is role-gated and consented. Detail and share routes return only the safe Job Board read model.

**Verification.** Add URL-construction tests, role/privacy tests, and maps-fallback tests. Review network logs for forbidden address/coordinate leakage.

## GD-05 — Decision-gated secondary Guardian tabs

**Purpose.** Add Attendance, Confirmation Letter, Exclusively Yours, and Guardian Community only when their data ownership and behavior are approved.

**Acceptance criteria.** Until contracts exist, each tab uses an honest upcoming/empty state with no fabricated records, testimonials, counts, or community activity. Once approved, each feature gets its own data model, authorization, moderation, and notification ticket.

**Verification.** Add route/access tests and content review. Do not mark this ticket complete until product decisions and source data are available.

## QA-01 — Cross-role and release gate

**Purpose.** Verify the complete slice before production release.

**Acceptance criteria.** Tests cover Guardian, Tutor, Admin, Owner, and public access; publication transitions; forbidden-field exclusion; audit events; idempotent submission; location dependencies; mobile keyboard/touch interaction; loading/error/empty states; migration safety; and dynamic title/filter/count consistency. Production build succeeds and runtime logs contain no new release-blocking errors.

**Verification commands.** Run `pnpm test`, the project TypeScript check, `pnpm build`, `git diff --check`, and desktop/375px screenshots for Guardian dashboard, request flow, Admin publication queue, and Job Board. Review browser, network, and runtime logs before checkpoint.

## Approval boundary

Approve **GD-01 through JB-03** as the first implementation slice, with Profile/Settings as a bounded parallel slice if the identity and sensitive-action decisions are confirmed. Do not begin schema migration JB-02 until JB-01 decisions are approved. Keep GD-05 decision-gated. Do not expose exact Guardian locations, contact details, student identity, Admin notes, or unapproved jobs in any public or Tutor surface.

## Required product decisions before implementation approval

1. Choose the Guardian/Student ID model and public format.
2. Confirm whether one Guardian can manage multiple students.
3. Decide whether Online tuition requires City/Location.
4. Decide whether an Admin edit requires Guardian reconfirmation before publication.
5. Define Job expiry rules.
6. Decide whether Tutors can only view jobs or may express interest/apply.
7. Define manual Job ID authority, format, and post-publication mutability.
8. Choose direction precision: area centroid, canonical pin, or consented exact address.
9. Define Attendance and Confirmation Letter ownership and lifecycle.
10. Define Exclusively Yours and Guardian Community content/moderation behavior.
11. Confirm factual support and Admin-notification channels for the publishing workflow.

## Source planning document

This ticket package is derived from `docs/guardian-dashboard-job-board-plan.md` and its user-supplied visual-reference list. The ticket package intentionally does not introduce unapproved requirements, fabricated data, or production schema changes.
