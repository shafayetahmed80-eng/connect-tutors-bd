# Tutor-Style Guardian Dashboard — Detailed Review and Implementation Guide

**Prepared:** 21 August 2026  
**Status:** Review and implementation guidance only. No production behavior, permissions, or database data has been changed by this document.

## Executive guidance

The requested information architecture is appropriate for a Guardian portal: it gives a Guardian one consistent, private place to manage their account and tutor request. The platform already implements the **core protected dashboard**, the request journey, account identity, controlled Profile updates, password change, private request history, request-progress guidance, and a moderated Guardian photo. The remaining work is not a visual clone; it concerns the product rules behind Attendance, Confirmation Letter, phone changes, Exclusively Yours, and Guardian Community. [1] [2]

> **Recommended design principle:** Match the Tutor Dashboard’s clear sidebar, grouped navigation, card-based overview, responsive behavior, and honest “coming later” messaging—while keeping Guardian data private by default and never exposing it to Tutors or the public Job Board.

The Guardian Dashboard should therefore be treated as a **private account workspace**, not a public Guardian profile. Guardian email, phone, exact address, student identity, notes, and images must not flow into Tutor-facing views or Job Board records. [3]

## What is already available

| Requested area | Current status | What the Guardian can do or see today | Notes |
|---|---|---|---|
| Sidebar identity header | **Implemented** | Logo, approved Guardian photo or initials fallback, name, email, opaque Guardian ID, and actual account-creation date. | Use Guardian ID only. No synthetic Student ID. [1] |
| Dashboard | **Implemented** | Account identity, a request-progress summary, count, and next-step guidance sourced from real request state. | It does not claim that a Tutor is matched when the request is only published/reviewed. [2] |
| Hire a Tutor | **Implemented** | Guided multi-step private request, preview/edit-back, draft recovery, duplicate-submit protection, and a truthful confirmation receipt. | Admin confirmation remains required before a job is public. [3] |
| Profile | **Implemented** | Controlled name/location/gender display and update, protected email/phone display, photo upload/removal, and review status. | Photo is shown only after Admin approval. [1] |
| Attendance | **Truthfully deferred** | “Available after a Tutor is confirmed” or “Attendance setup is not available yet.” | No fictional timetable, percentage, payment, or session record is shown. [4] |
| Posted Jobs | **Implemented for v1** | Private owned-request history and authoritative request-progress explanations. | It is not a public Job Board mirror. [4] |
| Settings | **Partially implemented** | Current-password-protected password change and support guidance. | Phone/email changes require a verified workflow and remain deferred. [1] |
| How it Works | **Implemented** | Guardian-facing explanation of request, Admin review, confirmation call, Job Board, matching, and support. | It does not promise automatic matching or a guaranteed timeline. [2] |
| Confirmation Letter | **Planned** | Honest placeholder only. | Eligibility, signatory, language, and revocation policy are still undefined. [1] |
| Exclusively Yours | **Planned** | Honest placeholder only. | The content/benefit model is not yet approved. |
| Join Guardian Community | **Planned** | Honest placeholder only. | Community moderation, consent, and membership rules are not yet defined. [1] |

## Recommended sidebar design

The Guardian sidebar should use the same visual hierarchy as the Tutor Dashboard, but with Guardian-specific content. The existing shared dashboard shell already supports grouped navigation, mobile collapse, identity slots, active paths, planned states, and sign-out actions. [5] [6]

### 1. Sidebar header — the Guardian identity card

The identity card should sit at the top of the desktop sidebar and become a compact block in the mobile menu. It should include the brand logo, an approved photo or initials fallback, display name, account email, **Guardian ID**, and “Member since” date. The photo is a private account feature; it must not imply public visibility or Tutor access.

| Header field | Source and display rule | Why this rule matters |
|---|---|---|
| Logo | Connect Tutors BD brand asset, linked to the protected dashboard home. | Gives a safe, predictable return route. |
| Photo | Show only a Guardian-owned photo in `approved` moderation status; otherwise show deterministic initials. | Prevents unreviewed imagery from becoming visible as a trusted identity marker. [1] |
| Name | Guardian’s controlled profile display name. | Lets the Guardian recognise their account. |
| Email | Account email, visible only to the account owner. | Helpful for login ownership without exposing it elsewhere. |
| Guardian ID | Existing stable opaque support-facing ID, e.g. `GDN-…`. | Support can identify the account without showing an internal numeric key. [1] |
| Student ID | **Do not show in v1.** | The current model is Guardian-account and request based; no approved student-ID issuer or lifecycle exists. [1] |
| Creation date | Account creation timestamp, formatted in the Guardian’s local browser locale. | Establishes account age without duplicating stored data. |

### 2. Navigation groups

The wording should remain English-first, as requested. Use short labels and one concise subtitle per destination. Planned destinations must be visibly labelled as unavailable rather than acting like empty live pages. This is the same truthful pattern already used by Tutor Dashboard planned tabs. [5]

| Group | Sidebar item | Status | Recommended purpose |
|---|---|---|---|
| **Active workspace** | Dashboard | Live | Home, request-progress summary, recommended next action. |
|  | Hire a Tutor | Live | Start or resume the private request journey. |
|  | Profile | Live | Controlled profile details and photo moderation state. |
|  | Attendance | Deferred | Truthful pre-match/deferred state; later, actual attendance only after its domain rules are approved. |
|  | Posted Jobs | Live | Owned request history and status; not public listings. |
|  | Settings | Partially live | Password change now; phone/email workflow clearly marked as requiring verification/support. |
| **Guidance** | How it Works | Live | Process explanation, privacy safeguards, WhatsApp support route. |
| **Coming later** | Confirmation Letter | Deferred | Requires a document eligibility and revocation policy. |
|  | Exclusively Yours | Deferred | Requires an approved benefits/content catalog. |
|  | Join Guardian Community | Deferred | Requires channel, consent, moderation, and reporting rules. |
| **Account** | Sign Out | Live | Secure logout using the shared dashboard action. |

## Tab-by-tab detailed guideline

### Dashboard tab — “What should I do next?”

This is the most important Guardian screen. It should contain **only authoritative data** and should help a Guardian act without needing to understand internal Admin workflow names. The primary card should show the latest request’s human-readable status, any expected Guardian action, and a single appropriate button. For example, “Coordinator reviewing” can tell the Guardian that a coordinator may call to verify the request; “Waiting for your confirmation” can show support contact; “Published” can show the safe public Job ID and expiry to its owner; and “Matched” can explain the next private coordination step.

| Dashboard module | Required behavior | Never do |
|---|---|---|
| Welcome/identity | Use the signed-in Guardian’s actual name and private account context. | Do not treat email or a Guardian ID as public profile data. |
| Request-progress card | Derive label and next action from server-authoritative request, publication, and match fields. | Do not infer a match from “published” or invent a Tutor name. [3] |
| Summary metrics | Show owned request count and safely scoped status counts. | Do not show public Job Board totals as a Guardian account metric. |
| Primary action | “Hire a Tutor,” “Review request,” or “View Posted Jobs” depending on current state. | Do not create multiple competing call-to-action buttons. |
| Support route | Present WhatsApp/call help for human assistance. | Do not claim an automated support chat or guaranteed response time if none exists. |

**Recommended refinement:** Add an “Open requests” mini-list of up to three Guardian-owned requests with status, last changed date, and a “View history” link. This is a low-risk enhancement because it reuses the existing private request history and does not create a new lifecycle.

### Hire a Tutor tab — private request creation

The existing three-step journey, review page, and submission receipt already provide the right operational structure. It should remain its own focused flow rather than becoming a long Dashboard form. The optional introduction can be a dismissible, non-blocking information card explaining that an Admin may call before publication.

The form must continue to validate the canonical Bangladesh location selection, tuition type, course/class, subject, schedule, budget, learner information, and notes according to the current request contract. Review/edit-back and duplicate-submit protection must remain. A submitted request should clearly state that it is **not yet a public job** and that the Guardian’s phone, email, exact address, student identity, and notes remain private. [3]

The “How did you hear about us?” field is not necessary for matching. It should be added only if the business purpose, allowed options, optional status, retention period, and Admin visibility are approved. [1]

### Profile tab — private identity and photo management

The Profile tab should be a two-column card layout on desktop and a single-column flow on mobile. The first card presents account identity; the second presents the moderated photo process; the third allows controlled edits. Email and mobile must be visibly **protected account/contact details**, not uncontrolled editable inputs. [4]

| Profile section | Current/recommended behavior | Constraint |
|---|---|---|
| Profile photo | Upload JPEG/PNG/WebP within server-enforced size/dimension limits; show pending/rejected/approved state; permit removal/replacement. | Only approved photo appears in the identity header. |
| Basic details | Allow controlled display-name, approved gender, and canonical location updates. | Every update is owner-bound and audit-safe. [1] |
| Guardian ID | Read-only, stable, support-facing. | Never use an internal primary key. |
| Email | Read-only in this release. | Changing it requires separate ownership verification. |
| Mobile number | Read-only for now. | A new number cannot replace the active contact until verified. |
| Rejection feedback | Use standardised reason plus optional courteous note. | Do not display internal Admin notes or reviewer identity unnecessarily. |

### Attendance tab — defer honestly until the education relationship exists

Attendance is a separate operational module, not a simple UI card. It requires an agreed Tutor confirmation/acceptance point, one or more students, lesson ownership, time zone, schedule edits, Tutor/Guardian dispute mechanics, corrections, absence reason policy, and perhaps payment reconciliation. Until those rules exist, the current message is correct: attendance becomes relevant only after a Tutor is confirmed, and no record is being fabricated. [4]

Before building this feature, approve the following: who can mark attendance, whether both Tutor and Guardian can dispute a record, whether a session can be edited after approval, whether attendance affects payment, whether a Guardian can have multiple students/tutors, and retention/export rules.

### Posted Jobs tab — private request history, not a public listing page

The label “Posted Jobs” is acceptable when accompanied by a plain-language explanation. The content should show only requests owned by the logged-in Guardian and derive its timeline from authoritative request/publication data. It may show request reference, submitted/updated date, readable status, safe published Job ID, publication expiry, and next action. It must never show internal Admin contacts, other Tutors’ interest details, Guardian’s own raw contact fields, exact address, free-text notes, or unconfirmed Tutor details. [3] [4]

Use a status vocabulary that makes the distinction clear:

| Guardian-facing label | Meaning | Suggested action |
|---|---|---|
| Submitted | Connect Tutors BD received the private request. | Wait for review or contact support if correction is needed. |
| Coordinator reviewing | Details are being checked before any publication decision. | Keep phone available for confirmation. |
| Confirmation needed | A material detail needs Guardian confirmation. | Contact support/answer the coordinator call. |
| Published | A privacy-safe tuition job is available to eligible Tutors until its stated expiry. | Review the summary; no Guardian contact is shared. |
| Matching in progress | Admin is privately coordinating suitable Tutor interest. | Wait for a private update. |
| Matched | A Tutor has been confirmed through the Admin process. | Follow private coordination guidance. |
| Closed/expired | The request is no longer active. | Start a new request or contact support if appropriate. |

### Confirmation Letter tab — do not issue a document prematurely

This should remain a planned tab until the business meaning is approved. The platform must decide whether the letter confirms account registration, a submitted request, a published job, an accepted Tutor match, or a service relationship. It also needs a signatory, valid-from/valid-until rule, document language, downloadable format, verification method, correction path, and revocation policy.

The safe initial release is a static explanation: “A confirmation letter will appear here once its eligibility rules are available.” Do not generate downloadable letters merely because the account exists or a request is submitted. [1]

### Settings tab — account security, not general profile editing

Keep Profile and Settings separate. Profile manages controlled display/location details and photo; Settings manages credentials and verified contact ownership. The implemented password flow must continue to require the current password, enforce password strength/confirmation, never show password material in error or audit output, and give truthful recovery/support guidance. [1] [4]

Phone change requires a real decision before it is enabled. The preferred self-service model is Bangladesh SMS/OTP verification of the new phone number before activation. If that provider is not ready, use Admin-assisted confirmation as an explicitly labelled temporary process; do not enable a simple “Save new number” control. Email change should also remain deferred until a verified ownership flow exists.

### Exclusively Yours — build the content promise before the screen

“Exclusively Yours” should not become an empty promotional destination. First define what the Guardian receives: curated learning resources, admission/calendar reminders, parenting guides, member benefits, priority support, or something else. For each item, define entitlement, expiry, content owner, legal claims, and whether it requires a paid plan. The first safe release can be a static, editorially managed resource library with no personal data or eligibility claim.

### How it Works — trustworthy operational guidance

This active tab should remain a concise timeline: create a request; Admin reviews details; Guardian receives a confirmation call; an approved privacy-safe job may be published; interested Tutors are reviewed by Admin; a suitable Tutor is coordinated privately; and support is available by WhatsApp. It must repeatedly state that publication is not automatic matching and that Guardian contact/address information is not public. [2] [3]

### Join Guardian Community — start with consent, not an embedded chat

Before adding a community link, decide whether the destination is a WhatsApp group, Facebook group, Telegram channel, email newsletter, or an on-platform forum. Each path has different invitation, consent, reporting, moderation, retention, child-safety, and exit requirements. The lowest-risk first step is an external community information card with an explicit opt-in link, a clear “you will leave Connect Tutors BD” notice, and a statement that group moderation is separate from tutor matching.

## Visual and experience parity with Tutor Dashboard

The Tutor Dashboard provides a useful implementation pattern: a blue branded page header, grouped sidebar sections, role-specific navigation, concise cards, readable empty states, and planned tabs explicitly marked as “Coming later.” [5] The Guardian Dashboard should match this *interaction and information design*, not copy Tutor-specific content such as public profile verification, payment, certification, or Tutor request inboxes.

| Design dimension | Tutor pattern to reuse | Guardian-specific adaptation |
|---|---|---|
| Shell | Shared responsive sidebar and mobile menu. | Use Guardian header/identity DTO and Guardian-only links. |
| Header | Branded blue hero with title and contextual metadata. | Show request-account context, not Tutor verification metrics. |
| Main dashboard | 2–3 summary cards plus one primary action. | Request progress, open requests, and next Guardian action. |
| Empty state | Honest explanation of what is not active yet. | Use truthful Attendance, letter, benefits, and community language. |
| Privacy copy | Tutor-facing contact privacy is explicit. | Reinforce that Guardian contact remains private to Admin workflows. |
| Navigation guards | Prevent loss of unsaved profile changes. | Preserve the same protection for Profile/Hire a Tutor drafts. |
| Mobile | Sidebar collapses; content uses readable card spacing. | Keep identity information wrapping, photo controls, and long status text accessible at 375 px. |

## Privacy, security, and accessibility rules

| Area | Non-negotiable implementation rule |
|---|---|
| Public Job Board | Guardian phone, email, exact address, student identity, raw notes, and unapproved photos must never enter its projection. [3] |
| Tutor visibility | Tutors can express interest through the protected workflow but never receive Guardian contact details. [3] |
| Profile ownership | Every read/write route uses authenticated Guardian ownership, with no client-provided account ID deciding access. [1] |
| Photo moderation | Only an approved image is visible in the Guardian identity header; Admin review remains controlled and audited. [1] |
| Admin publication | Guardian call confirmation remains mandatory before public job publication; material edits require reconfirmation. [3] |
| Passwords | Current password is required for change; no password appears in logs, UI message, audit snapshots, cache, or support note. [1] |
| Mobile accessibility | Every control needs a visible label, keyboard focus, error association, and responsive layout. Long IDs/statuses must wrap rather than truncate. |
| Empty states | Planned features must clearly say what is not yet available and what will trigger availability. | 

## Recommended implementation priorities

The current foundation makes the following sequence practical. Each numbered item should become a small specification/ticket set before code changes if it introduces a new data lifecycle.

| Priority | Work item | Why it is next | Decision required |
|---|---|---|---|
| P0 — preserve | Continue using existing Guardian identity, photo moderation, controlled Profile, password change, request-progress, and private history modules. | These are the working core. | None. |
| P1 | Refine the Dashboard overview with an “open requests” list and a single action per request state. | Improves clarity by reusing existing authoritative data. | Confirm the maximum list length and whether “last updated” is desired. |
| P1 | Upgrade planned-tab presentation with icon, status badge, concise explanation, and support/learn-more route. | Better Tutor-style parity without faking unavailable functionality. | Approve the exact coming-soon wording. |
| P2 | Specify Guardian phone re-verification. | Required before the requested phone-update function can be safely enabled. | SMS/OTP or Admin-assisted flow; provider/ownership policy. |
| P2 | Specify Confirmation Letter eligibility and document lifecycle. | Needed before any letter can be issued/downloaded. | Eligibility, signatory, languages, revocation, verification. |
| P3 | Specify Attendance domain model after Tutor confirmation. | It affects schedules, disputes, payment, and learner identity. | Authority, session ownership, multiple students/tutors, retention. |
| P3 | Define Exclusively Yours and Community policies. | Prevents empty marketing screens or unsafe communication features. | Content/benefit catalog and community channel/moderation/consent. |

## Suggested acceptance criteria for the next UI refinement

If the immediate goal is to make the Guardian workspace visually comparable to the Tutor dashboard without starting new business workflows, approve this limited scope:

| Criterion | Testable outcome |
|---|---|
| Consistent shell | Guardian uses the existing responsive sidebar shell, blue branded page header, grouped navigation, and mobile menu behavior. |
| Complete identity header | Sidebar shows logo, approved photo/fallback, name, email, Guardian ID, and account-created date; it does not show Student ID. |
| Clear Dashboard priority | Every active Guardian request displays exactly one server-derived next action and no fabricated match/attendance data. |
| Honest planned tabs | Attendance, Confirmation Letter, Exclusively Yours, and Community state why they are unavailable and do not imply released features. |
| Privacy | No Guardian contact/address/student identity/note/photo enters public/Tutor-facing content. |
| Responsive/accessibility | Desktop and 375 px mobile checks pass; labels, focus, alerts, buttons, and long status strings remain accessible. |
| Regression safety | Existing Guardian profile, photo, password, Posted Jobs, request-progress, Job Board, and Admin confirmation tests remain green. |

## Decisions requested

Please choose or approve the following before any new feature implementation:

| Decision | Recommended choice |
|---|---|
| Should the next work be **visual refinement only** or include new business functions? | Start with visual refinement and Dashboard “open requests” cards. |
| Student ID in the sidebar? | **No.** Keep Guardian ID only until an actual student-identity model is approved. |
| Phone update method? | **SMS/OTP** when a provider is approved; Admin-assisted confirmation only as a clearly marked interim option. |
| Confirmation Letter trigger? | Define it separately before implementation; do not issue one on signup/request submission by default. |
| Attendance launch point? | Only after a Tutor is officially confirmed and the attendance authority/dispute rules are approved. |
| Community first release? | External opt-in information/consent card, not an embedded chat or automatic group enrollment. |

## References

[1]: ./guardian-workspace-completion-tickets.md "Guardian Workspace Completion tickets and deferred-feature boundaries"

[2]: ./guardian-admin-jobboard-grill-review.md "Guardian Dashboard, Admin moderation, and Job Board critical review"

[3]: ./guardian-admin-jobboard-grill-review.md#privacy-security-and-operational-guardrails "Guardian privacy, publication, and Tutor-interest safeguards"

[4]: ../client/src/pages/GuardianDashboard.tabs.test.tsx "Guardian Dashboard current tab behavior regressions"

[5]: ../client/src/pages/TutorDashboard.tsx "Tutor Dashboard navigation and planned-tab pattern"

[6]: ../client/src/components/DashboardLayout.tsx "Shared responsive dashboard shell"
