# Connect Tutors BD — Local Testing ও Tutor Data Guide

এই guide-টি ZIP package থেকে Windows computer-এ project চালানো, XAMPP-এর MySQL ব্যবহার করা এবং Tutor registration-এর data কোথায় জমা হয় তা বোঝার জন্য তৈরি করা হয়েছে। Project-টি Node.js, React, Express, tRPC, Drizzle ORM এবং MySQL/TiDB-compatible database ব্যবহার করে।

## ১. ZIP extract ও প্রয়োজনীয় software

ZIP file extract করে এমন একটি folder-এ রাখুন যার path-এ বাংলা অক্ষর বা অতিরিক্ত space নেই। এই package-এর জন্য উদাহরণ: `C:\Projects\connect-tutors-bd`। Node.js LTS, Git এবং pnpm ইনস্টল থাকতে হবে। XAMPP থেকে Apache চালু করা বাধ্যতামূলক নয়; এই project-এর web server Node.js চালায়। XAMPP-এর **MySQL** service চালু রাখবেন।

## ২. Dependency install

Command Prompt বা PowerShell খুলে project folder-এ যান:

```text
cd C:\Projects\connect-tutors-bd
pnpm install
```

ZIP package-এ সাধারণত `node_modules` রাখা হয় না, তাই প্রথমবার `pnpm install` লাগবে।

## ৩. Database configuration

XAMPP Control Panel থেকে MySQL চালু করুন। এরপর phpMyAdmin-এ `connect_tutors_bd` নামে একটি database তৈরি করুন। Project-এর server-কে database connection দেওয়ার জন্য local environment configuration-এ `DATABASE_URL` দিতে হবে। সাধারণ local XAMPP setup-এর উদাহরণ:

```text
DATABASE_URL=mysql://root:@127.0.0.1:3306/connect_tutors_bd
```

আপনার MySQL password থাকলে `root:`-এর পরে password বসাবেন। ZIP package-এ কোনো production secret বা `.env` ফাইল রাখা উচিত নয়। প্রয়োজনীয় OAuth/session environment values আপনার local development setup অনুযায়ী Management UI বা নিজের secure environment file-এ দিতে হবে; এগুলো public ZIP-এ যোগ করবেন না।

Database schema ও migration চালাতে project folder থেকে:

```text
pnpm db:push
```

যদি আপনার local setup-এ migration command আলাদাভাবে চালাতে হয়:

```text
pnpm db:generate
pnpm db:migrate
```

## ৪. Local server চালানো

Development server চালান:

```text
pnpm dev
```

তারপর browser-এ খুলুন:

```text
http://localhost:3000
```

Code পরিবর্তনের পর Vite/tsx watch সাধারণত নিজে reload করবে। বন্ধ করতে Command Prompt-এ `Ctrl + C` চাপুন।

Production build যাচাই করতে:

```text
pnpm check
pnpm test
pnpm build
```

## ৫. Tutor details কোথায় জমা হয়

Tutor registration/login সম্পন্ন হলে data MySQL database-এ কয়েকটি related table-এ সংরক্ষিত হয়।

| Table | কী থাকে | গুরুত্বপূর্ণ fields |
|---|---|---|
| `users` | Login identity ও role | `id`, `name`, `email`, `role`, `createdAt`, `lastSignedIn` |
| `tutor_registrations` | Tutor-এর স্থায়ী public identity | `tutorNumber`, `userId`, `registeredAt` |
| `tutors` | Tutor Profile-এর professional details | `name`, `phone`, `contactEmail`, `institution`, `education`, `subjects`, `levels`, `experience`, `fee`, `mode`, `locationId`, `availability`, `languages`, `about`, `profileStatus` |
| `locations` | Bangladesh city ও area hierarchy | `id`, `label`, `type`, `country`, `parentId`, `enabled` |
| `tutor_requests` | Guardian-এর submitted tutor requests | `guardianUserId`, `tutorId`, `tuitionType`, `subjects`, `locationText`, `status`, `createdAt` |

Tutor ID `tutor_registrations.tutorNumber` field-এ থাকে এবং Guardian ID `guardian_profiles.guardianId` field-এ থাকে। নতুন Tutor ও Guardian—উভয় allocation সর্বনিম্ন উপলভ্য numeric ID `777` থেকে শুরু হয়; ব্যবহৃত ID এড়িয়ে পরবর্তী উপলভ্য নম্বরটি দেওয়া হয়। Registration date `tutor_registrations.registeredAt` field-এ থাকে। Dashboard-এ এই দুইটি data identity header-এ দেখানোর জন্য backend থেকে authenticated account অনুযায়ী ফেরত আসে।

> Phone number public Tutor Listing-এ দেখানো হবে না। এটি authenticated Tutor profile বা protected contact flow-এর জন্য রাখা হয়েছে।

## ৬. phpMyAdmin থেকে Tutor details দেখা

XAMPP চালু রেখে browser-এ `http://localhost/phpmyadmin` খুলুন। তারপর `connect_tutors_bd` database নির্বাচন করুন। Tutor identity দেখতে `tutor_registrations` table-এর Browse view খুলুন। Login account ও role দেখতে `users` table এবং profile information দেখতে `tutors` table খুলুন। `tutors.userId` এবং `users.id` মিলিয়ে একই Tutor account-এর records শনাক্ত করবেন।

phpMyAdmin-এর SQL tab-এ নিরাপদ read-only query ব্যবহার করতে পারেন:

```sql
SELECT
  tr.tutorNumber,
  tr.registeredAt,
  u.id AS userId,
  u.name,
  u.email,
  u.role,
  t.phone,
  t.profileStatus,
  t.verified
FROM tutor_registrations tr
JOIN users u ON u.id = tr.userId
LEFT JOIN tutors t ON t.userId = u.id
ORDER BY tr.tutorNumber ASC;
```

শুধু profile summary দেখতে:

```sql
SELECT id, userId, name, phone, institution, education,
       profileStatus, verified, createdAt, updatedAt
FROM tutors
ORDER BY createdAt DESC;
```

এই queries শুধু data পড়বে; কোনো record insert, update বা delete করবে না।

## ৭. Registration বনাম Profile completion

প্রাথমিক Tutor registration intentionally ছোট রাখা হয়েছে। Registration panel-এ basic identity/contact এবং Bangladesh-only City/Location selection থাকবে। Primary Subject, Class/Level, Experience, Monthly Fee, Institution, Education, Availability, Tuition Type, Languages এবং About You পরবর্তী authenticated Tutor Dashboard-এর Profile section থেকে পূরণ করার জন্য রাখা হয়েছে।

Registration সম্পন্ন হওয়ার পর Tutor Dashboard-এ গিয়ে **Profile** নির্বাচন করবেন। Profile save করলে professional fields `tutors` table-এ update হবে। Admin approval না হওয়া পর্যন্ত নতুন profile public directory-তে দেখানো হবে না; profile status `pending` বা `draft` থাকতে পারে।

## ৮. গুরুত্বপূর্ণ local testing note

OAuth placeholder বা local authentication configuration ঠিকমতো না থাকলে registration button আপনাকে configured login portal-এ পাঠাতে পারে। এটি application failure নয়; local environment-এ OAuth values configure করতে হবে। Database-backed parts পরীক্ষা করতে MySQL connection, migrations এবং authenticated session—এই তিনটি ঠিক থাকা প্রয়োজন।

## ৯. ZIP package থেকে কী বাদ রাখা উচিত

Public ZIP-এ `.env`, API key, JWT secret, OAuth secret, production database password, `node_modules`, `dist`, `.manus-logs`, এবং test-generated artifacts রাখা উচিত নয়। এগুলো local machine-এ প্রয়োজন অনুযায়ী পুনরায় তৈরি বা configure করবেন।

## ১০. দ্রুত checklist

| ধাপ | সম্পন্ন হলে |
|---|---|
| Node.js LTS ও pnpm ইনস্টল | `node -v` এবং `pnpm -v` version দেখাবে |
| XAMPP MySQL চালু | MySQL service green থাকবে |
| Database তৈরি | `connect_tutors_bd` দেখা যাবে |
| `DATABASE_URL` configure | server database connect করতে পারবে |
| `pnpm install` | dependencies install হবে |
| `pnpm db:push` | tables ও migrations তৈরি হবে |
| `pnpm dev` | `http://localhost:3000` খুলবে |
| Tutor registration test | `tutor_registrations`, `users`, `tutors` records দেখা যাবে |
