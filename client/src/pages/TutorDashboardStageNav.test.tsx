// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const interests = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false }));

vi.mock("@/lib/trpc", () => ({
  trpc: { jobBoard: { myInterests: { useQuery: () => ({ data: interests.data, isLoading: interests.isLoading, isError: false }) } } },
}));

import { TutorDashboardStageNav } from "./TutorDashboardStageNav";

afterEach(() => { cleanup(); interests.data = []; interests.isLoading = false; });

describe("the Dashboard's stage buttons", () => {
  it("counts each stage by the Status tab's own rule and opens that stage there", () => {
    interests.data = [
      { status: "interested" },
      { status: "interested" },
      { status: "shortlisted" },
      { status: "matched", appointmentConfirmedAt: null },
      { status: "matched", appointmentConfirmedAt: "2026-09-12T00:00:00.000Z" },
      { status: "withdrawn" },
      { status: "declined" },
    ];
    render(<TutorDashboardStageNav />);

    const links = screen.getAllByRole("link");
    expect(links.map(link => link.getAttribute("aria-label"))).toEqual([
      "Applied Jobs: 2", "Shortlisted Jobs: 1", "Appointed Jobs: 1", "Confirmed Jobs: 1", "Cancelled Jobs: 2",
    ]);
    // Icon on the left, the count on its right, the label beneath - zero-padded like the tab.
    expect(links[4].textContent).toBe("02Cancelled Jobs");
    // One row of five at every width, and on a phone the label drops "Jobs".
    expect(screen.getByRole("navigation", { name: "Application stages" }).className).toContain("grid-cols-5");
    expect(links[4].querySelector(".hidden.sm\\:inline")?.textContent).toBe(" Jobs");
    expect(links.map(link => link.getAttribute("href"))).toEqual([
      "/tutor/dashboard/status?stage=applied",
      "/tutor/dashboard/status?stage=shortlisted",
      "/tutor/dashboard/status?stage=appointed",
      "/tutor/dashboard/status?stage=confirmed",
      "/tutor/dashboard/status?stage=cancelled",
    ]);
  });

  it("shows no number until the applications have loaded", () => {
    interests.isLoading = true;
    render(<TutorDashboardStageNav />);

    expect(screen.getAllByRole("link")[0].textContent).toBe("–Applied Jobs");
    expect(screen.queryByText("00")).toBeNull();
  });
});
