import { describe, expect, it } from "vitest";
import { guardianVerificationNotice } from "./guardian-verification-notice";

describe("what a Guardian is told about their verification", () => {
  it("tells them when they are verified", () => {
    expect(guardianVerificationNotice("verified")).toEqual({ title: "আপনার প্রোফাইল ভেরিফাই হয়েছে", message: "একজন অ্যাডমিন আপনার প্রোফাইল ভেরিফাই করেছেন।" });
  });

  it("tells them when it was not approved, and sends them to the profile that shows why", () => {
    const notice = guardianVerificationNotice("rejected");
    expect(notice?.title).toBe("আপনার প্রোফাইল ভেরিফিকেশন অনুমোদিত হয়নি");
    expect(notice?.message).toMatch(/প্রোফাইল/);
  });

  it("says nothing when an Admin resets it to unverified", () => {
    expect(guardianVerificationNotice("unverified")).toBeNull();
  });
});
