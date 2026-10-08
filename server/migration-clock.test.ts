import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The live host's database keeps its own clock in Asia/Dhaka, while the app
 * reads every stored time as UTC. A column default (`DEFAULT (now())`) is
 * unavoidable and the app copes; but a migration that WRITES a time with NOW()
 * stores the host's clock, which the app then reads six hours ahead. Migration
 * 0110 did exactly that and locked every Admin out. Such a statement must use
 * UTC_TIMESTAMP() instead.
 */
describe("migrations that write a time", () => {
  const folder = path.resolve(import.meta.dirname, "..", "drizzle");
  const files = fs.readdirSync(folder).filter(name => name.endsWith(".sql"));

  it("never write the database server's own clock", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const lines = fs.readFileSync(path.join(folder, file), "utf-8").split(/\r?\n/);
      lines.forEach((line, index) => {
        const code = line.replace(/--.*$/, "");
        const writesNow = /\b(NOW|CURRENT_TIMESTAMP|CURTIME|CURDATE|SYSDATE)\s*\(/i.test(code) || /\bCURRENT_TIMESTAMP\b(?!\s*\()/i.test(code);
        const isColumnDefault = /\bDEFAULT\b|\bON UPDATE\b/i.test(code);
        if (writesNow && !isColumnDefault) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("includes the one that used to", () => {
    const sql = fs.readFileSync(path.join(folder, "0110_admin_sessions_can_end.sql"), "utf-8");
    expect(sql).toContain("UTC_TIMESTAMP()");
    expect(sql).not.toMatch(/=\s*NOW\(\)/i);
  });
});
