import { describe, expect, it } from "vitest";
import {
  guardianRegistrationSchema,
  isGuardianLocationWithinCity,
} from "./guardian-registration.validation";

describe("Guardian registration validation", () => {
  it("requires explicit draft-terms consent and matching passwords", () => {
    const input = {
      name: "Rahima Begum",
      gender: "female",
      email: "rahima@example.com",
      password: "strong-pass-123",
      confirmPassword: "different-pass-123",
      cityLocationId: "dhaka-city",
      locationId: "uttara-sector-7",
      termsAccepted: false,
    };

    const result = guardianRegistrationSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.path.join("."))).toEqual(
        expect.arrayContaining(["confirmPassword", "termsAccepted"])
      );
    }
  });

  it("accepts only an active Bangladesh location that descends from the selected city", () => {
    const references = [
      { id: "dhaka-city", type: "city", country: "Bangladesh", enabled: 1, parentId: "dhaka-district" },
      { id: "uttara-thana", type: "thana", country: "Bangladesh", enabled: 1, parentId: "dhaka-city" },
      { id: "uttara-sector-7", type: "area", country: "Bangladesh", enabled: 1, parentId: "uttara-thana" },
      { id: "chattogram-city", type: "city", country: "Bangladesh", enabled: 1, parentId: "chattogram-district" },
      { id: "pahartali", type: "area", country: "Bangladesh", enabled: 1, parentId: "chattogram-city" },
      { id: "disabled-area", type: "area", country: "Bangladesh", enabled: 0, parentId: "dhaka-city" },
    ] as const;

    expect(isGuardianLocationWithinCity({ cityId: "dhaka-city", locationId: "uttara-sector-7", references })).toBe(true);
    expect(isGuardianLocationWithinCity({ cityId: "dhaka-city", locationId: "pahartali", references })).toBe(false);
    expect(isGuardianLocationWithinCity({ cityId: "dhaka-city", locationId: "disabled-area", references })).toBe(false);
    expect(isGuardianLocationWithinCity({ cityId: "dhaka-city", locationId: "dhaka-city", references })).toBe(false);
  });
});
