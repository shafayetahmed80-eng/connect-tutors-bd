// Used by scripts/backup-database.sh. Reads DATABASE_URL (from the environment,
// else from the .env file in the current folder), writes a small options file that
// mysqldump reads its host, user and password from, and prints the database name.
//
// The password goes into that file instead of onto the mysqldump command line,
// where any other user on the server could see it in the process list.
//
//   node scripts/database-backup-config.mjs /path/to/options-file

import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Splits a mysql://user:password@host:port/name address into the parts mysqldump needs. */
export function parseDatabaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL is not a valid address.");
  }
  if (url.protocol !== "mysql:" && url.protocol !== "mariadb:") throw new Error("DATABASE_URL must start with mysql://");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const user = decodeURIComponent(url.username);
  if (!url.hostname || !user || !database) throw new Error("DATABASE_URL is missing the host, user or database name.");
  return {
    host: url.hostname,
    port: url.port || "3306",
    user,
    password: decodeURIComponent(url.password),
    database,
  };
}

/** The [client] options file text. Values are quoted so a # or a space in the password is safe. */
export function optionsFileText({ host, port, user, password }) {
  for (const part of [host, port, user, password]) {
    if (/[\r\n\0]/.test(part)) throw new Error("DATABASE_URL has a line break in it.");
  }
  const quote = text => `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return `[client]\nhost=${quote(host)}\nport=${quote(port)}\nuser=${quote(user)}\npassword=${quote(password)}\n`;
}

/** DATABASE_URL from the environment, else from the .env file in the current folder. */
export function readDatabaseUrl(env = process.env, envFile = ".env") {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (!existsSync(envFile)) return undefined;
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = /^\s*DATABASE_URL\s*=\s*(.*)$/.exec(line.replace(/\r$/, ""));
    if (match) return match[1].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return undefined;
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node scripts/database-backup-config.mjs <options-file>");
    process.exit(2);
  }
  try {
    const value = readDatabaseUrl();
    if (!value) throw new Error("DATABASE_URL was not found in the environment or in .env.");
    const parts = parseDatabaseUrl(value);
    writeFileSync(target, optionsFileText(parts), { mode: 0o600 });
    chmodSync(target, 0o600);
    process.stdout.write(`${parts.database}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
