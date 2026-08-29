# Guardian Dashboard, Admin Moderation, and Job Board — Critical Review

**Author:** Manus AI  
**Review date:** 21 August 2026  
**Scope:** The requested Guardian Dashboard specification, the current protected Guardian workflow, the Admin publication/matching workspace, and the public/Tutor Job Board.

## Executive assessment

The current platform has a **sound operational core**: Guardian tutor requests are private by default, Admin publication is gated by a recorded Guardian confirmation call, public Job Board records use a separate privacy-safe projection, and Tutor interest is reviewed inside a 2FA-gated Admin workspace. The 14-day expiry and one reconfirmed extension rule is also correctly separated from the matching lifecycle.

The principal gap is now **Guardian self-service completeness**, rather than Job Board safety. The requested menu is visible, but five destinations remain intentionally marked “Soon”; the sidebar does not yet contain the requested rich Guardian identity header; and the Profile/Settings experience is read-only rather than a controlled self-service update process. These should not be treated as cosmetic changes, because phone, password, profile photo, and Guardian/Student ID requirements affect identity verification, account recovery, and privacy.

> **Core recommendation:** Do not imitate the reference screens mechanically. Keep the current privacy and Admin-confirmation guardrails, then complete the Guardian workspace through a data-model-first set of tickets: identity header and profile updates, secure Settings, request-status mapping, and only then informational/community pages.

| Area | Current assessment | Release readiness |
|---|---|---|
| Guardian request journey | Three-step request, preview, draft recovery, and truthful submission receipt are implemented. | **Ready, with one product decision pending** |
| Guardian sidebar and landing dashboard | Navigation exists, but the specified sidebar identity header and several destination screens are incomplete. | **Partially ready** |
| Guardian Posted Jobs | Private request history is embedded and does not disclose public Job Board data. | **Ready for v1** |
| Attendance | Truthfully deferred; it does not fabricate schedules, percentages, payments, or session logs. | **Correctly deferred** |
| Admin request publication | Verification, Guardian call confirmation, safe edit, publish/unpublish, expiry extension, and audit history exist. | **Ready** |
| Public and Tutor Job Board | Privacy-safe published tuition listings, filtering, count, pagination, area-only maps directions, and Tutor interest flow exist. | **Ready** |

## Evidence examined

The review considered the supplied visual references for Guardian dashboard navigation, request journey, Posted Jobs, Profile/Settings, How it Works, filters, and Job Board details. These images should be used as **information-architecture references**, not copied as a source of identity, contact, or listing data. The current project implementation was also inspected across `GuardianDashboard.tsx`, `GuardianRequestJourney.tsx`, `GuardianRequestTracking.tsx`, `AdminMatchingWorkspace.tsx`, `JobBoard.tsx`, and the shared dashboard layout.

| Evidence | What it establishes | Review implication |
|---|---|---|
| Guardian sidebar reference [1] | A profile-led workspace navigation pattern is expected. | The current menu is broadly aligned, but needs a dedicated identity header rather than a generic footer account menu. |
| Guardian request reference [2] | A structured, multi-stage tutor-request journey is expected. | The implemented three-step journey, preview, and receipt are suitable; the referral-source field remains undecided. |
| Posted Jobs reference [3] | Guardians expect an owned request/job history with readable progress. | v1 history is in place; status copy should be normalized around the actual request/publication lifecycle. |
| Job Board filter reference [4] | Filters and listing count must be prominent and scannable. | The current Job Board already provides advanced filters, count, pagination, and empty-state recovery. |
| Profile reference [5] | Guardians expect account information to be visible and maintainable. | Current profile is a private read-only summary, not yet a controlled update workflow. |
| Settings reference [6] | Name, phone, password, and verification requests need explicit handling. | These actions must be designed as secure workflows, not simple editable fields. |
| How it Works reference [7] | Guardians need to understand the operational matching sequence. | A concise, truthful process page should be implemented before community/promotional features. |
| Job detail reference [8] | Listing details should support Tutor action without exposing Guardian contact. | The existing area-only directions and Admin-mediated interest model remain the correct boundary. |

## Requirement-to-current-state matrix

| Requested experience | Confirmed current state | Gap or risk | Recommendation | Priority |
|---|---|---|---|---|
| Sidebar logo, photo, name, email, Guardian/Student ID, creation date | Generic shared sidebar shows an avatar fallback, name, and email in the footer. The dashboard hero shows initials. | There is no approved Guardian/Student ID definition, profile-image storage/moderation policy, or account-creation date display contract. | Create a Guardian identity DTO and a dedicated sidebar identity header. Do not display an invented Student ID. | P0 |
| Dashboard “important portion” | A welcome panel, request count, saved-location summary, account-active message, and next-step cards exist. | It does not yet clearly summarize **per-request** operational stage, latest Admin action, or the next expected Guardian action. | Add a small “Request progress” module sourced from actual request/publication states. | P1 |
| Hire a Tutor 3 pages, preview, submission notification | Implemented request fields, staged validation, preview/edit-back, session draft recovery, duplicate-submit guard, and truthful receipt. | “How did you hear about us?” is not currently captured. An intro/guideline is not a dedicated skip-able dashboard screen. | Keep current journey; decide referral-data purpose and consent before adding it. Make any intro optional and non-blocking. | P1 |
| Posted Jobs | Embedded private request history is implemented. | Guardians may confuse a request status with public Job Board publication or Admin matching status if labels are not fully explained. | Map request status, publication state, published Job ID, expiry, and matched/closed state into a single readable progression. | P1 |
| Profile | Private name, email, mobile, and location are viewable. | There is no edit/update workflow, avatar upload, or verified-attribute definition. | Add a staged profile-update flow with audit history for identity-relevant changes. | P0 |
| Settings | Menu item is intentionally planned. | A user cannot safely update phone/name or change password inside the account workspace. | Build Settings with password change requiring current password, and phone change requiring re-verification before it becomes active. | P0 |
| Attendance | Truthfully states that attendance records do not exist, even after a match. | No issue in the current v1 state. Implementing tables or percentages now would be misleading. | Keep deferred until lesson/session ownership, time zone, dispute, and payment rules are approved. | P2 / defer |
| Confirmation Letter | Menu is intentionally planned. | Issuing a document before a defined match/acceptance contract could misrepresent service status. | Define eligibility, signatory, language, and revocation rules first. | P2 |
| Exclusively Yours / community | Menu is intentionally planned. | Community features can introduce messaging, moderation, and consent obligations. | Ship static, privacy-safe information before any social/community interaction. | P3 |
| How it Works | Menu is intentionally planned. | The platform’s deliberate Admin confirmation process is not currently explained in one Guardian-facing place. | Implement a static, truthful process timeline with support route. | P1 |
| Admin receives, edits, and publishes requests only after calling Guardian | Implemented with 2FA-gated actions, call confirmation, safe edit, publication lifecycle, and audit history. | Admin editorial changes can be operationally significant. | Preserve the existing rule that an edit clears confirmation and requires a new Guardian confirmation. | P0—preserve |
| Job Board carries available tuitions, not Tutor profiles | Implemented as a separate published-job projection. | None found in reviewed surface. | Preserve this product boundary. | P0—preserve |
| Filters, count, cards, details, auto/manual Job ID, dynamic title | Implemented in the shared public/Tutor Job Board. | Filter persistence and analytics are product enhancements, not release blockers. | Consider URL-synced filters only after reviewing privacy and discoverability. | P2 |
| Maps directions | Implemented with area-level directions. | Exact address exposure would create a safety/privacy breach. | Preserve area-level routing only. | P0—preserve |
| Tutor “Express Interest”; Admin contacts Tutor; no Guardian contact disclosure | Implemented with Tutor-only controls and Admin review queue. | Admin needs clear process discipline when contacting interested Tutors. | Add a short Admin coordination playbook rather than exposing Guardian contacts. | P1 |

## Critical gaps and conflicts

### 1. “Guardian / Student ID” is ambiguous and should not be rendered until defined

The requested header combines a **Guardian ID** and a **Student ID**, but the present system models a Guardian account and one or more tutor requests rather than a verified student-identity record. Showing a synthetic number could confuse Guardians, support staff, and future confirmation letters.

The recommended model is a stable, non-sensitive **Guardian ID** issued at account creation, such as `G-0001503`, while any learner identifier remains optional and request-scoped. The product owner must decide whether a “Student ID” is actually needed; if it is, its issuer, relationship to multiple students, edit policy, and visibility must be defined before development.

### 2. Profile photo is an identity and storage decision, not just a visual element

The visual reference encourages a photograph, but the platform currently only has safe initials. Adding an upload control requires an approved file type/size policy, storage authorization, ownership rules, delete/replace behavior, image moderation expectations, and fallback behavior. The image must be visible only where product roles require it; it must never become part of the public Job Board projection by default.

### 3. Settings needs secure update mechanics

Name and phone changes should not be one-click edits. A phone change should use the existing Bangladesh-number validation and become effective only after verification. A password change should require the existing password, enforce the current password-strength rules, invalidate or rotate other sessions where feasible, and write a privacy-safe security audit event. The existing support-assisted recovery path should not be misrepresented as an automated email reset until such a flow is actually implemented.

### 4. Guardian status must distinguish request, publication, and match states

A single “Posted” badge is insufficient. A Guardian can have a request that is submitted, being verified, awaiting a Guardian call, approved for publication, published with an expiry date, temporarily unpublished, matched, or closed. Those states have different meanings and different expected Guardian actions. The implementation must derive status from authoritative lifecycle fields; it must not infer a match from a public Job Board listing or an Attendance tab.

### 5. Referral-source capture needs a legitimate purpose and privacy copy

“How did you hear about us?” can support marketing attribution, but it is not necessary for matching. The decision should identify the allowed choices, whether “Other” is free text, whether it is optional, how long the data is retained, and whether it appears in Admin views. Until then it should not be made mandatory in a high-friction request journey.

## Privacy, security, and operational guardrails

| Guardrail | Required implementation rule |
|---|---|
| Guardian contact privacy | Phone, email, exact address, student name/identity, and free-text notes must never enter the public Job Board or Tutor-facing interest workflow. |
| Publication approval | Admin must record a Guardian call confirmation before approval/publishing; material job-facing edits must invalidate the earlier confirmation. |
| Expiry | Published jobs expire at 14 days. A single extension requires a newly recorded Guardian reconfirmation call. |
| Tutor interest | Only an authenticated active Tutor can express/withdraw interest. Admin sees the contact necessary for coordination; Tutors do not see Guardian contact. |
| Profile updates | Identity-sensitive updates require server-side ownership checks, validation, and audit-safe records. Phone changes require verification. |
| Password changes | Require a current password and never expose password material in logs, UI state, or audit snapshots. |
| Maps | Directions may use City/area-level location only. Exact property or Guardian address data must not be encoded in links. |
| Attendance | Do not show a score, calendar, payment state, or session record until the attendance domain model and authority rules are approved. |

## Recommended implementation order

The following sequence completes the requested Guardian workspace without weakening existing controls.

| Ticket group | Outcome | Dependency | Acceptance criteria |
|---|---|---|---|
| **GD-03: Guardian identity header** | Logo and role-specific header with real Guardian name, email, avatar fallback, Guardian ID, and creation date. | Guardian ID decision; photo policy if upload is included. | No invented Student ID; no public exposure; mobile sidebar remains readable. |
| **GP-01: Profile update** | Guardian can review/update permitted name and location fields. | Guardian profile update contract and audit fields. | Ownership enforced; validation error paths tested; no Job Board projection impact. |
| **GS-01: Settings and security** | Phone update/reverification and authenticated password change. | Phone-verification decision; security-event model. | Current-password challenge, no password logging, unverified phone never replaces active phone. |
| **GJ-01: Request-progress mapping** | Posted Jobs and Dashboard show one accurate, human-readable lifecycle per request. | Existing request/publication data. | Labels derive from server fields; published Job ID/expiry shown only to its owner; no public-contact fields. |
| **GH-01: How it Works** | Static process page explaining request → confirmation call → publication/matching → support. | Approved wording. | No promises of automatic matching, guaranteed timing, or attendance tracking. |
| **GR-03: Optional referral source** | Optional attribution field at the chosen request step. | Purpose/consent decision. | Optional by default; bounded choices; no effect on matching eligibility. |
| **GC-01 / CL-01** | Community and confirmation-letter work. | Separate moderation/eligibility specification. | Do not implement until authorization and content ownership are defined. |

## Product decisions required before implementation

| Decision | Recommended option | Why it is needed |
|---|---|---|
| Identity label | Display **Guardian ID** only; keep Student ID out of v1. | Matches the account model and avoids counterfeit/ambiguous learner identities. |
| Guardian ID format | Non-guessable public-display identifier, distinct from database primary key. | Enables support lookup without exposing sequential internal records. |
| Profile photo | Start with initials; add upload only after storage, consent, deletion, and role-visibility rules are approved. | Prevents premature personal-image collection. |
| Phone update | Re-verify the new number before activation; keep current number active until success. | Prevents account takeover and missed Admin contact. |
| Password recovery | Keep the current support-assisted path until a separately specified secure reset mechanism exists. | Avoids a misleading “reset by email” control. |
| Referral capture | Optional, selected-list attribution on the final preview/submit step. | Preserves conversion while enabling non-sensitive attribution. |
| Online tuition location | Allow no physical location for online-only; show a non-identifying timezone/availability field only if needed. | Avoids requesting irrelevant location data. |
| Attendance | Continue deferral until confirmed-match, schedule, authority, session, correction, and payment boundaries are approved. | Prevents false operational records. |

## Final recommendation

The next implementation should be **Guardian Workspace Completion, Release 1**: `GD-03`, `GP-01`, `GS-01`, `GJ-01`, and `GH-01`. This order satisfies the most material parts of the requested interface while protecting the platform’s existing privacy and confirmation rules.

The Job Board and Admin publication workflow should be treated as **protected foundations**. Future visual refinements may improve their presentation, but they must not reintroduce Tutor profiles, public Guardian contacts, exact-address routing, automatic matching claims, or unaudited publication shortcuts.

## References

[1]: https://prnt.sc/BkKyo7bURtks "Guardian Dashboard sidebar reference"
[2]: https://prnt.sc/61rbmaS1j7jz "Guardian Hire a Tutor reference"
[3]: https://prnt.sc/VgxABqoYKuvm "Guardian Posted Jobs reference"
[4]: https://prnt.sc/-gYhBcpEokeB "Job Board advanced filtering reference"
[5]: https://prnt.sc/kujewik6dTf6 "Guardian Profile reference"
[6]: https://prnt.sc/4Hcqc2ZqMG "Guardian Settings reference"
[7]: https://prnt.sc/_wFzIScQvNVq "How it Works reference"
[8]: https://prnt.sc/yzVtF-xTdUIU "Job Board detail reference"
