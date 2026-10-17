// Read-only check for "phone alerts never arrive". Changes nothing: it only reads.
// It answers the three questions that decide whether a push can reach anyone:
// are the push keys set, are the alert tables there, and which phones the server knows.
//
// Run it on the server, in the app folder:
//   node scripts/push-status.mjs
//
// The database address and push keys come from the environment, or from the .env
// file in this folder.

import { existsSync, readFileSync } from "node:fs";
import mysql from "mysql2/promise";

/** A value from the environment, else from the .env file next to package.json. */
function setting(name) {
  if (process.env[name]) return process.env[name];
  if (!existsSync(".env")) return undefined;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`).exec(line.replace(/\r$/, ""));
    if (match) return match[1].trim().replace(/^(['"])(.*)\1$/, "$2") || undefined;
  }
  return undefined;
}

function host(endpoint) {
  try {
    return new URL(endpoint).host;
  } catch {
    return "unknown";
  }
}

const url = setting("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL was not found. Run this from the app folder (where .env is).");
  process.exit(1);
}

const hasKeys = Boolean(setting("VAPID_PUBLIC_KEY") && setting("VAPID_PRIVATE_KEY"));
console.log("Push check (read-only)");
console.log(`Push keys (VAPID) set ................ ${hasKeys ? "YES" : "NO  <- phone alerts cannot work until these are set"}`);

const connection = await mysql.createConnection(url);
try {
  const [tables] = await connection.query(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('admin_push_subscriptions', 'admin_push_preferences', 'push_subscriptions')",
  );
  const present = new Set(tables.map(row => row.name));
  for (const name of ["admin_push_subscriptions", "admin_push_preferences", "push_subscriptions"]) {
    console.log(`Table ${name.padEnd(26, " ")} ${present.has(name) ? "found" : "MISSING  <- run update.sh again"}`);
  }

  if (present.has("admin_push_subscriptions")) {
    const [devices] = await connection.query(
      "SELECT s.id, s.adminId, s.endpoint, s.createdAt, u.name, u.role FROM admin_push_subscriptions s LEFT JOIN users u ON u.id = s.adminId ORDER BY s.createdAt",
    );
    console.log(`\nAdmin phones/browsers the server will alert: ${devices.length}`);
    for (const device of devices) {
      console.log(`  - ${device.name ?? "?"} (user ${device.adminId}, ${device.role ?? "?"}) via ${host(device.endpoint)}, added ${new Date(device.createdAt).toISOString().slice(0, 10)}`);
    }
    if (devices.length === 0) console.log("  none: in Admin > Settings > Notifications, switch it ON on the phone and press the test button");
  }

  if (present.has("push_subscriptions")) {
    const [[row]] = await connection.query("SELECT COUNT(*) AS total FROM push_subscriptions");
    console.log(`\nTutor/Guardian/account phones known: ${row.total}`);
  }
} finally {
  await connection.end();
}
