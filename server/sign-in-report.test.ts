import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";
import * as db from "./db";
import { __resetAuthRateLimitsForTests, appRouter } from "./routers";
import { describeSignInBlock, dhakaDay, signInBlockId, summariseSignInEvents } from "./sign-in-report";

const at = (iso: string) => new Date(iso);

describe("summariseSignInEvents", () => {
  const now = at("2026-09-24T12:00:00Z");

  it("counts each event in its column on its Bangladesh day, newest day first, zero-filled", () => {
    const report = summariseSignInEvents([
      { event: "registration_success", role: "guardian", reason: null, createdAt: at("2026-09-24T05:00:00Z") },
      { event: "registration_success", role: "tutor", reason: null, createdAt: at("2026-09-24T06:00:00Z") },
      { event: "login_success", role: "tutor", reason: null, createdAt: at("2026-09-24T07:00:00Z") },
      { event: "login_failure", role: "guardian", reason: "invalid-credentials", createdAt: at("2026-09-23T07:00:00Z") },
      { event: "login_failure", role: "guardian", reason: "role-mismatch", createdAt: at("2026-09-23T08:00:00Z") },
      { event: "login_blocked", role: "tutor", reason: null, createdAt: at("2026-09-22T08:00:00Z") },
      { event: "phone_intake", role: "guardian", reason: null, createdAt: at("2026-09-24T08:00:00Z") },
      { event: "phone_code_sent", role: "tutor", reason: null, createdAt: at("2026-09-24T09:00:00Z") },
      { event: "phone_code_sent", role: "guardian", reason: "dev-log", createdAt: at("2026-09-24T09:05:00Z") },
      { event: "phone_code_rejected", role: "tutor", reason: "wrong", createdAt: at("2026-09-24T09:06:00Z") },
      { event: "phone_verified", role: "tutor", reason: null, createdAt: at("2026-09-24T09:07:00Z") },
    ], 3, now);

    expect(report.days.map(day => day.date)).toEqual(["2026-09-24", "2026-09-23", "2026-09-22"]);
    expect(report.days[0]).toMatchObject({ newGuardians: 1, newTutors: 1, signIns: 1, failed: 0, wrongCard: 0, blocked: 0, codesSent: 2, codesVerified: 1, wrongCodes: 1 });
    expect(report.days[1]).toMatchObject({ failed: 1, wrongCard: 1 });
    expect(report.days[2]).toMatchObject({ blocked: 1 });
    expect(report.totals).toEqual({ newGuardians: 1, newTutors: 1, signIns: 1, failed: 1, wrongCard: 1, blocked: 1, codesSent: 2, codesVerified: 1, wrongCodes: 1 });
  });

  it("files a late-evening UTC event under the next Dhaka day", () => {
    expect(dhakaDay(at("2026-09-23T19:30:00Z"))).toBe("2026-09-24");
    const report = summariseSignInEvents([{ event: "login_success", role: "tutor", reason: null, createdAt: at("2026-09-23T19:30:00Z") }], 2, now);
    expect(report.days[0]).toMatchObject({ date: "2026-09-24", signIns: 1 });
  });

  it("ignores events older than the window", () => {
    const report = summariseSignInEvents([{ event: "login_success", role: "tutor", reason: null, createdAt: at("2026-09-01T07:00:00Z") }], 7, now);
    expect(report.totals.signIns).toBe(0);
  });
});

describe("describeSignInBlock", () => {
  it("reads an account key back with the identifier masked", () => {
    expect(describeSignInBlock("account", "pair:203.0.113.9:tutor:tutor@example.com", 120)).toEqual({
      id: signInBlockId("pair:203.0.113.9:tutor:tutor@example.com"),
      kind: "account",
      ip: "203.0.113.9",
      role: "tutor",
      identifierMasked: "tu***@example.com",
      retryAfterSeconds: 120,
    });
  });

  it("keeps an IPv6 address whole", () => {
    expect(describeSignInBlock("account", "pair:2001:db8::1:guardian:+8801712345678", 60)).toMatchObject({ ip: "2001:db8::1", role: "guardian", identifierMasked: "***********678" });
  });

  it("reads connection and registration keys as an IP", () => {
    expect(describeSignInBlock("connection", "ip:198.51.100.4", 30)).toMatchObject({ ip: "198.51.100.4", role: null, identifierMasked: null });
    expect(describeSignInBlock("registration", "reg:198.51.100.4", 30)).toMatchObject({ ip: "198.51.100.4" });
  });
});

describe("the Owner's sign-in blocks", () => {
  const owner = {
    id: 42, openId: ENV.ownerOpenId, email: "owner@example.com", name: "Project Owner", passwordHash: null, loginMethod: "oauth",
    role: "admin" as const, accountStatus: "active" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  const caller = (user: TrpcContext["user"], ip = "203.0.113.9") => appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { "x-forwarded-for": ip } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);

  beforeEach(() => {
    __resetAuthRateLimitsForTests();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(db, "recordAuthEvent").mockResolvedValue({ id: 0 });
    vi.spyOn(db, "verifyPasswordAccount").mockResolvedValue({ status: "invalid-credentials" });
  });
  afterEach(() => vi.restoreAllMocks());

  it("lists an account locked by repeated failures, masked, and unlocks it", async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await caller(null).auth.loginAccount({ role: "tutor", identifier: "tutor@example.com", password: "wrong-pass" }).catch(() => undefined);
    }
    await expect(caller(null).auth.loginAccount({ role: "tutor", identifier: "tutor@example.com", password: "wrong-pass" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

    const blocks = await caller(owner).admin.listSignInBlocks();
    const account = blocks.find(block => block.kind === "account");
    expect(account).toMatchObject({ ip: "203.0.113.9", role: "tutor", identifierMasked: "tu***@example.com" });
    expect(JSON.stringify(blocks)).not.toContain("tutor@example.com");

    await expect(caller(owner).admin.clearSignInBlock({ id: account!.id })).resolves.toEqual({ cleared: true });
    expect((await caller(owner).admin.listSignInBlocks()).some(block => block.kind === "account")).toBe(false);
    await expect(caller(owner).admin.clearSignInBlock({ id: account!.id })).resolves.toEqual({ cleared: false });
  });

  it("is the Owner's alone", async () => {
    const admin = { ...owner, id: 43, openId: `${ENV.ownerOpenId}-not-owner` };
    await expect(caller(admin).admin.listSignInBlocks()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(admin).admin.getSignInReport({ windowDays: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
