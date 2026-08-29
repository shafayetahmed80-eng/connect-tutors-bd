# Tutor Profile Expansion — Technical Specification

**Status:** Approval pending for implementation  
**Prepared for:** Connect Tutors BD  
**Language convention:** User-facing copy remains English-first; this technical specification is Bangla for review.

## 1. Scope and approved decisions

This specification expands the existing Tutor Profile into a structured, CV-oriented profile that the Tutor can maintain in the Tutor panel, an authenticated Guardian can read as a privacy-safe CV, and an Admin can review in full. No feature in this document is implemented by writing this document.

| Decision | Approved requirement | Specification outcome |
|---|---|---|
| Admin access | Every active Admin can view all Tutor profile information | The directory remains privacy-minimized; the single-Tutor Admin detail view exposes the full profile and records each sensitive-detail view in an audit trail. |
| Sensitive data | NID, parents’ data, religion, addresses, social links, and emergency contact are collected | These values are stored in a private data boundary. They are never included in the Guardian CV, public Tutor APIs, Job Board, search results, analytics, browser logs, or error messages. |
| Guardian CV | Only signed-in Guardians may view a Tutor CV | A Guardian-only server procedure returns an approved Tutor’s CV-safe DTO. Anonymous/public Tutor pages remain on their current safe projection. |
| Full-profile requirements | One education record, availability, fee, teaching method, and tuition place are required at submission | The submission validator is expanded while draft saving remains permissive. |
| Verification document | University ID is required | A private University ID upload and Admin review workflow is required before a profile can become verified. |
| CV action | Preview only | Tutors receive a live **View as Guardian** preview. No downloadable PDF or Guardian download control is included in this scope. |

> The approved “all Admins” decision applies to the detailed Tutor-review surface, not to the paginated Admin directory. Keeping list results minimal reduces accidental exposure during routine searching and filtering without preventing an Admin from opening the authorized full detail.

## 2. Explicit non-goals

This scope does not expose a Tutor’s private phone, email, exact address, NID, parent/contact details, ID-card number, social links, emergency contact, University ID image, storage key, or document metadata to any Guardian or public visitor. It also does not add PDF CV generation, public document download, NID verification, automated OCR, new Admin roles, or a new public Tutor-discovery policy.

The existing profile photo workflow, current `draft → pending → changes_requested → approved/suspended` profile-status lifecycle, catalog management, Job Board, and Guardian request-contact consent flow remain intact unless a ticket explicitly extends them.

## 3. Current-state compatibility constraints

The project already has a protected Tutor profile editor with structured academic catalog references, multi-select teaching preferences, a completion percentage, draft saving, and submission validation. It stores core Tutor fields in `tutors`, academic summary data in `tutor_academic_profiles`, and selection rows in purpose-specific tables. The current public Tutor DTO deliberately omits phone and email, and the Admin list/review DTO currently omits phone, email, documents, and photo keys. The new design extends these boundaries rather than weakening public projections.

| Existing surface | Required compatibility behavior |
|---|---|
| Tutor owner profile | Existing saved Tutor data must remain loadable and editable. A legacy profile may remain a draft until it completes new submission requirements. |
| Public Tutor listing/profile | No new private fields or signed document URLs are added. Existing public routes continue returning their current safe DTO. |
| Admin Tutor directory | Search, filtering, pagination, and list cards continue showing operational summary fields only. No contact, NID, parent, emergency, document, or raw file data appears in a list row. |
| Admin Tutor detail | A separately authorized detail response returns all approved private fields and a short-lived review URL for the University ID image. |
| Guardian CV | Only an authenticated Guardian can request it; only an approved Tutor profile is returned; its DTO is constructed server-side and never reuses the Admin or Tutor-owner DTO. |

## 4. Personas, permissions, and journeys

| Persona | Allowed journey | Data boundary |
|---|---|---|
| Tutor | Edit draft, add multiple education records, maintain availability and tuition preferences, add private identity/emergency details, upload or replace University ID, submit for review, and preview the Guardian CV | Can view and edit only their own record. The Tutor can view their own University ID status but never a raw storage key. |
| Active Admin | Search the minimal directory, open one Tutor’s complete detail, view a time-limited University ID image, review/approve/request changes/reject the document, and moderate the existing profile status | Can view the whole approved scope selected by the user. Every private-detail and document-view action creates a content-free audit row. |
| Signed-in Guardian | Open the CV of an approved Tutor and use the existing matching/request paths | Receives only the Guardian CV DTO. No contact details, exact address, NID, family/emergency data, private documents, or internal review notes are returned. |
| Anonymous visitor | Continue using the current public Tutor pages | Receives the existing public Tutor DTO only; this specification does not add a new anonymous CV endpoint. |

## 5. Data model

### 5.1 Data classification

| Class | Fields | Tutor | Admin detail | Guardian CV | Public route |
|---|---|---:|---:|---:|---:|
| Public professional summary | profile photo, Tutor ID, name, headline, general service location, institution, education summary, subjects, levels, experience, tuition mode, languages, about, verified badge | Yes | Yes | Yes | Existing behavior only |
| Guardian-CV professional detail | education records without ID-card number, teaching method, tuition place/style, availability, fee range, teaching experience/approach, selected service areas | Yes | Yes | Yes | No |
| Private contact and identity | email, primary/additional phone, present/permanent address, nationality, religion, NID, social links, parents’ names/phones | Yes | Yes | No | No |
| Private operations | emergency contact, University ID file/metadata, document review status/reason, internal moderation notes, sensitive-access audit | Yes, own status only | Yes | No | No |

### 5.2 User-entered, derived, and system-generated values

| Source | Values |
|---|---|
| User-entered Tutor data | Personal, family, emergency, education, tuition, availability, service-area, and University ID upload information described below. |
| Derived data | Completion percentage, availability summaries, Guardian-safe service-area labels, current qualification summary, and verified badge eligibility. |
| System-generated data | Tutor ID, timestamps, profile status, document status, document revision, review timestamps, Admin reviewer ID, signed document URL, and privacy-audit events. |

### 5.3 Persisted entities and schema changes

New sensitive data must not be inserted into the public `tutors` table or serialized JSON blobs. The proposed relational entities below preserve separate access control, precise validation, and future deletion/audit handling.

| Entity | Purpose and essential fields | Relationship and indexing |
|---|---|---|
| `tutor_private_profiles` | One private profile per Tutor: additional phone, present/permanent address, nationality, religion, encrypted NID ciphertext, non-sensitive NID last four digits, and normalized social links | Primary key `tutorId` → `tutors.id`. Never selected by public/Guardian queries. |
| `tutor_family_contacts` | Parent/guardian name and phone with `kind` of `father`, `mother`, or `guardian` | `tutorId` foreign key; unique `(tutorId, kind)`; never included outside Tutor/Admin detail. |
| `tutor_emergency_contacts` | Emergency name, relation, phone, and address | One current contact per Tutor in this scope; primary/unique `tutorId`; private-only. |
| `tutor_education_records` | Repeatable qualification: level, institute, degree/exam title, major/group, encrypted institution ID-card number, result, curriculum, study-from/to dates, passing year, and current-institute flag | `id` primary key, `tutorId` foreign key, indexed by `(tutorId, displayOrder)`. At least one record is required at submission. |
| `tutor_availability_slots` | Exact recurring schedule: day of week, start minute, end minute, and optional note | `id` primary key, `tutorId` foreign key, indexed by `(tutorId, dayOfWeek, startMinute)`. It augments, not deletes, the existing day/time-category selections. |
| `tutor_tuition_details` | One extended preference row: teaching method narrative, tuition place/style, preferred salary context, and total-experience narrative | Primary key `tutorId`. Current `mode`, `monthlyFeeMin`, and `monthlyFeeMax` remain the matching source of truth. |
| `tutor_verification_documents` | Auditable University ID revisions: document type fixed to `university_id`, private storage key, file MIME/size, status, rejection/request-change reason, reviewer, timestamps, replacement/removal lifecycle | `id` primary key; index `(tutorId, status, createdAt)` and current-document lookup. Raw storage key is server-only. |
| `tutor_sensitive_access_audits` | Content-free access evidence: Admin user ID, Tutor ID, action (`private_detail_view` or `university_id_view`), and timestamp | Indexed by `(tutorId, createdAt)` and `(adminUserId, createdAt)`. It records no field values, document URL, NID, or contact information. |

The existing `tutor_academic_profiles.degreeMajorId` field is retained and should be surfaced in the Tutor form as the current academic summary. The new repeatable education table complements it; it does not replace catalog-backed university/faculty/department references in the initial migration.

### 5.4 Migration order and retention implications

The implementation must first add all nullable/new tables and indexes, then deploy server code that understands both legacy and expanded rows, then expose new UI. Existing profiles are not auto-submitted or auto-verified. A Tutor must save and submit their own expanded data.

Private records must be deleted when the Tutor account is permanently deleted. University ID objects require a server-side deletion path when replaced, removed, or when the account is deleted. The exact retention period for rejected/replaced University ID images is an **open policy decision**; implementation must not silently retain them indefinitely. Until a retention period is approved, a replacement should mark the prior revision as superseded and retain it only as long as the existing moderation/audit policy permits.

## 6. Field and validation contract

### 6.1 Personal and private identity section

| Field | Submission rule | Visibility and validation |
|---|---|---|
| Profile photo, full name, gender, date of birth, professional headline, primary Bangladesh phone, contact email | Existing required fields remain required | Existing validation remains authoritative. Phone and email remain private from Guardian/public DTOs. |
| Additional phone, present address, permanent address, nationality, religion, social links | Draft-optional | Trimmed length limits; URLs must be `https` only for social links; private from Guardian/public DTOs. |
| NID | Draft-optional and not used as verification in this phase | Digits-only normalized input. Store encrypted value plus a display-safe last-four suffix. Never return the full NID to browser payloads after save, audit logs, error messages, analytics, or Guardian/public DTOs. |
| Father, mother, and optional guardian names/phones | Draft-optional | Names and Bangladesh-phone validation; private from Guardian/public DTOs. |

Because the project does not currently provide an approved application-level PII encryption key, handling a full NID is blocked until a server-only encryption secret and rotation/recovery policy are approved. The UI may collect no NID value until that prerequisite is present. This does not weaken the user’s approved data scope; it prevents an unsafe plaintext implementation.

### 6.2 Education and University ID section

| Field | Submission rule | Validation |
|---|---|---|
| Current academic summary: university, faculty, department, degree/major, study status | University, faculty, department, study status remain required; degree/major becomes required under the expanded full profile | Must use active catalog records and preserve existing parent-child catalog checks. |
| Repeatable qualification records | At least one completed record required | Maximum 8 records; unique sort order; institute and qualification fields required; from/to dates valid; start must not exceed end; passing year 1950 through current year + 10; `currentInstitute=true` requires no passing year/end date. |
| Qualification-sensitive ID-card number | Optional | Encrypted at rest and Admin/Tutor-only. It does not appear in CV data. |
| University ID image | Required before review submission | One current image only; JPEG, PNG, or WebP; server-enforced size/dimension limits aligned with the existing private image-upload pattern; private storage; no client-provided storage key. |

The University ID approval state is independent of existing profile moderation. A document upload/replacement transitions the document to `pending_review`. An Admin’s `approved`, `changes_requested`, or `rejected` decision changes only the document state. The existing profile’s `verified` value can be set to true only when the profile itself is approved and the current University ID is approved.

### 6.3 Tuition, place, availability, and experience section

| Field | Submission rule | Validation |
|---|---|---|
| Tuition type, preferred student gender, class size, selected teaching days, time categories, teaching language, communication preference | Existing required fields remain required | Existing enum and duplicate-selection validation remains authoritative. |
| Exact weekly availability slots | At least one slot required | Day is a controlled enum; 0 ≤ start minute < end minute ≤ 1440; maximum 21 active slots; overlapping slots on the same day are rejected. |
| Teaching method and tuition place/style | Required | Controlled option plus optional explanatory text with a 500-character limit. It must stay consistent with selected tuition type. |
| Service location and at least one teaching area | Existing requirements remain required | Exact private address is separate; Guardian CV uses current city/general teaching areas only. |
| Minimum/maximum monthly fee | Required | Integer 0–500,000 and minimum ≤ maximum. |
| Tuition experience total and details | Existing years field remains required; narrative is draft-optional | Years 0–60; detail max 2,000 characters; no Guardian/student identity, address, phone, or private contact data in public-facing copy. |

### 6.4 Emergency contact

Emergency name, relation, phone, and address are available as draft-optional profile fields. The phone must follow the Bangladesh format already used by Tutor contact validation. The record is never a Guardian/public field and is not required to submit the professional profile.

### 6.5 Expanded completion and submission rules

Draft saving accepts partially complete profile data and shows actionable, allowlisted field errors. Submission remains server-authoritative and additionally requires the following fields beyond the current submission list: degree/major, at least one valid education record, at least one exact availability slot, teaching method, tuition place/style, and a current University ID document in `pending_review` or `approved` status. A Tutor cannot become `verified` without an approved University ID.

The completion percentage must use named units rather than raw database-column count. It should represent the professional profile requirements, not reward entry of NID, parent, emergency, or address data. Those sensitive fields must never become mandatory merely to reach 100% completion.

## 7. Server procedures and DTO contracts

All procedures are tRPC procedures guarded on the server; frontend route guards are not authorization.

| Procedure | Guard | Input | Safe output/behavior |
|---|---|---|---|
| `tutor.getMyProfile` (extend) | Authenticated active Tutor | None | Existing owner DTO plus own private/profile-v2 DTO and document status. Never returns a raw storage key or full stored NID after persistence. |
| `tutor.saveProfileDraft` (extend) | Authenticated active Tutor | Expanded strict draft schema | Persists only own records; returns owner-safe DTO, completion, and safe field errors. |
| `tutor.submitProfile` (extend) | Authenticated active Tutor | Expanded submission schema | Validates all current and new mandatory professional fields; changes profile status using the current workflow only when valid. |
| `tutor.uploadUniversityId` | Authenticated active Tutor | Server-controlled file upload input | Validates file server-side; stores private object; creates pending document revision; returns safe status only. |
| `tutor.removeUniversityId` | Authenticated active Tutor | Current document identifier, if needed | Marks/removes own pending/current document safely and recalculates submission readiness. |
| `tutor.getGuardianCvPreview` | Authenticated active Tutor | None | Returns the same Guardian-CV DTO the Guardian procedure would return, without any private contact or document data. |
| `guardian.getTutorCv` | Authenticated active Guardian | Approved `tutorId` | Returns only a server-built Guardian-CV DTO for an approved profile. Fails generically for missing, unauthorized, or non-approved Tutors. |
| `admin.getTutorReview` (extend) | Active Admin | `tutorId` | Returns a complete private Tutor-review DTO and records one `private_detail_view` audit event. |
| `admin.getTutorUniversityIdReviewUrl` | Active Admin | Current document identifier | Checks document/tutor relationship; records `university_id_view`; returns a short-lived review URL only. |
| `admin.reviewTutorUniversityId` | Active Admin | Document ID, `approved`/`changes_requested`/`rejected`, optional controlled reason | Changes only document state, writes reviewer/timestamp, never returns raw file metadata to Guardian/public clients. |

The existing public `tutors.list`, `tutors.listPage`, and `tutors.byId` procedures must not be extended with profile-v2 private fields. The Guardian CV projection is a distinct DTO with an explicit allowlist.

## 8. UI component plan

### 8.1 Tutor panel profile workspace

The existing sectioned workspace remains the editing surface. New sections and subpanels should use the established desktop section navigation and mobile stepper rather than a second competing form.

| Workspace area | Components and behavior |
|---|---|
| Personal information | Existing identity/contact fields plus a disclosure-marked **Private information** panel for additional contact, addresses, nationality, religion, NID, social links, and family contacts. Each private field states “Visible to you and Admin only.” |
| Education and credentials | Current academic summary selectors, repeatable `EducationRecordEditor`, add/reorder/remove controls, and `UniversityIdUploadCard` with pending/approved/changes-requested status. |
| Tuition and availability | Existing subject/curriculum/preference controls plus `AvailabilitySlotEditor`, teaching method, tuition place/style, fee range, and service-location guidance. |
| Emergency information | Collapsible `EmergencyContactForm` labelled private and non-public. |
| Summary and CV preview | `TutorProfileSummary` shows completion/status/document state. **View as Guardian** opens a responsive preview using the Guardian CV DTO, with a clear privacy notice and no download button. |

### 8.2 Admin Tutors profile tab

The existing directory stays as a low-risk list. Selecting a Tutor opens a full-detail review page or side panel with grouped professional, private identity, family, emergency, education, availability, and document blocks. Sensitive blocks require explicit section headings and a “Private — Admin only” marker. The University ID viewer uses a fetch-on-demand action rather than embedding a persistent image URL.

### 8.3 Guardian CV

The Guardian CV is a responsive read-only page/card reachable only in an authenticated Guardian session. It includes profile photo, Tutor ID, headline, verified/profile status where appropriate, non-exact service location, qualification summaries, teaching subjects/classes/curricula, experience, teaching method, tuition place/style, weekly availability, fee range, languages, and teaching approach. It has no edit controls, download action, private contact block, or document viewer.

## 9. Error handling, accessibility, and responsiveness

Server validation errors must continue through the allowlisted Tutor field-error contract. New editable field keys must be added deliberately to that allowlist; unknown nested storage, encryption, document, or database error paths must resolve to a generic safe recovery message.

All controls require visible labels, required/optional indicators, keyboard support, focus rings, semantic error messages, and `aria-live` status feedback for draft save, upload, review state, and submission. The private-data disclosure is explanatory content, not a substitute for authorization.

On laptop widths, the Tutor editor uses the current desktop navigation with readable two-column detail groups where appropriate. On 375 px mobile widths, education records, availability slots, review reasons, and CV sections become one-column stacked controls with no horizontal overflow. University ID upload/replace/remove controls must remain keyboard and touch accessible.

## 10. Acceptance criteria

| ID | Given / When / Then |
|---|---|
| AC-01 | **Given** a Tutor has a legacy profile, **when** they open the workspace, **then** current saved values load and the profile remains editable without data loss. |
| AC-02 | **Given** a Tutor saves a draft with partial expanded data, **when** they save, **then** it succeeds if each provided value is structurally valid and no sensitive value appears in a client error payload. |
| AC-03 | **Given** a Tutor tries to submit, **when** they lack an education record, availability slot, fee range, teaching method, tuition place/style, or University ID, **then** the server rejects submission with safe, field-level recovery guidance. |
| AC-04 | **Given** a Tutor selects online/both tuition, **when** nationwide availability is false, **then** server validation continues to reject the profile. |
| AC-05 | **Given** a Tutor uploads/replaces a University ID, **when** validation succeeds, **then** the document becomes pending review and no storage key is present in browser data. |
| AC-06 | **Given** an active Admin opens a Tutor detail, **when** the authorized response is created, **then** the Admin sees the user-approved full profile and an audit event without PII values is created. |
| AC-07 | **Given** an Admin opens the University ID, **when** the file is requested, **then** a short-lived URL is issued after authorization and a document-view audit event is created. |
| AC-08 | **Given** a signed-in Guardian opens an approved Tutor CV, **when** the route loads, **then** it contains only the Guardian-CV allowlist and never includes phone, email, exact address, NID, parents, emergency contact, social links, ID-card number, document URL, storage key, or internal notes. |
| AC-09 | **Given** an anonymous visitor or non-Guardian role requests the Guardian CV procedure, **when** authorization runs, **then** access is denied before any Tutor CV data is returned. |
| AC-10 | **Given** the expanded profile is viewed at desktop and 375 px widths, **when** records, availability, document state, and CV preview are rendered, **then** the layout remains readable, keyboard operable, and free of horizontal overflow. |

## 11. Open policy prerequisite

The user-approved scope includes NID. A full NID must not be stored in plaintext. Before the NID field is activated, the implementation needs a server-only encryption secret, a documented key-rotation/recovery procedure, and an approved retention period for superseded/rejected University ID objects. These are release prerequisites for the sensitive-data tickets, not reasons to expose a less secure interim field.

## 12. Internal project sources used

This specification is grounded in the current project implementation and the user-provided reference images. The relevant internal sources are `drizzle/schema.ts`, `server/tutor-profile.validation.ts`, `server/db.ts`, `server/routers.ts`, `client/src/pages/TutorProfileWorkspace.tsx`, `client/src/pages/TutorProfile.tsx`, `client/src/pages/AdminTutorManagement.tsx`, and the reviewed reference inventory in `profile-reference-notes.md`.
