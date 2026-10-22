// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLayout from "./DashboardLayout";
import { LayoutDashboard, BriefcaseBusiness, BadgeCheck, UserRound } from "lucide-react";

let mockIsMobile = false;

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "1", role: "tutor", name: "Test Tutor" },
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
  useSiteContentTextStyle: () => ({}),
  useSiteContentPaddingStyle: () => ({}),
  useSiteContentHeightStyle: () => ({}),
}));

describe("DashboardLayout mobile bottom nav and notification sheet", () => {
  const dummyNavigation = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/tutor/dashboard" },
    { icon: BriefcaseBusiness, label: "Job Board", path: "/tutor/dashboard/jobs" },
    { icon: BadgeCheck, label: "Status", path: "/tutor/dashboard/status" },
    { icon: UserRound, label: "Profile", path: "/tutor/dashboard/profile" },
  ];

  beforeEach(() => {
    mockIsMobile = true;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders mobile bottom quick navigation on mobile screens with 5 slots", () => {
    mockIsMobile = true;
    render(
      <DashboardLayout
        navigationItems={dummyNavigation}
        title="Tutor Portal"
        sidebarPanel="tutor"
      >
        <div>Content</div>
      </DashboardLayout>
    );

    const bottomNav = screen.getByRole("navigation", { name: "Mobile bottom quick navigation" });
    expect(bottomNav).toBeTruthy();

    expect(screen.getByRole("button", { name: "Home" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Jobs" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Status" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Profile" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Menu" })).toBeTruthy();
  });

  it("does not render mobile bottom nav when hideBottomNav is true", () => {
    mockIsMobile = true;
    render(
      <DashboardLayout
        navigationItems={dummyNavigation}
        title="Tutor Portal"
        sidebarPanel="tutor"
        hideBottomNav={true}
      >
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.queryByRole("navigation", { name: "Mobile bottom quick navigation" })).toBeNull();
  });

  it("opens the notification bottom sheet drawer on mobile when the bell button is clicked", () => {
    mockIsMobile = true;
    render(
      <DashboardLayout
        navigationItems={dummyNavigation}
        title="Tutor Portal"
        sidebarPanel="tutor"
        workspaceHeader={{
          portal: "Tutor Portal",
          name: "Test Tutor",
          notifications: { unreadCount: 2, path: "/tutor/dashboard/notifications" },
        }}
      >
        <div>Content</div>
      </DashboardLayout>
    );

    const bell = screen.getByRole("button", { name: /Open notifications/i });
    fireEvent.click(bell);

    // The drawer sheet should open with title and notification summary
    const drawer = screen.getByRole("dialog", { name: "Notifications" });
    expect(drawer).toBeTruthy();
    expect(screen.getByText("You have 2 unread notifications.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "View all notifications" })).toBeTruthy();
  });
});
