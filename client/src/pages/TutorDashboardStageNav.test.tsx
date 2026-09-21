// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const interests = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false, overrides: [] as unknown[] }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    jobBoard: { myInterests: { useQuery: () => ({ data: interests.data, isLoading: interests.isLoading, isError: false }) } },
    // The sidebar's colours are the Owner's, read through the same slots the sidebar reads.
    siteContent: { list: { useQuery: () => ({ data: interests.overrides, isLoading: false, isError: false }) } },
  },
}));

import { SiteContentProvider } from "@/lib/siteContent";
import { TutorDashboardStageNav } from "./TutorDashboardStageNav";

afterEach(() => { cleanup(); interests.data = []; interests.isLoading = false; interests.overrides = []; });

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

  it("is one attached strip in the Tutor sidebar's colours, not five separate cards", () => {
    render(<TutorDashboardStageNav />);

    const nav = screen.getByRole("navigation", { name: "Application stages" });
    expect(nav.className).toContain("sb-strip");
    expect(nav.className).toContain("sb-panel-tutor");
    // Attached: no gap between the buttons, and none of them draws a card of its own.
    expect(nav.className).not.toMatch(/gap-/);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("sb-strip-item");
      expect(link.className).not.toMatch(/bg-white|border|shadow-/);
    }
    // Nothing is set until the Owner sets it: the shipped teal comes from the stylesheet.
    expect(nav.getAttribute("style")).toBeNull();
  });

  it("takes the colours the Owner sets for the Tutor sidebar", () => {
    interests.overrides = [
      { slotId: "sidebar-tabs.tutor.colour.panel", text: null, textSizePx: null, paddingPx: null, spacing: null, colourHex: "#123456" },
      { slotId: "sidebar-tabs.tutor.colour.text", text: null, textSizePx: null, paddingPx: null, spacing: null, colourHex: "#fefefe" },
    ];
    render(<SiteContentProvider page="sidebar-tabs"><TutorDashboardStageNav /></SiteContentProvider>);

    const nav = screen.getByRole("navigation", { name: "Application stages" });
    expect(nav.style.getPropertyValue("--sb-panel-top")).toBe("#123456");
    expect(nav.style.getPropertyValue("--sb-text")).toBe("#fefefe");
    // The foot of the panel is a darker mix of the chosen colour, as in the sidebar.
    expect(nav.style.getPropertyValue("--sb-panel-bottom")).toContain("#123456");
  });

  it("does not take the Admin's or the Guardian's sidebar colours", () => {
    interests.overrides = [
      { slotId: "sidebar-tabs.admin.colour.panel", text: null, textSizePx: null, paddingPx: null, spacing: null, colourHex: "#ff0000" },
      { slotId: "sidebar-tabs.guardian.colour.panel", text: null, textSizePx: null, paddingPx: null, spacing: null, colourHex: "#00ff00" },
    ];
    render(<SiteContentProvider page="sidebar-tabs"><TutorDashboardStageNav /></SiteContentProvider>);

    expect(screen.getByRole("navigation", { name: "Application stages" }).style.getPropertyValue("--sb-panel-top")).toBe("");
  });

  it("shows no number until the applications have loaded", () => {
    interests.isLoading = true;
    render(<TutorDashboardStageNav />);

    expect(screen.getAllByRole("link")[0].textContent).toBe("–Applied Jobs");
    expect(screen.queryByText("00")).toBeNull();
  });
});
