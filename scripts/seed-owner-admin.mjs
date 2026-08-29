// Creates one active Admin account for a local or fresh deployment.
//
// The Admin signs in at /admin/login with the assigned **User ID** and password
// (not an email). Ownership of the Owner-only screens is granted separately by
// setting OWNER_OPEN_ID in .env to the openId this script prints.
//
// Usage (flags — nothing sensitive stays in shell history if you prefer prompts):
//   DATABASE_URL=... node scripts/seed-owner-admin.mjs \
//     --user-id owner --password 'a-strong-password' --name "Your Name" --email you@example.com
//
// Usage (interactive):
//   DATABASE_URL=... node scripts/seed-owner-admin.mjs
//
// Refuses to run if the User ID is already assigned, or if a user with the
// given email already exists. Safe to re-run.

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomBytes, scrypt } from "node:crypto";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed the Admin account.");
}

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

async function promptMissing(values) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    if (!values.userId) values.userId = (await rl.question("Admin User ID (3-64 chars, starts with a letter): ")).trim();
    if (!values.password) values.password = (await rl.question("Admin password (min 8 characters): ")).trim();
    if (!values.name) values.name = (await rl.question("Admin full name (optional): ")).trim();
    if (!values.email) values.email = (await rl.question("Admin email (optional): ")).trim();
  } finally {
    rl.close();
  }
  return values;
}

let values = {
  userId: readArg("--user-id"),
  password: readArg("--password"),
  name: readArg("--name"),
  email: readArg("--email"),
};

if (!values.userId || !values.password) {
  values = await promptMissing(values);
}

const loginId = normalizeAdminLoginId(values.userId);
if (!loginId) {
  throw new Error("User ID must be 3-64 characters: a letter, then letters, numbers, hyphens, or underscores.");
}
if (!values.password || values.password.length < 8) {
  throw new Error("Password must be at least 8 characters.");
}

const email = values.email ? values.email.trim().toLowerCase() : null;
const name = values.name ? values.name.trim() : null;

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [[assigned]] = await connection.query("SELECT userId FROM admin_credentials WHERE loginId = ? LIMIT 1", [loginId]);
  if (assigned) {
    console.error(`User ID "${loginId}" is already assigned to an Admin. No changes made.`);
    process.exit(1);
  }
  if (email) {
    const [[clash]] = await connection.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (clash) {
      console.error(`An account with email ${email} already exists. No changes made.`);
      process.exit(1);
    }
  }

  const openId = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(values.password);

  const [insert] = await connection.query(
    "INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, accountStatus) VALUES (?, ?, ?, ?, 'password', 'admin', 'active')",
    [openId, name, email, passwordHash],
  );
  await connection.query("INSERT INTO admin_credentials (userId, loginId) VALUES (?, ?)", [insert.insertId, loginId]);

  console.log(`Admin created — user id ${insert.insertId}, User ID "${loginId}".`);
  console.log(`Sign in at /admin/login with "${loginId}" and the password you set.`);
  console.log(`To grant the Owner-only screens, add this line to .env and restart:\n  OWNER_OPEN_ID=${openId}`);
} finally {
  await connection.end();
}
