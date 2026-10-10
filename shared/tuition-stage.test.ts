import { describe, expect, it } from "vitest";
import { tuitionStageValues, withClosedStage } from "./tuition-stage";

describe("Closed is a Confirmed tuition whose fee is Full Paid", () => {
  it("turns Confirmed into Closed once the fee is Full Paid", () => {
    expect(withClosedStage("confirmed", "full_paid")).toBe("closed");
  });

  it("leaves a Confirmed tuition with any other Payment Status as Confirmed", () => {
    for (const status of ["full_due", "half_paid", "partial_paid", null, undefined]) {
      expect(withClosedStage("confirmed", status)).toBe("confirmed");
    }
  });

  it("leaves every other stage alone, whatever its Payment Status says", () => {
    for (const stage of ["pending", "live", "appointed", "cancelled"] as const) {
      expect(withClosedStage(stage, "full_paid")).toBe(stage);
    }
  });

  it("names six stages, Closed between Confirmed and Cancelled", () => {
    expect([...tuitionStageValues]).toEqual(["pending", "live", "appointed", "confirmed", "closed", "cancelled"]);
  });
});
