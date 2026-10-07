# Connect Tutors BD — connecttutorsbd.com Production Deployment Guide

> **প্রথমবার লাইভ করছেন?** একদম শুরু থেকে, কমান্ডসহ ধাপে ধাপে গাইড: [`DEPLOY_FROM_ZERO_BN.md`](DEPLOY_FROM_ZERO_BN.md)। এই ফাইলটা তার রেফারেন্স।

এই গাইড ধরে নিচ্ছে আপনি `connecttutorsbd.com`-এ থাকা পুরনো PHP সাইট সরিয়ে এই React/Node অ্যাপ্লিকেশন বসাচ্ছেন, এবং আপনার cPanel-এ **Node.js App setup ও SSH/Terminal access** দুটোই আছে।

## হোস্টিং প্ল্যানে Node.js/SSH "আছে" আর অ্যাপ চালানো এক জিনিস না

হোস্টিং প্ল্যানে Node.js সাপোর্ট থাকা মানে শুধু এটুকু যে cPanel-এ **Setup Node.js App** নামের অপশনটা আছে (সাধারণত cPanel-এর "Software" সেকশনে) — এটা PHP হোস্টিংয়ের থেকে আলাদা একটা ফিচার, আলাদা করে "চালু" (enable) করার কিছু নেই, কিন্তু **নতুন একটা Node.js অ্যাপ্লিকেশন এন্ট্রি বানাতে হয়** (নিচের ধাপ ২), তারপরই সেটা connecttutorsbd.com-এর জন্য রিকোয়েস্ট সার্ভ করা শুরু করবে। পুরনো PHP সাইট সরানোর (ধাপ ১) সাথে এই কাজটার কোনো নির্ভরতা নেই — দুটো আলাদা কাজ, যেকোনো ক্রমে করা যায়। SSH দিয়ে লগইন করে `node -v` চালিয়ে দেখুন Node.js পাওয়া যাচ্ছে কিনা — পেলে বুঝবেন হোস্টিং প্ল্যানে সাপোর্ট আছে, তারপর cPanel-এর **Setup Node.js App** পেজে গিয়ে ধাপ ২ অনুসরণ করুন।

## ০. এই ভার্সনে কী স্বাধীন (independent) হয়েছে

আগের ভার্সনে Admin login ও ছবি আপলোড (storage) Manus.im-এর নিজস্ব সার্ভিসের উপর নির্ভরশীল ছিল। এখন:

- **Admin login** — নিজস্ব email/password + বাধ্যতামূলক 2FA (authenticator app, TOTP), সম্পূর্ণ স্বাধীন। কোনো external OAuth লাগবে না। প্রতিটা Admin অ্যাকাউন্ট প্রথমবার সাইন-ইন করার পরই একটা authenticator app (Google Authenticator, Authy ইত্যাদি) দিয়ে 2FA সেটআপ করতে বাধ্য হবে — এটা এড়ানোর কোনো উপায় নেই, ওয়ার্কস্পেসে ঢোকার আগে করতেই হবে।
- **Guardian/Tutor login** — আগে থেকেই স্বাধীন ছিল, অপরিবর্তিত।
- **ছবি আপলোড (Guardian/Tutor profile photo)** — এখন আপনার নিজের সার্ভারের ডিস্কে সংরক্ষিত হয় (`private-uploads/` ফোল্ডার), কোনো external storage লাগবে না।
- **Google Maps, image-generation, voice-transcription** এর মতো কিছু optional feature এখনো Manus Forge API-এর উপর নির্ভরশীল, কিন্তু এগুলো মূল Guardian/Tutor/Admin workflow-এর জন্য জরুরি না — env var সেট না থাকলে শুধু সেই নির্দিষ্ট feature কাজ করবে না, বাকি সাইট স্বাভাবিকভাবে চলবে।
- **হোমপেজের ৩টা মার্কেটিং ছবি** (hero, home-learning, online-learning) এখন প্রজেক্টের ভেতরেই আছে (`client/public/images/*.webp`), build-এর সাথে চলে যায় — কোনো external storage লাগবে না।

## ১. পুরনো PHP সাইট রিমুভ

cPanel File Manager বা SSH দিয়ে `public_html` (বা connecttutorsbd.com-এর document root) থেকে পুরনো PHP সাইটের ফাইলগুলো মুছে ফেলুন। আপনি জানিয়েছেন এর ব্যাকআপ দরকার নেই। এই ধাপটা ধাপ ২-এর আগে-পরে যেকোনো সময় করা যায় — একটা আরেকটার উপর নির্ভর করে না।

## ২. cPanel-এ Node.js App তৈরি

cPanel-এর **Setup Node.js App**-এ যান:

- Node.js version: সার্ভারে যে LTS ভার্সন আছে তার সর্বশেষটা বেছে নিন (Node 20+ প্রস্তাবিত)
- Application mode: **Production**
- Application root: যেমন `connecttutorsbd_app` (document root-এর বাইরে একটা আলাদা ফোল্ডার — নিরাপত্তার জন্য গুরুত্বপূর্ণ, সোর্স কোড সরাসরি `public_html`-এ রাখবেন না)
- Application URL: `connecttutorsbd.com`
- Application startup file: `start.cjs`

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
| `JWT_SECRET` | আবশ্যক | একটা লম্বা, র‍্যান্ডম, গোপন string — কমপক্ষে ৩২ অক্ষর (session cookie ও Admin 2FA সাইনিং-এর জন্য)। না দিলে বা ছোট হলে সার্ভার চালুই হবে না, লগে কারণ লেখা থাকবে |
| `LOCAL_STORAGE_DIR` | ঐচ্ছিক | ছবি রাখার path, না দিলে ডিফল্ট `<app-root>/private-uploads` ব্যবহার হবে |
| `TELEGRAM_BOT_TOKEN` | ঐচ্ছিক | নতুন request notification পেতে চাইলে |
| `TELEGRAM_CHAT_ID` | ঐচ্ছিক | উপরেরটার সাথে জোড়ায় লাগে |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | ঐচ্ছিক | শুধু Google Maps-এর মতো optional feature চালু রাখতে চাইলে |
| `OWNER_OPEN_ID` | **আবশ্যক** | ধাপ ৭-এর owner-admin স্ক্রিপ্ট এটা প্রিন্ট করে দেয়; না দিলে কেউ Owner-only পেজ (Admin Security, Dynamic Section) দেখতে পাবে না |
| `SMS_API_KEY` / `SMS_SENDER_ID` | **আবশ্যক (লাইভে)** | BulkSMSBD-র কী ও Sender ID। Guardian/Tutor রেজিস্ট্রেশনের কোড, লগইন কোড আর পাসওয়ার্ড রিসেটের এসএমএস এদের উপর নির্ভর করে। লাইভে (`NODE_ENV=production`) এগুলো না থাকলে কোড আর যায় না, রেজিস্ট্রেশনই আটকে যায় — শুধু সার্ভার চালু হওয়ার সময় লগে সতর্কবার্তা আসে |
| `SMS_API_URL` | ঐচ্ছিক | না দিলে ডিফল্ট `https://bulksmsbd.net/api/smsapi` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | আবশ্যক (ফোনের পুশ নোটিফিকেশনের জন্য) | `pnpm exec web-push generate-vapid-keys` দিয়ে একবার বানান। না থাকলে লক স্ক্রিনে নোটিফিকেশন যায় না, আর Settings-এর Notifications সুইচ লুকানো থাকে। পরে বদলালে সবার সাবস্ক্রিপশন বাতিল হয় |
| `VAPID_SUBJECT` | ঐচ্ছিক | `mailto:ইমেইল`; না দিলে `mailto:support@connecttutorsbd.com` |
| `OTP_DEV_LOG` | **লাইভে দেবেন না** | `true` দিলে কোড এসএমএসে না গিয়ে শুধু লগে প্রিন্ট হয় — ডেভেলপমেন্টের জন্য |
| `PUBLIC_SITE_URL` | ঐচ্ছিক | Confirmation Letter-এর QR কোডে যাওয়ার লিংক, আর `robots.txt`/`sitemap.xml`-এর ঠিকানা; না দিলে ডিফল্ট `https://connecttutorsbd.com`। শুধু এই ঠিকানার ডোমেইনে সার্চ ইঞ্জিনকে ঢুকতে দেওয়া হয়, অন্য কোনো হোস্টে (staging, লোকাল) সব বন্ধ |
| `OAUTH_SERVER_URL`, `VITE_APP_ID` | আর প্রয়োজন নেই | Admin login এখন password-based, এগুলো বাদ দিতে পারেন |

`JWT_SECRET` তৈরি করতে (SSH-এ):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## ৬. Database migration ও ক্যাটালগ ডেটা

লাইভের জন্য একটা **নতুন, খালি** MySQL database ব্যবহার করুন (পুরনো ডেমো ডেটা সহ লোকাল database লাইভে তুলবেন না)।

```bash
pnpm run db:migrate
pnpm run db:seed:locations
pnpm run db:seed:tutor-profile-catalog
```

প্রথম কমান্ড ১০৯টা migration চালিয়ে সব টেবিল বানায় (স্কুল-কলেজের তালিকাও এর সাথেই আসে)। পরের দুটো এলাকার তালিকা (বিভাগ → জেলা → এলাকা) আর টিউটর প্রোফাইলের ক্যাটালগ (বিশ্ববিদ্যালয়, বিভাগ/বিষয়, ক্লাস, কারিকুলাম) ভরে — এগুলো না চালালে রেজিস্ট্রেশন ফর্মে এলাকা বা বিশ্ববিদ্যালয় বাছাই করার তালিকা ফাঁকা থাকবে। দুটোই বারবার চালালেও কিছু দ্বিগুণ হয় না।

> `seed` কমান্ডগুলো `tsx` দিয়ে চলে, যেটা dev-dependency। `pnpm install` যদি `NODE_ENV=production` সেট থাকা অবস্থায় চালান, তাহলে dev-dependency নামবে না — তখন `pnpm install --frozen-lockfile --prod=false` ব্যবহার করুন।


**প্রথমবার হলে** পুরো schema তৈরি হবে; আগে থেকে migration চালানো database-এ শুধু নতুন পরিবর্তনগুলো (যেমন `isOwner` কলাম) যোগ হবে। Migration চালানোর আগে database backup নিন।

## ৭. প্রথম Owner Admin অ্যাকাউন্ট তৈরি

এটাই আপনার একমাত্র "root" Admin অ্যাকাউন্ট — সরাসরি database access লাগে বলে এটা নিরাপদ, কারও পাবলিক সাইন-আপ ফর্ম দিয়ে Owner Admin বানানো যায় না।

```bash
cd ~/connecttutorsbd_app
DATABASE_URL="আপনার-DATABASE_URL" pnpm run db:seed:owner-admin
```

স্ক্রিপ্টটা একটা **User ID** (৩-৬৪ অক্ষর, অক্ষর দিয়ে শুরু) আর পাসওয়ার্ড জিজ্ঞেস করবে, নাম-ইমেইল ঐচ্ছিক (অথবা সব `--user-id`, `--password`, `--name`, `--email` flag দিয়েও দেওয়া যায়)। সাইন-ইন হয় এই User ID দিয়ে, ইমেইল দিয়ে না। স্ক্রিপ্ট শেষে একটা `OWNER_OPEN_ID=...` লাইন দেখাবে — সেটা `.env`-এ যোগ করে অ্যাপ রিস্টার্ট করলে তবেই এই অ্যাকাউন্ট Owner-only পেজগুলো (Admin Security, Dynamic Section ইত্যাদি) দেখতে পাবে। এরপর `https://connecttutorsbd.com/admin/login`-এ গিয়ে সাইন-ইন করে বাধ্যতামূলক 2FA (authenticator app) সেটআপ করবেন — সেটআপ শেষ না করলে ওয়ার্কস্পেসে ঢোকা যাবে না।

## ৮. Node App চালু করা

cPanel Node.js App পেজে **Restart** চাপুন। Application URL (`connecttutorsbd.com`) খুলে দেখুন সাইট লোড হচ্ছে কিনা।

## ৯. HTTPS

Let's Encrypt দিয়ে SSL active করুন, তারপর Force HTTPS Redirect চালু করুন।

## ১০. যাচাই তালিকা (Minimum verification checklist)

1. `https://connecttutorsbd.com` HTTPS warning ছাড়া খোলে
2. Public Home, Job Board, location filters কাজ করে
3. Guardian/Tutor registration ও sign-in flow কাজ করে
4. `/admin/login`-এ User ID/পাসওয়ার্ড দিয়ে সাইন-ইন করলে সরাসরি `/admin/2fa-setup`-এ যায়; QR কোড স্ক্যান করে ৬-অঙ্কের কোড দিলে ১০টা recovery code দেখায় এবং workspace-এ ঢুকতে দেয়
5. সাইন আউট করে আবার সাইন-ইন করলে এবার `/admin/2fa-challenge`-এ যায় (নতুন করে QR কোড না দেখিয়ে), এবং authenticator app-এর কোড দিলে workspace খোলে
6. Guardian request submission database-এ persist হয়
7. Guardian/Tutor profile photo আপলোড করে দেখুন — `private-uploads/` ফোল্ডারে ফাইল তৈরি হচ্ছে কিনা যাচাই করুন
8. Telegram notification কনফিগার করে থাকলে সেটা কাজ করছে কিনা যাচাই করুন
9. `https://connecttutorsbd.com/healthz` খুললে `{"status":"ok"}` আসে (ডেটাবেস না পেলে `503`)। এই ঠিকানা UptimeRobot-এর মতো কোনো মনিটরে দিলে সাইট বন্ধ হলে আপনাকে জানাবে
10. `https://connecttutorsbd.com/robots.txt` খুললে `Disallow:`-এর একটা তালিকা আর `Sitemap:` লাইন থাকবে। যদি শুধু `Disallow: /` দেখায়, সার্ভার আসল ডোমেইনটা চিনতে পারছে না — তাহলে সার্চ ইঞ্জিন সাইটটা সূচিতে তুলবে না, `PUBLIC_SITE_URL` ঠিক করুন
11. `https://connecttutorsbd.com/sitemap.xml` খুললে পাবলিক পেজগুলোর তালিকা আসে

## ১১. লাইভের পরে ধাপে ধাপে (এই ক্রমে)

1. **মনিটর:** `/healthz` UptimeRobot-এ দিন।
2. **টেস্ট এসএমএস:** BulkSMSBD-র প্যানেলে লাইভ সার্ভারের IP whitelist করুন (লোকাল কম্পিউটারের IP-তে কাজ করলেও লাইভ সার্ভারে আলাদা করে করতে হয়), তারপর নিজের নম্বরে একটা Guardian রেজিস্ট্রেশন চালিয়ে কোড আসে কিনা দেখুন।
3. **লগইন OTP সুইচ:** ধাপ ২ সফল হলে তবেই Admin Panel > Dynamic Section > Admin Control থেকে "Tutor and Guardian sign-in code" **On** করুন। আগে On করলে এসএমএস না গেলে সব Tutor/Guardian আটকে যাবে।
4. **Owner অ্যাকাউন্ট:** `/admin/login` দিয়ে ঢুকে 2FA সেটআপ করুন, ১০টা recovery code নিরাপদ জায়গায় রাখুন।

## ১২. নতুন Admin বানানো ও পরিচালনা (শুধু Owner)

ইনভাইট লিংক নেই। Owner নিজের Admin Panel থেকেই সরাসরি নতুন Admin বানান:

1. Owner হিসেবে সাইন-ইন করে **Admin security** পেজে যান (`/admin/security`)।
2. **Create an Admin** ফর্মে User ID (৩–৬৪ অক্ষর, অক্ষর দিয়ে শুরু), পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর) দিন; নাম ও ইমেইল চাইলে দিন। **Create Admin** চাপুন।
3. User ID ও এই প্রথম পাসওয়ার্ড নতুন Admin-কে নিরাপদ মাধ্যমে (সরাসরি বা ফোনে) জানান। কখনো পাবলিক চ্যাটে নয়।
4. নতুন Admin `/admin/login`-এ সাইন-ইন করলে প্রথমেই **নিজের পাসওয়ার্ড বেছে নিতে** হবে (Owner-এর দেওয়া পাসওয়ার্ড তখন আর চলবে না), তারপর authenticator app দিয়ে 2FA সেটআপ। এই দুটো না করে ওয়ার্কস্পেসের কোনো কাজ করা যায় না।

একই পেজ থেকে পরে করা যায়:

- **Reset credentials** — User ID বা পাসওয়ার্ড বদলানো। অন্য Admin-এর ক্ষেত্রে সে আবার নিজের পাসওয়ার্ড বেছে নিতে বাধ্য হয়।
- **Reset 2FA** — ফোন হারালে নতুন QR কোড দিয়ে আবার সেটআপ।
- **Revoke role** — Admin-এর অ্যাক্সেস বাতিল। Owner নিজেকে বাতিল করতে পারেন না।
- সব কাজ নিচের অডিট লগে থাকে।

Guardian বা Tutor পাসওয়ার্ড ভুললে যে কোনো Admin তার জন্য রিসেট লিংক বানাতে পারে। প্রথম Owner অ্যাকাউন্ট শুধু সার্ভার থেকে `db:seed:owner-admin` দিয়ে (ধাপ ৭), সেখানে `OWNER_OPEN_ID` বসাতে হয়; অতিরিক্ত Admin বানাতে ওই স্ক্রিপ্ট আর লাগে না।

## ১৩. গুরুত্বপূর্ণ নিরাপত্তা নোট

- `private-uploads/` ফোল্ডার application root-এর বাইরে বা অন্তত `public_html`-এর বাইরে রাখুন, যাতে কেউ ফাইল ম্যানেজার URL দিয়ে সরাসরি ব্রাউজ করতে না পারে।
- `.env` বা environment variable-এর মান কখনো ZIP, screenshot, বা public repository-তে শেয়ার করবেন না।
- `DATABASE_URL`, `JWT_SECRET` — এই দুটো leak হলে সাথে সাথে rotate করুন। `JWT_SECRET` বদলালে প্রতিটা Admin-কে নতুন করে 2FA সেটআপ করতে হবে (পুরনো QR কোড আর কাজ করবে না) — তাই এটা যতটা সম্ভব একবারই ঠিক করে ফেলুন।
- **2FA-তে লক আউট হলে:** প্রথমে setup-এর সময় দেখানো ১০টা recovery code দিয়ে সাইন-ইন করুন (প্রতিটা একবার কাজ করে)। একাধিক Admin থাকলে Owner অন্য কারো 2FA "Admin security" পেজ থেকে রিসেট করে দিতে পারবেন। Owner নিজেই ফোন আর recovery code দুটোই হারালে, শেষ উপায় `admin_two_factor_settings` টেবিল থেকে সরাসরি database-এ ওই userId-র row-টা মুছে ফেলা — এরপর `/admin/login`-এ সাইন-ইন করলে আবার নতুন QR কোড থেকে সেটআপ শুরু হবে।
