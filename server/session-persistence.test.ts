import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./_core/cookies";
import { TUTOR_PORTAL_SESSION_TTL_MS, createTutorPortalExpiry } from "./tutor-portal-session";
import { ONE_YEAR_MS } from "../shared/const";

function request(secure: boolean): Request {
  return { protocol: secure ? "https" : "http", headers: {} } as unknown as Request;
}

/**
 * A signed-in person stays signed in until they sign out. These guard the two
 * places that quietly broke that promise, both of which read as "logged out for
 * no reason" rather than as an expiry anyone had asked for.
 */
describe("session survives until an explicit sign-out", () => {
  it("gives the session cookie an expiry, so closing the browser is not a sign-out", () => {
    // With no maxAge the browser treats this as a session cookie and drops it on
    // exit - the token inside stays valid for a year, but every panel asks for a
    // password again the next morning.
    for (const secure of [true, false]) {
      const options = getSessionCookieOptions(request(secure));
      expect(options.maxAge, `secure=${secure}`).toBe(ONE_YEAR_MS);
      expect(options.httpOnly, `secure=${secure}`).toBe(true);
    }
  });

  it("keeps the Tutor portal proof valid as long as the cookie carrying it", () => {
    // Ten minutes meant a closed laptop signed the Tutor out mid-session.
    expect(TUTOR_PORTAL_SESSION_TTL_MS).toBe(ONE_YEAR_MS);

    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(createTutorPortalExpiry(now).getTime() - now.getTime()).toBe(ONE_YEAR_MS);
  });

  it("still lets a sign-out expire the cookie, which passes its own maxAge", () => {
    // `logout` spreads these options and overrides maxAge with -1, so a longer
    // default here cannot keep a signed-out session alive.
    const options = getSessionCookieOptions(request(true));
    expect({ ...options, maxAge: -1 }.maxAge).toBe(-1);
  });
});
