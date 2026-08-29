# Connecttutorsbd.com — Tutor Profile Technical Specification

**Status:** Draft for approval before ticketing and implementation  
**Author:** Manus AI  
**Scope source:** `docs/tutor-profile-field-decisions.md`  
**Target stack:** React 19, Tailwind CSS 4, Express, tRPC 11, Drizzle ORM, and MySQL.

> This specification converts the approved field inventory into an implementation contract. It does **not** begin implementation. Tutor-request matching, external notifications, document verification, payment, and an Admin UI are intentionally outside the build scope described here, except where their future data boundaries must be preserved.

## 1. Scope, Outcomes, and Non-goals

The Tutor Profile will replace the current flat post-registration form with a protected, structured profile journey available at `/tutor/dashboard/profile`. A Tutor first registers with only basic identity, contact, location, and password information. **Every non-secret value entered during registration is persistently carried into its corresponding Profile field and appears by default after sign-in; the Tutor is never asked to re-enter it.** After sign-in, the Tutor can save a complete profile as a draft and submit it for profile review.

| Included outcome        | Required result                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eight Profile sections  | The Dashboard profile experience collects the approved A–H field inventory in a clear, responsive form.                                                              |
| Structured data         | Academic selectors, locations, and all multi-select values are stored as relational records rather than comma-separated text or unvalidated JSON.                    |
| Tutor ownership         | A Tutor can read and edit only their own draft/profile information.                                                                                                  |
| Read-only system fields | Completion percentage, last updated, profile status, account status, and assigned request count are calculated or system-managed; Tutor input cannot overwrite them. |
| Privacy boundary        | Private contact information and exact date of birth remain available to the profile owner and authorised staff only; public Tutor endpoints do not return them.      |
| Review readiness        | Submission changes the Tutor Profile to a reviewable state without implementing the Admin review screen in this milestone.                                           |
| Registration continuity | Registration name, gender, phone, email, selected city/area, Tutor ID, and registration date are automatically available in the authenticated Profile experience.    |

The following work is explicitly excluded from this implementation scope.

| Non-goal                                                     | Reason for exclusion                                                                                                                               |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp, Telegram, or email notifications                   | This is a separate deferred notification workstream.                                                                                               |
| Guardian-to-Tutor request matching and assignment            | The request-count field is defined, but matching and assignment remain deferred.                                                                   |
| NID, CV, student ID, and other verification-document uploads | Verification documents have not been approved as part of the field-first inventory.                                                                |
| Public profile redesign and search-ranking changes           | Existing approved-profile listing behaviour remains in place; the public DTO can be extended later under a dedicated privacy/search specification. |
| Admin dashboard and moderation UI                            | The status model is preserved, but its staff-facing workflow will be delivered separately.                                                         |

## 2. Personas, Permissions, and Profile State

The implementation has three relevant personas. The Tutor is the only person who edits profile content. The Guardian has no access to private Tutor data. The Admin role will later manage review state but is not given a new UI in this milestone.

| Persona                   |           Read own profile |       Edit profile content |       Read private contact / DOB | Change profile or account state |
| ------------------------- | -------------------------: | -------------------------: | -------------------------------: | ------------------------------: |
| Tutor                     |       Yes, only own record |     Yes, draft fields only |             Yes, only own record |                              No |
| Guardian / public visitor |                         No |                         No |                               No |                              No |
| Admin                     | Future protected procedure | Future protected procedure | Yes, when operationally required |      Yes, future procedure only |

The server remains authoritative. The client must not send or set `profileStatus`, `accountStatus`, `profileCompletionPercentage`, `assignedRequestCount`, or `lastUpdatedAt` in any mutation input.

### 2.1 Profile-status proposal

The current database already has `draft`, `pending`, and `approved`. To support an actionable review loop, the final schema should use the following system-managed profile states.

| Stored state        | Tutor-facing label | Meaning                                                      |                          Public-listing eligibility |
| ------------------- | ------------------ | ------------------------------------------------------------ | --------------------------------------------------: |
| `draft`             | Draft              | The Tutor has saved incomplete or unsubmitted changes.       |                                                  No |
| `pending`           | Pending review     | The Tutor submitted a complete profile for review.           |                                                  No |
| `changes_requested` | Changes requested  | A future Admin review asked the Tutor to revise the profile. |                                                  No |
| `approved`          | Approved           | A future Admin review approved the submitted profile.        | Yes, subject to the existing public-directory rules |
| `suspended`         | Suspended          | A future Admin action removed the profile from visibility.   |                                                  No |

The profile system treats a save as a draft operation. A successful explicit submission changes a valid profile to `pending`. Until a profile revision/snapshot feature is separately approved, submitting changes to an approved profile also changes its live state to `pending` and removes it from the public directory until reviewed again. This conservative behaviour prevents unreviewed public edits.

### 2.2 Account-status proposal

`accountStatus` belongs to the login account in `users`, rather than the Tutor Profile, because it governs account access. The Dashboard only displays it.

| Stored state | Tutor-facing label | Behaviour                                                                                             |
| ------------ | ------------------ | ----------------------------------------------------------------------------------------------------- |
| `active`     | Active             | Normal sign-in and profile editing.                                                                   |
| `suspended`  | Suspended          | Sign-in and protected mutations are denied.                                                           |
| `closed`     | Closed             | Sign-in and protected mutations are denied; retained data is handled under a future retention policy. |

`active` is the default. Admin transitions, reasons, and reinstatement are future work. Login and Tutor-protected procedures must enforce non-`active` states once that workflow is implemented.

## 3. Approved Profile Information Model

The field inventory is divided between registration-sourced values, Tutor-entered values, catalog selections, derived values, and system-managed values.

| Section                       | Data category                        | Fields                                                                                                                     |
| ----------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| A. Profile Identity           | Registration + Tutor input + system  | Tutor ID, registration date, full name, photo, gender, exact date of birth, headline                                       |
| B. Contact & Location         | Registration + Tutor input + catalog | Phone, email, current city/area, teaching areas, nationwide availability                                                   |
| C. Academic Information       | Tutor input + dependent catalog      | Highest education, university, faculty/department, degree/major, study status, graduation year                             |
| D. Teaching Expertise         | Tutor input + catalog                | Primary/additional subjects, levels, curriculum, experience, experience description, expertise, student types, achievement |
| E. Tuition Preferences        | Tutor input + catalog/enums          | Tuition type, student gender, class size, days, time slots, fee range, travel distance                                     |
| F. Language & Communication   | Tutor input + catalog/enums          | Teaching languages and contact-channel preference                                                                          |
| G. About the Tutor            | Tutor input                          | About me, teaching approach, why choose me, additional notes                                                               |
| H. Profile System Information | Derived/system                       | Completion, last update, profile status, account status, assigned request count                                            |

### 3.1 Registration-to-Profile continuity

The registration flow is the first data-entry step of the Profile journey, not a temporary form that the Tutor must complete again. The server persists the following mapping as part of a successful Tutor registration transaction. A client-side onboarding draft can remain only as a short-lived resilience aid during a browser transition; it is never the source of truth after registration succeeds.

| Tutor Registration Panel value | Persistent canonical source                                              | Corresponding Profile presentation              | Edit rule after registration                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                           | `tutors.name`                                                            | A. Profile Identity → Full name                 | Editable; updates the Tutor-facing profile name.                                                                                                                                  |
| Gender                         | `tutors.gender`                                                          | A. Profile Identity → Gender                    | Editable.                                                                                                                                                                         |
| Phone with fixed `+880` prefix | `tutors.phone`                                                           | B. Contact & Location → Phone                   | Editable; Bangladesh phone validation always applies.                                                                                                                             |
| Email                          | `tutors.contactEmail`, initially copied from `users.email`               | B. Contact & Location → Email                   | Editable as private contact email; this does **not** change the password-login email in `users.email`. A separate verified account-email flow is required for that future change. |
| Selected City and Area         | `tutors.locationId`, resolved to the selected area or city               | B. Contact & Location → Current city/area       | Editable through the existing searchable Bangladesh location selector.                                                                                                            |
| Sequential Tutor ID            | `tutor_registrations.tutorNumber`                                        | A. Profile Identity → Tutor ID                  | Read-only system identity.                                                                                                                                                        |
| Registration date              | `tutor_registrations.registeredAt`                                       | A. Profile Identity → Registration date / Since | Read-only system identity.                                                                                                                                                        |
| Password and Confirm Password  | Password hash only in `users.passwordHash`; confirmation is never stored | Not a Tutor Profile field                       | Never returned to the client or copied into Profile data.                                                                                                                         |

The Registration Panel does not collect a photo, birth date, headline, academic, teaching, availability, preference, communication, or biography data. Those fields begin empty in the Profile workspace. The defaulted registration fields count toward profile completion only when their separately defined Profile field is satisfied.

### 3.2 Submission requirements and validation policy

The form can save a draft with any valid partial data. The following required fields must be present before `submitProfile` accepts the profile. This translates the approved inventory into a consistent completion and review gate.

| Section | Required before submission                                                                                                        | Optional                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A       | Full name, gender, profile photo, exact birth date, short headline                                                                | None                                                                                     |
| B       | Phone, email, current city/area, one or more teaching areas, an explicit nationwide-availability choice                           | None                                                                                     |
| C       | University, faculty/department, degree/major, current study status                                                                | Highest education, graduation year                                                       |
| D       | At least one primary subject, at least one class/level, at least one curriculum, teaching experience, at least one student type   | Additional subjects, prior teaching description, special expertise, academic achievement |
| E       | Tuition type, preferred student gender, at least one class-size option, at least one day, at least one time slot, valid fee range | Travel distance                                                                          |
| F       | At least one teaching language and one communication preference                                                                   | None                                                                                     |
| G       | None                                                                                                                              | All four biography fields                                                                |
| H       | Never accepted from client input                                                                                                  | All five fields                                                                          |

The required treatment of curriculum, student type, class size, teaching days, time slots, teaching languages, and communication preferences is a **proposed completion rule**. The field inventory confirmed that these fields exist and are multi-select; approval of this specification confirms that they are also required for a submitted profile.

### 3.3 Field-level constraints

All strings are trimmed before validation and storage. API errors must identify the relevant field without exposing internal database details.

| Field / group                    | Server validation rule                                                                                                                                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full name                        | 2–160 characters after trimming. Profile changes update the Tutor-facing name; password-login email remains unchanged.                                                                                                                                                 |
| Phone                            | Bangladesh format `+8801[3-9]XXXXXXXX`; stored private.                                                                                                                                                                                                                |
| Email                            | Valid email, maximum 320 characters; initially sourced from the password-login account and stored private. It is displayed as account-linked, not used to change sign-in identity in this profile flow.                                                                |
| Profile photo                    | Required for submission. JPEG, PNG, or WebP only; server verifies declared MIME type and file signature, maximum 5 MB, and minimum 300×300 pixels. The uploaded binary never enters MySQL.                                                                             |
| Exact birth date                 | ISO `YYYY-MM-DD`, real calendar date, not in the future. No minimum-age policy is imposed until the owner approves one.                                                                                                                                                |
| Short headline                   | 10–140 characters.                                                                                                                                                                                                                                                     |
| Location IDs                     | Must reference an enabled Bangladesh `locations` record; teaching areas must be unique.                                                                                                                                                                                |
| Nationwide availability          | Boolean must be explicitly selected. `true` is required when tuition type is `online` or `both`; a Home-only Tutor may explicitly select `false`.                                                                                                                      |
| Academic selector chain          | Every selected record must be active. Faculty/department must belong to the chosen university; degree/major must belong to the chosen faculty/department.                                                                                                              |
| Highest education                | Optional, up to 120 characters.                                                                                                                                                                                                                                        |
| Study status                     | One of `studying`, `graduated`, `professional`.                                                                                                                                                                                                                        |
| Graduation year                  | Optional integer from 1950 through the current calendar year plus ten years.                                                                                                                                                                                           |
| Multi-select limits              | Values must be distinct and selected from enabled catalog options. Proposed upper limits: 15 teaching areas, 12 subjects per group, 20 class/levels, 8 curricula, 8 student types, 3 class sizes, 7 weekdays, 4 time slots, 8 languages, and 3 communication channels. |
| Subject groups                   | At least one primary subject; a subject cannot appear in both primary and additional selections.                                                                                                                                                                       |
| Teaching experience              | Whole number of years from 0 to 60.                                                                                                                                                                                                                                    |
| Free-text experience / biography | Prior experience: 2,000 characters; special expertise: 500; academic achievement: 1,000; each biography field: 2,000; empty optional text is stored as `NULL`.                                                                                                         |
| Tuition type                     | `home`, `online`, or `both`.                                                                                                                                                                                                                                           |
| Preferred student gender         | `male`, `female`, or `both`.                                                                                                                                                                                                                                           |
| Fee range                        | Two whole BDT values from 0 to 500,000 where `feeMin <= feeMax`.                                                                                                                                                                                                       |
| Travel distance                  | Optional whole kilometres from 1 to 100. The unit is kilometres.                                                                                                                                                                                                       |

## 4. Database Design

### 4.1 Principles

The existing `tutors` table remains the core Tutor Profile record. The migration extends it for identity, preferences, and system state while moving repeating selections to typed junction tables. Existing denormalized `subjects`, `levels`, `languages`, `institution`, `education`, `fee`, and `availability` columns remain temporarily for backwards compatibility with the current public listing. They must not be the source of truth for the new profile form after implementation.

No profile photo bytes, CVs, or other binary content may be stored in MySQL. The profile stores an opaque object-storage key only. The server saves the file using the existing storage helper and returns its managed URL when needed.

### 4.2 Existing table extensions

| Table                   | New or changed columns                                                                                                                                                                                                                                                                                                                                                                                    | Purpose                                                                                                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                 | `accountStatus` enum (`active`, `suspended`, `closed`) default `active`                                                                                                                                                                                                                                                                                                                                   | Login-level state displayed in Section H.                                                                                                                                                                                                                                                            |
| `tutors`                | `profilePhotoKey` nullable `varchar(512)`; `dateOfBirth` nullable `date`; `nationwideAvailability` nullable boolean/int; `feeMin`, `feeMax`, `travelDistanceKm` nullable ints; `preferredStudentGender` nullable enum; `priorTeachingExperience`, `specialExpertise`, `academicAchievement`, `aboutMe`, `teachingApproach`, `whyChooseMe`, `additionalNotes` nullable text; expanded `profileStatus` enum | Stores single-value profile details and is created as a minimal `draft` record during successful registration with name, gender, phone, contact email, and location already populated. `headline` is retained as the required short headline. `updatedAt` remains the Section H last-updated source. |
| `tutors` legacy columns | Retain `institution`, `education`, `subjects`, `levels`, `languages`, `fee`, `availability`, and `about` during transition                                                                                                                                                                                                                                                                                | Existing directory and seeded data remain readable while the public-display refactor is scheduled later.                                                                                                                                                                                             |

The MySQL schema should continue using the project’s existing camel-case column naming convention. The migration must make legacy professional fields that are unavailable at registration nullable, or otherwise replace their old non-null requirement with safe database defaults, so a genuine minimal `draft` Tutor row can be persisted at registration without fabricated teaching data. Existing seeded and incomplete Tutor rows remain valid.

### 4.3 Academic catalog and Tutor academic profile

| Table                     | Primary fields                                                                                                                              | Integrity / index requirements                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `universities`            | `id`, `name`, `normalizedName`, `type` (`public` / `private`), `countryCode`, `isActive`, timestamps                                        | Unique `normalizedName`; index `(countryCode, isActive, name)`. Initial seed scope is Bangladesh.                                    |
| `faculty_departments`     | `id`, `universityId`, `name`, `normalizedName`, `isActive`, timestamps                                                                      | Foreign key to `universities`; unique `(universityId, normalizedName)`; index `(universityId, isActive, name)`.                      |
| `degree_majors`           | `id`, `facultyDepartmentId`, `name`, `normalizedName`, `degreeLevel`, `isActive`, timestamps                                                | Foreign key to `faculty_departments`; unique `(facultyDepartmentId, normalizedName)`; index `(facultyDepartmentId, isActive, name)`. |
| `tutor_academic_profiles` | `tutorId` (unique), `highestEducation`, `universityId`, `facultyDepartmentId`, `degreeMajorId`, `studyStatus`, `graduationYear`, timestamps | Foreign key to `tutors` and each catalog table. Server validates the selected three-level chain even if foreign keys are present.    |

### 4.4 Teaching catalog tables

The following tables permit searchable, manageable options instead of relying on client-controlled labels.

| Catalog table   | Core fields                                             | Used by                         |
| --------------- | ------------------------------------------------------- | ------------------------------- |
| `subjects`      | `id`, `name`, `normalizedName`, `isActive`, `sortOrder` | Primary and additional subjects |
| `class_levels`  | `id`, `name`, `normalizedName`, `isActive`, `sortOrder` | Tutor class/level selections    |
| `curricula`     | `id`, `name`, `normalizedName`, `isActive`, `sortOrder` | Curriculum selections           |
| `student_types` | `id`, `name`, `normalizedName`, `isActive`, `sortOrder` | Student-type selections         |
| `languages`     | `id`, `name`, `normalizedName`, `isActive`, `sortOrder` | Teaching-language selections    |

Every catalog table has a unique normalized name and returns only `isActive = 1` rows to Tutor selectors. Inactive options are retained for historical profile display but cannot be newly selected.

### 4.5 Tutor selection junction tables

| Table                             | Keys / columns                                                        | Rule                                                                             |
| --------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `tutor_teaching_areas`            | `tutorId`, `locationId`                                               | Composite primary key; location must be an enabled Bangladesh teaching location. |
| `tutor_subjects`                  | `tutorId`, `subjectId`, `kind` (`primary` / `additional`)             | Composite primary key; server prevents the same subject in both kinds.           |
| `tutor_class_levels`              | `tutorId`, `classLevelId`                                             | Composite primary key.                                                           |
| `tutor_curricula`                 | `tutorId`, `curriculumId`                                             | Composite primary key.                                                           |
| `tutor_student_types`             | `tutorId`, `studentTypeId`                                            | Composite primary key.                                                           |
| `tutor_class_sizes`               | `tutorId`, `classSize` (`one_to_one`, `small_group`, `group`)         | Composite primary key.                                                           |
| `tutor_teaching_days`             | `tutorId`, `weekday` (`monday`…`sunday`)                              | Composite primary key.                                                           |
| `tutor_time_slots`                | `tutorId`, `timeSlot` (`morning`, `afternoon`, `evening`, `flexible`) | Composite primary key.                                                           |
| `tutor_languages`                 | `tutorId`, `languageId`                                               | Composite primary key.                                                           |
| `tutor_communication_preferences` | `tutorId`, `channel` (`phone`, `whatsapp`, `platform_message`)        | Composite primary key.                                                           |

Each junction table receives an index beginning with `tutorId` for owner-profile reads. The teaching-area and subject tables also receive reverse indexes on their catalog IDs to support later filtering and matching.

### 4.6 Derived Section H values

| Section H field               | Source                                                                         | Storage policy                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Profile completion percentage | Server-side `calculateProfileCompletion(profile)`                              | Derived on every owner-profile/dashboard read; never trusted from the client.                    |
| Last updated date             | `tutors.updatedAt`                                                             | Existing database-managed timestamp.                                                             |
| Profile status                | `tutors.profileStatus`                                                         | System-managed enum.                                                                             |
| Account status                | `users.accountStatus`                                                          | System-managed enum.                                                                             |
| Assigned request count        | `COUNT(tutor_requests.id)` for the Tutor’s assigned, non-closed request states | Derived query; no denormalized counter. It returns `0` until matching/assignment is implemented. |

The completion calculation has 27 equal units: five in A, five in B, four in C, five in D, six in E, and two in F. Optional Section G fields never reduce the percentage. The service computes `round(completedUnits / 27 * 100)`, returning an integer from 0 through 100.

## 5. Migration and Data-seeding Plan

The database migration must be generated by Drizzle, reviewed as SQL, and applied through the database migration workflow. No destructive column drop is allowed in this milestone.

| Order | Migration activity                                                                                                                                               | Completion condition                                                                                                                                                         |
| ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     1 | Add nullable core columns to `tutors`, relax non-registration legacy field requirements, add defaulted `users.accountStatus`, and safely expand `profileStatus`. | Existing users and public Tutor rows remain valid, while a successful Tutor registration atomically creates a minimal persistent `draft` Tutor row from registration values. |
|     2 | Create academic catalog, teaching catalog, academic-profile, and selection-junction tables with foreign keys and indexes.                                        | Schema is present and Drizzle types compile.                                                                                                                                 |
|     3 | Seed authoritative Bangladesh public/private university records, their faculty/department records, and degree/major records.                                     | Every supported selection chain is valid; no fabricated academic records are added.                                                                                          |
|     4 | Seed enabled general catalogs for subjects, class levels, curricula, student types, and languages.                                                               | Selectors return labelled, searchable, enabled options.                                                                                                                      |
|     5 | Backfill existing Tutor rows where values map unambiguously from legacy JSON/text values; retain unmatched legacy values for review rather than guessing.        | Existing public directory cards do not lose data.                                                                                                                            |
|     6 | Replace new-profile writes with the structured schema and maintain legacy display projections during the transition.                                             | New profile form no longer accepts comma-separated free text for catalog fields.                                                                                             |

The university-catalog seed is a data-delivery requirement, not a hardcoded UI list. A future catalog-management workflow can add or deactivate institutions without invalidating historic Tutor profiles.

## 6. Server and tRPC Contract

### 6.1 Owner-profile procedures

| Procedure                 | Guard            | Input                                           | Output / behaviour                                                                                                                                                                                                                                                      |
| ------------------------- | ---------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tutor.getMyProfile`      | `tutorProcedure` | None                                            | Structured private profile DTO: A–G editable values plus Section H system fields, catalog IDs and labels, photo URL only for the owner. It always returns the persistent registration defaults for a successful Tutor registration, even before any later Profile save. |
| `tutor.saveProfileDraft`  | `tutorProcedure` | Valid partial profile payload; no system fields | Updates the owner’s existing registration-created profile and all supplied selection sets atomically. Preserves `draft` unless an existing non-draft state requires the defined revision transition.                                                                    |
| `tutor.submitProfile`     | `tutorProcedure` | None                                            | Re-reads stored data, applies all submission validation, then sets state to `pending`. Returns new system status and completion `100`.                                                                                                                                  |
| `tutor.getDashboardStats` | `tutorProcedure` | None                                            | Extends current stats with the five Section H values.                                                                                                                                                                                                                   |

`saveProfileDraft` must use a database transaction. For every submitted multi-select set, the service replaces only that Tutor’s associated junction rows inside the same transaction. A failure must roll back the base profile and all relationship updates.

### 6.2 Catalog procedures

Catalog procedures are Tutor-protected because the profile-editing workflow is authenticated. Every response returns only enabled records and uses a capped result size.

| Procedure                           | Input                                               | Result                                                                                      |
| ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `catalog.searchUniversities`        | `query` (0–100 chars), `limit` (default 30, max 50) | Bangladesh public/private universities filtered by case-insensitive name search.            |
| `catalog.searchFacultyDepartments`  | `universityId`, `query`, `limit`                    | Active faculties/departments belonging to the selected university.                          |
| `catalog.searchDegreeMajors`        | `facultyDepartmentId`, `query`, `limit`             | Active degrees/majors belonging to the selected faculty/department.                         |
| `catalog.searchSubjects`            | `query`, `limit`                                    | Active subjects.                                                                            |
| `catalog.searchClassLevels`         | `query`, `limit`                                    | Active class/level options.                                                                 |
| `catalog.searchCurricula`           | `query`, `limit`                                    | Active curricula.                                                                           |
| `catalog.searchStudentTypes`        | `query`, `limit`                                    | Active student types.                                                                       |
| `catalog.searchLanguages`           | `query`, `limit`                                    | Active teaching languages.                                                                  |
| `catalog.searchBangladeshLocations` | `query`, `types`, `limit`                           | Active Bangladesh city/district/area options derived from the existing `locations` catalog. |

### 6.3 Profile-photo upload boundary

Photo bytes require a multipart upload boundary and are the sole exception to the normal tRPC JSON procedure pattern. Implement an authenticated server endpoint, such as `POST /api/tutor/profile-photo`, which accepts exactly one image file.

The endpoint must authenticate the active session, enforce Tutor role and account status, verify file type/size/dimensions server-side, and use `storagePut` with a non-guessable versioned key such as `tutors/{userId}/profile/{uuid}.webp`. It returns `{ key, url }`; the client passes the returned `key` in `saveProfileDraft`. Replacing a photo writes a new key and removes the old database reference. Since the storage layer does not expose a delete operation, unreferenced objects remain inaccessible and are not assumed to be physically deleted.

### 6.4 Public-data boundary

Existing `tutors.list` and `tutors.byId` must continue to return only `approved` profile rows. Their public DTO must never include phone, contact email, date of birth, account status, exact assigned-request count, or a raw private profile payload. A public photo URL and non-sensitive professional summary may be added only through a later public-profile contract.

## 7. Frontend Experience

The protected existing `TutorDashboard` and `DashboardLayout` remain the navigation shell. `/tutor/dashboard/profile` becomes the dedicated multi-section profile workspace. It is not a new public route.

### 7.1 Form structure

| Form section                  | UI behaviour                                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Profile Identity           | Show Tutor ID and registration date as read-only identity metadata. Provide photo upload/preview, full-name and gender prefill, birth-date picker, and headline input.                            |
| B. Contact & Location         | Show a prominent privacy message. Prefill private phone, email, and current Bangladesh location. Use a searchable multi-select for teaching areas and an explicit nationwide-availability choice. |
| C. Academic Information       | Use three dependent searchable selectors. Changing university clears faculty/department and degree/major; changing faculty/department clears degree/major.                                        |
| D. Teaching Expertise         | Use reusable searchable multi-select controls with selected-item chips for every catalog-backed group. Provide controlled optional text areas for experience, expertise, and achievements.        |
| E. Tuition Preferences        | Use accessible radio/select controls for single-value fields, checkbox multi-selects for class size/days/time, and paired min/max BDT inputs.                                                     |
| F. Language & Communication   | Use multi-select controls for enabled languages and the three defined communication channels.                                                                                                     |
| G. About the Tutor            | Four optional text areas with visible character guidance.                                                                                                                                         |
| H. Profile System Information | Render a read-only summary card: completion progress, last updated, status, account status, and assigned request count. No editable control is shown.                                             |

The page must include a section navigator or accordion with clear progress/error indicators. On desktop it may use a two-column form grid within each section; on mobile it must render as a single column with no horizontal scrolling.

### 7.2 Form states and interactions

| State                     | Required UI behaviour                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial load              | Show skeleton/loading state without redirecting a signed-in Tutor. Load the persistent server profile and prefill Name, Gender, Phone, Email, City/Area, Tutor ID, and Registration date from the registration transaction before rendering empty Profile-only fields. The browser onboarding draft is only a temporary fallback while a registration redirect is in flight. |
| Empty profile             | Present the A–H form and explain that registration was Step 1 while profile completion is Step 2.                                                                                                                                                                                                                                                                            |
| Draft editing             | Permit Save draft with valid partial values. Show an unobtrusive saved/error result and retain entered values after a failure.                                                                                                                                                                                                                                               |
| Submission attempt        | Validate required field groups client-side for usability, then rely on server validation as final authority. Move focus to the first invalid field and expose errors through accessible text.                                                                                                                                                                                |
| Successful submission     | Show a success message, refresh `getMyProfile` and dashboard stats, and display `Pending review`.                                                                                                                                                                                                                                                                            |
| Photo upload              | Show upload progress, a preview after successful validation, retry option after failure, and clear error text for invalid files.                                                                                                                                                                                                                                             |
| Dependent-selector change | Clear invalid child choices and tell the Tutor why the selection was reset.                                                                                                                                                                                                                                                                                                  |
| Network/API error         | Keep unsaved local input; show a concise non-sensitive error and offer retry.                                                                                                                                                                                                                                                                                                |

All custom select/popover components must support keyboard search, Escape to close, visible focus indicators, labelled remove buttons for chips, and screen-reader-readable selection counts. The native form must remain usable with a keyboard and at narrow mobile widths.

## 8. Security, Privacy, and Data Handling

The server validates every profile field with Zod and verifies every catalog foreign key against the database. Client-provided labels are display-only; the server persists selected IDs and derives trusted labels from catalog records. Mutations derive the Tutor’s `userId` from the signed session and never from a client input.

| Risk                          | Required control                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Cross-Tutor access            | All owner procedures use `tutorProcedure` and query by `ctx.user.id`; no mutation accepts a writable `tutorId` or `userId`.    |
| Status tampering              | Section H fields and review state are excluded from every Tutor mutation schema.                                               |
| Invalid academic combinations | Server validates university → faculty/department → degree/major relationships before commit.                                   |
| Free-text catalog injection   | Catalog-backed selections accept IDs only; display labels are resolved server-side.                                            |
| Photo abuse                   | One authenticated multipart upload, MIME/signature/dimension/size validation, opaque storage key, and no image bytes in MySQL. |
| Private data leakage          | Public list/detail DTOs omit phone, email, DOB, account status, and owner-only system data.                                    |
| Partial update inconsistency  | Base profile and dependent selections update in a single database transaction.                                                 |

Exact date of birth is sensitive personal information. It must appear only in the Tutor’s authenticated profile workspace and authorised future staff workflow, never in the public profile response. Phone and email remain private under the existing contact-protection policy.

## 9. Test Plan

The implementation tickets must include focused Vitest tests before production code for validation, authorization, calculation, and selector integrity. UI screenshots do not replace these tests.

| Test group              | Required assertions                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Completion calculation  | Returns 0–100 correctly; optional Section G fields do not affect percentage; a complete valid profile returns 100.                                                                                                                                           |
| Authorization           | A Tutor cannot read or mutate another Tutor’s profile; Guardian/public calls are forbidden; non-active accounts are denied once account status is enabled.                                                                                                   |
| Submission validation   | Rejects missing photo, invalid DOB, missing required selections, bad fee range, invalid phone, and invalid enum values.                                                                                                                                      |
| Academic integrity      | Rejects an active but mismatched faculty/university or degree/faculty chain.                                                                                                                                                                                 |
| Multi-select integrity  | Rejects duplicate values, over-limit selections, invalid inactive IDs, and a subject present in both primary and additional groups.                                                                                                                          |
| Registration continuity | Successful registration atomically creates a `draft` Tutor row with the exact non-secret registration values; a fresh sign-in in another browser still receives these defaults from `getMyProfile`; password and confirmation never appear in a profile DTO. |
| Data persistence        | Draft save persists valid partial values; submit changes status to pending only after all required data is present; transactional failure does not leave partial junction data.                                                                              |
| Upload boundary         | Rejects unauthenticated, non-Tutor, invalid MIME/signature, over-size, and undersized images; accepts a valid image and stores only the returned key in MySQL.                                                                                               |
| API privacy             | Public Tutor DTO omits phone, email, DOB, account status, and owner-only data.                                                                                                                                                                               |
| Dashboard UI            | Required errors are visible, Section H is read-only, parent academic changes reset dependent fields, and mobile form layout remains usable.                                                                                                                  |

## 10. Acceptance Criteria

| ID    | Given                                                                     | When                                                      | Then                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | A newly registered Tutor signs in, including from a fresh browser session | They visit `/tutor/dashboard/profile`                     | They see the eight-section workspace with registration Name, Gender, Phone, Email, selected City/Area, Tutor ID, and Registration date prefilled from the server; no password data appears. |
| AC-02 | A Tutor has an incomplete profile                                         | They save valid partial data                              | The profile saves as a draft and no server-owned Section H field is changed by their input.                                                                                                 |
| AC-03 | A Tutor selects a university                                              | They change the university                                | The Faculty/Department and Degree/Major selections clear, and only matching active faculty/department options can be searched.                                                              |
| AC-04 | A Tutor selects a faculty/department                                      | They search for a degree/major                            | Only active degree/major records belonging to that faculty/department appear.                                                                                                               |
| AC-05 | A Tutor selects primary and additional subjects                           | They attempt to place the same subject in both lists      | The interface prevents the duplicate or the server rejects the request with a field error.                                                                                                  |
| AC-06 | A Tutor enters a fee range                                                | The minimum exceeds the maximum                           | The profile cannot be submitted and the fee-range error is associated with the relevant inputs.                                                                                             |
| AC-07 | A Tutor has filled every required A–F field including a valid photo       | They submit the profile                                   | The server returns success, the profile completion is 100, and profile status becomes Pending review.                                                                                       |
| AC-08 | A Tutor omits any required field                                          | They submit the profile                                   | The server rejects submission, keeps the saved draft intact, and identifies the invalid field group.                                                                                        |
| AC-09 | A Tutor views Section H                                                   | They try to alter system fields through the UI or API     | No editable UI control exists and the mutation rejects/ignores those fields.                                                                                                                |
| AC-10 | A profile is not approved                                                 | A public user requests the Tutor list or detail           | The profile is excluded, as in the current approved-only public query policy.                                                                                                               |
| AC-11 | A public user receives an approved Tutor profile                          | They inspect the API response                             | Phone, email, exact birth date, account status, and owner-only system information are absent.                                                                                               |
| AC-12 | An assigned request does not exist for a Tutor                            | The Tutor opens the profile/dashboard                     | Assigned request count displays `0` without implying that matching is already implemented.                                                                                                  |
| AC-13 | A Tutor is on a mobile-width screen                                       | They complete a section and use a searchable multi-select | Inputs, chips, controls, and save/submit actions remain readable, keyboard reachable, and horizontally unclipped.                                                                           |
| AC-14 | A database error occurs while replacing selections                        | The Tutor saves the profile                               | The transaction rolls back; no mix of old and new junction selections is persisted.                                                                                                         |

## 11. Approval Gates and Next Step

Before creating implementation tickets, the owner should approve the following proposed rules or provide revisions.

| Decision requiring approval | Proposed specification rule                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile workflow            | Draft → Pending review → Changes requested / Approved / Suspended; an approved profile becomes pending again after a new submission.        |
| Account status              | `active`, `suspended`, `closed`; only active accounts can use Tutor-protected workflows.                                                    |
| Required groups             | Curriculum, student types, class size, teaching days, time slots, teaching languages, and communication preferences are required to submit. |
| Nationwide availability     | Explicit yes/no choice; it must be `true` for Online or Both tuition types.                                                                 |
| Travel distance             | Optional integer kilometres, 1–100 km.                                                                                                      |
| Minimum age                 | No minimum is enforced until the owner specifies one; the server only rejects future dates.                                                 |
| Approved-profile edits      | A revised submitted profile is removed from public listing until re-approved, rather than maintaining a public revision snapshot.           |

After approval, the next workflow is `/to-tickets`: generate dependency-ordered tickets for schema migration, catalog seeding, server procedures, photo upload, form components, tests, and visual verification. No implementation code should be written before that approval.
