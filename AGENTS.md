# Connect Tutors BD — AI Development & Engineering Rules

Welcome to **Connect Tutors BD (কানেক্ট টিউটরস)**. These rules govern all agentic coding, refactoring, feature implementation, testing, and pull requests across the entire repository.

---

## 1. Tech Stack & Architecture

- **Frontend:** React 18, Vite, Tailwind CSS, Radix UI primitives, Lucide React icons, Framer Motion.
- **Backend:** Express / Node.js, tRPC / REST endpoints (`server/`).
- **Database & ORM:** PostgreSQL with Drizzle ORM (`drizzle/schema.ts`, migrations in `drizzle/`, registered in `drizzle/meta/_journal.json`).
- **Shared Domain:** Shared TypeScript schemas, validators, and helpers reside in `shared/` with parallel `.test.ts` files.
- **Testing:** Vitest + React Testing Library (3,560+ tests across the suite).
- **Package Manager & Scripts:** `npm` / `pnpm` (`cmd /c` on Windows if PowerShell script restrictions apply).

---

## 2. Mandatory Quality & Verification Standards

Every code change MUST satisfy these criteria before being declared complete:

1. **Zero TypeScript Errors:**
   - Run `cmd /c npm run check` (`tsc --noEmit`).
   - All files must be type-safe with zero warnings or errors.
2. **Automated Test Coverage:**
   - Never implement a new feature or fix a bug without accompanying automated tests.
   - Run tests with `cmd /c npx vitest run <test_path>` or full suite `cmd /c npm test`.
   - Maintain regression safety across the entire 3,560+ test suite.
3. **Preserve Documentation Integrity:**
   - Preserve existing code comments, docstrings, and Bengali guides (`docs/`, `ADMIN_DYNAMIC_FEATURES_GUIDE_BN.md`, etc.).

---

## 3. Database & Migration Workflow

When schema or table changes are required:
1. Update schema definitions in `drizzle/schema.ts`.
2. Generate migration SQL files in `drizzle/0xxx_*.sql`.
3. Ensure the migration is properly recorded in `drizzle/meta/_journal.json`.
4. Implement DB query and mutation helpers in `server/db.ts`.
5. Expose API procedures via `server/routers.ts` (or relevant sub-router) with strict Zod validation.
6. Write unit tests for procedures in `server/*.test.ts`.

---

## 4. Security & Role-Based Access Control (RBAC)

- Distinguish clearly between **Project Owner** (`ownerAdminProcedure` / `isOwner: true`) and **Staff Admins** (`adminProcedure`).
- Sensitive operations (e.g. modifying default Facebook post templates, destructive DB actions) MUST be restricted strictly to Project Owner.
- Always validate input schemas using Zod before executing database queries.

---

## 5. Domain & UX Guidelines (Bangladesh Tuition Context)

- **Localization:**
  - Standard currency is **BDT** (টাকা / BDT/month).
  - Curriculums: English Medium (Cambridge/Edexcel/O-Level/A-Level), English Version, Bangla Medium, Madrasah.
  - Locations: Dhaka and nationwide hubs (Dhanmondi, Uttara, Mirpur, Gulshan, Banani, Mohammadpur, etc.).
  - Institutional tags: BUET, Dhaka University (DU), Medical, etc.
- **Trust & Verification:**
  - The platform is an official BTPA member: **`Member: BTPA - 077`** (Bangladesh Tuition Provider Association). Display where trust badges are needed.
- **Mobile-First & 1-Click Productivity:**
  - High proportion of mobile users. Ensure responsive card grids, touch-friendly chips, and visual scroll indicators.
  - Social media & admin workflows must support 1-click clipboard copy (`navigator.clipboard`), undo toasts, and seamless preview modals.

---

## 6. Git, PR & Task List Discipline

- **Branches:** Use semantic branch naming (e.g., `feat/admin-feature-name`, `fix/ui-issue-name`).
- **Commits / PR Titles:** Conventional Commits (e.g., `feat(admin): ...`, `feat(tutor): ...`, `fix(ui): ...`).
- **PR Lifecycle & Merge Rule (Mandatory):**
  - For every bug fix or feature completion:
    1. Create a dedicated semantic branch.
    2. Commit changes with clear conventional commit messages.
    3. Push to GitHub (`git push -u origin <branch>`).
    4. Create a Pull Request (`gh pr create`).
    5. Verify CI and local checks pass completely (green).
    6. Once CI is green, automatically merge the PR (`gh pr merge --squash --delete-branch`).
- **PR Description Format:**
  - Summary / Overview
  - Key Features & Implementations
  - Verification (Tests count, `tsc --noEmit` 0 errors)
- **Task Tracking:**
  - Keep [`docs/PENDING_TASKS_LIST.md`](file:///c:/Projects/connect-tutors-bd/docs/PENDING_TASKS_LIST.md) updated when tasks are completed (recording PR number) or new tasks are planned.
