import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Times are stored as the real moment (a TIMESTAMP is a UTC epoch inside), and
 * the app connects in UTC (server/database-connection.ts). NOW() is the real
 * moment in any session zone, so it is what a migration writes. UTC_TIMESTAMP()
 * is the UTC *clock text*, which a session in another zone (the live host's
 * Asia/Dhaka, where migrations run) would read as local time and store six
 * hours early. Migration 0110 once used NOW() against the old connection and
 * locked every Admin out; the fix moved the connection, not the statement.
 */
describe("migrations that write a time", () => {
  const folder = path.resolve(import.meta.dirname, "..", "drizzle");
  const files = fs.readdirSync(folder).filter(name => name.endsWith(".sql"));
  const codeOf = (file: string) => fs.readFileSync(path.join(folder, file), "utf-8").split(/\r?\n/).map(line => line.replace(/--.*$/, ""));

  it("never write UTC clock text, except to measure the server's offset", () => {
    const offenders: string[] = [];
    for (const file of files) {
      codeOf(file).forEach((code, index) => {
        const withoutOffset = code.replace(/TIMESTAMPDIFF\(SECOND, UTC_TIMESTAMP\(\), NOW\(\)\)/g, "");
        if (/\bUTC_(TIMESTAMP|DATE|TIME)\b/i.test(withoutOffset)) offenders.push(`${file}:${index + 1}: ${code.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("keeps 0110 on NOW(), the real moment in any zone", () => {
    const sql = codeOf("0110_admin_sessions_can_end.sql").join("\n");
    expect(sql).toMatch(/sessionsValidFrom`\s*=\s*NOW\(\)/);
  });
});

describe("migration 0111, which moves the times the app wrote", () => {
  const sql = fs.readFileSync(path.resolve(import.meta.dirname, "..", "drizzle", "0111_database_times_in_utc.sql"), "utf-8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map(chunk => chunk.split(/\r?\n/).filter(line => !line.trim().startsWith("--")).join(" ").trim())
    .filter(Boolean);

  it("is only UPDATEs, each moving a time by the server's own offset from UTC", () => {
    expect(statements.length).toBeGreaterThan(10);
    for (const statement of statements) {
      expect(statement).toMatch(/^UPDATE `\w+` SET /);
      expect(statement).not.toMatch(/\bWHERE\b|\bDELETE\b|\bDROP\b|\bALTER\b/i);
      const shifts = statement.match(/DATE_ADD\(`(\w+)`, INTERVAL TIMESTAMPDIFF\(SECOND, UTC_TIMESTAMP\(\), NOW\(\)\) SECOND\)/g) ?? [];
      expect(shifts.length).toBeGreaterThan(0);
    }
  });

  it("keeps updatedAt from following the shift", () => {
    const withUpdatedAt = statements.filter(statement => statement.includes("`updatedAt` = `updatedAt`"));
    expect(withUpdatedAt.length).toBeGreaterThan(5);
    for (const statement of statements) expect(statement).not.toMatch(/`updatedAt` = DATE_ADD/);
  });

  it("moves a time the app writes, and leaves alone one the database fills in or 0110 already set right", () => {
    const all = statements.join("\n");
    expect(all).toContain("UPDATE `users` SET `lastSignedIn` = DATE_ADD(");
    expect(all).toContain("`tutor_requests` SET");
    expect(all).not.toMatch(/`createdAt` = DATE_ADD/);
    expect(all).not.toMatch(/`sessionsValidFrom` = DATE_ADD/);
  });
});
