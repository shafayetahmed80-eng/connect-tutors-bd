// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TUTOR_PORTAL_SESSION_STORAGE_KEY } from "@/lib/tutorPortalSession";

const logout = vi.fn();
let isMobile = false;
let profileIsLoading = false;
let statsIsLoading = false;

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    loading: false,
    user: { id: 1504, role: "tutor", name: "Test Tutor", email: "tutor@example.com" },
    logout,
  }),
}));

vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => isMobile }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutor: { getMyProfile: { invalidate: vi.fn() }, getDashboardStats: { invalidate: vi.fn() } } }),
    tutor: {
      getMyProfile: { useQuery: () => ({ data: undefined, isLoading: profileIsLoading }) },
      getDashboardStats: { useQuery: () => ({ data: undefined, isLoading: statsIsLoading, refetch: vi.fn() }) },
      upsertProfile: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
    tutorRequests: { assigned: { useQuery: () => ({ data: [], isLoading: false }) } },
    locations: { list: { useQuery: () => ({ data: [] }) } },
    // The dashboard sidebar reads its Admin-editable labels through this.
    siteContent: {
      list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
    },
  },
}));

vi.mock("./TutorProfileWorkspace", () => ({
  TutorProfileWorkspace: ({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) => (
    <button type="button" onClick={() => onDirtyChange(true)}>Mark Profile draft dirty</button>
  ),
}));

import TutorDashboard from "./TutorDashboard";

async function openAccountMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Open Tutor account menu" }));
}

describe("Tutor Dashboard dirty Profile navigation", () => {
  beforeEach(() => {
    logout.mockReset();
    isMobile = false;
    profileIsLoading = false;
    statsIsLoading = false;
    window.sessionStorage.setItem(TUTOR_PORTAL_SESSION_STORAGE_KEY, "test-tutor-portal-proof");
    window.history.pushState({}, "", "/tutor/dashboard/profile");
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.removeItem(TUTOR_PORTAL_SESSION_STORAGE_KEY);
    vi.restoreAllMocks();
  });

  it("keeps the private sidebar identity but removes the shared profile intro banner", () => {
    render(<TutorDashboard />);

    expect(screen.getAllByText("Test Tutor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("tutor@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tutor ID preparing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Joined date is being prepared").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Tutor Profile" })).toBeNull();
    expect(screen.queryByText("Your contact details stay private. Only approved public profile information is shown to families.")).toBeNull();
  });

  it("shows a custom accessible shimmer while Tutor Dashboard data is loading", () => {
    profileIsLoading = true;
    statsIsLoading = true;
    window.history.pushState({}, "", "/tutor/dashboard");

    render(<TutorDashboard />);

    const loadingState = screen.getByRole("status", { name: "Loading Tutor Dashboard" });
    expect(loadingState).not.toBeNull();
    expect(loadingState.getAttribute("aria-busy")).toBe("true");
    expect(loadingState.getAttribute("data-motion")).toBe("shimmer");
    expect(screen.getByText("Preparing your Tutor workspace")).not.toBeNull();
  });

  it("keeps the protected shell but renders no current overview content on the Dashboard tab", () => {
    window.history.pushState({}, "", "/tutor/dashboard");

    render(<TutorDashboard />);

    expect(screen.getAllByText("Test Tutor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tutor ID preparing").length).toBeGreaterThan(0);
    expect(screen.queryByText("Profile status")).toBeNull();
    expect(screen.queryByText("Verification")).toBeNull();
    expect(screen.queryByText("Your next step")).toBeNull();
    expect(screen.queryByText("Your professional presence")).toBeNull();
    expect(screen.queryByRole("button", { name: "Complete profile" })).toBeNull();
  });

  it("renders a semantic shared Tutor header with accessible notification and private account controls", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/tutor/dashboard");

    render(<TutorDashboard />);

    expect(screen.getByRole("banner", { name: "Tutor workspace header" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Dashboard" })).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Open notifications" }));
    expect(screen.getByText("No notifications yet.")).not.toBeNull();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Open Tutor account menu" }));
    expect(screen.getByText("Tutor ID")).not.toBeNull();
    expect(screen.getByRole("menuitem", { name: "Sign out" })).not.toBeNull();
  });

  it("opens the Tutor navigation drawer from the mobile workspace header", async () => {
    const user = userEvent.setup();
    isMobile = true;
    window.history.pushState({}, "", "/tutor/dashboard/profile");

    render(<TutorDashboard />);

    await user.click(screen.getByRole("button", { name: "Open Tutor navigation" }));
    expect(await screen.findByRole("dialog", { name: "Sidebar" })).not.toBeNull();
  });

  it("blocks real account-menu sign-out when the rendered Profile workspace reports a dirty draft and the Tutor declines", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<TutorDashboard />);
    await user.click(screen.getByRole("button", { name: "Mark Profile draft dirty" }));
    await openAccountMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /sign out/i }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(logout).not.toHaveBeenCalled();
  });

  it("allows real account-menu sign-out only after the dirty-draft confirmation is accepted", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<TutorDashboard />);
    await user.click(screen.getByRole("button", { name: "Mark Profile draft dirty" }));
    await openAccountMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /sign out/i }));

    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
  });

  it("keeps the account menu open with disabled signing-out feedback while logout is pending", async () => {
    const user = userEvent.setup();
    let resolveLogout: (() => void) | undefined;
    logout.mockImplementationOnce(
      () => new Promise<void>(resolve => {
        resolveLogout = resolve;
      }),
    );

    render(<TutorDashboard />);
    await openAccountMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    const pendingAction = await screen.findByRole("menuitem", { name: /signing out/i });
    expect(pendingAction.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByLabelText("Signing out")).not.toBeNull();

    resolveLogout?.();
  });
});
