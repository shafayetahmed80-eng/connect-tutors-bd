import { execFile, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

// Runs the real update.sh --rollback in a made-up app folder: a small git history,
// a site in dist/ and its predecessor in dist-old/. Only a GNU bash with git and curl
// will do, so the suite is skipped where that is not at hand (a plain Windows shell).
const run = promisify(execFile);
const script = resolve(__dirname, "../update.sh");
const bashReady =
  (process.platform !== "win32" || Boolean(process.env.MSYSTEM)) &&
  spawnSync("bash", ["-c", "git --version && curl --version"], { stdio: "ignore" }).status === 0;

let work: string;
let health: Server;
let healthUrl: string;
const deadUrl = "http://127.0.0.1:9";

beforeAll(async () => {
  if (!bashReady) return;
  health = createServer((_request, response) => response.end('{"status":"ok"}'));
  await new Promise<void>(done => health.listen(0, "127.0.0.1", done));
  healthUrl = `http://127.0.0.1:${(health.address() as AddressInfo).port}`;
});

afterAll(() => {
  health?.close();
});

afterEach(() => {
  if (work) rmSync(work, { recursive: true, force: true });
});

async function git(cwd: string, ...args: string[]) {
  const { stdout } = await run("git", ["-c", "user.email=test@example.test", "-c", "user.name=Test", "-c", "commit.gpgsign=false", ...args], { cwd });
  return stdout.trim();
}

/** Two commits - the second adds a database step and a new lockfile when `migration` is set - and a site built from each. */
async function makeApp(options: { migration: boolean; markers?: boolean; siteUrl?: string }) {
  work = mkdtempSync(join(tmpdir(), "rollback-"));
  const app = join(work, "app");
  for (const folder of ["drizzle", "dist", "dist-old"]) mkdirSync(join(app, folder), { recursive: true });
  await git(app, "init", "-q", "-b", "main");
  copyFileSync(script, join(app, "update.sh"));
  writeFileSync(join(app, ".gitignore"), "dist\ndist-old\ndist-swap\ndist-next\ntmp\n.env\n");
  writeFileSync(join(app, "pnpm-lock.yaml"), "lock 1\n");
  writeFileSync(join(app, "drizzle/0001.sql"), "SELECT 1;\n");
  await git(app, "add", "-A");
  await git(app, "commit", "-q", "-m", "First version");
  const first = await git(app, "rev-parse", "HEAD");
  if (options.migration) {
    writeFileSync(join(app, "drizzle/0002.sql"), "SELECT 2;\n");
    writeFileSync(join(app, "pnpm-lock.yaml"), "lock 2\n");
  } else {
    writeFileSync(join(app, "readme.txt"), "text\n");
  }
  await git(app, "add", "-A");
  await git(app, "commit", "-q", "-m", "Second version");
  const second = await git(app, "rev-parse", "HEAD");

  writeFileSync(join(app, "dist/index.js"), "new site\n");
  writeFileSync(join(app, "dist-old/index.js"), "old site\n");
  if (options.markers !== false) {
    writeFileSync(join(app, "dist/.commit"), `${second}\n`);
    writeFileSync(join(app, "dist-old/.commit"), `${first}\n`);
  }
  writeFileSync(join(app, ".env"), `PUBLIC_SITE_URL=${options.siteUrl ?? healthUrl}\n`);
  mkdirSync(join(work, "home/db-backups"), { recursive: true });
  return { app, first, second, backups: join(work, "home/db-backups") };
}

async function update(app: string, ...args: string[]) {
  try {
    const { stdout, stderr } = await run("bash", ["update.sh", ...args], { cwd: app, env: { ...process.env, HOME: join(work, "home"), HEALTH_PAUSE: "0" } });
    return { code: 0, out: stdout + stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, out: `${failure.stdout ?? ""}${failure.stderr ?? ""}` };
  }
}

const read = (app: string, file: string) => readFileSync(join(app, file), "utf8").trim();

describe.skipIf(!bashReady)("update.sh --rollback", () => {
  it("puts the previous site and its code back, restarts, and says the database was left alone", async () => {
    const { app, first, second, backups } = await makeApp({ migration: true });
    writeFileSync(join(backups, `connect-tutors-20261010-000000-before-${second.slice(0, 7)}.sql.gz`), "");

    const result = await update(app, "--rollback");

    expect(result.code).toBe(0);
    expect(read(app, "dist/index.js")).toBe("old site");
    expect(read(app, "dist/.commit")).toBe(first);
    expect(read(app, "dist-old/index.js")).toBe("new site");
    expect(await git(app, "rev-parse", "HEAD")).toBe(first);
    expect(existsSync(join(app, "tmp/restart.txt"))).toBe(true);
    expect(result.out).toContain("The database was NOT touched");
    expect(result.out).toContain("changed the database (1 step(s))");
    expect(result.out).toContain(`before-${second.slice(0, 7)}.sql.gz`);
    expect(result.out).toContain("scripts/restore-database.sh");
    expect(result.out).toContain("changed the installed packages");
    expect(result.out).toContain("Do not run update.sh again until a fix has been merged");
    expect(result.out).toContain("Rollback finished.");
  });

  it("goes forward again when it is run a second time, and then says nothing about waiting for a fix", async () => {
    const { app, second } = await makeApp({ migration: true });
    await update(app, "--rollback");

    const result = await update(app, "--rollback");

    expect(result.code).toBe(0);
    expect(read(app, "dist/index.js")).toBe("new site");
    expect(await git(app, "rev-parse", "HEAD")).toBe(second);
    expect(result.out).toContain("brought the newer site back");
    expect(result.out).not.toContain("Do not run update.sh again");
  });

  it("says so when the update it undoes left the database alone", async () => {
    const { app } = await makeApp({ migration: false });

    const result = await update(app, "--rollback");

    expect(result.code).toBe(0);
    expect(result.out).toContain("did not change the database");
    expect(result.out).not.toContain("installed packages");
  });

  it("still goes back, and says it cannot tell about the database, when the sites carry no version marker", async () => {
    const { app, second } = await makeApp({ migration: true, markers: false });

    const result = await update(app, "--rollback");

    expect(result.code).toBe(0);
    expect(read(app, "dist/index.js")).toBe("old site");
    expect(await git(app, "rev-parse", "HEAD")).toBe(second);
    expect(result.out).toContain("cannot tell whether the update");
  });

  it("exits with a failure and tells the Owner to press Restart when the site does not answer", async () => {
    const { app } = await makeApp({ migration: false, siteUrl: deadUrl });

    const result = await update(app, "--rollback");

    expect(result.code).toBe(1);
    expect(read(app, "dist/index.js")).toBe("old site");
    expect(result.out).toContain("did not answer");
    expect(result.out).toContain("Press Restart in cPanel");
  }, 60_000);

  it("changes nothing when there is no earlier site", async () => {
    const { app } = await makeApp({ migration: false });
    rmSync(join(app, "dist-old"), { recursive: true });

    const result = await update(app, "--rollback");

    expect(result.code).toBe(1);
    expect(result.out).toContain("no earlier site");
    expect(read(app, "dist/index.js")).toBe("new site");
  });

  it("changes nothing when code files were edited by hand", async () => {
    const { app } = await makeApp({ migration: false });
    writeFileSync(join(app, "readme.txt"), "edited on the server\n");

    const result = await update(app, "--rollback");

    expect(result.code).toBe(1);
    expect(result.out).toContain("edited by hand");
    expect(read(app, "dist/index.js")).toBe("new site");
    expect(read(app, "readme.txt")).toBe("edited on the server");
  });

  it("refuses an option it does not know", async () => {
    const { app } = await makeApp({ migration: false });

    const result = await update(app, "--nonsense");

    expect(result.code).toBe(1);
    expect(result.out).toContain("only --build-here or --rollback is allowed");
  });
});
