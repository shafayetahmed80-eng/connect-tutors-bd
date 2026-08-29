# TP-02: XAMPP Clean MySQL Migration Verification

**Purpose.** This procedure proves that the complete checked-in Drizzle migration chain, including TP-02, can initialize an empty MySQL database without manually executing the migration SQL. It uses a new verification database only. Your existing Connect Tutors BD database is not used, altered, or deleted.

> Do not send your MySQL password in chat. Type it only in your own Command Prompt when MySQL requests it.

## Before You Start

Ensure that the **MySQL** module is running in the XAMPP Control Panel. Then open **Command Prompt** in the latest `connect-tutors-bd` project folder—the copy that contains `drizzle/0008_stiff_patriot.sql` and `package.json`.

The commands below are for **Windows Command Prompt** (`cmd.exe`), not PowerShell. Replace `YOUR_MYSQL_PASSWORD` only on your own computer. If your XAMPP `root` user has no password, use the separate no-password option shown below.

| Value                 | Required value                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Verification database | `connect_tutors_bd_tp02_verify`                                                                        |
| Migration command     | `pnpm exec drizzle-kit migrate`                                                                        |
| Verification SQL file | `docs\tp-02-xampp-verification.sql`                                                                    |
| Expected result       | Migration finishes without error; verification output lists the TP-02 tables, constraints, and indexes |

## Step 1 — Create an Isolated Empty Database

### If XAMPP MySQL has a root password

```bat
set "VERIFY_DB=connect_tutors_bd_tp02_verify"
C:\xampp\mysql\bin\mysql.exe -u root -p -e "CREATE DATABASE `%VERIFY_DB%` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Press **Enter** after the first command. MySQL will prompt for the password after the second command. A successful command returns to the prompt without an error.

### If XAMPP MySQL root has no password

```bat
set "VERIFY_DB=connect_tutors_bd_tp02_verify"
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE `%VERIFY_DB%` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

If the database already exists, stop and tell me the error message rather than continuing. The verification must begin with a truly empty database.

## Step 2 — Point Only This Command Prompt at the Verification Database

### If XAMPP MySQL has a root password

```bat
set "DATABASE_URL=mysql://root:YOUR_MYSQL_PASSWORD@127.0.0.1:3306/%VERIFY_DB%"
```

### If XAMPP MySQL root has no password

```bat
set "DATABASE_URL=mysql://root@127.0.0.1:3306/%VERIFY_DB%"
```

> If your password contains characters such as `@`, `:`, `/`, `?`, `#`, or `%`, do not guess at an encoded connection string. Tell me only that it contains special characters—without sharing it—and I will give you a safe local-only alternative.

## Step 3 — Run the Complete Checked-In Migration Chain

Run this from the project root:

```bat
pnpm exec drizzle-kit migrate
```

This must finish without an error. Do **not** run `pnpm db:push`, do not open or run `0008_stiff_patriot.sql` manually, and do not run custom `ALTER TABLE` commands. The goal is to prove that the versioned migrations themselves work from a clean state.

## Step 4 — Run the Verification Queries

### If XAMPP MySQL has a root password

```bat
C:\xampp\mysql\bin\mysql.exe -u root -p "%VERIFY_DB%" < docs\tp-02-xampp-verification.sql
```

### If XAMPP MySQL root has no password

```bat
C:\xampp\mysql\bin\mysql.exe -u root "%VERIFY_DB%" < docs\tp-02-xampp-verification.sql
```

Copy and send me the terminal output from **Step 3** and **Step 4**. You may redact usernames, hostnames, or passwords if any appear; the migration result and verification rows are what I need.

## Step 5 — Cleanup Only After I Confirm the Result

Do not run cleanup until I confirm the result. After confirmation, delete only the isolated verification database with the appropriate command below.

### If XAMPP MySQL has a root password

```bat
C:\xampp\mysql\bin\mysql.exe -u root -p -e "DROP DATABASE `connect_tutors_bd_tp02_verify`;"
```

### If XAMPP MySQL root has no password

```bat
C:\xampp\mysql\bin\mysql.exe -u root -e "DROP DATABASE `connect_tutors_bd_tp02_verify`;"
```

> **Safety check:** The only database that may be dropped is exactly `connect_tutors_bd_tp02_verify`. Never replace it with your normal local project database.
