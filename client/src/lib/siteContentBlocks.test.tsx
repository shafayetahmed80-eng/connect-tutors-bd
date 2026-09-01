// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  blocks: [] as Array<{ id: number; anchorId: string; heading: string | null; body: string | null; tone: string; sortOrder: number; active: number }>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: { siteContent: { listBlocks: { useQuery: () => ({ data: state.blocks, isLoading: false, isError: false }) } } },
}));

import { SiteBlocks } from "./siteContent";

const TOP = "tutor-profile.top";
const block = (over: Partial<(typeof state.blocks)[number]> = {}) => ({
  id: 1, anchorId: TOP, heading: "Notice", body: "Body text", tone: "info", sortOrder: 1, active: 1, ...over,
});

afterEach(() => {
  cleanup();
  state.blocks = [];
});

describe("notice blocks", () => {
  it("renders nothing at all when an anchor has no blocks", () => {
    const { container } = render(<SiteBlocks anchorId={TOP} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows the heading and body an Admin wrote", () => {
    state.blocks = [block()];
    render(<SiteBlocks anchorId={TOP} />);

    expect(screen.getByText("Notice")).toBeTruthy();
    expect(screen.getByText("Body text")).toBeTruthy();
  });

  it("shows only the blocks belonging to its own anchor", () => {
    state.blocks = [block(), block({ id: 2, anchorId: "tutor-profile.bottom", heading: "Elsewhere" })];
    render(<SiteBlocks anchorId={TOP} />);

    expect(screen.getByText("Notice")).toBeTruthy();
    expect(screen.queryByText("Elsewhere")).toBeNull();
  });

  it("renders Admin text as plain text, never as markup", () => {
    state.blocks = [block({ heading: null, body: "<img src=x onerror=alert(1)> <b>bold</b>" })];
    const { container } = render(<SiteBlocks anchorId={TOP} />);

    // The tags must survive as visible characters, not become elements.
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeTruthy();
  });

  it("falls back to the info styling for a tone it does not recognise", () => {
    state.blocks = [block({ tone: "chartreuse" })];
    const { container } = render(<SiteBlocks anchorId={TOP} />);

    expect(container.querySelector("section")?.className).toContain("bg-sky-50");
  });

  it("renders nothing for an anchor the registry does not declare", () => {
    state.blocks = [block({ anchorId: "made.up" })];
    const { container } = render(<SiteBlocks anchorId="made.up" />);

    expect(container.innerHTML).toBe("");
  });
});
