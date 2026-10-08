// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/lib/siteContent", () => ({
  SiteContentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSiteContentResolver: () => (_slot: string, fallback: string) => fallback,
}));
vi.mock("@/lib/trpc", () => ({ trpc: { policyDocuments: { list: { useQuery: () => ({ data: [] }) } } } }));

import InfoPage from "./InfoPage";

/** A browser that can watch for scrolling and has not asked for less motion. */
function stubScrollWatching() {
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
}

beforeEach(() => stubScrollWatching());

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("info pages settle in as they are shown", () => {
  it("brings the heading block in a piece at a time, icon first", () => {
    window.history.replaceState({}, "", "/contact");
    const { container } = render(<InfoPage />);

    const hero = container.querySelector(".info-hero")!;
    expect(hero.hasAttribute("data-reveal-group")).toBe(true);
    const parts = Array.from(hero.children) as HTMLElement[];
    expect(parts.length).toBeGreaterThanOrEqual(4);
    expect(parts.every(part => part.hasAttribute("data-reveal"))).toBe(true);
    expect(parts.map(part => part.style.getPropertyValue("--reveal-delay"))).toEqual(parts.map((_, index) => `${index * 70}ms`));
    expect(container.querySelector("main")!.classList.contains("reveal-ready")).toBe(true);
  });

  it("lets a legal document rise as it is reached", () => {
    window.history.replaceState({}, "", "/privacy-policy");
    const { container } = render(<InfoPage />);

    const document = container.querySelector("main > section:not(.info-hero)")!;
    expect(document.hasAttribute("data-reveal")).toBe(true);
    expect(document.querySelector("article")).toBeTruthy();
  });

  it("hides nothing for a visitor who asked for less motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    window.history.replaceState({}, "", "/privacy-policy");
    const { container } = render(<InfoPage />);

    expect(container.querySelector("main")!.classList.contains("reveal-ready")).toBe(false);
  });
});
