import { describe, expect, it } from "vitest";

import { guardianRequestLifecycleValues } from "../../../server/tutor-request-lifecycle";
import {
  canGuardianCancelRequest,
  getGuardianRequestLifecycle,
  getGuardianStatusCounts,
  shouldUseDedicatedGuardianRequestDetails,
} from "./GuardianRequestTracking";

describe("Guardian private request lifecycle presentation", () => {
  it("projects the approved five-stage Guardian timeline without exposing raw internal states", () => {
    expect(getGuardianRequestLifecycle({ status: "new", publishedJob: false })).toMatchObject({ key: "pending", label: "Pending", activeIndex: 1 });
    expect(getGuardianRequestLifecycle({ status: "reviewing", publishedJob: false })).toMatchObject({ key: "pending", label: "Pending", activeIndex: 1 });
    expect(getGuardianRequestLifecycle({ status: "reviewing", publishedJob: true })).toMatchObject({ key: "live", label: "Live", activeIndex: 2 });
    expect(getGuardianRequestLifecycle({ status: "matched", publishedJob: true, assignedTutorId: 87 })).toMatchObject({ key: "appointed", label: "Appointed", activeIndex: 3 });
    expect(getGuardianRequestLifecycle({ status: "matched", publishedJob: true, assignedTutorId: 87, appointmentConfirmedAt: new Date() })).toMatchObject({ key: "confirmed", label: "Confirmed", activeIndex: 4 });
    expect(getGuardianRequestLifecycle({ status: "closed", publishedJob: false, cancellationReason: "Guardian withdrew" })).toMatchObject({ key: "cancelled", label: "Cancelled", activeIndex: 5 });
  });

  it("counts request rows by the five Guardian-visible stages and keeps Pending first", () => {
    const requests = [
      { id: 11, status: "matched", publishedJob: true, assignedTutorId: 8 },
      { id: 12, status: "new", publishedJob: false },
      { id: 13, status: "reviewing", publishedJob: false },
      { id: 14, status: "closed", publishedJob: false, cancellationReason: "No tutor available" },
      { id: 15, status: "matched", publishedJob: true, assignedTutorId: 9, appointmentConfirmedAt: new Date() },
    ];

    expect(getGuardianStatusCounts(requests)).toEqual({ pending: 2, live: 0, appointed: 1, confirmed: 1, cancelled: 1 });
  });

  it("uses the dedicated private details screen only on mobile-sized viewports", () => {
    expect(shouldUseDedicatedGuardianRequestDetails(639)).toBe(true);
    expect(shouldUseDedicatedGuardianRequestDetails(640)).toBe(false);
    expect(shouldUseDedicatedGuardianRequestDetails(1280)).toBe(false);
  });
});

describe("when a Guardian may still withdraw their own request", () => {
  it("offers it up to and including Appointed", () => {
    expect(canGuardianCancelRequest("pending")).toBe(true);
    expect(canGuardianCancelRequest("live")).toBe(true);
    expect(canGuardianCancelRequest("appointed")).toBe(true);
  });

  it("stops once the appointment is confirmed, or already cancelled", () => {
    // A coordinator is involved by then and a tuition may have started, so it
    // becomes a support conversation. The server refuses it there too.
    expect(canGuardianCancelRequest("confirmed")).toBe(false);
    expect(canGuardianCancelRequest("cancelled")).toBe(false);
  });

  it("covers every stage, so a new one cannot slip through unanswered", () => {
    for (const key of guardianRequestLifecycleValues) {
      expect(typeof canGuardianCancelRequest(key), key).toBe("boolean");
    }
  });
});
