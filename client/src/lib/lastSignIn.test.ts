import { describe, expect, it } from "vitest";
import { describeLastSignIn } from "./lastSignIn";

describe("describeLastSignIn", () => {
  it("says when, and from which address", () => {
    const text = describeLastSignIn({ at: new Date(2026, 9, 8, 17, 15), ip: "203.0.113.9" });
    expect(text).toMatch(/^8 Oct 2026, 5:15 ?pm · 203\.0\.113\.9$/i);
  });

  it("says only when if the address was not recorded", () => {
    expect(describeLastSignIn({ at: new Date(2026, 9, 8, 9, 5), ip: null })).toMatch(/^8 Oct 2026, 9:05 ?am$/i);
  });

  it("reads a date that arrived as text", () => {
    expect(describeLastSignIn({ at: new Date(2026, 0, 2, 13, 0).toISOString(), ip: "::1" })).toMatch(/^2 Jan 2026, 1:00 ?pm · ::1$/i);
  });

  it("says so when the Admin has never signed in", () => {
    expect(describeLastSignIn(null)).toBe("Not yet");
    expect(describeLastSignIn(undefined)).toBe("Not yet");
  });
});
