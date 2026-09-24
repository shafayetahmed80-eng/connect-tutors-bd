// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  data: [] as Array<{ slotId: string; text: null; textSizePx: null; spacing: null; colourHex: string | null }>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: { siteContent: { list: { useQuery: () => ({ data: state.data, isLoading: false, isError: false }) } } },
}));

import { SiteContentProvider } from "@/lib/siteContent";
import { findSiteContentColourSlot, getSiteContentColourSlots } from "@shared/site-content";
import { tutorProfileColourParts, tutorProfileColourSlotId } from "@shared/tutor-profile-colours";
import { tutorProfileColourVariables, useTutorProfileColours } from "./TutorProfileColours";

function Probe() {
  useTutorProfileColours();
  return null;
}

function renderProfile() {
  return render(<SiteContentProvider page="tutor-profile"><Probe /></SiteContentProvider>);
}

afterEach(() => {
  cleanup();
  state.data = [];
});

describe("the Tutor Profile's colours", () => {
  it("offers every colour on the Tutor Profile content page, seeded from what the profile ships", () => {
    const slots = getSiteContentColourSlots("tutor-profile");
    expect(slots.map(slot => slot.id)).toEqual(tutorProfileColourParts.map(tutorProfileColourSlotId));
    expect(findSiteContentColourSlot("tutor-profile.colour.accent")).toMatchObject({ page: "tutor-profile", surface: "Tutor dashboard", defaultHex: "#167ddd" });
  });

  it("sets a variable only for the colours an Owner changed", () => {
    expect(tutorProfileColourVariables({ accent: "#aa3366", heading: null })).toEqual({ "--tp-accent": "#aa3366" });
    expect(tutorProfileColourVariables({})).toEqual({});
  });

  it("paints the Owner's colours while the profile is open, and puts the shipped ones back after", () => {
    state.data = [
      { slotId: "tutor-profile.colour.accent", text: null, textSizePx: null, spacing: null, colourHex: "#aa3366" },
      { slotId: "tutor-profile.colour.card", text: null, textSizePx: null, spacing: null, colourHex: "#fffaf0" },
    ];
    const { unmount } = renderProfile();
    const root = document.documentElement.style;
    expect(root.getPropertyValue("--tp-accent")).toBe("#aa3366");
    expect(root.getPropertyValue("--tp-card")).toBe("#fffaf0");
    expect(root.getPropertyValue("--tp-heading")).toBe("");

    unmount();
    expect(root.getPropertyValue("--tp-accent")).toBe("");
    expect(root.getPropertyValue("--tp-card")).toBe("");
  });

  it("changes nothing while no colour has been changed", () => {
    renderProfile();
    expect(document.documentElement.getAttribute("style") ?? "").not.toContain("--tp-");
  });
});
