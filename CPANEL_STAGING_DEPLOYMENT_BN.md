# Connect Tutors BD — cPanel Staging Deployment Guide

এই প্যাকেজটি `staging.connecttutorsbd.com`-এর মতো আলাদা subdomain-এ পরীক্ষামূলক deployment-এর জন্য প্রস্তুত করা হয়েছে। Existing live website-এর document root এবং production database ব্যবহার করবেন না।

## ১. Package contents

এই ZIP-এ source code, client/server code, Drizzle schema ও migrations, package manifest, এবং production build output থাকবে। `node_modules`, `.git`, runtime logs, test output, এবং কোনো `.env` বা secret value থাকবে না।

## ২. cPanel application configuration

cPanel-এর **Setup Node.js App** থেকে নতুন application তৈরি করুন। Application root হিসেবে subdomain-এর আলাদা folder ব্যবহার করুন। Project-এর `package.json`-এ থাকা start command হলো:

```bash
NODE_ENV=production node dist/index.js
```

Application-এর startup file হিসেবে cPanel field-এ সাধারণত `dist/index.js` দিন। cPanel যদি startup file-এ relative path গ্রহণ না করে, hosting provider-এর Passenger documentation অনুযায়ী application root-এর relative path ব্যবহার করুন।

Node.js version হিসেবে hosting provider-এর available supported LTS version ব্যবহার করুন। Project dependencies install করার পর production build না করলে `dist/index.js` পুনরায় তৈরি হবে না।

## ৩. Dependencies ও build

SSH বা cPanel Terminal-এ project root-এ গিয়ে dependency install করুন:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

যদি hosting account-এ `pnpm` না থাকে, provider-এর Node package manager support অনুযায়ী `npm install` ব্যবহার করা যেতে পারে। তবে lockfile consistency বজায় রাখতে `pnpm` ব্যবহার করাই preferred।

## ৪. Required environment variables

এই values ZIP-এ নেই। cPanel Node.js App-এর **Environment Variables** section-এ staging-specific values দিন:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | নতুন, isolated staging MySQL database connection string |
| `JWT_SECRET` | staging session signing secret |
| `VITE_APP_ID` | OAuth application identifier |
| `OAUTH_SERVER_URL` | OAuth backend URL |
| `VITE_OAUTH_PORTAL_URL` | frontend login portal URL |
| `OWNER_OPEN_ID` | project owner identity |
| `OWNER_NAME` | project owner display name |
| `BUILT_IN_FORGE_API_URL` | built-in storage/notification API base URL, if used in this deployment |
| `BUILT_IN_FORGE_API_KEY` | server-side built-in API credential |
| `VITE_FRONTEND_FORGE_API_URL` | frontend built-in API base URL, if used |
| `VITE_FRONTEND_FORGE_API_KEY` | frontend built-in API credential, if used |
| `TELEGRAM_BOT_TOKEN` | Admin notification bot token |
| `TELEGRAM_CHAT_ID` | Admin notification destination |

Secret values কখনো ZIP, source file, screenshot, বা Git repository-তে রাখবেন না।

## ৫. Database migration

নতুন staging MySQL database তৈরি করে `DATABASE_URL` সেট করার পর project root-এ migration চালান:

```bash
pnpm run db:migrate
```

Production database-এ migration চালাবেন না। Migration-এর আগে database backup এবং database name দুবার যাচাই করুন।

## ৬. Storage ও Guardian photo workflow

Guardian photo feature private S3-compatible storage-এর উপর নির্ভরশীল। Hosting environment-এ storage credentials এবং endpoint সঠিকভাবে configured না থাকলে photo upload বা Admin moderation workflow কাজ করবে না। Public website folder-এ user-uploaded photo রাখবেন না।

## ৭. OAuth callback

Staging URL আলাদা হওয়ায় OAuth provider-এ staging callback/redirect URL অনুমোদিত থাকতে হবে। সাধারণত callback path হবে:

```text
https://staging.connecttutorsbd.com/api/oauth/callback
```

আপনার OAuth provider-এর configuration-এ exact HTTPS URL যোগ না করলে login callback ব্যর্থ হতে পারে।

## ৮. HTTPS ও Passenger restart

Subdomain-এর জন্য trusted Let’s Encrypt certificate active করুন। Self-signed certificate ব্যবহার করবেন না। SSL active হওয়ার পর Force HTTPS Redirect চালু করুন। Environment variable বা application code পরিবর্তনের পর cPanel Node.js App থেকে **Restart** চাপুন।

## ৯. Minimum verification checklist

1. `https://staging.connecttutorsbd.com` HTTPS warning ছাড়া খোলে।
2. Public Home, Job Board, location filters এবং navigation কাজ করে।
3. Guardian/Tutor registration ও sign-in flow পরীক্ষা করা হয়।
4. Guardian request submission staging database-এ persist হয়।
5. Admin route ও mandatory TOTP gate পরীক্ষা করা হয়।
6. Guardian photo upload private storage-এ যায় এবং approved না হওয়া পর্যন্ত public identity surface-এ দেখা যায় না।
7. Telegram notification configuration থাকলে safe delivery/fallback যাচাই করা হয়।
8. Existing live website এবং production database অপরিবর্তিত থাকে।

## ১০. Important deployment boundary

এই ZIP application files দেয়; এটি নিজে cPanel DNS, SSL, database, OAuth provider, S3 storage, বা Telegram credentials configure করে না। এগুলো staging environment-এ আলাদা করে configure করতে হবে।
