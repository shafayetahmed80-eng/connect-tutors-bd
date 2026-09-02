// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: 1, role: "admin", name: "Owner Admin" } as { id: number; role: string; name: string } | null,
  loading: false,
  isOwner: true,
  ownerLoading: false,
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user, loading: state.loading }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({}),
    admin: {
      getWorkspaceAccess: {
        useQuery: () => ({ data: state.ownerLoading ? undefined : { isOwner: state.isOwner }, isLoading: state.ownerLoading, isFetching: false }),
      },
    },
    auth: { logout: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } },
    // The dashboard sidebar reads its Admin-editable labels through this.
    siteContent: {
      list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
    },
  },
}));

import AdminDynamicSectionPage from "./AdminDynamicSectionPage";

function renderPage() {
  return render(<AdminDynamicSectionPage title="Tutor Profile content" heading="Tutor Profile" description="Control the published content." />);
}

afterEach(() => {
  cleanup();
  state.user = { id: 1, role: "admin", name: "Owner Admin" };
  state.loading = false;
  state.isOwner = true;
  state.ownerLoading = false;
});

describe("Dynamic Section content page", () => {
  it("opens the content workspace for the Owner", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Tutor Profile" })).toBeTruthy();
    expect(screen.getByText("Control the published content.")).toBeTruthy();
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

  it("waits for the Owner check instead of flashing the workspace or a refusal", () => {
    state.ownerLoading = true;
    renderPage();

    expect(screen.getByText(/Verifying Owner access/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Owner access required" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Tutor Profile" })).toBeNull();
  });
});
