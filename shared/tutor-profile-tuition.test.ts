import { describe, expect, it } from "vitest";
import { offersOnlineTuitionOnly } from "./tutor-profile-tuition";

describe("offersOnlineTuitionOnly", () => {
  it("is true only for a Tutor whose one and only tuition type is online", () => {
    expect(offersOnlineTuitionOnly({ tuitionTypes: ["online"] })).toBe(true);
  });

  it("is false once anything else is offered, or nothing is chosen yet", () => {
    expect(offersOnlineTuitionOnly({ tuitionTypes: ["home", "online"] })).toBe(false);
    expect(offersOnlineTuitionOnly({ tuitionTypes: ["home"] })).toBe(false);
    expect(offersOnlineTuitionOnly({ tuitionTypes: [] })).toBe(false);
    expect(offersOnlineTuitionOnly({})).toBe(false);
  });
});
