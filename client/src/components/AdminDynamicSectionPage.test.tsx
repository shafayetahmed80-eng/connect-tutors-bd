// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: 1, role: "admin", name: "Owner Admin" } as { id: number; role: string; name: string } | null,
  loading: false,
  isOwner: true,
  ownerLoading: false,
  // Whose answer the Owner check holds, and whether it is being re-run.
  accessUserId: 1,
  fetching: false,
  refetch: vi.fn(),
  invalidateMe: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user, loading: state.loading }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { invalidate: state.invalidateMe } } }),
    admin: {
      getWorkspaceAccess: {
        useQuery: () => ({ data: state.ownerLoading ? undefined : { userId: state.accessUserId, isOwner: state.isOwner }, isLoading: state.ownerLoading, isFetching: state.fetching || state.ownerLoading, refetch: state.refetch }),
      },
      // The Guardian Requests rows in the sidebar.
      guardianRequestCounts: { useQuery: () => ({ data: { shortlist: 3, appoint: 2, confirm: 0, cancel: 1 } }) },
      // The Tutor Chats row in the sidebar.
      tutorChatUnreadThreadCount: { useQuery: () => ({ data: { unreadThreadCount: 0 } }) },
    },
    auth: { logout: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } },
    // The sidebar's account block.
    adminProfile: {
      me: { useQuery: () => ({ data: { name: "Owner Admin", email: "owner@example.com", loginId: "owner", isOwner: state.isOwner, accountCreatedAt: "2026-09-01T00:00:00.000Z" } }) },
      photo: { useQuery: () => ({ data: { photoUrl: null } }) },
    },
    // The sidebar's Change requests count.
    accountChanges: { pendingCount: { useQuery: () => ({ data: 0 }) } },
    // The dashboard sidebar reads its Admin-editable labels through this.
    siteContent: {
      list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
    },
  },
}));

import AdminDynamicSectionPage from "./AdminDynamicSectionPage";

function renderPage() {
  return render(<AdminDynamicSectionPage title="Tutor Profile content" />);
}

afterEach(() => {
  cleanup();
  state.user = { id: 1, role: "admin", name: "Owner Admin" };
  state.loading = false;
  state.isOwner = true;
  state.ownerLoading = false;
  state.accessUserId = 1;
  state.fetching = false;
  vi.clearAllMocks();
});

describe("Dynamic Section content page", () => {
  it("opens the content workspace for the Owner", () => {
    renderPage();

    // The page name lives in the workspace header now; the navy block that
    // repeated it below is gone, and with it its description.
    expect(screen.queryByRole("heading", { name: "Tutor Profile" })).toBeNull();
    expect(screen.getByText(/Content controls are not configured yet/)).toBeTruthy();
  });

  it("refuses an Admin who is not the Owner, since the route is reachable by URL", () => {
    state.isOwner = false;
    renderPage();

    expect(screen.getByRole("heading", { name: "Owner access required" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Tutor Profile" })).toBeNull();
  });

  it("refuses a signed-out visitor", () => {
    state.user = null;
    renderPage();

    expect(screen.getByRole("heading", { name: "Owner access required" })).toBeTruthy();
  });

  it("heads the sidebar with the Admin's own account block, as the other panels do", () => {
    renderPage();

    const block = screen.getByLabelText("Admin account identity");
    expect(block.textContent).toContain("Owner Admin");
    expect(block.textContent).toContain("owner@example.com");
    expect(block.textContent).toContain("User ID: owner");
    expect(block.textContent).toContain("Role: Project Owner");
    expect(block.textContent).toContain("Created: 01 Sept 2026");
  });

  it("offers Settings in the avatar menu, and it opens the Admin Settings page", async () => {
    window.history.replaceState(null, "", "/admin/dynamic");
    renderPage();

    const trigger = screen.getByRole("button", { name: "Open Admin Panel account menu" });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
    const settings = await screen.findByRole("menuitem", { name: /Settings/ });
    fireEvent.click(settings);
    expect(window.location.pathname).toBe("/admin/settings");
    window.history.replaceState(null, "", "/");
  });

  it("keeps the page on screen while the Owner check is re-run for the same session", () => {
    // What returning to the tab does: the check runs again in the background.
    state.fetching = true;
    renderPage();

    expect(screen.getByText(/Content controls are not configured yet/)).toBeTruthy();
    expect(screen.queryByText(/Opening Admin workspace/)).toBeNull();
    expect(state.refetch).not.toHaveBeenCalled();
  });

  it("holds the page back when the Owner check on hand belongs to another Admin, and asks both again once", () => {
    state.accessUserId = 2;
    const view = renderPage();

    expect(screen.getByText(/Opening Admin workspace/)).toBeTruthy();
    expect(screen.queryByText(/Content controls are not configured yet/)).toBeNull();
    expect(state.refetch).toHaveBeenCalledTimes(1);
    expect(state.invalidateMe).toHaveBeenCalledTimes(1);

    view.rerender(<AdminDynamicSectionPage title="Tutor Profile content" />);
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it("waits for the Owner check instead of flashing the workspace or a refusal", () => {
    state.ownerLoading = true;
    renderPage();

    expect(screen.getByText(/Verifying Owner access/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Owner access required" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Tutor Profile" })).toBeNull();
  });
});

describe("the collapsible sidebar rows", () => {
  it("keeps Guardian Requests shut with the waiting count on it, and opens it on a click", () => {
    window.history.replaceState(null, "", "/admin/dashboard");
    renderPage();

    const row = screen.getByRole("button", { name: /Guardian Requests/ });
    expect(row.getAttribute("aria-expanded")).toBe("false");
    // Appoint 2 + Cancel 1 wait for an answer; the shortlist is a signal, so it is not counted.
    expect(row.textContent).toContain("3");
    expect(screen.queryByRole("button", { name: /Appoint Requests/ })).toBeNull();

    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("true");
    const list = screen.getByRole("list", { name: "Guardian Requests" });
    expect(Array.from(list.querySelectorAll("button")).map(button => button.textContent?.replace(/\d+$/, ""))).toEqual([
      "Shortlist Requests", "Appoint Requests", "Confirm Requests", "Cancel Requests",
    ]);
    expect(screen.getByRole("button", { name: /Appoint Requests/ }).textContent).toContain("2");
    expect(row.textContent).not.toContain("3");

    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the row that holds the current page, and marks the page", () => {
    window.history.replaceState(null, "", "/admin/dynamic/home");
    renderPage();

    expect(screen.getByRole("button", { name: /Site content/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Home page" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: /Option lists/ }).getAttribute("aria-expanded")).toBe("false");
  });
});
