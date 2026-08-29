# Tutor Panel Code Review Report

**তারিখ:** 24 August 2026  
**পরিসর:** Tutor password sign-in, portal-session hand-off, Dashboard protection, mobile sidebar, responsive shell, request/redirect loop, runtime evidence এবং identity-data exposure।  
**পরিবর্তন:** এই review-এ কোনো product code পরিবর্তন করা হয়নি।

## Executive summary

Review-এ একটি **critical privacy/security defect**, একটি **confirmed mobile navigation defect**, এবং sign-in দুবার লাগার সঙ্গে সামঞ্জস্যপূর্ণ একটি **high-probability authentication transition race** পাওয়া গেছে। প্রথমটি Tutor Panel-এর বাইরে Guardian/Admin-সহ সব authenticated browser flow-কে প্রভাবিত করতে পারে; তাই এটি অন্য UI polish-এর আগে ঠিক করা উচিত। দ্বিতীয়টি phone-এ Tutor Panel navigation কার্যত অপ্রাপ্য করতে পারে। তৃতীয়টি user-এর reported double-login symptom ব্যাখ্যা করে, তবে বাস্তব account দিয়ে browser-level reproduction দিয়ে root cause নিশ্চিত করা দরকার।

বর্তমান automated suite review সময় **114 test file / 519 test** pass করেছে। এটি regressions কমার একটি ভালো signal, কিন্তু এই report-এর দুই প্রধান flow—প্রথম login transition এবং signed-in mobile drawer—browser-level test দ্বারা এখনো সরাসরি prove করা হয়নি।

| Priority | Finding | Status | User impact | Recommended action |
|---|---|---|---|---|
| P0 | `auth.me` raw identity response private fields browser-এ দিতে পারে | **Confirmed** | Credential hash ও private phone browser/local storage-এ পৌঁছানোর ঝুঁকি | Safe explicit identity projection এবং regression অবিলম্বে যোগ করুন |
| P1 | Tutor mobile sidebar-এর drawer trigger নেই | **Confirmed** | Phone-এ Tutor Panel navigation খোলা যায় না | Tutor mobile header-এ accessible sidebar trigger যোগ করুন |
| P1 | First Tutor login-এর পরে stale/unresolved auth cache redirect race | **Probable; reproduction required** | User-কে দুইবার sign in করতে হতে পারে | Atomic login hand-off ও focused browser regression দিন |
| P2 | Multi-stage protected-route loading smooth নয় | **Confirmed design risk** | Login/Dashboard transition flicker বা uncertain state মনে হতে পারে | Unified auth-bootstrap/loading state করুন |
| P2 | Portal proof renewal প্রতি 20 seconds প্রতি open tab-এ চলে | **Confirmed design trade-off** | Multiple tab-এ avoidable request churn | Document/measure; hidden tab-এ pause করার কথা বিবেচনা করুন |
| P3 | Current logs cumulative; actionable error classification নেই | **Confirmed observability gap** | Historical noise-কে current bug মনে হওয়ার ঝুঁকি | Error taxonomy ও testable telemetry policy দিন |

## Confirmed findings

### P0 — Raw authenticated identity response leaks unnecessary private fields

`auth.me` বর্তমানে request context-এর `ctx.user` সরাসরি return করে। Context-এর user database lookup থেকে আসা full Drizzle user row; schema-তে `passwordHash` এবং `loginPhone`-এর মতো private field আছে। পাশাপাশি `useAuth` identity response browser localStorage-এ `manus-runtime-user-info` key-তে রাখে। অর্থাৎ raw response ফেরত গেলে private identity/credential-derived data browser response ও persistent local storage-এ অপ্রয়োজনীয়ভাবে থাকতে পারে.[1] [2] [3]

> **Risk statement:** Password hash plain password নয়, কিন্তু এটিও browser-এ পাঠানো উচিত নয়। Browser extension, shared device, XSS, support screenshot, debug export বা future client bug-এর impact এতে অপ্রয়োজনীয়ভাবে বেড়ে যায়।

**Corrective design.** একটি single server-side `toClientIdentity(user)` projection তৈরি করুন। শুধু UI-র সত্যিকার প্রয়োজনীয় fields—যেমন `id`, `name`, `role`, approved avatar URL এবং public-safe account flags—return করুন। `passwordHash`, login phone, provider internals, raw database timestamps বা reset/security material return করবেন না। `auth.me`, password login, registration এবং OAuth response একই projection ব্যবহার করবে। Existing `manus-runtime-user-info` clear/migrate করে safe result দিয়ে replace করতে হবে।

**Required acceptance tests.** Response body ও localStorage-এ `passwordHash`/`loginPhone`/session material অনুপস্থিত থাকবে। Login, logout, Guardian, Tutor এবং Admin UI-তে legitimate identity labels অপরিবর্তিত থাকবে।

### P1 — Mobile Tutor sidebar drawer খোলার control অনুপস্থিত

Shared `DashboardLayout`-এ non-Tutor mobile header branch-এ `SidebarTrigger` render হয়। Tutor routes `tutorWorkspaceHeader` দেয়, ফলে `TutorWorkspaceHeader` replace হয়; এতে notification ও account controls আছে, কিন্তু drawer খোলার `SidebarTrigger` নেই। ফলে phone viewport-এ sidebar থাকে, কিন্তু open করার user-facing control পাওয়া যায় না.[4]

**Corrective design.** `TutorWorkspaceHeader`-এর leading area-তে existing `SidebarTrigger` যোগ করুন; এটি icon button হবে, accessible name **“Open Tutor navigation”** দেবে এবং drawer open থাকলে corresponding close state প্রকাশ করবে। Existing profile/account controls ডান পাশে থাকবে। Desktop sidebar behaviour বা Guardian/Admin header পরিবর্তন করা যাবে না।

**Required acceptance tests.** 375px এবং 393px viewport-এ trigger visible হবে; tap/Enter/Space-এ drawer খুলবে; Escape/overlay/close control-এ বন্ধ হবে; focus drawer-এর ভেতরে ব্যবহারযোগ্য থাকবে; 1024px+ viewport-এ duplicate trigger থাকবে না।

### P1 — Double-login symptom-এর সঙ্গে সঙ্গতিপূর্ণ auth hand-off race

Dedicated `TutorLogin` successful password sign-in-এর পর per-tab portal proof store করে, `auth.me` invalidate করে এবং প্রায় সঙ্গে সঙ্গেই `/tutor/dashboard` route-এ যায়। অন্যদিকে Dashboard নিজের `auth.me` cache ও portal proof দুটির উপর নির্ভর করে redirect/protection effects চালায়। Cache unresolved অথবা stale unauthenticated থাকলে Dashboard fresh identity resolve হওয়ার আগেই redirect করতে পারে। এই ordering reported “দুইবার login” symptom-এর সঙ্গে সঙ্গতিপূর্ণ।[5] [6]

এটি static code review-এ **probable** finding; production account দিয়ে one-submit reproduction ছাড়া একে final root cause বলা হচ্ছে না। তবে implementation order-এর কারণে এটিকে P1 হিসেবে treat করা উচিত।

**Corrective design.** Login mutation success-এর পরে safe user identity দিয়ে auth query cache synchronously seed করুন অথবা `await utils.auth.me.fetch()`/equivalent successful refresh শেষ হওয়ার পরে navigation করুন। Dashboard-এ `auth.me` loading অবস্থায় redirect না করে stable shell/skeleton দেখান; only resolved unauthenticated state-এ redirect করবেন। Double submit guard ও existing per-tab proof storage order বজায় থাকবে।

**Required acceptance tests.** একটি valid submit-এ exactly one login request ও one portal proof issue হবে; first navigation Dashboard-এ পৌঁছাবে; stale auth cache থাকলেও proof revoke বা false redirect হবে না; invalid login-এ proof লেখা হবে না; Apply Now safe-return অক্ষত থাকবে।

## Loops, smoothness এবং responsive quality

Static inspection-এ কোনো uncontrolled infinite React effect loop confirm হয়নি। তবে Dashboard proof 60-second TTL বজায় রাখতে `tutor.getDashboardStats` প্রায় 20-second interval-এ refetch করে। এটি intended renewal mechanism হলেও তিনটি active Tutor tab প্রায় প্রতি minute-এ নয়টি renewal-related requests সৃষ্টি করতে পারে। Page hidden হলে refetch pause, visibility change-এ immediate refresh, এবং slow/offline state-এর compact indicator দিলে request churn ও perceived instability কমবে। এটি security fix নয়; P0/P1 সমাধানের পর optimisation হিসেবে রাখা উচিত।

বর্তমান flow-এ login page, `useAuth`, Dashboard proof gate এবং portal exit coordinator—একাধিক layer route decision নেয়। এই layered model নিরাপত্তার জন্য প্রয়োজনীয়, কিন্তু loading state একীভূত না হলে white flash, temporary wrong page বা “login again” perception তৈরি হতে পারে। Proposed fix হলো one explicit **auth bootstrap** state: `checking identity`, `opening Tutor panel`, `authenticated`, `unauthenticated`, `portal-proof-missing`। User-visible feedback সংক্ষিপ্ত English-first থাকবে, যেমন **“Opening your Tutor Dashboard…”**; state resolve হওয়ার আগে redirect করা হবে না।

Job Board, Tutor profile, Apply Now safe-return, global explicit sign-out এবং same-tab public-route exit এই review-এ পরিবর্তনের প্রস্তাব নয়। Login-race fix-এ এগুলোর regression test বাধ্যতামূলক।

## Runtime and test evidence

Review-time suite **114/114 test files এবং 519/519 tests** pass করেছে। Recent development logs-এ accumulated browser/server `ERROR` count পাওয়া গেছে, কিন্তু এগুলোর বড় অংশ historical HMR, capture abort অথবা development tooling noise; timestamp/source classification ছাড়া এগুলোকে current production failure বলা যায় না। তাই error count alone দিয়ে severity নির্ধারণ করা হয়নি।

Signed-in Tutor browser session ছাড়া actual mobile drawer এবং first-login path capture করা যায়নি। Source inspection mobile issue confirm করেছে; double-login finding-এর জন্য real account reproduction এখনো প্রয়োজন। এই limitation report-এর recommendation-এ প্রতিফলিত হয়েছে।

## Prioritised remediation plan

| Release | Scope | Definition of done |
|---|---|---|
| **Emergency patch** | Sanitize all client identity responses and clear/migrate unsafe cached identity data | No private credential/contact field in API response, React cache or localStorage; server/client regressions pass |
| **P1 UX patch** | Restore Tutor mobile drawer trigger and make Dashboard auth hand-off atomic | Phone navigation works; a first valid sign-in lands on Dashboard in one attempt; dirty Profile and global sign-out pass |
| **P2 resilience patch** | Unified auth loading state, page-visibility-aware proof renewal, typed error handling | No false redirect during auth loading; reduced background traffic; observable errors distinguish expected aborts from failures |
| **P3 hardening** | Add browser-level flow matrix and production-safe telemetry | Cross-tab sign-out, refresh, first login, mobile drawer and public-tab isolation are exercised in browser tests |

## Recommended implementation tickets

1. **TPR-SEC-01 — Safe identity boundary.** Introduce a typed client identity DTO; replace every raw `users` response; delete unsafe browser cache values; add response-shape and localStorage regressions.
2. **TPR-MOB-02 — Tutor mobile navigation.** Add the shared drawer trigger to Tutor header; add 375px/393px interaction tests and visual checks.
3. **TPR-AUTH-03 — Atomic Tutor login hand-off.** Reproduce the initial-login race, then fix cache/navigation ordering with an explicit stable loading state; protect Apply Now safe-return and portal-session semantics.
4. **TPR-PERF-04 — Renewal and observability.** Pause renewal while hidden, resume safely, and classify expected request aborts separately from actionable errors.

## Conclusion

The immediate engineering priority is not visual polish: **ship the safe identity projection first**. Once the P0 boundary is fixed, restore mobile navigation and resolve the first-login hand-off. Only then should renewal optimisation and secondary animation polishing proceed. This order protects private data, addresses the reported phone blocker, and reduces the chance of masking a real login race with cosmetic changes.

## References

[1]: `server/routers.ts` — `auth.me` currently returns `opts.ctx.user` directly.

[2]: `server/_core/context.ts` and `server/_core/sdk.ts` — authenticated context derives from the database user record.

[3]: `drizzle/schema.ts` and `client/src/_core/hooks/useAuth.ts` — private user columns exist and auth identity is cached in browser localStorage.

[4]: `client/src/components/DashboardLayout.tsx` — non-Tutor branch owns `SidebarTrigger`; Tutor workspace header replaces that branch without a trigger.

[5]: `client/src/pages/TutorLogin.tsx` — password login stores proof, invalidates identity cache and navigates to Dashboard.

[6]: `client/src/pages/TutorDashboard.tsx` — Dashboard independently gates rendering/redirects on identity and portal proof.
