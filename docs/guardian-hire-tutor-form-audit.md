# Guardian “Hire a Tutor” Form Audit

**Prepared by:** Manus AI  
**Date:** 22 August 2026  
**Scope:** Guardian request journey, especially the mobile-visible Learning Needs section

## Executive summary

The reported issue is valid. The current form labels the first selector **“Curriculum / category”**, but its options mix different concepts: educational curricula, tutoring goals, and an education stage. In particular, **English Version is missing**, while **University** appears in the curriculum/category list even though it is already present as a class/level option. This makes the form harder to understand and creates ambiguous data for matching and administration.

The safest correction is to separate the form into three concepts: **Curriculum**, **Level or target**, and **Subject or course**. The first selector should include English Version and should not contain University. University should remain a level/target option, with a later conditional field for university subject or admission goal if that capability is approved. The current database field `category` can temporarily store the selected curriculum/goal value for backward compatibility, but the UI label and option mapping must become explicit before expanding the database contract.

## Evidence reviewed

The audit compares the approved Guardian requirements and the current implementation. The supplied mobile screenshot is treated as a visual reference for the first learning-needs step, not as a complete product specification.

| Evidence | Finding | Confidence |
|---|---|---:|
| Approved Guardian brief | The request journey needs tuition type, category/curriculum, class/course, subjects, City, location, and student gender, followed by preference details and review. | High |
| `client/src/pages/GuardianRequestJourney.tsx:14–16` | Current subjects are a single static list; categories are `Bangla Medium`, `English Medium`, `Madrasa`, `Admission preparation`, and `University`; levels also include `University`. | High |
| `client/src/pages/GuardianRequestJourney.tsx:335` | The visible first step renders `Curriculum / category`, `Class / level`, optional student first name, and a static subject button list. | High |
| `client/src/pages/GuardianRequestJourney.tsx:336` | Tuition type, location, days per week, preferred Tutor gender, budget, and notes are collected in the second step, so they are not missing from the complete journey. | High |
| `drizzle/schema.ts:767–802` | The request table stores one `category`, one `classCourse`, a serialized subject list, and preference/location fields; it has no dedicated curriculum, board, university, or department columns. | High |
| Supplied mobile screenshot | The first step visually emphasizes category, class/level, student name, subjects, and Continue. It does not prove that a University selector belongs under Curriculum. | Medium |

## Requirements matrix

| Requirement | Current state | Assessment | Recommended acceptance condition |
|---|---|---|---|
| Bangladesh National Curriculum / Bangla Medium | Present as `Bangla Medium`. | Keep. | A Guardian can select Bangla Medium and the value remains available in review, admin, and matching data. |
| English Version | Not present in the current `categories` array. | Missing; this is the clearest confirmed gap. | English Version appears as a first-class curriculum option and is not confused with English Medium. |
| English Medium | Present as `English Medium`. | Keep, but it needs a clear board/track distinction when relevant. | English Medium is selectable separately from English Version; the UI explains that English Medium may include Cambridge, Edexcel, or IB pathways when those choices are supported. |
| Madrasa | Present. | Keep only if the platform currently supports this matching path. | The option remains visible only if admin matching and subject coverage support it; otherwise mark it as a separately approved future category. |
| Admission preparation | Present. | This is a goal/pathway, not a curriculum. It should not be presented beside school curricula without clarification. | The UI either moves it to a “Learning goal” field or clearly labels the combined selector “Curriculum or learning goal.” |
| University | Present in `categories` and also in `levels`. | Incorrectly duplicated and semantically misplaced in the curriculum/category list. | University is removed from Curriculum. It remains under Level/target, or becomes a distinct “University/admission goal” pathway with its own dependent fields. |
| Class / level | Present as a static selector with school and university values. | Mostly correct, but the options are not conditional on curriculum or goal. | The level list changes or is filtered based on the selected curriculum/goal, and no duplicate University choice appears in two concepts. |
| Subjects | Present as eight static buttons. | Present but incomplete and not context-sensitive. | Subject choices are filtered or grouped by the selected curriculum/level; every selected subject is shown in review and preserved on back/edit. |
| Student first name | Present as optional and coordinator-visible. | Potentially useful, but it is not needed for initial tutor matching and introduces personal-data collection. | Keep optional only if coordinators genuinely use it; otherwise remove it or move it to a later private profile/request detail step. The privacy explanation must remain accurate. |
| Tuition type | Present in Step 2. | Not missing from the full journey. | Home, Online, and Both remain available, with physical location required only when Home or Both is selected. |
| City and local area | Present in Step 2 through searchable location controls. | Correctly placed; not a curriculum field. | City selection scopes the local-area options, clears stale child selections, and remains private from public job-board data where required. |
| Student gender / preferred Tutor gender | The current request collects preferred Tutor gender, not an explicitly labeled student gender field. | Potential mapping ambiguity. | Product language must distinguish “Student gender” from “Preferred Tutor gender.” If the matching requirement is student gender, add the appropriate field and do not silently reuse the tutor-preference field. |
| Days, budget, notes | Present in Step 2. | Present. | Required and optional states remain explicit, with validation and truthful review summaries. |
| University-specific information | No university, department, subject, or admission-target fields exist in the Guardian request contract. | Missing for a meaningful university request; adding “University” alone would not solve the matching problem. | If University requests are in scope, define a conditional University pathway with the minimum approved fields, such as target institution or subject/department, before implementation. |

## Corrected information architecture

The recommended first step should not use a single ambiguous “Curriculum / category” selector. It should guide the Guardian through a small decision hierarchy.

### Step 1: Learning needs

| Field | Required | Recommended control | Options or behavior |
|---|---:|---|---|
| Curriculum | Yes | Searchable/select control | Bangla Medium, English Version, English Medium, Madrasa, and any other approved curriculum. Do not include University. |
| Learning goal or pathway | Conditional or yes, depending on product decision | Select control | School tuition, Admission preparation, University study, or another explicitly approved goal. If keeping one combined field for the first release, rename it **“Curriculum or learning goal”** and group the options visually. |
| Class / level | Yes | Dependent select | Primary, secondary, SSC, HSC, undergraduate, or the approved current equivalents. The available values should depend on the selected curriculum or goal. |
| Subject(s) | Yes | Filtered multi-select or grouped choice buttons | Show relevant subjects for the selected curriculum/level. Preserve multi-selection and expose the selected count on mobile. |
| Student first name | Optional | Text input | Keep only if the coordinator needs it. The helper text must state exactly who can see it and why. |

### Step 2: Tuition preferences

The current Step 2 is broadly aligned with the approved journey and should remain separate from curriculum selection. It should contain Tuition type; City and local area when Home or Both is selected; days per week; preferred Tutor gender; monthly budget; and optional notes. The label **“Preferred Tutor gender”** should not be renamed to **“Student gender”** unless the underlying business meaning is changed and tested across admin, job-board, and matching flows.

### Step 3: Review and submit

The review should show the selected Curriculum, Learning goal/pathway where applicable, Class/level, Subjects, and optional student name under Learning needs. It should show Tuition type, physical location when relevant, days, preferred Tutor gender, budget, and notes under Tuition preferences. If University-specific fields are introduced, they must have their own review labels rather than being hidden inside `category` or `classCourse`.

## Specific correction to the reported problem

The current option list is:

> `Bangla Medium`, `English Medium`, `Madrasa`, `Admission preparation`, `University`

This list should be corrected in two stages. For the minimal safe UI correction, replace it with:

> `Bangla Medium`, `English Version`, `English Medium`, `Madrasa`, `Admission preparation`

and keep **University** only in the level/target selector. This immediately fixes the missing English Version option and removes the duplicate University concept. However, this minimal change still combines curriculum and learning goal in one field. The preferred product correction is to split Curriculum from Learning goal/pathway, because Admission preparation is not a curriculum and will otherwise remain semantically mixed.

## Data and backward-compatibility impact

No database migration is required for the minimal correction if the selected value continues to be persisted through the existing `category` column. Existing records containing `University` must remain readable, and admin screens must display them as legacy request values rather than silently rewriting historical data.

A clean long-term model would add a dedicated curriculum identifier and a separate learning-goal/pathway identifier, with optional structured fields for English Medium board and university-specific targeting. That change should not be made solely from the screenshot because it affects the tRPC input contract, Drizzle schema, admin editing, job-board projection, matching filters, request drafts, and historical records. It should follow a separate approved specification and additive migration.

## Privacy, accessibility, and mobile requirements

The current form collects an optional student first name while stating that it is visible only to the coordinator. That boundary must remain true in the API, admin UI, job-board projection, and review copy. Curriculum and level changes must clear incompatible dependent selections, especially selected subjects, university-specific values, and stale location-like child choices if those are added later.

On mobile, each required field needs a visible label and a clear error target. Grouped choices should remain keyboard reachable, expose selection state through `aria-pressed` or an equivalent semantic control, and avoid making users scroll through a long unfiltered subject list. The Continue button should remain reachable after validation feedback, and the step indicator should continue to identify the active section.

## Open decisions that block a full implementation

| Decision | Recommended default | Why it matters |
|---|---|---|
| Should Curriculum and Learning goal be separate fields now? | Yes, if the product is ready for a small data-contract extension; otherwise use a grouped “Curriculum or learning goal” field for the interim. | This resolves the conceptual mixing of English Version, Admission preparation, and University. |
| Is University tuition in scope for the current release? | Keep University as a target level only until university-specific matching fields are approved. | A bare University option does not provide enough information for reliable matching. |
| Should English Medium ask for board? | Add a conditional board field only if admin/tutor data already supports Cambridge, Edexcel, and IB matching. | Otherwise the field collects information that cannot be used consistently. |
| Is Student gender required, or is Preferred Tutor gender the intended field? | Confirm with the matching owner before changing the schema or labels. | The current request contract stores preferred Tutor gender; changing the label alone could create incorrect matching data. |
| Should Student first name remain? | Keep optional for the current release, with privacy wording, unless coordinators confirm it is not used. | Removing it changes the established request flow but is low risk if unused. |

## Implementation-ready acceptance criteria

1. The Learning Needs section visibly offers **English Version** as a curriculum option.
2. **University** is not presented as a curriculum option in the minimal correction; it remains only as an approved level/target value until a separate University pathway is defined.
3. The UI does not label Admission preparation as a curriculum without an explanatory “learning goal” distinction.
4. The selected curriculum/goal, level, and subjects persist through Continue, Back, Review, and Edit flows.
5. Subject choices are either filtered by curriculum/level or the product explicitly accepts the current generic list as an interim limitation.
6. Existing request records containing the legacy `category = University` value remain readable and editable without destructive rewriting.
7. Admin and public/Tutor-facing projections retain their existing privacy boundaries; student name and notes do not become public job-board fields.
8. The form remains usable at the supplied mobile width, with visible labels, keyboard-accessible controls, clear validation, and no horizontal overflow.
9. Focused Vitest coverage verifies option inventory, dependent-field reset behavior, review persistence, and legacy-value rendering.
10. Full TypeScript, Vitest, production build, and desktop/mobile verification pass before release.

## Decision log

**Confirmed:** English Version is required by the product direction and is missing from the current category options. University is duplicated semantically because it appears in both category and level options. The current complete journey already collects tuition type, location, days, preferred Tutor gender, budget, and notes in Step 2.

**Assumed for this audit:** The immediate correction should be low risk and should not require a database migration. Existing historical request values must remain readable. The mobile screenshot represents the Learning Needs step rather than the entire request journey.

**Not recommended:** Adding a University selector to the form without defining university subject/department or admission-target data. Renaming Preferred Tutor gender to Student gender without confirming the underlying business meaning. Silently replacing historical `University` values in the database.

## References

[1]: `client/src/pages/GuardianRequestJourney.tsx` — current Guardian request journey, option lists, step markup, validation, and review presentation.

[2]: `drizzle/schema.ts` — current `tutor_requests` data contract and privacy-related request fields.

[3]: `client/src/pages/GuardianRequestJourney.validation.test.ts` — current validation expectations for curriculum/category, location, days, and budget.

[4]: User-approved Guardian Dashboard and Hire a Tutor requirements in the task brief — required request fields and three-step journey intent.

[5]: User-supplied mobile screenshot — visual reference for the Learning Needs section.
