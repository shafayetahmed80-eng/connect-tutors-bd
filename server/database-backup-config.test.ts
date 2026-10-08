import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const script = resolve(__dirname, "../scripts/database-backup-config.mjs");
let work: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "backup-config-"));
});
afterEach(() => rmSync(work, { recursive: true, force: true }));

function run(env: Record<string, string> = {}) {
  const target = join(work, "options.cnf");
  const result = spawnSync(process.execPath, [script, target], {
    cwd: work,
    env: { PATH: process.env.PATH ?? "", ...env },
    encoding: "utf8",
  });
  return { ...result, target };
}

describe("the options file the database backup reads its login from", () => {
  it("prints the database name and writes host, port, user and password", () => {
    const result = run({ DATABASE_URL: "mysql://connectt_app:s3cret@db.example.test:3307/connectt_site" });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("connectt_site");
    expect(readFileSync(result.target, "utf8")).toBe('[client]\nhost="db.example.test"\nport="3307"\nuser="connectt_app"\npassword="s3cret"\n');
  });

  it("keeps a password with awkward characters exactly as it was", () => {
    // p@ss"w#rd\ and a space, as they appear percent-encoded in an address.
    const result = run({ DATABASE_URL: "mysql://u:p%40ss%22w%23rd%5C%20x@localhost/db" });

    expect(result.status).toBe(0);
    expect(readFileSync(result.target, "utf8")).toContain('password="p@ss\\"w#rd\\\\ x"');
  });

  it("uses port 3306 when the address has none", () => {
    const result = run({ DATABASE_URL: "mysql://u:p@localhost/db" });
    expect(readFileSync(result.target, "utf8")).toContain('port="3306"');
  });

  it("reads the address from .env when the environment has none, whatever the line endings and quotes", () => {
    writeFileSync(join(work, ".env"), 'JWT_SECRET=abc\r\nDATABASE_URL="mysql://u:p@localhost:3306/from_env_file"\r\nPORT=3000\r\n');

    const result = run();

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("from_env_file");
  });

  it("never shows the password on the screen", () => {
    const result = run({ DATABASE_URL: "mysql://u:topsecretvalue@localhost/db" });
    expect(`${result.stdout}${result.stderr}`).not.toContain("topsecretvalue");
  });

  it.skipIf(process.platform === "win32")("makes the file readable by its owner only", () => {
    const result = run({ DATABASE_URL: "mysql://u:p@localhost/db" });
    expect(statSync(result.target).mode & 0o777).toBe(0o600);
  });

  it.each([
    ["nothing to read", {}, "DATABASE_URL was not found"],
    ["not an address", { DATABASE_URL: "not a url" }, "not a valid address"],
    ["another kind of database", { DATABASE_URL: "postgres://u:p@localhost/db" }, "must start with mysql://"],
    ["no database name", { DATABASE_URL: "mysql://u:p@localhost" }, "missing the host, user or database name"],
    ["no user", { DATABASE_URL: "mysql://localhost/db" }, "missing the host, user or database name"],
  ] as const)("stops with a plain reason when there is %s", (_label, env, reason) => {
    const result = run(env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(reason);
    expect(result.stdout).toBe("");
  });
});
