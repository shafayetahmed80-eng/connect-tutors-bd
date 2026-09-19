import { describe, expect, it } from "vitest";
import { accountChangeTypesFor } from "@shared/account-change-requests";
import { accountChangeDecisionNotice, checkAccountChange, type AccountChangeContext } from "./account-change-requests";

const guardian: AccountChangeContext = {
  role: "guardian", isOwner: false, currentName: "Rina Akter", currentMobile: "+8801711111111", waitingTypes: [],
  verification: { status: "unverified", nidFrontUploaded: true, nidBackUploaded: true }, liveTuition: false,
};

describe("who may ask for what", () => {
  it("offers each panel its own list, and the Owner nothing", () => {
    expect(accountChangeTypesFor("guardian", false)).toEqual(["name", "mobile", "verification", "close_account"]);
    // A Tutor's verification is the profile review, sent from the Profile tab.
    expect(accountChangeTypesFor("tutor", false)).toEqual(["name", "mobile", "close_account"]);
    expect(accountChangeTypesFor("admin", false)).toEqual(["name", "mobile", "close_account"]);
    expect(accountChangeTypesFor("admin", true)).toEqual([]);
  });

  it("refuses what the account is not offered, and a second request while one waits", () => {
    expect(checkAccountChange({ ...guardian, role: "tutor" }, { type: "verification" })).toEqual({ allowed: false, reason: "not_offered" });
    expect(checkAccountChange({ ...guardian, role: "admin", isOwner: true }, { type: "name", value: "New Name" })).toEqual({ allowed: false, reason: "not_offered" });
    expect(checkAccountChange({ ...guardian, waitingTypes: ["name"] }, { type: "name", value: "New Name" })).toEqual({ allowed: false, reason: "request_waiting" });
    // A different type is not held up by it.
    expect(checkAccountChange({ ...guardian, waitingTypes: ["name"] }, { type: "mobile", value: "01822222222" }).allowed).toBe(true);
  });
});

describe("a new name", () => {
  it("is tidied, bounded and different from the one on the account", () => {
    expect(checkAccountChange(guardian, { type: "name", value: "  Rina   Begum  " })).toEqual({ allowed: true, requestedValue: "Rina Begum", currentValue: "Rina Akter", reason: null });
    expect(checkAccountChange(guardian, { type: "name", value: "R" })).toEqual({ allowed: false, reason: "invalid_name" });
    expect(checkAccountChange(guardian, { type: "name", value: " Rina Akter " })).toEqual({ allowed: false, reason: "same_as_current" });
  });
});

describe("a new mobile number", () => {
  it("is stored in its +880 form, and must be a Bangladesh number other than the current one", () => {
    expect(checkAccountChange(guardian, { type: "mobile", value: "01822 222222" })).toMatchObject({ allowed: true, requestedValue: "+8801822222222", currentValue: "+8801711111111" });
    expect(checkAccountChange(guardian, { type: "mobile", value: "12345" })).toEqual({ allowed: false, reason: "invalid_mobile" });
    expect(checkAccountChange(guardian, { type: "mobile", value: "01711111111" })).toEqual({ allowed: false, reason: "same_as_current" });
  });
});

describe("a Guardian's verification", () => {
  it("needs both NID sides and a profile not already verified", () => {
    expect(checkAccountChange(guardian, { type: "verification" }).allowed).toBe(true);
    expect(checkAccountChange({ ...guardian, verification: { status: "unverified", nidFrontUploaded: true, nidBackUploaded: false } }, { type: "verification" }))
      .toEqual({ allowed: false, reason: "nid_missing" });
    expect(checkAccountChange({ ...guardian, verification: { status: "verified", nidFrontUploaded: true, nidBackUploaded: true } }, { type: "verification" }))
      .toEqual({ allowed: false, reason: "already_verified" });
    // A rejected Guardian may ask again once the images are fixed.
    expect(checkAccountChange({ ...guardian, verification: { status: "rejected", nidFrontUploaded: true, nidBackUploaded: true } }, { type: "verification" }).allowed).toBe(true);
  });
});

describe("closing the account", () => {
  it("needs a reason, and no tuition still running", () => {
    expect(checkAccountChange(guardian, { type: "close_account", reason: " " })).toEqual({ allowed: false, reason: "reason_required" });
    expect(checkAccountChange(guardian, { type: "close_account", reason: "Moving abroad" })).toEqual({ allowed: true, requestedValue: null, currentValue: null, reason: "Moving abroad" });
    expect(checkAccountChange({ ...guardian, liveTuition: true }, { type: "close_account", reason: "Moving abroad" })).toEqual({ allowed: false, reason: "live_tuition" });
  });
});

describe("what the account hears about a decision", () => {
  it("names the new value when approved, and carries the Admin's reason when declined", () => {
    expect(accountChangeDecisionNotice({ type: "name", decision: "approve", requestedValue: "Rina Begum" }))
      .toEqual({ title: "Name changed", message: "Your name is now Rina Begum." });
    expect(accountChangeDecisionNotice({ type: "mobile", decision: "approve", requestedValue: "+8801822222222" })?.message)
      .toContain("Sign in with this number");
    expect(accountChangeDecisionNotice({ type: "close_account", decision: "decline", requestedValue: null, declineReason: "A payment is still due." }))
      .toEqual({ title: "Account delete declined", message: "A payment is still due." });
  });

  it("says nothing for a verification, which has its own notice, or for a closed account, which cannot read it", () => {
    expect(accountChangeDecisionNotice({ type: "verification", decision: "approve", requestedValue: null })).toBeNull();
    expect(accountChangeDecisionNotice({ type: "verification", decision: "decline", requestedValue: null, declineReason: "Blurry image" })).toBeNull();
    expect(accountChangeDecisionNotice({ type: "close_account", decision: "approve", requestedValue: null })).toBeNull();
  });
});
