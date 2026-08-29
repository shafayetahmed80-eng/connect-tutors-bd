// Creates the single Project Owner Admin account for this deployment.
// Independent of Manus OAuth: the Owner Admin signs in with this email and
// password on the /admin/login page.
//
// Usage (recommended — flags):
//   DATABASE_URL=... node scripts/seed-owner-admin.mjs \
//     --name "Your Name" --email owner@example.com --password 'a-strong-password'
//
// Usage (interactive prompts, nothing shown in shell history):
//   DATABASE_URL=... node scripts/seed-owner-admin.mjs
//
// Refuses to run if an Owner Admin already exists — safe to re-run by
// accident. To replace the Owner Admin, remove the isOwner flag from the old
// account in the database first, then re-run this script.

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { registerOwnerAdmin } from "../server/db.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed the Owner Admin account.");
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

async function promptMissing(name, email, password) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    if (!name) name = (await rl.question("Owner Admin full name: ")).trim();
    if (!email) email = (await rl.question("Owner Admin email: ")).trim();
    if (!password) password = (await rl.question("Owner Admin password (min 8 characters): ")).trim();
  } finally {
    rl.close();
  }
  return { name, email, password };
}

let name = readArg("--name");
let email = readArg("--email");
let password = readArg("--password");

if (!name || !email || !password) {
  ({ name, email, password } = await promptMissing(name, email, password));
}

if (!name || !email || !password) {
  throw new Error("Name, email, and password are all required.");
}
if (password.length < 8) {
  throw new Error("Password must be at least 8 characters.");
}

const result = await registerOwnerAdmin({ name, email, password });

if (!result.created) {
  if (result.reason === "owner-exists") {
    console.error("An Owner Admin account already exists. No changes made.");
  } else {
    console.error(`An account with email ${email} already exists. No changes made.`);
  }
  process.exit(1);
}

console.log(`Owner Admin account created for ${email}.`);
console.log("Sign in at /admin/login, then complete the required authenticator (2FA) setup.");
process.exit(0);
