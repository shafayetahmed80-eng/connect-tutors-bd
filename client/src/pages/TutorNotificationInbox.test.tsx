// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  items: [] as any[],
  unread: 0,
  isLoading: false,
  isError: false,
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorNotifications: { mine: { invalidate: vi.fn() }, unreadCount: { invalidate: vi.fn() } } }),
    tutorNotifications: {
      mine: { useQuery: () => ({ data: { items: state.items, nextCursor: null }, isLoading: state.isLoading, isError: state.isError }) },
      unreadCount: { useQuery: () => ({ data: { unreadCount: state.unread } }) },
      markRead: { useMutation: () => ({ mutate: state.markRead, isPending: false }) },
      markAllRead: { useMutation: () => ({ mutate: state.markAllRead, isPending: false }) },
    },
  },
}));

import { TutorNotificationInbox } from "./TutorNotificationInbox";

const note = (over: Record<string, unknown> = {}) => ({
  id: 1,
  type: "profile_moderation",
  title: "Changes were requested on your profile",
  message: "Open your profile to read what to change, then submit it again.",
  actionPath: "/tutor/dashboard/profile",
  readAt: null,
  createdAt: "2026-09-04T00:00:00.000Z",
  ...over,
});

afterEach(() => {
  cleanup();
  state.items = [];
  state.unread = 0;
  state.isLoading = false;
  state.isError = false;
  state.markRead.mockReset();
  state.markAllRead.mockReset();
});

describe("the Tutor's notification inbox", () => {
  it("says what happened, when, and where to go", () => {
    state.items = [note()];
    state.unread = 1;
    render(<TutorNotificationInbox />);

    expect(screen.getByRole("heading", { name: /Changes were requested/ })).toBeTruthy();
    expect(screen.getByText(/Open your profile to read what to change/)).toBeTruthy();
    expect(screen.getByText(/04 Sept? 2026/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe("/tutor/dashboard/profile");
  });

  it("counts the unread ones and offers to clear them", () => {
    state.items = [note({ id: 1 }), note({ id: 2, readAt: "2026-09-04T01:00:00.000Z" })];
    state.unread = 1;
    render(<TutorNotificationInbox />);

    expect(screen.getByText("01")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    expect(state.markAllRead).toHaveBeenCalled();
  });

  it("offers Mark read only on a row that is unread", () => {
    state.items = [note({ id: 7 }), note({ id: 8, readAt: "2026-09-04T01:00:00.000Z" })];
    state.unread = 1;
    render(<TutorNotificationInbox />);

    const marks = screen.getAllByRole("button", { name: "Mark read" });
    expect(marks).toHaveLength(1);
    fireEvent.click(marks[0]);
    expect(state.markRead).toHaveBeenCalledWith({ notificationId: 7 });
  });

  it("hides the clear-all action when nothing is unread", () => {
    state.items = [note({ readAt: "2026-09-04T01:00:00.000Z" })];
    render(<TutorNotificationInbox />);

    expect(screen.getByText("Nothing unread")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Mark all read/ })).toBeNull();
  });

  it("says the list is empty rather than showing a blank panel", () => {
    render(<TutorNotificationInbox />);
    expect(screen.getByText(/Decisions about your profile and your applications will appear here/)).toBeTruthy();
  });

  it("reports a failed load instead of looking empty", () => {
    state.isError = true;
    render(<TutorNotificationInbox />);
    expect(screen.getByRole("alert").textContent).toMatch(/could not be loaded/);
  });
});
