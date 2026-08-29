import { describe, expect, it } from "vitest";
import { GuardianIdentityError, guardianIdFromOpaqueToken } from "./guardian-identity";

describe("guardianIdFromOpaqueToken", () => {
  it("creates a support-facing Guardian ID that is not a database primary key", () => {
    expect(guardianIdFromOpaqueToken("8f01ab2c")).toBe("GDN-8F01AB2C");
  });

  it("accepts only an eight-character opaque alphanumeric token", () => {
    expect(() => guardianIdFromOpaqueToken("123")).toThrow(GuardianIdentityError);
    expect(() => guardianIdFromOpaqueToken("abcd-1234")).toThrow(GuardianIdentityError);
    expect(() => guardianIdFromOpaqueToken("abcd_1234")).toThrow(GuardianIdentityError);
  });
});
