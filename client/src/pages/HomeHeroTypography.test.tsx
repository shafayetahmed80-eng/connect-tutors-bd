// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockOverrides = [
  { slotId: "home.hero.title.lead", text: "অভিজ্ঞ " },
  { slotId: "home.hero.title.accent", text: "গৃহশিক্ষক ও টিউটর" },
  { slotId: "home.hero.title.tail", text: " খুঁজুন" },
  { slotId: "home.hero.fontFamily", text: "anek-bangla" },
  { slotId: "home.hero.mobileSizePx", text: "19" },
  { slotId: "home.hero.desktopSizePx", text: "58" },
  { slotId: "home.hero.letterSpacing", text: "normal" },
  { slotId: "home.hero.hideMobileDesc", text: "true" },
  { slotId: "home.hero.singleLineMobile", text: "true" },
];

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({}),
    siteContent: {
      list: {
        useQuery: () => ({
          data: mockOverrides,
        }),
      },
    },
    siteLimits: {
      list: {
        useQuery: () => ({ data: [] }),
      },
    },
    community: {
      links: {
        useQuery: () => ({ data: [] }),
      },
    },
    auth: {
      me: {
        useQuery: () => ({ data: null }),
      },
    },
  },
}));

const mockLoadStudioFont = vi.fn(async () => {});
vi.mock("@/lib/image-studio-fonts", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/image-studio-fonts")>()),
  loadStudioFont: () => mockLoadStudioFont(),
}));

vi.mock("@/lib/scrollReveal", () => ({
  useScrollReveal: () => {},
}));

vi.mock("@/components/SiteHeader", () => ({
  default: () => <header data-testid="site-header">Header</header>,
}));

vi.mock("@/components/SiteFooter", () => ({
  default: () => <footer data-testid="site-footer">Footer</footer>,
}));

import Home from "./Home";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("Home Hero Typography & Mobile display integration", () => {
  it("renders overridden headline text and passes custom CSS variables for mobile & desktop", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("গৃহশিক্ষক ও টিউটর");
    expect(screen.getByText("গৃহশিক্ষক ও টিউটর")).toBeTruthy();

    const heroCopy = screen.getByRole("heading", { level: 1 }).closest(".hero-copy") as HTMLElement;
    expect(heroCopy).toBeTruthy();

    const style = heroCopy.style;
    expect(style.getPropertyValue("--hero-font-family")).toContain("studio-anek-bangla");
    expect(style.getPropertyValue("--hero-mobile-size")).toBe("19px");
    expect(style.getPropertyValue("--hero-desktop-size")).toBe("58px");
    expect(style.getPropertyValue("--hero-letter-spacing")).toBe("normal");
    expect(style.getPropertyValue("--hero-mobile-white-space")).toBe("nowrap");
    expect(style.getPropertyValue("--hero-mobile-desc-display")).toBe("none");

    expect(mockLoadStudioFont).toHaveBeenCalled();
  });
});
