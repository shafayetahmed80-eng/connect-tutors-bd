# Connect Tutors BD — Updated Local ZIP Guide

এই ZIP ফাইলটি Connect Tutors BD-এর সর্বশেষ source project। এটি Windows বা Linux-এ local development-এর জন্য প্রস্তুত। ZIP-এ `node_modules`, `dist`, `.git`, runtime logs এবং কোনো `.env` secret রাখা হয়নি; তাই extract করার পর dependency পুনরায় install করতে হবে।

## ১. প্রয়োজনীয় সফটওয়্যার

| সফটওয়্যার | প্রস্তাবিত সংস্করণ |
|---|---|
| Node.js | 20 LTS বা নতুন |
| pnpm | 10 বা নতুন |
| Git | সর্বশেষ সংস্করণ |
| VS Code | সর্বশেষ সংস্করণ |

Node.js ইনস্টল করার পর PowerShell বা Terminal-এ যাচাই করুন:

```powershell
node -v
npm -v
npm install -g pnpm
pnpm -v
```

## ২. ZIP extract ও dependency install

ZIP extract করে project folder-এ ঢুকুন। এই গাইডে নির্দিষ্ট project directory হলো `C:\Projects\connect-tutors-bd`। উদাহরণ:

```powershell
mkdir C:\Projects
Expand-Archive -Path "$HOME\Downloads\connect-tutors-bd-complete-20260825-013736.zip" -DestinationPath "C:\Projects"
cd C:\Projects\connect-tutors-bd
Get-Location
Get-ChildItem
pnpm install
```

`Get-Location`-এর ফলাফলে `C:\Projects\connect-tutors-bd` দেখা উচিত। ZIP filename আলাদা হলে `Expand-Archive` command-এর filename পরিবর্তন করুন।

## ৩. Localhost চালু করা

```powershell
cd C:\Projects\connect-tutors-bd
pnpm dev
```

Terminal-এ দেখানো URL খুলুন। সাধারণত এটি হবে:

```text
http://localhost:3000
```

Server বন্ধ করতে `Ctrl + C` চাপুন। পরে আবার চালু করতে অবশ্যই project root-এ গিয়ে command দিন:

```powershell
cd C:\Projects\connect-tutors-bd
pnpm dev
```

## ৪. Quality checks

```powershell
pnpm check
pnpm test
pnpm build
```

প্রধান scripts:

| কাজ | কমান্ড |
|---|---|
| Development server | `pnpm dev` |
| TypeScript check | `pnpm check` |
| Automated tests | `pnpm test` |
| Production build | `pnpm build` |
| Production server | `pnpm start` |

## ৫. Environment ও database সতর্কতা

এই ZIP-এ কোনো password, API key, token বা production `.env` রাখা হয়নি। Full authentication, database বা notification flow চালাতে হলে নিজের local environment-এ প্রয়োজনীয় variables configure করতে হবে। Secret কখনও ZIP, Facebook, WhatsApp বা public repository-তে প্রকাশ করবেন না।

XAMPP-এর Apache দিয়ে এই React/Node project চালানো যাবে না। প্রয়োজন হলে XAMPP-এর MySQL service ব্যবহার করা যেতে পারে, কিন্তু application চালাতে হবে `pnpm dev` দিয়ে।

## ৬. Skeleton loading কী?

**Skeleton loading** হলো আসল data আসার আগে content-এর সম্ভাব্য আকৃতির একটি হালকা placeholder দেখানো। যেমন, tutor card-এর নামের জায়গায় একটি ধূসর লাইন, profile photo-এর জায়গায় একটি বৃত্ত এবং paragraph-এর জায়গায় কয়েকটি ছোট লাইন দেখা যায়। এতে layout আগে থেকেই স্থির থাকে এবং content আসার পর হঠাৎ page jump কম হয়।

উদাহরণ:

```tsx
<div className="animate-pulse space-y-3" aria-label="Loading tutor profile">
  <div className="h-14 w-14 rounded-full bg-slate-200" />
  <div className="h-4 w-2/3 rounded bg-slate-200" />
  <div className="h-3 w-full rounded bg-slate-200" />
</div>
```

## ৭. Shimmer effect কী?

**Shimmer** হলো Skeleton placeholder-এর উপর দিয়ে ধীরে চলা আলো বা gradient। এটি ব্যবহারকারীকে বোঝায় যে data loading চলছে। Shimmer খুব দ্রুত বা অতিরিক্ত উজ্জ্বল হওয়া উচিত নয়; `prefers-reduced-motion` ব্যবহারকারীদের জন্য animation কমিয়ে বা বন্ধ রাখা উচিত।

সহজ CSS ধারণা:

```css
.skeleton-shimmer {
  background: linear-gradient(90deg, #e5edf3 25%, #f7fbfe 50%, #e5edf3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer {
    animation: none;
  }
}
```

**Skeleton** মূলত content-এর shape দেখায়, আর **Shimmer** সেই shape-এ চলমান loading feedback যোগ করে। Login থেকে Tutor Dashboard hand-off-এ এই project-এ আলাদা accessible transition panel ব্যবহার করা হয়েছে; ভবিষ্যতে dashboard data fetch-এর সময় page-specific Skeleton/Shimmer যোগ করা যেতে পারে।

## ৮. সাধারণ সমস্যা

| সমস্যা | করণীয় |
|---|---|
| `pnpm` পাওয়া যাচ্ছে না | Node.js terminal বন্ধ করে নতুন terminal খুলে `npm install -g pnpm` চালান |
| `Cannot find module` | project folder-এ `pnpm install` চালান |
| Port ব্যস্ত | পুরোনো server বন্ধ করুন অথবা terminal-এ দেখানো নতুন port ব্যবহার করুন |
| Database error | local `.env`-এর `DATABASE_URL` এবং MySQL service যাচাই করুন |
| Page blank | terminal error এবং browser DevTools Console পরীক্ষা করুন |

সর্বশেষ source পরিবর্তন করার আগে একটি backup copy রাখুন এবং কাজ শেষে `pnpm check`, `pnpm test` ও `pnpm build` চালান।
