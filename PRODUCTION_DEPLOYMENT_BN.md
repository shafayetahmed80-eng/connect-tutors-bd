# Connect Tutors BD — connecttutorsbd.com Production Deployment Guide

এই গাইড ধরে নিচ্ছে আপনি `connecttutorsbd.com`-এ থাকা পুরনো static HTML সাইট সরিয়ে এই React/Node অ্যাপ্লিকেশন বসাচ্ছেন, এবং আপনার cPanel-এ **Node.js App setup ও SSH/Terminal access** দুটোই আছে।

## ০. এই ভার্সনে কী স্বাধীন (independent) হয়েছে

আগের ভার্সনে Admin login ও ছবি আপলোড (storage) Manus.im-এর নিজস্ব সার্ভিসের উপর নির্ভরশীল ছিল। এখন:

- **Admin login** — নিজস্ব email/password + বাধ্যতামূলক 2FA (authenticator app), সম্পূর্ণ স্বাধীন। কোনো external OAuth লাগবে না।
- **Guardian/Tutor login** — আগে থেকেই স্বাধীন ছিল, অপরিবর্তিত।
- **ছবি আপলোড (Guardian/Tutor profile photo)** — এখন আপনার নিজের সার্ভারের ডিস্কে সংরক্ষিত হয় (`private-uploads/` ফোল্ডার), কোনো external storage লাগবে না।
- **Google Maps, image-generation, voice-transcription** এর মতো কিছু optional feature এখনো Manus Forge API-এর উপর নির্ভরশীল, কিন্তু এগুলো মূল Guardian/Tutor/Admin workflow-এর জন্য জরুরি না — env var সেট না থাকলে শুধু সেই নির্দিষ্ট feature কাজ করবে না, বাকি সাইট স্বাভাবিকভাবে চলবে।
- **হোমপেজের ৩টা মার্কেটিং ছবি** (hero, home-learning, home-online illustration) পুরনো Forge storage-এ রাখা ছিল। যদি আপনার Manus প্রজেক্ট এখনো active থাকে, এগুলো fallback হিসেবে এখনো দেখাবে। independent করতে চাইলে এই ৩টা ছবি ডাউনলোড করে আমাকে দিন, আমি স্থায়ীভাবে প্রজেক্টের ভেতরে bundle করে দেবো।

## ১. পুরনো static সাইট রিমুভ

cPanel File Manager বা SSH দিয়ে `public_html` (বা connecttutorsbd.com-এর document root) থেকে পুরনো static HTML ফাইলগুলো মুছে ফেলুন। আপনি জানিয়েছেন এর ব্যাকআপ দরকার নেই।

## ২. cPanel-এ Node.js App তৈরি

cPanel-এর **Setup Node.js App**-এ যান:

- Node.js version: সার্ভারে যে LTS ভার্সন আছে তার সর্বশেষটা বেছে নিন (Node 20+ প্রস্তাবিত)
- Application mode: **Production**
- Application root: যেমন `connecttutorsbd_app` (document root-এর বাইরে একটা আলাদা ফোল্ডার — নিরাপত্তার জন্য গুরুত্বপূর্ণ, সোর্স কোড সরাসরি `public_html`-এ রাখবেন না)
- Application URL: `connecttutorsbd.com`
- Application startup file: `dist/index.js`

## ৩. কোড আপলোড

SSH দিয়ে:

```bash
cd ~/connecttutorsbd_app
# ZIP আপলোড করে থাকলে:
unzip connect-tutors-bd-complete-*.zip -d .
```

## ৪. Dependencies ও build

```bash
cd ~/connecttutorsbd_app
pnpm install --frozen-lockfile
pnpm run build
```

`pnpm` না থাকলে cPanel-এর Node.js App terminal-এ `npm install -g pnpm` চালান, অথবা `npm install && npm run build` ব্যবহার করুন।

## ৫. Environment variables

cPanel Node.js App-এর **Environment Variables** section-এ যোগ করুন:

| Variable | প্রয়োজনীয়তা | মান |
|---|---|---|
| `NODE_ENV` | আবশ্যক | `production` |
| `DATABASE_URL` | আবশ্যক | আপনার production MySQL connection string |
| `JWT_SECRET` | আবশ্যক | একটা লম্বা, র‍্যান্ডম, গোপন string (session cookie ও Admin 2FA সাইনিং-এর জন্য) |
| `LOCAL_STORAGE_DIR` | ঐচ্ছিক | ছবি রাখার path, না দিলে ডিফল্ট `<app-root>/private-uploads` ব্যবহার হবে |
| `TELEGRAM_BOT_TOKEN` | ঐচ্ছিক | নতুন request notification পেতে চাইলে |
| `TELEGRAM_CHAT_ID` | ঐচ্ছিক | উপরেরটার সাথে জোড়ায় লাগে |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | ঐচ্ছিক | শুধু legacy homepage ছবি ও Google Maps-এর মতো optional feature চালু রাখতে চাইলে |
| `OAUTH_SERVER_URL`, `VITE_APP_ID`, `OWNER_OPEN_ID` | আর প্রয়োজন নেই | Admin login এখন password-based, এগুলো বাদ দিতে পারেন |

`JWT_SECRET` তৈরি করতে (SSH-এ):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## ৬. Database migration

```bash
pnpm run db:migrate
```

**প্রথমবার হলে** পুরো schema তৈরি হবে; আগে থেকে migration চালানো database-এ শুধু নতুন পরিবর্তনগুলো (যেমন `isOwner` কলাম) যোগ হবে। Migration চালানোর আগে database backup নিন।

## ৭. প্রথম Owner Admin অ্যাকাউন্ট তৈরি

এটাই আপনার একমাত্র "root" Admin অ্যাকাউন্ট — সরাসরি database access লাগে বলে এটা নিরাপদ, কারও পাবলিক সাইন-আপ ফর্ম দিয়ে Owner Admin বানানো যায় না।

```bash
cd ~/connecttutorsbd_app
DATABASE_URL="আপনার-DATABASE_URL" pnpm run db:seed:owner-admin
```

স্ক্রিপ্টটা আপনার নাম, ইমেইল, আর পাসওয়ার্ড জিজ্ঞেস করবে (অথবা `--name`, `--email`, `--password` flag দিয়েও দিতে পারেন)। এরপর `https://connecttutorsbd.com/admin/login`-এ গিয়ে সাইন-ইন করে বাধ্যতামূলক 2FA (authenticator app) সেটআপ করবেন।

## ৮. Node App চালু করা

cPanel Node.js App পেজে **Restart** চাপুন। Application URL (`connecttutorsbd.com`) খুলে দেখুন সাইট লোড হচ্ছে কিনা।

## ৯. HTTPS

Let's Encrypt দিয়ে SSL active করুন, তারপর Force HTTPS Redirect চালু করুন।

## ১০. যাচাই তালিকা (Minimum verification checklist)

1. `https://connecttutorsbd.com` HTTPS warning ছাড়া খোলে
2. Public Home, Job Board, location filters কাজ করে
3. Guardian/Tutor registration ও sign-in flow কাজ করে
4. `/admin/login`-এ ইমেইল/পাসওয়ার্ড দিয়ে সাইন-ইন করে 2FA সেটআপ ও ভেরিফাই করা যায়
5. Guardian request submission database-এ persist হয়
6. Guardian/Tutor profile photo আপলোড করে দেখুন — `private-uploads/` ফোল্ডারে ফাইল তৈরি হচ্ছে কিনা যাচাই করুন
7. Telegram notification কনফিগার করে থাকলে সেটা কাজ করছে কিনা যাচাই করুন

## ১১. গুরুত্বপূর্ণ নিরাপত্তা নোট

- `private-uploads/` ফোল্ডার application root-এর বাইরে বা অন্তত `public_html`-এর বাইরে রাখুন, যাতে কেউ ফাইল ম্যানেজার URL দিয়ে সরাসরি ব্রাউজ করতে না পারে।
- `.env` বা environment variable-এর মান কখনো ZIP, screenshot, বা public repository-তে শেয়ার করবেন না।
- `DATABASE_URL`, `JWT_SECRET` — এই দুটো leak হলে সাথে সাথে rotate করুন।
