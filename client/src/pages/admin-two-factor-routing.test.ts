import { describe, expect, it } from "vitest";
import { getAdminTwoFactorDestination } from "./admin-two-factor-routing";

describe("getAdminTwoFactorDestination", () => {
  it("sends an Admin without enrollment to setup before protected workspace access", () => {
    expect(getAdminTwoFactorDestination({ enrolled: false, verified: false })).toBe("/admin/2fa-setup");
  });

  it("sends an enrolled Admin without a current session proof to the challenge", () => {
    expect(getAdminTwoFactorDestination({ enrolled: true, verified: false })).toBe("/admin/2fa-challenge");
  });

  it("allows only a verified Admin session into matching", () => {
    expect(getAdminTwoFactorDestination({ enrolled: true, verified: true })).toBe("/admin/matching");
  });
});
