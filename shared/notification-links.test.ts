import { describe, expect, it } from "vitest";
import { GUARDIAN_NOTIFICATIONS_PATH, notificationDestination, TUTOR_NOTIFICATIONS_PATH } from "./notification-links";

describe("where a notification can take its reader", () => {
  it("has a destination when the path is some other page", () => {
    expect(notificationDestination("/tutor/dashboard/profile", TUTOR_NOTIFICATIONS_PATH)).toBe("/tutor/dashboard/profile");
    expect(notificationDestination("/guardian/dashboard/posted-jobs/6800", GUARDIAN_NOTIFICATIONS_PATH)).toBe("/guardian/dashboard/posted-jobs/6800");
    expect(notificationDestination("/tutor/dashboard/jobs?returnTo=%2Fjob-board%3Fjob%3D6800", TUTOR_NOTIFICATIONS_PATH)).toContain("/tutor/dashboard/jobs?returnTo=");
  });

  it("has none when the path is the inbox the reader is already in, however it is written", () => {
    for (const path of ["/tutor/dashboard/notifications", "/tutor/dashboard/notifications/", "/tutor/dashboard/notifications?x=1", "/tutor/dashboard/notifications#top"]) {
      expect(notificationDestination(path, TUTOR_NOTIFICATIONS_PATH), path).toBeNull();
    }
    expect(notificationDestination("/guardian/dashboard/notifications", GUARDIAN_NOTIFICATIONS_PATH)).toBeNull();
  });

  it("has none when there is no usable path at all", () => {
    expect(notificationDestination("", TUTOR_NOTIFICATIONS_PATH)).toBeNull();
    expect(notificationDestination(null, TUTOR_NOTIFICATIONS_PATH)).toBeNull();
    expect(notificationDestination(undefined, TUTOR_NOTIFICATIONS_PATH)).toBeNull();
    expect(notificationDestination("https://elsewhere.example/x", TUTOR_NOTIFICATIONS_PATH)).toBeNull();
  });
});
