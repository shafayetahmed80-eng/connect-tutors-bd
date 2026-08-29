import { describe, expect, it } from "vitest";
import { getGuardianPendingEditId, isGuardianPendingEditEligible } from "./GuardianRequestJourney";

describe("GuardianRequestJourney Pending edit routing", () => {
  it("accepts only a positive numeric edit identifier", () => {
    expect(getGuardianPendingEditId("?edit=42")).toBe(42);
    expect(getGuardianPendingEditId("?edit=0")).toBeNull();
    expect(getGuardianPendingEditId("?edit=not-a-number")).toBeNull();
    expect(getGuardianPendingEditId("")).toBeNull();
  });

  it("allows a prefill only for the Guardian's unreviewed Pending request", () => {
    expect(isGuardianPendingEditEligible({ id: 42, status: "new", publicationState: "submitted" })).toBe(true);
    expect(isGuardianPendingEditEligible({ id: 42, status: "reviewing", publicationState: "submitted" })).toBe(false);
    expect(isGuardianPendingEditEligible({ id: 42, status: "new", publicationState: "published" })).toBe(false);
  });
});
