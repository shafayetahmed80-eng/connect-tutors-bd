// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/SiteHeader", () => ({ default: () => <header data-testid="site-header" /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer data-testid="site-footer" /> }));
vi.mock("@/lib/siteContent", () => ({
  SiteContentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSiteContentResolver: () => (_slot: string, fallback: string) => fallback,
}));

const mockPolicyDocuments = vi.hoisted(() => ({
  data: [
    {
      pageKey: "terms-conditions",
      body: `## Terms of Service
Welcome to Connect Tutors.

### Account Registration
Details on registering.

## Platform Charges
Payment and commission details.`,
      updatedAt: new Date(),
    },
  ],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    policyDocuments: {
      list: {
        useQuery: () => mockPolicyDocuments,
      },
    },
  },
}));

import InfoPage from "./InfoPage";

describe("InfoPage policy wide layout and table of contents", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    window.location.hash = "";
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("renders desktop sticky Table of Contents and section items on a policy page", () => {
    window.history.replaceState({}, "", "/terms-conditions");
    render(<InfoPage />);

    const aside = screen.getByRole("complementary", { name: "Table of contents" });
    expect(aside).toBeTruthy();
    expect(aside.className).toContain("lg:block");

    // Sections in TOC
    expect(screen.getAllByText("Terms of Service").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Account Registration").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Platform Charges").length).toBeGreaterThanOrEqual(1);

    // Section count pill
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("toggles mobile Table of Contents collapsible drawer", () => {
    window.history.replaceState({}, "", "/terms-conditions");
    render(<InfoPage />);

    const mobileToggle = screen.getByRole("button", { name: /দ্রুত সূচিপত্র/i });
    expect(mobileToggle).toBeTruthy();

    // Initially closed mobile nav
    expect(screen.queryByRole("navigation", { name: "Mobile section links" })).toBeNull();

    // Click to open
    fireEvent.click(mobileToggle);
    const mobileNav = screen.getByRole("navigation", { name: "Mobile section links" });
    expect(mobileNav).toBeTruthy();

    // Click section in mobile nav
    const mobileLink = within(mobileNav).getByRole("button", { name: "Platform Charges" });
    fireEvent.click(mobileLink);

    expect(window.location.hash).toBe("#platform-charges");
  });

  it("provides print and scroll to top buttons", () => {
    window.history.replaceState({}, "", "/terms-conditions");
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(<InfoPage />);

    const printButtons = screen.getAllByRole("button", { name: /প্রিন্ট/i });
    expect(printButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(printButtons[0]);
    expect(printSpy).toHaveBeenCalled();

    const topButton = screen.getByRole("button", { name: "শীর্ষে যান" });
    fireEvent.click(topButton);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("does not render TOC or policy body for non-policy informational pages", () => {
    window.history.replaceState({}, "", "/contact");
    render(<InfoPage />);

    expect(screen.queryByRole("complementary", { name: "Table of contents" })).toBeNull();
    expect(screen.queryByRole("article")).toBeNull();
  });
});
