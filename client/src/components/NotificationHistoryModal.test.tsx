// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  lastInput: null as unknown,
  data: { items: [{ id: 1, audience: "tutor", title: "Platform maintenance", message: "Paused tonight.", recipientCount: 9, sentByName: "Owner", sentByEmail: null, createdAt: "2026-09-20T00:00:00.000Z" }], total: 1, page: 1, pageSize: 20, totalPages: 1 },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      listNotificationBroadcasts: {
        useQuery: (input: unknown) => {
          state.lastInput = input;
          return { data: state.data, isLoading: false, isError: false };
        },
      },
    },
  },
}));

import { NotificationHistoryModal } from "./NotificationHistoryModal";

afterEach(() => {
  cleanup();
  state.lastInput = null;
  state.data = { items: [{ id: 1, audience: "tutor", title: "Platform maintenance", message: "Paused tonight.", recipientCount: 9, sentByName: "Owner", sentByEmail: null, createdAt: "2026-09-20T00:00:00.000Z" }], total: 1, page: 1, pageSize: 20, totalPages: 1 };
});

describe("Sent notifications history size", () => {
  it("is a list that can be short, so it is as tall as its rows rather than standing the panel height", () => {
    render(<NotificationHistoryModal audience="tutor" onClose={vi.fn()} />);

    expect(screen.getByRole("dialog").getAttribute("data-modal-size")).toBe("panel");
    expect(screen.getByRole("dialog").hasAttribute("data-modal-fit")).toBe(true);
  });
});

describe("Sent notifications history search", () => {
  it("offers the searches made here before, and picking one searches again", async () => {
    const user = userEvent.setup({ document: window.document });
    const { unmount } = render(<NotificationHistoryModal audience="tutor" onClose={vi.fn()} />);
    const search = screen.getByPlaceholderText("Search by title or message");

    await user.click(search);
    await user.type(search, "maintenance");
    await user.keyboard("{Enter}");
    unmount();

    render(<NotificationHistoryModal audience="tutor" onClose={vi.fn()} />);
    await user.click(screen.getByPlaceholderText("Search by title or message"));
    await user.click(screen.getByRole("button", { name: "maintenance" }));

    expect(state.lastInput).toEqual({ audience: "tutor", query: "maintenance", page: 1, pageSize: 20 });
  });

  it("starts with no search, then sends what was typed to the query", () => {
    render(<NotificationHistoryModal audience="tutor" onClose={vi.fn()} />);

    expect(state.lastInput).toEqual({ audience: "tutor", query: "", page: 1, pageSize: 20 });

    fireEvent.change(screen.getByPlaceholderText("Search by title or message"), { target: { value: "maintenance" } });
    expect(state.lastInput).toEqual({ audience: "tutor", query: "maintenance", page: 1, pageSize: 20 });
  });

  it("says nothing matches a search rather than looking broken, distinctly from truly empty history", () => {
    state.data = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
    render(<NotificationHistoryModal audience="tutor" onClose={vi.fn()} />);

    expect(screen.getByText("Nothing sent yet.")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Search by title or message"), { target: { value: "xyz" } });
    expect(screen.getByText("Nothing sent matches that search.")).toBeTruthy();
  });
});
