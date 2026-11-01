# 🎓 Connect Tutors BD (কানেক্ট টিউটরস)

[![Tests](https://img.shields.io/badge/Vitest-4%2C525%2B%20Passed-emerald.svg)](https://vitest.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Zero%20Errors-blue.svg)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-70%20Tables-green.svg)](https://orm.drizzle.team/)
[![tRPC](https://img.shields.io/badge/tRPC-v11%20End--to--End%20Typesafe-2563eb.svg)](https://trpc.io/)
[![BTPA](https://img.shields.io/badge/Official%20Member-BTPA--077-teal.svg)](https://connecttutorsbd.com)
[![PRs](https://img.shields.io/badge/Pull%20Requests-545%2B%20Merged-indigo.svg)](https://github.com/shafayetahmed80-eng/connect-tutors-bd/pulls)

> **Official BTPA Member: `Member: BTPA - 077`** (Bangladesh Tuition Provider Association)  
> The premier, production-grade automated tuition matching and tutor management platform in Bangladesh.

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features by Portal](#-key-features-by-portal)
  - [1. Guest & Public Portal](#1-guest--public-portal)
  - [2. Tutor Panel & Workspace](#2-tutor-panel--workspace)
  - [3. Guardian & Student Panel](#3-guardian--student-panel)
  - [4. Admin & Project Owner Panel](#4-admin--project-owner-panel)
- [Tech Stack & Architecture](#%EF%B8%8F-tech-stack--architecture)
- [Database & Data Models (70 Tables)](#%EF%B8%8F-database--data-models-70-tables)
- [Quick Start & Local Setup](#-quick-start--local-setup)
- [Scripts & Quality Assurance](#-scripts--quality-assurance)
- [Documentation Index](#-documentation-index)
- [Engineering Guidelines & PR Rules](#-engineering-guidelines--pr-rules)

---

## 🌟 Overview

**Connect Tutors BD (কানেক্ট টিউটরস)** connects students and guardians across Bangladesh (covering all 8 divisions, 64 districts, and major Dhaka hubs such as Dhanmondi, Uttara, Gulshan, Banani, Mirpur, and Mohammadpur) with highly qualified, thoroughly vetted tutors.

The platform provides end-to-end automation across all education curriculums:
- **Bangla Medium** (National Curriculum)
- **English Version** (National Curriculum in English)
- **English Medium** (Cambridge, Edexcel, O-Level, A-Level)
- **Madrasah Education** (Dakhil, Alim)

Currency and fees are localized in Bangladeshi Taka (**BDT / BDT/month**).

---

## 🚀 Key Features by Portal

### 1. Guest & Public Portal
- **Smart Search & Filters:** Live searchable job board (`/job-board`) with responsive mobile slide-out drawer, filtering by location, class, subject, salary range, gender preference, and tuition mode (Home, Online, Group).
- **Guardian Hiring Journey (`/request-tutor`):** Multi-step interactive intake wizard with instant phone verification, subject recommendation, and tracking handoff.
- **Tutor Onboarding (`/become-tutor`):** Instant registration and onboarding guide.
- **Official QR Verification (`/verify/:letterNumber/:code`):** Digital verification for Guardian-Tutor appointment confirmation letters with digital watermarking and official BTPA seal.
- **Dynamic Content:** Admin-managed pages for policies, terms, blogs, events, and FAQs.

### 2. Tutor Panel & Workspace
- **Unified OTP & Password Authentication:** Secure phone-first login with BD number normalization (`+8801...`).
- **5-Section Profile Form:**
  - **Section A (Personal):** Crop-enabled photo upload, quality-checked headline, standard religion dropdown, blood group, present & permanent addresses, social links, and family emergency contact.
  - **Section B (Family):** Father and mother name quality validation (filters placeholder and generic terms).
  - **Section C (Education):** Comprehensive institutional search across universities, colleges, and schools with passing year, roll/reg, and CGPA/GPA.
  - **Section D (Teaching Expertise & Preferences):** Classes, curricula, primary/additional subjects with department-based smart suggestions (`Recommended` badges), teaching experience with age realism check, special expertise, optional teaching experience details, tuition modes, student gender, days, time slots, teaching areas, and travel distance (auto-disabled for online-only).
  - **Section E (Introduction):** About Me, Teaching Approach, and Why Choose Me with dynamic character limits and repetition filters.
- **Readiness Score & 4-Category Checklist:** Dynamic progress bar across Personal, Education, Tuition, and Documents categories, with 1-click section jumping and a prominent `Ready for Verification` green badge.
- **1-Page A4 Tutor CV & Biodata PDF Generator:** Instant downloadable printable CV with official letterhead, verified badges, photo, and QR code.
- **Job Applications & Schedule:** 1-click job apply, status tracking (Applied, Shortlisted, Interview, Appointed, Rejected), and weekly class schedule grid.

### 3. Guardian & Student Panel
- **Request Lifecycle Tracking:** Real-time visibility into tuition requests (Submitted -> Reviewing -> Approved/Live -> Shortlisting -> Appointed -> Confirmed -> Closed).
- **Side-by-Side Tutor Comparison:** Compare multiple applicant tutors side-by-side (institutions, degrees, experience, ratings, and proposed fees).
- **1-Click Appointment:** Appoint verified tutors and receive an official Appointment Confirmation Letter with QR verification.
- **In-App Messaging:** Direct, real-time chat with applicant and appointed tutors.

### 4. Admin & Project Owner Panel
- **Role-Based Access Control (RBAC):** Distinction between Staff Admin (`adminProcedure`) and Project Owner (`ownerAdminProcedure` / `isOwner: true`).
- **Monitoring HUD:** Real-time metrics for active jobs, pending applications, unverified tutors, and incoming chats.
- **Document Lightbox & Bengali Moderation Presets:** Full-screen zoom and rotate for uploaded NID, student ID, and certificates; 1-tap Bengali presets (`TUTOR_PROFILE_CORRECTION_PRESETS`) for instant change requests.
- **Social Media Facebook Post Engine (`/admin/facebook-posts`):**
  - *Single Post Card:* Generate formatted Facebook posts with tuition details, tags, and contact links.
  - *Bulk Grouped Posts:* Group multiple jobs by area or gender into single long-form posts with 1-click clipboard copy.
- **Image & Video Studio (`/admin/images/*`):**
  - *Poster Engine:* High-res PNG social posters with customizable brand colors, fonts, and the official BTPA badge.
  - *Video Slides Engine:* Animated multi-slide MP4 videos with smooth transitions and background audio.
- **Dynamic CMS & Limit Controls (`/admin/dynamic/*`):** Real-time adjustment of field character limits, fees, navigation menus, institute catalogs, schools, locations, and policy text without code deployment.
- **Security Workspace:** TOTP Two-Factor Authentication with 30-day device trust, audit logs, and session timeout management.

---

## 🛠️ Tech Stack & Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Client Frontend                        │
│   React 19 / 18 • Vite 7 • Tailwind CSS 4 • Radix UI        │
│   Lucide React • Wouter • TanStack Query • Sonner Toasts    │
└──────────────────────────────┬──────────────────────────────┘
                               │ @trpc/client (Type-safe RPC)
┌──────────────────────────────▼──────────────────────────────┐
│                       Backend Server                        │
│   Node.js v20+ • Express v4 • @trpc/server • WebSockets     │
│   Jose JWT • Otpauth (TOTP) • PDFKit • Canvas • Web-Push    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Drizzle ORM
┌──────────────────────────────▼──────────────────────────────┐
│                      Database Layer                         │
│   PostgreSQL / MySQL Compatible • 70 Relational Tables      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database & Data Models (70 Tables)

The system manages 70 relational database tables via Drizzle ORM (`drizzle/schema.ts`):

| Category | Table Count | Representative Tables |
|---|:---:|---|
| **Users & Security** | 11 | `users`, `adminCredentials`, `adminProfiles`, `adminLoginAuditLogs`, `adminTwoFactorSettings`, `phoneVerificationCodes` |
| **Tutor Profiles & Records** | 15 | `tutors`, `tutorAcademicProfiles`, `tutorPrivateProfiles`, `tutorEducationRecords`, `tutorUniversityIdDocuments`, `tutorSupportingDocuments`, `tutorProfileModerationEvents` |
| **Academic & Geographic Catalogs** | 5 | `locations`, `universities`, `schoolColleges`, `facultyDepartments`, `degreeMajors` |
| **Tuition Preferences & Subjects** | 8 | `tutorTeachingAreas`, `tutorSubjects`, `tutorClassLevels`, `tutorCurricula`, `tutorTuitionModes`, `tutorPreferredTeachingDays` |
| **Guardian & Tuition Requests** | 16 | `guardianProfiles`, `guardianTuitionRequests`, `tutorRequests`, `tutorJobs`, `tutorJobInterests`, `confirmationLetters`, `tutorReviews` |
| **Chat & Messaging** | 5 | `tutorAdminChatThreads`, `tutorAdminChatMessages`, `tutorAdminChatNotes`, `chatQuickReplies`, `adminMessageTemplates` |
| **Social Media & Image Studio** | 5 | `facebookPostTemplates`, `tutorRequestFacebookPosts`, `imageStudioMarks`, `imageStudioFonts`, `imageStudioColours` |
| **Notifications & CMS** | 5 | `adminPushSubscriptions`, `pushSubscriptions`, `tutorNotifications`, `siteContentOverrides`, `siteLimits` |

---

## 💻 Quick Start & Local Setup

### 1. Prerequisites
- Node.js v20.x or higher
- `pnpm` (v10+)
- PostgreSQL or MySQL server

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="mysql://root:password@localhost:3306/connect_tutors_db"
SESSION_SECRET="super-strong-jwt-secret-minimum-32-characters"
```

### 3. Installation & Database Setup
```bash
# Install dependencies
pnpm install

# Push database schema & run migrations
pnpm db:push

# Seed initial catalogs (locations & institutions)
pnpm db:seed:locations
pnpm db:seed:tutor-profile-catalog

# Seed Owner Admin account
pnpm db:seed:owner-admin

# Start development server
pnpm dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Scripts & Quality Assurance

| Command | Purpose |
|---|---|
| `pnpm dev` | Starts local development server with Vite HMR and nodemon/tsx watch |
| `pnpm check` | Runs TypeScript type checker (`tsc --noEmit`) — **Enforces 0 errors** |
| `pnpm test` | Executes the complete **4,525+ automated test suite** with Vitest |
| `pnpm build` | Compiles optimized production bundle via Vite and Esbuild |
| `pnpm start` | Runs production server (`dist/index.js`) |
| `pnpm db:push` | Generates Drizzle migrations and applies them to the database |
| `pnpm format` | Formats code using Prettier |

---

## 📚 Documentation Index

For in-depth architectural and operational guides, consult the dedicated documentation:

- 📖 **[মাস্টার সিস্টেম ও ফিচার ডকুমেন্টেশন (Full Website Documentation)](docs/FULL_WEBSITE_DOCUMENTATION_BN.md)** — বাংলা ভাষায় সমগ্র ওয়েবসাইটের পূর্ণাঙ্গ বিস্তারিত গাইড।
- 🚀 **[Deploy From Zero Guide (BN)](DEPLOY_FROM_ZERO_BN.md)** — নতুন সার্ভার সেটআপ ও ডিপ্লয়মেন্ট নির্দেশিকা।
- 🌐 **[Production Deployment Guide (BN)](PRODUCTION_DEPLOYMENT_BN.md)** — সিপ্যানেল ও লিনাক্স ভিপিএস ডেপ্লয়মেন্ট নির্দেশিকা।
- 📱 **[Mobile OTP & RBAC Architecture (BN)](MOBILE_OTP_RBAC_FLOW_AND_CODE_STRUCTURE_BN.md)** — মোবাইল অথেনটিকেশন ও অ্যাক্সেস কন্ট্রোল ফ্লো।
- 📋 **[Pending & Completed Tasks List](docs/PENDING_TASKS_LIST.md)** — ১২৩+ টাস্ক ও ৫৪৫+ পিআর এর পূর্ণাঙ্গ ইতিহাস।

---

## ⚖️ Engineering Guidelines & PR Rules

All contributions and agentic code modifications MUST follow the rules in [`AGENTS.md`](AGENTS.md):
1. **Zero TypeScript Errors:** Always verify with `pnpm check` (`tsc --noEmit`).
2. **100% Test Suite Green:** Accompany all features/fixes with automated tests (`pnpm test`).
3. **Strict Git & PR Lifecycle:**
   - Dedicated semantic branch (`feat/...`, `fix/...`, `docs/...`).
   - Conventional commit messages.
   - PR creation (`gh pr create`), CI green verification, and automatic squash merge (`gh pr merge --squash --delete-branch`).
4. **Preserve Documentation Integrity:** Maintain existing Bengali guides and technical docs.

---

**Connect Tutors BD (কানেক্ট টিউটরস)** • *Member: BTPA - 077* • © 2026 All Rights Reserved.
