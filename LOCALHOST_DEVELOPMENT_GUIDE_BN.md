# Connect Tutors BD: লোকালহোস্ট ও ভবিষ্যৎ ডেভেলপমেন্ট গাইড

এই গাইডটি **Connect Tutors BD** ওয়েবসাইটটি নিজের Windows কম্পিউটারে চালানো, পরিবর্তন করা, পরীক্ষা করা এবং পরে হোস্টিংয়ে নেওয়ার জন্য তৈরি করা হয়েছে। বর্তমান প্রজেক্টটি **React + Vite** ফ্রন্টএন্ড, **Node.js/Express** সার্ভার এবং ভবিষ্যৎ ডেটাবেস ব্যবহারের উপযোগী কাঠামোয় তৈরি। তাই এটি চালানোর মূল পদ্ধতি হলো **Node.js**, XAMPP নয়।

> **সংক্ষিপ্ত সিদ্ধান্ত:** শুধু বর্তমান সাইটটি চালানো ও পরিবর্তনের জন্য Node.js ব্যবহার করুন। XAMPP শুধুমাত্র তখন প্রয়োজন হবে যখন PHP বা phpMyAdmin দিয়ে আলাদা PHP/MySQL কোড চালানোর সিদ্ধান্ত নেবেন।

## 1. শুরু করার আগে যা লাগবে

| সফটওয়্যার | প্রয়োজনীয় সংস্করণ | কেন লাগবে |
|---|---:|---|
| Node.js | 20 LTS বা নতুন | React/Vite development server ও Node backend চালাতে |
| pnpm | 10 বা নতুন | প্রজেক্টের package manager |
| VS Code | সর্বশেষ | কোড সম্পাদনা করতে |
| Git | সর্বশেষ | কোড ব্যাকআপ, history ও deployment workflow-এর জন্য |
| XAMPP | ঐচ্ছিক | শুধু PHP/MySQL/phpMyAdmin দরকার হলে |

প্রথমে [Node.js LTS](https://nodejs.org/) এবং [Git](https://git-scm.com/downloads) ইনস্টল করুন। এরপর PowerShell অথবা Command Prompt খুলে নিচের কমান্ড চালান।

```powershell
node -v
npm -v
npm install -g pnpm
pnpm -v
git --version
```

প্রতিটি কমান্ড সংস্করণ নম্বর দেখালে ইনস্টলেশন সম্পন্ন। `node -v` কাজ না করলে Node.js ইনস্টলের পর টার্মিনাল বন্ধ করে নতুন করে খুলুন।

## 2. ZIP ফাইল থেকে প্রজেক্ট প্রস্তুত করা

আপনাকে দেওয়া `connect-tutors-bd-english.zip` ফাইলটি একটি স্থায়ী ডেভেলপমেন্ট ফোল্ডারে extract করুন। উদাহরণ হিসেবে `C:\Projects\connect-tutors-bd` ব্যবহার করা হলো। `Desktop` বা `Downloads`-এ দীর্ঘমেয়াদি কাজ না করাই ভালো।

```powershell
mkdir C:\Projects
cd C:\Projects
# ZIP ফাইলটি এখানে extract করে ফোল্ডারের নাম রাখুন connect-tutors-bd
cd .\connect-tutors-bd
```

ফোল্ডারের ভেতরে অন্তত `client`, `server`, `shared`, `package.json`, `pnpm-lock.yaml` এবং `vite.config.ts` আছে কি না যাচাই করুন। এরপর সব dependency ইনস্টল করুন।

```powershell
pnpm install
```

প্রথমবারে কয়েক মিনিট সময় লাগতে পারে। `node_modules` ফোল্ডার তৈরি হলে সেটি zip বা Git-এ সংরক্ষণ করার প্রয়োজন নেই।

## 3. লোকালহোস্টে সাইট চালানো

প্রজেক্ট ফোল্ডার থেকেই development server চালান।

```powershell
pnpm dev
```

টার্মিনালে সাধারণত নিচের মতো একটি ঠিকানা আসবে।

```text
Local: http://localhost:3000/
```

ব্রাউজারে `http://localhost:3000` খুলুন। ফাইল save করার সাথে সাথে Vite স্বয়ংক্রিয়ভাবে পেজ refresh করবে; আলাদা build চালানোর প্রয়োজন হবে না। সার্ভার বন্ধ করতে টার্মিনালে `Ctrl + C` চাপুন।

| কাজ | কমান্ড |
|---|---|
| Development server চালু | `pnpm dev` |
| TypeScript ত্রুটি পরীক্ষা | `pnpm check` |
| Production build তৈরি | `pnpm build` |
| Production server চালু | `pnpm start` |
| কোড format করা | `pnpm format` |

## 4. XAMPP কোথায় ব্যবহার করবেন

বর্তমান অ্যাপটি React/Node ভিত্তিক। তাই **XAMPP-এর Apache `htdocs`-এ source code কপি করে চালানো ঠিক নয়**। এতে JSX, TypeScript এবং Node backend কাজ করবে না।

তবে XAMPP আপনার কাজে আসতে পারে দুইভাবে। প্রথমত, আপনি যদি একেবারে আলাদা PHP ভিত্তিক admin panel বা legacy API বানান। দ্বিতীয়ত, আপনি phpMyAdmin দিয়ে নিজস্ব local MySQL database দেখতে চান। কিন্তু বর্তমান Node backend-এর জন্য MySQL চালাতে চাইলে XAMPP-এর MySQL service ব্যবহার করা সম্ভব হলেও app চালাতে তবুও `pnpm dev` ব্যবহার করতে হবে।

### XAMPP MySQL ব্যবহার করলে

1. XAMPP Control Panel খুলে **MySQL** চালু করুন।
2. `http://localhost/phpmyadmin` খুলুন।
3. একটি database তৈরি করুন, যেমন `connect_tutors_bd`।
4. প্রজেক্টে `.env` নামে একটি local-only ফাইল তৈরি করুন।
5. প্রকৃত username/password বসিয়ে database URL যোগ করুন।

```env
DATABASE_URL=mysql://root:YOUR_PASSWORD@127.0.0.1:3306/connect_tutors_bd
```

> `.env` ফাইলে password, API key বা token থাকলে সেটি কখনও WhatsApp, Facebook, public ZIP বা GitHub repository-তে প্রকাশ করবেন না।

বর্তমান visual website চালাতে database বাধ্যতামূলক নয়। Tutor profile, login, request storage, admin panel অথবা notification বাস্তবায়ন শুরু হলে database দরকার হবে।

## 5. কোন ফাইলে কোন পরিবর্তন করবেন

| প্রয়োজন | প্রধান ফাইল/ফোল্ডার |
|---|---|
| হোমপেজের লেখা, section, CTA | `client/src/pages/Home.tsx` |
| টিউটর রিকোয়েস্ট ফর্ম | `client/src/pages/TutorRequest.tsx` |
| টিউটর join পেজ | `client/src/pages/JoinTutor.tsx` |
| Tuition, Tutors, Blog, Contact ইত্যাদি page copy | `client/src/pages/InfoPage.tsx` |
| Header, menu, logo | `client/src/components/SiteHeader.tsx` |
| Footer, phone, email, social link | `client/src/components/SiteFooter.tsx` |
| রঙ, spacing, responsive CSS | `client/src/index.css` |
| Page route | `client/src/App.tsx` |
| Browser title ও SEO description | `client/index.html` |
| Database table | `drizzle/schema.ts` |
| Database helper | `server/db.ts` |
| Backend API/tRPC procedure | `server/routers.ts` |

নতুন পেজ যোগ করার জন্য প্রথমে `client/src/pages/`-এ একটি component তৈরি করুন, তারপর `client/src/App.tsx`-এ route যোগ করুন। Header/footer সব পেজে এক রকম রাখতে `SiteHeader` এবং `SiteFooter` reuse করুন।

## 6. বাস্তব টিউটর প্ল্যাটফর্ম তৈরির প্রস্তাবিত ধাপ

বর্তমান সাইটটি একটি responsive marketing site এবং request demo flow। পূর্ণ Tutor Marketplace বানাতে নিচের ক্রমে কাজ করুন।

| ধাপ | কী তৈরি হবে | গুরুত্বপূর্ণ তথ্য |
|---:|---|---|
| 1 | Admin-controlled contact details | প্রকৃত ফোন, WhatsApp, email, office address ও social links বসান |
| 2 | Tutor registration | নাম, ফোন, ছবি, শিক্ষা, অভিজ্ঞতা, subject, area, availability |
| 3 | Guardian/student request storage | tuition type, class, subjects, budget, area, schedule, preferences |
| 4 | Admin dashboard | tutor approve/reject, request review, matching status, notes |
| 5 | Tutor directory and filters | area, class, subject, curriculum, gender, online/home filters |
| 6 | Notifications | new request, profile approval, tutor-match update via email/WhatsApp |
| 7 | Safety and privacy | phone number masking, consent, moderation, role-based access |

প্রথম বাস্তব feature হিসেবে **Tutor Request form database-এ save করা** সবচেয়ে ভালো। এতে আপনার টিম request receive ও review করতে পারবে। এরপর Tutor registration এবং admin workflow যোগ করুন।

## 7. একটি feature যোগ করার সঠিক workflow

নতুন feature সরাসরি UI দিয়ে শুরু করবেন না। আগে data structure ঠিক করুন, তারপর backend এবং শেষে UI। Tutor request storage-এর উদাহরণ নিচে দেওয়া হলো।

1. `drizzle/schema.ts`-এ `tutor_requests` table নির্ধারণ করুন।
2. Migration তৈরি করে local database-এ চালান।
3. `server/db.ts`-এ insert ও list helper লিখুন।
4. `server/routers.ts`-এ validation সহ API procedure যোগ করুন।
5. `TutorRequest.tsx` থেকে form data submit করুন।
6. সফল/ব্যর্থ অবস্থার message যোগ করুন।
7. একটি unit test এবং manual browser test চালান।

এভাবে কাজ করলে UI এবং database field-এর মধ্যে অসামঞ্জস্য কমে যায়।

## 8. প্রতিদিনের development routine

প্রতিদিন কাজ শুরুর আগে প্রজেক্ট ফোল্ডারে নিচের ধাপ অনুসরণ করুন।

```powershell
cd C:\Projects\connect-tutors-bd
git status
pnpm install
pnpm dev
```

কাজ শেষের আগে quality check চালান।

```powershell
pnpm check
pnpm build
git add .
git commit -m "Describe the completed feature"
```

একটি feature শেষ হলে আলাদা commit করুন। যেমন `git commit -m "Add tutor profile filters"`। এটি ভুল হলে আগের অবস্থায় ফিরে যাওয়া সহজ করে।

## 9. সাধারণ সমস্যা ও সমাধান

| সমস্যা | সম্ভাব্য কারণ | সমাধান |
|---|---|---|
| `pnpm` পাওয়া যাচ্ছে না | pnpm install হয়নি বা PATH refresh হয়নি | নতুন টার্মিনাল খুলুন, তারপর `npm install -g pnpm` চালান |
| `localhost:3000` খুলছে না | Server চালু নেই বা port ব্যস্ত | `pnpm dev` চালান; অন্য process বন্ধ করুন অথবা দেখানো নতুন port ব্যবহার করুন |
| `Cannot find module` | dependency অসম্পূর্ণ | `pnpm install` চালান; প্রয়োজন হলে `node_modules` মুছে আবার `pnpm install` করুন |
| White/blank page | browser console error বা import error | টার্মিনালের error ও browser DevTools Console দেখুন |
| CSS পরিবর্তন দেখা যাচ্ছে না | ভুল ফাইল edit বা cache | ফাইল save করুন, hard refresh দিন: `Ctrl + Shift + R` |
| Database connection error | `.env` URL ভুল বা MySQL বন্ধ | XAMPP MySQL চালু করুন, username/password/database নাম যাচাই করুন |
| Port already in use | অন্য Node process চলছে | পুরোনো terminal-এ `Ctrl + C` দিন, তারপর `pnpm dev` চালান |

## 10. Production build এবং হোস্টিং প্রস্তুতি

যখন সাইট public hosting-এর জন্য প্রস্তুত হবে, আগে অবশ্যই build পরীক্ষা করুন।

```powershell
pnpm check
pnpm build
pnpm start
```

`pnpm build`-এর পরে `dist/` ফোল্ডারে production output তৈরি হয়। কিন্তু বর্তমান app-এ Node server আছে, তাই shared hosting-এ শুধু `dist/public` upload করা যথেষ্ট নাও হতে পারে। আপনার host-এ Node.js চালানোর সুবিধা থাকতে হবে, অথবা app-টি শুধুই static frontend হিসেবে আলাদা করে export করতে হবে।

| হোস্টিং ধরন | বর্তমান fullstack app-এর উপযোগিতা | মন্তব্য |
|---|---|---|
| Plain cPanel/PHP hosting | সীমিত | Static build চলতে পারে; Node API/auth/database নয় |
| Node.js-enabled cPanel | উপযোগী | Node version, startup command, environment variables সেট করতে হবে |
| Managed Node platform | উপযোগী | API এবং databaseসহ deployment তুলনামূলক সহজ |
| Manus built-in hosting | উপযোগী | বর্তমান project version থেকে publish করা যায় |

Deployment-এর আগে `DATABASE_URL`, OAuth, email এবং notification secret-গুলো production environment variables হিসেবে বসাতে হবে। এগুলো কোডের ভেতরে hardcode করবেন না।

## 11. নিরাপত্তা ও ব্যাকআপ

> Tutor platform-এ শিক্ষার্থী, অভিভাবক ও টিউটরের ব্যক্তিগত তথ্য থাকতে পারে। তাই শুরু থেকেই security-কে feature-এর অংশ হিসেবে ধরুন।

প্রোফাইল বা request public করার আগে admin approval দিন। ফোন নম্বর সকলের জন্য দৃশ্যমান না রেখে request/approval-এর পরে দেখান। Form input server-side validation ছাড়া database-এ save করবেন না। নিয়মিত Git commit করে remote repository-তে backup রাখুন এবং production database-এর আলাদা backup schedule রাখুন।

## 12. এখন আপনার করণীয়

প্রথমে ZIP extract করে `pnpm install` ও `pnpm dev` চালান। লোকালহোস্টে বর্তমান English site দেখুন। তারপর বাস্তব contact details বসান। এরপর Tutor Request form-কে database-এ save করার কাজ শুরু করুন। এই ক্রমে এগোলে দ্রুত একটি ব্যবহারযোগ্য local demo থেকে পূর্ণ Tutor Marketplace তৈরি করা সহজ হবে।

## References

[1]: https://nodejs.org/en/download "Node.js downloads"
[2]: https://pnpm.io/installation "pnpm installation"
[3]: https://vite.dev/guide/ "Vite guide"
[4]: https://git-scm.com/book/en/v2 "Pro Git book"
