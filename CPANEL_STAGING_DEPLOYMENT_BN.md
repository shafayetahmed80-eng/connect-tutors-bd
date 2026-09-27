# Connect Tutors BD — cPanel Staging Deployment Guide

এই গাইড `staging.connecttutorsbd.com`-এর মতো আলাদা subdomain-এ পরীক্ষামূলক deployment-এর জন্য। Existing live website-এর document root এবং production database কখনো ব্যবহার করবেন না — সবকিছু আলাদা: আলাদা folder, আলাদা database, আলাদা Node.js App entry।

বিস্তারিত ধাপ, environment variable-এর পুরো তালিকা এবং নিরাপত্তা নোটের জন্য দেখুন **`PRODUCTION_DEPLOYMENT_BN.md`** — এই গাইড শুধু staging-নির্দিষ্ট পার্থক্যগুলো ধরে।

## ১. cPanel application configuration

cPanel-এর **Setup Node.js App** থেকে নতুন application তৈরি করুন (production অ্যাপ থেকে সম্পূর্ণ আলাদা একটা এন্ট্রি)। Application root হিসেবে subdomain-এর আলাদা folder ব্যবহার করুন। Application startup file: `dist/index.js`।

## ২. Dependencies ও build

SSH বা cPanel Terminal-এ project root-এ গিয়ে:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

`pnpm` না থাকলে `npm install && npm run build` ব্যবহার করা যায়, তবে lockfile consistency বজায় রাখতে `pnpm` preferred।

## ৩. Environment variables

cPanel Node.js App-এর **Environment Variables** section-এ staging-নির্দিষ্ট মান দিন — production-এর মানগুলো এখানে কপি করবেন না:

| Variable | প্রয়োজনীয়তা | মান |
|---|---|---|
| `NODE_ENV` | আবশ্যক | `production` |
| `DATABASE_URL` | আবশ্যক | staging-এর নিজস্ব, isolated MySQL database — production database নয় |
| `JWT_SECRET` | আবশ্যক | staging-এর নিজস্ব র‍্যান্ডম secret, production-এরটা থেকে আলাদা |
| `OWNER_OPEN_ID` | আবশ্যক | staging-এ আলাদা করে বানানো owner-admin অ্যাকাউন্টের openId (ধাপ ৫) |
| `LOCAL_STORAGE_DIR` | ঐচ্ছিক | ছবি রাখার path; না দিলে ডিফল্ট `<app-root>/private-uploads` |
| `SMS_API_URL` / `SMS_API_KEY` / `SMS_SENDER_ID` | ঐচ্ছিক | staging-এ আসল SMS পাঠাতে না চাইলে বাদ দিন — কোড তখন সার্ভার লগে প্রিন্ট হয় |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | ঐচ্ছিক | staging notification আলাদা চ্যাটে পাঠাতে চাইলে production থেকে আলাদা bot/chat ব্যবহার করুন |

`OAUTH_SERVER_URL`, `VITE_APP_ID`-এর প্রয়োজন নেই — Admin ও Tutor/Guardian login দুটোই password-based, কোনো external OAuth provider বা callback URL configure করার কিছু নেই।

Secret values কখনো ZIP, source file, screenshot, বা Git repository-তে রাখবেন না।

## ৪. Database migration

নতুন staging MySQL database তৈরি করে `DATABASE_URL` সেট করার পর:

```bash
pnpm run db:migrate
```

Production database-এ migration চালাবেন না। Migration-এর আগে database name দুবার যাচাই করুন।

## ৫. প্রথম staging Owner Admin অ্যাকাউন্ট

```bash
DATABASE_URL="staging-এর DATABASE_URL" pnpm run db:seed:owner-admin
```

স্ক্রিপ্ট একটা User ID আর পাসওয়ার্ড জিজ্ঞেস করবে, শেষে একটা `OWNER_OPEN_ID=...` প্রিন্ট করবে — সেটা `.env`/cPanel environment variable-এ বসিয়ে অ্যাপ রিস্টার্ট করুন। `https://staging.connecttutorsbd.com/admin/login`-এ সাইন-ইন করে বাধ্যতামূলক 2FA (authenticator app) সেটআপ করবেন — এটা production-এর থেকে সম্পূর্ণ আলাদা এনরোলমেন্ট, production-এর QR কোড staging-এ কাজ করবে না।

## ৬. Storage ও ছবি আপলোড

Guardian/Tutor প্রোফাইল ছবি সার্ভারের নিজের ডিস্কে (`private-uploads/`) সংরক্ষিত হয় — কোনো external storage লাগে না। Public document root-এর বাইরে রাখুন, যাতে ফাইল ম্যানেজার URL দিয়ে সরাসরি ব্রাউজ করা না যায়। ছবি আপলোড হওয়ার সাথে সাথেই প্রোফাইলে দেখা যায়; আলাদা কোনো Admin অনুমোদনের ধাপ নেই।

## ৭. HTTPS ও Passenger restart

Subdomain-এর জন্য trusted Let's Encrypt certificate active করুন। SSL active হওয়ার পর Force HTTPS Redirect চালু করুন। Environment variable বা কোড পরিবর্তনের পর cPanel Node.js App থেকে **Restart** চাপুন।

## ৮. Minimum verification checklist

1. `https://staging.connecttutorsbd.com` HTTPS warning ছাড়া খোলে।
2. Public Home, Job Board, location filters এবং navigation কাজ করে।
3. Guardian/Tutor registration ও sign-in flow পরীক্ষা করা হয়।
4. `/admin/login`-এ সাইন-ইন করলে 2FA setup/challenge হয়ে তারপর workspace খোলে।
5. Guardian request submission staging database-এ persist হয় — production database অপরিবর্তিত থাকে।
6. Guardian/Tutor profile photo আপলোড করে দেখুন — `private-uploads/` ফোল্ডারে ফাইল তৈরি হচ্ছে কিনা যাচাই করুন।
7. Telegram notification কনফিগার করে থাকলে সেটা staging-এর নিজের bot/chat-এ যাচ্ছে কিনা যাচাই করুন, production-এর নয়।
