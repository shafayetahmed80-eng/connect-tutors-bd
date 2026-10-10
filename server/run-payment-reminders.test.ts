import { execFile, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Runs the real scripts/run-payment-reminders.sh against a stand-in site. Only a GNU bash
// with curl will do, so the suite is skipped where that is not at hand (a plain Windows shell).
const run = promisify(execFile);
const script = resolve(__dirname, "../scripts/run-payment-reminders.sh");
const bashReady =
  (process.platform !== "win32" || Boolean(process.env.MSYSTEM)) &&
  spawnSync("bash", ["-c", "curl --version"], { stdio: "ignore" }).status === 0;

const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";
let work: string;
let site: Server;
let siteUrl: string;
let answer = { status: 200, body: '{"checked":3,"sent":1,"counts":{"window":1,"second":0,"overdue":0},"dryRun":false}' };
let seen: Array<{ method?: string; url?: string; secret?: string | string[] }> = [];

beforeAll(async () => {
  if (!bashReady) return;
  site = createServer((request: IncomingMessage, response) => {
    seen.push({ method: request.method, url: request.url, secret: request.headers["x-cron-secret"] });
    response.statusCode = answer.status;
    response.end(answer.body);
  });
  await new Promise<void>(done => site.listen(0, "127.0.0.1", done));
  siteUrl = `http://127.0.0.1:${(site.address() as AddressInfo).port}`;
});

afterAll(() => {
  site?.close();
});

beforeEach(() => {
  seen = [];
  answer = { status: 200, body: '{"checked":3,"sent":1,"counts":{"window":1,"second":0,"overdue":0},"dryRun":false}' };
});

afterEach(() => {
  if (work) rmSync(work, { recursive: true, force: true });
});

function makeApp(env: string) {
  work = mkdtempSync(join(tmpdir(), "reminders-"));
  mkdirSync(join(work, "scripts"));
  copyFileSync(script, join(work, "scripts/run-payment-reminders.sh"));
  writeFileSync(join(work, ".env"), env);
  return work;
}

async function runScript(app: string, ...args: string[]) {
  try {
    const { stdout, stderr } = await run("bash", ["scripts/run-payment-reminders.sh", ...args], { cwd: app });
    return { code: 0, out: stdout, err: stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, out: failure.stdout ?? "", err: failure.stderr ?? "" };
  }
}

describe.skipIf(!bashReady)("scripts/run-payment-reminders.sh", () => {
  it("calls the site with the secret from .env and prints what the site answered", async () => {
    const app = makeApp(`JWT_SECRET=x\nCRON_SECRET=${SECRET}\nPUBLIC_SITE_URL=${siteUrl}\n`);

    const result = await runScript(app);

    expect(result.code).toBe(0);
    expect(result.out).toMatch(/^\d{4}-\d\d-\d\dT[\d:]+Z \{"checked":3,"sent":1,/);
    expect(seen).toEqual([{ method: "POST", url: "/api/cron/payment-reminders", secret: SECRET }]);
  });

  it("only asks for a count with --dry-run", async () => {
    const app = makeApp(`CRON_SECRET=${SECRET}\nPUBLIC_SITE_URL=${siteUrl}\n`);

    const result = await runScript(app, "--dry-run");

    expect(result.code).toBe(0);
    expect(seen[0]?.url).toBe("/api/cron/payment-reminders?dryRun=1");
  });

  it("reads a .env saved on Windows, with quotes and a trailing slash on the address", async () => {
    const app = makeApp(`CRON_SECRET="${SECRET}"\r\nPUBLIC_SITE_URL='${siteUrl}/'\r\n`);

    const result = await runScript(app);

    expect(result.code).toBe(0);
    expect(seen).toEqual([{ method: "POST", url: "/api/cron/payment-reminders", secret: SECRET }]);
  });

  it("stops with the status when the site turns the secret down", async () => {
    answer = { status: 401, body: '{"error":"Unauthorized"}' };
    const app = makeApp(`CRON_SECRET=${SECRET}\nPUBLIC_SITE_URL=${siteUrl}\n`);

    const result = await runScript(app);

    expect(result.code).toBe(1);
    expect(result.err).toContain("the site answered 401");
    expect(result.out).toBe("");
  });

  it("stops with the status when the site is an old one that has no such address", async () => {
    answer = { status: 404, body: "Cannot POST /api/cron/payment-reminders" };
    const app = makeApp(`CRON_SECRET=${SECRET}\nPUBLIC_SITE_URL=${siteUrl}\n`);

    const result = await runScript(app);

    expect(result.code).toBe(1);
    expect(result.err).toContain("the site answered 404");
  });

  it("stops when the site cannot be reached", async () => {
    const app = makeApp(`CRON_SECRET=${SECRET}\nPUBLIC_SITE_URL=http://127.0.0.1:9\n`);

    const result = await runScript(app);

    expect(result.code).toBe(1);
    expect(result.err).toContain("the request to http://127.0.0.1:9 failed");
  }, 60_000);

  it("stops, and says what to add, when .env has no CRON_SECRET", async () => {
    const app = makeApp(`PUBLIC_SITE_URL=${siteUrl}\n`);

    const result = await runScript(app);

    expect(result.code).toBe(1);
    expect(result.err).toContain("CRON_SECRET is not set in .env");
    expect(seen).toEqual([]);
  });

  it("refuses an option it does not know", async () => {
    const app = makeApp(`CRON_SECRET=${SECRET}\nPUBLIC_SITE_URL=${siteUrl}\n`);

    const result = await runScript(app, "--now");

    expect(result.code).toBe(1);
    expect(result.err).toContain("only --dry-run is allowed");
    expect(seen).toEqual([]);
  });
});
