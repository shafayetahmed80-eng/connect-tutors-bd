import { describe, expect, it } from "vitest";
import { formatTutorDashboardLocation, formatTutorSince, getTutorDashboardSection, getTutorNavigationGroups, getTutorSidebarIdentity, tutorDashboardNavigation } from "./TutorDashboard";

describe("Tutor Dashboard navigation", () => {
  it("groups current Tutor work separately from planned tools", () => {
    expect(getTutorNavigationGroups(tutorDashboardNavigation)).toEqual([
      {
        label: "Active workspace",
        items: ["Dashboard", "Profile", "Status", "Notifications", "Tuition preferences", "Tutor requests", "Settings", "Job Board", "Confirmation Letter"],
      },
      {
        label: "Coming later",
        items: [
          "Payment",
          "Certificate",
          "Refer & Earn",
          "Exclusively Yours",
          "How It Works",
          "Join our Community",
        ],
      },
      { label: "Account", items: ["Sign Out"] },
    ]);
  });

  it("keeps all planned Tutor destinations visible but clearly marked", () => {
    const planned = tutorDashboardNavigation.filter(item => item.sectionLabel === "Coming later");
    expect(planned.map(item => item.label)).toEqual([
      "Payment",
      "Certificate",
      "Refer & Earn",
      "Exclusively Yours",
      "How It Works",
      "Join our Community",
    ]);
    expect(planned.every(item => item.planned)).toBe(true);
  });

  it("keeps the current workspace routes available before future destinations", () => {
    expect(tutorDashboardNavigation.filter(item => item.sectionLabel === "Active workspace").map(item => item.label)).toEqual([
      "Dashboard",
      "Profile",
      "Status",
      "Notifications",
      "Tuition preferences",
      "Tutor requests",
      "Settings",
      "Job Board",
      "Confirmation Letter",
    ]);
  });

  it("separates private Tutor links and exposes the sign-out action", () => {
    const signOut = tutorDashboardNavigation.find(item => item.label === "Sign Out");

    expect(signOut?.sectionLabel).toBe("Account");
    expect(signOut?.action).toBe("signout");
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
