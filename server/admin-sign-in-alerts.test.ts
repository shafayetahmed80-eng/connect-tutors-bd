import { describe, expect, it } from "vitest";
import { adminNewDevicePush, adminWrongPasswordPush, createFailureStreak } from "./admin-sign-in-alerts";

describe("a run of wrong passwords", () => {
  it("is reported once, when the fifth arrives", () => {
    const streak = createFailureStreak({ threshold: 5, windowMs: 60_000 });
    expect([1, 2, 3, 4].map(() => streak.record("admin-1"))).toEqual([false, false, false, false]);
    expect(streak.record("admin-1")).toBe(true);
    expect(streak.record("admin-1")).toBe(false);
    expect(streak.record("admin-1")).toBe(false);
  });

  it("counts each account on its own", () => {
    const streak = createFailureStreak({ threshold: 2, windowMs: 60_000 });
    expect(streak.record("admin-1")).toBe(false);
    expect(streak.record("admin-2")).toBe(false);
    expect(streak.record("admin-1")).toBe(true);
  });

  it("starts again after a correct sign-in", () => {
    const streak = createFailureStreak({ threshold: 3, windowMs: 60_000 });
    streak.record("admin-1");
    streak.record("admin-1");
    streak.reset("admin-1");
    expect(streak.record("admin-1")).toBe(false);
    expect(streak.record("admin-1")).toBe(false);
    expect(streak.record("admin-1")).toBe(true);
  });

  it("forgets attempts that are older than the window, and may report again later", () => {
    let clock = 0;
    const streak = createFailureStreak({ threshold: 2, windowMs: 1_000 }, () => clock);
    expect(streak.record("admin-1")).toBe(false);
    clock = 1_500;
    expect(streak.record("admin-1")).toBe(false);
    expect(streak.record("admin-1")).toBe(true);
    clock = 2_600;
    expect(streak.record("admin-1")).toBe(false);
    expect(streak.record("admin-1")).toBe(true);
  });
});

describe("what the Owner's phone is told", () => {
  it("names the Admin and the address, and opens the security page", () => {
    expect(adminNewDevicePush("owner", "203.0.113.9")).toEqual({
      title: "New Admin sign-in",
      body: "owner signed in from a new device (203.0.113.9). If this was not them, use Sign out everywhere.",
      url: "/admin/security",
    });
    expect(adminWrongPasswordPush("owner", "203.0.113.9")).toEqual({
      title: "Wrong Admin password",
      body: "owner had 5 wrong passwords in a row from 203.0.113.9.",
      url: "/admin/security",
    });
  });
});
