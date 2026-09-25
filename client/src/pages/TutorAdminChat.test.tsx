// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  messages: [] as any[],
  isLoading: false,
  send: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorAdminChat: { thread: { invalidate: vi.fn() }, unreadCount: { invalidate: vi.fn() } } }),
    tutorAdminChat: {
      thread: { useQuery: () => ({ data: { messages: state.messages, tutorLastReadAt: null }, isLoading: state.isLoading }) },
      send: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.send(input); options.onSuccess?.(); }, isPending: false }) },
      markRead: { useMutation: () => ({ mutate: state.markRead, isPending: false }) },
    },
  },
}));

import { TutorAdminChatPanel } from "./TutorAdminChat";

const message = (over: Record<string, unknown> = {}) => ({ id: 1, senderRole: "admin", body: "Hello", createdAt: "2026-09-25T10:00:00.000Z", ...over });

afterEach(() => {
  cleanup();
  state.messages = [];
  state.isLoading = false;
  state.send.mockReset();
  state.markRead.mockReset();
});

describe("the Tutor's Admin chat panel", () => {
  it("says there is nothing yet, and still marks the thread read", () => {
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("No messages yet. Write to the Admin team below.")).toBeTruthy();
    expect(state.markRead).toHaveBeenCalled();
  });

  it("shows the Admin's reply without naming which Admin sent it", () => {
    state.messages = [message({ body: "We will look into this." })];
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("We will look into this.")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
  });

  it("sends a trimmed message and clears the box", () => {
    render(<TutorAdminChatPanel />);
    const box = screen.getByPlaceholderText("Write a message…");
    fireEvent.change(box, { target: { value: "  Please help  " } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(state.send).toHaveBeenCalledWith({ body: "Please help" });
  });

  it("keeps Send disabled for an empty draft", () => {
    render(<TutorAdminChatPanel />);
    expect(screen.getByRole("button", { name: "Send message" })).toHaveProperty("disabled", true);
  });
});
