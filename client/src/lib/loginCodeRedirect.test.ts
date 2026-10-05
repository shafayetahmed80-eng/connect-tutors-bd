import { describe, expect, it, vi } from "vitest";
import { sendToLoginCodeIfOwed } from "./loginCodeRedirect";

const owed = new Error("Two-factor verification is required (10004)");

describe("sendToLoginCodeIfOwed", () => {
  it("sends a browser that owes the sign-in code to the code page, remembering where it was going", () => {
    const assign = vi.fn();
    sendToLoginCodeIfOwed(owed, { pathname: "/tutor/dashboard/profile", search: "?tab=education", assign });
    expect(assign).toHaveBeenCalledWith("/login-verify?next=%2Ftutor%2Fdashboard%2Fprofile%3Ftab%3Deducation");
  });

  it("leaves every other error alone, including the Admin's own second factor", () => {
    const assign = vi.fn();
    sendToLoginCodeIfOwed(new Error("Two-factor verification is required (10003)"), { pathname: "/admin/matching", search: "", assign });
    sendToLoginCodeIfOwed(new Error("Please login (10001)"), { pathname: "/guardian/dashboard", search: "", assign });
    sendToLoginCodeIfOwed("not an error", { pathname: "/guardian/dashboard", search: "", assign });
    expect(assign).not.toHaveBeenCalled();
  });

  it("does not loop while already on the code page", () => {
    const assign = vi.fn();
    sendToLoginCodeIfOwed(owed, { pathname: "/login-verify", search: "?next=%2Fguardian%2Fdashboard", assign });
    expect(assign).not.toHaveBeenCalled();
  });
});
