# Admin Monitoring Sidebar Workspace — Approved Implementation Tickets

## Approved scope and non-negotiable boundaries

The Admin workspace will use the existing responsive `DashboardLayout` pattern used by the Tutor dashboard. It will provide **Monitor + Action** operations for authorized Admin accounts after the existing mandatory TOTP verification succeeds.

Tutor management will include the approved moderation lifecycle: Admins may approve a pending profile, request changes with a required reason, or suspend an eligible profile with a required reason. Each state-changing action must create an immutable moderation event. The Owner-only Admin security area remains separate from operational monitoring.

The Owner approved **full Guardian contact visibility for all authorized Admin accounts**. This is a high-sensitivity operational permission. Guardian contact information must therefore be returned only from a two-factor-protected Admin procedure, never be publicly cached, never be placed in URL parameters, and create an immutable access event each time a specific Guardian record is opened. Tutor phone, email, documents, passwords, TOTP material, recovery codes, and other secrets remain outside list results and public pages.

| Area | Approved rule |
|---|---|
| Admin access | Admin role plus a valid, current two-factor proof is required for every new Admin monitoring and moderation procedure. |
| Owner access | Owner retains exclusive access to Admin invitations, role revocation, security audit history, and 2FA reset; ordinary Admins do not receive those controls. |
| Tutor moderation | Allowed transitions are `pending → approved`, `pending → changes_requested`, `pending → suspended`, and `approved → suspended`. Change-request and suspension require a non-empty reason. |
| Guardian contact | Authorized Admins can view Guardian name, email, phone, and location in a guarded detail view. Every detail access is recorded. |
| Browser safety | Private contacts are not sent to unauthenticated screens, embedded in routes, or written into client-side storage. |

## Sidebar information architecture

| Group | Navigation item | Route | Primary outcome |
|---|---|---|---|
| Overview | Admin Dashboard | `/admin/dashboard` | Current operational totals, pending moderation, matching workload, consent workload, and recent activity. |
| Tutor management | Tutors | `/admin/tutors` | Searchable, paginated Tutor directory with profile and account status filters. |
| Tutor management | Profile Review | `/admin/tutor-review` | Pending and changes-requested review queue with status actions and moderation history. |
| Guardian management | Guardian Requests | `/admin/guardian-requests` | Searchable, paginated Guardian request activity with an explicit protected detail action. |
| Guardian management | Matching Workspace | `/admin/matching` | Existing advanced matching, assignment, lifecycle, and consent workflow. |
| Control | Admin Security | `/admin/security` | Existing Owner-only invitation, role, audit, and two-factor recovery management. |
| General | Homepage / Sign out | Existing paths | Safe exit and session termination. |

## Dependency-ordered tickets

### AM-01 — Add moderation and sensitive-contact access history

**Purpose.** Introduce append-only records that explain which Admin changed a Tutor profile state and which Admin opened a Guardian contact record.

**Likely surfaces.** `drizzle/schema.ts`, a generated migration under `drizzle/`, `server/db.ts`, focused schema/database tests.

**Dependencies.** None.

**Implementation notes.** Create `tutor_profile_moderation_events` with Tutor ID, Admin user ID, previous status, next status, optional action reason, and UTC timestamp. Create `guardian_contact_access_events` with Guardian user ID, Admin user ID, purpose/context limited to a controlled enum or request ID, and UTC timestamp. Do not alter or overload the security-only `admin_login_audit_logs` event enum.

**Acceptance criteria.**

- The migration is non-destructive and reversible only through a new migration, never by overwriting production schema.
- Every successful status action writes exactly one moderation event in the same transaction as the profile-status update.
- Every successful Guardian detail contact disclosure writes exactly one access event.
- Neither event table stores passwords, session material, TOTP values, recovery codes, invitation tokens, or unbounded browser metadata.

**Verification.** Migration review, database helper tests, and `pnpm test`.

### AM-02 — Establish protected Admin monitoring and moderation contracts

**Purpose.** Add small, two-factor-protected server contracts for Admin dashboard totals, Tutor lists/details, moderation, Guardian lists/details, and event histories.

**Likely surfaces.** `server/db.ts`, `server/routers.ts`, `server/admin-monitoring*.test.ts`, `shared/` validation contracts if extraction improves reuse.

**Dependencies.** AM-01.

**Implementation notes.** Reuse the existing Admin-role and valid two-factor verification boundary. Return paginated, filterable list records. Keep list contracts minimal: Tutor list rows expose non-sensitive profile operational fields; Guardian list rows expose request/activity summary but not raw contact data. A separate guarded Guardian detail procedure returns the approved contact fields and invokes the AM-01 access event transaction.

**Acceptance criteria.**

- Dashboard query returns deterministic counts for pending Tutor reviews, approved/suspended Tutors, new/reviewing/matched Guardian requests, and contact-consent backlog.
- Tutor directory supports keyword, profile status, verification, location, subject, tuition type, and page filters; it excludes Tutor phone, email, and profile documents from list responses.
- Tutor moderation enforces only the approved state transitions and requires a trimmed reason for `changes_requested` and `suspended`.
- Guardian request list supports keyword, request status, consent, tuition type, location, and page filters.
- Guardian detail contact access is unavailable to non-Admins, Admins without a valid two-factor proof, and arbitrary Guardian IDs that do not resolve to a stored Guardian profile.
- All procedure inputs have explicit validation, bounded page sizes, and server-side errors that do not disclose secrets.

**Verification.** Procedure authorization, input-validation, state-transition, pagination, and private-field omission tests.

### AM-03 — Add Tutor monitoring and profile-review screens

**Purpose.** Give Admins a usable queue for monitoring Tutor activity and performing approved profile moderation without exposing private data in broad lists.

**Likely surfaces.** `client/src/pages/AdminTutorDirectory.tsx`, `client/src/pages/AdminTutorReview.tsx`, `client/src/App.tsx`, focused UI tests.

**Dependencies.** AM-02.

**Implementation notes.** The directory includes filters, pagination, status/verification badges, key teaching profile indicators, and a route to the controlled review surface. The review page includes profile context necessary for a decision, visible moderation timeline, reason input for actions requiring it, explicit confirmation for suspend, loading/empty/error states, and cache invalidation after successful changes.

**Acceptance criteria.**

- Directory filters reset pagination safely and survive a pending query without rendering stale private data.
- Pending, approved, changes-requested, and suspended statuses have distinct accessible labels and visual treatments.
- Change request and suspension buttons are disabled until a valid reason is supplied; approval uses a separate explicit action.
- A successful action refreshes the queue, Tutor record, dashboard metrics, and moderation timeline.
- No Tutor phone, email, or private document reference is rendered in list cards or browser route parameters.

**Verification.** Component tests, keyboard/focus checks, desktop and mobile screenshots, and a manual action-state review.

### AM-04 — Add Guardian activity monitoring and guarded contact details

**Purpose.** Provide full authorized-Admin visibility into Guardian request activity and the Owner-approved contact information while preserving a clear access trail.

**Likely surfaces.** `client/src/pages/AdminGuardianRequests.tsx`, a guarded Guardian detail panel or route, `client/src/App.tsx`, focused UI tests.

**Dependencies.** AM-01 and AM-02.

**Implementation notes.** The main list remains request-first and displays request ID, requirement, date, location, budget, status, matched Tutor summary, and consent status. Admin contact fields appear only after an intentional **View Guardian contact** action in a guarded detail view. The UI clearly labels this as an Admin-only operational disclosure and does not include contact data in filter values, URLs, clipboard automation, or client-side persistence.

**Acceptance criteria.**

- Every authorized Admin can open a valid Guardian detail view after two-factor verification and see name, email, phone, and registered location.
- The data is not included in the list API response, initial page payload, route query, or local storage.
- Opening the detail view creates an AM-01 contact-access record; a failed request does not create a false success event.
- The existing matching workspace continues to use its privacy-safe assignment interface and does not accidentally render the new Guardian details in the Tutor inbox.
- Error and empty states state only that details are unavailable; they do not reveal whether a phone or email exists for an unauthorized request.

**Verification.** API contract privacy tests, contact-access event tests, browser interaction tests, and regression tests for Tutor inbox privacy.

### AM-05 — Compose the responsive Admin dashboard and shared sidebar

**Purpose.** Turn the individual operational screens into a coherent Admin console with a Tutor-dashboard-style sidebar.

**Likely surfaces.** `client/src/pages/AdminDashboard.tsx`, `client/src/admin-navigation.ts` or an equivalent shared navigation module, `client/src/pages/AdminMatchingWorkspace.tsx`, `client/src/pages/AdminSecurityWorkspace.tsx`, `client/src/App.tsx`.

**Dependencies.** AM-03 and AM-04.

**Implementation notes.** Use the existing `DashboardLayout` rather than recreating sidebar behavior. Share one Admin navigation definition across routes. Hide the Owner-only Security item from non-Owner Admin users; the server remains the source of truth for the restriction. Protect every Admin route through the existing two-factor route decision before loading operational queries.

**Acceptance criteria.**

- Sidebar is desktop-resizable/collapsible and opens/closes correctly on mobile using the existing accessible shell behavior.
- Active navigation remains accurate across all Admin routes.
- The overview presents metrics and recent moderation/contact-access activity without raw Guardian or Tutor contact values.
- Non-Owner Admins cannot discover or invoke Owner-only security management through navigation or direct URL access.
- Existing `/admin/matching`, `/admin/security`, `/admin/2fa-setup`, and `/admin/2fa-challenge` behavior remains intact.

**Verification.** Navigation tests, desktop/mobile screenshots, focus-order review, and a route-authorization regression suite.

### AM-06 — Complete release-level security, regression, and accessibility verification

**Purpose.** Verify that operational monitoring extends Admin capabilities without weakening the prior Admin security release or Tutor/Guardian privacy boundaries.

**Likely surfaces.** New and existing tests under `server/` and `client/src/pages/`, `todo.md`, release notes.

**Dependencies.** AM-01 through AM-05.

**Acceptance criteria.**

- All new monitoring and moderation procedures require Admin role plus an unexpired verified two-factor session.
- Owner-only boundaries, recovery-code protection, invitation behavior, and audit history remain covered by existing regressions.
- Guardian contact data is absent from public pages, Tutor APIs/inbox, list responses, browser routes, local storage, and error messages.
- Test suite, TypeScript check, production build, whitespace audit, runtime-log review, and desktop/mobile visual verification all pass.
- The project checklist is updated before the release checkpoint.

**Verification.** `pnpm test`, `pnpm exec tsc`, `pnpm build`, targeted privacy searches, and responsive screenshots.

## Approval to implement

The ticket sequence preserves the already-released Admin matching and security workflows while adding the approved operational console. It intentionally starts with immutable history and protected contracts before any UI so the requested increased Guardian contact access has a complete audit trail.

> **Implementation-ready request:** Reply with **`/implement`** or **`Implementation approved`** to begin AM-01.
