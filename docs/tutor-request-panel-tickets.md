# Tutor Request Panel — Approved Implementation Tickets

**Status:** Ready for implementation approval  
**Scope owner:** Connect Tutors BD  
**Prepared:** 20 August 2026  

## Approved product decisions

The following decisions are confirmed and must be treated as the implementation boundary.

| Decision | Approved rule |
|---|---|
| Canonical entry route | `/request-tutor` is the only Guardian Tutor Request journey. The legacy `/submit-requirement` route redirects to it. |
| Student name | An optional first name is collected. It remains private to the Guardian and Admin; it is never included in Tutor-assigned request data. |
| Tuition location | Home and Both requests require a structured Bangladesh City → combined Thana/Upazila/Area/Sub-area location. Online requests do not require an exact tuition location. |
| Budget | A request must choose either a monthly budget range or **Discuss with coordinator**. |
| Post-match contact | A matched Guardian first sees the match/status. Contact coordination happens only after the Guardian gives an explicit consent; the Admin coordinates communication. Tutor and Guardian phone/email must never be exposed by public routes or normal matching payloads. |

> **Privacy boundary:** The user-entered student first name, Guardian phone/email, Guardian account location, any exact tuition location, and consent state are private data. They must not appear in public Tutor listing/profile routes or be sent to a Tutor before the approved contact-coordination step.

## Delivery order

| Sequence | Ticket | Outcome | Depends on |
|---:|---|---|
| 1 | TR-01 | A tested request contract and safe schema migration plan | — |
| 2 | TR-02 | Private structured request persistence | TR-01 |
| 3 | TR-03 | Guardian-only API, status, and contact-consent actions | TR-02 |
| 4 | TR-04 | A single canonical request route and legacy redirect | TR-03 |
| 5 | TR-05 | Guardian request tracking and matched-contact consent view | TR-03 |
| 6 | TR-06 | Admin matching updates that respect Guardian consent | TR-03, TR-05 |
| 7 | TR-07 | Accessibility, regression, visual, review, and release validation | TR-01–TR-06 |

---

## TR-01 — Define the expanded request contract and migration plan

**Purpose.** Replace the current implicit/default request values with an explicit, validated data contract while preserving the ability to read pre-existing request rows.

**Likely surfaces.** `drizzle/schema.ts`, `server/routers.ts`, request-validation tests, a new migration under `drizzle/migrations/`, and the migration verification SQL record.

**Work.** The new create-request contract must include the existing tuition mode, curriculum/category, class/level, one-or-more subjects, days per week, preferred tutor gender, and optional notes. It must additionally accept an optional student first name, a budget choice, and—only for Home or Both—a selected City ID plus one selected combined location ID. It must reject a free-text location as the source of truth for new requests.

Budget must be represented as either `range` with non-negative minimum and maximum BDT values, or `discuss` with no range values. A range with the maximum lower than the minimum must be rejected. The prior single `monthlyBudget` field may remain temporarily readable for legacy records but must not drive the new canonical form.

The migration must add only nullable/backwards-compatible fields before the canonical flow starts writing them. Existing request rows must remain visible to Admin/Tutor reads. The database migration itself is a controlled, potentially irreversible operation and must be generated, reviewed, then applied once through the project database migration workflow.

**Acceptance criteria.**

| ID | Criterion |
|---|---|
| TR-01-A | The input contract rejects an empty category, level, subject list, or invalid tuition mode as it does today. |
| TR-01-B | Home and Both requests require both selected structured location IDs; Online requests do not. |
| TR-01-C | Student first name is optional, trimmed, length-bounded, and never required to submit a request. |
| TR-01-D | Every new request selects either a valid budget range or `discuss`; invalid numeric ranges are rejected server-side. |
| TR-01-E | The generated migration is reviewed before application, does not delete existing request data, and supports existing rows. |

**Verification.** `pnpm vitest run server/tutor-request.validation.test.ts` and the approved migration verification SQL after the migration is applied.

---

## TR-02 — Persist private structured request details safely

**Purpose.** Store new request data in a form that supports Admin matching without exposing it through public data paths.

**Likely surfaces.** `drizzle/schema.ts`, `server/db.ts`, `server/routers.ts`, database helper tests, and migration SQL from TR-01.

**Work.** Extend `tutor_requests` with private request metadata for student first name, structured tuition City/location identifiers, budget selection/range, optional notes, and contact-consent status. Persist a presentation-safe location label only as a derived convenience value; matching logic must rely on persisted selected IDs when present. New data must preserve the selected City → combined location relationship using the existing Bangladesh location catalog.

Introduce a contact-consent lifecycle suitable for manual matching: `not_required` while a request is not matched, `pending` when Admin assigns an approved Tutor, and `approved` or `declined` only after the owning Guardian responds. No field stores or copies Tutor/Guardian contact details into a request record.

**Acceptance criteria.**

| ID | Criterion |
|---|---|
| TR-02-A | A canonical request persists the approved fields together with its Guardian owner and initial `new` status. |
| TR-02-B | The request location is City-scoped and matches the existing combined location selector rules. |
| TR-02-C | New storage does not copy Guardian phone/email or Tutor phone/email into `tutor_requests`. |
| TR-02-D | Old request rows are still readable; absent new values are rendered safely rather than causing a crash. |
| TR-02-E | Consent begins as `not_required` and cannot be marked approved before a request is matched. |

**Verification.** Focused database helper tests plus `pnpm vitest run server/tutor-request.procedure.test.ts`.

---

## TR-03 — Build Guardian-owned request APIs and protected consent actions

**Purpose.** Give a Guardian a secure way to create, read, and respond to their own requests while retaining the existing Administrator-mediated matching model.

**Likely surfaces.** `server/routers.ts`, `server/db.ts`, Guardian request API tests, existing Admin/Tutor request procedures.

**Work.** Update `tutorRequests.create` to use the new contract and validated location inputs. Add a Guardian-only request-list/read procedure that returns only the current Guardian’s requests, their safe matching/status fields, and the next permitted action. Add a Guardian-only consent mutation that permits an explicit `approved` or `declined` action only for an owned request with `matched` status and pending consent.

Responses must be purpose-specific. A Guardian may see their own request details and matching status. A Tutor’s assigned-request response must continue to omit the Guardian’s phone/email, student first name, and contact-consent decision. Public Tutor procedures must remain unrelated to request data.

**Acceptance criteria.**

| ID | Criterion |
|---|---|
| TR-03-A | Unauthenticated callers and Tutor callers cannot create, list, read, or consent to Guardian requests. |
| TR-03-B | A Guardian can list/read only records owned by their own account. |
| TR-03-C | A Guardian cannot submit consent for a `new`, `reviewing`, `closed`, or another Guardian’s request. |
| TR-03-D | A request-create response and Telegram notification exclude Guardian phone/email and student first name. |
| TR-03-E | Tutor assigned-request payloads omit Guardian contact details, student first name, and Guardian consent state. |

**Verification.** `pnpm vitest run server/tutor-request.procedure.test.ts server/tutor-request.validation.test.ts` plus new ownership/consent/privacy regression tests.

---

## TR-04 — Consolidate the public entry flow at `/request-tutor`

**Purpose.** Remove conflicting request entry points and make the Guardian flow collect all approved request requirements in a coherent sequence.

**Likely surfaces.** `client/src/App.tsx`, `client/src/pages/GuardianRequestJourney.tsx`, a route redirect component/test, shared location-selector utilities, and focused client tests.

**Work.** Keep the existing phone-first private handoff and Guardian email/password registration. After registration, replace the current minimal request stage with a clear three-section request form: **Learning needs**, **Tuition preferences**, and **Review & submit**. The form must collect category, class/level, subjects, tuition type, existing days-per-week preference, tutor-gender preference, optional student first name, conditional structured tuition location, budget choice/range, and optional notes.

For Home/Both, reuse the existing City plus combined searchable Thana/Upazila/Area/Sub-area selector behavior, including City-scoped options, outside-click dismissal, and duplicate-label suppression. For Online, hide or clearly mark the exact tuition location as not required. The review step must show only the data the Guardian has entered before final submission.

Change `/submit-requirement` into a client-side redirect to `/request-tutor`; it must not remain a second data-entry experience. Keep a clear homepage return path provided by the shared route bar.

**Acceptance criteria.**

| ID | Criterion |
|---|---|
| TR-04-A | `/submit-requirement` consistently redirects to `/request-tutor`. |
| TR-04-B | The canonical form has no hidden defaults for category, days, preferred tutor gender, or budget choice. |
| TR-04-C | Form validation matches the server contract and displays actionable Bangla validation feedback. |
| TR-04-D | Home/Both cannot submit without a City-scoped combined tuition location; Online can submit without an exact location. |
| TR-04-E | Keyboard focus, visible labels, mobile layout, loading state, server-error recovery, and resubmission prevention work at every step. |

**Verification.** Focused Vitest UI tests for conditional fields, route redirect, and submit state; desktop and 375px mobile route screenshots.

---

## TR-05 — Deliver Guardian request tracking and post-match consent

**Purpose.** Let a Guardian monitor submitted requests without calling support, and collect explicit consent only after a match exists.

**Likely surfaces.** A new Guardian request page or Account panel section, `client/src/App.tsx`, `client/src/pages/GuardianRequestJourney.tsx`, request client tests.

**Work.** Add a private, authenticated **My Requests** view linked from submit success and the Guardian account area. Each request card must show request ID, submitted date, selected preferences, and the status sequence `New → Reviewing → Matched → Closed`. It may show matching progress but must not reveal a Tutor’s direct private contact details.

When the status becomes `Matched`, present the Guardian with a plain-language consent choice: permit the Connect Tutors BD coordinator to arrange the next contact step, or decline. The user must be able to decline without losing their request history. The UI must confirm the saved choice and prevent accidental duplicate submissions.

**Acceptance criteria.**

| ID | Criterion |
|---|---|
| TR-05-A | A signed-in Guardian can reach My Requests from success and account contexts. |
| TR-05-B | A Guardian sees only their own requests, with safe dates/statuses and no other Guardian’s data. |
| TR-05-C | The contact-consent control appears only for a matched, pending request. |
| TR-05-D | Consent/decline actions are explicit, clearly explained, and visibly confirmed after saving. |
| TR-05-E | Neither the request list nor its detail view shows Tutor/Guardian phone, email, or private document data. |

**Verification.** Focused client and API authorization tests, followed by desktop/mobile screenshots for empty, active, and matched-with-consent states using non-production test fixtures only.

---

## TR-06 — Update manual Admin matching for the consent-aware lifecycle

**Purpose.** Ensure the existing Admin match action transitions a request into a status that waits for Guardian consent rather than exposing contact details.

**Likely surfaces.** Admin request helper/procedure, `server/db.ts`, Admin UI if present, Tutor assigned-request mapping, Admin/Tutor regression tests.

**Work.** Preserve the approved-Tutor-only manual assignment constraint. When an Admin matches a request, set `status: matched` and contact consent to `pending`. The Admin view may retain access to the private Guardian profile necessary for later coordinator contact, but must label consent as pending/approved/declined and prohibit coordinator contact handoff until the Guardian has approved. The Tutor’s request inbox remains limited to matching-relevant details and never receives Guardian contact data, student first name, or consent decision.

**Acceptance criteria.**

| ID | Criterion |
|---|---|
| TR-06-A | Only an Admin can assign an approved Tutor to an active request. |
| TR-06-B | Assignment atomically changes an active request to `matched` with consent `pending`. |
| TR-06-C | A second assignment and invalid status transition are rejected safely. |
| TR-06-D | Admin-facing state identifies a pending/approved/declined consent decision without exposing it through Tutor/public APIs. |
| TR-06-E | The existing Telegram notification remains privacy-safe and does not gain private contact or student-name data. |

**Verification.** Admin assignment and Tutor payload regression tests, including a test that asserts the prohibited private fields are absent.

---

## TR-07 — Complete release-quality validation and documentation

**Purpose.** Verify the end-to-end feature, its privacy boundary, and its responsive behavior before publication.

**Likely surfaces.** All tickets above, `todo.md`, focused tests, full test suite, TypeScript/build output, screenshots, and code review notes.

**Work.** Perform a focused security/privacy review of the request-create, Guardian-list, Admin-match, Tutor-assigned, Telegram, and public listing/profile payloads. Verify route redirects, error recovery, no-JavaScript-safe error states where applicable, keyboard access, and reduced-width behavior. Update the project checklist with completed tickets before a release checkpoint.

**Acceptance criteria.**

| ID | Criterion |
|---|---|
| TR-07-A | New and existing request regressions, including authorization and no-private-field assertions, pass. |
| TR-07-B | The full project test suite, TypeScript check, and production build pass. |
| TR-07-C | Desktop and mobile screenshots confirm the canonical form, request tracking, consent state, route redirect, and homepage-return bar do not overlap key controls. |
| TR-07-D | A code review finds no blocker in access control, persistence migration, contact privacy, or regressions. |
| TR-07-E | `todo.md` reflects the implementation result before the release checkpoint is saved. |

**Verification.** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, targeted request/privacy test commands, visual verification, and code review.

## Explicitly deferred

The following are intentionally **not** included in this approved scope: automatic Tutor ranking/matching, public review/testimonial content, mobile OTP verification, direct Tutor–Guardian phone/email exposure, payment collection, and extra teaching-time-slot fields beyond the existing days-per-week request preference. They require separate product decisions before implementation.

## Implementation approval

Implementation may begin only after the user confirms this ticket set. Work must proceed in the stated order, beginning with **TR-01**, and every ticket must add or update focused tests before the user-facing behavior is completed.
