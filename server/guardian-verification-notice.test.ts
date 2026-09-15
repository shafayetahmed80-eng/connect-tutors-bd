import { describe, expect, it } from "vitest";
import { guardianVerificationNotice } from "./guardian-verification-notice";

describe("what a Guardian is told about their verification", () => {
  it("tells them when they are verified", () => {
    expect(guardianVerificationNotice("verified")).toEqual({ title: "Your profile is verified", message: "An Admin has verified your profile." });
  });

  it("tells them when it was not approved, and sends them to the profile that shows why", () => {
    const notice = guardianVerificationNotice("rejected");
    expect(notice?.title).toBe("Your profile verification was not approved");
    expect(notice?.message).toMatch(/profile/);
  });

  it("says nothing when an Admin resets it to unverified", () => {
    expect(guardianVerificationNotice("unverified")).toBeNull();
  });
});
