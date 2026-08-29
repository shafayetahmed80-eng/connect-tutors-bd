import { describe, expect, it } from "vitest";
import { ADMIN_WORKSPACE_SECURITY_BADGE, buildAdminPriorityQueue } from "./AdminMonitoringOverview";

describe("Admin monitoring priority queue", () => {
  it("maps live operational counts to safe internal queues without exposing Guardian contact data", () => {
    expect(buildAdminPriorityQueue({ pendingTutorReviews: 4, newRequests: 2, consentBacklog: 1 })).toEqual([
      { count: 4, label: "Review Tutor profiles", href: "/admin/tutors" },
      { count: 2, label: "Review new Guardian requests", href: "/admin/matching" },
      { count: 1, label: "Resolve consent decisions", href: "/admin/matching" },
    ]);
  });

  it("keeps a truthful calm state when no operational queue needs action", () => {
    expect(buildAdminPriorityQueue({ pendingTutorReviews: 0, newRequests: 0, consentBacklog: 0 })).toEqual([]);
  });

  it("does not present retired two-factor protection as an active Admin access requirement", () => {
    expect(ADMIN_WORKSPACE_SECURITY_BADGE).toBe("Role-restricted workspace");
    expect(ADMIN_WORKSPACE_SECURITY_BADGE.toLowerCase()).not.toContain("two-factor");
  });
});
