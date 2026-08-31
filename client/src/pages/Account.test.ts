import { describe, expect, it } from "vitest";
import { getAccountRedirectPath } from "./Account";

describe("account redirect", () => {
  it("sends each established role straight to its own workspace", () => {
    expect(getAccountRedirectPath("tutor")).toBe("/tutor/dashboard/jobs");
    expect(getAccountRedirectPath("guardian")).toBe("/guardian/dashboard/posted-jobs");
    expect(getAccountRedirectPath("user")).toBe("/guardian/dashboard/posted-jobs");
    expect(getAccountRedirectPath("admin")).toBe("/admin/matching");
  });

  it("returns an unknown or missing role to the public site", () => {
    expect(getAccountRedirectPath("moderator")).toBe("/");
    expect(getAccountRedirectPath(null)).toBe("/");
    expect(getAccountRedirectPath(undefined)).toBe("/");
  });
});
