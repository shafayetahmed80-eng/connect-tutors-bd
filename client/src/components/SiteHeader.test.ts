import { describe, expect, it } from "vitest";
import { PUBLIC_ACCOUNT_LABEL, brandWordmark, getPublicAccountNavigation, mobilePublicQuickLinks, navItems } from "./SiteHeader";

describe("shared brand wordmark", () => {
  it("keeps the public name and accessible home label stable across responsive headers", () => {
    expect(brandWordmark).toEqual({
      primary: "Connect",
      secondary: "Tutors",
      homeLabel: "Connect Tutors home",
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

describe("public marketing account navigation", () => {
  it("always reads Sign In, and sends someone already signed in to their own workspace", () => {
    // One label for everyone. It used to switch to "Account" once signed in,
    // which put a second, differently-named entry in the header for the same
    // thing - and the destination alone is enough to tell them apart.
    for (const user of [null, { role: "tutor" }, { role: "admin" }, { role: "guardian" }, { role: "user" }, { role: "moderator" }]) {
      expect(getPublicAccountNavigation(user).label, JSON.stringify(user)).toBe(PUBLIC_ACCOUNT_LABEL);
    }

    expect(getPublicAccountNavigation(null).href).toBe("/login");
    expect(getPublicAccountNavigation({ role: "tutor" }).href).toBe("/tutor/dashboard/jobs");
    expect(getPublicAccountNavigation({ role: "admin" }).href).toBe("/admin/matching");
    expect(getPublicAccountNavigation({ role: "guardian" }).href).toBe("/guardian/dashboard/posted-jobs");
    expect(getPublicAccountNavigation({ role: "user" }).href).toBe("/guardian/dashboard/posted-jobs");
    expect(getPublicAccountNavigation({ role: "moderator" }).href).toBe("/account");
  });

  it("puts the sign-in entry to the left of Job Board, not in the contact strip", () => {
    // The header's top strip is contact details only now; the entry belongs
    // with the other navigation links, ahead of the first of them.
    expect(navItems[0]).toEqual({ label: "Job Board", href: "/job-board" });
  });
});
