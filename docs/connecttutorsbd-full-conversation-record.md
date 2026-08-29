# Connecttutorsbd.com — Full Conversation Record

> **Archive scope:** This document reconstructs the complete available conversation history for the Connecttutorsbd.com project, beginning with the initial MeetTutorBD clone request and ending with the current Tutor Profile requirements session.
>
> **Accuracy note:** User messages below are preserved verbatim where they were retained in the project history. For earlier sessions whose exact assistant wording is no longer available, the assistant side is recorded as an accurate **response/outcome summary**, rather than fabricated quotations. The current session's decisions and implementation outcomes are recorded in detail.

## 1. Project Identity and Current Status

| Item | Current record |
|---|---|
| Brand | Connecttutorsbd.com / Connect Tutors BD |
| Original reference | MeetTutorBD.com-inspired Tutor finding platform |
| Technical stack | React 19, Vite, Tailwind CSS 4, Node.js/Express, tRPC 11, MySQL, Drizzle ORM |
| User roles | Guardian, Tutor, Admin |
| Current authentication | Tutor Email/Password authentication with scrypt password hashes and JWT-backed session cookie |
| Current project directory | `/home/ubuntu/connect-tutors-bd` |
| Latest relevant checkpoints | `c4ddf4a9`, `e937c0d1`, `a697fe7c` |
| Current discovery work | Tutor Profile field-first requirements definition |

## 2. Chronological Conversation Archive

### 2.1 Initial Website, Local Development, and Setup Guidance

#### User message 1

> “meettutorbd.com এর একটা ক্লোনকপি ওয়েবসাইট বানান Connecttutorsbd.com এর ব্যানারে।”

**Assistant response/outcome:** The Connect Tutors BD project was initiated as a MeetTutorBD-inspired Tutor-finding platform. The work was framed as a custom full-stack website rather than a literal code/design copy, with Connecttutorsbd.com branding.

#### User message 2

> “প্রথমে xampp লোকাল হোস্টে হোস্ট করে, ফুল সাইট ডেভেলপ করে এরপর হোস্টিং এ ডিপ্লয় করা যাবে?”

**Assistant response/outcome:** A local-development-first approach was explained. The project later evolved into a Node.js/React full-stack application, so Node.js local development became the recommended route instead of a PHP/XAMPP-only workflow.

#### User message 3

> “মিট টিউটরের টিউটর প্রোফাইল ইন্টারফেসে কি কি আছে জানান”

**Assistant response/outcome:** Tutor profile interface concepts were reviewed, including Tutor identity, education, subjects, class levels, tuition preferences, availability, location, teaching experience, and profile status.

#### User message 4

> “টিউটর হিসেবে লগিন করার পর যে পেইজ আসে সেখানে কি কি তথ্য দেয়া লাগে সেটা জানাবেন”

**Assistant response/outcome:** A Tutor Dashboard concept was outlined, covering profile completion, jobs/requests, teaching preferences, status, payments, certificates, settings, and account information.

#### User message 5

> “XAMPP লোকাল হোস্টে ওয়ার্ডপ্রেস বা কাস্টম কোডে এই সাইট তৈরির স্টেপ-বাই-স্টেপ গাইড দিন।”

**Assistant response/outcome:** A step-by-step local-host development guide was provided, comparing WordPress and custom-code approaches. The project ultimately used custom React/Node.js code because the required Tutor workflow, role-based access, database, and dashboard need more flexibility.

#### User messages 6–10

> “সাইটে যে লগো ইউ করেছেন সেটার যে যে ফরম্যাট লাগে (ওয়েবসাইট, ফেইসবুকে) ইউজ করার জন্য, সকল ফরম্যাটে এক্সট্রাক্ট করে দেন”

> “যে সাইট বানিয়েছেন এটা ইংরেজিতে করে দিন”

> “তাহলে সাইটের একটা জিপ ফাইল দেন”

> “বাংলায় বলেন”

> “যে ওয়েবসাইট বাংলায় করেছেন এখানে সেতা কি ইংরেজিতে কনভার্ট করে দিতে পারবেন?”

**Assistant response/outcome:** Branding/export, language conversion, ZIP packaging, and Bengali guidance were addressed. The web UI was moved to English where requested, while explanations continued in Bengali.

#### User messages 11–22: Local server and Git/Node setup

> “The dev server stopped responding. Please restart it.”

> “এই সাইট লোকাল হোস্ট এ হোস্ট করে পরবর্তী ডেভেলপমেন্ট এর কাজ করতে চাই । ফুল গাইডলাইন দিন”

> “Node.js LTS এবং Git ইনস্টল গাইড দিন”

> “node -v\nnpm -v এই কমান্ডগুলো এখানে চালাবো ? একসাথে কপি করে নাকি একটার পর একটা?”

> “এই কমান্ড কোথায় চালাবো , মানে কোন ডিরেক্টরিতে?”

> “গিট ইনস্টল করে নিবো?”

> “এরকম ই থাকবে?”

> “এখানে কোনটা রাখবো? আমি রেগুলার Notepad++ এ কাজ করি , এটা রাখা যাবে ? নাকি ডিফল্ট টাই ভালো হবে?”

> “গিট ইনস্টলের বাকি সেটআপগুলো কি ডিফল্ট রেখেই Next দিয়ে যাবো?”

> “এই পর্যন্ত করেছি, এরপর কি করতে হবে”

> “ডান”

> “কমান্ড প্রম্পট আবার চালু করবো?”

> “বন্ধ করার কারণ কি”

> “এরকম আসছে , ক্রোমেও চালু হয়েছে , এখন সাইট এর বাকি কাজ করার জন্য কি করতে হবে”

**Assistant response/outcome:** The development server was restarted and local development guidance was provided. The user was guided through Node.js LTS and Git installation, use of Command Prompt/terminal, running `node -v` and `npm -v`, choosing Git editor defaults, using the project folder, and continuing work after the browser preview opened.

### 2.2 Product Analysis and Scope Definition

#### User message 23

> “Full Stack সাইট বানানোর জন্য এর সাথে সম্পৃক্ত যা যা কাজ করা দরকার প্রজেক্ট এনালাইসিস করে তার একটা ফুল গাইডলাইন ও চেকলিস্ট দিন”

**Assistant response/outcome:** A full-stack project checklist was provided, covering product requirements, public pages, dashboards, database design, authentication, Tutor listing/profile, requests, privacy, verification, notification options, testing, local setup, deployment, and maintenance.

#### User message 24

> “পরবর্তী পদক্ষেপ:\nTutor Listing + Tutor Profile + MySQL foundation শুরু করুন।\nPublic/private tutor তথ্য ও verification policy চূড়ান্ত করুন।\nGuardian, Tutor ও Admin-এর login method নির্ধারণ করুন। - এই কাজগুলো করার জন্য আমার কি কি তথ্য দিতে হবে?”

**Assistant response/outcome:** The information needed to begin these features was requested, including service locations, tuition mode, contact privacy, public profile fields, verification requirements, documents, approval owner, authentication method, admin identity, and required Tutor filters.

#### User message 25

> “১ ও ২ নাম্বার প্রশ্নের উত্তর\n১। শুরুতে সাইটটি কোন কোন city/area কভার করবে?\n\nবিশ্বের কিছু দেশে চলবে এবং দেশগুলোর স্পেসিফিক সিটিতে চলবে, যেসব দেশে প্রবাসী বাংলাদেশীরা বেশি থাকে \nএবং সারা বাংলাদেশে চলবে।\nদেশগুলো এবং সেসকল দেশের স্পেসিফিক শহরগুলো যেন ম্যানুয়ালি সিলেক্ট করা যায় সে ব্যবস্থা রাখতে হবে\n\nসারা বাংলাদেশ > সবগুলো বিভাগী শহরে এবং জেলা শহরে চলবে\n\n২। Home tuition, online tuition, নাকি দুটোই থাকবে?\n দুটোই থাকবে”

**Assistant response/outcome:** The planned discovery system initially supported international country/city selection alongside Bangladesh divisions and districts, and both Home Tuition and Online Tuition.

#### User messages 26–28

> “বাকিগুলোর লিস্ট সাজাচ্ছি, আপনার জায়গা থেকে এই বাকি ৭ টা সেকশনের সবচেয়ে প্রফেশনাল ইমপ্লিমেন্টেশন কিরকম হওয়ার উচিৎ একটা ফুল গাইডলাইন দিবেন। পাশাপাশি জানাবেন- স্ক্রিনশট এ দেওয়া হোস্টিং ফ্যাসিলিটির মধ্যে এই সাইট হোস্ট করা যাবে কিনা?”

> “এখানে হোস্ট করা যাবে কিনা বলে নাই”

> “erokom ase”

**Assistant response/outcome:** A professional implementation guideline was given for the remaining product sections. Hosting suitability was clarified based on the provided information, while distinguishing current development from eventual deployment.

#### User message 29

> “Rollback to this Version:6e7625c2”

**Assistant response/outcome:** The project was rolled back to the requested historical version before continuing development.

### 2.3 Tutor Discovery, Listing, and Profile Foundation

#### User message 30

> “রোলব্যাক সম্পন্ন হওয়ায় এখন Tutor Listing এবং Tutor Profile পেজগুলোর ডিজাইন ও ডেভেলপমেন্ট শুরু করুন।\nটিউটর খোঁজার জন্য দেশ, নির্দিষ্ট শহর এবং বাংলাদেশের জেলাভিত্তিক লোকেশন ফিল্টারিং ফিচারটি যুক্ত করুন।”

**Assistant response/outcome:** Tutor Listing/Profile routes and filters were implemented. They covered country, international city, Bangladesh division/district, tuition-mode filtering, dynamic Tutor profiles, typed tRPC API contracts, temporary repository-backed reads/writes, tests, and production build verification.

#### User message 31

> “সর্বশেষ যে আপডেট সাইট দিলেন এটাই কি সর্বশেষ ভার্সন যেখানে লোকেশন-ভিত্তিক \"Tutor Discovery milestone সম্পন্ন হয়েছে...\" এই ফিচারগুলো যুক্ত হয়েছে?”

**Assistant response/outcome:** The completed Tutor Discovery milestone was confirmed. It included Listing/Profile routes, geographic filters, Home/Online/Both mode, a location manager, onboarding/edit flow, tRPC API, tests, and build checks.

### 2.4 Database, Role-Based Access, and Guardian Requests

#### User message 32

> “MySQL এবং Drizzle ORM ব্যবহার করে tutors ও locations টেবিলের স্কিমা তৈরি করুন এবং UI-তে ডাটাবেস থেকে ডেটা প্রদর্শন করুন।\nGuardian এবং Tutor-দের জন্য লগইন ও রেজিস্ট্রেশন পেজ তৈরি করে role-based access control সিস্টেম বাস্তবায়ন করুন।\nTutor request ফর্মে সাবমিশনের সময় লোডিং অ্যানিমেশন এবং সফল হলে একটি সুন্দর সাকসেস মেসেজ যুক্ত করুন।”

**Assistant response/outcome:** MySQL/Drizzle tables for users, Tutors, locations, and Tutor requests were implemented. Database-backed UI reads, role-aware Guardian/Tutor/Admin flow, protected Tutor requests, loading state, success message, authorization tests, and build verification were added.

#### User messages 33–35

> “আপনার ১০ টা পয়েন্ট এর কোনগুলা দিতে হবে?”

> “এখন আপনার কাছ থেকে প্রথমে এই 10টি উত্তর চাই ...”

> “Mobile OTP অথেন্টিকেশন এবং Role-based access control (Guardian, Tutor, Admin) সিস্টেমের ফ্লোচার্ট বা কোড স্ট্রাকচার তৈরি করুন।”

**Assistant response/outcome:** The required business decisions were explained. A Bengali Mobile OTP and RBAC architecture guide, Mermaid flowchart, database model, tRPC structure, frontend protection flow, security checklist, and implementation sequence were created. This was a planning/architecture resource; the later active Tutor authentication implementation changed to Email/Password at the user's request.

#### User messages 36–37

> “পাবলিশ করলে কি হবে? এখন পাবলিশ করার দরকার আছে?”

> “ফুল স্ট্যাক ওয়েবসাইট বলতে কি বুঝায়”

**Assistant response/outcome:** Publishing was explained as making the project live and shareable; it was noted that publishing was not required during active development. Full-stack was explained as the combination of frontend UI, backend logic/API, database, authentication, and deployment infrastructure.

### 2.5 Header, Contact, and Notification Discussions

#### User message 38

> “হেডার সেকশনে এই তথ্যগুলো থাকবে মেনু আকারে , মোবাইলে মেনু ড্রপডাউন হবে”

**Assistant response/outcome:** The public header was updated with branded desktop navigation, mobile dropdown behavior, responsive accessibility, Sign In, Job Board, Blog, and Become a Tutor CTA.

#### User messages 39–40

> “মোবাইল নাম্বার +8801516131411”

> “হেডারের মোবাইল নাম্বারের পাশে একটি হোয়াটসঅ্যাপ আইকন যুক্ত করুন যাতে ক্লিক করলে সরাসরি মেসেজ করা যায়।”

**Assistant response/outcome:** The header phone number was updated to `+880 1516 131411`, and a WhatsApp icon/direct chat link was added. Desktop/mobile screenshots, type checking, and production build were verified.

#### User messages 41–48

> “গার্ডিয়ান রিকোয়েস্ট সাবমিট করলে যেন সরাসরি হোয়াটসঅ্যাপে নোটিফিকেশন যায়, সেই ফিচারটি যুক্ত করুন।”

> “A”

> “1”

> “এটাই বিজনেস একাউন্ট, 01516131411 এই নাম্বারে খোলা”

> “এটা কি ফ্রি?”

> “এডমিন নোটিফিকেশনের জন্য আলাদা কোনো ফ্রি বিকল্প (যেমন ইমেইল বা টেলিগ্রাম) ব্যবহার করা যায় কি?”

> “পরে করবো, আপনি আমাকে একটা রিমেম্বার কোড দেন যেটা বললেই আপনি আবার আমাকে এই প্রসেস এ নিয়ে আসবেন”

**Assistant response/outcome:** WhatsApp Business/API notification possibilities, costs, setup requirements, and free alternatives such as email or Telegram were discussed. The notification integration was deliberately deferred for later implementation. A reminder/reference code was provided in the earlier session for returning to that process.

### 2.6 Tutor Registration, Location, Identity, and Dashboard

#### User message 49

> “Become a Tutor এ ক্লিক করে এরকম একটা প্যানেল আসবে এবং টিচার এটি ফিলাপ করে লগিন করলে তার জন্য একটা টিউটর প্রোফাইল এবং প্রোফাইলে একটা ড্যাশবোর্ড ক্রিয়েট হবে সাইডবারে”

**Assistant response/outcome:** A reference-inspired Become a Tutor registration panel and Tutor Dashboard design were implemented. The Dashboard has a responsive sidebar and initial structural placeholder areas.

#### User message 50

> “টিউটর রেজিস্ট্রেশনে প্রাথমিকভাবে এত তথ্য নেয়ার প্রয়োজন নেই। Primary Subject, Class / Level , Experience (years) * Monthly Fee (BDT) * Institution *, Education * Availability * Tuition Type *Languages * About You * এই তথ্যগুলো প্রাথমইক রেজিস্ট্রেশন ফর্ম এ থাকবেনা। রেজিস্ট্রেশন এর পর যাবতীয় তথ্য প্রোফাইল থেকে আপডেট করবে। সেটার ফুল কাঠামো আমি দিবো।”

**Assistant response/outcome:** Registration was simplified to basic identity/contact/location information. Professional teaching information was explicitly moved to the future authenticated Tutor Profile completion flow.

#### User message 51

> “কন্টিনিউ”

**Assistant response/outcome:** Tutor onboarding development continued using the simplified registration model.

#### User message 52

> “City section এ এরকম বিভাগীয় শহরগুলো দেখাবে। বিভাগীয় শহরগুলোর পাশাপাশি Tangail এবং Sirajgang এর নাম রাখবেন । উপরে সার্স করা যাবে-\nhttps://prnt.sc/30dpXH9cfyTO\nলোকেশন সেকশনে ক্লিক করলে সংশ্লিষ্ট বিভাগীয় শহরের সকল লোকেশন দেখাবে । উপরে সার্স করা যাবে-\nhttps://prnt.sc/pCV5Jfqi5mJJ\ncaretutors.com এর  'become a tutor' panel থেকেও আইডিয়া নিতে পারবেন। টিচার সবাই যেহেতু বিভাগীয় এবং মেইন জেলা শহরগুলোতে থাকে , এখানে বাইরের কান্টি অপশন যোগ করার করকার নেই। দুইটা স্ক্রিনশট দেখেন”

**Assistant response/outcome:** Tutor registration was changed to Bangladesh-only. It includes searchable divisional cities plus Tangail and Sirajganj, then city-specific searchable area choices. International location selection was removed from the Tutor registration path.

#### User message 53

> “টিউটর রেজিস্ত্রেশন প্যানেল এ বাই ডিফল্ট বাংলাদেশের কান্ট্রি কোড থাকবে, বাকি অংশ টিচার পূরণ করবে।”

**Assistant response/outcome:** A fixed `+880` prefix was added. The form collects the remaining 10 mobile digits, normalizes pasted local/international forms, validates Bangladesh mobile prefixes, and stores a normalized complete number.

#### User message 54

> “https://prnt.sc/mxkqoD6FCOmO\nলগিন করার পর এরকম একটা ড্যাশবোর্ড থাকবে। বাম পাশে সাইডবার থাকবে।\n\nটিচার Registration Panelথেকে রেজিস্ট্রেশন করার সাথে সাথে একটা টিউটর আইডি ও রেজিস্ট্রেশন ডেট ক্রিয়েট হবে। টিউটর আইডি ১৫০৩ থেকে শুরু হবে।\n\nTutor ID: 1503 | Since Jul 03, 2019\nhttps://prnt.sc/F6lQa6l7jTmJ সোর্স -  স্ক্রিনশট\n\n সাইডবারে আরো যা যা থাকবে >  \n Dashboard\n Job Board\n Profile \n Status\n Confirmation Letter\n Payment\n Certificate\n Refer & Earn\n Setting\n\nএকটা সূক্ষ্ম ডিভাইডার\nExclusively Yours\nHow It Works\nJoin our Community \nSign Out - \n//আগে ডিজাইন করেন , এরপর বাকি কাজ করবো।”

**Assistant response/outcome:** Sequential Tutor identity allocation beginning at 1503 and registration-date persistence were added. The Tutor Dashboard received the requested identity header and grouped sidebar navigation: Dashboard, Job Board, Profile, Status, Confirmation Letter, Payment, Certificate, Refer & Earn, Setting, divider, Exclusively Yours, How It Works, Join our Community, and Sign Out. Deferred sections are clearly labeled as placeholders.

#### User messages 55–56

> “zip ফাইল দেন , লোকাল হোস্ট এ টেস্ট করে দেখবো, আর টিউটর ডিটেইলস কোথায় জমা হবে বা কোথা থেকে দেখতে পারবো জানাবেন”

> “zip ফাইল দেন , লোকাল হোস্ট এ টেস্ট করে দেখবো, আর টিউটর ডিটেইলস কোথায় জমা হবে বা কোথা থেকে দেখতে পারবো জানাবেন”

**Assistant response/outcome:** A local-testing/source package and documentation were prepared. Tutor information is stored in the MySQL database through the project's `users`, `tutors`, and related tables; database/admin review interfaces remain part of the continuing roadmap.

### 2.7 Tutor Email/Password Authentication

#### User message 57

> “**Tutor Rergistration Panel:**\n\nhttps://prnt.sc/qbnZ2JDJ-vp8\nPassword এবং Confirm Password যোগ হবে। রেজিস্ট্রেশন করার পর টিচার টিউটর লগিন প্যানেল এ ইমেইল আইডি আর পাসওয়ার্ড দিয়ে লগিন করবে।”

**Assistant response/outcome:** Tutor Email/Password authentication was implemented end-to-end.

| Area | Completed outcome |
|---|---|
| Database | Added `passwordHash` support through migration `0006_brainy_ken_ellis.sql` |
| Password security | Node.js `scrypt` hashing, safe verification, normalized email lookup, and malformed-parameter bounds |
| Registration | Password and confirm-password fields with validation, duplicate-email handling, and secure Tutor creation |
| Login | Dedicated `/tutor/login` email/password sign-in page |
| Session | Existing JWT-backed `app_session_id` cookie contract is used after password login |
| Dashboard redirects | Unauthenticated Tutor routes redirect to `/tutor/login`, not generic OAuth |
| Tests | Registration/login role, Tutor ID, registration date, cookie, hash, and invalid-password coverage |

**Verification:** TypeScript check, **33 Vitest tests**, production build, desktop/mobile screenshots, and protected route redirect verification passed.

**Checkpoint:** `c4ddf4a9` — complete Tutor Email/Password authentication milestone.

### 2.8 Password Show/Hide Feature

#### User message 58

> “পাসওয়ার্ড শো করার আইকন যোগ করে দিন”

**Assistant response/outcome:** Accessible Eye/EyeOff controls were added to Tutor Registration Password, Tutor Registration Confirm Password, and Tutor Login Password. The controls can be reached using keyboard Tab/Enter and switch the password input type between hidden and visible modes.

**Verification:** TypeScript check, 33 Vitest tests, production build, responsive screenshots, and Playwright keyboard verification passed.

**Checkpoint:** `e937c0d1` — password visibility controls.

### 2.9 Skills Setup Discussion

#### User message 59

> “1. Project খুলুন\n2. Skills install করুন\n3. /setup-matt-pocock-skills\n4. /grill-with-docs\n5. /to-spec\n6. /to-tickets\n7. /implement\n8. /tdd\n\nএই স্কিলগুলো ইনস্টল করতে হবে নাকি টাইপ করে কমান্ড দিলে হবে, আমার এই সাইটের পরবর্তী কাজ এগিয়ে নেওয়ার জন্য এই স্কিলগুলো কিভাবে কাজে লাগাবো\n9. /code-review”

**Assistant response/outcome:** The feature-delivery order was explained:

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

`/setup-matt-pocock-skills` was identified as a one-time TypeScript workflow standardization step.

#### User message 60

> “/grill-with-docs — Connecttutorsbd.com-এর Tutor Profile-এর পূর্ণ কাঠামো নির্ধারণ করুন।”

**Assistant response/outcome:** Tutor Profile requirements discovery began. The initial approach attempted to discuss visibility, public/private fields, and approval; the user corrected the sequence in the next message.

#### User message 61

> “আমার আগে টিউটর প্রোফাইল এ সাইবারের তথ্য অনুযায়ী কি কি থাকবে সেটা নির্ধারণ করা দরকার”

**Assistant response/outcome:** The scope was corrected to a **field-first Tutor Profile discovery** process. Visibility, approval, verification, and implementation were deferred until the profile sections and fields are agreed.

#### User message 62

> “এই কাজের জন্য কোন স্কিল নির্বাচন করবো? যেন ধাওএ ধাপে কাজ করা হয়”

**Assistant response/outcome:** The recommended skill order above was confirmed. The immediate recommended skill was `/grill-with-docs`, followed by `/to-spec`, `/to-tickets`, `/tdd`, `/implement`, and `/code-review`.

#### User message 63

> “আগে স্কিল লিস্ট এ স্কিল গুলো যোগ করেন”

**Assistant response/outcome:** Seven local installable Skill packages were created and validated:

| Skill | Purpose |
|---|---|
| `setup-matt-pocock-skills` | TypeScript workflow standardization |
| `grill-with-docs` | Structured requirements interview |
| `to-spec` | Technical specification preparation |
| `to-tickets` | Implementation ticket decomposition |
| `implement` | Controlled feature implementation |
| `tdd` | Test-first development |
| `code-review` | Security, privacy, authorization, test, and maintainability review |

The packages were delivered as `SKILL.md` attachments for installation through **My Skills**. All seven passed the local Skill validator.

### 2.10 Current Tutor Profile Field-First Discovery

#### User message 64

> “/grill-with-docs ঠিক আছে। প্রথম ধাপে শুধু Tutor Profile-এ কী কী তথ্য থাকবে—সেটা নির্ধারণ করি। Visibility, approval এবং verification পরে ঠিক করব। আপনার আগের নির্দেশনা অনুযায়ী একটি professional field-first structure নিচে দিলাম।”

**Assistant response/outcome:** A focused field-first session began.

#### User message 65

> “A–H সব section থাকবে”

**Confirmed decision:** All eight Tutor Profile sections will be included.

| Code | Section |
|---|---|
| A | Profile Identity |
| B | Contact & Location |
| C | Academic Information |
| D | Teaching Expertise |
| E | Tuition Preferences |
| F | Language & Communication |
| G | About the Tutor |
| H | Profile System Information |

#### User messages 66–68: Checklist formatting request

> “চেকলিস্ট করে দেন”

> “পাশের অপশন গুলাও চেকলিস্ট করে দেন”

> “Profile Photo — এর সাথে যে অপশন আছে সেগুলাও চেকবক্স করেন। সবগুলাতে এভাবে দিতে বলছি”

**Assistant response/outcome:** The field questions were reformatted first as checklists, then as per-field options. The user noted that Markdown checkboxes are not interactive in chat.

#### User message 69

> “চেকবক্স এ ক্লিক হচ্ছেনা।”

**Assistant response/outcome:** It was clarified that Markdown checkboxes are static. The interaction was switched to an easy numbered-answer format such as `1-A, 2-B`.

#### User message 70

> “1- A, 2-A, 3-B, 4- B, 5- B, 6-C, 7-A, 8- B”

**Initial Section 1 answer interpretation:**

| # | Field | First recorded choice |
|---|---|---|
| 1 | Profile Photo | Required |
| 2 | Age | Single age |
| 3 | Short Headline | Optional |
| 4 | Additional Teaching Areas | One area only |
| 5 | Available Nationwide | Optional |
| 6 | Institution Location | Excluded |
| 7 | Current Study Status | Studying / Graduated / Professional |
| 8 | Graduation Year | Optional |

#### User message 71

> “সেকশন ১ এ কারেকশন আছে, আবার দেন”

**Assistant response/outcome:** The entire initial Section 1 answer set was marked **superseded**, not final. A corrected Section 1 question set was sent again.

### 2.11 Conversation Log Requests

#### User message 72

> “এই ট্যাবের যত লেখা আছে একটা .md ফাইল করে দেন। কি কি কাজ হয়েছে বুঝতে সুবিধা হবে। আমার প্রশ্ন এবং আপনার উত্তর সহ।”

**Assistant response/outcome:** A current-tab Markdown summary was created as:

```text
docs/current-tab-conversation-log.md
```

It summarized Tutor authentication, eye icons, Skills, the current Tutor Profile discovery, and current next steps.

**Checkpoint:** `a697fe7c` — current-tab conversation log.

#### User message 73

> “meettutorbd.com এর একটা ক্লোনকপি ওয়েবসাইট বানান Connecttutorsbd.com এর ব্যানারে। - এখান থেকে ফুল কনভারসেশন .md ফাইল করে দিতে বলেছি”

**Assistant response/outcome:** The limitation of the earlier current-tab-only log was acknowledged. This file, `docs/connecttutorsbd-full-conversation-record.md`, was created to begin at the initial MeetTutorBD clone request and include all retained available project history through the current point.

## 3. Checkpoint History

| Checkpoint | Recorded milestone |
|---|---|
| `a26a7ce2` | Tutor Listing/Profile routes, filters, country/city/Bangladesh location discovery, tuition modes, tests, and build |
| `adb60cb2` | MySQL/Drizzle schema, database-backed records, protected requests, role-aware auth, loading/success experience, tests, and build |
| `b3d67799` | Bengali Mobile OTP/RBAC architecture guide and flowchart |
| `6ae08c4f` | Public header, mobile dropdown, navigation, CTA, and accessibility verification |
| `300f62a8` | Header phone number update |
| `0216f0d9` | WhatsApp header icon/direct chat link |
| `899c7aa0` | Initial Tutor onboarding, private fields, Tutor profile/dashboard, migration, and tests |
| `754561ac` | Tutor onboarding redirect/role handoff validation |
| `6b1bb1c7` | Pending Tutors excluded from public listing until approved |
| `3167ad03` | Simplified initial Tutor registration; professional fields moved to profile completion |
| `c77510ab` | Bangladesh-only Tutor registration location catalog and filtering |
| `c06f95df` | Fixed `+880` phone experience and mobile-number validation |
| `d31d5c93` | Tutor ID from 1503, registration date, requested Tutor sidebar design |
| `7783ad28` | Local-testing ZIP project state verification |
| `ccf83365` | Local-testing/Tutor data storage guide |
| `c4ddf4a9` | Secure Tutor Email/Password authentication |
| `e937c0d1` | Password show/hide eye icons |
| `a697fe7c` | Current-tab Markdown conversation log |

## 4. Current Confirmed Product Decisions

| Topic | Decision |
|---|---|
| Tutor initial registration | Basic identity/contact/location fields plus password and confirm password |
| Tutor advanced profile data | Completed later from authenticated Tutor Dashboard Profile |
| Location in Tutor registration | Bangladesh-only searchable catalog: divisional cities plus Tangail and Sirajganj with area selection |
| Phone input | Fixed Bangladesh `+880` prefix and validated local mobile digits |
| Tutor identity | Sequential ID beginning at 1503 and automatic registration date |
| Tutor sign-in | Dedicated Email/Password login at `/tutor/login` |
| Password storage | Secure scrypt hash, never plain text |
| Tutor dashboard fallback | Unauthenticated Tutor routes use `/tutor/login` |
| Tutor Profile sections | All A–H sections will exist |
| Profile field decisions | Still in discovery; Section 1 must be corrected before it is finalized |

## 5. Current Pending Work

### 5.1 Immediate pending answer: Section 1 correction

The user needs to select the corrected options below:

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

Expected response format:

```text
1-?, 2-?, 3-?, 4-?, 5-?, 6-?, 7-?, 8-?
```

### 5.2 Later product work already identified

The following work remains intentionally deferred until business requirements are confirmed:

| Future item | Dependency |
|---|---|
| Complete Tutor Profile database/UI | Field-first discovery, specification, tickets |
| Public/private visibility policy | Complete field inventory and privacy decisions |
| Admin approval workflow | Profile/verification requirements |
| Verification documents | User decision on documents and review policy |
| Tutor request matching/assignment | Business matching rules |
| WhatsApp/email/Telegram admin notification | Selected channel and setup details |
| Payment/Certificate/Referral sections | Separate business rules and technical specification |

## 6. Recommended Next Workflow

The recommended feature-development sequence after the Tutor Profile field discovery is complete remains:

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

The immediate next action is not implementation. It is the corrected answer to **Tutor Profile Section 1**. After that, the Academic Information, Teaching Expertise, Tuition Preferences, Language & Communication, About the Tutor, and Profile System Information fields can be finalized.
