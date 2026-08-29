# Connecttutorsbd.com — Tutor Profile Implementation Tickets

**Status:** Approved specification decomposed for implementation  
**Source:** `docs/tutor-profile-technical-specification.md`  
**Implementation sequence:** `/tdd` → `/implement` → `/code-review`

> These tickets implement the approved Tutor Profile scope only. They do not add Guardian–Tutor matching, external notifications, verification-document collection, a staff moderation UI, payments, or a public-profile redesign.

## Delivery Order

The work is intentionally ordered so that a safe schema and private data contract exist before the dashboard form depends on them. Every ticket includes its own validation; tests are written or updated before the production behaviour they verify.

| Order | Ticket | Outcome                                                              | Depends on          |
| ----: | ------ | -------------------------------------------------------------------- | ------------------- |
|     1 | TP-01  | Establish Profile state and registration-to-profile persistence      | None                |
|     2 | TP-02  | Add normalized Profile and selector schema                           | TP-01               |
|     3 | TP-03  | Deliver trusted academic and teaching catalog data                   | TP-02               |
|     4 | TP-04  | Build profile domain helpers, validation, and completion calculation | TP-01, TP-02        |
|     5 | TP-05  | Expose secure owner Profile and catalog procedures                   | TP-03, TP-04        |
|     6 | TP-06  | Add authenticated Profile Photo storage boundary                     | TP-04, TP-05        |
|     7 | TP-07  | Build the Profile form foundation and Sections A–C                   | TP-05, TP-06        |
|     8 | TP-08  | Build Profile Sections D–G and save/submit flow                      | TP-05, TP-07        |
|     9 | TP-09  | Render read-only Section H and integrate dashboard state             | TP-05, TP-08        |
|    10 | TP-10  | Verify end-to-end security, responsive UX, and migration safety      | TP-01 through TP-09 |

## TP-01 — Persist Registration Defaults and Expand Profile States

| Attribute            | Definition                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**          | Make successful Tutor registration atomically create a minimal persistent `draft` Tutor Profile, so registration values remain available on every later profile load. |
| **Primary surfaces** | `drizzle/schema.ts`, generated Drizzle migration, `server/db.ts`, `server/routers.ts`, existing authentication tests.                                                 |
| **Dependencies**     | None.                                                                                                                                                                 |
| **Risk level**       | **High.** It alters the existing database shape and registration transaction. No destructive migration or fabricated professional values are allowed.                 |

The registration transaction must persist the existing non-secret fields as `tutors.name`, `tutors.gender`, `tutors.phone`, `tutors.contactEmail`, and `tutors.locationId`. It must retain the existing `tutor_registrations.tutorNumber` and `registeredAt` identity record. The registration email begins as the private contact email but changing it later in Profile must not change `users.email`, which remains the password-login identity.

| Required change                                       | Acceptance criteria                                                                                                                                                                                     | Verification                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Relax legacy fields unavailable at basic registration | A profile row can be created without invented academic, subject, fee, language, or biography data. Existing public Tutor rows remain readable.                                                          | Migration SQL review; `pnpm check`; migration test against existing schema. |
| Expand state model safely                             | `draft`, `pending`, `changes_requested`, `approved`, and `suspended` are supported by the Profile model without breaking existing `approved` listing logic. `users.accountStatus` defaults to `active`. | Unit test state parsing and a migration smoke query.                        |
| Make registration transactional                       | New Tutor registration creates exactly one account, registration identity, and minimal Tutor row. Duplicate-email or database failure leaves no partial Tutor row.                                      | Router/database Vitest tests using rollback-safe test fixtures.             |
| Protect password boundary                             | No password or confirmation value is stored in the Tutor Profile record or returned by an owner-profile response.                                                                                       | Auth and DTO assertion tests.                                               |

## TP-02 — Add Structured Tutor Profile and Selection Schema

| Attribute            | Definition                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**          | Replace new comma-separated Profile selections with relational data and add single-value fields required by Sections A–G. |
| **Primary surfaces** | `drizzle/schema.ts`, `drizzle/relations.ts`, Drizzle migration files.                                                     |
| **Dependencies**     | TP-01.                                                                                                                    |
| **Risk level**       | **High.** New foreign keys and historical data compatibility must be reviewed before SQL application.                     |

Create `tutor_academic_profiles`, `universities`, `faculty_departments`, `degree_majors`, `subjects`, `class_levels`, `curricula`, `student_types`, `languages`, and all approved `tutor_*` selection junction tables. Add the photo key, date of birth, nationwide availability, fee range, travel distance, preferred student gender, optional narrative fields, and expanded profile state fields to the appropriate Tutor-owned entities.

| Required change                   | Acceptance criteria                                                                                                                                  | Verification                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Preserve normalized relationships | Academic records enforce University → Faculty/Department → Degree/Major. Tutor selections use composite uniqueness and owner indexes.                | Drizzle schema tests and generated SQL inspection.         |
| Preserve existing records         | Existing records are not deleted or silently remapped. Legacy free-text values remain available until a later safe backfill maps them unambiguously. | Pre-/post-migration row-count and sample-query comparison. |
| Enforce database integrity        | Foreign keys and active-catalog constraints are represented where supported; server validation remains the authoritative fallback.                   | Migration SQL review and database integration test.        |

## TP-03 — Seed and Query Trusted Profile Catalogs

| Attribute            | Definition                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Purpose**          | Supply real, searchable catalog data for academic and teaching selectors without hardcoding lists in the browser. |
| **Primary surfaces** | Versioned seed-data files/scripts, `server/db.ts`, catalog test fixtures.                                         |
| **Dependencies**     | TP-02.                                                                                                            |
| **Risk level**       | **Medium.** Academic catalog accuracy affects dependent selection integrity.                                      |

Seed Bangladesh public and private universities plus linked faculty/department and degree/major records from reviewed data. Seed controlled options for subjects, class levels, curricula, student types, and teaching languages. Existing Bangladesh `locations` remains the source for current location and teaching-area selectors.

| Required change                   | Acceptance criteria                                                                                                                                     | Verification                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Maintain catalog lifecycle fields | Every record has stable ID, label/name, normalized searchable name, active flag, and sort order where applicable.                                       | Seed idempotency test; duplicate normalized-name test. |
| Ensure dependent-search integrity | A faculty cannot be returned for a different university; a degree/major cannot be returned for a different faculty.                                     | Query helper tests.                                    |
| Keep lists bounded and searchable | Server queries accept a trimmed 0–100 character query and cap results at 50. Inactive entries display for historical data but cannot be newly selected. | Catalog procedure/query tests.                         |

## TP-04 — Build Profile Domain Helpers, Validation, and Completion Logic

| Attribute            | Definition                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**          | Establish a single server-side source for Profile validation, private DTO mapping, submission readiness, and Section H completion calculation. |
| **Primary surfaces** | New `server/profile/` modules or equivalent focused helpers, `server/db.ts`, `server/*.test.ts`.                                               |
| **Dependencies**     | TP-01, TP-02.                                                                                                                                  |
| **Risk level**       | **High.** These rules govern private data, state transitions, and submission validity.                                                         |

Define Zod schemas that distinguish a valid partial draft from a valid submitted profile. Implement the approved 27-unit calculation, where required Section A–F fields produce an integer 0–100 percentage and optional Section G fields never reduce completion.

| Required change                    | Acceptance criteria                                                                                                                                                 | Verification               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Validate free-text and enum fields | Name, phone, contact email, DOB, headline, fee range, travel distance, narrative limits, and all enums reject invalid values with field-specific errors.            | Table-driven Vitest tests. |
| Validate selections                | Enforce no duplicate selections, no subject in both primary/additional lists, selection limits, active catalog membership, and academic parent-child relationships. | Focused invariant tests.   |
| Protect system fields              | Client input cannot supply profile status, account status, completion, assigned-count, or last-updated timestamp.                                                   | Schema rejection tests.    |
| Calculate consistently             | Empty profile is 0; full A–F profile is 100; optional Section G has no effect.                                                                                      | Pure helper tests.         |

## TP-05 — Implement Owner Profile and Catalog tRPC Procedures

| Attribute            | Definition                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Purpose**          | Provide typed, authenticated server contracts for loading, saving, submitting, and searching Profile data.          |
| **Primary surfaces** | `server/routers.ts` or focused router modules, `server/db.ts`, `client/src/lib/trpc.ts` types, Vitest router tests. |
| **Dependencies**     | TP-03, TP-04.                                                                                                       |
| **Risk level**       | **High.** Procedures expose private Tutor information and must preserve profile ownership.                          |

Implement `tutor.getMyProfile`, `tutor.saveProfileDraft`, `tutor.submitProfile`, and the approved `catalog.search*` procedures. Replace the obsolete flat `tutor.upsertProfile` contract only after the new owner flow is working; compatibility handling must be explicit rather than silently mixing payload shapes.

| Required change                         | Acceptance criteria                                                                                                                                             | Verification              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Return persistent registration defaults | `getMyProfile` returns the registration-created Name, Gender, Phone, Email, City/Area, Tutor ID, and registration date even from a fresh browser session.       | Router integration test.  |
| Enforce ownership and account state     | A Tutor can access only their own profile. Guardian/public callers and inactive Tutor accounts are rejected. No writable `tutorId` or `userId` exists in input. | Authorization tests.      |
| Save atomically                         | Base fields and all supplied junction selections update in one transaction. A failure leaves neither partial profile values nor partial selections.             | Transaction failure test. |
| Submit safely                           | Submission rereads persisted data, validates all A–F requirements, and changes a valid draft to `pending`; incomplete draft remains intact.                     | State-transition tests.   |
| Limit catalog retrieval                 | Queries return only active, appropriately related records and enforce result limits.                                                                            | Catalog procedure tests.  |

## TP-06 — Add Secure Profile Photo Upload Boundary

| Attribute            | Definition                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**          | Let an authenticated Tutor upload the required profile photo without placing image bytes in MySQL or exposing upload privileges publicly. |
| **Primary surfaces** | Authenticated server endpoint, `server/storage.ts` or storage helper, `client/src` upload helper/component, upload tests.                 |
| **Dependencies**     | TP-04, TP-05.                                                                                                                             |
| **Risk level**       | **High.** File uploads are a private-data and untrusted-input boundary.                                                                   |

Implement one authenticated multipart endpoint, such as `POST /api/tutor/profile-photo`. It must accept one JPEG, PNG, or WebP file, verify MIME type and file signature server-side, enforce 5 MB maximum and 300×300 minimum dimensions, and persist only a non-guessable storage key after `storagePut` succeeds.

| Required change            | Acceptance criteria                                                                                                                         | Verification                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Authenticate uploads       | Unauthenticated, non-Tutor, suspended, or malformed requests receive no storage access.                                                     | Endpoint tests.                |
| Validate binary properties | Invalid file signature, wrong type, excessive file size, or undersized image is rejected.                                                   | Controlled file-fixture tests. |
| Keep references private    | Database stores only the generated key; owner Profile DTO receives a usable owner-only URL. Replacing an image does not expose the old key. | Storage adapter and DTO tests. |

## TP-07 — Build Tutor Profile Form Foundation and Sections A–C

| Attribute            | Definition                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**          | Replace the flat dashboard Profile view with an accessible protected workspace that begins from persistent registration defaults.       |
| **Primary surfaces** | `client/src/pages/TutorDashboard.tsx` or dedicated `TutorProfilePage.tsx`, reusable form/select components, route wiring, client tests. |
| **Dependencies**     | TP-05, TP-06.                                                                                                                           |
| **Risk level**       | **Medium.** Must not regress dashboard route protection or discard defaulted registration data while loading.                           |

Create sections A–C. On first load, show a stable skeleton, fetch `tutor.getMyProfile`, and populate Profile Name, Gender, Phone, Email, City/Area, Tutor ID, and Since date from the server. The browser onboarding draft may cover a redirect transition only; it must never overwrite a completed server response.

| Required change                  | Acceptance criteria                                                                                                                                                 | Verification                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Preserve registration continuity | Fresh login, refresh, and a different browser session show server-backed registration defaults with no password field or password data.                             | Component/integration test and authenticated browser check. |
| Implement Section A              | Tutor ID and registration date are read-only; photo preview/upload, name, gender, DOB, and headline have labels and inline errors.                                  | Accessible form test.                                       |
| Implement Section B              | Private-data explanation is visible; phone/contact email/current location can be edited; teaching areas are searchable multi-select; nationwide choice is explicit. | Keyboard navigation and selection tests.                    |
| Implement Section C              | University, faculty/department, and degree/major are searchable, dependent, and reset child selection correctly when a parent changes.                              | Component interaction tests.                                |

## TP-08 — Build Profile Sections D–G, Draft Save, and Submission UX

| Attribute            | Definition                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**          | Complete Tutor-entered teaching, preference, communication, and biography data through reusable accessible controls and explicit draft/submit states. |
| **Primary surfaces** | Profile form section components, reusable searchable multi-select component, tRPC mutations, client tests.                                            |
| **Dependencies**     | TP-05, TP-07.                                                                                                                                         |
| **Risk level**       | **Medium.** Complex multi-select state must not submit invalid or stale selections.                                                                   |

Implement Sections D–G with controlled fields, removal chips, validation messages, draft save, and submit-for-review behaviour. Optional Section G values do not block saving or submission. The UI must make clear that saving a draft and submitting for review are distinct actions.

| Required change                  | Acceptance criteria                                                                                                                                                           | Verification                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Implement D and E                | All approved subject, level, curriculum, experience, student-type, tuition, gender, class-size, day, time, fee-range, and travel-distance controls follow server constraints. | Component + mutation error tests.              |
| Implement F and G                | Teaching languages and communication channels allow multi-selection; biography fields remain optional and character-bounded.                                                  | Interaction and field-limit tests.             |
| Implement save and submit states | Saving disables duplicate submits, reports field/API errors, and refreshes owner data. Submission visibly reports success and pending-review state.                           | Mutation-state tests and browser verification. |
| Preserve mobile access           | Controls, chips, calendar/date inputs, and action buttons remain readable, reachable, and horizontally unclipped at 375 px.                                                   | Mobile screenshot and keyboard pass.           |

## TP-09 — Render Section H and Integrate Dashboard State

| Attribute            | Definition                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------ |
| **Purpose**          | Show Tutor-facing system information without allowing a Tutor to manipulate it.            |
| **Primary surfaces** | Tutor Profile / Dashboard components, `tutor.getDashboardStats`, owner DTO mapping, tests. |
| **Dependencies**     | TP-05, TP-08.                                                                              |
| **Risk level**       | **Medium.** System values must remain server-managed and private.                          |

Render a read-only Section H card containing completion percentage, last updated date, profile status, account status, and assigned request count. Before matching work exists, the assigned-request count is derived as `0`; its presentation must not suggest a Job Board or assignment workflow is already active.

| Required change           | Acceptance criteria                                                                                               | Verification                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Show server-derived state | Section H displays data from the owner DTO only, with local timezone formatting for dates.                        | DTO and rendering tests.       |
| Prevent editing           | No client controls send system fields; a manually crafted mutation payload cannot overwrite them.                 | UI and server rejection tests. |
| Retain review semantics   | Successful submission updates the visible Profile status to Pending review; public listing remains approved-only. | State integration test.        |

## TP-10 — Complete Regression, Accessibility, Visual, and Migration Verification

| Attribute            | Definition                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**          | Confirm the milestone works safely with current authentication, directory privacy, mobile layout, and existing Tutor data before release. |
| **Primary surfaces** | Vitest suite, `pnpm check`, production build, database migration verification, browser screenshots, project documentation.                |
| **Dependencies**     | TP-01 through TP-09.                                                                                                                      |
| **Risk level**       | **High.** This is the release gate for a privacy-sensitive, schema-changing workflow.                                                     |

| Verification area  | Required evidence                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type and build     | `pnpm check`, `pnpm test`, and `pnpm build` complete successfully.                                                                                  |
| Database safety    | Generated migration SQL is read before application; migration applies cleanly; existing approved Tutor public list/detail query remains usable.     |
| Privacy            | Public Tutor APIs omit private phone, email, DOB, account status, exact request count, and raw owner Profile payload.                               |
| Authentication     | Tutor login, protected route fallback to `/tutor/login`, active-account access, and prohibited role access continue to behave correctly.            |
| Accessibility      | Form labels, focus indicators, keyboard search/select/remove actions, error announcement, and read-only system summary are manually verified.       |
| Responsive UX      | Desktop and 375 px mobile screenshots cover Profile loading, a populated Profile, validation error, searchable selection, and pending-review state. |
| Rollback readiness | Create a checkpoint only after successful verification; retain migration output and document any known data-backfill limitations.                   |

## Implementation Guardrails

| Guardrail              | Required practice                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration workflow     | Update Drizzle schema, generate SQL, read SQL, apply it through the managed database workflow, and verify results. Never use destructive schema shortcuts. |
| Test-first development | For each ticket, add or update focused failing Vitest coverage before implementing the corresponding production path, then refactor only after tests pass. |
| Profile privacy        | Use owner-only DTOs for Profile data. Do not extend public Tutor endpoints with contact details, DOB, account state, or raw Profile data.                  |
| Catalog integrity      | Persist catalog IDs rather than browser-provided labels. Validate active status and parent-child relationships on the server.                              |
| File storage           | Store profile-photo bytes in S3 through the approved storage helper and only a storage reference in MySQL.                                                 |
| Deferred scope         | Do not implement matching, request assignment, external notifications, document verification, payments, or staff UI under these tickets.                   |

## Handoff to Test-Driven Development

The next workflow stage is `/tdd`. It should derive focused test cases from TP-01 through TP-10, beginning with the registration transaction, schema invariants, owner authorization, and submission validation. Implementation may begin only after the ticket-specific tests and acceptance boundaries are agreed.
