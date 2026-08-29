# Connect Tutors BD Logo Kit

- [x] Locate the original icon mark used by the website.
- [x] Export transparent PNG, SVG, ICO and social-profile sizes.
- [x] Verify image dimensions, transparency and file readability.
- [x] Package the logo kit with a short usage guide.

- [x] Translate all visible Bengali website copy into English.
- [x] Verify English navigation, forms, FAQ, info pages, and footer.
- [x] Run type-check, production build, and package the full site ZIP.
- [x] Deliver the English website ZIP and updated project version.

- [x] Restart the unresponsive development server and verify the preview is available.

- [x] Prepare a complete Bengali localhost setup and future development guide.

- [x] Prepare a Bengali Windows installation guide for Node.js LTS and Git.

- [x] Explain the local preview warnings and provide a practical Bengali development workflow.

- [x] Prepare a project-specific Bengali full-stack roadmap and completion checklist.

- [x] Audit rollback version and restore Tutor Listing/Profile plus location-filter requirements.
- [x] Build responsive Tutor Listing and Tutor Profile pages.
- [x] Add country, international city, Bangladesh division, district, and tuition-mode filtering.
- [x] Verify discovery routes with tests, type-check, production build, and screenshots.

- [x] Add a repeatable Vitest test command and discovery contract tests for location hierarchy, tuition modes, and tutor filter behavior.

- [x] Fix the dev-server public-directory runtime error reported after the tutor discovery route verification.

- [x] Add MySQL/Drizzle `locations`, `tutors`, and `tutor_requests` schema with relations and migration.
- [x] Seed the managed Bangladesh and international location catalog and existing tutor records into the database.
- [x] Replace shared-array tutor/location reads with database-backed tRPC queries for listing and profile pages.
- [x] Connect tutor request submission to a protected database mutation with validation and persistence.
- [x] Add Guardian and Tutor registration/login pages with role selection and session-aware navigation.
- [x] Implement Guardian/Tutor role-based access control for protected routes and procedures.
- [x] Add tutor request loading animation, error handling, and polished success confirmation state.
- [x] Add Vitest coverage for schema-facing procedures, role guards, request validation, and loading/success behavior where practical.
- [x] Run database migration, tests, type-check, production build, and responsive browser verification.

- [x] Add session-aware header/navigation with authenticated role, account, and logout actions.
- [x] Protect at least one Guardian/Tutor frontend route with role-aware gating and redirect behavior.
- [x] Add Vitest coverage for role guards and database-backed tutor/location/request procedures where practical.
- [x] Add UI-level coverage or deterministic component checks for tutor-request pending and success states where practical.

- [x] Exercise the actual tutor-request tRPC procedure for unauthenticated, forbidden Tutor, and allowed Guardian authorization paths without inserting test data.
- [x] Add deterministic TutorRequest state checks for pending submit behavior and success confirmation rendering.

- [x] Document Mobile OTP authentication flow and Guardian/Tutor/Admin role-based access-control architecture with editable flowcharts and implementation structure.

- [x] Redesign the header to match the supplied blue contact-bar and desktop navigation reference.
- [x] Add responsive mobile hamburger/dropdown navigation for the same header menus.
- [x] Validate header links, keyboard accessibility, mobile layout, and desktop visual presentation.
- [x] Manually verify header keyboard navigation, visible focus, and Enter/Space menu activation.
- [x] Verify the opened mobile dropdown state and its small-screen usability.
- [x] Add and verify visible focus styling for the hamburger and header links.
- [x] Capture and review the fully opened mobile dropdown for clipping and reachability.
- [x] Update the public header phone number to +880 1516 131411 across desktop and mobile views.
- [x] Verify the updated phone number with type-check, build, and responsive preview.
- [x] Verify the updated phone number in the desktop preview viewport.

- [x] Add an accessible WhatsApp direct-message icon beside the header phone number.
- [x] Verify the WhatsApp URL, keyboard label, type-check, build, and desktop/mobile presentation.

- [x] Replace the generic chat glyph with an actual WhatsApp brand icon beside the header phone number.
- [x] Re-verify the branded WhatsApp icon on desktop and mobile layouts.

- [x] Add a secure server-side WhatsApp notification integration for successful Guardian tutor requests. (Superseded by approved Telegram notification decision T.)
- [x] Add notification delivery status or safe fallback behavior to the tutor-request flow. (Superseded by approved Telegram notification implementation.)
- [x] Validate the WhatsApp notification contract, tutor-request UX, and configuration guidance. (Superseded by approved Telegram notification implementation.)

- [x] Compare Telegram Bot and transactional-email notification alternatives for request alerts. (Telegram selected.)
- [x] Integrate the selected no-cost/low-cost Admin notification channel with secure configuration and fallback behavior. (Telegram completed.)

- [x] Extend Tutor profile data ownership and add role-protected Tutor dashboard procedures.
- [x] Implement the Tutor request matching and assignment workflow before enabling request-inbox counts in the Tutor Dashboard.
- [x] Build a reference-inspired Become a Tutor registration form with agreement and validation states.
- [x] Connect Tutor registration/login flow to first-time Tutor profile creation and dashboard redirect.
- [x] Build a responsive sidebar-based Tutor dashboard with profile, tuition preferences, request, and settings sections.
- [x] Verify the signed-in Tutor Dashboard on desktop and mobile after a Tutor account is available in the browser session.

- [x] Simplify initial Tutor registration to basic identity/contact information only.
- [x] Move professional Tutor fields into post-registration Profile completion and clearly explain the two-step flow.
- [x] Update onboarding validation/tests, responsive verification, and save a revised checkpoint.

- [x] Limit Tutor registration to Bangladesh-only primary city choices: all divisional cities plus Tangail and Sirajগঞ্জ.
- [x] Add searchable primary-city selection and searchable city-specific location/area selection to Tutor registration.
- [x] Validate Bangladesh-only registration location selection on desktop and mobile, then save a checkpoint.

- [x] Add a fixed +880 Bangladesh country code prefix to Tutor registration phone input and collect only the remaining local number.
- [x] Validate Bangladesh mobile entry, draft storage, and responsive phone-input presentation.
- [x] Save a verified checkpoint for the fixed +880 Bangladesh phone-input update.

- [x] Add persistent sequential Tutor ID generation beginning at 1503 and record Tutor registration date.
- [x] Design a reference-inspired responsive Tutor Dashboard with Tutor ID and Since date in the account header.
- [x] Add sidebar navigation: Dashboard, Job Board, Profile, Status, Confirmation Letter, Payment, Certificate, Refer & Earn, and Setting.
- [x] Add the requested divider plus Exclusively Yours, How It Works, Join our Community, and Sign Out sidebar links.
- [x] Add clearly labelled non-functional placeholder screens for deferred Dashboard sections.
- [x] Save a verified checkpoint for the Tutor ID and sidebar Dashboard design update.

## Completed Tutor Profile structure and release

- [x] Apply the user-provided full Tutor Profile field structure and ordering.
- [x] Implement the approved profile sections, moderation fields, verification requirements, and release hardening from that structure.

## Deferred notification work

- [x] Add a secure server-side WhatsApp notification integration for successful Guardian tutor requests. (Superseded by approved Telegram notification decision T.)
- [x] Add notification delivery status or safe fallback behavior to the tutor-request flow. (Superseded by approved Telegram notification implementation.)
- [x] Validate the WhatsApp notification contract, tutor-request UX, and configuration guidance. (Superseded by approved Telegram notification implementation.)
- [x] Compare Telegram Bot and transactional-email notification alternatives for request alerts. (Telegram selected.)
- [x] Integrate the selected no-cost/low-cost Admin notification channel with secure configuration and fallback behavior. (Telegram completed.)

## Deferred Tutor matching work

- [x] Implement the Tutor request matching and assignment workflow before enabling request-inbox counts in the Tutor Dashboard.
- [x] Verify the signed-in Tutor Dashboard on desktop and mobile after a Tutor account is available in the browser session.
- [x] Confirm active Tutor password-session access and protected-route behavior before dashboard verification.
- [x] Capture the signed-in Tutor Dashboard and Profile workspace at desktop and 375 px mobile widths, including sidebar navigation and sign-out access.
- [x] Obtain user confirmation of the signed-in Tutor Dashboard and Profile workspace on an actual mobile device.
- [x] Complete a structured Tutor Profile UI/UX audit covering desktop, mobile, completion flow, accessibility, feedback, and trust/privacy cues.
- [x] Document desktop-specific, accessibility, feedback/error, and trust/privacy audit findings with evidence before closing the audit.
- [x] Document confirmed versus suspected Tutor Profile bugs, their user impact, evidence, and recommended verification method.
- [x] Produce an approved, priority-ordered Tutor Profile UI/UX improvement roadmap before scheduling further implementation.
- [x] Implement the approved responsive Tutor Profile experience: mobile step-by-step wizard and desktop one-page workspace.
- [x] Add Bangla labels with retained official English academic terms across the Tutor Profile flow.
- [x] Add live required-field completion guidance, inline Bangla validation, and submit-time validation with error navigation.
- [x] Add secure profile-photo crop, preview, replace, and removal interactions without exposing storage keys.
- [x] Add sticky section progress, persistent draft-saving access, and automatic focus/scroll to invalid profile fields.
- [x] UX-01: Add Bangla-plus-English Tutor Profile field copy and client-side, field-level submission guidance while retaining server-authoritative validation.
- [x] UX-02: Add visible completion progress and persistent, draft-safe save actions throughout the Tutor Profile workspace.
- [x] UX-03: Add a five-step mobile Profile wizard, sticky desktop section navigation, invalid-step recovery, and a complete unsaved-change guard.
- [x] UX-04: Add a secure profile-photo crop, preview, replace, and removal flow while preserving private storage boundaries.
- [x] UX-04 automated implementation: Add authenticated private-reference removal, crop-dialog preview/confirmation, replacement, and regression coverage without exposing storage keys.
- [x] UX-05: Harden searchable multi-select controls for touch, keyboard, screen-reader feedback, and selected-value management across the Tutor Profile.
- [x] Add rendered client regression coverage for photo crop preview, confirm upload, replacement, and removal controls.
- [x] Add a real photo-editor regression proving the crop preview renders after file selection before upload confirmation.
- [x] Capture signed-in desktop and mobile evidence of the photo editor and confirm no raw storage reference is exposed after photo actions.
- [x] Extend the Tutor Profile unsaved-change guard to browser back/forward and all non-sidebar in-app route changes, with regression coverage.
- [x] Add integration coverage proving non-sidebar in-app navigation is blocked or confirmed when a Tutor Profile draft is dirty.
- [x] Capture explicit test or visual evidence that desktop section navigation scrolls to the intended anchored Profile sections.
- [x] Fix the mobile Tutor sidebar drawer so it renders an opaque, readable background and preserves navigation contrast.
- [x] Fix the mobile Tutor Profile photo picker/upload flow and add regression coverage for the confirmed failure mode.
- [x] Investigate and remediate missing registration-data prefill for any legacy Tutor account that lacks a persistent draft Profile.
- [x] Permanently delete the user-confirmed Tutor ID 1503 test profile and all of its dependent private profile records.
- [x] Permanently delete the user-confirmed Tutor ID 1503 login account and registration identity after confirming no unrelated dependencies exist.
- [x] Diagnose and repair Tutor ID allocation so new Tutor registrations begin at 1503 and continue sequentially.
- [x] Reconcile the newly created Tutor account’s incorrect allocated ID without changing its private Profile data.
- [x] Audit and reconcile unexpected historical Tutor registration identities before modifying any public Tutor ID sequence data.
- [x] Add an actual concurrent-allocation regression and verify public Tutor ID allocation remains unique and sequential.
- [x] Fix the signed-in Tutor Dashboard so an incomplete profile never renders an undefined location label.

## Tutor Profile mobile responsiveness follow-up

- [x] Audit all Tutor Profile functional workflows—draft save, review submission, photo actions, selectors, wizard navigation, validation, guards, and status refresh—for confirmed defects and risks.
- [x] Document the functional audit evidence, privacy/authorization constraints, confirmed defects, suspected defects, and required real-device verification.
- [x] Obtain approval for a priority-ordered functional defect backlog before implementing additional fixes.
- [x] Produce dependency-ordered implementation tickets for the approved FP-01 server-validation recovery, FP-02 mutation feedback, and FP-03 legacy-write-path decision.
- [x] Begin implementation with the approved FP-01 ticket after ticketing is recorded.
- [x] FP-01: Expose only allowlisted top-level Tutor Profile validation fields through the protected tRPC error contract and translate them into actionable inline Bengali recovery guidance.
- [x] FP-02: Classify non-field Tutor Profile mutation failures and show distinct safe Bengali recovery guidance without exposing backend details or replacing mapped FP-01 field errors.
- [x] FP-03: Retire the user-approved legacy `tutor.upsertProfile` route and its unused client path; preserve only structured draft saving and review submission as the canonical Tutor Profile write contract.

- [x] Collect Android screenshots and document each remaining signed-in Tutor Profile mobile layout, touch, scroll, or visibility issue.
- [x] Fix mobile completion-card actions so the Bengali “Submit for Review” label remains fully visible and tappable without horizontal overflow.
- [x] Fix the mobile Profile Photo panel so its placeholder, image preview, crop/replacement controls, and remove action remain correctly sized, aligned, and tappable.
- [x] Define approved mobile-responsive behavior and acceptance criteria for the reported Tutor Profile issues.
- [x] Implement and test the approved Tutor Profile mobile responsiveness fixes without weakening draft, privacy, or accessibility protections.
- [x] Verify the corrected signed-in Tutor Profile flow on an Android device and record the final release checks.
- [x] Diagnose and fix the signed-in Android Tutor Profile form's right-edge overflow so selectors, inputs, textareas, and progress content remain wholly inside the viewport.
- [x] Add regression coverage for mobile-width Tutor Profile containers and selector trigger content so the horizontal overflow cannot recur.
- [x] Verify the repaired signed-in Android Tutor Profile form at the affected device width and record the result.
- [x] Fix the signed-in Android Tutor Profile completion card so it never overlaps the mobile step-wizard card or obscures its controls.
- [x] Diagnose and fix the signed-in Tutor Profile draft-save failure displayed after the mobile responsive update.
- [x] Add regression coverage for non-overlapping mobile Profile card flow and successful valid draft saves.
- [x] Verify the repaired completion card and draft-save flow on the affected Android device.
- [x] Align Tutor Profile location entry and searchable selectors with the supplied Bangladesh city, thana, area, subdivision, and upazila structure while preserving existing profile data safely.
- [x] Verify the Bangladesh location hierarchy update with the full test suite, TypeScript check, and production build.
- [x] Verify an existing Tutor Profile continues to load and save safely after the Bangladesh hierarchy migration.
- [x] Add a focused regression for existing Tutor Profile hydration and draft saving with a hierarchy-based location identifier.

## Bangladesh university academic hierarchy follow-up

- [x] Review the supplied Bangladesh university dataset and reconcile it with the current Tutor Profile academic catalog contract.
- [x] Add or update the Institute → Faculty/School → Department/Subject hierarchy data without weakening existing profile selections.
- [x] Update the Tutor Profile dependent academic selectors to follow the reconciled hierarchy, including search and reset behaviour.
- [x] Add regression coverage and complete database, TypeScript, build, and code-review validation for the hierarchy update.

## Tutor Request Panel planning

- [x] Audit the existing Guardian request submission, request persistence, and Tutor Dashboard placeholders relevant to a Tutor Request Panel.
- [x] Define role-specific Tutor Request Panel workflows, privacy boundaries, request states, and matching handoff rules.
- [x] Produce an approval-ready, dependency-ordered implementation plan covering data contracts, UI, APIs, validation, tests, and release checks.

## Guardian/Student registration and Request for Tutor planning

- [x] Audit the supplied Guardian/Student registration requirements alongside the current Request for Tutor flow and data model.
- [x] Resolve authentication, partial-phone capture, duplicate-account, consent, and contact-visibility rules before implementation.
- [x] Produce an approval-ready responsive UI, API, validation, migration, test, and release plan for the two-step Guardian/Student journey.

## Approved Guardian phone-first registration and Request for Tutor implementation

- [x] Convert the approved P, N, X, D Guardian journey into implementation-ready specification and dependency-ordered tickets.
- [x] Add protected Guardian intake and profile persistence with canonical phone capture, email/password registration, consent audit, and safe duplicate handling.
- [x] GR-01: Add private canonical Bangladesh phone intake storage, reviewed additive migration, signed short-lived handoff, and safe public capture errors.
- [x] Add safe Bangladesh city-to-location catalog access required by Guardian registration without exposing personal/request data.
- [x] Build the responsive public phone-first Request for Tutor entry and two-column Guardian/Student Registration form with accessible validation and error recovery.
- [x] Handoff successful Guardian registration to the authenticated Tutor Request workflow while preserving ownership and privacy.
- [x] Add draft Terms and Privacy pages, Call/WhatsApp contact actions, and no platform-message action in this release.
- [x] Add regression, responsive, privacy, TypeScript, production-build, and code-review validation before release.


## Tutor email/password authentication

- [x] Add Password and Confirm Password fields to the Tutor registration panel.
- [x] Store Tutor passwords as secure scrypt hashes and validate password confirmation, length, email format, and duplicate email.
- [x] Add a dedicated Tutor email/password login panel and secure session creation.
- [x] Preserve Tutor role, sequential Tutor ID, registration date, and dashboard redirect after password login.
- [x] Add authentication security tests, responsive verification, and save a checkpoint.

## Tutor password-auth integration follow-up

- [x] Update Tutor-protected redirects and dashboard sign-in fallback to use `/tutor/login` instead of generic OAuth.
- [x] Replace remaining Tutor dashboard/settings copy that describes password login as an external portal.
- [x] Verify password-session role, Tutor ID allocation, Since date payload, and protected-route redirect through automated auth tests and live route verification.
- [x] Save a post-integration checkpoint for the complete Tutor email/password milestone (checkpoint c4ddf4a9).
- [x] Add an integration assertion that password registration returns Tutor role, Tutor ID, and registration date through the auth router.

## Password visibility controls

- [x] Add accessible show/hide eye icons to Tutor registration Password and Confirm Password fields.
- [x] Add accessible show/hide eye icon to Tutor login Password field.
- [x] Verify keyboard accessibility, responsive rendering, tests, production build, and save a checkpoint.

## Password visibility verification follow-up

- [x] Explicitly verify password visibility buttons are keyboard reachable on Tutor registration and Tutor login pages.
- [x] Save a post-update checkpoint for the password visibility controls.

## Tutor Profile specification grilling

- [x] Finalize Tutor Profile audiences, public/private visibility, and privacy rules.
- [x] Finalize Tutor Profile fields, tuition preferences, availability, verification documents, and approval states.
- [x] Produce the agreed Tutor Profile specification and implementation backlog.

## Tutor Profile field-first discovery

- [x] Inventory the complete Tutor Profile sections and information fields before deciding visibility or approval rules.
- [x] Confirm required, optional, and system-generated fields for the Tutor Profile.
- [x] Document the approved field-first Tutor Profile structure for later implementation.

## Workflow Skills setup

- [x] Inspect the current workspace Skills list for the requested workflow skills.
- [x] Prepare or add missing workflow skills through the supported Skills workflow.
- [x] Verify the resulting Skills list and document the Tutor Profile usage sequence.

## Tutor Profile field-first grilling session

- [x] Reconfirm corrected Tutor Profile section list and core identity fields with the user.
- [x] Confirm academic, teaching, tuition preference, language, and about fields with the user.
- [x] Record the approved field inventory and unresolved field decisions.

## Corrected Tutor Profile identity and location requirements

- [x] Record Exact Birth Date, mandatory Profile Photo, and required Short Headline as Tutor Profile fields.
- [x] Specify searchable multi-select teaching-area coverage based on the current Bangladesh location catalog, including mandatory nationwide availability.

## Tutor Profile academic and teaching selector requirements

- [x] Specify the searchable University → Faculty/Department → Degree/Major dependent selector data model and catalog scope.
- [x] Specify multi-select catalog fields for primary subjects, additional subjects, class/level, curriculum, and student types.
- [x] Record teaching-experience, prior-experience description, special-expertise, and academic-achievement field requirements.

## Academic selector data model documentation

- [x] Document University, Faculty/Department, and Degree/Major entities, keys, searchable fields, and relationship rules for the Tutor Profile catalog.

## Tutor Profile tuition and biography requirements

- [x] Record fee-range, travel-distance, and multi-select tuition-preference field rules.
- [x] Record multi-select teaching-language and communication-preference field rules.
- [x] Record optional biography field rules for About Me, Teaching Approach, Why Choose Me, and Additional Notes.
- [x] Consolidate all approved Tutor Profile field decisions into one inventory and identify unresolved choices.

## Tutor Profile system information decisions

- [x] Confirm the exact Tutor-visible Profile System Information fields in Section H.

## Tutor Profile technical specification

- [x] Produce an implementation-ready Tutor Profile technical specification covering schema, API contracts, validation, authorization, UI flows, and acceptance criteria.
- [x] Obtain approval of the Tutor Profile technical specification before ticketing or implementation.

## Tutor Profile implementation tickets

- [x] Produce dependency-ordered, implementation-ready Tutor Profile tickets from the approved technical specification.
- [x] Validate the ticket backlog covers migration, catalog data, API, profile UI, security, tests, and visual verification before implementation.

## Tutor Profile test-first development plan

- [x] Define focused test cases for Tutor Profile registration persistence, validation, authorization, privacy, status transitions, photo upload, and UI behaviour before implementation.
- [x] Add initial deterministic failing tests for the first Tutor Profile implementation ticket without changing production behaviour.
- [x] Verify the test-first plan and baseline test suite before production implementation.

## Tutor registration-to-profile data continuity

- [x] Revise the Tutor Profile specification so every existing Tutor Registration Panel value automatically appears in the corresponding Profile field by default.

## TP-01 — registration-to-profile default persistence

- [x] Add the pure non-secret registration-to-Profile default mapper and make the TP-01 red test pass.
- [x] Persist exactly one private draft Tutor Profile in the successful Tutor registration flow without exposing passwords.
- [x] Extend TP-01 tests for registration orchestration and verify focused, full, type-check, and build gates.

## TP-02 — Tutor Profile catalog schema foundation

- [x] Define and test the required Tutor Profile catalog table relationships, uniqueness rules, and indexes.
- [x] Add and apply a reviewed non-destructive Drizzle migration for catalog tables and Tutor Profile junction tables.
- [x] Verify the applied schema, migration safety, TypeScript, full test suite, and production build.
- [x] Add explicit TP-02 coverage for catalog uniqueness constraints and required lookup indexes.
- [x] Prove the checked-in TP-02 migration applies from a clean database without manual SQL intervention.
- [x] Re-run and document database checks for every TP-02 table, profile column, foreign key, unique constraint, and required index before checkpointing.
- [x] Run and document an isolated clean-database migration verification for the full Drizzle migration chain, then remove the empty verification database.

## TP-02 — user-run XAMPP clean migration verification

- [x] Prepare safe copy-paste commands for the user to create an isolated XAMPP MySQL verification database and run the complete migration chain.
- [x] Provide MySQL verification queries, capture the user's output, and confirm or diagnose the TP-02 clean-run result.
- [x] Diagnose the local Drizzle configuration-read stall and provide a deterministic clean-migration command for the XAMPP verification database.
- [x] Deliver the XAMPP clean migration guide and verification SQL as the user-run TP-02 execution packet.

## TP-03 — Bangladesh academic catalog seed data

- [x] Review the approved TP-03 ticket, catalog schema, and existing data conventions.
- [x] Define trusted seed-data sources, coverage boundaries, normalization rules, and idempotency requirements.
- [x] Add test-first, idempotent seed data for Bangladesh universities, faculties/departments, degree/major options, and teaching subjects.
- [x] Apply and verify the seed data with tests, type checking, build validation, and a data-integrity review.

## TP-04 — Tutor Profile domain validation

- [x] Review the approved TP-04 ticket and current profile mutation contracts.
- [x] Define test-first validation rules for profile identities, catalog selections, tuition preferences, and optional biography fields.
- [x] Implement normalized validation contracts with clear field-level error handling.
- [x] Verify the TP-04 contracts with focused and full tests, type checking, production build, and code review.

## TP-05 — Protected Tutor Profile procedures

- [x] Review the approved TP-05 ticket, authentication boundary, and profile persistence helpers.
- [x] Define test-first Tutor ownership, authorization, private-data, retrieval, and mutation behavior.
- [x] Implement protected profile retrieval and mutation procedures using the TP-04 validation contracts.
- [x] Verify TP-05 with focused and full tests, type checking, production build, and authorization/privacy review.

## TP-06 — Tutor Profile photo upload

- [x] Define red tests for authenticated multipart upload, image validation, storage key privacy, and owner-safe profile retrieval.
- [x] Implement the protected Tutor photo-upload endpoint and private key persistence contract.
- [x] Verify TP-06 with focused and full tests, type checking, production build, and upload security/privacy review.

## TP-07 — Tutor Profile form foundation and Sections A–C

- [x] Define focused component tests for loading, registration continuity, private fields, searchable teaching areas, and dependent academic resets.
- [x] Implement the protected Profile workspace with accessible Sections A–C and server-backed form hydration.
- [x] Integrate photo upload, protected draft saving, and clear local loading, error, and success states.
- [x] Verify TP-07 with full tests, type checking, production build, desktop/mobile visual checks, and accessibility/privacy review.

## TP-08 — Tutor Profile Sections D–G and submission UX

- [x] Define red tests for controlled teaching, preference, language, communication, biography, and submission-state interactions.
- [x] Implement accessible controlled Sections D–G with client-side validation feedback and bounded biography fields.
- [x] Implement distinct protected draft-save and submit-for-review interactions with status feedback and owner-data refresh.
- [x] Verify TP-08 with full tests, type checking, production build, mobile checks, and accessibility/privacy review.

## TP-09 — Tutor Profile Section H and dashboard state

- [x] Define red tests for owner-only system information, local date formatting, and non-editable Section H rendering.
- [x] Implement the read-only Section H card from the owner DTO without exposing controls or raw private profile data.
- [x] Integrate pending-review feedback and owner-data refresh across the Profile and Tutor dashboard state.
- [x] Verify TP-09 with full tests, type checking, production build, mobile checks, and system-field/privacy review.

## TP-10 — Release hardening, end-to-end verification, and final acceptance

- [x] Confirm and permanently clear the historical duplicate `saveDraft` declaration error in the Tutor Profile workspace.
- [x] Add targeted regression coverage for the final public privacy boundary and protected Tutor Profile procedures.
- [x] Verify Tutor registration, login, pre-filled private draft Profile, draft saving, and submit-for-review transitions end to end.
- [x] Audit public Tutor API payloads for exclusion of private contact, date of birth, account, status, request-count, and raw photo storage data.
- [x] Verify unauthenticated, Guardian, and inactive-account callers are rejected from protected Tutor Profile operations.
- [x] Reconfirm migration-chain safety and existing approved public Tutor listing usability.
- [x] Manually verify labels, focus indicators, keyboard selector actions, live error feedback, photo-upload labeling, and read-only Section H semantics.
- [x] Capture desktop and 375 px mobile Profile states for loading, populated, validation-error, searchable-selection, and pending-review flows.
- [x] Run the complete Vitest suite, TypeScript check, and production build.
- [x] Complete the final Tutor Profile code review and remediate any confirmed findings.
- [x] Mark TP-10 verification complete and save a release checkpoint only after all gates pass.

## Current tab conversation log

- [x] Compile the current tab's questions, answers, decisions, completed work, and next steps into Markdown.
- [x] Deliver the Markdown conversation log to the user.

## Complete conversation record

- [x] Compile the complete inherited conversation from the initial MeetTutorBD clone request onward.
- [x] Write and deliver the complete Markdown conversation record.

## Updated ZIP package delivery

- [x] Create a fresh ZIP package from the latest project state, excluding secrets, node_modules, build artifacts, logs, and local environment files.
- [x] Inspect the ZIP contents and deliver the package for local XAMPP testing.
- [x] Verify the archive includes TP-02 migration files and the XAMPP verification guide and SQL.

- [x] Review and correct duplicate or incorrectly named Bangladesh City/Location catalog records.
- [x] Add verified scoped sub-area coverage for Mirpur sections, Uttara sectors, Halishahar blocks, and equivalent supported area subdivisions.
- [x] Enforce selected-city-only child-location results and add regression coverage for duplicate and cross-city leakage.
- [x] Review and correct duplicate or incorrectly named University → Faculty/School → Department/Subject catalog records, including Chittagong Medical College and University of Chittagong naming distinctions.
- [x] Add canonical academic-name normalization and duplicate regression coverage.
- [x] Complete the remaining approved Guardian registration and Request for Tutor implementation tickets after catalog foundations are corrected.
- [x] Run full code review and release validation for catalog and Guardian changes.

## Approved notification and matching decisions

- [x] Add secure Telegram Bot admin notification configuration for successful Guardian tutor requests.
- [x] Add notification delivery status and safe fallback behavior without exposing Guardian private data.
- [x] Add protected admin/manual Tutor matching workflow with ownership and privacy checks.
- [x] Add regression, TypeScript, production-build, and code-review validation for Telegram notifications and manual matching.

- [x] Attach or reference inspectable signed-in Tutor Dashboard/Profile desktop and 375 px mobile screenshot evidence with sidebar and sign-out controls visible.
- [x] Attach or reference inspectable signed-in desktop/mobile photo-editor screenshot evidence showing no raw storage reference after photo actions.

## Legacy completion audit

- [x] Audit the final release checklist for any genuinely remaining approved legacy work and resolve it without starting deferred future features.
- [x] Re-run final validation after the legacy completion audit and save the resulting checkpoint.

## Catalog linkage to registration and profile forms

- [x] Audit Tutor registration and Profile update location/academic selector contracts against the corrected live catalogs.
- [x] Link corrected Bangladesh city/location data to registration and Profile update forms with city-scoped child results and persisted-ID hydration.
- [x] Link corrected University → Faculty/School → Department/Subject data to registration and Profile update forms with cascade reset and persisted-ID hydration.
- [x] Add form-level regression, privacy, TypeScript, build, and responsive verification for the linked catalogs.
- [x] Save a checkpoint for the verified catalog-to-form linkage release.

- [x] Add the public `/join-tutor` alias to the existing Tutor registration route so catalog-linked registration is reachable from the verified path.
- [x] Re-run route and form visual verification after correcting the registration entry point.

## Tutor Listing verified badge, advanced filtering, and pagination

- [x] Define the public Tutor Listing data contract for verified status, advanced filters, and stable pagination without exposing private contact data.
- [x] Add focused server and UI regression coverage for verified-only visibility, filter combinations, invalid pagination, empty pages, and loading/error states.
- [x] Implement the verified-profile badge using an explicit approved/verified profile signal.
- [x] Implement advanced Tutor Listing filters for location, tuition mode, academic level/subjects, availability, and fee range where supported by the existing schema.
- [x] Implement deterministic server-backed pagination with accessible controls and page-reset behavior when filters change.
- [x] Verify responsive desktop/mobile listing UX, keyboard accessibility, privacy boundaries, TypeScript, tests, and production build.
- [x] Complete code review and save a release checkpoint for the Tutor Listing feature.

## Registration Location Dropdown bug

- [x] Reproduce and trace the non-working Location Dropdown in the Tutor registration panel.
- [x] Add regression coverage for city/location loading, searchable selection, cascade reset, and persisted value hydration.
- [x] Fix the registration Location Dropdown without weakening Bangladesh-only catalog and parent-scoped rules.
- [x] Verify the fix with focused/full tests, TypeScript, production build, and desktop/mobile route checks.
- [x] Complete code review and save a release checkpoint for the Location Dropdown fix.

## Tutor Registration and Dashboard helper-copy cleanup

- [x] Audit Bengali helper messages in the full Tutor Registration and Tutor Dashboard panels, preserving required error, privacy, and status communication.
- [x] Remove the approved non-essential helper messages from both panels without changing form behavior or protected guidance.
- [x] Add or update focused regression coverage for the cleaned panel copy where appropriate.
- [x] Verify TypeScript, production build, responsive presentation, code review, and save a release checkpoint.

## Tutor Registration required-field indicator enhancement

- [x] Audit the existing required-field marker treatment across the Tutor Registration form.
- [x] Implement a more prominent, accessible required-field indicator without changing validation behavior.
- [x] Verify desktop/mobile rendering, tests, TypeScript, production build, and code review before checkpointing.

## Undo prominent Tutor Registration required-field indicators

- [x] Restore the prior subtle required-field asterisk treatment and remove only the latest badge enhancement.
- [x] Preserve the existing registration Location Dropdown, validation, and accessibility behavior after the visual rollback.
- [x] Verify the restored form visually and with focused regression/type/build checks before checkpointing.

## City Dropdown repair and combined registration location selector

- [x] Confirm City Dropdown loading failure and document the approved City → combined Thana/Upazila and Area/Sub-area workflow.
- [x] Define combined searchable result labels, hierarchy ordering, selection value, reset behavior, and no-result/error states.
- [x] Repair City catalog loading and replace separate Thana/Upazila and Area/Sub-area controls with the approved city-scoped combined selector.
- [x] Add regression coverage for city results, combined hierarchy search/selection, cascade resets, persisted IDs, and mobile keyboard behavior.
- [x] Verify privacy boundaries, TypeScript, full tests, production build, responsive UX, code review, and save a release checkpoint.

## Tutor Registration location dropdown outside-click dismissal

- [x] Audit City and combined location dropdown event boundaries and current menu-state behavior.
- [x] Add accessible outside-click dismissal without interfering with typing, option selection, keyboard controls, or City resets.
- [x] Add focused regression coverage and verify desktop/mobile interaction, tests, TypeScript, production build, and code review before checkpointing.

## Tutor Registration selected-City location result count

- [x] Audit the combined City-scoped selector’s total and filtered option state for count feedback.
- [x] Show the selected City’s available location count and the active search result count without changing selection behavior.
- [x] Add focused regression coverage and verify desktop/mobile UI, tests, TypeScript, production build, and code review before checkpointing.

## Combined location dropdown duplicate-label investigation

- [x] Apply approved Option A: suppress an identically named direct Area when the City also has a direct Thana/Upazila record with that name.
- [x] Identify why duplicate labels such as Bandar appear in the same City-scoped combined location menu.
- [x] Confirm the approved behavior for exact duplicates versus genuinely distinct parent/area records with the same name.
- [x] Implement and test safe deduplication or hierarchy-qualified labeling without hiding valid geographic choices.
- [x] Verify the corrected dropdown with data checks, regression tests, responsive review, code review, and release checkpoint.

## Priority: complete selected-City location count release

- [x] Complete final responsive verification and publish the selected-City total and filtered location result-count feedback before duplicate-label remediation.

## Homepage return navigation across all pages

- [x] Audit public, authentication, Tutor, Guardian, and protected routes for a clear return path to the homepage.
- [x] Add consistent accessible homepage navigation without disrupting sign-in, dashboard, registration, or detail-page flows.
- [x] Add or update route-level regressions and verify desktop/mobile navigation, TypeScript, production build, and code review before checkpointing.
- [x] Add a reusable non-home homepage-return control in the shared route shell, including the protected Tutor Dashboard route.

## Tutor Request panel analysis and recommendations

- [x] Audit the current Guardian Tutor Request panel workflow, fields, states, and Admin matching handoff.
- [x] Identify the highest-impact UX, validation, privacy, responsive, and operational improvements without changing approved business rules.
- [x] Present prioritized recommendations and obtain the Guardian/Tutor Request panel decisions required before specification and implementation.

## Approved Tutor Request panel implementation scope

- [x] Prepare and approve dependency-ordered tickets for the canonical `/request-tutor` Guardian flow and legacy route redirect.
- [x] Implement structured request fields, Guardian request tracking, and privacy-safe Admin-mediated post-match contact consent.
- [x] Verify request authorization, field validation, mobile accessibility, visual presentation, and release quality before checkpointing.

## Advanced Admin matching workspace

- [x] Audit and protect the existing Admin request queue, matching operations, and lifecycle status boundaries.
- [x] Add validated advanced filters, paging, and explicit Admin-controlled request status transitions.
- [x] Build a responsive Admin matching workspace with privacy-safe request detail, Tutor assignment, and status controls.
- [x] Add focused authorization, filtering, lifecycle, and UI regressions; then verify desktop/mobile presentation and release quality.

## Dedicated Admin access

- [x] Audit existing password login, active-session, and Admin-role guards for a dedicated Admin entry flow.
- [x] Add a dedicated Admin Login page that permits only established Admin accounts and redirects Admins to their workspace.
- [x] Add an Admin-only dashboard entry point without exposing Admin navigation to Guardian or Tutor accounts.
- [x] Add focused access-control regressions and verify desktop/mobile presentation, TypeScript, production build, and release quality.

## Admin security and access management

- [x] Audit existing account roles, sessions, notification delivery, and login telemetry for invitation, audit-log, and 2FA design.
- [x] Define and approve the Admin role hierarchy, invitation expiry/revocation rules, audit-log retention, and 2FA enrollment/recovery policy.
- [x] Prepare dependency-ordered implementation tickets for Admin management, invite delivery, audit-log review, and the approved 2FA flow.
- [x] Implement the approved Admin security work with authorization, privacy, recovery, accessibility, and release verification coverage.
- [x] Add non-destructive persistence and protected server contracts for Owner-managed Admin invitations, role access, audit history, encrypted 2FA material, and one-time recovery codes.
- [x] Build the Owner security workspace and mandatory Admin TOTP enrollment/challenge experience without exposing secrets or recovery codes after acknowledgment.

## Admin monitoring sidebar workspace discovery

- [x] Define the Admin sidebar information architecture for Tutor and Guardian activity monitoring.
- [x] Approve the monitoring data, privacy boundaries, status controls, and responsive workflow before implementation.
- [x] Build the approved Admin sidebar workspace with monitoring and authorized operational controls.
- [x] Add Tutor profile moderation with Admin reason/note and protected activity history.
- [x] Add Guardian activity monitoring with Admin-visible contact information and privacy-safe operational access.
- [x] Verify Admin workspace authorization, responsive sidebar behavior, profile moderation, Guardian data access, tests, and release quality.

## Owner Admin activity reporting dashboard

- [x] Build an Owner-only Admin activity summary data contract from existing audit records.
- [x] Add an Owner-only reporting dashboard and Admin sidebar navigation entry.
- [x] Verify reporting authorization, aggregation accuracy, responsive presentation, tests, and release quality.

## Homepage footer Admin Login quick link

- [x] Add a homepage footer Quick Links entry that routes visitors to the existing Admin Login page.
- [x] Verify the footer link on desktop and mobile, then run focused regression and release checks.

## Admin access help and mobile navigation

- [x] Add a footer Admin Help destination that explains safe Admin sign-in, invitation, and mandatory 2FA setup.
- [x] Add concise 2FA setup guidance from the Admin Login screen without weakening account or session controls.
- [x] Add an accessible Admin Login quick action to the mobile navigation menu.
- [x] Verify desktop/mobile navigation, help content, authorization boundaries, regression coverage, and release quality.

## Tutor Request and Tutor Registration UI/UX discovery

- [x] Audit the current Tutor Request and Tutor Registration form journeys for usability, clarity, responsive behavior, validation feedback, privacy cues, and conversion friction.
- [x] Define the requested professional UI/UX direction, priority improvements, and measurable acceptance criteria before implementation.

## Approved Tutor Request and Tutor Registration UI/UX scope

- [x] Convert Tutor Registration into a two-step, English-first guided journey while preserving its current account, password, consent, and Bangladesh location rules.
- [x] Redesign Tutor Request with an English-first guided progress system, clearer grouping, inline recovery guidance, and safe review feedback without changing Guardian privacy or matching logic.
- [x] Establish the shared Connected Sky plus restrained saffron visual system, trust cues, and conversion-focused public-form header policy.
- [x] Add focused interaction and responsive regression coverage, then verify desktop/mobile visual quality, privacy boundaries, TypeScript, and production build.

## Full-site professional UI/UX discovery

- [x] Inventory public, Guardian, Tutor, Admin, and Owner routes to identify current journey patterns, navigation hierarchy, responsiveness, and trust/privacy boundaries.
- [x] Audit the website’s desktop and mobile visual hierarchy, information architecture, content clarity, accessibility, conversion friction, empty/error states, and consistent design language.
- [x] Define and obtain approval for the full-site visual direction, role-specific priorities, implementation sequence, and measurable acceptance criteria before code changes.

## Approved 1-B public-first UI/UX ticketing scope

- [x] Prepare implementation tickets for the public-site, Guardian/Tutor conversion, Account/Auth UI/UX phase, preserving all current privacy, matching, authentication, and 2FA requirements.
- [x] Keep logo/wordmark style, saffron accent usage, human imagery, language policy, dashboard navigation policy, and mobile Tutor directory filter behavior decision-gated until explicitly approved.
- [x] Record Tutor/Admin/Owner workspace polish as a later protected-surface phase after the public-first phase is verified.

## Approved full-site 1-B UI/UX implementation ticketing

- [x] Finalize implementation tickets for the approved Connected Sky plus restrained saffron visual system and scalable custom brand treatment.
- [x] Finalize implementation tickets for controlled Bangladesh-context imagery on public trust and conversion pages, with no decorative imagery in protected workspaces.
- [x] Finalize implementation tickets for English-first UI copy, honest live/upcoming dashboard hierarchy, Account/Auth visual completion, and mobile Tutor filter sheet with applied-filter chips.
- [x] Define the protected Tutor/Admin/Owner workspace polish phase as a separately verified follow-on release.

## Full-site 1-B UI/UX implementation

- [x] Implement the approved scalable Connected Sky plus restrained saffron brand system across shared public navigation, page framing, and footer surfaces.
- [x] Add controlled Bangladesh-context human-learning imagery and English-first public information copy without adding fabricated testimonials or unsafe private information.
- [x] Upgrade Tutor discovery with an accessible mobile filter sheet, applied-filter chips, clear/reset controls, and preserved server-backed filtering and pagination behavior.
- [x] Complete Account/Auth surface visual states and clarify live versus upcoming workspace navigation without changing existing authorization, 2FA, privacy, or matching rules.
- [x] Add focused regression coverage and verify public/conversion/account responsive UX, accessibility, privacy, TypeScript, production build, and runtime health.

## Protected Tutor, Admin, and Owner workspace UI/UX discovery

- [x] Audit the current protected Tutor, Admin, and Owner workspace hierarchy, navigation, responsive behavior, live/upcoming states, and trust/privacy safeguards.
- [x] Record product decisions for the protected-workspace visual direction, role-specific priorities, and non-negotiable authorization boundaries.
- [x] Prepare a scoped, implementation-ready UI/UX plan with acceptance criteria and verification requirements.

## Approved protected workspace UI/UX implementation

- [x] Reorganize Tutor workspace navigation into clear active-work and coming-later groups, without changing any route, profile, request, privacy, or sign-out behaviour.
- [x] Improve Tutor dashboard overview, live task guidance, and honest planned-tool states for desktop and mobile.
- [x] Refine Admin and Owner operational workspaces around action queues, status/risk signals, and readable accountability reporting without changing access rights or data disclosure.
- [x] Improve the shared protected sidebar and Admin Login/2FA visual consistency, including mobile active context and close-after-navigation behaviour.
- [x] Add focused regression coverage and verify role/privacy/2FA safeguards, keyboard access, responsive presentation, TypeScript, production build, and runtime health.

## Guardian and Tutor account access discovery

- [x] Audit the current Guardian and Tutor registration, password sign-in, account recovery, and role-routing contracts.
- [x] Record decisions for email-or-mobile identifier handling, Guardian registration, duplicate-account safeguards, and secure recovery expectations.
- [x] Prepare an implementation-ready secure sign-in and registration plan matching the approved account-access visual direction.

## Approved Guardian and Tutor account access implementation

- [x] Add a role-safe email-or-Bangladesh-mobile password sign-in contract for existing Guardian and Tutor accounts, with normalized identifiers and non-enumerating error handling.
- [x] Build the approved Guardian/Tutor access interface with role selection, email-or-mobile identifier field, password visibility control, safe role-mismatch guidance, and existing-journey registration CTA.
- [x] Preserve separate Guardian and Tutor account identities, current Guardian request registration handoff, account privacy, Admin login separation, and mandatory Admin 2FA.
- [x] Add focused regression coverage and verify duplicate, invalid credential, role mismatch, keyboard, responsive, TypeScript, production build, and runtime safeguards.

## Register panel journey review

- [x] Audit the existing Guardian Tutor Request and Tutor Registration panels, then define the safe update needed for the public sign-in screen’s Register panel.
- [x] Prepare dependency-ordered implementation tickets for the approved role-specific Register-panel journey launcher.
- [x] Implement the approved role-specific Register-panel upgrade without duplicating or weakening the existing Guardian or Tutor registration journeys.
- [x] RP-01: Add safe Guardian/Tutor-only role preselection to public account access.
- [x] RP-02: Add accurate Guardian/Tutor journey guidance and canonical Register CTAs.
- [x] RP-03: Route the Tutor registration sign-in handoff to unified Tutor-selected account access.
- [x] RP-04: Add focused regression coverage and validate accessibility, privacy, desktop/mobile UI, TypeScript, tests, and production build.

## Guardian private-account registration presentation

- [x] Audit the current Guardian account-creation step against the existing Tutor Registration panel’s card hierarchy, form grouping, mobile action area, and accessibility patterns.
- [x] Refine the Guardian account-creation presentation without changing its data collection, privacy, validation, consent, or request-flow behavior.
- [x] Add focused regression coverage and verify desktop/mobile rendering, keyboard access, TypeScript, tests, and production build.

## Guardian password-strength feedback

- [x] Audit the existing Guardian password control and client/server validation rules before adding non-authoritative strength guidance.
- [x] Add a real-time, accessible password-strength indicator and actionable improvement hint to the Guardian account-creation step.
- [x] Add focused regression coverage and verify responsive presentation, existing validation, TypeScript, tests, and production build.

## Guardian confirm-password match feedback

- [x] Audit the existing password-confirmation control and validation before adding non-authoritative match feedback.
- [x] Add an accessible real-time match or mismatch indicator to the Guardian account-creation step.
- [x] Add focused regression coverage and verify feedback states, existing validation, responsive presentation, TypeScript, tests, and production build.

## Guardian registration feature visualizations

- [x] Create explanatory visual mockups for the password-manager compatibility hint and City/Area selection-complete indicator.

## Approved Guardian registration feedback implementation

- [x] GRF-01: Add a non-authoritative password-manager compatibility hint below the Guardian password controls.
- [x] GRF-02: Add a clear City/Area selection-complete summary after valid location selection.
- [x] GRF-03: Add focused regressions and complete desktop/mobile, privacy, TypeScript, test, and production-build validation.

## Approved Guardian follow-up improvements

- [x] Follow-up 1: Add interactive mobile regression coverage for Guardian account and Tutor Request stages at 375px, including keyboard/touch focus and action reachability.
- [x] Follow-up 2: Add a clear location edit/recovery affordance that returns users to the existing City/Area selectors without changing request data contracts.
- [x] Follow-up 3: Audit password-reset and account-recovery UX, document current behavior and safe actionable gaps, and add regressions for any implemented recovery changes.

## Approved Guardian Dashboard and shared Job Board planning scope

- [x] Analyze Guardian post-login dashboard shell, sidebar identity header, navigation tabs, and protected-role boundaries.
- [x] Define the three-page Guardian Hire a Tutor journey, optional intro, preview, submission state, and how-did-you-hear-about-us capture.
- [x] Define Admin-mediated tutor-request review, edit, publish-without-edit, and approval state transitions.
- [x] Define shared public/Tutor Job Board data contract, advanced filters, dynamic job-card title, count, Job ID generation, and Google Maps direction behavior.
- [x] Produce an implementation-ready Guardian Dashboard and Job Board plan with risks, open questions, and acceptance criteria.


## Guardian Dashboard and shared Job Board ticket package

- [x] Convert the approved Guardian Dashboard and shared Job Board plan into dependency-ordered implementation tickets with acceptance criteria, verification commands, privacy safeguards, and an explicit approval boundary.


## Guardian Dashboard and Job Board grill-with-docs review

- [x] Critically review the approved Guardian Dashboard and shared Job Board plan/tickets, document evidence confidence, contradictions, blockers, privacy/security risks, missing acceptance criteria, decision gates, and recommended corrections.


## JB-01 Job Board lifecycle contract implementation

- [x] JB-01: Define request/review, publication, matching, and closure lifecycle contracts without changing schema or public UI.
- [x] JB-01: Add pure tests for valid/invalid transitions, Job ID validation, expiry semantics, dynamic title generation, and canonical filter metadata.
- [x] JB-01: Run focused/full validation and save a stable checkpoint before requesting the next ticket approval.


## Approved Guardian Dashboard and Admin publishing implementation

- [x] Superseded shorthand mapping: GD-01 Guardian Dashboard shell was implemented as canonical GD-02; see the corrected mapping below.
- [x] Superseded shorthand mapping: GD-02 draft journey and JB-02 Admin publishing scope were reassigned to canonical GR-01/GR-02 and AD-01 before implementation.

## Approved canonical Guardian request and Admin publishing implementation

- [x] GD-02: Implement the protected Guardian Dashboard shell with truthful summary states, Guardian identity header, and role-safe requested sidebar navigation.
- [x] GD-02: Add focused Guardian Dashboard role-boundary and navigation regression coverage.
- [x] GR-01: Implement the authenticated private three-step Hire a Tutor data-entry flow, including private session draft recovery and canonical location validation.
- [x] GR-01: Add focused DOM and server regressions for required fields, state preservation, location dependencies, keyboard reachability, and mobile behavior.
- [x] GR-02: Implement sectioned preview, edit-to-step recovery, idempotent submission, and a truthful Admin-verification receipt.
- [x] GR-02: Add duplicate-submit, request ownership, receipt, error-recovery, and preview-action regressions.
- [x] AD-01: Implement Admin-only verification, edit/reconfirm, publish-without-edit, and append-only audit controls using JB-01 contracts.
- [x] AD-01: Add authorization, transition, privacy, auditability, and publication-safety regressions, then run the release gate.

## Approved published Job Board implementation

- [x] JB-02: Create a separate privacy-safe `tutorJobs` projection, migration, database helpers, and public/Tutor read contracts without raw Guardian contacts, student identity, notes, or exact addresses.
- [x] JB-02: Connect the AD-01 Admin publish/unpublish workflow transactionally to create, update, expire, and deactivate the published-job projection with safe Job ID handling.
- [x] JB-02: Add deterministic schema, lifecycle, authorization, privacy, expiry, and projection consistency regressions.
- [x] JB-03: Build the shared public and Tutor Dashboard Job Board with advanced filters, count, pagination, dynamic titles, accessible cards/details, truthful states, and Bangladesh-area Google Maps direction links.
- [x] JB-03: Add route, filter, pagination, privacy, accessibility, and responsive visual regressions; run full release validation.

## Requested product decision review

- [x] Grill decision 1: Assess Job Board expiry duration options and recommend a lifecycle default with acceptance criteria.
- [x] Grill decision 2: Assess Tutor Job Board apply behavior, including privacy, contact-routing, and matching implications.
- [x] Grill decision 3: Define the first-release scope and dependencies for Guardian Posted Jobs and Attendance tabs.
- [x] Document evidence, confirmed facts, assumptions, risks, rejected alternatives, and the minimum approval set for the three decisions.

## Approved expiry, interest, and Guardian self-service implementation

- [x] Implement the 14-day published-job expiry default, Admin-only extension after Guardian reconfirmation, and lifecycle/audit regressions.
- [x] Implement the protected Tutor Job Board interest workflow with one active interest per Tutor/job, secure status feedback, and Admin-only interest review.
- [x] Wire active-Tutor create, withdraw, and personal-interest procedures plus 2FA-gated Admin review procedures.
- [x] Add focused router authorization and lifecycle-error regressions for Tutor interest endpoints.
- [x] Add authenticated Tutor-only Job Board interest controls, loading/error/status feedback, and rendered regressions.
- [x] Surface the 2FA-gated Tutor interest review queue in the Admin Matching Workspace with private contact handling and status actions.
- [x] Add rendered Admin queue regressions for pending interest review actions and private Tutor-contact presentation.
- [x] Implement Guardian Posted Jobs v1 using Guardian-owned request history, truthful job/publication status, and ownership regressions. Guardian-initiated close-request actions are explicitly deferred.
- [x] Reuse the private Guardian request tracking content inside the Posted Jobs dashboard tab without duplicate page chrome.
- [x] Replace the Attendance placeholder with a truthful deferred state that explains its confirmed-match dependency.
- [x] Add focused Guardian dashboard tab regressions for Posted Jobs and Attendance content.
- [x] Implement a truthful Guardian Attendance deferred state that appears only after a confirmed Tutor match and does not imply attendance tracking exists.
- [x] Explicitly defer Guardian close-request actions until a separately approved workflow defines consequences, operational safeguards, and lifecycle regressions.
- [x] Run full tests, TypeScript, production build, code review, responsive verification, and save the integrated release checkpoint.
- [x] Complete a grill-with-docs review of the requested Guardian Dashboard, Admin moderation, and Job Board refinements against current implementation and supplied references.
- [x] Produce detailed, dependency-ordered implementation tickets for the approved Guardian Workspace Completion Release 1 recommendation.
- [x] Implement GD-03: Guardian ID-only sidebar identity header with initials fallback and true account creation date.
- [x] Implement GP-01: Guardian-owned controlled profile updates for approved non-login fields with privacy-safe audit coverage.
- [x] Implement GS-01: current-password-protected Guardian password change with no password disclosure in logs or UI state.
- [x] Implement GJ-01 and GJ-02: authoritative Guardian request-progress mapping across Dashboard and Posted Jobs.
- [x] Implement GH-01: truthful, static Guardian How it Works guidance with a safe support route.
- [x] Add the focused authorization, privacy, lifecycle, DOM, accessibility, and responsive regressions for the approved core release.
- [x] Run code review, full validation, and publish the approved Guardian core release checkpoint.
- [x] Define and document Guardian photo eligibility, file safety limits, status lifecycle, rejection rules, and retention/deletion policy.
- [x] Add a private Guardian photo record with ownership, moderation status, reviewer provenance, and privacy-safe audit events.
- [x] Implement authenticated Guardian photo upload, replacement, and pending-status experience using private storage.
- [x] Implement 2FA-gated Admin photo review with approve/reject actions and a safe rejection reason.
- [x] Render only approved Guardian photos; otherwise retain initials fallback across Guardian-facing identity surfaces.
- [x] Add authorization, ownership, lifecycle, storage, Admin-2FA, and rendered UI regressions for Guardian photos.
- [x] Run code review, full validation, and publish the Guardian photo moderation release checkpoint.
- [x] Review the proposed removal of mandatory Admin TOTP 2FA, credential-only Admin login, and Moderator role against current security, privacy, and audit boundaries.
- [x] Document role permissions, conflict points, risks, safer alternatives, acceptance criteria, and decisions required before changing access control.
- [x] Review the requested Tutor-style Guardian Dashboard navigation and profile information structure against the current Guardian workspace.
- [x] Document Guardian Dashboard tab-by-tab guidance, gaps, privacy/accessibility constraints, decision gates, and implementation recommendations.
- [x] Add a Guardian-owned, server-authoritative Open Requests mini-list to the Dashboard with loading, empty, and error states.
- [x] Map every visible Guardian request state to exactly one safe, status-derived next action without inventing matching or contact details.
- [x] Add regression coverage, responsive verification, code review, and release validation for the Guardian Dashboard Open Requests refinement.
- [x] Compare post-fe06f04b migrations and feature dependencies to assess database impact before any rollback to that checkpoint.
- [x] Document the safe rollback procedure, retained-data effects, and recovery precautions for checkpoint fe06f04b.

## Shared-hosting subdomain test deployment

- [x] Assess Lite Starter shared-hosting capability for Node.js/Express deployment on a separate test subdomain.
- [x] Define isolated subdomain, database, environment-variable, and storage requirements.
- [x] Verify cPanel/Node.js/SSH/MySQL details before any external deployment action.
- [x] Prepare staged deployment and post-deployment verification procedure.

> Current request: The user has another live website on this hosting account and wants to test Connect Tutors BD on a separate subdomain. No DNS, cPanel, database, or deployment changes have been made.

> Safety constraints: Do not overwrite the existing website document root; do not point the test site at the current production database without a reviewed isolation plan; do not expose or commit secrets; require explicit authorization before external hosting changes.

> Required evidence: hosting provider/cPanel access, Node.js application support (Setup Node.js App or Passenger), available Node version, SSH/Terminal access, MySQL creation/access, environment-variable support, persistent process support, and desired subdomain name.

> Decision gate: If Node.js runtime and persistent app support exist, use an isolated subdomain staging deployment. If the plan supports only PHP/static hosting, use Manus hosting or a Node-capable VPS for this full-stack application instead.

- [x] Session started: shared-hosting subdomain deployment planning on 2026-08-22.

- [x] Prepare and deliver a deployment-safe ZIP archive of the latest project version for self-hosted staging.

## Loading animation and hover-effect UX audit
- [x] Audit existing loading states, transitions, hover effects, and motion tokens across public and protected surfaces.
- [x] Evaluate accessibility, reduced-motion, keyboard, touch, performance, and interaction-state risks.
- [x] Produce an evidence-based motion recommendation and implementation decision log without changing production behavior.

## Approved motion, loading, and Job Board feedback implementation
- [x] M-01: Implement shared hover, focus-visible, active, and reduced-motion design tokens across interactive surfaces.
- [x] M-02: Add accessible shimmer skeletons for Dashboard and Job Board loading states, plus factual button pending states.
- [x] M-03: Improve Job Board inline filter/list loading, empty-state, error, and retry feedback without changing filtering or privacy contracts.
- [x] Add focused Vitest/component regressions for motion hooks/classes, loading semantics, pending actions, empty state, and retry behavior.
- [x] Run TypeScript, Vitest, production build, code review, and desktop/mobile visual verification before checkpoint.

## M-04 browser motion regression
- [x] Add desktop browser-level regression coverage for hover, focus-visible, and active press behavior.
- [x] Add mobile browser-level regression coverage for touch-safe interaction states and visible focus.
- [x] Add browser-level reduced-motion coverage using `prefers-reduced-motion: reduce`.
- [x] Run browser, unit, TypeScript, build, and responsive verification before checkpoint.

## Guardian segmented sidebar feasibility review
- [x] Inventory the current Guardian workspace routes, sidebar, pages, procedures, and data contracts.
- [x] Map requested Guardian information segments to live, partial, deferred, and database-backed capabilities.
- [x] Analyze database, authorization, privacy, responsive, accessibility, and migration risks.
- [x] Produce an evidence-based recommendation and decision log without changing production behavior.

## Guardian sidebar and workspace state implementation
- [x] Implement GNS-01 Guardian sidebar grouping, active route, mobile drawer, and planned-state UI.
- [x] Implement GNS-02 unified loading, empty, and error states for Guardian Dashboard, Posted Jobs, and Profile.
- [x] Add focused regressions for Guardian navigation and workspace feedback states.
- [x] Run TypeScript, Vitest, production build, code review, and desktop/mobile visual verification before checkpoint.

## Admin sign-in navigation correction
- [x] Remove Admin Sign In from the homepage primary navigation.
- [x] Preserve Admin Sign In as a footer quick link for development access.
- [x] Add regression coverage confirming the primary-nav exclusion and footer presence.
- [x] Run responsive, TypeScript, Vitest, build, and checkpoint validation.

## Guardian dashboard entry-point fix
- [x] Add a direct Guardian Profile Dashboard entry from the signed-in account page.
- [x] Ensure signed-in Guardian users have a reliable post-sign-in/dashboard route.
- [x] Add regression coverage for Guardian dashboard entry-point visibility and navigation.
- [x] Run TypeScript, Vitest, production build, and responsive verification before checkpoint.

- [x] Add a direct Guardian Dashboard entry point to the signed-in Account landing page.
- [x] Refine Guardian post-sign-in routing so Guardians reach their workspace efficiently without changing Tutor/Admin destinations.
- [x] Add focused regressions for Guardian Account navigation and run full validation before staging handoff.

## Guardian Hire a Tutor form mapping audit
- [x] Audit the current Guardian Hire a Tutor fields against the approved requirements and supplied mobile reference.
- [x] Document missing, unnecessary, and incorrectly mapped fields, including Curriculum, English Version, and University.
- [x] Produce an implementation-ready recommendation with assumptions, open decisions, and acceptance criteria.

- [x] Export the section-wise Guardian Hire a Tutor audit as an editable DOCX for user updates.

## Guardian curriculum category update
- [x] Replace the Guardian Curriculum Category options with the user-approved list and remove the duplicate University Help entry.
- [x] Add focused regression coverage for the exact approved curriculum option inventory.
- [x] Validate the updated selector on desktop and mobile, then save a live checkpoint.

## Guardian Special Child Education category
- [x] Add Special Child Education to the approved Guardian Curriculum Category selector.
- [x] Extend the exact-inventory regression and validate the targeted category update before checkpointing.

## Guardian curriculum-dependent Class/Level options
- [x] Replace the flat Class/Level selector with approved Bangla Medium, English Version, and English Medium option lists after confirming the final English Medium label.
- [x] Add focused mapping regressions and validate the curriculum-dependent selector before checkpointing.

## Guardian University Help Class/Level options
- [x] Add the approved University Help degree and subject inventory, retaining BA (English) only once.
- [x] Add exact-inventory regression coverage and validate the targeted mapping update before checkpointing.

## Guardian additional curriculum Class/Level options
- [x] Add the approved Madrasa Medium, Religious Studies, Language Learning, Admission Test, Arts, and Test Preparation mappings.
- [x] Add focused exact-inventory regressions and validate the targeted mapping update before checkpointing.

## Guardian skill-development and special-child option mappings
- [x] Add the approved Professional Skill Development, Special Skill Development, and Special Child Education mappings.
- [x] Add focused exact-inventory regressions and validate the targeted mapping update before checkpointing.

## Guardian English Medium Curriculum Type
- [x] Add an English Medium-only required Curriculum Type selector with British, Cambridge, and Ed-excel as mutually exclusive options.
- [x] Add focused visibility, reset, single-selection, and validation regressions; then validate the form flow before checkpointing.

## Guardian early-years subject options
- [x] Add the approved subjects for Bangla Medium and English Version Pre-Schooling, Play, Nursery, and KG: All, English, Bangla, General Maths, Handwriting, Drawing, Arts, and Religious Studies.
- [x] Add exact conditional mapping regressions and validate that other curricula and levels retain their current subject behavior.

## Guardian Bangla Medium Class 1–8 subject options
- [x] Add the approved Bangla Medium Class 1–8 subjects: All, English, Bangla, BGS, General Maths, General Science, ICT, Religious Studies, Hinduism Religious Studies, Buddhism Religious Studies, Handwriting, Drawing, Arts, and Others.
- [x] Add exact conditional mapping regressions, including duplicate prevention, and verify other subject mappings remain unchanged.

## Guardian Bangla Medium Class 9–10 subject options
- [x] Add the approved Bangla Medium Class 9–10 subjects: Physics, Chemistry, Biology, General Maths, Higher Maths, Social Science, Bangla, English, General Science, ICT, BGS, Religious Studies, Accounting, Finance & Banking, Management, Business Entrepreneurship, Economics, Civics, Home Economics, Agricultural Education, History, Geography, Psychology, Physical Education, Health & Sports, Handwriting, Drawing, Arts, and Others.
- [x] Add exact conditional mapping regressions, including duplicate prevention, and verify Class 1–8 and all other subject mappings remain unchanged.

## Guardian Bangla Medium HSC subject options
- [x] Add the approved Bangla Medium HSC-1st Year and HSC-2nd Year subjects: Physics, Chemistry, Biology, Higher Maths, ICT, Accounting, Finance, Management, Production Management & Marketing, Statistics, English, Bangla, Religious Studies, Political Science, History, Islamic History and Culture, Social Work, Logic, Agricultural Education, Economics, Sociology, Geography, Commercial Geography, Psychology, Civics, All, and Others.
- [x] Add exact conditional mapping regressions, including duplicate prevention, and verify Class 9–10 and all other subject mappings remain unchanged.

## Guardian English Version Class 1–8 subject options
- [x] Add the approved English Version Class 1–8 subjects: All, English, Bangla, BGS, General Maths, General Science, Social Science, General Knowledge, ICT, History, Geography, Home Economics, Agricultural Education, Religious Studies, Hinduism Religious Studies, Buddhism Religious Studies, Handwriting, Drawing, Arts, and Others.
- [x] Add exact conditional mapping regressions, including duplicate prevention, and verify Bangla Medium and all other subject mappings remain unchanged.

## Guardian English Version Class 9–10 subject options
- [x] Add the approved English Version Class 9–10 subjects: Physics, Chemistry, Biology, General Maths, Higher Maths, Social Science, Bangla, English, General Science, Computer Studies, BGS, Religious Studies, Accounting, Finance & Banking, Management, Business Entrepreneurship, Economics, Civics, Home Economics, Agricultural Education, History, Geography, Psychology, Physical Education, Health & Sports, Handwriting, Drawing, Arts, and Others.
- [x] Add exact conditional mapping regressions, including duplicate prevention, and verify English Version Class 1–8, Bangla Medium, and all other subject mappings remain unchanged.

## Guardian English Version HSC subject options
- [x] Add the approved English Version HSC-1st Year and HSC-2nd Year subjects: Physics, Chemistry, Biology, Higher Maths, ICT, Accounting, Finance, Management, Production Management & Marketing, Statistics, English, Bangla, Religious Studies, Political Science, History, Islamic History and Culture, Social Work, Logic, Agricultural Education, Economics, Sociology, Geography, Commercial Geography, Psychology, Civics, All, and Others.
- [x] Add exact conditional mapping regressions, including duplicate prevention, and verify English Version Class 9–10, Bangla Medium, and all other subject mappings remain unchanged.

## Guardian English Medium early-years subject options
- [x] Add the approved English Medium Pre-Schooling, Play, Nursery, and KG subjects: All, English, Bangla, General Maths, Handwriting, Drawing, Arts, Religious Studies, and Others.
- [x] Add exact conditional mapping regressions, including duplicate prevention, and verify Bangla Medium, English Version, and all other subject mappings remain unchanged.

## Guardian English Medium Class 1–5 subject options
- [x] Add the approved English Medium Class 1–5 subjects: All, Maths, English Literature, English, Bangla, Science, Islamic Studies, History, ICT, Social Science, Bangladesh & Global Studies, Geography, Handwriting, Drawing, Arts, and Others.
- [x] Add exact conditional mapping regressions, including duplicate prevention, and verify English Medium early-years and all other subject mappings remain unchanged.

## Guardian English Medium Standard 6–7 subject options
- [x] Add the approved English Medium Standard 6–7 subjects: All, Physics, Chemistry, Biology, Maths, English Literature, English, Bangla, Science, Business Studies, Islamic Studies, History, ICT, Social Science, Bangladesh & Global Studies, Economics, Geography, Handwriting, Drawing, Arts, and Others.
- [x] Preserve the approved Standard 1–5 mapping, including Standard 5, and add exact conditional mapping regressions with duplicate prevention.

## Guardian English Medium Standard 8–9 and O Level subject options
- [x] Add the approved English Medium Standard 8, Standard 9, and O Level subjects: All, Physics, Chemistry, Maths, Maths B, Maths D, Additional Maths, Biology, English Literature, English Language, Bangla, ICT, Accounting, Business Studies, Economics, Bangladesh Studies, Commerce, Islamic Studies, Law, Handwriting, Drawing, Arts, and Others.
- [x] Add exact conditional mapping regressions, including duplicate prevention, and verify English Medium Standard 1–7 and all other subject mappings remain unchanged.

## Guardian English Medium A Level (AS/A2) subject options
- [x] Add the approved English Medium A Level (AS) and A Level (A2) subject inventory, retaining Additional Maths once and cleaning only duplicate punctuation.
- [x] Add exact conditional mapping and duplicate-prevention regressions, then verify existing English Medium and all other curriculum subject maps remain unchanged.

## Guardian Learning needs interface refinement
- [x] Refine the Request a Tutor Learning needs step with a professional mobile-first visual hierarchy, clearer field grouping, and polished progress presentation.
- [x] Improve subject-selection clarity, keyboard/focus treatment, selected-state feedback, and Continue-action presentation without changing curriculum mappings, validation, privacy, or request submission behavior.
- [x] Add or update focused regressions, complete desktop/mobile visual verification and release validation, then publish the refinement.

## Guardian Tuition Type option update
- [x] Update Guardian Tuition Type options to Home Tutoring, Online Tutoring, Group Tutoring, and Package Tutoring with safe persistence and matching compatibility.
- [x] Require City and Location for Home, Group, and Package Tutoring requests, while keeping Online Tutoring location-free.
- [x] Add focused request-contract regressions, validate the updated interface across desktop and mobile, complete release checks, and publish the update.

## Guardian Group Tutoring capacity
- [x] Add a Group Tutoring-only maximum student capacity field to Guardian requests with validated persistence and safe legacy-request handling.
- [x] Show the approved capacity only in authorized Guardian, Admin Matching, and privacy-safe public Job Board views where Group Tutoring is published.
- [x] Add focused regressions, complete migration and release validation, then publish the capacity update.

## Package Tutoring duration
- [x] Add a Package Tutoring-only duration field in months, with client and server validation plus legacy-safe draft behavior.
- [x] Persist duration through an additive schema migration and expose it only in authorized Guardian and Admin request views.
- [x] Add focused regressions, complete privacy/release validation, and publish the duration enhancement.

## Guardian request field assessment
- [x] Assess Student Gender, optional Address Details, and required Number of Students fields before implementation, including privacy, matching, and Job Board effects.
- [x] Present an implementation-ready decision plan with validated field rules, visibility boundaries, risks, and outstanding product decisions.

## Guardian request field ticket planning
- [x] Break the proposed Student Gender, Address Details, and Number of Students changes into small, ordered decision-ready tickets with alternative scope suggestions.

## Guardian request field specification
- [x] Produce an approval-ready P1 technical specification for private Student Gender and Number of Students request fields without implementation.

## Guardian request P1 implementation ticketing
- [x] Produce a detailed, dependency-ordered implementation ticket breakdown for the approved P1 specification without writing application code.

## Guardian request P1 approval menu
- [x] Present decision options, trade-offs, and recommendations for each P1 implementation ticket before beginning any work.

## Guardian request P1 revised public-field scope
- [x] Revise P1 decisions so Student Gender, Teacher Gender Preference, and Number of Students are shown on the public Job Board while Address Details remains private.
- [x] Place the approved public fields in the Job Board card’s primary summary, following the supplied reference hierarchy without exposing Address Details.
- [x] Maintain the supplied public detail-view chronology for approved Job Board fields while excluding Address Details and all other private data.

## Approved Guardian request and Job Board implementation
- [x] Add nullable Student Gender and Address Details storage through one additive migration, with Number of Students required only for Home, Online, and Package requests.
- [x] Enforce the approved server contract, including optional Male/Female Student Gender, private Address Details, and the Group Tutoring exclusion for Number of Students.
- [x] Add Guardian form controls in the approved order, legacy-safe drafts, client validation, private review, and private request-history displays.
- [x] Limit Address Details to the Guardian, Admin, and assigned Tutor views while excluding it from notifications, public output, directions, and titles.
- [x] Publish Number of Students, selected Student Gender, and all Teacher Preference labels in the public Job Board card and ordered details view without exposing private data.
- [x] Add focused privacy and role-regression coverage, complete release validation, and publish one live checkpoint.

## Guardian post-submission confirmation assessment
- [x] Review the existing private Guardian submission confirmation and recommend a privacy-safe, actionable summary without implementation.

## Guardian full submission summary requirements
- [x] Add a post-submission Guardian-only full summary that displays Student name, Student Gender, Address Details, and Additional notes without widening any Tutor or public disclosure. (Superseded by the later approved concise acknowledgement, which deliberately excludes private submission details.)

## Guardian notification, Admin matching, and confirmation-letter planning
- [x] Assess Guardian status-change notification channels, consent, timing, privacy, retry, and failure-handling requirements without implementation. (Completed in the documented planning workflow.)
- [x] Assess advanced Admin matching filters and private assignment-note requirements, including authorization, audit, and responsive usability constraints, without implementation. (Completed in the documented planning workflow.)
- [x] Assess the confirmed-match Confirmation Letter workflow, including generation trigger, authorized recipients, data/privacy boundaries, delivery, and revision rules, without implementation. (Completed in the documented planning workflow.)
- [x] Present one decision question at a time, record the user’s answers, and prepare an implementation plan only after approval. (Completed before the approved implementation.)

## Role-specific post-sign-in redirect assessment
- [x] Assess and, only after approval, route successful Guardian sign-ins to the Sidebar Posted Jobs tab and Tutor sign-ins to the Sidebar Dashboard tab.
- [x] Apply the approved redirect contract: Guardian and legacy user roles always open Posted Jobs after sign-in; Tutor accounts always open the Tutor Dashboard rather than restoring a deep link.

## Guardian mobile post-sign-in defect
- [x] Fix the authenticated Guardian mobile redirect so the Posted Jobs sidebar view opens rather than the unauthenticated sign-in screen.

## Guardian post-sign-out navigation defect
- [x] Fix Guardian sign-out so users leave the protected dashboard route rather than seeing the authentication-required fallback screen.
- [x] Route Guardian and Tutor dashboard sign-outs to their respective public sign-in pages after the session is cleared.
- [x] Revise Guardian and Tutor dashboard sign-out destinations to the public homepage and remove the dashboard header Return to home option.

## Guardian confirmation, pending jobs, and request updates assessment
- [x] Assess and plan a premium Guardian post-submission disclaimer page with View My Requests and Post Another Request actions.
- [x] Assess and plan a Pending Jobs summary, five-stage Guardian-visible request timeline, and guarded Details-to-update-request flow without implementation before approval.
- [x] Break the proposed Guardian confirmation, Pending Jobs, timeline, and update flow into small decision tickets with one-at-a-time recommendations and options.

## Approved Guardian confirmation and request-management implementation
- [x] Define the Guardian-facing five-stage lifecycle, audit data, and Admin-controlled post-Pending transition contract.
- [x] Add a Guardian-owned Pending-only request update API with server-side ownership, validation, and private audit history.
- [x] Build the premium post-submit acknowledgement page with Request ID, privacy/review notice, and the two approved dashboard actions.
- [x] Build a Pending-first Posted Jobs overview with status counts and privacy-safe request summaries.
- [x] Build responsive private request details: desktop expandable panel and mobile dedicated Details page, including the status timeline and Pending-only edit control.
- [x] Update Admin request-management controls for all post-Pending workflow stages and auditable cancellation reasons.
- [x] Add lifecycle, authorization, privacy, responsive rendering, and regression coverage; complete release verification and publish.

## Guardian notification, Admin matching, and confirmation-letter planning
- [x] Assess Guardian status-change notification channels, consent, timing, privacy, retry, and failure-handling requirements without implementation.
- [x] Assess advanced Admin matching filters and private assignment-note requirements, including authorization, audit, and responsive usability constraints, without implementation.
- [x] Assess the confirmed-match Confirmation Letter workflow, including generation trigger, authorized recipients, data/privacy boundaries, delivery, and revision rules, without implementation.
- [x] Present one decision question at a time, record the user’s answers, and prepare an implementation plan only after approval.

## Approved Guardian notifications, Admin matching, and confirmation-letter implementation
- [x] Add private notification, append-only assignment-note, and versioned confirmation-letter database contracts with safe additive migrations.
- [x] Implement protected notification and Admin assignment-note procedures with ownership, role, deduplication, and audit safeguards.
- [x] Build Guardian notification inbox, unread badge, deep links, and responsive read-state experience.
- [x] Add server-side operational filters plus responsive Admin filter controls and categorised assignment-note timeline.
- [x] Build the Admin-reviewed bilingual Confirmation Letter draft, issuance, versioning, and protected recipient access flow.
- [x] Add Guardian/Tutor confirmation-letter dashboard access and issuance notifications without exposing private request details.
- [x] Add lifecycle, privacy, authorization, document-access, accessibility, responsive, and release validation coverage.

## Approved Admin Matching Saved Views implementation
- [x] Add an Admin-owned private Saved View contract for operational matching filters with safe additive persistence and strict ownership rules.
- [x] Implement protected Admin Saved View list, create, apply-compatible, and delete procedures with input validation.
- [x] Build responsive Saved Views controls in the Admin Matching workspace for saving, applying, and deleting filter configurations.
- [x] Add ownership, filter-serialization, accessibility, responsive, and release validation coverage for Saved Views.

## Madrasa Medium class-based subject update
- [x] Update Madrasa Medium subjects for Play–Class 8, Class 9–10, and Alim 1st–2nd Year with the approved inventories.
- [x] Add exact mapping and isolation regressions, complete release validation, and publish the scoped curriculum update.

## Admission Test class-based subject update
- [x] Update the approved subjects for School, Public University, Private University, Engineering University, Medical College, and IBA Admission Test levels.
- [x] Add exact mapping and isolation regressions, complete release validation, and publish the scoped curriculum update.

## Default Admin Matching Saved View implementation tickets
- [x] DSV-01: Add a private, owner-scoped default Saved View contract that permits at most one default per Admin without storing matching results or private request data.
- [x] DSV-02: Add 2FA-gated Admin procedures and regressions to set or clear only the caller’s default Saved View.
- [x] DSV-03: Add responsive Saved Views UI controls for setting, clearing, and visibly identifying the personal default view.
- [x] DSV-04: Auto-apply the default Saved View on a fresh Admin Matching visit without overriding an explicit active View or all-request reset.
- [x] DSV-05: Validate authorization, privacy, auto-apply behavior, keyboard accessibility, desktop/mobile layout, full test/build gates, and publish one release checkpoint.

## Private Admin Saved View rename implementation
- [x] Add owner-scoped, 2FA-gated Saved View rename behavior with bounded names and duplicate-name conflict handling.
- [x] Add accessible responsive rename controls, focused API/UI regressions, full validation, and one stable release checkpoint.

## Tutor Job Board Apply Now discovery
- [x] Analyze a Tutor-only Apply Now flow for public and signed-in Tutor Job Boards, including sign-in routing, Admin review handoff, privacy, conflicts, alternatives, and approval questions before implementation.
- [x] Define the approved discovery scope for public Apply Now: safe sign-in return, mandatory Tutor profile completion, verified-profile-only application eligibility, and privacy-safe Admin Tutor Apply review.

## Approved Tutor Apply Now implementation
- [x] Add an accessible public Job Board Apply Now CTA with a safe Tutor sign-in return destination, without accepting external or privileged routes.
- [x] Route signed-in Tutors through profile completion and approved-profile status before returning to the selected Job Board detail; require a second explicit Apply Now action and never auto-apply.
- [x] Enforce active-account plus approved-profile eligibility in the server-side Tutor application procedure and retain duplicate/unavailable job protections.
- [x] Present the existing private Admin interest-review queue as Tutor Apply without changing its 2FA requirement or privacy boundaries.
- [x] Add focused sign-in-return, profile eligibility, authorization, privacy, desktop/mobile, full-suite, typecheck, production-build, and release-validation coverage; save one stable checkpoint.

## Panel session-exit discovery
- [x] Examine Guardian, Tutor, and Admin authentication, routing, and browser-exit behavior; define a safe Sign out-only panel-exit policy, required clarification, components, validation plan, and approval scope before implementation.

## Guardian panel request-flow discovery
- [x] Analyze moving Guardian Start a new request into the protected Guardian panel, redirecting successful submissions to Posted Jobs → Pending, and retaining Admin-only edit/approval before publication to the public and Tutor Job Boards; define the clarification, components, validation plan, and approval scope before implementation.

## Approved panel session and Guardian request implementation
- [x] Replace password-created persistent browser authentication with browser-session authentication while preserving explicit logout and Admin 2FA proof handling.
- [x] Add accessible shared public-route exit confirmation that signs Guardian, Tutor, or Admin users out before any configured panel-to-public navigation.
- [x] Render the logged-in Guardian request journey within the Guardian Hire a Tutor panel and redirect successful submission to Posted Jobs → Pending without changing Admin approval or Job Board privacy rules.
- [x] Add focused session, navigation, request-handoff, authorization, privacy, desktop/mobile, full-suite, typecheck, production-build, and release-validation coverage; save one stable checkpoint.

## Bilingual helper-text and content-density analysis
- [x] Audit the Tutor Profile and representative Guardian, Tutor, Admin, public, and authentication screens for simultaneous Bengali-English helper text, duplicate guidance, and language inconsistency without changing code.
- [x] Produce a prioritized Bengali report on excessive website copy, clarity, accessibility, information hierarchy, mobile scanning, risks, and recommended content-governance decisions without implementation.
- [x] Produce an English-primary priority list and staged fixing plan for redundant interface copy, preserving privacy, status, validation, and accessibility guidance without implementation.
- [x] Break the approved English-primary copy-reduction plan into small, sequential, approval-ready tickets and present one option at a time without implementation.
- [x] CP-01 decision: Use English-only visible Tutor Profile copy; do not retain Bengali helper text in the Profile interface.
- [x] CP-01 implementation: Replace all visible Tutor Profile Bengali and bilingual copy with concise English-only copy while preserving field semantics, validation, approval, privacy, and Apply Now guidance.
- [x] Create a concise review presentation for the recommended CP-02 One Dynamic Status Card design before any implementation.
- [x] CP-02 implementation: Replace the Tutor Profile top-area status guidance with one state-aware status card containing one concise English action, while preserving approval, privacy, validation, and Apply Now safeguards.
- [x] Explain CP-03, CP-04, and CP-05 using current Tutor Profile examples, proposed English-only revisions, safeguards, and user-impact reasoning without implementation.
- [x] CP-03 implementation: Reduce Tutor Profile section-level helper copy to essential English-only guidance while preserving required context and accessibility.
- [x] CP-04 implementation: Move non-essential Tutor Profile field guidance to just-in-time validation while retaining required/optional semantics and clear recovery feedback.
- [x] CP-05 implementation: Consolidate Tutor Profile review and selected-tuition return feedback into the state-aware status card without auto-applying to a tuition.
- [x] Prepare approval-ready tickets for concise Job Board Apply Now microcopy, clearer Profile status-card states with accessible icon/color cues, and a safe smooth loading state for returning to a selected tuition.
- [x] Analyze and prepare approval-ready privacy-policy wording for showing Student Gender—but no student name or other identifying information—in public and Tutor Job Board detail views before UX-AN-01 implementation.
- [x] UX-AN-01 implementation: Show Student Gender only in Public and Tutor Job Board detail views, and refine state-aware Apply Now microcopy without exposing private data or auto-applying.
- [x] Inspect and prepare an approval-ready implementation plan to complete the Tutor Dashboard Sidebar and Tabs, including profile identity data, smooth collapsible navigation, scrolling, premium interactions, responsive behavior, and regression validation.
- [x] TSD-01 implementation: Add a private Tutor Sidebar identity header with the existing logo/wordmark, profile photo, name, email, automatic Tutor ID, and Joined date with safe fallbacks.
- [x] TSD-02 implementation: Deliver accessible desktop icon-rail collapse, mobile full-close, smooth reduced-motion-safe transitions, and independent sidebar navigation scrolling.
- [x] TSD-03 implementation: Refine existing Tutor Sidebar navigation and tabs with premium active, focus, icon, group, and planned-destination treatments without creating misleading placeholder pages.
- [x] Remove the redundant large page-header banner from every Tutor Dashboard tab while retaining sidebar identity, tab content, protected navigation, and accessibility.
- [x] Prepare a no-code, website-example-based plan to make the Tutor Dashboard overview more concise and priority-led without changing protected workflows.
- [x] Remove all current content from the Tutor Dashboard overview tab, leaving only the protected shell and sidebar/navigation; do not alter other Tutor tabs or add replacement content.
- [x] Inspect and prepare an approval-ready plan for Tutor sign-out-only panel exit, automatic logout on any other panel exit, and direct post-login routing to the Tutor Dashboard without code changes.
- [x] Prepare a revised no-code Tutor session plan that preserves other signed-in Tutor tabs when one tab closes and keeps public-home visits independent from Tutor sign-out.
- [x] Prepare the final no-code Tutor session plan with global logout across all Tutor tabs only after explicit Sign out, while Dashboard refresh remains signed in and other public tabs remain independent.
- [x] Implement Tutor tab-scoped protected sessions with direct Dashboard login, refresh continuity, same-tab protected exit handling, independent public tabs/tab closure, and global explicit Sign out across all Tutor tabs.
- [x] TSH-01: Add a Tutor-only semantic shared tab header with a bordered responsive layout, current-tab context, notification trigger, and private profile-avatar trigger without altering Guardian/Admin shells.
- [x] TSH-02: Add accessible notification empty-state and Tutor account menus, showing only private Tutor name and labeled Tutor ID, while preserving the dirty Profile sign-out guard and global Tutor logout behavior.
- [x] TSH-03: Add one-time Tutor sign-out success feedback on the Tutor sign-in page plus focused semantic, responsive, account-menu, notification, and sign-out regressions.
- [x] TSH-04: Add visible disabled sign-out loading feedback and accessible hover/focus interaction styling to Tutor account-menu actions while preserving confirmation and logout behavior.
- [x] Inspect Public and Tutor Job Board data contracts, live-job query behavior, current filters, responsive layouts, and pagination readiness for the requested planning work.
- [x] Prepare an approval-ready plan for a shared live-job count header, advanced-filter control, 20-job pagination, responsive two-/one-column layout, and premium hover treatment without coding.
- [x] JBR-01: Update the shared Public/Tutor Job Board query contract and tests so live-job lists default to 20 safe public jobs per page and result counts reflect active filters.
- [x] JBR-02: Replace the Job Board hero and persistent filter sidebar with a semantic bordered live-job toolbar and accessible responsive advanced-filter drawer while preserving all existing filter fields and privacy boundaries.
- [x] JBR-03: Add accessible numbered pagination, premium card hover/focus/reduced-motion treatment, and targeted responsive/privacy/Apply Now regressions for the shared Job Board.
- [x] Review Tutor Panel double-login behavior, mobile sidebar visibility, session/navigation loops, and responsive UI smoothness; document confirmed defects and a prioritized no-code remediation plan.
- [x] TPR-P0: Sanitize authenticated identity responses so raw password hashes and nonessential private account fields never reach browser clients; add a regression proving the response allow-list.
- [x] TPR-P1A: Restore an accessible mobile Tutor sidebar trigger in the shared protected shell without changing desktop navigation, account controls, or role boundaries.
- [x] TPR-P1B: Remove the Tutor post-login redirect/cache race that can require a second sign-in while preserving per-tab proof storage, Apply Now return behavior, and explicit global sign-out.
- [x] TPR-UX-01: Add a concise, accessible Tutor sign-in-to-Dashboard loading transition with deterministic regression coverage, preserving the secure tab-scoped hand-off.
- [x] TPR-UX-02: Correct the direct Tutor sign-in footer spacing so supporting text does not visually overlap the primary sign-in action at desktop width.

- [x] ZIP-01: Prepare and verify an updated local-host-ready source ZIP for delivery, excluding generated dependencies, build output, logs, and secrets.

- [x] ZIP-02: Include concise Bangla local setup instructions and explain Skeleton/Shimmer loading behavior for the delivered package.

- [x] ZIP-03: Deliver the verified updated project ZIP to the user.

## ZIP delivery history

- [x] ZIP-04: Future ZIP packaging requests should create a new versioned archive without overwriting prior delivered archives.


- [x] TDS-LOAD-01: Add a custom accessible responsive Skeleton/Shimmer loading state for Tutor Dashboard data fetches, with focused regression coverage and no change to protected-route/session behavior.

- [x] ZIP-05: Create and verify a new complete local-host-ready project ZIP containing the latest Tutor Dashboard Skeleton/Shimmer update, excluding secrets, dependencies, generated output, logs, and repository metadata.

- [x] DOC-01: Add a standalone Bangla Markdown localhost run guide covering ZIP extraction, dependency installation, dev commands, database cautions, troubleshooting, and Skeleton/Shimmer explanation.

- [x] DOC-02: Expand the Bangla localhost guide with detailed Windows step-by-step instructions and clearly labeled illustrative screenshots for extraction, PowerShell setup, dependency installation, server launch, and browser verification.

- [x] DOC-03: Update both Windows localhost Markdown guides so all project-directory examples consistently use C:\\Projects\\connect-tutors-bd.

- [x] ZIP-06: Create and verify a new complete project ZIP containing the latest Windows-path-updated guides and documentation screenshots, excluding secrets, dependencies, generated output, logs, and repository metadata.
- [x] ADM-AUTH-01: Replace the interactive Admin 2FA sign-in requirement with secure User ID and password authentication while retaining server-side Admin role guards, password hashing, sessions, and deterministic regression coverage.
- [x] ADM-AUTH-02: Add a non-public, normalized dedicated Admin User ID credential model; reserve `Admin` for the initial Owner/Admin without using database IDs, OAuth IDs, or email as the login identifier.
- [x] ADM-AUTH-03: Add Owner-only secure Admin credential provisioning/reset, direct Admin password sign-in, safe audit events, and generic credential failures without exposing private fields or plaintext passwords.
- [x] ADM-AUTH-04: Remove interactive Admin 2FA enforcement from protected Admin procedures while retaining server-side Admin role checks and Owner-only authorization.
- [x] ADM-AUTH-05: Replace Admin sign-in/workspace client 2FA routing with User ID and password UX, and safely retire or redirect legacy 2FA routes.
- [x] ADM-AUTH-06: Validate Admin authentication, authorization, privacy, type, build, and responsive behavior; then checkpoint the release.
- [x] ADM-OWNER-01: Diagnose and correct Owner recognition when the verified Project Owner is denied Owner controls and cannot provision the first `Admin` credential.
- [x] ADM-OWNER-02: Add focused regression coverage proving the real Project Owner sees Admin security while non-Owners remain denied, then validate and checkpoint the correction.
- [x] ADM-OWNER-03: Reproduce and fix the live Project Owner dashboard route where Owner controls remain absent despite the owner session, rather than relying on a stale client-side Owner projection.
- [x] ADM-OWNER-04: Remove remaining visible Admin 2FA copy, add the exact live-route regression, validate the Owner credential-management workflow, and checkpoint only after the user-facing route is confirmed.
- [x] ADM-RESET-01: Add an English-first “Forgot password?” entry point on Admin login that routes to a verified Project Owner recovery path without identifying whether an Admin account exists.
- [x] ADM-RESET-02: Reuse Owner-only Admin credential reset controls, retain generic and privacy-safe recovery guidance, and add focused allowed/denied UI regressions.
- [x] ADM-RESET-03: Validate recovery routing, keyboard/mobile behavior, role protection, full type/test/build checks, and checkpoint the release.
- [x] ADM-POLICY-01: Add an English-first password-strength policy banner to Admin credential setup and reset, describing the enforced requirements without exposing credentials.
- [x] ADM-POLICY-02: Add live accessible strength and confirmation feedback that mirrors server-side validation and does not persist plaintext password data.
- [x] ADM-POLICY-03: Validate the policy banner, keyboard/mobile behavior, password reset flow, full test/type/build checks, and checkpoint the release.
- [x] AUTH-VISIBILITY-01: Inventory every user-facing sign-in password input and define a shared accessible show/hide password control.
- [x] AUTH-VISIBILITY-02: Add the shared password visibility control to all login and sign-in forms without changing authentication contracts or password-manager metadata.
- [x] AUTH-VISIBILITY-03: Add regression coverage, validate desktop/mobile behavior, complete release checks, and checkpoint the enhancement.
- [x] AUTH-CAPSLOCK-01: Inventory login password fields and define an accessible, non-persistent Caps Lock warning contract.
- [x] AUTH-CAPSLOCK-02: Add reusable Caps Lock detection and warning feedback to every user-facing sign-in password input.
- [x] AUTH-CAPSLOCK-03: Add regression coverage, validate desktop/mobile behavior, complete release checks, and checkpoint the enhancement.
- [x] ADM-NEWPASSWORD-CAPSLOCK-01: Map the Admin credential setup/reset new-password and confirmation fields to the shared non-persistent Caps Lock warning behavior.
- [x] ADM-NEWPASSWORD-CAPSLOCK-02: Add accessible Caps Lock warnings to both new-password inputs without changing policy validation or credential handling.
- [x] ADM-NEWPASSWORD-CAPSLOCK-03: Add regression coverage, validate responsive reset-form behavior, complete release checks, and checkpoint the enhancement.
- [x] ADM-STRENGTH-VISUAL-01: Define visual weak, medium, and strong indicator states using the existing password-policy helper without overstating backend requirements.
- [x] ADM-STRENGTH-VISUAL-02: Add an accessible responsive strength meter to the Owner-only Admin new-password setup/reset form.
- [x] ADM-STRENGTH-VISUAL-03: Add regression coverage, validate desktop/mobile behavior, complete release checks, and checkpoint the enhancement.
- [x] ADM-NEWPASSWORD-VISIBILITY-01: Define separate accessible show/hide controls for the Admin new-password and confirmation fields while preserving password-manager metadata.
- [x] ADM-NEWPASSWORD-VISIBILITY-02: Add independent eye-icon visibility controls to both Owner-only Admin credential setup/reset password inputs.
- [x] ADM-NEWPASSWORD-VISIBILITY-03: Add regression coverage, validate desktop/mobile behavior, complete release checks, and checkpoint the enhancement.
- [x] NAV-BACKHOME-AUDIT-01: Inventory every visible Back to home control and map its route, audience, and current navigation fallback.
- [x] NAV-BACKHOME-AUDIT-02: Assess safe removal scope, exceptions, accessibility implications, and replacement navigation before approval.
- [x] NAV-BACKHOME-01: Remove the shared Back to home bar and direct homepage-return links from approved public and authentication surfaces.
- [x] NAV-BACKHOME-02: Preserve 404 recovery, public brand/mobile Home navigation, contextual back actions, and protected workspace access rules.
- [x] NAV-BACKHOME-03: Add regression coverage, validate desktop/mobile routes and accessibility, complete release checks, and checkpoint the cleanup.
- [x] TUTOR-PROFILE-AUDIT-01: Inventory current Tutor profile fields, validation rules, completion criteria, and data visibility boundaries.
- [x] TUTOR-PROFILE-AUDIT-02: Provide prioritized profile-completion and privacy-aware improvement recommendations without changing code.

- [x] TPX-SPEC-01: Produce an implementation-ready specification for the approved Tutor/Admin/Guardian profile expansion, including approved Admin access to all profile data, signed-in Guardian CV access, required profile fields, and University-ID verification.
- [x] TPX-TICKETS-01: Break the approved Tutor profile expansion specification into small, dependency-ordered implementation tickets without changing application code.

- [x] TPX-LABEL-SPEC-01: Present the approved Tutor Profile field inventory with an explicit mandatory star and Optional label for each field, without changing code.

- [x] TPX-EDITABLE-REQUIREMENTS-01: Create a user-editable workbook for changing each proposed Tutor Profile field between Mandatory and Optional without changing application code.

- [x] TPX-ADMIN-REQUIREMENTS-PLAN-01: Inspect and prepare an approval-ready plan for an Owner-controlled Admin interface that changes Tutor Profile field requirements between Mandatory and Optional at runtime.

- [x] TPX-PROFILE-PREVIEW-01: Generate a desktop visual mockup showing the merged Tutor Profile layout, including mandatory and optional field treatment, without changing application code.

- [x] TPX-PROFILE-PREVIEW-02: Generate a corrected desktop Tutor Profile visual preview that reflects every field group, requirement marker, conditional rule, and private-field disclosure in the supplied field-list document without changing application code.

- [x] TPX-FIELD-SCOPE-WORKBOOK-01: Create an editable Section and Field Level workbook so the user can identify Tutor Profile fields to remove, without changing application code.

- [x] TPX-FIELD-SCOPE-WORKBOOK-02: Add an editable New Requirement dropdown to the field-scope workbook so each retained field can change between Mandatory and Optional without changing application code.

- [x] TPX-SECTION-UX-PREVIEW-01: Review the updated field-scope workbook and generate desktop/mobile visual previews for default-expanded Sections A–H with per-section Edit Information and Submit flows, without changing application code.

- [x] TPX-CLASS-LEVELS-GROUPING-01: Update the approval scope so the Class Levels multi-select uses `Play`, `Nursery`, `KG`, `Class 1–5`, `Class 6–8`, `SSC`, `HSC`, `O Levels`, and `A Levels` instead of separate Class 1–8 entries; no production code change without explicit implementation approval.

- [x] TPX-IMP-01: Reconcile the approved A–H expanded Tutor Profile specification with the current schema, tRPC procedures, validation contracts, and legacy profile data; explicitly exclude Admin panel changes.
- [x] TPX-IMP-02: Implement server-authoritative per-section draft saving, section-only validation, safe Tutor ownership checks, and a separate final Submit profile for review workflow.
- [x] TPX-IMP-03: Implement the default-expanded A–H Tutor Profile workspace with per-section Edit Information / Save section states, privacy disclosures, status chips, and grouped Class Levels multi-select options.
- [x] TPX-IMP-04: Add and run focused/full validation, privacy, accessibility, desktop/mobile responsive checks, and code review for the approved Tutor Profile changes.

- [ ] TPX-LIVE-EDIT-SAVE-CHECK-01: Verify published Tutor Profile edit enablement, section-only draft saving, success feedback, and final-review separation in an authenticated Tutor session; document results and investigate any defect.

- [x] TUTOR-ID-777-01: Change automatic Tutor ID generation for newly created Tutor accounts to start at numeric 777, preserve existing IDs, avoid collisions, and cover the behavior with focused regression tests.

- [x] TUTOR-ID-777-DOCS-01: Update project guidance that still says new Tutor IDs begin at 1503 so it accurately describes the new 777 minimum and historic-ID preservation.

- [x] TUTOR-ID-777-RACE-RECOVERY-01: Add bounded retry recovery for a database-reported unique Tutor ID collision, so cross-instance registration can recalculate the lowest available ID without changing historic IDs.

## Account cleanup and Guardian ID reset — completed

- [x] DATA-CLEANUP-777-01: Audit Tutor/Guardian accounts, foreign-key dependencies, Admin-sensitive tables, and private storage references before destructive deletion.
- [x] GUARDIAN-ID-777-01: New Guardian registration now allocates the lowest available numeric Guardian ID starting at 777, skips occupied IDs, ignores legacy opaque IDs, and retries only Guardian-ID unique collisions.
- [x] DATA-CLEANUP-EXEC-01: With explicit user confirmation, delete all current Tutor and Guardian accounts plus their related database records, while preserving the Admin account/data; remove database references to private uploaded files.
- [x] DATA-CLEANUP-VERIFY-01: Confirm zero Tutor/Guardian accounts, zero Guardian profiles and Tutor registrations, zero related requests/jobs/private rows, and one intact Admin account after cleanup.
- [x] DATA-CLEANUP-RELEASE-01: Complete focused/full tests, TypeScript validation, production build, whitespace audit, and allocator code review for the cleanup release.

- [x] TPX-LIVE-EDIT-SAVE-CHECK-01: Duplicate tracker entry superseded; the canonical authenticated Tutor Profile Edit/Save verification item remains pending for the user’s own browser test.

## Tutor Profile collapsible sections

- [x] TPX-COLLAPSE-01: Change A–H Tutor Profile sections to default collapsed summaries; reveal section details and Edit/Save controls only after an accessible section click.
- [x] TPX-COLLAPSE-02: Add focused regressions for default collapsed state, expanded detail visibility, collapse behavior, and keyboard-accessible section triggers.
- [x] TPX-COLLAPSE-03: Validate desktop/mobile behavior, complete code review, and release the collapsible Tutor Profile update.

## Localhost-ready source package

- [ ] LOCALHOST-ZIP-UPDATE-01: Create and integrity-check a current source-only ZIP for local hosting, excluding dependencies, build outputs, logs, secrets, and git metadata.
- [ ] LOCALHOST-ZIP-UPDATE-02: Deliver the ZIP with concise Windows localhost startup steps for `C:\Projects\connect-tutors-bd`.
