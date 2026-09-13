import { describe, expect, it } from "vitest";
import { getActiveNavigationItem } from "./DashboardLayout";

const items = [
  { label: "Dashboard", path: "/guardian/dashboard" },
  { label: "Posted jobs", path: "/guardian/dashboard/posted-jobs" },
  { label: "Applied Tutors", path: "/guardian/dashboard/applied-tutors" },
  { label: "Sign Out", path: "/guardian/dashboard/sign-out", action: "signout" },
];

describe("which sidebar tab a page belongs to", () => {
  it("is the exact match when there is one", () => {
    expect(getActiveNavigationItem(items, "/guardian/dashboard")?.label).toBe("Dashboard");
    expect(getActiveNavigationItem(items, "/guardian/dashboard/applied-tutors")?.label).toBe("Applied Tutors");
  });

  it("keeps a page one level inside a tab under that tab", () => {
    expect(getActiveNavigationItem(items, "/guardian/dashboard/applied-tutors/13")?.label).toBe("Applied Tutors");
    expect(getActiveNavigationItem(items, "/guardian/dashboard/posted-jobs/13")?.label).toBe("Posted jobs");
  });

  it("never lets the dashboard home claim a page it does not own", () => {
    expect(getActiveNavigationItem(items, "/guardian/dashboard/community")).toBeUndefined();
  });

  it("does not mistake a longer name for a page inside a tab", () => {
    expect(getActiveNavigationItem(items, "/guardian/dashboard/applied-tutors-archive")).toBeUndefined();
  });

  it("never makes Sign Out the tab a page sits under", () => {
    expect(getActiveNavigationItem(items, "/guardian/dashboard/sign-out/now")).toBeUndefined();
  });
});
