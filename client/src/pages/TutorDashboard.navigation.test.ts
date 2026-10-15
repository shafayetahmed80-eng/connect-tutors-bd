import { describe, expect, it } from "vitest";
import { formatTutorDashboardLocation, formatTutorSince, getTutorDashboardSection, getTutorNavigationGroups, getTutorSidebarIdentity, tutorDashboardNavigation } from "./TutorDashboard";

describe("Tutor Dashboard navigation", () => {
  it("groups current Tutor work into active workspace and account sections", () => {
    expect(getTutorNavigationGroups(tutorDashboardNavigation)).toEqual([
      {
        label: "Active workspace",
        items: [
          "Dashboard",
          "Job Board",
          "Status",
          "Profile",
          "Confirmation Letter",
          "Payment",
          "Notifications",
          "Chat with Admin",
          "How It Works",
          "Join our Community",
          "Install app",
        ],
      },
      { label: "Account", items: ["Settings", "Sign Out"] },
    ]);
  });

  it("hides planned future destinations and deprecated tabs from navigation", () => {
    const labels = tutorDashboardNavigation.map(item => item.label);
    expect(labels).not.toContain("Certificate");
    expect(labels).not.toContain("Refer & Earn");
    expect(labels).not.toContain("Exclusively Yours");
    expect(labels).not.toContain("Tuition preferences");
    expect(labels).not.toContain("Tutor requests");
  });

  it("keeps the current workspace routes available in streamlined sequence", () => {
    expect(tutorDashboardNavigation.filter(item => item.sectionLabel === "Active workspace").map(item => item.label)).toEqual([
      "Dashboard",
      "Job Board",
      "Status",
      "Profile",
      "Confirmation Letter",
      "Payment",
      "Notifications",
      "Chat with Admin",
      "How It Works",
      "Join our Community",
      "Install app",
    ]);
  });

  it("separates private Tutor links and exposes the sign-out action", () => {
    const signOut = tutorDashboardNavigation.find(item => item.label === "Sign Out");

    expect(signOut?.sectionLabel).toBe("Account");
    expect(signOut?.action).toBe("signout");

    const settings = tutorDashboardNavigation.find(item => item.label === "Settings");
    expect(settings?.sectionLabel).toBe("Account");
  });

  it("formats a stored registration date for the Tutor identity header", () => {
    expect(formatTutorSince("2019-07-03T00:00:00.000Z")).toBe("Joined Jul 03, 2019");
    expect(formatTutorSince(null)).toBe("Joined date is being prepared");
  });

  it("builds a private Tutor Sidebar identity header from profile and registration data with safe fallbacks", () => {
    expect(getTutorSidebarIdentity({
      user: { name: "Account name", email: "account@example.com" },
      profile: { name: "Profile name", contactEmail: "profile@example.com", profilePhotoUrl: "https://example.test/tutor-photo.png" },
      registration: { tutorNumber: "CT-T-0091", registeredAt: "2019-07-03T00:00:00.000Z" },
    })).toEqual({
      name: "Profile name",
      email: "profile@example.com",
      profilePhotoUrl: "https://example.test/tutor-photo.png",
      tutorNumber: "CT-T-0091",
      joined: "Joined Jul 03, 2019",
    });

    expect(getTutorSidebarIdentity({
      user: { name: "Account fallback", email: "account@example.com" },
      profile: null,
      registration: null,
    })).toEqual({
      name: "Account fallback",
      email: "account@example.com",
      profilePhotoUrl: null,
      tutorNumber: "Tutor ID preparing",
      joined: "Joined date is being prepared",
    });
  });

  it("uses a human-readable fallback when a draft profile has no selected location", () => {
    expect(formatTutorDashboardLocation(undefined)).toBe("Location to be added");
    expect(formatTutorDashboardLocation("Dhaka, Bangladesh")).toBe("Dhaka, Bangladesh");
  });

  it("keeps a safe selected Apply Now return on the protected Profile section", () => {
    expect(getTutorDashboardSection("/tutor/dashboard/profile?returnTo=%2Fjob-board%3Fjob%3DCT-JOB-000042")).toBe("profile");
    expect(getTutorDashboardSection("/tutor/dashboard/jobs?returnTo=%2Fjob-board%3Fjob%3DCT-JOB-000042")).toBe("jobs");
  });
});
