import { describe, expect, it } from "vitest";
import {
  createGuardianIntakeHandoff,
  verifyGuardianIntakeHandoff,
} from "./guardian-intake-handoff";

const SECRET = "guardian-intake-test-secret";
const NOW = new Date("2026-08-19T10:00:00.000Z");

describe("Guardian intake handoff", () => {
  it("creates a signed opaque handoff without a phone number or database identifier", () => {
    const handoff = createGuardianIntakeHandoff({
      secret: SECRET,
      now: NOW,
      ttlMs: 10 * 60 * 1000,
    });

    expect(handoff.cookieValue).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(handoff.cookieValue).not.toContain("+880");
    expect(handoff.cookieValue).not.toContain("intake");
    expect(handoff.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(handoff.expiresAt.toISOString()).toBe("2026-08-19T10:10:00.000Z");
  });

  it("accepts only an unexpired correctly signed handoff", () => {
    const handoff = createGuardianIntakeHandoff({
      secret: SECRET,
      now: NOW,
      ttlMs: 10 * 60 * 1000,
    });

    expect(
      verifyGuardianIntakeHandoff(handoff.cookieValue, {
        secret: SECRET,
        now: new Date("2026-08-19T10:09:59.000Z"),
      })
    ).toEqual({ tokenHash: handoff.tokenHash });
    expect(
      verifyGuardianIntakeHandoff(`${handoff.cookieValue}tampered`, {
        secret: SECRET,
        now: NOW,
      })
    ).toBeNull();
    expect(
      verifyGuardianIntakeHandoff(handoff.cookieValue, {
        secret: SECRET,
        now: new Date("2026-08-19T10:10:00.000Z"),
      })
    ).toBeNull();
  });
});
