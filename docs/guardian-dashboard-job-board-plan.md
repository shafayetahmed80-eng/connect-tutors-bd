# Guardian Dashboard and Shared Job Board

## Planning status

This document is an implementation-ready planning package, not an implementation approval. It combines the user's requested post-login Guardian workspace, the supplied Lightshot references, and the current Connect Tutors BD architecture. The existing authentication, Guardian privacy boundaries, Admin-only controls, Tutor approval rules, Bangladesh location hierarchy, and mandatory Admin TOTP are treated as non-negotiable constraints.

## Executive recommendation

Build this as a **separate protected Guardian workspace plus a separate tuition-job domain**, while reusing the existing protected layout and filter interaction patterns. Do not repurpose the public Tutor Directory as the Job Board: the Directory exposes approved Tutor profiles, whereas the new Job Board must expose only Admin-approved tuition opportunities with Guardian contact data hidden.

The safest dependency order is:

1. Establish the job lifecycle and data model.
2. Build the Guardian protected shell and truthful dashboard overview.
3. Convert the existing Guardian request journey into a reusable authenticated three-step request flow with draft, preview, and submission states.
4. Add Admin review, edit, publish-without-edit, unpublish/close, and audit controls.
5. Build the shared public/Tutor Job Board over approved published jobs.
6. Add Guardian Posted Jobs, Profile, Settings, Attendance, Confirmation Letter, community, and informational tabs according to their real data readiness.

## Current architecture evidence

| Area | Current state | Consequence for this scope |
|---|---|---|
| Protected layout | `DashboardLayout` and Tutor/Admin workspace patterns already exist | Reuse the shell; do not create a third dashboard framework. |
| Guardian private experience | `/guardian/requests` provides request history, status presentation, and matched-state contact consent | Evolve or wrap this into the Guardian workspace rather than duplicating status logic. |
| Guardian request flow | `/request-tutor` uses the existing Guardian journey and current request validation | Extract/reuse its state and validation for the authenticated three-page flow. |
| Request statuses | Existing lifecycle is `new`, `reviewing`, `matched`, `closed` | This is not sufficient by itself to represent a public published job. Add a separate publication lifecycle or a dedicated job projection. |
| Admin matching | Admins can filter requests, mark reviewing/closed, and assign approved Tutors | Extend this area with verification, edit, publish, and audit actions. |
| Tutor Directory | `/tutors` lists approved Tutor profiles with advanced filters and pagination | Keep it separate from the tuition Job Board. |
| Guardian profile | Persisted city/location, phone, gender, terms version, timestamps | Can populate the dashboard identity and request defaults; Student ID and some requested identity fields need a defined contract. |
| Job persistence | No dedicated published tuition-job entity is currently present | A schema/API foundation is required before the Job Board UI. |
| Maps | Existing Map integration is available in the template, but no approved job-direction contract is established | Direction must be privacy-safe and use a controlled location target, not expose raw Guardian contact data. |

## Requirements matrix

| Requirement | Source | Confidence | Dependency | Ambiguity / risk | Measurable acceptance condition |
|---|---|---:|---|---|---|
| Post-login Guardian workspace with branded identity header | User brief + sidebar reference | High | Authenticated Guardian, profile data | Guardian/Student ID format is undefined | Guardian sees only their own name, email, role, ID if defined, and creation date; unauthenticated users cannot access it. |
| Sidebar tabs: Dashboard, Hire a Tutor, Profile, Attendance, Posted Jobs, Confirmation Letter, Settings, Exclusively Yours, How it works, Join Guardian Community | User brief | High | Route map and per-tab readiness | Several tabs have no data contract or confirmed business behavior | Every tab has a real route, a truthful implemented state, or an explicit `Coming soon` state; no dead-end navigation. |
| Optional Hire Tutor intro with Skip/Get Started | Intro reference | High | Guardian workspace and request flow | Persistence scope for skip is undefined | Intro can be skipped and revisited from How it works; skipping never loses request data. |
| Three-page request journey with progress | Request references | High | Request data model | Exact field taxonomy differs from current request schema | Steps preserve state, validate server-side, support Previous/Next, and render a mobile one-column layout. |
| Page 1: tuition type, category, class/course, subjects, city, location, student gender | User brief + reference | High | Existing location/catalog contracts | Whether online tuition should require location is not stated | Required fields block progression; city filters locations; online-only behavior is explicitly defined and tested. |
| Page 2: student count, Tutor gender preference, days/week, budget, hire date, address | Reference + current request fields | Medium/High | Request schema | Salary vs monthly fee semantics need one canonical name | Values are normalized, bounded, persisted in draft, and shown in Preview. |
| Page 3: institute, tutoring time, referral source, additional requirements | Reference + user brief | High | Request schema | Referral options and time granularity are undefined | Referral is a controlled value with an Other path; free text is bounded and sanitized. |
| Preview before submission | Preview reference | High | Draft persistence/state | Edit granularity not defined | Every section can be reviewed and edited without data loss; submit is explicit and idempotent. |
| Submission confirmation with Admin verification expectation | Submission reference + user text | High | Admin queue and notifications | Exact SLA and contact channel must be factual | Confirmation says request is received and pending Admin verification; it does not imply instant publication. |
| Request appears in Admin panel | User brief | High | Admin procedures and audit | Who may edit and when is not yet specified | Authorized Admin can see the submitted request, with privacy-safe list fields and audited contact access. |
| Admin can edit or publish without edit | User brief | High | Job lifecycle, Admin authorization | Whether Guardian must approve Admin edits is unresolved | Admin actions are separately labeled, validated, audited, and produce a visible lifecycle event. |
| Public/Tutor Job Board shows tuition jobs, not Tutor profiles | User brief + Job Board reference | High | Published job table/query | Visibility fields and expiry policy absent | Only approved/published, non-closed jobs appear; no Guardian name, phone, email, student identity, or private notes appear. |
| Advanced Job Board filters | User brief + filter reference | High | Job query facets | Exact filter list and date timezone need locking | Filters include date range, tuition type, country, city, days/week, category, location, student gender, class, Tutor gender, and Job ID; result count updates truthfully. |
| Dynamic job-card title | User brief + card reference | High | Canonical job title builder | English grammar and missing-field fallback need definition | Same normalized title is returned by API and rendered consistently in public, Tutor, Admin, and Guardian views. |
| Job ID auto and manual options | User brief | High | Job identifier policy | Manual format, uniqueness, who may set it, and collision handling undefined | Auto IDs are unique and immutable; manual IDs are Admin-only, validated, audited, and collision-safe. |
| Direction opens Google Maps view | User brief | Medium/High | Safe location target and maps integration | Exact target precision could expose Guardian home | Direction uses approved city/location or a consented coordinate policy; raw address is never put in a public URL. |
| Job count | User brief + reference | High | Published job query | Count scope could mean all jobs or current filters | UI labels whether count is total published jobs or current filtered results and matches server pagination metadata. |
| Guardian Profile/Settings updates | User brief | Medium | Guardian profile procedures | Name/number update and password reset rules need confirmation | Updates are authenticated, validated, auditable where sensitive, and do not permit role or identity escalation. |
| Attendance and Confirmation Letter | User brief | Low/Medium | Assignment/attendance/letter data models | No behavior or owner is defined | Do not fabricate data; show a defined empty/upcoming state until contracts are approved. |
| Exclusively Yours and Guardian Community | User brief | Low | Content/community integration | Meaning and moderation model absent | Treat as content requirements requiring separate decision; no placeholder claims or fabricated community activity. |

## Recommended domain model

### 1. Guardian request as private source record

Retain the existing Guardian request as the private source of truth for submitted requirements and contact-consent behavior. Add missing normalized fields only after confirming they are not already represented under another name. Avoid storing duplicated free-form location strings when canonical `cityLocationId` and `locationId` are available.

Recommended request lifecycle remains private-facing: `draft`, `submitted`, `reviewing`, `changes_requested`, `approved`, `published`, `matched`, `closed`, and `cancelled`. If changing the existing status enum is too disruptive, preserve the current request status and introduce a separate `reviewState` or a job projection with explicit mapping. Do not overload `matched` to mean published.

### 2. Published tuition job projection

Create a dedicated `tuition_jobs` entity or an equivalent normalized projection linked to the source request. It should contain, at minimum, a stable internal ID, public Job ID, source request ID, publication status, title inputs, tuition type, country/city/location references, category, class/course, subjects, student count, student gender, Tutor gender preference, days/week, budget, hire date, posted/published timestamps, expiry/closed timestamps, safe direction target, and audit metadata.

The public query should return a privacy-safe read model rather than raw request rows. Guardian phone, email, exact address, student name, private notes, and contact-consent metadata must not be selectable into the public response.

### 3. Audit events

Admin edit, approve, publish, unpublish, close, Job ID override, contact disclosure, and any Guardian-visible correction request should be append-only audit events. The audit record should contain actor, target entity, action, timestamp, and structured before/after summary without storing secrets or unnecessary personal data.

## Role and privacy boundaries

| Actor | May view | May change | Must never receive |
|---|---|---|---|
| Guardian | Own profile, own drafts/submissions, own posted-job status, safe public job data | Own profile fields allowed by policy; own draft; request correction before publication | Other Guardians' data, Tutor private contact data, Admin notes |
| Admin | Submitted requests, necessary contact details through deliberate audited action, approved Tutor data, publication queue | Verify, edit, approve, publish, close, assign, set safe Job ID | Owner-only security controls unless separately authorized |
| Tutor | Public published job read model and permitted job details | Interest/apply action only if separately approved | Guardian name/phone/email, exact private address, Admin notes |
| Owner | All authorized Admin monitoring/security surfaces | Manage Admin roles/security | None beyond existing least-privilege rules |
| Public visitor | Safe published job cards and filters | No private mutation | All private Guardian/student/contact data |

## Admin publishing workflow

1. **Submitted:** Guardian completes the request and sees a truthful receipt. The request enters the Admin queue and is not public.
2. **Reviewing:** An authorized Admin claims or marks the request as under review. The UI shows which fields require confirmation without exposing more than necessary in the queue list.
3. **Contact verification:** If the existing policy permits calling the Guardian, contact access is an explicit audited action. The Admin confirms the requirement, location precision, budget, schedule, and any missing information.
4. **Edit or publish without edit:** The Admin chooses one clearly labeled action. An edit requires validation and an audit summary; publish-without-edit records that no content change was made.
5. **Approved/published:** A safe Job Board projection is created or updated. The public Job ID and normalized dynamic title are generated once and reused everywhere.
6. **Changes requested / closed:** If the requirement cannot be published, the Admin records a reason and the Guardian sees a safe status message. Closed or expired jobs disappear from public results but remain available to authorized history views.
7. **Matched/appointed:** Matching and Tutor assignment remain separate from public publication. A job can be published before a Tutor is assigned, and assignment must not reveal Guardian contact data by default.

## Guardian workspace plan

### Phase G1 — Protected shell and overview

Reuse `DashboardLayout` and implement a Guardian navigation configuration with active sections, planned sections, mobile collapse behavior, breadcrumb/section title, and a persistent Home escape route. The identity header should load authenticated Guardian/profile data, show a non-sensitive avatar fallback, and expose a clear account/settings action.

The dashboard overview should show truthful request counters derived from server data: drafts, submitted/reviewing, published/live, matched/appointed, and closed. It should include the existing request history/status component as the foundation, plus loading, error, empty, and next-action states. Avoid hard-coded numbers, fake notices, or fabricated community activity.

### Phase G2 — Authenticated Hire a Tutor journey

Extract the current request journey's validation and location logic into reusable functions/components. Add an optional intro, then a three-step authenticated flow:

| Step | Scope | Validation |
|---|---|---|
| 1 | Tuition type, category, class/course, subjects, city, location, student gender | Required fields; location must belong to selected city; online location rule must be explicit. |
| 2 | Student count, Tutor gender preference, days/week, budget, hire date, address details | Numeric/date bounds; budget policy; address privacy warning. |
| 3 | Institute, tutoring time, referral source, additional requirements | Controlled referral values; bounded/sanitized text; clear optional labels. |

Persist draft state safely so accidental navigation or mobile interruption does not discard data. Preview must support edit-to-step recovery. Submission must use an idempotency strategy so repeated clicks cannot create duplicate requests.

### Phase G3 — Guardian tabs

Implement Profile and Settings first because they have concrete identity requirements. Keep password change/reset within the existing public/Admin separation and require fresh authentication or equivalent safeguards for sensitive changes.

Implement Posted Jobs from the Guardian-owned source request/job query with statuses and safe metadata. Attendance and Confirmation Letter require approved data contracts before displaying anything beyond honest empty/upcoming states. `Exclusively Yours` and `Join Guardian Community` require product decisions about content ownership, moderation, and notification behavior. `How it works` can host the optional request intro and factual process explanation.

## Shared Job Board plan

### Public and Tutor surface

Create a dedicated `/job-board` route and a protected Tutor sidebar destination pointing to the same job query surface. The public header should say that results are tuition opportunities, not Tutor profiles. Use the existing mobile filter-sheet pattern from Tutor Listing, but create a Job Board-specific filter state and tRPC procedure.

Each card should contain a server-generated title, Job ID, posted date, tuition type, budget, location label at approved precision, subjects, student gender, Tutor gender preference, days/week, and Details/Share actions. Do not include Guardian identity or raw address. Add a detail route only if its read model preserves the same privacy policy.

### Filter contract

Recommended `JobBoardFilters` fields are `query`, `postedFrom`, `postedTo`, `country`, `city`, `locationId`, `tuitionType`, `daysPerWeek`, `category`, `classCourse`, `studentGender`, `tutorGender`, `jobId`, `page`, and `pageSize`. City/location dependencies must be canonical and deduplicated. Apply/Clear behavior should be explicit on mobile; desktop may retain live filter updates if query load is acceptable.

### Direction behavior

Use a server-approved safe direction target. For home tuition, default to the canonical area or location centroid, not an exact Guardian address. If exact directions are a business requirement, require an explicit consent policy and ensure the URL is available only to an authorized authenticated role. Public cards should never expose a raw coordinate or exact address.

## Implementation ticket sequence

| Order | Ticket | Output | Depends on |
|---:|---|---|---|
| 1 | GD-01 | Confirm Guardian identity/ID contract, protected route policy, and nav taxonomy | Product decisions |
| 2 | JB-01 | Define request/job lifecycle, fields, publication mapping, Job ID policy, and indexes | GD-01 |
| 3 | JB-02 | Add schema migration and server helpers for job projection and audit events | JB-01 |
| 4 | GD-02 | Add Guardian workspace shell and truthful dashboard overview | GD-01, existing auth |
| 5 | GR-01 | Refactor authenticated three-step request journey with draft persistence and preview | JB-01, existing Guardian journey |
| 6 | AD-01 | Add Admin verification/edit/publish-without-edit controls and audit trail | JB-02, existing Admin auth/2FA |
| 7 | JB-03 | Add public/Tutor Job Board query, filters, count, pagination, and safe card read model | JB-02 |
| 8 | GD-03 | Add Guardian Posted Jobs and status/history views | JB-02 |
| 9 | GD-04 | Add Guardian Profile/Settings updates with sensitive-action safeguards | Existing Guardian profile/auth |
| 10 | JB-04 | Add safe direction behavior and share/deep-link handling | JB-03, maps policy |
| 11 | GD-05 | Decide and implement Attendance, Confirmation Letter, Exclusive content, and community | Product decisions |
| 12 | QA-01 | Add Vitest, mobile interaction, authorization/privacy, migration, and production gates | All implemented tickets |

## Acceptance criteria for the release

### Guardian workspace

- A non-Guardian cannot access Guardian routes or private data.
- Guardian identity data is sourced from the authenticated account/profile and never fabricated.
- Sidebar is keyboard reachable, mobile-safe, and every visible item has a working destination or truthful upcoming state.
- Dashboard counts and notices are server-backed with loading, empty, and error handling.

### Request journey

- Intro is skippable and revisitable.
- All three steps preserve state and validate both client-side for guidance and server-side for authority.
- City/location dependency rejects mismatched pairs.
- Preview supports edit recovery and submit is idempotent.
- Submission clearly states that Admin verification precedes public publication.

### Admin publishing

- Only authorized Admins can edit, approve, publish, unpublish, close, or override Job IDs.
- Every sensitive contact disclosure and publication mutation is audited.
- Publish-without-edit is distinct from edited publication.
- Closed, expired, or unapproved jobs never appear in public/Tutor results.

### Job Board

- Cards display tuition jobs only and contain no private Guardian/student contact data.
- Filter result count, pagination, and card data come from the same server query.
- Dynamic titles are consistent across public, Tutor, Admin, and Guardian views.
- Auto-generated Job IDs are unique; manual IDs are validated and audited.
- Location filtering is canonical, city-dependent, and deduplicated.
- Direction behavior complies with the agreed location-precision/privacy policy.

## Key risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Overloading request status with publication status | Incorrect public visibility or broken matching | Separate request review state from job publication state. |
| Guardian contact leakage through cards, details, URLs, or Maps | Severe privacy and trust failure | Return a privacy-safe job read model; test forbidden fields and URL construction. |
| Duplicate jobs from repeated Admin publish or Guardian submit | Duplicate public listings and confusing history | Idempotency keys, unique source-request projection, and transactional publish operation. |
| Hard-coded dashboard counts or notices | Misleading product behavior | Server-backed metrics and honest empty/upcoming states. |
| Ambiguous Job ID manual override | Collisions and audit gaps | Admin-only validated format, uniqueness constraint, immutable public ID after publish, audit event. |
| Exact home location shown publicly | Physical safety risk | Area/centroid directions by default; explicit consent for anything more precise. |
| Scope creep from uncontracted tabs | Delayed release and fake UI | Stage Attendance, Confirmation Letter, Exclusive, and Community behind decisions and real data contracts. |
| Existing public Tutor Directory semantics reused incorrectly | Users see profiles where jobs are expected | Separate route, router procedure, schema read model, filter state, and tests. |

## Decisions required before implementation approval

1. **Guardian/Student ID:** Should the displayed ID be the Guardian account ID, a new Guardian number sequence, or a separate Student ID? What is the public format and privacy policy?
2. **Student model:** Can one Guardian manage multiple students? If yes, the request and dashboard need a student entity rather than one implicit student.
3. **Online location rule:** For Online or Both tuition, is City/Location required, optional, or used only for preference/filtering?
4. **Admin edits:** Does an Admin edit publish immediately, return the request to Guardian confirmation, or record an internal correction only?
5. **Job expiry:** What closes a job automatically—hire date, a fixed duration, Admin action, Guardian action, or Tutor appointment?
6. **Tutor Job Board action:** May Tutors only view jobs, or can they express interest/apply? If they can, what data is shared and what Admin workflow follows?
7. **Manual Job ID:** Who may set it, allowed format, and whether it can be changed after publication.
8. **Direction precision:** Area centroid only, canonical location pin, or consented exact address for authenticated roles.
9. **Attendance and Confirmation Letter:** What event creates each record, who can edit it, and which document/status is visible to Guardian and Tutor?
10. **Exclusively Yours and Community:** What content, moderation, membership, and notification behavior are intended?
11. **Support and notifications:** Which factual support contact and Admin notification channel should be used for the submission confirmation and publishing workflow? Existing approved platform contact information must be used.

## Recommended approval boundary

Approve **GD-01 through JB-03** as the first release slice: protected Guardian shell, authenticated request flow, Admin verification/publishing, and the shared public/Tutor Job Board. Treat Profile/Settings as a parallel but bounded slice. Keep Attendance, Confirmation Letter, Exclusively Yours, and Guardian Community decision-gated until their data ownership and acceptance criteria are defined.

## References

[1]: https://prnt.sc/BkKyo7bURtks "Guardian Dashboard sidebar reference"
[2]: https://prnt.sc/NrmojuTK_3px "Guardian Dashboard overview reference"
[3]: https://prnt.sc/61rbmaS1j7jz "Hire a Tutor intro reference"
[4]: https://prnt.sc/sDlRKJL6-Rix "Hire a Tutor first-page reference"
[5]: https://prnt.sc/-Grf0leLKW8P "Hire a Tutor second-page reference"
[6]: https://prnt.sc/tJSNifroae7w "Hire a Tutor third-page reference"
[7]: https://prnt.sc/QJwPZ-CYSDU2 "Hire a Tutor preview reference"
[8]: https://prnt.sc/WztcGH0uTD4b "Hire a Tutor submission reference"
[9]: https://prnt.sc/VgxABqoYKuvm "Guardian Posted Jobs reference"
[10]: https://prnt.sc/de3Unwmn39nH "Public tuition Job Board reference"
[11]: https://prnt.sc/-gYhBcpEokeB "Public Job Board advanced-filter reference"
[12]: https://prnt.sc/ecjpLJh3IINF "Tutor dashboard Job Board reference"
[13]: https://prnt.sc/ayhHVy3T_Abp "Job Board result-count reference"
[14]: https://prnt.sc/FqID_wo8szch "Job card primary-information reference"
[15]: https://prnt.sc/yzVtF-xTdUIU "Job card detail-information reference"
