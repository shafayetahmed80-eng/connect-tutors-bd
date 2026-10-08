// Gets an Admin (usually the Owner) back in when they cannot sign in: sets a new
// password, and with --clear-2fa also removes the lost authenticator setup so the
// next sign-in starts 2FA again from a fresh QR code. It also signs the account out
// of every browser it was signed in on.
//
// Run it on the server, in the app folder:
//   node scripts/reset-admin-login.mjs
//   node scripts/reset-admin-login.mjs --user-id owner --clear-2fa
//
// Flags: --user-id, --password (otherwise it asks), --clear-2fa, --require-change
// (makes the Admin choose their own password at the next sign-in). The database
// address comes from DATABASE_URL, or from the .env file in this folder.

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomBytes, scrypt } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import mysql from "mysql2/promise";

// Mirrors server/db.ts hashPassword() so verifyPassword() accepts the result.
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: 32 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(`scrypt$${N}$${R}$${P}$${salt}$${derivedKey.toString("hex")}`);
    });
  });
}

// Mirrors server/db.ts normalizeAdminLoginId().
function normalizeAdminLoginId(userId) {
  const value = String(userId ?? "").trim().toLowerCase();
  return /^[a-z][a-z0-9_-]{2,63}$/.test(value) ? value : undefined;
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

/** DATABASE_URL from the environment, else from the .env file next to package.json. */
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(".env")) return undefined;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = /^\s*DATABASE_URL\s*=\s*(.*)$/.exec(line.replace(/\r$/, ""));
    if (match) return match[1].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return undefined;
}

const url = databaseUrl();
if (!url) {
  console.error("DATABASE_URL was not found. Run this from the app folder (where .env is).");
  process.exit(1);
}

let userId = readArg("--user-id");
let password = readArg("--password");
const clearTwoFactor = process.argv.includes("--clear-2fa");
const requireChange = process.argv.includes("--require-change");

if (!userId || !password) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    if (!userId) userId = (await rl.question("Admin User ID: ")).trim();
    if (!password) password = (await rl.question("New password (min 8 characters, shown as you type): ")).trim();
  } finally {
    rl.close();
  }
}

const loginId = normalizeAdminLoginId(userId);
if (!loginId) {
  console.error("That is not a valid Admin User ID. No changes made.");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("The password must be at least 8 characters. No changes made.");
  process.exit(1);
}

const connection = await mysql.createConnection(url);
try {
  const [[found]] = await connection.query(
    "SELECT u.id, u.email FROM admin_credentials c JOIN users u ON u.id = c.userId WHERE c.loginId = ? AND u.role = 'admin' LIMIT 1",
    [loginId],
  );
  if (!found) {
    console.error(`No Admin has the User ID "${loginId}". No changes made.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await connection.query(
    "UPDATE users SET passwordHash = ?, loginMethod = 'password', sessionsValidFrom = NOW() WHERE id = ?",
    [passwordHash, found.id],
  );
  await connection.query("UPDATE admin_credentials SET passwordChangeRequired = ? WHERE userId = ?", [requireChange ? 1 : 0, found.id]);
  await connection.query(
    "INSERT INTO admin_login_audit_logs (userId, email, event, metadata) VALUES (?, ?, 'credential_reset', ?)",
    [found.id, found.email, JSON.stringify({ reason: "reset from the server" })],
  );

  if (clearTwoFactor) {
    await connection.query("DELETE FROM admin_two_factor_recovery_codes WHERE userId = ?", [found.id]);
    await connection.query("DELETE FROM admin_two_factor_settings WHERE userId = ?", [found.id]);
    await connection.query(
      "INSERT INTO admin_login_audit_logs (userId, email, event, metadata) VALUES (?, ?, 'two_factor_reset', ?)",
      [found.id, found.email, JSON.stringify({ reason: "reset from the server" })],
    );
  }

  console.log(`Done. "${loginId}" can sign in at /admin/login with the new password.`);
  console.log("Every browser that was signed in as this Admin has been signed out.");
  console.log(clearTwoFactor
    ? "Two-factor setup was cleared: the next sign-in asks for a new QR code."
    : "Two-factor setup was not changed. Add --clear-2fa if the authenticator app is lost too.");
} finally {
  await connection.end();
}
