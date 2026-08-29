# Tutor Profile Functional Fix Tickets

**প্রস্তুতের তারিখ:** 19 August 2026  
**Scope:** শুধুমাত্র signed-in Tutor Profile। Guardian request, Admin approval, public listing, matching এবং payment এই ticket set-এর বাইরে।  
**Input:** `docs/tutor-profile-functional-audit-2026-08-19.md`-এ নথিভুক্ত অনুমোদিত FP-01 → FP-03 backlog।

## কাজের নীতি

প্রতিটি ticket বর্তমান server-side validation, authorization, এবং public-data privacy boundary অপরিবর্তিত রাখবে। UI কেবল safe, actionable error information দেখাবে; raw tRPC payload, database details, storage key, internal stack trace, phone, email বা অন্য private data কখনো client feedback-এ দেখানো যাবে না। প্রত্যেক ticket-এর সঙ্গে focused Vitest coverage যোগ হবে এবং full test suite, TypeScript check ও production build সফল হতে হবে।

| Execution order | Ticket | Outcome | Dependency |
|---|---|---|---|
| 1 | FP-01 | Server validation issue-কে inline, field-specific Bangla feedback-এ রূপান্তর | বর্তমান `fieldErrors`, mobile wizard ও save/submit mutation |
| 2 | FP-02 | Non-field failure-এ accurate, safe recovery message | FP-01 error-classification helper |
| 3 | FP-03 | Structured ও legacy profile write path-এর ভবিষ্যৎ contract নির্ধারণ | FP-01/FP-02 complete; backward-compatibility review |

---

## FP-01 — Actionable Server Validation Feedback

### উদ্দেশ্য

Save Draft বা Submit for Review-এর সময় server field validation ব্যর্থ হলে generic error banner-এর বদলে প্রাসঙ্গিক field-এর নিচে Bangla error দেখানো হবে। মোবাইলে সংশ্লিষ্ট wizard step স্বয়ংক্রিয়ভাবে খুলবে, তারপর প্রথম invalid control-এ scroll ও focus যাবে। Generic feedback শুধু তখনই থাকবে, যখন নিরাপদভাবে কোনো নির্দিষ্ট field নির্ধারণ করা সম্ভব নয়।

### সমস্যা ও সীমা

বর্তমান client-side validation প্রয়োজনীয় ক্ষেত্রগুলোর জন্য কাজ করলেও server সর্বশেষ authority। Catalog parent-child mismatch, cross-field validation, stale state এবং server-normalized values client-side precheck অতিক্রম করতে পারে। এই ticket server rules পরিবর্তন করবে না; কেবল safe server issue-কে existing field-error UX-এ map করবে।

| Item | Specification |
|---|---|
| Likely surfaces | `client/src/pages/TutorProfileWorkspace.tsx`, নতুন বা বিদ্যমান error-normalization helper, `TutorProfileUx.ts`, focused workspace/helper tests |
| Data contract | Typed tRPC error-এর Zod/validation issue path থেকে শুধুমাত্র allowlisted editable field key গ্রহণ করতে হবে |
| Field mapping | Server path → existing `fieldErrors` key → existing Bangla field label/error copy; অচেনা path generic safe fallback-এ যাবে |
| Mobile recovery | First mapped field-এর section থেকে `resolveWizardStepForField()` ব্যবহার করে active step নির্ধারণ; DOM element-এ scroll/focus |
| Desktop recovery | Active desktop view অপরিবর্তিত থাকবে; first invalid control-এ scroll/focus যাবে |
| Privacy | Error message থেকে raw payload, storage reference, SQL, internal exception ও private registration value বাদ থাকবে |

### Implementation outline

প্রথমে একটি pure helper তৈরি হবে যা tRPC error থেকে validation issue list নেয় এবং `{ fieldErrors, firstField, hasMappedIssues }` return করে। Helper-টি allowlisted client field-name ছাড়া কোনো server path ব্যবহার করবে না। তারপর Draft এবং Submit mutation-এর `onError` path helper ব্যবহার করবে। Mapped issue থাকলে error banner field-fix নির্দেশনা দেবে; unrecognized/non-validation error হলে FP-02-এর জন্য বর্তমান safe generic fallback রেখে দেবে।

### Acceptance criteria

- একটি mapped server validation rejection সংশ্লিষ্ট field-এর inline Bangla error দেখায়।
- একাধিক server issue থাকলে সব safe mapped field error দেখায় এবং প্রথম issue-তে focus যায়।
- মোবাইলে mapped field Step 2–5-এ হলে সঠিক step সক্রিয় হয়।
- অচেনা বা unsafe error path client field state-এ প্রবেশ করে না।
- একই failure-এ generic banner আর “highlighted details” দাবি করবে না যদি কোনো mapped field না থাকে।
- Draft ও Submit উভয় mutation এই behavior ব্যবহার করে।

### Test-first verification

| Test level | Required coverage |
|---|---|
| Unit | Validation issue allowlist, path-to-field mapping, unknown path fallback, first-field selection |
| Rendered client | Draft/submit mutation error mapping, inline message, wizard step recovery, focus/scroll invocation |
| Regression | Existing client-side errors এবং normal successful save/submit behavior অপরিবর্তিত |

**Commands:** `pnpm vitest run`, `pnpm check`, `pnpm build`.

---

## FP-02 — Safe, Distinct Mutation Failure Feedback

### উদ্দেশ্য

Save Draft ও Submit for Review failure-এর বাকি safe categories আলাদা করে বোঝানো হবে। Tutor জানবে তিনি field ঠিক করবেন, refresh/login করবেন, নাকি পরে retry করবেন—কিন্তু backend implementation detail দেখতে পাবেন না।

### Dependency

FP-01 complete হতে হবে, কারণ mapped validation error প্রথমে field-level recovery পাবে। FP-02 কেবল unmapped/non-field failure-এর feedback নিয়ন্ত্রণ করে।

| Failure category | Tutor-visible bilingual recovery message | Forbidden disclosure |
|---|---|---|
| Mapped validation failure | “চিহ্নিত তথ্যগুলো ঠিক করে আবার চেষ্টা করুন।” | Raw validation payload |
| Pending/already submitted conflict | “প্রোফাইলটি ইতোমধ্যে রিভিউয়ের জন্য জমা আছে; পরিবর্তনের জন্য নির্দেশনা না আসা পর্যন্ত অপেক্ষা করুন।” | Internal status transitions or IDs |
| Authorization/session loss | “আপনার সেশনটি শেষ হয়েছে। আবার লগইন করে চেষ্টা করুন।” | Cookie/JWT details |
| Active-account restriction | “এই অ্যাকাউন্ট দিয়ে এখন প্রোফাইল পরিবর্তন করা যাচ্ছে না। সহায়তার জন্য প্রশাসকের সঙ্গে যোগাযোগ করুন।” | Account policy internals |
| Temporary/unknown failure | “এই মুহূর্তে সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।” | Stack trace, database or storage details |

### Implementation outline

একটি pure mutation-error classifier error code ও safe known error message/metadata থেকে UI category বাছাই করবে। এটি exact backend exception text render করবে না। Workspace-এর draft ও submit `onError` একই classifier ব্যবহার করবে এবং busy state সঠিকভাবে clear করবে। Pending conflict message এবং validation guidance একে অন্যকে overwrite করবে না।

### Acceptance criteria

- Error category অনুযায়ী exact safe recovery guidance দেখা যায়।
- Unknown error কখনো raw server text render করে না।
- Failure-এর পর buttons re-enable হয় এবং form state হারায় না।
- Pending state conflict ভুলভাবে draft validation হিসেবে দেখানো হয় না।
- FP-01 mapped field errors থাকলে FP-02 generic/state message তাদের replace করে না।

### Test-first verification

| Test level | Required coverage |
|---|---|
| Unit | Safe category classification, fallback behavior, raw-message suppression |
| Rendered client | Draft ও submit-এর category-specific banner/toast, buttons unblocked, form values retained |
| Regression | FP-01 field errors এবং successful mutation feedback preserved |

**Commands:** `pnpm vitest run`, `pnpm check`, `pnpm build`.

---

## FP-03 — Legacy Profile Write-Path Decision and Containment

### উদ্দেশ্য

বর্তমান structured Tutor Profile workflow (`saveProfileDraft` এবং `submitProfile`) এবং legacy `upsertProfile` procedure-এর relationship স্পষ্ট করা হবে। লক্ষ্য হলো current UI-এর জন্য একটি documented write contract রাখা এবং legacy procedure ভবিষ্যতে structured profile data অনিচ্ছাকৃতভাবে overwrite করতে না পারে।

### Decision gate

এই ticket implementation-এর আগে backward-compatibility প্রয়োজন নির্ধারণ করতে হবে। নিচের দুইটির একটি নির্বাচন ছাড়া legacy procedure remove, restrict বা rewire করা যাবে না।

| Decision | Permitted change | Required proof |
|---|---|---|
| **A. Legacy procedure no longer required** | Tutor-facing legacy `upsertProfile` retire/restrict; current structured procedures only supported route | No current client call site; authorized migration/compatibility review; regression that legacy path is unavailable or safely rejected |
| **B. Legacy procedure temporarily required** | Strictly document limited fields and route legacy request through a safe compatibility adapter | Contract test proving it cannot clear structured optional selections, private photo reference, profile status, or system-managed values |

> **Risk control:** সিদ্ধান্ত ছাড়া existing procedure মুছে ফেলা যাবে না, কারণ third-party/old client compatibility অজানা।

> **Recorded decision — 19 August 2026:** The product owner approved **A**. Source review confirmed that the active Tutor Profile UI uses only `saveProfileDraft` and `submitProfile`; the legacy `upsertProfile` procedure, its database helper, and inactive dashboard form were therefore retired. A router regression now proves the legacy route is absent while both structured procedures remain registered.

### Acceptance criteria

- Current Tutor Profile UI-এর canonical write path documentation-এ স্পষ্ট থাকে।
- Legacy procedure-এর status, permitted audience এবং permitted fields স্পষ্ট থাকে।
- Legacy write কোনো অবস্থায় photo key, status, account state, private system information অথবা unspecified structured fields overwrite করতে পারে না।
- Procedure retain করা হলে authorization, validation, and consistency tests থাকে; retire করা হলে safe rejection test থাকে।

### Test-first verification

| Test level | Required coverage |
|---|---|
| Routing/API | Canonical current UI write path, legacy accessibility decision, authorization rejection |
| Data integrity | Structured data, selection values, photo reference, profile status, and system fields protected from legacy overwrite |
| Regression | Tutor registration/profile hydration and the current structured draft/submission workflow remain operational |

**Commands:** `pnpm vitest run`, `pnpm check`, `pnpm build`.

---

## Release gates for every FP ticket

প্রতিটি ticket-এর শেষে focused tests চালানোর পর complete Vitest suite, TypeScript check এবং production build চালাতে হবে। Functional feedback change হওয়ার কারণে signed-in Android verification-এ Save Draft, invalid field, Submit for Review এবং wizard-step recovery অন্তর্ভুক্ত থাকবে। Public Tutor responses থেকে phone, contact email, profile/account status, date of birth, request information এবং raw photo-storage key বাদ থাকার privacy regression অপরিবর্তিত থাকতে হবে।

## Implementation handoff

FP-01 সম্পূর্ণ করলে FP-02 শুরু করা যাবে। FP-03 একটি compatibility decision gate; এটি FP-01/FP-02 implementation বাধাগ্রস্ত করবে না, কিন্তু সিদ্ধান্ত ছাড়া procedure removal ঘটবে না।
