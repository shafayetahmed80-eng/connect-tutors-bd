# Guardian Request Lifecycle — Approved Implementation Tickets

## Approved product contract

| Area | Approved behavior |
|---|---|
| Submission acknowledgement | A concise, premium thank-you/disclaimer page shows the request ID, review and privacy notice, and the two approved dashboard actions. |
| Acknowledgement actions | **View My Requests** opens `/guardian/dashboard/posted-jobs`; **Post Another Request** opens `/guardian/dashboard/hire`. |
| Guardian list | Posted Jobs presents five status counts and places Pending requests first. |
| Request details | Desktop uses an in-list expandable private details panel. Mobile uses a dedicated private details route. |
| Guardian changes | The Guardian may directly edit only a Pending request. Each successful update has private audit history. |
| Post-Pending operations | All workflow actions and substantive changes are controlled through the Admin panel. |
| Guardian-visible lifecycle | `Pending → Live → Appointed → Confirmed`, with `Cancelled` as a terminal outcome from any active stage. |
| Appointed | An Admin assigns a specific Tutor. |
| Confirmed | An Admin verifies that both the Guardian and selected Tutor agree to the appointment. |
| Cancelled | An Admin closes the request with a recorded reason. |

## GTL-01 — Lifecycle projection and durable audit contract

**Purpose.** Add a safe Guardian-facing lifecycle projection without weakening the existing operational request, publication, matching, or contact-consent states.

**Likely surfaces.** `drizzle/schema.ts`, a new additive SQL migration, `server/db.ts`, `server/routers.ts`, Admin/Guardian lifecycle tests.

**Implementation contract.** Persist only the missing durable facts: appointment confirmation time and an Admin-recorded cancellation reason. Keep the present internal `status`, `publicationState`, and contact-consent fields intact. Derive the Guardian-facing stage in one shared server-side helper with this precedence: `Cancelled` when closed; `Confirmed` when the durable appointment confirmation exists; `Appointed` when a Tutor is assigned; `Live` when the request is published; otherwise `Pending`.

**Acceptance criteria.** Every Guardian-owned request returns one of the exact five public-to-Guardian stage labels and a timeline state. A closed request cannot appear as Live, Appointed, or Confirmed. The projection returns no contact, address, notes, or student name beyond the existing Guardian-owned read scope.

**Verification.** Focused lifecycle mapping and terminal-state tests; schema/type checks.

## GTL-02 — Pending-only Guardian update with private history

**Purpose.** Let a Guardian correct an unprocessed request without permitting changes after the Admin workflow begins.

**Likely surfaces.** `drizzle/schema.ts`, additive migration, `server/db.ts`, `server/routers.ts`, `client/src/pages/GuardianRequestTracking.tsx`, Guardian request/client/router tests.

**Implementation contract.** Add a protected mutation that requires the request owner and a Pending lifecycle stage. Reuse the existing request validation rules for tuition type, location, capacity/duration, budget, and private fields. Before saving, persist a private audit entry that contains the actor, timestamp, and a minimal before/after snapshot or changed fields. The mutation returns a fresh Guardian-owned request view.

**Acceptance criteria.** A Guardian may update only their own Pending request. A Guardian cannot update Live, Appointed, Confirmed, or Cancelled requests. A Tutor, a different Guardian, and an unauthenticated caller are denied. The audit history is visible only to the owning Guardian and authorized Admins, and never appears in the Job Board, generic Tutor read models, directions, or Telegram payloads.

**Verification.** Router authorization and validation tests, audit persistence/read-scope tests, and a private-field leakage regression.

## GTL-03 — Admin-controlled post-Pending stages

**Purpose.** Give the Admin workspace clear, auditable controls for the approved lifecycle after Pending.

**Likely surfaces.** `server/db.ts`, `server/routers.ts`, `client/src/pages/AdminMatchingWorkspace.tsx`, Admin request tests.

**Implementation contract.** Preserve existing verify, Guardian-call, approve, publish, unpublish, and assignment controls. Add an Admin-only confirmation action that is available only after a Tutor is assigned and records the durable confirmation fact. Replace generic closure with a cancellation action that requires a reason. Use the existing publication event trail or the new lifecycle audit trail to make each action reviewable.

**Acceptance criteria.** Only an authorized Admin can confirm an appointment or cancel a request. Confirmation fails without an assigned Tutor. Cancellation records a non-empty reason and prevents further operational transitions. The Guardian-facing stage updates immediately after each action.

**Verification.** Admin-only, invalid-transition, confirmation, cancellation-reason, and Guardian-projection tests.

## GTL-04 — Premium post-submission acknowledgement

**Purpose.** Replace the current basic success state with the approved concise confirmation experience.

**Likely surfaces.** `client/src/pages/GuardianRequestJourney.tsx` and component tests.

**Implementation contract.** Display a polished, accessible acknowledgement with request ID, review expectation, concise privacy reassurance, and two primary actions. Do not repeat Student Name, Student Gender, Address Details, or Additional Notes on this page.

**Acceptance criteria.** The request ID is shown after a successful submission. **View My Requests** navigates to the posted-jobs dashboard tab. **Post Another Request** navigates to the hire-a-tutor tab. Loading/error behavior from the existing mutation remains intact, and keyboard focus is visible on both actions.

**Verification.** Rendered success-state and navigation assertions, desktop/mobile visual review.

## GTL-05 — Pending-first Guardian Posted Jobs and responsive private Details

**Purpose.** Reorganize Guardian request history into the approved status overview and device-appropriate private details experience.

**Likely surfaces.** `client/src/pages/GuardianRequestTracking.tsx`, a new Guardian private-detail route/component if required, `client/src/pages/GuardianDashboard.tsx`, component tests.

**Implementation contract.** Render five status counts and sort Pending requests before all later stages while retaining deterministic newest-first ordering within a stage. On desktop, Details expands a single private panel beneath the selected summary card. On mobile, it uses a dedicated Guardian-protected detail page. Both views use the same server-supplied private model and display the numbered timeline, status, relevant private request summary, and a Pending-only edit control. Existing matched contact-consent handling must remain available where applicable.

**Acceptance criteria.** Desktop and mobile expose identical authorized data but differ only in layout. Only the request owner can reach the mobile detail route. Private data never appears in public cards, Job Board APIs, generic Tutor views, maps/directions, or Telegram. Details states cover loading, empty, error, and inaccessible request cases.

**Verification.** Sorting/count/render tests, access tests, responsive screenshots at desktop and 375px width, privacy regression tests.

## GTL-06 — Release review and safeguards

**Purpose.** Validate the integrated flow before publishing.

**Likely surfaces.** Relevant Vitest suites, type/build commands, release review notes.

**Acceptance criteria.** All focused tests and the full suite pass; TypeScript reports no errors; the production build succeeds; formatting/whitespace checks are clean; desktop and mobile flows are visually reviewed. A code review confirms lifecycle authorization, validation, accessibility, responsive behavior, and every existing privacy boundary.

**Verification.** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check`, responsive screenshots, and final code review.
