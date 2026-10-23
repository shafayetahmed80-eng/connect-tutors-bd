// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLayout, { type WorkspaceHeaderQuickLink } from "./DashboardLayout";
import { BookOpen, HelpCircle, ShieldCheck, UserRound } from "lucide-react";

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "1", role: "tutor", name: "Test User" },
    loading: false,
    logout: vi.fn(),
  }),
}));
vi.mock("@/lib/installApp", () => ({
  useCanInstallApp: () => false,
  promptToInstallApp: vi.fn(),
}));
vi.mock("@/lib/siteContent", () => ({
  SiteContentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSiteContentResolver: () => (_slot: unknown, fallback: string) => fallback,
  useSiteContentText: (_slot: unknown, fallback: string) => fallback,
  useSiteContentColour: () => undefined,
  useSiteContentHeightStyle: () => ({}),
  useSiteContentPaddingStyle: () => ({}),
  useSiteContentTextStyle: () => ({}),
}));

describe("DashboardLayout workspace header quick links", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    window.HTMLElement.prototype.hasPointerCapture = () => false;
    window.HTMLElement.prototype.setPointerCapture = () => {};
    window.HTMLElement.prototype.releasePointerCapture = () => {};
    window.HTMLElement.prototype.scrollIntoView = () => {};
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders quick links in the avatar dropdown menu", () => {
    const onSelectProfile = vi.fn();
    const quickLinks: WorkspaceHeaderQuickLink[] = [
      { label: "My Profile", href: "/tutor/dashboard/profile", icon: UserRound, onSelect: onSelectProfile },
      { label: "Terms & Conditions", href: "/terms-conditions", icon: BookOpen, external: true },
      { label: "Privacy Policy", href: "/privacy-policy", icon: ShieldCheck, external: true },
      { label: "Help & Support", href: "/contact", icon: HelpCircle, external: true },
    ];

    render(
      <DashboardLayout
        title="Tutor Portal"
        navigationItems={[{ icon: UserRound, label: "Dashboard", path: "/tutor/dashboard" }]}
        sidebarPanel="tutor"
        workspaceHeader={{
          portal: "Tutor Portal",
          name: "Shafayet Tutor",
          quickLinks,
        }}
      >
        <div>Content</div>
      </DashboardLayout>
    );

    // Open avatar dropdown via pointerDown with button 0
    const avatarButton = screen.getByRole("button", { name: /Open Tutor Portal account menu/i });
    expect(avatarButton).toBeTruthy();
    fireEvent.pointerDown(avatarButton, { button: 0, ctrlKey: false });

    // Check that all quick links are present
    const termsLink = screen.getByRole("menuitem", { name: /Terms & Conditions/i });
    expect(termsLink).toBeTruthy();
    expect(termsLink.getAttribute("href")).toBe("/terms-conditions");
    expect(termsLink.getAttribute("target")).toBe("_blank");
    expect(termsLink.getAttribute("rel")).toContain("noreferrer");

    const privacyLink = screen.getByRole("menuitem", { name: /Privacy Policy/i });
    expect(privacyLink).toBeTruthy();
    expect(privacyLink.getAttribute("href")).toBe("/privacy-policy");
    expect(privacyLink.getAttribute("target")).toBe("_blank");

    const helpLink = screen.getByRole("menuitem", { name: /Help & Support/i });
    expect(helpLink).toBeTruthy();
    expect(helpLink.getAttribute("href")).toBe("/contact");

    // Click profile link with onSelect callback
    const profileLink = screen.getByRole("menuitem", { name: /My Profile/i });
    fireEvent.click(profileLink);
    expect(onSelectProfile).toHaveBeenCalled();
  });
});
