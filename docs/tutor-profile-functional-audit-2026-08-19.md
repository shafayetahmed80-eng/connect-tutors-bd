# Tutor Profile Functional Audit

**Audit date:** 19 August 2026  
**Scope:** Tutor Profile only. Guardian requests, Admin approval, matching, public tutor discovery, and payment workflows are outside this audit.  
**Method:** Source-level workflow review, current automated regression suite, recent signed-in Android screenshots, and release-gate verification. This audit does not change product behavior.

## Executive finding

The Tutor Profile has a sound server-side protection model. Draft saving, review submission, private photo handling, account-status checks, and public-data boundaries are enforced on the server. The current automated suite passed **129 tests**, followed by a clean TypeScript check and production build.

The highest-priority remaining functional weakness is **actionable server-validation feedback**. The client shows a generic error after a rejected draft save or review submission, but it does not translate server-side field issues into inline field errors. The generic wording currently tells a Tutor to review “highlighted details” even when the UI has not highlighted a server-rejected field. This is a confirmed usability and recovery defect, not a server-validation defect.

> The reported Android right-edge clipping, completion-card overlap, and empty optional-selector draft-save rejection were addressed in the current release line. They remain subject to final real-device confirmation because the audit cannot execute a signed-in Android session itself.

## Workflow audit results

| ID | Workflow | Finding | Classification | Evidence | Priority |
|---|---|---|---|---|---|
| F-01 | Draft save error recovery | A failed server-side draft save only produces generic feedback. Server field issues are not mapped to `fieldErrors`, so the message can claim details are highlighted when no field is highlighted. | **Confirmed defect** | `TutorProfileWorkspace.tsx` draft-save catch path; server draft schema returns field-scoped issues. | High |
| F-02 | Review submission error recovery | The client performs initial required-field checks and correctly moves to the relevant mobile step. However, server-side errors after save/submit, including catalog-parent mismatches and state conflicts, collapse to generic feedback without field mapping or recovery focus. | **Confirmed defect** | `TutorProfileWorkspace.tsx` submission catch path; `tutor-profile.validation.ts` field-scoped validation; submission procedure tests. | High |
| F-03 | Legacy and structured save coexistence | The legacy `upsertProfile` procedure remains available beside the structured `saveProfileDraft` and `submitProfile` workflow. The current Tutor UI uses the structured workflow, but the parallel server route increases regression and future-maintenance risk. | **Suspected risk** | `server/routers.ts`; `server/tutor-profile.api.test.ts`; active dashboard route review. | Medium |
| F-04 | Photo upload, replacement, and removal | Upload and removal require an authenticated active Tutor account. The endpoint returns safe URLs only and does not reveal raw storage keys. Crop cancellation and portrait reachability have client coverage. | **No defect found in automated review** | `tutor-profile-photo-route.ts`; photo endpoint/editor tests. | — |
| F-05 | Partial draft persistence | Omitted optional selector arrays now preserve existing selections, while explicit arrays can replace selections. The prior empty-array validation rejection has regression coverage. | **No defect found after correction** | `TutorProfileFormData.ts`; profile API and form-data tests. | — |
| F-06 | Mobile wizard and unsaved changes | Wizard step navigation, client-side error recovery, browser unload warning, history guard, dashboard navigation confirmation, and sign-out confirmation have focused coverage. | **Real-device verification required** | `TutorProfileWizard.ts`, `TutorProfileNavigationGuard.ts`, and related component tests. | Medium |
| F-07 | Submission state transition | The server allows submission only from draft/changes-requested states, requires full profile and catalog validation, and makes the result pending/private. Repeat submission is rejected. | **No defect found in automated review** | `server/db.ts`; procedure and validation tests. | — |
| F-08 | Completion and system data | Completion derives from persisted profile data; profile status and private system information are owner-only. The public Tutor DTO uses an explicit allowlist. | **No defect found in automated review** | `server/db.ts`; validation and public DTO regression tests. | — |

## Verified functional behavior

| Area | Verified behavior |
|---|---|
| Authorization | Photo endpoints and protected profile procedures require an active Tutor account; non-Tutor and inactive accounts are rejected. |
| Privacy | Phone, contact email, profile/account status, date of birth, assignment data, and photo storage keys are excluded from public Tutor responses. |
| Draft semantics | Partial drafts are permitted. Omitted optional selection fields preserve stored selections; empty fields can intentionally clear a stored value where the payload includes that field. |
| Submission semantics | Review submission persists the draft, validates all required groups and cross-field rules, then moves the profile to `pending`. |
| Selector behavior | Desktop keyboard search and mobile staged selection with Done/Cancel have automated coverage. |
| Navigation protection | Unsaved values are guarded on browser unload, browser history navigation, dashboard navigation, and account-menu sign-out. |

## Required real-device verification

Automated tests cannot prove the signed-in Android browser’s viewport behavior, keyboard interaction, or Home Screen shortcut cache state. The following checks remain required on the active Tutor account.

| Check | Expected result |
|---|---|
| Draft save with only partially complete profile | A valid partial draft saves and confirms success without an error banner. |
| Invalid server-side value | The relevant field receives a clear inline error and the mobile wizard opens the correct step after F-01/F-02 are fixed. |
| Review submission with complete profile | Status changes to pending and the profile remains private. |
| Photo crop, replacement, and removal | Portrait crop controls remain reachable; the updated photo preview refreshes; removal makes photo required again. |
| Mobile selector Sheet | Cancel leaves selection unchanged; Done commits it; dependent academic resets are announced. |
| Navigation guard | Leaving with unsaved edits asks for confirmation; saving removes the warning. |

## Recommended implementation backlog

| Order | Ticket | Scope | Acceptance criteria |
|---|---|---|---|
| 1 | **FP-01: Actionable server validation feedback** | Parse typed tRPC validation errors after Save Draft and Submit for Review, map safe field issues to the existing `fieldErrors` state, switch the wizard to the relevant step, and focus the first invalid control. | Generic errors are reserved for non-field failures. A rejected field shows an inline Bangla error, the correct step becomes active on mobile, and focus/scroll targets the first error. |
| 2 | **FP-02: Clear post-submission state feedback** | Differentiate validation error, already-pending conflict, authorization loss, and unexpected save failure in safe bilingual feedback. | A Tutor receives an accurate recovery message and no raw backend or storage information is exposed. |
| 3 | **FP-03: Legacy profile write-path decision** | Confirm whether `upsertProfile` is required for backward compatibility. If not, retire or restrict it; if retained, explicitly document the allowed contract and add consistency tests. | Exactly one documented write path serves the current Tutor Profile UI, and legacy behavior cannot overwrite structured data unexpectedly. |

## Approval request

The recommended sequence is **FP-01 → FP-02 → FP-03**. FP-01 should be implemented first because it directly resolves a Tutor’s inability to recover from a valid server-side rejection. FP-03 is a maintenance-risk decision and does not need to block error-feedback work.
