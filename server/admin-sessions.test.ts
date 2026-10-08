import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import { ADMIN_KNOWN_DEVICE_COOKIE_NAME, ADMIN_TWO_FACTOR_COOKIE_NAME, ADMIN_TWO_FACTOR_SESSION_TTL_MS } from "../shared/const";
import { isSessionStillValid } from "./_core/sdk";
import { ENV } from "./_core/env";
import { resetSessionCutoffWarning, usableSessionsValidFrom } from "./_core/session-cutoff";
import { createAdminKnownDeviceToken, createAdminTwoFactorSessionProof, verifyAdminKnownDeviceToken, verifyAdminTwoFactorSessionProof } from "./admin-security";
import { hasAdminTwoFactorProof, isKnownAdminDevice } from "./admin-two-factor";

const KEY = "a stable test-only key material that is long enough for encryption";

function requestWithCookie(name: string, value: string) {
  return { headers: { cookie: `${name}=${value}` } } as unknown as Request;
}

describe("a session after 'Sign out everywhere'", () => {
  const endedAt = new Date("2026-10-08T10:00:00.000Z");
  const endedAtSeconds = endedAt.getTime() / 1000;

  it("is good when nothing was ever ended", () => {
    expect(isSessionStillValid(undefined, null)).toBe(true);
    expect(isSessionStillValid(1, undefined)).toBe(true);
  });

  it("is ended when it was signed before the moment, and good when signed at or after it", () => {
    expect(isSessionStillValid(endedAtSeconds - 1, endedAt)).toBe(false);
    expect(isSessionStillValid(endedAtSeconds, endedAt)).toBe(true);
    expect(isSessionStillValid(endedAtSeconds + 600, endedAt)).toBe(true);
  });

  it("cannot be proven newer when it carries no issue time, so it is ended", () => {
    expect(isSessionStillValid(undefined, endedAt)).toBe(false);
  });

  it("ignores the fraction of a second the stored moment might carry", () => {
    expect(isSessionStillValid(endedAtSeconds, new Date(endedAt.getTime() + 700))).toBe(true);
  });
});

describe("a session cutoff written with the wrong clock", () => {
  const now = Date.parse("2026-10-08T11:40:00.000Z");
  /** What the live database once stored: its own Dhaka clock, read back as if it were UTC. */
  const sixHoursAhead = new Date(now + 6 * 60 * 60 * 1000);

  it("does not lock out a session signed after the real moment it was meant for", () => {
    const signedInNow = now / 1000;
    expect(isSessionStillValid(signedInNow, sixHoursAhead, now)).toBe(true);
  });

  it("is ignored for a session with no issue time as well, rather than ending it", () => {
    expect(isSessionStillValid(undefined, sixHoursAhead, now)).toBe(true);
  });

  it("still believes a cutoff a moment ahead, for clocks that disagree by a second", () => {
    const aMomentAhead = new Date(now + 30_000);
    expect(isSessionStillValid(now / 1000, aMomentAhead, now)).toBe(false);
  });

  it("warns once that it ignored one, so the Owner can find the cause in the log", () => {
    resetSessionCutoffWarning();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    usableSessionsValidFrom(sixHoursAhead, now);
    usableSessionsValidFrom(sixHoursAhead, now);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("session cutoff in the future");
    warn.mockRestore();
  });
});

describe("the remembered second factor after 'Sign out everywhere'", () => {
  const proof = (earnedAtMs: number) => createAdminTwoFactorSessionProof(7, ENV.cookieSecret, earnedAtMs + ADMIN_TWO_FACTOR_SESSION_TTL_MS);

  it("still counts when nothing was ended", () => {
    const req = requestWithCookie(ADMIN_TWO_FACTOR_COOKIE_NAME, proof(Date.now()));
    expect(hasAdminTwoFactorProof(req, 7)).toBe(true);
    expect(hasAdminTwoFactorProof(req, 7, null)).toBe(true);
  });

  it("stops counting if it was earned before the account was signed out everywhere", () => {
    const earned = Date.now() - 60_000;
    const req = requestWithCookie(ADMIN_TWO_FACTOR_COOKIE_NAME, proof(earned));
    expect(hasAdminTwoFactorProof(req, 7, new Date(earned + 30_000))).toBe(false);
  });

  it("counts when the only cutoff is one written with the wrong clock, hours in the future", () => {
    const now = Date.now();
    const req = requestWithCookie(ADMIN_TWO_FACTOR_COOKIE_NAME, proof(now));
    expect(hasAdminTwoFactorProof(req, 7, new Date(now + 6 * 60 * 60 * 1000), now)).toBe(true);
  });

  it("counts again when it is earned after that moment", () => {
    const endedAt = new Date(Date.now() - 60_000);
    const req = requestWithCookie(ADMIN_TWO_FACTOR_COOKIE_NAME, proof(Date.now()));
    expect(hasAdminTwoFactorProof(req, 7, endedAt)).toBe(true);
  });
});

describe("a browser an Admin has signed in from before", () => {
  it("is recognised for that Admin only, until it runs out", () => {
    const token = createAdminKnownDeviceToken(7, KEY, Date.now() + 60_000);
    expect(verifyAdminKnownDeviceToken(token, 7, KEY)).toBe(true);
    expect(verifyAdminKnownDeviceToken(token, 8, KEY)).toBe(false);
    expect(verifyAdminKnownDeviceToken(token, 7, "another key")).toBe(false);
    expect(verifyAdminKnownDeviceToken(token, 7, KEY, Date.now() + 120_000)).toBe(false);
    expect(verifyAdminKnownDeviceToken(`${token}x`, 7, KEY)).toBe(false);
    expect(verifyAdminKnownDeviceToken(undefined, 7, KEY)).toBe(false);
  });

  it("is read from its own cookie", () => {
    const token = createAdminKnownDeviceToken(7, ENV.cookieSecret, Date.now() + 60_000);
    expect(isKnownAdminDevice(requestWithCookie(ADMIN_KNOWN_DEVICE_COOKIE_NAME, token), 7)).toBe(true);
    expect(isKnownAdminDevice(requestWithCookie("something-else", token), 7)).toBe(false);
  });

  it("can never be passed off as the second-factor proof, nor the other way round", () => {
    const expiresAt = Date.now() + 60_000;
    const deviceToken = createAdminKnownDeviceToken(7, KEY, expiresAt);
    const proof = createAdminTwoFactorSessionProof(7, KEY, expiresAt);
    expect(verifyAdminTwoFactorSessionProof(deviceToken, 7, KEY)).toBe(false);
    expect(verifyAdminKnownDeviceToken(proof, 7, KEY)).toBe(false);
  });
});
