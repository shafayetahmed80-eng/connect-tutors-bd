import { describe, expect, it } from "vitest";
import { completeDashboardSignOut } from "./DashboardLayout";

describe("completeDashboardSignOut", () => {
  it("finishes the Guardian logout before navigating to the public homepage", async () => {
    const events: string[] = [];

    await completeDashboardSignOut(
      async () => {
        events.push("logout");
      },
      destination => {
        events.push(`navigate:${destination}`);
      },
      "/",
    );

    expect(events).toEqual(["logout", "navigate:/"]);
  });

  it("uses the public homepage after Tutor logout", async () => {
    let destination = "";

    await completeDashboardSignOut(
      async () => undefined,
      path => {
        destination = path;
      },
      "/",
    );

    expect(destination).toBe("/");
  });

  it("stores a Tutor success handoff after logout and before sign-in navigation", async () => {
    const events: string[] = [];

    await completeDashboardSignOut(
      async () => {
        events.push("logout");
      },
      destination => {
        events.push(`navigate:${destination}`);
      },
      "/tutor/login",
      () => {
        events.push("notice");
      },
    );

    expect(events).toEqual(["logout", "notice", "navigate:/tutor/login"]);
  });
});
