import { describe, expect, it } from "vitest";
import {
  TUTOR_PORTAL_SESSION_HEADER,
  createTutorPortalExpiry,
  TUTOR_PORTAL_SESSION_TTL_MS,
  getTutorPortalTokenFromHeaders,
  hashTutorPortalToken,
} from "./tutor-portal-session";

describe("Tutor portal-session token contract", () => {
  it("uses a deterministic one-way digest without retaining the raw portal token", () => {
    const token = "a".repeat(48);

    expect(hashTutorPortalToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashTutorPortalToken(token)).toBe(hashTutorPortalToken(token));
    expect(hashTutorPortalToken(token)).not.toBe(hashTutorPortalToken("b".repeat(48)));
  });

  it("accepts only a bounded non-empty portal token from the dedicated request header", () => {
    expect(getTutorPortalTokenFromHeaders({ [TUTOR_PORTAL_SESSION_HEADER]: "token-123" })).toBe("token-123");
    expect(getTutorPortalTokenFromHeaders({ [TUTOR_PORTAL_SESSION_HEADER]: ["token-123", "token-456"] })).toBeUndefined();
    expect(getTutorPortalTokenFromHeaders({ [TUTOR_PORTAL_SESSION_HEADER]: "  " })).toBeUndefined();
    expect(getTutorPortalTokenFromHeaders({ [TUTOR_PORTAL_SESSION_HEADER]: "x".repeat(513) })).toBeUndefined();
  });

  it("treats a missing request-header object as an absent portal token", () => {
    expect(getTutorPortalTokenFromHeaders(undefined as never)).toBeUndefined();
  });

  it("dates the proof from a supplied clock, a year out like the cookie carrying it", () => {
    // This was ten minutes, which signed a Tutor out over a lunch break while
    // their account cookie was still valid. Nobody had asked to be signed out.
    const now = new Date("2026-08-24T00:00:00.000Z");

    expect(createTutorPortalExpiry(now).getTime() - now.getTime()).toBe(TUTOR_PORTAL_SESSION_TTL_MS);
    expect(createTutorPortalExpiry(now)).toEqual(new Date("2027-08-24T00:00:00.000Z"));
  });
});
