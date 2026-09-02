import { describe, expect, it } from "vitest";
import { guardianDashboardNavigation } from "./GuardianDashboard";

describe("Guardian Dashboard navigation", () => {
  it("keeps operational Guardian destinations separate from planned placeholders", () => {
    const active = guardianDashboardNavigation.filter(item => !item.planned);
    expect(active.map(item => item.label)).toEqual(["Dashboard", "Hire a tutor", "Profile", "Attendance", "Posted jobs", "Notifications", "Confirmation Letter", "Settings", "How it works", "Sign Out"]);
    expect(active.every(item => item.path.startsWith("/guardian/"))).toBe(true);
  });

  it("does not expose Admin or Tutor workspace destinations", () => {
    const paths = guardianDashboardNavigation.map(item => item.path);
    expect(paths.some(path => path.startsWith("/admin"))).toBe(false);
    expect(paths.some(path => path.startsWith("/tutor"))).toBe(false);
    expect(guardianDashboardNavigation.map(item => item.label)).toContain("Join Guardian Community");
  });

  it("marks unimplemented tabs truthfully instead of presenting them as live workflows", () => {
    const planned = guardianDashboardNavigation.filter(item => item.planned);
    expect(planned.length).toBeGreaterThan(0);
    expect(planned.every(item => item.path.startsWith("/guardian/dashboard/"))).toBe(true);
  });
});
