import { describe, expect, it } from "vitest";
import { getAccountRedirectPath } from "./Account";

describe("signed-in account navigation", () => {
  it("makes the Guardian Posted Jobs tab the Guardian destination", () => {
    expect(getAccountRedirectPath("guardian")).toBe("/guardian/dashboard/posted-jobs");
  });

  it("keeps legacy user-role accounts on the Guardian workspace", () => {
    expect(getAccountRedirectPath("user")).toBe("/guardian/dashboard/posted-jobs");
  });

  it("sends a Tutor to the Job Board tab", () => {
    expect(getAccountRedirectPath("tutor")).toBe("/tutor/dashboard/jobs");
  });
});
