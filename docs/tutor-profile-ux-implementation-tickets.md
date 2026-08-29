# Tutor Profile UI/UX Improvement — Bug Analysis and Implementation Tickets

**Status:** Approved for ticketing; no implementation has begun under this roadmap.

**Approved decisions:** Mobile wizard with desktop one-page editing (**1-C**); Bangla labels with official English academic terms (**2-B**); live completion guidance plus submit-time validation (**3-C**); secure crop, preview, replace, and remove photo controls (**4-C**).

**Additional approved UX improvements:** Sticky progress indicator, draft-saving access at every step, and automatic movement to the first invalid field.

> **Privacy boundary:** Tutor phone number, contact email, date of birth, profile status, account status, documents, and photo storage keys remain private. The public Tutor listing must continue to use its explicit safe DTO allowlist only.

## Audit outcome

The supplied Android screenshot confirms that the prior mobile sidebar drawer remained over the Profile workspace after navigation. This made the interface hard to read and blocked the **Upload photo** control. The mobile drawer change and Android JPEG MIME-alias compatibility change were checkpointed in `f0515a43`; an actual-device retest remains required.

The workspace also has structural usability limitations. Sections A–H are one long form; save and submit actions appear only at the end; draft feedback is mostly global rather than field-specific; and search multi-selects use desktop-shaped popovers. These are UI/UX design weaknesses, not evidence of database or privacy failure.

## Consolidated audit evidence

This audit combines the supplied Android Chrome screenshot, a source-level review of the signed-in dashboard and Profile workspace, the client draft-payload mapper, the reusable selector component, the system-information component, and the authenticated photo route. An authenticated desktop browser session was not available for a live interaction recording; therefore desktop findings below are explicitly classified as **source-inspected** and remain part of the visual-release gate in UX-05.

| Audit area | Evidence and observed state | Finding | Ticket response |
| --- | --- | --- | --- |
| **Mobile layout and navigation** | The Android screenshot showed the former navigation drawer covering Profile controls. The shared mobile-drawer regression now checks that it closes after a selection. The current Profile layout uses mobile-first single-column grids and expands from `md`/`lg` breakpoints. | The former overlay was a confirmed blocking bug; long-form completion and selector ergonomics remain product risks. | Retest the fixed drawer and introduce the mobile wizard and mobile selector sheet in UX-03 and UX-05. |
| **Desktop editing flow** | The workspace uses two- and three-column grids at `md`/`lg`, while the dashboard embeds it in a `max-w-6xl` shell. The source has no persistent section navigator, no fixed desktop action bar, and no dirty-state warning. | The desktop layout can display fields efficiently, but long-distance navigation and accidental-exit protection are weak. | Add the sticky navigator, desktop sticky action bar, and dirty-workspace guard in UX-02 and UX-03. |
| **Completion and action clarity** | Section H displays server-derived completion and review status. The editable workspace exposes **Save draft** and **Submit for review** only after Section H, at the bottom of the form. | A Tutor can see the final percentage but cannot use it as an actionable section-level checklist while editing. | Add a client-side A–G checklist that never replaces server authority, plus persistent per-step saving in UX-02. |
| **Feedback and error recovery** | The current client helper immediately checks only minimum/maximum fee ordering. Other errors are returned as global feedback after save or submit; the page has a polite live region but does not map errors to fields or move focus. | This is a confirmed error-recovery weakness, especially on mobile where the invalid field may be far above the action bar. | Add typed field/section error mapping, inline Bangla errors, and first-invalid-field navigation in UX-01 and UX-03. |
| **Accessibility** | Labels, fieldsets, radio inputs, semantic sections, a definition list for Section H, and polite status regions are present. Multi-selects provide `aria-expanded`, a dialog role, keyboard Escape, focus return, visible focus states, and a Done control. However, the dialog is an anchored popover with no focus trap, and it is not optimized as a mobile sheet. | The current baseline has useful semantic and keyboard foundations, but modal-focus handling, touch ergonomics, Bangla announcements, and complete keyboard journey testing need improvement. | Retain existing semantics; add sheet focus containment, return focus, touch targets, live announcements, and keyboard/screen-reader tests in UX-05. |
| **Trust and privacy cues** | The dashboard tells Tutors that contact details remain private; Section G warns against sensitive information; the draft-payload mapper excludes system-owned identity/review fields and raw storage keys; the photo endpoint requires an active Tutor and returns safe errors. | The implemented privacy boundary is sound, but its explanation is scattered and mostly English. Photo removal must only clear the private reference, not expose or create unsafe storage operations. | Centralize Bangla privacy copy in UX-01 and preserve owner-only photo handling in UX-04. |
| **Photo reliability** | The route limits uploads to one file and 5 MB, requires an active Tutor session, and returns clear endpoint errors. Photo validation already has binary signature checks and Android JPEG MIME-alias coverage. | The reported mobile upload has a security-preserving compatibility fix, but real-device proof is still pending. Crop, replace, and remove are approved new capabilities rather than evidence of a server defect. | Run the Android upload retest immediately; design crop/replace/remove under UX-04 without weakening server validation. |

> **Audit boundary:** The `server/db.ts:242` transform warning is not treated as a current Tutor Profile bug because current source inspection and a subsequent successful type/build verification did not reproduce it. It remains a release-check item: if a fresh production build or server restart reports it again, pause the related release and investigate the new log rather than relying on the historical warning.

| ID | Finding | Classification | User impact | Status / verification |
| --- | --- | --- | --- | --- |
| B-01 | Mobile drawer overlaid Profile content and blocked controls. | Confirmed functional bug. | Tutor could not safely read or use the Profile page. | Fix checkpointed; retest navigation and overlay opacity on Android. |
| B-02 | Android-oriented JPEG aliases could be rejected despite a valid JPEG binary. | Confirmed compatibility bug. | Photo upload could fail for some mobile browser/device combinations. | Safe alias normalization is checkpointed; retest a real JPEG upload. |
| B-03 | No image crop, replace, or removal UI exists. | Approved product gap. | A Tutor cannot adjust framing or recover gracefully from a wrong image. | Implement UX-04; removing a photo must drop the private DB key only. |
| B-04 | Eight sections are presented in one uninterrupted mobile scroll. | Approved UX weakness. | Completion fatigue, lost context, and higher abandonment risk. | Implement UX-02 and UX-03. |
| B-05 | Validation feedback is generally global rather than next to the affected field. | Confirmed UX weakness. | Tutors may not know exactly what to correct. | Implement UX-01 and UX-03. |
| B-06 | Native datalist and floating multi-select controls need a mobile-specific interaction design. | Mobile usability risk; needs device confirmation. | Search, selection, and closing controls may feel inconsistent across Android browsers. | Implement UX-03 and verify on Android Chrome. |

## Delivery order

| Order | Ticket | Outcome | Depends on |
| ---: | --- | --- | --- |
| 1 | UX-01 | Bilingual field-copy and structured client validation contract | Existing Profile validation |
| 2 | UX-02 | Shared completion model, sticky progress, and persistent draft controls | UX-01 |
| 3 | UX-03 | Responsive desktop one-page and mobile step-by-step Profile flow | UX-01, UX-02 |
| 4 | UX-04 | Private client-side photo crop, preview, replace, and remove flow | UX-01 |
| 5 | UX-05 | Mobile selector, error-navigation, accessibility, and release verification | UX-02, UX-03, UX-04 |

## UX-01 — Bangla UI Copy and Field-Level Validation Contract

| Attribute | Definition |
| --- | --- |
| **Purpose** | Present Tutor-entered labels, instructions, and errors in Bangla while retaining official English academic catalog names and the existing secure server validation. |
| **Primary surfaces** | `TutorProfileWorkspace.tsx`, `TutorProfileFormData.ts`, selector components, client validation tests, existing server validation error mapping. |
| **Dependencies** | Existing owner-only Tutor Profile API and submission validation. |
| **Risk level** | Medium. Copy must not imply that private fields become public or that a draft has been approved. |

Create a typed, centrally maintained Profile UI copy map. Tutor-facing labels, descriptions, button text, empty states, upload feedback, and error messages use Bangla. University, faculty/department, degree/major, curriculum, subject, and official institution names remain English as stored in the catalog. No user-facing language toggle is included in this approved scope.

| Required change | Acceptance criteria | Verification |
| --- | --- | --- |
| Add Bangla UI copy map | Every Profile label, helper, button, loading state, and error message is sourced from the map; official catalog names are unchanged. | Focused unit test and manual copy review. |
| Map validation to fields | Draft and submission feedback identifies a section and field key without exposing server internals. | Table-driven form-data tests. |
| Preserve server authority | Client guidance never replaces the existing server validation, ownership checks, or profile-state checks. | Existing API validation suite plus negative input tests. |
| Give safe private-field explanations | Phone, email, birth date, profile status, and photo messages make their private/system-managed status clear. | Accessibility and privacy copy review. |

## UX-02 — Completion Model, Sticky Progress, and Persistent Draft Access

| Attribute | Definition |
| --- | --- |
| **Purpose** | Let a Tutor see what is complete, what is required next, and how to save safely from any point in the Profile. |
| **Primary surfaces** | New client profile-progress helper/component, `TutorProfileWorkspace.tsx`, `TutorProfileSystemInfo.tsx`, form-data tests. |
| **Dependencies** | UX-01. |
| **Risk level** | Medium. The client progress display must not replace the server-derived Section H completion percentage. |

Create a client-only section checklist for A–G that reports `complete`, `needs attention`, or `not started` based on the same editable fields already sent in a draft payload. It is a navigation aid, not an approval decision. The authoritative persisted completion remains server-derived and unchanged.

| Required change | Acceptance criteria | Verification |
| --- | --- | --- |
| Sticky progress area | Mobile displays `ধাপ X / 5` and a clear percentage or completed-section count; desktop displays an in-page section navigator and progress. | Component tests; 375 px and desktop screenshots. |
| Persistent draft action | Every wizard step exposes **Save draft**; desktop preserves a sticky action bar without hiding the final submit action. | Mutation-state tests and manual keyboard check. |
| Required checklist | Each step lists missing required items before submission; optional Section G never blocks submission. | Pure progress-helper tests. |
| Submission clarity | **Submit for review** remains a deliberate final action with Bangla explanation that the Profile remains private pending Admin approval. | UI test and privacy review. |

## UX-03 — Responsive Profile Information Architecture

| Attribute | Definition |
| --- | --- |
| **Purpose** | Keep desktop editing efficient while making mobile Profile completion a calm, step-by-step flow. |
| **Primary surfaces** | `TutorProfileWorkspace.tsx`, new step-navigation components, responsive CSS, dashboard route integration, tests. |
| **Dependencies** | UX-01, UX-02. |
| **Risk level** | High. All draft values, images, and profile state must survive step movement without creating duplicate saves or exposing private data. |

Define five mobile steps: **1. পরিচিতি ও ছবি** (Section A), **2. অবস্থান** (Section B), **3. শিক্ষা ও পড়ানোর দক্ষতা** (Section C), **4. টিউশন পছন্দ ও ফি** (Sections D–E), and **5. যোগাযোগ, নিজের সম্পর্কে ও পর্যালোচনা** (Sections F–H). At `md` and wider, show the existing one-page workspace with a sticky section navigator; do not duplicate form state between layouts.

| Required change | Acceptance criteria | Verification |
| --- | --- | --- |
| Mobile wizard | Exactly one logical step is the primary view at a time on mobile; previous/next controls are keyboard reachable; changing a step retains unsaved local values. | Component tests and Android Chrome device check. |
| Desktop one-page layout | All sections remain reachable in one workspace, with a sticky section navigator and no duplicate rendering/submission. | Desktop screenshot, keyboard tab-order check. |
| Invalid-field navigation | Attempting next or submit shows Bangla inline errors, expands the needed step, focuses the first invalid field, and uses respectful live-region feedback. | Unit tests for error-to-step mapping; manual screen-reader smoke test. |
| Unsaved-change guard | Leaving a dirty workspace or moving between dashboard sections warns once, but does not block deliberate saving or sign-out. | Interaction tests. |

## UX-04 — Private Profile Photo Crop, Preview, Replace, and Remove

| Attribute | Definition |
| --- | --- |
| **Purpose** | Give mobile and desktop Tutors control over portrait framing before the existing authenticated upload boundary receives a safe image. |
| **Primary surfaces** | New client image-crop component/helper, `TutorProfileWorkspace.tsx`, `tutor-profile-photo-route.ts`, `tutor-profile-photo.ts`, `server/db.ts`, endpoint and component tests. |
| **Dependencies** | UX-01; existing authenticated photo upload service. |
| **Risk level** | High. Image bytes, server-side binary validation, opaque storage keys, and owner-only URL responses require strict handling. |

The client must create the cropped output locally and upload only the chosen JPEG, PNG, or WebP file to the existing authenticated endpoint. The server must continue to validate byte size, detected binary format, and image dimensions before storage. **Remove** clears the profile’s database photo-key reference and owner URL; it must not add a storage-delete capability because the approved storage layer removes access by dropping the reference.

| Required change | Acceptance criteria | Verification |
| --- | --- | --- |
| Pick and preflight image | The picker states that JPEG, PNG, or WebP is supported; unsupported formats show a Bangla message before upload where the browser exposes a type. | Component tests, Android Chrome manual test. |
| Accessible square crop | A Tutor can pan/zoom, confirm, cancel, and preview a square crop by touch, mouse, and keyboard. Reduced-motion preference is respected. | Component accessibility test; 375 px screenshot. |
| Replace safely | Replacing a photo updates only the current private reference; the raw object key never reaches the browser or public DTO. | Endpoint/privacy tests. |
| Remove safely | Confirming removal clears the owner-visible photo while no public listing or API response exposes a raw key. | Authorization and DTO tests. |
| Preserve security limits | The final cropped upload still passes existing type, 5 MB, and dimension safeguards; aliases do not bypass binary-signature checks. | Existing photo tests plus new crop-output cases. |

## UX-05 — Mobile Selector, Accessibility, and Release Verification

| Attribute | Definition |
| --- | --- |
| **Purpose** | Make selectors predictable on small screens and prove that the complete Profile flow works with assistive technology and real Android Chrome. |
| **Primary surfaces** | `TutorProfileSelectors.tsx`, catalog search fields, mobile navigation tests, accessibility tests, release checklist. |
| **Dependencies** | UX-02, UX-03, UX-04. |
| **Risk level** | Medium. Selector changes must preserve catalog-parent integrity and selected IDs. |

On mobile, searchable multiple selection opens in an accessible full-height sheet or dialog with an explicit close action, selected-count summary, and retained search query. On desktop, the compact anchored popover may remain. University → faculty/department → degree/major resets stay explicit and are announced in Bangla.

| Required change | Acceptance criteria | Verification |
| --- | --- | --- |
| Mobile selector sheet | Search, selected chips, checkbox list, Done, and Cancel are touch friendly; focus remains in the open sheet until closed. | Keyboard and mobile component tests. |
| Parent-child resets | Changing University or Faculty clears only dependent selections and explains the reset in Bangla. | Existing reset tests expanded with Bangla copy assertions. |
| Responsive navigation | The sidebar drawer closes after a route selection, has an opaque surface, and never blocks active Profile controls. | Existing mobile drawer test and actual Android check. |
| Release verification | Desktop and 375 px screenshots, 100% keyboard path, screen-reader smoke test, Android Chrome photo upload, and all tests/type/build checks pass. | `pnpm vitest run`, `pnpm check`, `pnpm build`, visual/device checklist. |

## Acceptance gate before implementation starts

Implementation begins only after tickets are accepted in the stated order. Work must follow **TDD → implementation → code review → checkpoint**. Every ticket must keep public Tutor DTO privacy tests green. Any schema/API adjustment for photo removal must be designed and reviewed before altering a database table or route.

## Out of scope

This roadmap does not add Guardian–Tutor matching, WhatsApp/other notifications, document verification, public Tutor Profile redesign, payments, new Tutor registration fields, or an Admin moderation workspace.
