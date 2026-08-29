# Guardian Dashboard ও Shared Job Board
## Grill-with-docs Findings, Risks, and Decision Log

**Status:** Pre-implementation critical review  
**Prepared by:** Manus AI  
**Review basis:** User brief, approved planning package, implementation ticket package, Bengali ticket explanation, current architecture notes, and supplied visual references.

## Executive verdict

The ticket package is directionally sound and should **not yet move directly into full implementation**. The strongest architectural decision is to keep the private Guardian request separate from a privacy-safe published tuition-job projection. The most important unresolved issue is not visual design; it is the contract between Guardian request, Admin verification, public publication, Tutor visibility, matching, and closure.

The recommended implementation boundary is a **small vertical slice**: Guardian creates a request draft and submits it; an authorized Admin verifies and publishes a privacy-safe job; public and Tutor users can filter the published job; the Guardian can see only their own status. Attendance, Confirmation Letter, Exclusively Yours, Community, and self-service password reset should remain outside the first release unless their data and ownership contracts are separately approved.

> **Primary recommendation:** Approve the lifecycle and privacy decisions first, then implement the smallest end-to-end slice. Do not begin with the full sidebar or every requested tab.

## 1. Evidence and confidence matrix

| Area | Evidence | Confidence | Current conclusion | Decision still needed |
|---|---|---:|---|---|
| Guardian protected workspace | User sidebar brief, visual references, existing protected layout notes | High | Reuse the existing protected layout with Guardian-specific navigation and role guards | Confirm first-release active tabs versus truthful upcoming states |
| Guardian identity header | User brief requests image, name, email, ID, creation date; current profile notes provide some fields | Medium/High | Name, email, avatar fallback, and creation date are feasible; ID is not yet defined safely | Choose account reference, Guardian number, or no ID; do not invent Student ID |
| Multiple students | User brief refers to Guardian/Student ID but no confirmed Student entity contract | Low | First release should use one request/one student unless a Student model is approved | Decide whether and when multi-student support is required |
| Hire Tutor flow | Existing public Guardian journey plus supplied three-page references | High | Extract/reuse existing validation and location logic; add authenticated draft/preview/receipt states | Confirm exact page-2/page-3 field taxonomy and online-location rule |
| Admin moderation | User explicitly requires Admin submission, editing, and publish-without-edit | High | Add distinct, audited verification and publication actions | Decide whether material Admin edits require Guardian reconfirmation |
| Public Job Board | User explicitly separates jobs from Tutor profiles | High | Use a separate published tuition-job read model and query | Confirm visibility, expiry, and Tutor interest/apply behavior |
| Job ID | User requests automatic and manual options | High | Auto ID should be stable; manual ID should be Admin-only, validated, unique, and audited | Confirm format, prefix, mutability before publication, and collision policy |
| Direction/Maps | User requests Google Maps direction; current plan flags precision risk | Medium | Default to city/location or area centroid; never expose raw home address | Decide whether authenticated exact directions are ever permitted |
| Secondary Guardian tabs | User requests Attendance, Confirmation Letter, Exclusively Yours, and Community | Low/Medium | Use honest upcoming/empty states until data contracts exist | Define owner, source data, moderation, and notification behavior |
| Password recovery | Existing audit says WhatsApp-assisted recovery remains current contract | High | Do not imply self-service email reset exists | Approve a separate tokenized reset project if desired |

## 2. Critical contradictions and ambiguities

### 2.1 “Guardian / Student ID” is not one requirement

The brief combines Guardian identity and Student identity in one header request, but the current evidence does not establish whether a Student is a persisted entity, whether a Guardian may manage multiple students, or whether a visible ID is necessary. These are different domain concepts. Displaying a made-up Student ID would create a trust and data-integrity defect.

**Recommendation:** In the first release, display only an existing authenticated account reference or omit the ID with a truthful label. Create a separate Student model only after multi-student behavior, ownership, and request association are approved.

### 2.2 “Admin can edit” conflicts with “Guardian request is the source of truth”

The plan correctly treats the Guardian request as the private source record, but an Admin edit can alter the meaning of the Guardian’s requirement. A budget, location, student gender, schedule, or class change may affect consent and matching outcomes. “Publish without edit” is also operationally different from “edit and publish.”

**Recommendation:** Store the original Guardian submission immutably in audit history. Use a controlled Admin-edited revision. Require Guardian reconfirmation for material changes, at minimum budget, location, schedule, student details, tuition type, and subjects. Allow a documented minor-correction path only for non-material spelling or formatting changes.

### 2.3 “Approved” and “Published” are used as if they are interchangeable

The tickets distinguish approval and publication, but the acceptance language sometimes treats an approved projection as immediately public. Publication should be a deliberate visibility transition. A request can be verified but held, edited, scheduled, expired, or closed without being public.

**Recommendation:** Use separate `reviewState` and `publicationState`, or a private request lifecycle plus a dedicated job lifecycle. Never map `matched` to `published` and never make approval automatically public without an explicit policy decision.

### 2.4 “Job Board available tuition” lacks an application contract

The brief defines what Tutors can see but does not define whether a Tutor can apply, express interest, bookmark, or contact Admin. A visible job without a next action is a conversion dead end; inventing an application action would create a new operational workflow without authorization rules.

**Recommendation:** Release 1 should use a clearly labeled “Contact Admin / Express interest” action only if the Admin workflow and notification destination are approved. Otherwise, show read-only safe details and mark application as upcoming rather than presenting a non-functional button.

### 2.5 Online tuition and location requirements are unresolved

The Hire Tutor first page requires City and Location, but the platform supports Home, Online, and Both. Requiring a physical area for online-only tuition may block valid requests; omitting location for home tuition may create unsafe or incomplete matching data.

**Recommendation:** Make the rule explicit and test it. Home and Both require a canonical city/location. Online-only requires a country and timezone or service region, while physical location remains optional. If the business insists on a city for online matching, label it as a preference rather than a home address.

### 2.6 “Country” conflicts with the Bangladesh-first location model

The filter list includes country, while the existing platform uses Bangladesh divisions, districts, city areas, and sub-areas. International cities are part of the broader product scope, but the exact country/city/location hierarchy and canonical IDs are not defined in this ticket package.

**Recommendation:** Do not add a free-text country filter. Use a normalized country/city hierarchy. For the first release, explicitly scope the Job Board to supported Bangladesh locations unless international data contracts are approved.

## 3. Missing acceptance criteria that should block implementation

| Missing criterion | Why it matters | Required addition |
|---|---|---|
| Draft ownership and expiry | Abandoned drafts can persist indefinitely or leak through queries | Define draft retention, deletion, and refresh behavior; enforce Guardian ownership server-side |
| Submission idempotency key | Double-clicks, retries, and mobile reconnects can create duplicates | Define request key scope, storage, replay response, and expiry |
| Lifecycle transition authority | UI-only status changes are unsafe | Define allowed actor and transition for every state |
| Admin concurrency | Two Admins may edit or publish the same request | Add claim/version checks or optimistic concurrency; reject stale updates |
| Guardian reconfirmation | Material Admin edits can change consented requirements | Define which fields are material and how reconfirmation is recorded |
| Job expiry | Public stale jobs mislead Tutors and Guardians | Define default expiry, extension, auto-close, and timezone |
| Re-publication | An unpublished/closed job may be edited and republished | Define whether a new public Job ID is required and what history is retained |
| Job ID format | Manual and auto IDs can collide or leak internal identifiers | Define prefix, length, allowed characters, uniqueness, and exposure policy |
| Filter semantics | “Days/week,” budget, date, and location can be interpreted inconsistently | Define exact operators, inclusive boundaries, currency, timezone, and canonical IDs |
| Search privacy | Job ID or filter combinations could reveal sensitive details | Return only safe projection fields and test forbidden-field absence |
| Maps fallback | A location may lack a safe centroid or API result | Define fallback to an approved text location and an unavailable state |
| Contact disclosure | Admin contact access is sensitive | Define purpose, actor, audit event, masking, and retention |
| Notification behavior | Guardian/Admin/Tutor state changes need reliable communication | Define which events notify whom and through which factual channel |
| Posted Jobs ownership | Guardian must not see another Guardian’s records | Add server ownership tests and row-level query constraints |
| Secondary tabs | Empty states can be mistaken for unfinished bugs | Define copy, route behavior, and explicit “Coming soon” treatment |

## 4. Privacy and security review

The public Job Board must use a **dedicated safe read model**. Selecting raw request rows and removing fields in the frontend is not acceptable. The server query and response type must exclude Guardian phone, email, name, exact address, student name, private notes, consent metadata, and raw coordinates.

Admin contact lookup should be a deliberate action, not a field rendered in every queue row. It should be role-gated, purpose-labeled, audited, and protected from accidental bulk disclosure. Admin edit and publication mutations should require server authorization and should not rely on hidden buttons or route obscurity.

The Guardian dashboard must be strictly owner-scoped. Tutor, public, Admin, and Owner routes require separate server procedures. A Guardian should not be able to change role, account ownership, phone uniqueness, verification status, or another user’s request by modifying an identifier in the client payload.

The Maps Direction action is a privacy boundary. Public URLs must never contain exact Guardian coordinates or address text. The default should be an approved city/location or area centroid. Any future exact route must be authenticated, consented, time-limited, and excluded from public share links and logs.

## 5. State-machine recommendation

A two-axis model is safer than a single overloaded status:

| Axis | Suggested states | Owner of transition |
|---|---|---|
| Request/review | `draft`, `submitted`, `reviewing`, `changes_requested`, `approved`, `cancelled` | Guardian for draft/submit/cancel; Admin for review/approve/changes |
| Publication | `unpublished`, `published`, `expired`, `closed` | Authorized Admin only |
| Matching | `unmatched`, `interest_received`, `matched`, `appointment_confirmed` | Admin/approved matching workflow |

The current platform may retain legacy status fields for compatibility. If so, introduce explicit derived or additive fields and a mapping layer rather than performing a destructive rename. Every transition must define actor, prerequisites, audit event, and user-visible outcome.

## 6. Recommended implementation correction

The current ticket dependency order should be adjusted slightly. `GD-01` should resolve identity and route decisions, but `JB-01` should not depend on the complete Guardian shell. Lifecycle and privacy contracts can be approved independently of UI. A safer order is:

1. **Decision Gate A:** identity, Student scope, online-location rule, job visibility, expiry, Job ID, material edit policy, and Tutor action.
2. **JB-01:** pure lifecycle, filter, title-builder, Job ID, expiry, and transition contracts with failing tests.
3. **JB-02:** additive schema/projection/audit migration and server read/write helpers.
4. **GR-01 and GR-02:** authenticated request draft, preview, idempotent submit, and receipt.
5. **AD-01:** Admin review, contact verification, edit/reconfirm, publish, unpublish, and audit controls.
6. **JB-03:** safe public/Tutor Job Board read model, filters, count, pagination, and empty states.
7. **GD-02 and GD-03:** Guardian shell, dashboard counts, Posted Jobs, and own-history views.
8. **JB-04 and GD-04:** safe directions, detail/share, Profile, and Settings.
9. **GD-05:** only after separate contracts for Attendance, Confirmation Letter, Exclusively Yours, and Community.
10. **QA-01:** cross-role, privacy, mobile, migration, and production release gate.

This changes the original order only by moving the data-contract foundation ahead of shell polish and placing the authenticated request flow before the full dashboard tab set.

## 7. Priority recommendations

| Priority | Recommendation | Decision status |
|---|---|---|
| P0 | Separate request review, publication, and matching states | Must approve before schema work |
| P0 | Define the safe public Job read model and forbidden-field list | Must approve before any Job Board query/UI |
| P0 | Decide material Admin edit and Guardian reconfirmation rules | Must approve before AD-01 |
| P0 | Define online-only location behavior and supported country scope | Must approve before GR-01/JB-03 |
| P1 | Define Job ID format, expiry, close, unpublish, and re-publication policy | Must approve before JB-02 |
| P1 | Implement lifecycle tests before migration | Recommended first engineering task |
| P1 | Implement one vertical slice rather than all sidebar tabs | Strongly recommended |
| P2 | Keep Attendance, Confirmation Letter, Community, and Exclusively Yours as honest upcoming states | Do not fabricate data |
| P2 | Treat self-service password reset as a separate security project | Keep current WhatsApp-assisted recovery contract |

## 8. Smallest blocking decision set for the user

Implementation can safely begin after approving these eight answers:

| # | Decision | Recommended answer |
|---:|---|---|
| 1 | Header ID | Use existing Guardian account reference; do not show Student ID yet |
| 2 | Student scope | One student per request in Release 1; design for future Student entity |
| 3 | Online-only location | City/country required; physical area optional for Online-only; Home/Both require canonical location |
| 4 | Admin material edits | Guardian reconfirmation required for budget, location, schedule, subjects, class, gender, or tuition type changes |
| 5 | Job expiry | Admin-set default with automatic expiry and explicit extension; expired jobs hidden from public/Tutor queries |
| 6 | Job ID | System-generated immutable public ID; Admin manual override only before publication, unique and audited |
| 7 | Tutor action | Release 1 read-only or “Express interest to Admin” only after notification workflow is approved |
| 8 | Maps | Public map uses approved location/area centroid only; no exact address or raw coordinates |

## 9. Final decision log

### Confirmed by source material

The requested product has a protected Guardian workspace, a multi-step Tutor Request journey, Admin-mediated verification/publication, a separate tuition Job Board, advanced filtering, dynamic job-card titles, result counts, and a Direction action. Existing authentication role separation, Guardian privacy, canonical Bangladesh locations, and Admin mandatory TOTP remain constraints.

### Assumptions used by this review

The first release should support one student per request, preserve the current WhatsApp-assisted recovery contract, keep public jobs separate from Tutor profiles, and show truthful upcoming states for data-less tabs. These are safe implementation assumptions, but they should be recorded as approved product decisions before schema work.

### Rejected alternatives

Do not expose raw Guardian request rows to public/Tutor clients. Do not reuse Tutor Directory records as Job Board records. Do not overload `matched` to mean `published`. Do not fabricate Attendance, Confirmation Letter, community activity, testimonials, counts, or verification badges. Do not place exact Guardian addresses in public Maps links.

## 10. Recommended next action

Approve the eight-item blocking decision set above. Then create a small implementation ticket for **JB-01 lifecycle and contract tests only**, with no schema migration, and review its transition table before starting JB-02. This provides the safest way to discover contract problems while the cost of change is still low.

## References

1. [Guardian Dashboard and Shared Job Board planning package](./guardian-dashboard-job-board-plan.md)
2. [Guardian Dashboard and Shared Job Board implementation tickets](./guardian-dashboard-job-board-tickets.md)
3. [Guardian Dashboard and Shared Job Board Bengali ticket details](./guardian-dashboard-job-board-ticket-details-bn.md)
4. [Guardian Dashboard visual reference findings](./guardian-dashboard-reference-findings.md)
5. [Password recovery UX audit](./account-recovery-ux-audit.md)
