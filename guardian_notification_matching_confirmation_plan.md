# Guardian Notification, Admin Matching, and Confirmation Letter Plan

**Status:** Planning complete; implementation has not started.  
**Prepared for:** Connect Tutors BD  
**Scope:** Guardian lifecycle notifications, Admin matching operations, and confirmed-match confirmation letters.

## Approved decisions

| Area | Approved decision | Resulting behavior |
|---|---|---|
| Guardian notifications | Website inbox with unread badge | Every Guardian sees private in-dashboard status updates without email, SMS, or WhatsApp delivery in this release. |
| Notification triggers | Lifecycle updates plus Admin follow-up | Notify on Guardian-visible lifecycle changes and on Admin requests for Guardian action; suppress duplicate messages for the same event. |
| Admin filters | Operational filter set | Filter by matching requirements, assignment state, appointment confirmation, cancellation information, and recent activity. |
| Assignment notes | Categorised append-only timeline | Admins add time-stamped internal notes under structured categories; history cannot be silently overwritten or removed. |
| Letter generation | Admin preview and approval | A draft is generated after an appointment is confirmed; it becomes an immutable issued version only after Admin approval. |
| Letter recipients | Guardian and assigned Tutor | Both authorised parties receive a private dashboard copy of the issued letter. |
| Letter content | Operational schedule | Include approved match reference and agreed schedule information, but exclude private address, private notes, and personal contacts. |
| Letter language | Bilingual PDF | The issued document contains Bengali and English content in the same official PDF. |

> **Privacy boundary:** Address Details, Guardian private notes, phone numbers, email addresses, Student Name, Student Gender, and any unapproved personal data must not appear in the public Job Board, Tutor-generic screens, notification text, or the Confirmation Letter.

## 1. Guardian notification inbox

The Guardian dashboard will receive a new private Notifications area with an unread count badge in its existing navigation. Notifications will be created from authoritative lifecycle transitions only: **Pending**, **Live**, **Appointed**, **Confirmed**, and **Cancelled**. A separate Admin follow-up notification can request a Guardian action, such as confirming availability or supplying a needed clarification. It will link directly to the appropriate private request screen.

Each notification should contain a short title, plain-language message, linked Request ID, lifecycle value or follow-up type, created time, read time, and a deduplication key. The Guardian may mark one notification or all notifications as read. The system must never create a second notification for the same request, event type, and state transition.

| Component | Data and access rule | Acceptance criteria |
|---|---|---|
| Notification record | `guardianUserId`, `tutorRequestId`, type, title/message, action URL, read timestamp, deduplication key, created timestamp | Only the owning Guardian can list or mark their own notifications read. |
| Lifecycle notification service | Invoked only after a successful Admin/Guardian state-changing transaction | One notification is recorded per relevant transition; failed writes do not leave a misleading notification. |
| Guardian inbox | Paginated list, unread badge, empty state, single/all read controls | Keyboard-accessible and responsive on Android-sized screens. |
| Admin follow-up action | Admin-created template/category and target request | Message is private, actionable, auditable, and contains no protected contact/address details. |

## 2. Admin Matching operational filters and assignment notes

The matching workspace will retain its current matching controls and gain a responsive operational filter panel. On desktop, filters are visible in a structured toolbar; on mobile, they open in a filter drawer with an active-filter count and a reset control.

The approved filter set includes lifecycle status, tuition type, curriculum/category, subject, location, Tutor preference, budget range, created-date range, assigned/unassigned Tutor, appointment confirmed/not confirmed, cancellation state/reason, and last activity date. Results must stay private to authorised Admin users and use server-side filtering/pagination rather than downloading all requests to the browser.

Assignment notes will be append-only private records rather than a mutable text field. Each note must have an Admin author, timestamp, category, body, and request relation. Categories will be **Matching**, **Guardian contact**, **Tutor follow-up**, and **Internal risk**. Editing or deletion is excluded from this release; an incorrect note is corrected through a new follow-up note, preserving auditability.

| Component | Data and access rule | Acceptance criteria |
|---|---|---|
| Filter contract | Typed, server-validated optional filters and stable sorting/pagination | Filtered data returns only Admin-authorised request fields. |
| Filter UI | Desktop toolbar and mobile drawer | Active filters are understandable, removable individually, and resettable. |
| Assignment-note record | Request ID, Admin ID, category, note body, created timestamp | Only authorised Admin users can create or read notes; entries are append-only. |
| Assignment-note timeline | Request-level chronological history and category badge | No note content is visible to Guardians, Tutors, public job pages, maps, directions, or Telegram. |

## 3. Bilingual Confirmation Letter workflow

When an Admin has assigned a Tutor and completed the existing appointment confirmation, the system creates a **draft** confirmation letter. The document remains private and unissued until an authorised Admin reviews its values and explicitly approves it. Approval freezes an immutable issued version, assigns a Letter ID, stores the PDF in protected file storage, creates a private dashboard record for the Guardian and assigned Tutor, and produces in-app notifications for both parties.

The letter will include the Letter ID, issue date, related Request ID, assigned Tutor reference, curriculum/class, subject(s), tuition type, days per week, agreed start date, agreed fee or approved fee range, and package duration when applicable. The product needs an explicit Admin input/review field for any values that are not already approved and stored, particularly **agreed start date** and **agreed fee**. The letter must not include Address Details, private notes, direct contacts, Student Name, Student Gender, or unapproved terms.

Cancellation after a letter is issued must not silently overwrite the document. The request remains closed through the existing reason-required cancellation process, while the issued letter is labelled superseded/cancelled and retains its immutable original version for authorised records. Reissuing a letter creates a new version and revision reason; it never alters a previously issued PDF.

| Component | Data and access rule | Acceptance criteria |
|---|---|---|
| Letter draft | Generated only after the existing Admin confirmation guard succeeds | Cannot be drafted for Pending, Live, unassigned, or cancelled requests. |
| Admin review | Shows bilingual preview and editable approved operational fields before issue | Issuance requires explicit Admin approval and validates all required values. |
| Issued letter record | Request, Guardian, Tutor, issuer, letter number, version, status, issue time, storage key, revision reference | Guardian and assigned Tutor can access only their own issued copies; Admin can audit all. |
| PDF generation and storage | Server-side bilingual rendering to protected object storage | The app stores document metadata and protected file key, not file bytes in the database. |
| Recipient experience | Private dashboard card/list and in-app notification | Accessible download/view action, clear issued/superseded state, and no public route. |

## Ordered implementation tickets

| Ticket | Outcome | Dependencies | Key verification |
|---|---|---|---|
| **NMC-01** | Add private notification, assignment-note, and confirmation-letter schema with additive migrations and appropriate indexes | Existing lifecycle fields | Migration review; database query verification; privacy-column review. |
| **NMC-02** | Add transactional lifecycle notification helpers and Guardian/Admin protected procedures | NMC-01 | Unit tests for ownership, deduplication, unread/read state, and failure paths. |
| **NMC-03** | Build Guardian notification inbox, badge, empty/error/loading states, and deep links | NMC-02 | Component tests; desktop/mobile screenshot review; keyboard navigation tests. |
| **NMC-04** | Add typed server-side operational filters and append-only Admin assignment notes | NMC-01 | Authorisation, filter-combination, pagination, and note-audit tests. |
| **NMC-05** | Build responsive Admin filter toolbar/drawer and assignment-note timeline | NMC-04 | Desktop/mobile visual review; focus and no-overflow checks. |
| **NMC-06** | Implement letter draft, Admin review/approval, bilingual PDF rendering, versioning, and protected storage | NMC-01; existing appointment confirmation | Tests for lifecycle gate, recipient access, revision, cancellation/supersession, and prohibited-data exclusion. |
| **NMC-07** | Build Guardian/Tutor letter access screens and recipient notifications | NMC-02; NMC-06 | Route/access tests, responsive review, protected-download tests. |
| **NMC-08** | Complete cross-feature security, privacy, accessibility, and release validation | NMC-01 through NMC-07 | Full Vitest suite, typecheck, build, diff audit, and role-specific desktop/mobile validation. |

## Explicit non-goals for this release

The first release does not send email, SMS, WhatsApp, or Telegram notifications to Guardians. It does not add saved Admin filter views, editable/deletable notes, public letter links, public verification by Letter ID, payment collection, or legal service terms beyond the approved operational confirmation content. These items can be separately specified later.

## Approval boundary

This document records the decisions already selected during planning. It is **not** an instruction to begin code changes. Implementation should begin only when the user explicitly approves this plan, for example by sending `/implement`.
