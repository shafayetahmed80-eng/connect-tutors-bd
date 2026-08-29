# Guardian Segmented Navigation Sidebar — Feasibility Review

**Prepared by:** Manus AI  
**Date:** 22 August 2026  
**Status:** Evidence-based review and implementation recommendation; no production behavior or database data changed.

## Executive conclusion

হ্যাঁ, Tutor Dashboard-এর মতো Guardian-এর জন্য segmented navigation sidebar করা সম্পূর্ণ সম্ভব। গুরুত্বপূর্ণ বিষয় হলো—এটি শূন্য থেকে নতুন layout বানানোর কাজ নয়। বর্তমান project-এ shared `DashboardLayout` ইতোমধ্যে grouped navigation, active route, collapsible desktop sidebar, mobile drawer, identity slot, planned-state badge এবং secure sign-out action সমর্থন করে। Guardian workspace-এ `/guardian/dashboard/:section` route এবং Guardian-specific navigation-ও ইতোমধ্যে আছে।

অতএব, **sidebar shell যোগ করার database risk খুব কম**। মূল কাজ হবে প্রতিটি segment-এর live capability, truthful placeholder, route behavior, ownership check এবং future domain model আলাদা করে সংজ্ঞায়িত করা। Profile, photo, request journey, Posted Jobs, Settings এবং How it Works ইতোমধ্যে বাস্তব data contract-এর সঙ্গে যুক্ত। Attendance, Confirmation Letter, Exclusively Yours এবং Guardian Community এখনো পূর্ণ business/data model ছাড়া placeholder পর্যায়ে থাকা উচিত।

> **প্রধান সুপারিশ:** Guardian sidebar এখনই রাখা যায় এবং রাখা উচিত; তবে sidebar item থাকা মানেই সংশ্লিষ্ট feature live—এমন ধারণা তৈরি করা যাবে না। Live, Partially live, এবং Coming later state দৃশ্যমানভাবে আলাদা রাখতে হবে।

## বর্তমান architecture কী সমর্থন করে

`client/src/components/DashboardLayout.tsx`-এর shared shell-এ `navigationItems`, `sectionLabel`, `dividerBefore`, `planned`, `sidebarIdentity` এবং mobile navigation context-এর support আছে। ফলে Guardian-এর জন্য Tutor-style visual hierarchy তৈরি করতে নতুন layout বা নতুন database table দরকার নেই। `client/src/pages/GuardianDashboard.tsx` ইতোমধ্যে Guardian-specific navigation ও identity summary ব্যবহার করছে এবং section parameter অনুযায়ী content পরিবর্তন করে।

Current route contract হলো `/guardian/dashboard` এবং `/guardian/dashboard/:section`। Posted Jobs-এর জন্য `/guardian/requests` আলাদা protected workspace route আছে। এই route-গুলোকে সরাসরি sidebar destination হিসেবে ব্যবহার করা যায়, তবে active-state এবং back-navigation একই naming convention-এ রাখা প্রয়োজন।

## Proposed Guardian sidebar information architecture

| Section | Sidebar item | বর্তমান অবস্থা | Database প্রয়োজন | Recommendation |
|---|---|---:|---:|---|
| Active workspace | Dashboard | Live | Existing Guardian/request data | এখনই রাখুন |
| Active workspace | Hire a Tutor | Live | Existing request tables and draft flow | এখনই রাখুন |
| Active workspace | Profile | Live | `guardian_profiles`, photo tables, audit events | এখনই রাখুন |
| Active workspace | Posted Jobs | Live v1 | Guardian-owned requests and publication state | এখনই রাখুন |
| Active workspace | Settings | Partially live | Existing password flow; verified contact workflow pending | রাখুন, scope স্পষ্ট করুন |
| Active workspace | Attendance | Truthfully deferred | New attendance domain required | `Soon` / deferred state |
| Guidance | How it Works | Live | Static content; no new table required | এখনই রাখুন |
| Coming later | Confirmation Letter | Planned | Letter eligibility, issue, expiry, revocation model | Placeholder only |
| Coming later | Exclusively Yours | Planned | Benefit/content entitlement model | Placeholder only |
| Coming later | Join Guardian Community | Planned | Consent, membership, moderation, reporting model | Placeholder only |
| Account | Sign Out | Live | Existing auth/logout | এখনই রাখুন |

## Database impact assessment

### Low-risk portions

Sidebar labels, grouping, icons, active route state, mobile collapse state এবং `planned` badge UI-only concerns। এগুলোর জন্য database migration প্রয়োজন নেই। Existing Guardian identity card-ও current `guardian_profiles` contract থেকে নিরাপদভাবে তৈরি করা যায়। Schema-তে stable opaque `guardianId`, phone, gender, canonical city/location এবং timestamps আছে; identity header-এ internal numeric user key বা synthetic Student ID ব্যবহার না করাই সঠিক সিদ্ধান্ত।

Profile photo-র জন্য `guardian_profile_photos` এবং append-only `guardian_profile_photo_events` ইতোমধ্যে আছে। Approved-only display এবং initials fallback বজায় রেখে sidebar identity card-এ ছবি দেখানো যায়। Photo storage key বা moderation note client-facing sidebar contract-এ পাঠানো যাবে না।

### Existing request-backed portions

Dashboard, Hire a Tutor এবং Posted Jobs existing tutor-request lifecycle, publication state, private ownership query এবং Guardian progress mapping-এর ওপর নির্ভর করতে পারে। এতে নতুন sidebar-specific table দরকার নেই। প্রতিটি query-তে signed-in Guardian-এর user ID দিয়ে ownership enforce করতে হবে; client route বা URL parameter-কে ownership proof হিসেবে গ্রহণ করা যাবে না।

### Genuine database gaps

নিচের feature-গুলোকে কেবল sidebar tab হিসেবে দেখানো গেলেও live data feature হিসেবে চালু করতে নতুন domain design প্রয়োজন:

| Feature | প্রয়োজনীয় domain decision | সম্ভাব্য data model |
|---|---|---|
| Attendance | কে session তৈরি/mark/edit/dispute করবে, multiple student/tutor support, timezone, correction এবং retention | attendance sessions, participants, edits/disputes, audit events |
| Confirmation Letter | letter কোন event-এ eligible, issuer, validity, verification, correction এবং revocation | letter records, immutable versions, verification token, revocation events |
| Exclusively Yours | benefit/resource কী, entitlement কার, expiry, editorial owner, paid/free status | resources, entitlements, publications, optional read tracking |
| Guardian Community | কোন channel, consent, membership, moderation, reporting এবং removal rules | memberships, consents, moderation/report events |
| Phone update | new number verification, OTP expiry, attempt limit, activation timing | verification challenges, rate limits, audit events |

এই data model-গুলো অনুমোদিত না হওয়া পর্যন্ত feature-গুলোর জন্য database migration না করাই নিরাপদ। Empty table তৈরি করে live tab দেখানো user expectation এবং support burden বাড়াবে।

## Security and privacy analysis

Guardian sidebar private account workspace; এটি public Guardian profile নয়। Sidebar-এ email, phone, exact location, student identity, free-text notes বা private photo storage metadata দেখানো যাবে না। Guardian-এর own request history-তে safe status, submitted/updated date, public Job ID এবং area-level location প্রয়োজন অনুযায়ী দেখানো যেতে পারে; raw contact এবং exact address নয়।

সব Guardian procedures `protectedProcedure`-এর মাধ্যমে authenticated user context ব্যবহার করবে এবং owner-bound database helper-এর ওপর নির্ভর করবে। Guardian route-এ অন্য Guardian-এর section বা request ID manually বসিয়ে data access করা যাবে না। Future Admin-only data, Tutor interest details বা matching notes Guardian sidebar API-তে leak করা যাবে না।

Photo state-এর ক্ষেত্রে pending/rejected/absent photo-তে initials fallback থাকবে; শুধুমাত্র approved photo identity surfaces-এ দেখানো যাবে। Sidebar aesthetic উন্নত করতে এই moderation boundary কখনো bypass করা যাবে না।

## UX and accessibility recommendation

Desktop-এ Tutor-style persistent sidebar এবং Guardian identity card রাখা উচিত। Sections-কে **Active workspace**, **Guidance**, **Coming later**, এবং **Account** group-এ ভাগ করলে Guardian বুঝতে পারবেন কোন action এখন করা যায় এবং কোনটি ভবিষ্যৎ সুবিধা। Planned item-এ visible `Soon` label ও concise explanation থাকবে; click করলে generic error নয়, honest availability message দেখাবে।

Mobile-এ sidebar drawer থাকবে এবং navigation action-এর পর drawer বন্ধ হবে। Header-এ current workspace ও current destination দেখা উচিত। Keyboard users-এর জন্য every item reachable button হিসেবে থাকবে, visible `focus-visible` ring বজায় থাকবে, active item শুধু color দিয়ে বোঝানো যাবে না, এবং `aria-current="page"` বা equivalent active semantics ব্যবহার করা উচিত। Loading অবস্থায় identity ও navigation shell-এর জন্য accessible status থাকবে; reduced-motion preference সম্মান করতে non-essential transitions বন্ধ বা কমিয়ে দিতে হবে।

## প্রধান ঝুঁকি ও প্রতিকার

| ঝুঁকি | সম্ভাব্য ফল | প্রতিকার |
|---|---|---|
| সব tab-কে live হিসেবে দেখানো | Guardian ভুল expectation তৈরি করবেন | Live/Partial/Soon state ও honest copy |
| Student ID বানিয়ে দেখানো | support identity ও data meaning বিভ্রান্ত হবে | বর্তমান opaque Guardian ID-তেই সীমাবদ্ধ থাকা |
| Sidebar API-তে private fields ফেরত দেওয়া | privacy breach | minimal response DTO, owner-bound queries |
| Attendance আগে বানানো | fictional operational records বা dispute সমস্যা | confirmation ও attendance policy আগে অনুমোদন |
| Phone/email সরাসরি edit করা | account takeover/notification hijack | verification workflow ছাড়া edit disabled |
| Planned tab-এ empty page | trust ও usability কমবে | static explanation, next safe action, support route |
| বড় navigation list mobile-এ overflow | poor discoverability | grouped drawer, short labels, active destination context |
| নতুন table prematurely migrate করা | schema debt ও irreversible data burden | domain approval-এর পর additive migration |

## Recommended implementation sequence

### Phase GNS-01 — Sidebar parity and truthful states

প্রথম ধাপে existing `DashboardLayout` ব্যবহার করে Guardian navigation grouping, identity header, active route semantics, mobile drawer behavior এবং planned-state copy standardize করা হবে। এই phase-এ database migration লাগবে না। Existing Dashboard, Hire a Tutor, Profile, Posted Jobs, Settings এবং How it Works routes preserve করতে হবে।

### Phase GNS-02 — Guardian workspace consistency

দ্বিতীয় ধাপে Dashboard, Posted Jobs এবং Profile-এর section title, back route, loading/error/empty states, support action এবং responsive layout এক ভাষা ও interaction pattern-এ আনা হবে। Existing request ownership, approved-photo rule, password protection এবং private data boundary regression tests দিয়ে সুরক্ষিত রাখতে হবে।

### Phase GNS-03 — Decision-gated domain modules

তৃতীয় ধাপে Attendance, Confirmation Letter, Exclusively Yours এবং Community আলাদা approved specification ছাড়া implement করা যাবে না। প্রত্যেকটির জন্য data contract, authorization matrix, retention policy, audit model এবং acceptance criteria প্রয়োজন।

## Minimum approval decisions before implementation

| Decision | বর্তমান recommendation |
|---|---|
| Guardian identity | Stable opaque Guardian ID দেখাব; Student ID v1-এ নয় |
| Sidebar availability | Sidebar এখনই live; deferred items `Soon` state-এ |
| Attendance | Tutor confirmation ও operational policy ছাড়া নয় |
| Confirmation Letter | Eligibility/issuer/expiry/revocation নির্ধারণের পর |
| Exclusively Yours | Editorial resource/benefit catalog অনুমোদনের পর |
| Guardian Community | Consent, moderation ও reporting rules অনুমোদনের পর |
| Phone update | Verified OTP workflow ছাড়া editable নয় |
| Sidebar data | Owner-bound, privacy-safe, minimal response contract |

## Final recommendation

**Guardian-এর জন্য Tutor-style segmented navigation sidebar যোগ করা উচিত এবং এটি database-wise low-risk।** বর্তমান codebase-এর shared dashboard shell, Guardian route, identity data, request history, moderated photo এবং controlled profile/settings capabilities এই কাজের জন্য যথেষ্ট foundation প্রদান করে। নতুন database migration মূল sidebar-এর জন্য নয়; কেবল Attendance, Confirmation Letter, Benefits/Exclusive content, Community এবং verified contact-change workflow live করার সময় প্রয়োজন হবে।

সুতরাং নিরাপদ implementation scope হবে: **GNS-01-এ sidebar parity + truthful planned states**, এরপর **GNS-02-এ consistency and accessibility**, এবং সব নতুন operational feature-কে **decision-gated domain modules** হিসেবে আলাদা রাখা।

## Evidence base

1. `client/src/components/DashboardLayout.tsx` — shared grouped navigation, mobile behavior, identity slot, planned-state support এবং sign-out handling।
2. `client/src/pages/GuardianDashboard.tsx` — Guardian-specific navigation, section routing এবং live/deferred content mapping।
3. `client/src/pages/GuardianRequestTracking.tsx` — Guardian-owned private request history ও contact/privacy boundary।
4. `drizzle/schema.ts` — `guardian_profiles`, `guardian_profile_update_events`, `guardian_profile_photos` এবং `guardian_profile_photo_events` schema।
5. `server/db.ts` — owner-bound Guardian profile, password, photo persistence/review helpers।
6. `docs/guardian-dashboard-parity-grill-review.md` — পূর্বের approved Guardian workspace review, scope boundary এবং deferred-domain rationale।

**এই review-এর ভিত্তিতে বাস্তবায়নের জন্য minimum approval message:**  
`GNS-01 এবং GNS-02 অনুমোদিত; Attendance, Confirmation Letter, Exclusively Yours এবং Community decision-gated থাকবে; Student ID v1-এ নয়; existing privacy, approved-photo এবং owner-bound authorization rules অপরিবর্তিত থাকবে।`
