import { describe, expect, it } from "vitest";
import { brandWordmark, getJourneyNavigation, getPublicAccountNavigation, mobilePublicQuickLinks } from "./SiteHeader";

describe("shared brand wordmark", () => {
  it("keeps the public name and accessible home label stable across responsive headers", () => {
    expect(brandWordmark).toEqual({
      primary: "Connect",
      secondary: "Tutors BD",
      homeLabel: "Connect Tutors BD home",
    });
  });
});

describe("mobile public navigation", () => {
  it("keeps Admin Login out of the public header while retaining only public destinations", () => {
    expect(mobilePublicQuickLinks).not.toContainEqual({ label: "Admin Login", href: "/admin/login" });
    expect(mobilePublicQuickLinks).not.toContainEqual({ label: "Admin Dashboard", href: "/admin/matching" });
    expect(mobilePublicQuickLinks).toContainEqual({ label: "Job Board", href: "/job-board" });
  });
});

describe("public conversion journey navigation", () => {
  it("prioritizes Home, help, and contextual sign-in without Admin account controls", () => {
    const navigation = getJourneyNavigation("guardian");

    expect(navigation).toContainEqual({ label: "Home", href: "/" });
    expect(navigation).toContainEqual({ label: "Get help", href: "/contact" });
    expect(navigation).toContainEqual({ label: "Guardian sign in", href: "/login" });
    expect(navigation.map((item) => item.label)).not.toContain("Admin Dashboard");
    expect(navigation.map((item) => item.label)).not.toContain("Admin account");
    expect(navigation.map((item) => item.label)).not.toContain("Log out");
  });
});

describe("public marketing account navigation", () => {
  it("sends a signed-in visitor straight to their workspace under a neutral label, and everyone else to sign-in", () => {
    expect(getPublicAccountNavigation(null)).toEqual({ href: "/login", label: "Sign in" });
    expect(getPublicAccountNavigation({ role: "tutor" })).toEqual({ href: "/tutor/dashboard/jobs", label: "Account" });
    expect(getPublicAccountNavigation({ role: "admin" })).toEqual({ href: "/admin/matching", label: "Account" });
    expect(getPublicAccountNavigation({ role: "guardian" })).toEqual({ href: "/guardian/dashboard/posted-jobs", label: "Account" });
    expect(getPublicAccountNavigation({ role: "user" })).toEqual({ href: "/guardian/dashboard/posted-jobs", label: "Account" });
    expect(getPublicAccountNavigation({ role: "moderator" })).toEqual({ href: "/account", label: "Account" });
  });
});
