# Connect Tutors BD — Localhost Run Guide

এই গাইডটি ZIP ফাইল extract করে **Connect Tutors BD** project-টি নিজের কম্পিউটারে localhost-এ চালানোর জন্য।

## ১. প্রয়োজনীয় সফটওয়্যার

| সফটওয়্যার | প্রস্তাবিত সংস্করণ |
|---|---:|
| Node.js | 20 LTS বা নতুন |
| pnpm | 10 বা নতুন |
| VS Code | সর্বশেষ সংস্করণ |
| Git | ঐচ্ছিক |

ইনস্টলেশন যাচাই করতে Terminal, PowerShell বা Command Prompt-এ চালান:

```bash
node -v
npm -v
pnpm -v
git --version
```

`pnpm` ইনস্টল না থাকলে চালান:

```bash
npm install -g pnpm
```

Node.js ইনস্টল করার পরে নতুন Terminal খুলে command আবার চালান।

## ২. ZIP extract করা

ZIP ফাইলের নাম:

```text
connect-tutors-bd-complete-20260825-013736.zip
```

দীর্ঘমেয়াদি development-এর জন্য project-টি `Desktop` বা `Downloads`-এ না রেখে আলাদা `Projects` folder-এ রাখুন।

### Windows ব্যবহারকারীদের জন্য ধাপে ধাপে নির্দেশনা

নিচের screenshot-গুলো **illustrative example**—আপনার Windows username, version number, ZIP filename এবং install time ভিন্ন হতে পারে। Command-গুলো PowerShell-এ একইভাবে ব্যবহার করা যাবে।

#### ধাপ ১: PowerShell খুলুন

Start Menu খুলে `PowerShell` লিখুন এবং **Windows PowerShell** বা **PowerShell** চালু করুন। কালো বা নীল Terminal window খুললে সেটিই PowerShell। প্রথমে Node.js এবং pnpm ঠিকভাবে ইনস্টল হয়েছে কি না যাচাই করুন:

```powershell
node -v
npm -v
pnpm -v
```

কোনো command-এর পরে version number দেখালে সেটি পাওয়া গেছে। `command not found` বা `is not recognized` দেখালে [প্রয়োজনীয় সফটওয়্যার ইনস্টল](#১-প্রয়োজনীয়-সফটওয়্যার) করে নতুন PowerShell window খুলুন।

![Windows PowerShell-এ version যাচাইয়ের উদাহরণ](docs/windows-localhost-screenshots/01-windows-terminal.png)

#### ধাপ ২: ZIP file extract করুন

প্রথমে `C:\Projects` folder তৈরি করুন। এরপর ZIP file-টি `Downloads` folder-এ আছে ধরে নিচের command চালান:

```powershell
mkdir C:\Projects
Expand-Archive -Path "$HOME\Downloads\connect-tutors-bd-complete-20260825-013736.zip" -DestinationPath "C:\Projects"
```

যদি ZIP file-এর নাম আলাদা হয়, command-এর ভেতরের filename বদলান। Extract শেষ হলে project folder-এ যান:

```powershell
cd C:\Projects\connect-tutors-bd
Get-ChildItem
```

`client`, `server`, `shared`, `package.json` এবং `pnpm-lock.yaml` দেখা গেলে আপনি সঠিক project root-এ আছেন।

![PowerShell-এ ZIP extract ও project folder খোলার উদাহরণ](docs/windows-localhost-screenshots/02-extract-and-open.png)

#### ধাপ ৩: Project dependencies install করুন

Project root-এ আছেন নিশ্চিত করে চালান:

```powershell
pnpm install
```

এই command package list পড়ে প্রয়োজনীয় dependencies download করবে। Internet connection চালু রাখুন এবং install শেষ হওয়ার আগে PowerShell বন্ধ করবেন না। সফল হলে project folder-এ `node_modules` তৈরি হবে।

![PowerShell-এ pnpm install-এর উদাহরণ](docs/windows-localhost-screenshots/03-install-dependencies.png)

#### ধাপ ৪: Local development server চালু করুন

Dependencies install শেষ হলে একই PowerShell window-তে চালান:

```powershell
pnpm dev
```

Terminal-এ `Local: http://localhost:3000/` দেখা গেলে server চালু হয়েছে। এই PowerShell window বন্ধ করবেন না; server চালু রাখতে এটি খোলা থাকতে হবে।

![PowerShell-এ pnpm dev ও localhost URL-এর উদাহরণ](docs/windows-localhost-screenshots/04-run-localhost.png)

#### ধাপ ৫: Browser-এ website খুলুন

Chrome, Edge বা Firefox খুলে address bar-এ লিখুন:

```text
http://localhost:3000
```

Enter চাপলে Connect Tutors BD homepage দেখা উচিত। Browser-এ page না এলে প্রথমে PowerShell-এ কোনো error আছে কি না দেখুন।

![Windows Browser-এ localhost URL খোলার উদাহরণ](docs/windows-localhost-screenshots/05-browser-check.png)

#### Windows-এ server বন্ধ বা আবার চালু করা

Server বন্ধ করতে PowerShell window active রেখে `Ctrl + C` চাপুন। আবার চালু করতে project folder-এ ফিরে চালান:

```powershell
cd C:\Projects\connect-tutors-bd
pnpm dev
```

#### Windows-এ project folder দ্রুত খোলার বিকল্প পদ্ধতি

File Explorer-এ `C:\Projects\connect-tutors-bd` খুলুন। Folder-এর address bar-এ click করে `powershell` লিখে Enter চাপলে ওই folder location-এ PowerShell খুলবে। PowerShell-এ `Get-Location` চালিয়ে যদি `C:\Projects\connect-tutors-bd` দেখা যায়, তাহলে সঠিক project root-এ আছেন। এরপর শুধু `pnpm install` বা `pnpm dev` চালাতে পারবেন।

### macOS বা Linux

```bash
mkdir -p ~/Projects
unzip ~/Downloads/connect-tutors-bd-complete-20260825-013736.zip -d ~/Projects
cd ~/Projects/connect-tutors-bd
ls
```

Project root-এ অন্তত নিচের ফাইল ও folder থাকা উচিত:

```text
client
server
shared
package.json
pnpm-lock.yaml
vite.config.ts
```

## ৩. Dependency install করা

Project root folder-এ থেকে চালান:

```bash
pnpm install
```

প্রথমবার কয়েক মিনিট সময় লাগতে পারে। এই command-এর পরে `node_modules` folder তৈরি হবে। এটি ZIP-এ রাখা হয়নি, তাই নতুন কম্পিউটারে প্রথমবার এই command চালানো বাধ্যতামূলক।

## ৪. Localhost server চালু করা

```bash
pnpm dev
```

সফলভাবে চালু হলে Terminal-এ সাধারণত দেখা যাবে:

```text
Local: http://localhost:3000/
```

Browser-এ খুলুন:

```text
http://localhost:3000
```

কোড save করলে Vite সাধারণত browser স্বয়ংক্রিয়ভাবে update করবে। Server বন্ধ করতে চাপুন:

```text
Ctrl + C
```

## ৫. প্রয়োজনীয় command

| কাজ | Command |
|---|---|
| Development server চালু | `pnpm dev` |
| Automated tests | `pnpm test` |
| TypeScript check | `pnpm check` |
| Production build | `pnpm build` |
| Production server | `pnpm start` |
| Code formatting | `pnpm format` |

Feature পরিবর্তনের পরে চালানো ভালো:

```bash
pnpm check
pnpm test
pnpm build
```

## ৬. XAMPP ও Database সম্পর্কে

এই project React, Vite, Node.js এবং Express ভিত্তিক। তাই source code XAMPP-এর `htdocs` folder-এ কপি করে চালাবেন না। Project চালাতে সবসময় `pnpm dev` ব্যবহার করুন।

যদি local MySQL database ব্যবহার করেন, XAMPP Control Panel থেকে MySQL চালু করতে পারেন। তবে Tutor login, Guardian login, Admin panel, profile save বা request storage-এর মতো বাস্তব database feature ব্যবহার করতে database configuration লাগতে পারে।

Local-only `.env` file প্রয়োজন হলে project root-এ তৈরি করুন:

```env
DATABASE_URL=mysql://root:YOUR_PASSWORD@127.0.0.1:3306/connect_tutors_bd
```

`YOUR_PASSWORD`-এর জায়গায় আপনার local MySQL password বসান। কোনো password, API key বা token public ZIP, GitHub বা chat-এ প্রকাশ করবেন না।

## ৭. Port 3000 ব্যস্ত হলে

যদি port 3000 অন্য application ব্যবহার করে, Vite Terminal-এ নতুন port দেখাবে। যেমন:

```text
Local: http://localhost:3001/
```

তখন Browser-এ খুলুন:

```text
http://localhost:3001
```

পুরোনো server বন্ধ করতে তার Terminal window-তে `Ctrl + C` চাপুন।

## ৮. সাধারণ সমস্যা

### `pnpm is not recognized`

```bash
npm install -g pnpm
```

এর পরে নতুন Terminal খুলুন।

### `Cannot find module`

Project root-এ থেকে চালান:

```bash
pnpm install
pnpm dev
```

### Blank বা white page

Browser-এ hard refresh দিন:

```text
Ctrl + Shift + R
```

তারপর Terminal এবং Browser DevTools Console-এর error দেখুন।

### CSS বা নতুন পরিবর্তন দেখা যাচ্ছে না

নিশ্চিত করুন যে development server সঠিক project folder থেকেই চালু হয়েছে। প্রয়োজনে server restart করুন:

```bash
Ctrl + C
pnpm dev
```

### Database connection error

Database service চালু আছে কি না এবং database name, username, password ও `DATABASE_URL` সঠিক কি না যাচাই করুন।

## ৯. Skeleton ও Shimmer কী?

**Skeleton loading** হলো data আসার আগে page content-এর সম্ভাব্য আকৃতির placeholder। এটি blank screen-এর পরিবর্তে user-কে page structure সম্পর্কে ধারণা দেয়।

**Shimmer effect** হলো Skeleton placeholder-এর উপর দিয়ে চলমান হালকা gradient বা আলো যাওয়ার animation। এটি user-কে বোঝায় যে data এখনও load হচ্ছে।

এই project-এর Tutor Dashboard-এ data fetch চলার সময় custom responsive Skeleton/Shimmer state দেখানো হয়। এটি:

- loading অবস্থায় dashboard content-এর একটি পরিষ্কার visual structure দেখায়;
- accessible loading semantics ব্যবহার করে;
- reduced-motion preference সম্মান করে;
- data load শেষ হলে স্বাভাবিক dashboard content দেখায়;
- authentication, role guard বা session behavior পরিবর্তন করে না।

## ১০. সবচেয়ে সংক্ষিপ্ত run process

প্রথমবার:

```bash
cd C:\Projects\connect-tutors-bd
pnpm install
pnpm dev
```

পরের প্রতিবার:

```bash
cd C:\Projects\connect-tutors-bd
pnpm dev
```

তারপর Browser-এ খুলুন:

```text
http://localhost:3000
```

## ১১. নিরাপত্তা সতর্কতা

ZIP package-এ ইচ্ছাকৃতভাবে `node_modules`, build output, logs, Git metadata এবং environment secrets রাখা হয়নি। Local `.env` file কখনও public repository, public ZIP, Facebook, WhatsApp বা chat-এ share করবেন না।

বর্তমান project-এর online version দেখতে পারেন:

[Connect Tutors BD](https://connecttutor-gcyddjfl.manus.space)
