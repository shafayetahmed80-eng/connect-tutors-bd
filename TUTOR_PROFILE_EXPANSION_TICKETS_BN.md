# Tutor Profile Expansion — Implementation Tickets

**Status:** Tickets prepared; implementation has not started.  
**Parent specification:** `TUTOR_PROFILE_EXPANSION_SPEC_BN.md`

## Delivery sequence

The tickets are intentionally ordered so that data boundaries, migration safety, and server contracts exist before any dependent UI. Each ticket includes its own focused tests; the final ticket adds cross-role regression and responsive release verification.

| Order | Ticket | Outcome | Dependency |
|---:|---|---|---|
| 1 | TPX-01 | Private-data security prerequisite and schema migration plan | User approval of the specification |
| 2 | TPX-02 | Repeatable education and extended availability persistence | TPX-01 |
| 3 | TPX-03 | Private University ID document storage and moderation model | TPX-01 |
| 4 | TPX-04 | Canonical Tutor profile v2 validation, completion, and persistence | TPX-02, TPX-03 |
| 5 | TPX-05 | Tutor personal/private, family, and emergency editor | TPX-04 |
| 6 | TPX-06 | Tutor education, availability, tuition detail, and University ID editor | TPX-04 |
| 7 | TPX-07 | Tutor summary and View-as-Guardian preview | TPX-04, TPX-05, TPX-06 |
| 8 | TPX-08 | Guardian-only CV contract and responsive CV UI | TPX-04, TPX-07 |
| 9 | TPX-09 | Admin complete Tutor detail, document review, and sensitive-access audit | TPX-03, TPX-04 |
| 10 | TPX-10 | Cross-role privacy, authorization, migration, and responsive release verification | TPX-05 through TPX-09 |

## TPX-01 — Establish private-data boundary and migration foundation

| Item | Definition |
|---|---|
| Purpose | Introduce the database structures for private Tutor identity, family, and emergency information without adding any public exposure. Resolve the encryption and document-retention prerequisites before sensitive values are accepted. |
| Likely surfaces | `drizzle/schema.ts`, generated Drizzle migration, `server/db.ts`, profile types, migration tests, `todo.md`. |
| Dependencies | Approved specification. Before implementation, obtain a server-only PII encryption secret through the project’s secure secret workflow and record the approved retention period for superseded/rejected University ID objects. |
| Risk | **High and irreversible:** database migration and collection of NID/address/family data. No full NID may be stored as plaintext, placed in a log, seeded, or returned in an unsafe DTO. |
| Acceptance criteria | `tutor_private_profiles`, `tutor_family_contacts`, and `tutor_emergency_contacts` exist with foreign keys/indexes; legacy rows remain readable; sensitive tables are absent from public/Guardian projection queries; account-deletion plan covers these records. |
| Verification | Focused Drizzle/schema tests; migration SQL review; `pnpm test`; `pnpm exec tsc --noEmit`; `pnpm build`. |

## TPX-02 — Add repeatable qualifications and exact weekly availability

| Item | Definition |
|---|---|
| Purpose | Persist the CV-style education collection and exact day/time availability without deleting the current catalog-backed academic summary or preference selections. |
| Likely surfaces | `drizzle/schema.ts`, generated migration, `server/db.ts`, profile types, `server/tutor-profile.validation.ts`, focused tests. |
| Dependencies | TPX-01. |
| Risk | **Medium:** an incorrect migration or replacement strategy could lose current education/preference data. Existing `tutor_academic_profiles`, selected days, and time-category values must remain backward compatible. |
| Acceptance criteria | Education records support up to eight ordered items; each record enforces date/year consistency; availability slots reject invalid/overlapping ranges; current academic summary and old day/time selections remain available for legacy profiles. |
| Verification | Validator unit tests for date, overlap, and record constraints; persistence/query tests; `pnpm test`; `pnpm exec tsc --noEmit`; `pnpm build`. |

## TPX-03 — Build private University ID verification storage and lifecycle

| Item | Definition |
|---|---|
| Purpose | Add the required University ID upload, replacement, removal, and Admin-review model using private object storage and a safe DTO boundary. |
| Likely surfaces | `drizzle/schema.ts`, generated migration, `server/tutor-verification-document.ts` (new), `server/db.ts`, `server/routers.ts`, storage helper usage, focused tests. |
| Dependencies | TPX-01. |
| Risk | **High:** private document handling. Reuse the existing private image moderation pattern; never place object keys or persistent URLs in a browser contract. |
| Acceptance criteria | The server accepts only approved image MIME types/sizes/dimensions; Tutor-only upload/replacement/removal is enforced; each replacement creates a pending review revision; Admin can issue a short-lived review URL only after role and relationship checks; document status is separate from profile status. |
| Verification | Upload authorization/MIME/size tests; storage-key non-disclosure tests; Admin review state-transition tests; `pnpm test`; `pnpm exec tsc --noEmit`; `pnpm build`. |

## TPX-04 — Extend canonical Tutor v2 profile contract

| Item | Definition |
|---|---|
| Purpose | Make draft save, submission, completion calculation, catalog validation, owner DTO, and persistence paths understand the newly structured profile data. |
| Likely surfaces | `server/tutor-profile.validation.ts`, `server/tutor-profile-error-contract.ts`, `server/db.ts`, `server/routers.ts`, `client/src/pages/TutorProfileFormData.ts`, `client/src/pages/TutorProfileUx.ts`, existing Tutor profile tests. |
| Dependencies | TPX-02 and TPX-03. |
| Risk | **High:** this is the canonical profile write contract. Do not revive a retired legacy write path or trust client-side completion. |
| Acceptance criteria | Drafts remain permissive but strictly validated; review submission requires the approved professional fields; degree/major, education record, availability slot, teaching method/place, and University ID status are checked server-side; sensitive fields do not count toward 100% completion; only allowlisted field issues reach the client. |
| Verification | Draft/submission/complete-percent regression tests; catalog-reference tests; safe-error-contract tests; `pnpm test`; `pnpm exec tsc --noEmit`; `pnpm build`. |

## TPX-05 — Add Tutor private information and emergency UI

| Item | Definition |
|---|---|
| Purpose | Add Tutor-owned controls for private personal identity, family contacts, and emergency information inside the existing profile workspace. |
| Likely surfaces | `client/src/pages/TutorProfileWorkspace.tsx`, focused profile form components/hooks, `TutorProfileFormData.ts`, component tests. |
| Dependencies | TPX-04. |
| Risk | **High privacy:** do not show saved NID, parent phone, emergency details, or exact address in CV preview, status cards, error toasts, or logs. |
| Acceptance criteria | Private blocks are visibly labelled “Visible to you and Admin only”; fields persist through the canonical draft mutation; mobile layout is one-column with accessible labels/error feedback; no public/Guardian component imports or renders these values. |
| Verification | Rendered privacy-label/field-error tests; Tutor-only ownership regression; 1280 px and 375 px visual checks; `pnpm test`; `pnpm exec tsc --noEmit`; `pnpm build`. |

## TPX-06 — Add Tutor education, availability, tuition, and University ID UI

| Item | Definition |
|---|---|
| Purpose | Deliver the professional CV-detail editing experience, including repeatable education records, exact availability, teaching method/place, and document status actions. |
| Likely surfaces | `client/src/pages/TutorProfileWorkspace.tsx`, new focused form components, `TutorProfileFormData.ts`, existing profile UX helpers, focused tests. |
| Dependencies | TPX-04. |
| Risk | **Medium:** complex dynamic controls can introduce invalid selection/state bugs or mobile overflow. |
| Acceptance criteria | Tutor can add/reorder/remove allowed education records; exact availability rejects overlaps with inline recovery; tuition required fields participate in submission guidance; University ID upload state is clear and never leaks a raw storage reference. |
| Verification | Rendered dynamic-record/slot/upload-state tests; keyboard-focused control tests; desktop/375 px screenshots; `pnpm test`; `pnpm exec tsc --noEmit`; `pnpm build`. |

## TPX-07 — Add Tutor profile summary and Guardian-safe preview

| Item | Definition |
|---|---|
| Purpose | Provide a profile summary with new completion/document states and a live Tutor-owned View-as-Guardian preview, without adding CV downloads. |
| Likely surfaces | `client/src/components/TutorProfileSystemInfo.tsx`, new preview component/route, `TutorProfileWorkspace.tsx`, owner/Guardian DTO tests. |
| Dependencies | TPX-04, TPX-05, and TPX-06. |
| Risk | **High privacy:** preview must consume the exact Guardian-CV allowlist rather than conditionally hiding fields in the owner DTO. |
| Acceptance criteria | Summary renders completion, profile status, document status, and safe next action; preview has no phone/email/exact address/NID/family/emergency/social/document/internal data; no PDF or download action exists. |
| Verification | Allowlist snapshot/contract tests; rendered preview leakage regressions; desktop/mobile visual checks; `pnpm test`; `pnpm exec tsc --noEmit`; `pnpm build`. |

## TPX-08 — Deliver authenticated Guardian CV access

| Item | Definition |
|---|---|
| Purpose | Add the signed-in Guardian-only CV procedure and UI for approved Tutors, using a dedicated server-built projection. |
| Likely surfaces | `server/db.ts`, `server/routers.ts`, `client/src/App.tsx`, `client/src/pages/TutorProfile.tsx` or a new Guardian CV page, role/DTO tests. |
| Dependencies | TPX-04 and TPX-07. |
| Risk | **High authorization/privacy:** public routes and non-Guardian sessions must not gain access by route guessing. |
| Acceptance criteria | Only active Guardians receive an approved Tutor’s CV; Tutor/Admin/anonymous attempts are rejected before DTO construction; CV includes only the approved professional allowlist; existing public Tutor pages retain their current safe response. |
| Verification | Procedure guard matrix tests; Guardian-safe DTO exclusion tests; route/render tests; 1280 px and 375 px visual checks; `pnpm test`; `pnpm exec tsc --noEmit`; `pnpm build`. |

## TPX-09 — Extend Admin Tutor detail and University ID review

| Item | Definition |
|---|---|
| Purpose | Let every active Admin view the approved full profile, review the University ID, and make document decisions while preserving a minimal Admin directory. |
| Likely surfaces | `server/db.ts`, `server/routers.ts`, `client/src/pages/AdminTutorManagement.tsx`, new Admin detail/document components, audit/policy tests. |
| Dependencies | TPX-03 and TPX-04. |
| Risk | **High:** approved all-Admin access expands sensitive-data exposure. Directory rows must remain minimal; full detail/document access must be server-guarded and audited. |
| Acceptance criteria | Admin detail returns complete profile information only after Admin guard; directory list excludes sensitive data; opening private detail creates a content-free audit event; document review URL is short-lived/on-demand; approve/changes-requested/reject actions update only the document lifecycle and show clear UI status. |
| Verification | Admin/non-Admin access tests; directory exclusion tests; audit-event shape tests; document review transition tests; desktop/mobile Admin detail screenshots; `pnpm test`; `pnpm exec tsc --noEmit`; `pnpm build`. |

## TPX-10 — Complete cross-role release verification and data-safety review

| Item | Definition |
|---|---|
| Purpose | Verify the complete flow from Tutor draft through Admin document review to Guardian CV while checking migration safety, privacy, accessibility, and responsive behavior. |
| Likely surfaces | All TPX-feature tests, test fixtures without real PII, `todo.md`, release checklist, potentially code-review findings. |
| Dependencies | TPX-05 through TPX-09. |
| Risk | **Release-blocking:** privacy/authorization regression, untested migration, or mobile overflow. |
| Acceptance criteria | Tests cover Tutor ownership, Admin full detail, Guardian-only CV, anonymous/public exclusion, storage-key non-disclosure, document lifecycle, safe errors, completion logic, and existing profile compatibility. Type-check/build pass. Desktop and 375 px review confirms no overflow and reachable controls. A privacy review verifies NID/contact/document data has no public or Guardian path. |
| Verification | Focused Vitest suites, full `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, whitespace audit, runtime-log review, and desktop/mobile visual capture. |

## Implementation approval gate

Implementation should begin only after the user approves this specification and ticket order. **TPX-01 cannot start its NID implementation until the server-only encryption-secret and University-ID retention policy prerequisites are explicitly resolved.** The remaining non-sensitive professional-profile tickets may be planned around that gate, but no workaround may store NID plaintext or publicly expose private information.
