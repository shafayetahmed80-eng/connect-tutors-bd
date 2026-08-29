# Connecttutorsbd.com — Current Tab Conversation Log

> **Purpose:** This document summarizes the user requests and assistant responses in the current workspace tab. It is intended to make completed work, decisions, and remaining steps easy to review. It is not a source-code change specification.

## 1. Starting Context Inherited by This Tab

The project is **Connecttutorsbd.com**, a full-stack Tutor-finding platform. Before the work recorded in this log, the platform already had a MySQL/Drizzle database, Guardian/Tutor/Admin role-based access control, Tutor onboarding, Bangladesh-only location selection, Tutor IDs starting from 1503, Tutor registration date, and a Tutor Dashboard sidebar.

The immediate inherited objective was to replace the Tutor-facing OAuth handoff with secure **Email/Password authentication** for Tutor registration and login.

| Topic | Existing project decision |
|---|---|
| Basic Tutor registration | Name, gender, Bangladesh phone, email, city, area, password, and confirm password |
| Tutor ID | Sequential ID beginning at 1503 |
| Tutor dashboard | Displays Tutor ID and “Since” registration date |
| Contact privacy | Tutor phone/email remain private until the relevant matching/approval workflow is later defined |
| Profile completion | Professional teaching information will be completed after initial registration |

## 2. Tutor Email/Password Authentication

### User request

> “Password এবং Confirm Password যোগ হবে। রেজিস্ট্রেশন করার পর টিচার টিউটর লগিন প্যানেল এ ইমেইল আইডি আর পাসওয়ার্ড দিয়ে লগিন করবে।”

### Work completed

The Tutor authentication flow was implemented end-to-end. Tutor passwords are stored using Node.js `scrypt` password hashing rather than plain text. Password verification includes safe comparison and parameter bounds for malformed stored hashes. Tutor registration validates password confirmation, password length, email format, and duplicate email before creating the account.

| Area | Completed work |
|---|---|
| Database | Added nullable `passwordHash` support in the `users` table through migration `0006_brainy_ken_ellis.sql` |
| Backend helpers | Added normalized-email lookup, secure scrypt hash/verify helpers, password Tutor creation, and credential verification |
| tRPC auth | Added Tutor register/login mutations that create the existing JWT-backed session cookie contract |
| Registration UI | Added Password and Confirm Password fields, validation, error states, and dashboard redirect |
| Login UI | Added dedicated `/tutor/login` page with email/password sign-in |
| Protected routes | Tutor Dashboard and its layout redirect unauthenticated Tutors to `/tutor/login`, not generic OAuth |
| Tests | Added password hashing, wrong-password, registration role, Tutor ID, registration-date, session-cookie, and router-level registration assertions |

### Verification completed

The project passed TypeScript checking, the complete Vitest suite (**33 tests**), production build verification, desktop/mobile screenshots, and a live protected-route redirect check.

### Authentication checkpoint

| Checkpoint | Description |
|---|---|
| `c4ddf4a9` | Complete Tutor Email/Password authentication milestone |

## 3. Password Show/Hide Eye Icons

### User request

> “পাসওয়ার্ড শো করার আইকন যোগ করে দিন”

### Assistant response and completed work

Accessible eye-icon controls were added to the following fields:

| Page | Field |
|---|---|
| Tutor Registration | Password |
| Tutor Registration | Confirm Password |
| Tutor Login | Password |

The controls switch the input between hidden and visible password modes, provide accessible labels, preserve focus styling, and work through keyboard Tab/Enter navigation.

### Verification completed

TypeScript checking, 33 Vitest tests, production build, responsive screenshots, and a Playwright keyboard test for Tab/Enter interaction and password input type changes were completed.

### Password visibility checkpoint

| Checkpoint | Description |
|---|---|
| `e937c0d1` | Password show/hide eye-icon controls |

## 4. Skills and Development Workflow Discussion

### User question

> “এই স্কিলগুলো ইনস্টল করতে হবে নাকি টাইপ করে কমান্ড দিলে হবে, আমার এই সাইটের পরবর্তী কাজ এগিয়ে নেওয়ার জন্য এই স্কিলগুলো কিভাবে কাজে লাগাবো”

The requested workflow skills were:

1. `/setup-matt-pocock-skills`
2. `/grill-with-docs`
3. `/to-spec`
4. `/to-tickets`
5. `/implement`
6. `/tdd`
7. `/code-review`

### Assistant answer

The recommended order for a new significant feature is:

```text
/grill-with-docs
        ↓
/to-spec
        ↓
/to-tickets
        ↓
/tdd
        ↓
/implement
        ↓
/code-review
```

`/setup-matt-pocock-skills` is a one-time TypeScript workflow standardization step; it is not required before every feature.

### User request

> “আগে স্কিল লিস্ট এ স্কিল গুলো যোগ করেন”

### Work completed

The seven workflow skills were prepared as local installable Skill packages, their unused template directories were removed, and each package passed the Skill validator.

| Skill | Intended use |
|---|---|
| `setup-matt-pocock-skills` | Standardize TypeScript development workflow |
| `grill-with-docs` | Conduct focused requirement discovery before coding |
| `to-spec` | Convert agreed requirements into a technical specification |
| `to-tickets` | Divide the specification into ordered implementation tickets |
| `implement` | Implement approved tickets safely in the existing architecture |
| `tdd` | Apply test-first development to critical functionality |
| `code-review` | Review security, privacy, authorization, tests, and maintainability |

The packages were delivered as installable `SKILL.md` attachments so the user can add them through **My Skills**.

## 5. Tutor Profile Requirements Discovery

### User request

> “/grill-with-docs — Connecttutorsbd.com-এর Tutor Profile-এর পূর্ণ কাঠামো নির্ধারণ করুন।”

### Clarification from the user

> “আমার আগে টিউটর প্রোফাইল এ সাইবারের তথ্য অনুযায়ী কি কি থাকবে সেটা নির্ধারণ করা দরকার”

The intended direction was clarified as **field-first discovery**. The profile’s sections and information fields must be decided before discussing visibility, approval, verification, or implementation.

### Proposed Tutor Profile sections

The following eight sections were proposed:

| Code | Section | Proposed content |
|---|---|---|
| A | Profile Identity | Tutor ID, registration date, full name, photo, gender, age, headline |
| B | Contact & Location | Phone, email, city/area, teaching coverage |
| C | Academic Information | Education, degree, institution, study status, graduation year |
| D | Teaching Expertise | Subjects, class levels, curriculum, experience, expertise |
| E | Tuition Preferences | Tuition mode, student preference, availability, fee, travel distance |
| F | Language & Communication | Teaching languages and communication preference |
| G | About the Tutor | About, teaching approach, differentiators, outcomes, notes |
| H | Profile System Information | Completion, status, last updated, account/request metrics |

### Confirmed section decision

#### User answer

> “A–H সব section থাকবে”

#### Recorded decision

All eight Tutor Profile sections, **A through H**, will be included.

## 6. Section 1 Field Checklist — First Answer and Correction

The user requested that profile decisions be presented as selectable checklists. Because Markdown checkboxes in chat are not interactive, the process was changed to a simple numbered option format such as `1-A, 2-B`.

### First Section 1 response from the user

> “1- A, 2-A, 3-B, 4- B, 5- B, 6-C, 7-A, 8- B”

This initially mapped to the following choices:

| # | Field | First answer interpreted as |
|---|---|---|
| 1 | Profile photo | Required |
| 2 | Age | Single age value |
| 3 | Short headline | Optional |
| 4 | Additional teaching areas | One area only |
| 5 | Available nationwide | Optional |
| 6 | Institution location | Excluded |
| 7 | Study status | Studying / Graduated / Professional |
| 8 | Graduation year | Optional |

### Important correction

The user then said:

> “সেকশন ১ এ কারেকশন আছে, আবার দেন”

Therefore, the entire first Section 1 field-answer set above is **superseded and not final**. A corrected Section 1 checklist was resent, and the user’s corrected selection is still pending at the time of this log.

## 7. Current Pending Question — Section 1 Correction

The user needs to reply to the corrected Section 1 field inventory:

| # | Field | A | B | C |
|---|---|---|---|---|
| 1 | Profile Photo | Required | Optional | Excluded |
| 2 | Age | Single age | Age range | Excluded |
| 3 | Short Headline | Included | Optional | Excluded |
| 4 | Additional Teaching Areas | Multiple areas | One area | Excluded |
| 5 | Online: Available Nationwide | Included | Optional | Excluded |
| 6 | Institution Location | City and District | City only | Excluded |
| 7 | Current Study Status | Studying / Graduated / Professional | Studying / Graduated | Excluded |
| 8 | Graduation Year | Required | Optional | Excluded |

Suggested answer format:

```text
1-?, 2-?, 3-?, 4-?, 5-?, 6-?, 7-?, 8-?
```

## 8. Current Project Files Relevant to This Tab

| File | Purpose |
|---|---|
| `server/db.ts` | Password hashing, password verification, credential lookup, and Tutor identity helpers |
| `server/routers.ts` | Tutor registration/login tRPC mutations and authentication logic |
| `client/src/pages/JoinTutor.tsx` | Tutor registration form, including passwords and visibility controls |
| `client/src/pages/TutorLogin.tsx` | Dedicated Tutor email/password login page |
| `client/src/pages/TutorDashboard.tsx` | Tutor dashboard and Tutor login fallback |
| `client/src/components/DashboardLayout.tsx` | Configurable dashboard unauthenticated redirect |
| `server/auth.password.test.ts` | Tutor password authentication test coverage |
| `docs/tutor-profile-field-decisions.md` | Field-discovery decision log; its first Section 1 answers require correction |
| `todo.md` | Project task history and pending work |

## 9. Next Steps

The next correct step is to collect the **corrected Section 1 choices**. Then the requirements session will move to the Academic Information, Teaching Expertise, Tuition Preferences, Language & Communication, and About the Tutor field checklists.

Only after all fields are agreed should the workflow proceed to:

```text
/to-spec → /to-tickets → /tdd → /implement → /code-review
```

No Tutor Profile database migration, UI implementation, visibility rule, approval workflow, or verification-document workflow should begin until the field-first discovery is complete.
