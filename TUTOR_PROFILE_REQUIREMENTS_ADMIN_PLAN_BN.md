# Tutor Profile Requirement Controls — Admin Interface Plan

**অবস্থা:** Approval required — এই নথি কোনো application code, schema বা validation rule পরিবর্তন করে না।

## 1. উদ্দেশ্য

Excel workbook-এর পরিবর্তে Project Owner একটি Admin screen থেকে নির্দিষ্ট Tutor Profile field-কে **Mandatory** অথবা **Optional** করতে পারবেন। পরিবর্তনটি Tutor Profile form-এর label, profile-completion হিসাব এবং profile submission validation-এ একইভাবে কার্যকর হবে।

> সাধারণ Adminরা Tutor-এর full private profile review করতে পারবেন—এটি পূর্বের সিদ্ধান্ত। কিন্তু সকল Tutor-এর submission policy পরিবর্তন একটি global security setting; তাই এই setting শুধুমাত্র **Project Owner** পরিচালনা করবেন—এটিই প্রস্তাবিত default।

## 2. বর্তমান কাঠামো থেকে গুরুত্বপূর্ণ finding

| বর্তমান অংশ | বর্তমান আচরণ | প্রভাব |
|---|---|---|
| `server/tutor-profile.validation.ts` | 27টি submission-required field একটি static server list-এ আছে | শুধু UI toggle যথেষ্ট নয়; server-side validation-ও runtime rule পড়তে হবে |
| `TutorProfileWorkspace.tsx` | required star hard-coded prop দিয়ে দেখানো হয় | Rule query নিয়ে label, `aria-required`, এবং Optional label centrally চালাতে হবে |
| `AdminWorkspaceLayout.tsx` | Owner-only navigation আগে থেকেই `getWorkspaceAccess` দিয়ে controlled | নতুন route Owner controls section-এ নিরাপদে যোগ করা যাবে |
| `routers.ts` | `ownerAdminProcedure` Project Owner-এর identity server-side যাচাই করে | Requirement update mutation এই procedure দিয়েই সুরক্ষিত থাকবে |

## 3. Recommended Admin user experience

নতুন route হবে **`/admin/tutor-profile-requirements`** এবং Admin sidebar-এর **Owner controls** section-এ **Profile requirements** নামে থাকবে। Normal Admin direct URL খুললেও server থেকে `FORBIDDEN` পাবেন এবং setting-এর data বা audit দেখতে পারবেন না।

Screen-এর উপরে থাকবে একটি সংক্ষিপ্ত policy notice: “Changes affect future profile submissions and re-submissions; they do not silently alter approved profiles.” নিচে থাকবে search, section filter, current-rule summary এবং unsaved-changes count।

| UI অংশ | আচরণ | Accessibility ও mobile behaviour |
|---|---|---|
| Section filter | Identity, Education, Teaching, Tuition, Communication, Emergency, Verification | Keyboard-selectable; mobile-এ full-width |
| Rule table | Field, Tutor label, current requirement, privacy class, conditional note | Laptop-এ table; mobile-এ one-field-per-card layout |
| Requirement control | Mandatory/Optional segmented radio group | Native radio semantics, visible focus, label association |
| Conditional badge | Rule dependency দেখাবে; উদাহরণ: Online/Both হলে nationwide required | Toggle দিয়ে bypass করা যাবে না |
| Save bar | Changed count, Discard, Review changes, Save rules | Sticky নয় এমন bottom action; 44px target |
| Confirmation dialog | Before/after value এবং impact দেখিয়ে Owner confirmation নেবে | Keyboard focus trap ও clear cancel path |
| Audit history | Actor, timestamp, field label, before/after; raw Tutor data ছাড়া | Owner-only, paginated |

## 4. Rule model ও database plan

সব field key code-এর একটি **allowlist registry**-তে থাকবে। UI বা API কোনো arbitrary field name গ্রহণ করবে না। প্রথম release-এ কেবল সেই existing field-গুলোই editable হবে যেগুলো বর্তমান Tutor form, form payload এবং server validator-এ বাস্তবে আছে। ভবিষ্যতে নতুন field চালু হলে নতুন registry entry ও migration আলাদা ticket-এ যোগ হবে।

| Table | Proposed columns | Purpose |
|---|---|---|
| `tutor_profile_requirement_rules` | `fieldKey` (unique), `requirement` (`mandatory`/`optional`), `updatedByUserId`, `updatedAt` | Default থেকে পরিবর্তিত effective rule সংরক্ষণ |
| `tutor_profile_requirement_audit_events` | `id`, `fieldKey`, `previousRequirement`, `nextRequirement`, `actorUserId`, `createdAt` | Append-only policy audit; কোনো Tutor PII থাকবে না |

Code registry-তে থাকবে field key, English-first label, section, default requirement, visibility class এবং hard conditional validator metadata। Database-এ override না থাকলে registry-এর approved default কার্যকর হবে। এই design migration-safe এবং ভুল/অজানা field key injection প্রতিরোধ করে।

## 5. Effective validation contract

| স্তর | দায়িত্ব |
|---|---|
| Draft save | Optional বা অসম্পূর্ণ field-সহ save করা যাবে; বর্তমানে যেসব structural, format, range ও catalogue consistency rule আছে সেগুলো অপরিবর্তিত থাকবে |
| Tutor form | Effective rule query থেকে `*`, `Optional`, `aria-required`, field error এবং completion hint দেখাবে |
| Submission | Server একই request scope-এ effective rules লোড করে mandatory field যাচাই করবে; browser validation কখনো authoritative নয় |
| Cross-field safety | Tuition type Online/Both হলে nationwide availability বাধ্যতামূলক থাকবে, field Optional করলেও এই conditional rule bypass হবে না |
| Completion | Effective mandatory field denominator দিয়ে completion হিসাব হবে; optional field completion percentage কমাবে না |
| Status | Rule বদলানোর ফলে কোনো approved Tutor-এর profile status স্বয়ংক্রিয়ভাবে পরিবর্তন হবে না |

## 6. Scope guardrails

এই UI নিচের তথ্যকে editable requirement হিসেবে expose করবে না: password, session/cookie, storage key, audit metadata, Tutor ID, system-generated profile status, verification result, moderation outcome বা raw document URL। Phone/email ও sensitive future field থাকলেও visibility policy আলাদা; requirement toggle কখনো public visibility toggle নয়।

NID-এর মতো sensitive document future scope-এ যোগ হলে encrypted storage, Project-Owner access, retention schedule, deletion workflow এবং access audit আগে implement/approve করতে হবে। এই requirement UI নিজে NID upload বা document viewing সক্ষম করবে না।

## 7. Planned implementation sequence

| ক্রম | কাজ | প্রধান file area |
|---|---|---|
| 1 | Canonical field registry ও pure effective-rule helpers | `server/` shared validation helpers |
| 2 | Schema/migration, rule persistence ও append-only audit helper | `drizzle/schema.ts`, migration, `server/db.ts` |
| 3 | Owner-only tRPC queries/mutation এবং server authorization | `server/routers.ts` |
| 4 | Admin route, Owner navigation item, requirement manager UI | `client/src/App.tsx`, Admin layout, new page |
| 5 | Tutor form labels, dynamic submission feedback ও dynamic completion | Tutor Profile UI/UX/validation files |
| 6 | Server/client unit tests, desktop/mobile visual verification | Vitest and browser checks |

## 8. Required regression coverage

| Test area | Required assertion |
|---|---|
| Authorization | Non-Owner Admin cannot list, update or view audit records—even by direct API call |
| Input allowlist | Unknown field key, invalid enum, duplicate key এবং tampered payload rejected |
| Audit | Each changed field creates safe before/after audit record with Owner actor ID only |
| Form labels | Runtime Mandatory shows star and `aria-required`; Optional shows “Optional” |
| Validation | Server rejects missing runtime-mandatory value and accepts missing runtime-optional value |
| Conditional rule | Online/Both without nationwide remains rejected despite optional override |
| Existing Tutor safety | Changing rule leaves approved status unchanged; applies at subsequent submission |
| Responsive UI | 1280px laptop table and 375px mobile card/filter/save flow are readable and reachable |

## 9. Decisions required before code

| প্রশ্ন | Option | Recommendation |
|---|---|---|
| কে rule পরিবর্তন করবেন? | A. সব Admin; B. শুধু Project Owner | **B** |
| নতুন rule কখন প্রয়োগ হবে? | A. সঙ্গে সঙ্গে existing approved Tutor-এও; B. future submission/re-submission-এ | **B** |
| Optional করা যাবে কি? | A. সব registry field; B. শুধু approved allowlist; C. hard safety field বাদ দিয়ে allowlist | **C** |
| Saved history | A. audit history রাখব; B. history ছাড়া update | **A** |

**Approval format:** `1B, 2B, 3C, 4A — Plan approved` লিখলে implementation ticket তৈরি ও code-writing phase শুরু হবে।
