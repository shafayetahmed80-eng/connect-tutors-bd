# Connect Tutors BD: Full-Stack Development Roadmap ও Master Checklist

**প্রস্তুতকারক:** Manus AI  
**প্রকল্প:** Connecttutorsbd.com  
**প্রস্তুতির তারিখ:** ১৬ আগস্ট ২০২৬  
**উদ্দেশ্য:** বর্তমান স্থানীয় React prototype-কে ধাপে ধাপে একটি নিরাপদ, পরিচালনাযোগ্য এবং production-ready tutor marketplace-এ রূপান্তর করা।

> এই নথিটি কাজের পরিকল্পনা; এটি কোনো production deployment নয়। প্রতিটি phase শেষ হওয়ার পরে পরীক্ষা, backup এবং অনুমোদন ছাড়া পরের phase শুরু করা উচিত নয়।

---

## 1. Executive Summary

Connect Tutors BD-এর public-facing design, homepage, navigation, tutor-request UI এবং tutor onboarding intro ইতোমধ্যে তৈরি হয়েছে। বর্তমান project-টি মূলত একটি **static React/Vite frontend prototype**। অর্থাৎ visitor screen-এ form পূরণ করতে পারলেও data database-এ জমা হয় না; tutor listing, tutor profile, real login, dashboard, admin moderation এবং notification system এখনও তৈরি হয়নি।

পূর্ণাঙ্গ সাইটে চারটি আলাদা user journey থাকবে: **Guest**, **Guardian/Student**, **Tutor**, এবং **Admin**। প্রথমে tutor catalogue ও real guardian request চালু করা সবচেয়ে বাস্তবসম্মত; এরপর tutor account/profile, matching workflow, admin dashboard এবং notification system যুক্ত হবে।

| বিষয় | বর্তমান অবস্থা | Full-stack সম্পন্ন হলে লক্ষ্য |
|---|---|---|
| Public homepage | সম্পন্ন, static | SEO-ready public landing page |
| Tutor request | UI demo; data browser memory-তে থাকে | Validation, database save, admin review, notification |
| Tutor signup | Intro page মাত্র | Account creation, profile wizard, document upload, review |
| Tutor listing | `/tutors` একটি generic info page | Search, filter, pagination, public tutor cards |
| Tutor profile | নেই | Personal, Education, Tuition Preferences, verification status |
| Authentication | Login button placeholder | Guardian, tutor, admin role-based login/logout |
| Backend/API | Static Express entry; product API নেই | Typed API, access rules, server-side validation |
| Database | শুধু base `users` schema | Marketplace data model, migrations, backup plan |
| Admin workflow | নেই | Tutor verification, request assignment, moderation, reporting |
| Notification | Placeholder chat/call action | Email/WhatsApp status notification with delivery log |

---

## 2. বর্তমান Project Analysis

বর্তমান routing-এ homepage, request, tutor-join এবং কিছু info page আছে। কিন্তু `/tutors`, `/blogs`, `/events`, `/contact` ইত্যাদি বাস্তব feature page নয়; একই generic content page ব্যবহার করছে। [`client/src/App.tsx`](client/src/App.tsx) এবং [`client/src/pages/InfoPage.tsx`](client/src/pages/InfoPage.tsx) এই অবস্থাটি দেখায়।

Tutor request page-এ দুই-step form, subject, budget, location এবং tutor preference input আছে; submit করলে কেবল browser-এর `submitted` state পরিবর্তিত হয়। এখানে কোনো backend call, input validation, database insert বা notification নেই। [`client/src/pages/TutorRequest.tsx`](client/src/pages/TutorRequest.tsx) তাই full-stack conversion-এর প্রথম প্রধান target।

Database layer-এ বর্তমানে শুধু basic `users` table আছে এবং backend router-এ basic authentication status ও logout ছাড়া product procedure নেই। [`drizzle/schema.ts`](drizzle/schema.ts) এবং [`server/routers.ts`](server/routers.ts) ভবিষ্যৎ feature extension-এর ভিত্তি হিসেবে ব্যবহার করা যাবে, তবে marketplace schema ও API নতুন করে যোগ করতে হবে।

| বিদ্যমান শক্তি | Full-stack gap | অগ্রাধিকার |
|---|---|---|
| React, TypeScript, Tailwind এবং responsive UI প্রস্তুত | Public tutor data নেই | অতি উচ্চ |
| MySQL, Drizzle, Express, tRPC packages present | API এখনো runtime-এ যুক্ত নয় | অতি উচ্চ |
| Tutor request form-এর UX প্রস্তুত | Submission, validation, audit trail নেই | অতি উচ্চ |
| Header/footer ও key routes আছে | Login placeholder এবং protected route নেই | অতি উচ্চ |
| Logo, branding এবং English copy প্রস্তুত | বাস্তব contact/social details বসানো হয়নি | উচ্চ |

---

## 3. অনুমোদিত Target Architecture

### 3.1 প্রস্তাবিত প্রযুক্তি কাঠামো

বর্তমান codebase অনুযায়ী একটি একক TypeScript application রাখা সবচেয়ে সুশৃঙ্খল সমাধান। React/Vite browser UI দেখাবে; Express server API চালাবে; tRPC UI ও server-এর typed communication দেবে; Drizzle ORM MySQL database-এর schema ও query পরিচালনা করবে। এই architecture-এ একই language ও type system ব্যবহার হওয়ায় data mismatch কমে।

```text
Browser
  └─ React + TypeScript + Tailwind + React Hook Form
       └─ tRPC client
            └─ Express / tRPC server
                 ├─ Zod validation + role checks
                 ├─ Drizzle ORM
                 │    └─ MySQL (XAMPP locally; managed MySQL in production)
                 ├─ Object storage (profile photos/documents)
                 └─ Email / WhatsApp provider
```

| Layer | দায়িত্ব | বর্তমান codebase-এ অবস্থান |
|---|---|---|
| Frontend | Page, form, search/filter, dashboard UI | `client/src/pages`, `client/src/components` |
| Routing | Public/protected page navigation | `client/src/App.tsx` |
| Server/API | Business rules, access control, validation | `server/routers.ts`, `server/routers/*` |
| Database access | Reusable Drizzle queries | `server/db.ts` |
| Schema/migration | Tables, indexes, relationships, migrations | `drizzle/schema.ts`, `drizzle/migrations` |
| Authentication | Session/JWT/cookie, current user, role enforcement | `server/_core` plus a chosen production auth design |
| Storage | Profile photo, CV, NID/ID or certificate (if required) | S3-compatible object storage, never DB BLOB |
| Notifications | Email/WhatsApp job status and delivery log | Dedicated service/provider wrapper |

### 3.2 XAMPP-এর সঠিক ভূমিকা

XAMPP ব্যবহার করা যাবে **লোকাল MySQL database** চালানোর জন্য। তবে React/Vite/Express application Apache দিয়ে চালানোর দরকার নেই; `pnpm dev` local Node development server চালাবে। ফলে local development-এ Apache optional, MySQL প্রয়োজন হলে XAMPP MySQL চালু থাকবে, এবং project আলাদা Command Prompt-এ চলবে।

| Local service | চালানোর উপায় | সাধারণ port | উদ্দেশ্য |
|---|---|---:|---|
| React/Node app | `pnpm dev` | `3000` | Website ও API development |
| MySQL | XAMPP Control Panel থেকে MySQL Start | `3306` | Local database |
| phpMyAdmin | XAMPP Apache চালু থাকলে | `80` | Database দেখা/পরিচালনা; application runtime নয় |

### 3.3 Hosting সিদ্ধান্ত

Production-এ এই app-এর জন্য এমন hosting প্রয়োজন যেটি **Node.js application এবং MySQL** চালাতে পারে। সাধারণ static/PHP-only shared hosting Express server চালানোর জন্য যথেষ্ট নয়, যদি না provider আলাদাভাবে Node support দেয়। Manus-এর built-in hosting এবং custom-domain support এই stack-এর সঙ্গে ব্যবহার করা যায়; external hosting নিতে চাইলে Node runtime, environment secrets, database SSL, backup এবং logs সমর্থন আগে যাচাই করতে হবে।

---

## 4. Product Scope এবং User Roles

### 4.1 User roles

| Role | কী করতে পারবে | কী দেখতে পারবে না |
|---|---|---|
| Guest | Tutor search, public profile, tutor request শুরু, registration | Contact data/owner-only dashboard |
| Guardian/Student | Account, tutor request, shortlisting, request status, messages | অন্য guardian-এর request, tutor moderation |
| Tutor | Account, editable profile, tuition preferences, availability, job response | অন্য tutor-এর private data, admin controls |
| Admin | Tutor verification, request moderation, matching, user management, reports, content management | System secrets/hosting credentials in normal UI |

> **Authentication** পরিচয় যাচাই করে; **authorization** নির্ধারণ করে কোন role কোন resource ব্যবহার করতে পারবে। প্রত্যেক server procedure-এ দুইটি বিষয়ই enforce করতে হবে—শুধু frontend menu লুকানো যথেষ্ট নয়।

### 4.2 Functional modules

| Module | MVP-তে প্রয়োজন | পরবর্তী উন্নয়ন |
|---|---|---|
| Tutor catalogue | Search, filter, verified badge, pagination | Saved search, sort by relevance/distance |
| Tutor public profile | Bio, education, subjects, class range, area, tuition mode | Availability calendar, review policy (বাস্তব review ছাড়া নয়) |
| Guardian request | Multi-step validation, save, acknowledgement | Draft save, preferred call time, duplicate detection |
| Tutor onboarding | Account + profile wizard + photo | Document upload and admin verification |
| Guardian dashboard | Request list and status | Shortlist, matching score, message history |
| Tutor dashboard | Profile completion and job leads | Availability, response analytics |
| Admin dashboard | Review queue, request assignment, tutor status | Reports, content manager, operational audit |
| Notification | Request received and status update | WhatsApp templates, retry queue, delivery analytics |

---

## 5. Recommended Database Design

### 5.1 Database design principles

প্রতিটি table-এর primary key, foreign key, created/updated timestamp এবং প্রয়োজনীয় index থাকতে হবে। `email`, mobile number, passwords, document URL এবং status history-এর মতো sensitive/business-critical field আলাদা করে চিন্তা করতে হবে। সরাসরি form input দিয়ে SQL তৈরি করা যাবে না; Drizzle query builder এবং server-side Zod validation ব্যবহার করতে হবে।

সময় database-এ UTC ভিত্তিতে রাখা এবং screen-এ Bangladesh local time দেখানো উচিত। এটি timezone mismatch ও report confusion কমায়। User-generated file database BLOB-এ নয়, object storage-এ থাকবে; database-এ কেবল file key, URL, type এবং verification metadata থাকবে।

### 5.2 Core table map

| Table | মূল তথ্য | গুরুত্বপূর্ণ সম্পর্ক |
|---|---|---|
| `users` | identity, email/mobile, auth metadata, global role | এক user-এর guardian বা tutor profile হতে পারে |
| `guardian_profiles` | name, phone, area, preferred contact | `users.id` → `guardian_profiles.user_id` |
| `tutor_profiles` | public bio, gender, area, status, profile photo, verified state | `users.id` → `tutor_profiles.user_id` |
| `tutor_education` | institute, degree, subject, year, result | `tutor_profiles.id` → education rows |
| `tutor_preferences` | subjects, class range, tuition mode, area, expected fees | `tutor_profiles.id` → preference rows |
| `tutor_availability` | day/time, online/home availability | `tutor_profiles.id` → availability rows |
| `tutor_documents` | CV, certificate, ID verification metadata | private; admin/tutor access only |
| `tuition_requests` | guardian need, category, budget, area, status | guardian owner and optional assigned tutor |
| `request_subjects` | multiple subjects per request | `tuition_requests.id` → subject rows |
| `shortlists` | guardian saved tutor list | guardian ↔ tutor relationship |
| `matches` | admin/system matching and outcome | request ↔ tutor relationship |
| `messages` | controlled conversation/audit record | request/match ↔ participant |
| `notifications` | event, channel, recipient, delivery state | user/request context |
| `admin_audit_logs` | moderator activity | admin user ↔ affected resource |
| `content_pages` | blog/event/legal CMS content (optional) | admin-owned content |

### 5.3 Essential controlled status values

| Entity | Suggested status values |
|---|---|
| Tutor | `draft`, `submitted`, `under_review`, `verified`, `rejected`, `suspended` |
| Tuition request | `draft`, `submitted`, `reviewing`, `matching`, `matched`, `closed`, `cancelled` |
| Match | `suggested`, `contacted`, `accepted`, `declined`, `completed`, `expired` |
| Notification | `queued`, `sent`, `delivered`, `failed` |

ব্যবসার নিয়ম code-এ ছড়িয়ে না দিয়ে status transition-কে একটি পরিষ্কার service/procedure-এ রাখতে হবে। যেমন `verified` tutor-ই public list-এ দেখা যাবে; request owner বা admin ছাড়া কোনো guardian request দেখতে পারবে না।

---

## 6. Build Sequence: কোন কাজ আগে হবে

### Phase 0 — Foundation and Decision Lock

এই phase-এ code feature না লিখে business decisions, contact details, workflow এবং security boundary ঠিক করতে হবে। Login strategy নিয়ে সিদ্ধান্ত সবচেয়ে গুরুত্বপূর্ণ: email/password, magic link, Google login, phone OTP অথবা তাদের সমন্বয়। Phone OTP/WhatsApp API বাস্তবায়নে provider account, approved template এবং usage cost বিবেচনা করতে হবে।

**Exit criterion:** role, verification policy, tutor visibility policy, real contact details, service area এবং launch MVP written approval।

### Phase 1 — Data Model and Backend Activation

`users` table-এর সঙ্গে marketplace tables যোগ করতে হবে। প্রতিটি schema change-এর জন্য migration generate, review, local database apply, rollback plan এবং test data policy রাখতে হবে। Product routers (`tutors`, `requests`, `profiles`, `admin`) ছোট ছোট file-এ ভাগ করতে হবে। একটি feature-এর normal flow হবে: **schema → migration → DB helper → validated server procedure → UI query/mutation → test**।

**Exit criterion:** local MySQL connection working; real tutor/request records manually create/read/update করা যাচ্ছে; unauthorized call blocked।

### Phase 2 — Public Tutor Discovery

এই phase-এ `/tutors` একটি real listing page হবে। Search text, district/area, subject, class, gender preference, tuition type এবং verification filters থাকবে। Backend-এ pagination, stable sorting ও indexes লাগবে; frontend-এ loading, empty, error ও mobile states থাকবে। `/tutors/:slug-or-id` route-এ public profile দেখাবে, তবে phone, address, ID document বা private contact প্রকাশ হবে না।

**Exit criterion:** verified tutor records database থেকে আসে; filter correct result দেয়; private fields API response-এ নেই।

### Phase 3 — Guardian Request and Request Workflow

বর্তমান demo form-কে React Hook Form + Zod client/server validation-এ রূপান্তর করতে হবে। Submission success হলে request ID তৈরি হবে, acknowledgement page দেখাবে এবং guardian dashboard-এ request দেখা যাবে। Duplicate request detection, consent checkbox, budget/area validation এবং rate limiting রাখতে হবে।

**Exit criterion:** actual request database-এ saved; admin review queue-তে দেখা যায়; guardian শুধুমাত্র নিজের request দেখতে পারে।

### Phase 4 — Tutor Onboarding and Verification

Tutor-কে account তৈরি করে একটি multi-step profile wizard সম্পন্ন করতে হবে: identity/contact, photo, education, subjects/classes, tuition modes, locations, fees, availability ও declarations। Document upload থাকলে private storage, allowed file types/size, malware scanning provider policy এবং admin approval প্রয়োজন। Public listing কেবল `verified` status-এর পরে হবে।

**Exit criterion:** tutor profile draft থেকে review-তে পাঠাতে পারে; admin verify/reject করতে পারে; only verified profile public।

### Phase 5 — Role-based Dashboards

Guardian dashboard-এ request status, shortlist ও message/notification history থাকবে। Tutor dashboard-এ profile completion, verification status, availability এবং permitted job matches থাকবে। Admin dashboard-এ tutor verification queue, request assignment, user lookup, audit log ও report থাকবে। Admin UI-তে reusable `DashboardLayout` ব্যবহার করা উচিত; public website-এ নয়।

**Exit criterion:** permission tests প্রমাণ করে যে guardian, tutor ও admin একে অপরের private view/API access করতে পারে না।

### Phase 6 — Notification and Matching Operations

প্রথমে email notification দিয়ে শুরু করা ভালো: request acknowledgement, profile status, match assignment এবং password/reset event। WhatsApp ব্যবহারের আগে official provider account, opt-in consent, approved templates, retry rules ও delivery logging থাকতে হবে। Notification send হওয়ার সঙ্গে সঙ্গে UI response আটকে রাখা যাবে না; failed notification-এর পুনঃচেষ্টা ও manual admin action রাখতে হবে।

**Exit criterion:** test recipient-এ email reliably যায়; failure logged; duplicate notification নেই।

### Phase 7 — Quality, Security, SEO and Launch

Production readiness মানে শুধু UI সুন্দর হওয়া নয়। এটি include করে accessible forms, mobile testing, automated tests, 404/error pages, secure secrets, backups, monitoring, analytics consent, privacy/terms, sitemap, metadata, SSL এবং incident plan। Vite-এর `VITE_*` variables browser bundle-এ চলে যেতে পারে—এ কারণে database password, API secret বা WhatsApp token কখনো `VITE_*` variable-এ রাখা যাবে না। [1]

**Exit criterion:** deployment checklist-এর সব critical item complete; staging acceptance passed; backup restore trial completed।

---

## 7. Development Workflow: প্রতিটি Feature কীভাবে তৈরি হবে

প্রত্যেক নতুন full-stack feature-এর আগে user story এবং acceptance criteria লিখতে হবে। উদাহরণ: “Guardian হিসেবে আমি Math tutor খুঁজতে পারব, subject এবং area filter ব্যবহার করে, যাতে আমার উপযোগী verified tutor shortlist করতে পারি।” তারপর নিচের sequence অনুসরণ করতে হবে।

| Step | কাজ | যাচাই |
|---:|---|---|
| 1 | User story, screen flow ও fields নির্ধারণ | Admin/owner approval |
| 2 | Zod input schema এবং database table design | Required/optional field স্পষ্ট |
| 3 | Drizzle schema ও migration তৈরি | Migration review, backup consideration |
| 4 | DB helper এবং tRPC procedure তৈরি | Auth/role/server validation |
| 5 | Page/component এবং typed query/mutation যোগ | Loading/empty/error/success UI |
| 6 | Unit/integration test লিখুন | Valid ও invalid path cover |
| 7 | Browser/manual test করুন | Desktop, mobile, keyboard flow |
| 8 | `pnpm check`, test, build চালান | No TypeScript/build error |
| 9 | Git commit এবং concise changelog | Rollback point available |

বর্তমান project-এ `pnpm dev`, `pnpm check`, `pnpm build` এবং `pnpm start` scripts আছে। Automated test script production phase-এর আগে package scripts-এ যোগ করতে হবে, যদিও Vitest dependency ইতোমধ্যে আছে। Database migration configuration-ও actual MySQL connection অনুযায়ী verify করতে হবে। Drizzle Kit configuration schema location, output folder এবং database credentials নির্ধারণে ব্যবহৃত হয়। [2]

---

## 8. Local Development Checklist

### 8.1 First-time setup

- [ ] Node.js LTS, Git এবং pnpm installed আছে।
- [ ] Project `C:\Projects\connect-tutors-bd` folder-এ আছে।
- [ ] `pnpm install` সফলভাবে সম্পন্ন।
- [ ] `.env`/local secrets কখনো Git-এ commit হবে না।
- [ ] `pnpm dev` চালিয়ে `http://localhost:3000/` browser-এ খোলে।
- [ ] Database কাজ শুরুর আগে XAMPP MySQL running এবং port `3306` conflict-free।
- [ ] Development database আলাদা; production database locally ব্যবহার করা হচ্ছে না।

### 8.2 Daily working routine

- [ ] Command Prompt-এ project folder থেকে `pnpm dev` চালু রাখুন।
- [ ] Notepad++ অথবা VS Code-এ সংশ্লিষ্ট `.tsx` file edit করুন।
- [ ] Save করলে browser auto-refresh হয়েছে কি না দেখুন।
- [ ] Feature শেষ হলে `pnpm check` চালান।
- [ ] New backend/database work হলে relevant test চালান।
- [ ] দিনের শেষে code Git-এ commit করুন, meaningful message দিয়ে।
- [ ] জরুরি পরিবর্তনের আগে database export/backup নিন।

### 8.3 Local commands

```cmd
cd /d C:\Projects\connect-tutors-bd
pnpm dev
```

```cmd
pnpm check
pnpm build
pnpm start
```

`pnpm dev` development-এর জন্য। `pnpm build` production build তৈরি করে। `pnpm start` build-এর পরে production-style server চালানোর জন্য; live website হিসেবে ব্যবহার করার আগে environment variables ও database connection ঠিক করতে হবে।

---

## 9. Security and Privacy Checklist

Tutor marketplace-এ mobile number, education, location, identity document এবং guardian request-এর মতো sensitive data থাকতে পারে। তাই security launch-এর পরের কাজ নয়; প্রথম data collection phase থেকেই এটি implement করতে হবে।

| বিষয় | Minimum control |
|---|---|
| Login | Rate limit, generic error message, secure session cookie, logout-all/revocation plan |
| Password | Strong hashing library, length policy, breached/common password blocklist, reset-token expiry |
| Role access | Server-side protected/admin procedure; frontend hide করা যথেষ্ট নয় |
| Input | Zod validation; length, enum, email/mobile, file type and size checks |
| Database | Parameterized ORM query; least-privilege DB user; automated backup |
| File upload | Private storage by default; signed URL; allowed MIME/size; no executable file |
| Secrets | Server-only environment variables; `.env` in `.gitignore`; secret rotation record |
| Browser security | HTTPS, secure/httpOnly cookie, CSRF strategy, security headers |
| Data visibility | Tutor phone/address/ID documents never public by default |
| Audit | Admin verification, rejection, assignment এবং sensitive change audit log |
| Abuse control | Request spam rate limiting, CAPTCHA after risk threshold, report/block path |
| Privacy | Consent text, privacy policy, data retention/deletion contact, support procedure |

OWASP-এর authentication guidance অনুসারে password policy, common/breached password blocklist এবং secure session handling গুরুত্বপূর্ণ control। [3]

---

## 10. Testing and Acceptance Checklist

### 10.1 Automated tests

- [ ] Validation schema test: valid/invalid request, tutor profile, filters।
- [ ] Permission test: guardian অন্য guardian-এর request access করতে পারে না।
- [ ] Permission test: unverified tutor public API-তে আসে না।
- [ ] API test: pagination/filter/sort stable result দেয়।
- [ ] API test: duplicate/invalid request safely rejected।
- [ ] Notification test: event once trigger হলে duplicate send হয় না।
- [ ] Database migration test: empty database থেকে migration apply করা যায়।
- [ ] Regression test: login/logout ও role redirect।

### 10.2 Manual QA

- [ ] Chrome, Edge এবং Android Chrome-এ mobile layout পরীক্ষা।
- [ ] Slow network-এ loading, error এবং retry UI পরীক্ষা।
- [ ] Keyboard-only navigation ও visible focus test।
- [ ] Required form field, invalid data, back button এবং refresh behavior পরীক্ষা।
- [ ] Tutor profile-এ কোনো private document/phone accidentally দেখা যাচ্ছে না।
- [ ] Admin action audit log-এ যাচ্ছে।
- [ ] Email/WhatsApp test recipient-এ expected copy পেয়েছে।

### 10.3 Release gate

- [ ] `pnpm check` successful।
- [ ] Automated tests successful।
- [ ] `pnpm build` successful।
- [ ] Production environment secrets set; secrets source code-এ নেই।
- [ ] Database backup ও restore test completed।
- [ ] Privacy Policy, Terms, Contact এবং support information final।
- [ ] Real phone, address, email, Facebook/WhatsApp links updated।
- [ ] Error monitoring, basic analytics এবং uptime check available।
- [ ] Domain, HTTPS এবং email sender domain verified।

---

## 11. Deployment and Operations Plan

### 11.1 Environments

| Environment | উদ্দেশ্য | Data policy |
|---|---|---|
| Local | নিজের computer-এ development | Fake/test-only data |
| Staging | Real hosting-এর মতো test environment | Sanitized test data; no customer production data |
| Production | Live visitors | Backup, least privilege, audit, monitored changes |

Staging ছাড়া সরাসরি live database-এ schema change দেওয়া উচিত নয়। প্রথমে local migration, তারপর staging, এরপর maintenance/rollback plan সহ production migration করতে হবে।

### 11.2 Database backup policy

- [ ] দৈনিক automated database backup।
- [ ] Backup encryption এবং restricted access।
- [ ] কমপক্ষে মাসে একবার restore test।
- [ ] Document/media storage-এর জন্য আলাদা backup/retention plan।
- [ ] Schema migration history version control-এ রাখা।
- [ ] User-request deletion বা data correction request handling policy।

### 11.3 Operational dashboard requirements

Admin dashboard-এ অন্তত আজকের new request, pending tutor verification, failed notification, unresolved support request এবং last backup status দেখা দরকার। কোনো real customer review, rating বা testimonial manually create/seed করা যাবে না; user-generated feedback feature চালু হলে সেটি genuine submission, moderation এবং disclosure সহ implement করতে হবে।

---

## 12. MVP Definition এবং Future Scope

### MVP: Launch-এর জন্য যথেষ্ট

| Include | কেন প্রয়োজন |
|---|---|
| Public tutor listing + verified profile | Visitor tutor খুঁজতে পারবে |
| Guardian registration/login | Request owner শনাক্ত হবে |
| Database-backed tutor request | Business operation শুরু হবে |
| Tutor registration/profile + admin verification | Supply side নিয়ন্ত্রিত হবে |
| Guardian/tutor/admin role rules | Private data সুরক্ষিত থাকবে |
| Admin matching/review queue | Manual operations সম্ভব হবে |
| Email acknowledgement/status update | User communication শুরু হবে |
| Privacy/terms/contact + backups | Minimum operational readiness |

### Post-MVP: পরে যোগ করা যাবে

| Feature | শর্ত |
|---|---|
| WhatsApp automated messages | Official API/provider, opt-in, template approval, budget |
| In-app chat | Abuse reporting, moderation, notification, retention policy |
| Tutor availability calendar | Clear timezone and booking rules |
| Online payment/commission | Legal/tax policy, payment provider, refunds workflow |
| Live classes/video | Vendor selection, privacy, bandwidth/cost analysis |
| Reviews/ratings | Genuine review source, moderation, anti-fraud controls |
| AI tutor matching | Enough trustworthy profile/request data and human oversight |
| Blog/event CMS | Content ownership, editor roles, SEO workflow |

---

## 13. First Sprint: এখনই যে কাজ শুরু করা উচিত

প্রথম sprint-এর লক্ষ্য হবে **Tutor Listing + Tutor Public Profile + Local Database Foundation**। এই কাজটি করলে static site থেকে real marketplace-এর দিকে সবচেয়ে গুরুত্বপূর্ণ অগ্রগতি হবে এবং পরের request/matching/dashboard কাজগুলো একই data model ব্যবহার করতে পারবে।

### Sprint 1 deliverables

- [ ] MySQL development database তৈরি: `connect_tutors_dev`।
- [ ] Database connection secrets local-only ভাবে configure।
- [ ] `tutor_profiles`, `tutor_education`, `tutor_preferences` এবং required lookup tables schema design।
- [ ] Migration generate, review এবং local DB-তে apply।
- [ ] Minimal verified tutor records manually add করার admin-safe development method।
- [ ] `tutors.list` এবং `tutors.getBySlug` typed server procedure।
- [ ] `/tutors` real listing page with search/filter/pagination।
- [ ] `/tutors/:slug` public tutor profile page।
- [ ] Loading/empty/error states এবং mobile responsive check।
- [ ] Unit/API tests, `pnpm check`, production build।

### Owner decisions needed before Sprint 1

1. Connect Tutors BD কোন কোন city/area দিয়ে শুরু করবে?
2. Tutor profile-এ কোন তথ্য public হবে—name, photo, institution, district, subject, fee range?
3. Phone number public হবে, নাকি request/matching-এর পরে controlled contact হবে?
4. Tutor verification-এর minimum document/criteria কী হবে?
5. প্রথম launch-এ tuition type: home, online, না দুটোই?
6. Student/guardian account email দিয়ে হবে, phone দিয়ে হবে, নাকি দুটোই?

---

## 14. Final Master Checklist

### Product and content

- [ ] Brand/contact/social/legal information final।
- [ ] Public pages are complete; placeholder pages removed or labelled unavailable।
- [ ] Tutor verification and privacy rules approved।
- [ ] No fabricated reviews, ratings or testimonials।

### Backend and database

- [ ] Production auth strategy selected and implemented।
- [ ] Role model selected: guardian, tutor, admin।
- [ ] Schema, migrations, indexes এবং database backups verified।
- [ ] Every mutation has server-side validation and authorization।
- [ ] Private/public data fields explicitly separated।
- [ ] Notification delivery log exists।

### Frontend

- [ ] Tutor listing and profile are database-backed।
- [ ] Guardian and tutor forms have visible validation/errors।
- [ ] All dashboard routes have access control and exit navigation।
- [ ] Responsive, accessible and loading/error states completed।

### Security and launch

- [ ] Secrets do not exist in frontend variables or Git history।
- [ ] SSL/HTTPS and secure cookies configured।
- [ ] Rate limit and anti-spam controls enabled।
- [ ] Backup and restore tested।
- [ ] Monitoring/error logging enabled।
- [ ] Staging acceptance and production launch approval completed।

---

## References

[1]: https://vite.dev/guide/env-and-mode "Vite — Env Variables and Modes"
[2]: https://orm.drizzle.team/docs/drizzle-config-file "Drizzle ORM — drizzle.config.ts"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html "OWASP — Authentication Cheat Sheet"
