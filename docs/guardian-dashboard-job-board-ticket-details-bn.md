# Guardian Dashboard ও Shared Job Board
## টিকিটের বিস্তারিত ব্যাখ্যা ও সুপারিশ

### নথির উদ্দেশ্য

এই নথিতে Guardian Dashboard, Guardian-এর Hire a Tutor journey, Admin-mediated publication workflow, এবং public/Tutor Job Board-এর জন্য তৈরি করা ticket package সহজ ভাষায় ব্যাখ্যা করা হয়েছে। এটি **implementation plan**, production implementation নয়। Database migration, public job publishing, Guardian contact access, এবং Admin permissions পরিবর্তনের আগে সংশ্লিষ্ট সিদ্ধান্তগুলো অনুমোদন করতে হবে।

## আমার প্রধান সুপারিশ

> **প্রথমে UI নয়—প্রথমে data lifecycle এবং privacy foundation তৈরি করা উচিত।**

বর্তমান সিস্টেমে Guardian request এবং Tutor matching lifecycle আছে, কিন্তু আলাদা published tuition-job lifecycle নেই। তাই existing request status-কে সরাসরি Job Board-এর publication status হিসেবে ব্যবহার করা নিরাপদ হবে না। আমার সুপারিশ হলো:

1. Guardian request-কে private source record হিসেবে রাখা।
2. Admin approval-এর পরে একটি আলাদা `tuition_jobs` projection তৈরি করা।
3. Public এবং Tutor Job Board-এ raw Guardian request না পাঠিয়ে privacy-safe read model ফেরত দেওয়া।
4. Admin edit, publish, unpublish, close, manual Job ID এবং audited contact lookup-এর জন্য append-only audit event রাখা।
5. Guardian dashboard-এর unavailable sections-এ fake data না দেখিয়ে truthful “Coming soon” বা empty state ব্যবহার করা।

## Priority summary

| Priority | Ticket group | কেন আগে |
|---|---|---|
| P0 — বাধ্যতামূলক foundation | GD-01, JB-01, JB-02 | Identity, lifecycle, schema, publication এবং privacy contract না থাকলে পরের UI নিরাপদভাবে তৈরি করা যাবে না। |
| P1 — প্রথম release | GD-02, GR-01, GR-02, AD-01, JB-03 | Guardian request থেকে Admin approval হয়ে public/Tutor Job Board-এ safe job প্রকাশের সম্পূর্ণ vertical slice তৈরি করবে। |
| P1 — bounded follow-up | GD-03, GD-04, JB-04 | Guardian-এর own posted jobs, profile/settings, এবং safe direction/share flow সম্পূর্ণ করবে। |
| P2 — decision-gated | GD-05 | Attendance, Confirmation Letter, Exclusively Yours এবং Community-এর data contract এখনও নির্ধারিত নয়। |
| Release gate | QA-01 | সব role, privacy, mobile, migration এবং production validation একত্রে যাচাই করবে। |

# টিকিটগুলোর বিস্তারিত

## GD-01 — Guardian identity, Student model, route ও navigation contract

### কী কাজ হবে

এখানে Guardian Dashboard-এর মূল কাঠামো এবং পরিচয় সংক্রান্ত সিদ্ধান্ত নির্ধারণ হবে। Header-এ Guardian-এর নাম, email, profile creation date এবং কোন ID দেখানো হবে তা স্থির করতে হবে। Sidebar-এর প্রতিটি tab-এর বাস্তব route অথবা truthful upcoming state নির্ধারণ করা হবে।

### যে সিদ্ধান্তগুলো আগে দরকার

| সিদ্ধান্ত | সম্ভাব্য বিকল্প | সুপারিশ |
|---|---|---|
| Header ID | Guardian account ID / নতুন Guardian ID / Student ID | প্রথম release-এ privacy-safe Guardian account reference ব্যবহার করুন; Student ID আলাদা entity না থাকলে দেখাবেন না। |
| এক Guardian-এর একাধিক student | এক student / multiple students | ভবিষ্যৎ scalability-এর জন্য Student entity রাখার সিদ্ধান্ত নিন; কিন্তু প্রথম release-এ one-request/one-student সীমা স্পষ্ট করুন যদি multiple student এখনো ready না হয়। |
| Sidebar unavailable tabs | hidden / fake page / upcoming state | Navigation visible রাখতে চাইলে truthful “Coming soon” state দিন; কোনো fake count বা fake activity নয়। |
| Route boundary | generic `/account` / dedicated `/guardian` | Dedicated protected `/guardian` workspace ব্যবহার করুন এবং `/account` থেকে role-specific handoff দিন। |

### Acceptance criteria

শুধু authenticated Guardian এই workspace দেখতে পারবে। Tutor, Admin, Owner বা unauthenticated visitor Guardian-private data দেখতে পারবে না। Mobile sidebar keyboard এবং touch উভয়েই ব্যবহারযোগ্য হবে। Home-এ ফেরার পরিষ্কার route থাকবে।

### Test ও verification

Role-guard tests, route tests, sidebar keyboard tests, mobile 375px screenshot, TypeScript এবং full Vitest চালাতে হবে।

## JB-01 — Request/job lifecycle ও Job ID policy

### কী কাজ হবে

Guardian request-এর private lifecycle এবং public Job Board-এর publication lifecycle আলাদা করা হবে। Recommended lifecycle:

`draft → submitted → reviewing → changes_requested → approved → published → matched → closed/cancelled`

তবে existing database status সরাসরি ভাঙার আগে migration impact বিশ্লেষণ করতে হবে। প্রয়োজন হলে পুরোনো status রেখে `reviewState` এবং `publicationState` আলাদা করা যাবে।

### কেন এটি সবচেয়ে গুরুত্বপূর্ণ

যদি `matched` status-কে public publication হিসেবে ব্যবহার করা হয়, তাহলে একজন Tutor match হওয়ার আগেই বা পরে Job Board visibility ভুল হতে পারে। একটি job published হতে পারে, কিন্তু এখনও matched না-ও হতে পারে।

### Job ID সুপারিশ

| ID type | কে তৈরি করবে | নিয়ম |
|---|---|---|
| Auto ID | System | Unique, stable, publication-এর পরে immutable। |
| Manual ID | Authorized Admin | Format validation, uniqueness check এবং audit event বাধ্যতামূলক। |

### Acceptance criteria

Invalid state transition reject হবে। Published এবং matched আলাদা থাকবে। Job expiry policy নির্ধারিত থাকবে। একই request থেকে duplicate active job তৈরি হবে না।

## JB-02 — Tuition job projection, audit এবং migration foundation

### কী কাজ হবে

নতুন `tuition_jobs` entity বা equivalent normalized projection তৈরি হবে। এতে source request ID, public Job ID, publication state, canonical location references, title inputs, tuition type, category, class/course, subjects, student gender, Tutor gender preference, days/week, budget, hire date, safe direction target, published time, expiry time এবং audit metadata থাকবে।

### Public response-এ যা কখনও থাকবে না

Guardian-এর নাম, phone, email, student name, exact address, private notes, contact-consent metadata এবং raw coordinates public বা Tutor response-এ পাঠানো যাবে না।

### Audit event-এ যা থাকবে

Actor, target entity, action, timestamp এবং structured before/after summary থাকবে। Secret, password, unnecessary private data বা raw contact information audit summary-তে রাখা যাবে না।

### Database risk

এটি non-destructive migration হতে হবে। Existing request table-এর column drop/rename করা যাবে না, যতক্ষণ না আলাদা migration approval আছে। Drizzle migration generate করে SQL inspect করার পরে approved database execution path ব্যবহার করতে হবে।

## GD-02 — Protected Guardian shell ও dashboard overview

### কী কাজ হবে

Existing `DashboardLayout` reuse করে Guardian-specific navigation ও dashboard তৈরি হবে। Dashboard-এ server-backed counts দেখানো হবে:

- Draft requests
- Submitted/reviewing requests
- Published/live jobs
- Matched/appointed requests
- Closed requests

### বিশেষ সুপারিশ

Dashboard count কখনও hardcode করবেন না। Loading, empty এবং error state আলাদা করে দেখাতে হবে। “You have 5 active jobs” ধরনের লেখা কেবল server data থাকলেই দেখানো যাবে।

### Sidebar

Dashboard, Hire a Tutor, Profile, Attendance, Posted Jobs, Confirmation Letter, Settings, Exclusively Yours, How it works এবং Join Guardian Community থাকবে। কিন্তু যেসব tab-এর backend contract এখনও নেই, সেগুলোতে truthful upcoming state থাকবে।

## GR-01 — Authenticated three-step Hire a Tutor draft flow

### ধাপ ১

Tuition Type, Category, Class/Course, Subjects, City, Location এবং Student Gender।

### ধাপ ২

Student Count, preferred Tutor Gender, Days per Week, Budget, Hire Date এবং address details।

### ধাপ ৩

Institute, tutoring time, referral source এবং additional requirements।

### UX সুপারিশ

Intro skip করা যাবে, কিন্তু How it works থেকে পরে revisitable হতে হবে। Previous/Next-এ data হারানো যাবে না। City পরিবর্তন করলে location selection invalid হলে পরিষ্কার recovery message দেখাতে হবে। Online tuition-এর জন্য City/Location বাধ্যতামূলক কি না, আগে সিদ্ধান্ত নিতে হবে।

### Validation

Client-side validation কেবল guidance দেবে; server-side validation authoritative থাকবে। Text field bounded এবং sanitized হতে হবে। Draft অন্য Guardian-এর কাছে কখনও দৃশ্যমান হবে না।

## GR-02 — Preview, edit recovery, idempotent submit ও receipt

### কী কাজ হবে

Guardian submit-এর আগে সম্পূর্ণ request preview দেখবে। প্রতিটি section-এ Edit action থাকবে, যা নির্দিষ্ট step-এ ফেরত নিয়ে যাবে এবং data হারাবে না। Submit button একাধিকবার click করলেও duplicate request তৈরি হবে না।

### Submission wording সুপারিশ

“Your request has been received and is pending Admin verification. It will be published only after the required review.”

“Your tutor has been confirmed” বা “Your job is now live” ধরনের ভাষা Admin publication না হওয়া পর্যন্ত ব্যবহার করা যাবে না।

## AD-01 — Admin verification, edit, publish without edit ও audit

### কী কাজ হবে

Admin request review করবে, Guardian contact policy অনুযায়ী confirmation নেবে, প্রয়োজন হলে edit করবে, অথবা edit ছাড়া publish করবে। এই actions UI-তে আলাদা label ও confirmation dialog-সহ থাকবে।

### Action distinction

| Action | অর্থ |
|---|---|
| Edit and publish | Admin requirement পরিবর্তন করে validated version publish করবে। |
| Publish without edit | Guardian-provided requirement অপরিবর্তিত রেখে publish করবে। |
| Request changes | Guardian বা internal correction workflow-এ ফেরত পাঠাবে। |
| Unpublish/Close | Public result থেকে সরাবে, কিন্তু authorized history-তে রাখবে। |

### আমার শক্ত সুপারিশ

Admin edit করার পরে Guardian reconfirmation দরকার কি না, তা privacy/trust-এর দিক থেকে খুব গুরুত্বপূর্ণ। Budget, location, days/week বা student details পরিবর্তন হলে Guardian confirmation বাধ্যতামূলক করা নিরাপদ। ছোট spelling correction হলে internal correction policy রাখা যেতে পারে, তবে audit event অবশ্যই থাকবে।

## JB-03 — Public ও Tutor Job Board

### কী কাজ হবে

এটি Tutor Directory থেকে আলাদা route এবং আলাদা data query হবে। Job Board-এ Tutor profile নয়, Admin-approved tuition opportunity দেখাবে।

### Card-এর primary content

Dynamic title, Job ID, posted date, tuition type, approved location label, subject, student gender, preferred Tutor gender, days/week এবং budget। Guardian identity, raw address এবং contact data card-এ থাকবে না।

### Dynamic title recommendation

API level-এ একটি canonical title builder রাখা উচিত, যাতে public, Tutor, Admin এবং Guardian view-এ একই title আসে। উদাহরণ:

> Need English Medium (Cambridge) Tutor for Standard 2 Student — 4 Days/Week

Missing field থাকলে deterministic fallback থাকবে; আলাদা page আলাদা title তৈরি করবে না।

### Recommended filters

Date range, country, city, location, tuition type, days/week, category, class/course, student gender, Tutor gender এবং Job ID। City/location canonical IDs ব্যবহার করতে হবে এবং duplicate location result remove করতে হবে।

### Result count

Label পরিষ্কার করতে হবে: “127 published tuition jobs” নাকি “18 results matching your filters”। Filtered result count এবং pagination metadata একই server query থেকে আসতে হবে।

## GD-03 — Guardian Posted Jobs

Guardian কেবল নিজের request/job history দেখতে পারবে। Status, Job ID, title, submitted/published/closed date এবং next action দেখা যাবে। Admin note, অন্য Guardian-এর record এবং private contact metadata দেখানো যাবে না।

## GD-04 — Guardian Profile ও Settings

Name, Bangladesh mobile number এবং password-related actions authenticated ও validated হবে। Mobile number update role-safe uniqueness বজায় রাখবে। Sensitive action-এর জন্য reauthentication বা equivalent safeguard লাগবে। Self-service reset এখনই যোগ না করে বর্তমান WhatsApp-assisted recovery contract বজায় রাখার সুপারিশ করছি।

## JB-04 — Direction, detail এবং share

### Privacy-first Maps policy

Public direction-এর default target হবে canonical area/location centroid। Exact Guardian home address বা raw coordinate public URL, share link, card, log বা network response-এ যাওয়া যাবে না। Exact direction ভবিষ্যতে দরকার হলে authenticated role এবং explicit consent-এর মাধ্যমে সীমিত করতে হবে।

## GD-05 — Attendance, Confirmation Letter, Exclusively Yours ও Community

এই চারটি tab এখনই full implementation করা উচিত নয়। প্রত্যেকটির data owner, lifecycle, moderation এবং notification contract নেই। প্রথম release-এ truthful “Coming soon” বা empty state দেখানো যাবে। Fake attendance, fake certificate, fake confirmation letter বা fabricated community activity সম্পূর্ণ নিষিদ্ধ।

## QA-01 — Release gate

Release-এর আগে নিচের সব category test করতে হবে:

| Category | কী যাচাই হবে |
|---|---|
| Role access | Guardian, Tutor, Admin, Owner এবং public access matrix। |
| Privacy | Guardian contact, exact address, student identity এবং Admin notes forbidden-field test। |
| Lifecycle | Draft, review, approve, publish, match, close এবং expiry transitions। |
| Duplicate protection | Repeated Guardian submit ও repeated Admin publish। |
| Location | City/location mismatch, deduplication, online rule এবং safe Maps target। |
| Responsive UX | Desktop ও 375px mobile sidebar, forms, filters, preview ও dialogs। |
| Accessibility | Keyboard focus, labels, error recovery, button names এবং touch reachability। |
| Deployment | Vitest, TypeScript, production build, diff check এবং runtime/network log review। |

## Recommended implementation sequence

### Release Slice A — আগে অনুমোদন করুন

**GD-01 → JB-01 → JB-02 → GD-02 → GR-01 → GR-02 → AD-01 → JB-03**

এটি Guardian request থেকে Admin verification হয়ে safe public/Tutor Job Board publication পর্যন্ত সম্পূর্ণ vertical slice।

### Release Slice B — এরপর করুন

**GD-03 → GD-04 → JB-04**

এটি Guardian own history, profile/settings এবং safe directions/share সম্পূর্ণ করবে।

### Decision-gated Slice C

**GD-05** কেবল Attendance, Confirmation Letter, Exclusively Yours এবং Community-এর product contract অনুমোদনের পরে।

## Implementation শুরু করার আগে ১১টি প্রশ্ন

1. Header-এ কোন ID দেখাবেন—Guardian ID, account ID, নাকি Student ID?
2. এক Guardian কি একাধিক Student manage করতে পারবে?
3. Online tuition-এর ক্ষেত্রে City/Location required হবে কি?
4. Admin edit করার পরে Guardian reconfirmation লাগবে কি?
5. Job কখন expire/close হবে?
6. Tutor শুধু job দেখবে, নাকি interest/apply করতে পারবে?
7. Manual Job ID কে সেট করবে এবং publish-এর পরে পরিবর্তন করা যাবে কি?
8. Direction area centroid হবে, নাকি canonical location pin, নাকি consented exact address?
9. Attendance এবং Confirmation Letter কোন event থেকে তৈরি হবে?
10. Exclusively Yours ও Community-তে কী content, moderation এবং notification থাকবে?
11. Submission/publishing workflow-এ factual support ও Admin notification channel কোনটি হবে?

## Final recommendation

আমার সুপারিশ হলো **প্রথমে Release Slice A অনুমোদন করে JB-01-এর lifecycle decision workshop করা**। এই সিদ্ধান্ত ছাড়া সরাসরি Guardian Dashboard UI বানালে পরে request status, publication state, Job ID এবং privacy contract পরিবর্তন করতে হবে। Data foundation অনুমোদনের পরে UI কাজ করলে implementation কম পুনরাবৃত্তি হবে, public exposure ঝুঁকি কমবে এবং Admin workflow বাস্তবভাবে test করা যাবে।
