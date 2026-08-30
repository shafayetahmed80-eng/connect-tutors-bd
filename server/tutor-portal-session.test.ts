import { describe, expect, it } from "vitest";
import {
  TUTOR_PORTAL_SESSION_HEADER,
  createTutorPortalExpiry,
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

  it("creates a stale-tab expiry ten minutes ahead of a supplied clock", () => {
    const now = new Date("2026-08-24T00:00:00.000Z");

    expect(createTutorPortalExpiry(now)).toEqual(new Date("2026-08-24T00:10:00.000Z"));
  });
});
