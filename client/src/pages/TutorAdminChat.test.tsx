// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  messages: [] as any[],
  isLoading: false,
  eligible: true,
  adminLastReadAt: null as string | null,
  send: vi.fn(),
  markRead: vi.fn(),
  onSocketFrame: null as ((frame: { type: string; tutorId?: string }) => void) | null,
  sendFrame: vi.fn(),
}));

vi.mock("@/hooks/useChatSocket", () => ({
  useTutorChatSocket: (_token: string | null, onFrame: (frame: { type: string; tutorId?: string }) => void) => {
    state.onSocketFrame = onFrame;
    return state.sendFrame;
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorAdminChat: { thread: { invalidate: vi.fn() }, unreadCount: { invalidate: vi.fn() } } }),
    tutorAdminChat: {
      thread: { useQuery: () => ({ data: { messages: state.messages, tutorLastReadAt: null, adminLastReadAt: state.adminLastReadAt, eligible: state.eligible }, isLoading: state.isLoading }) },
      send: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.send(input); options.onSuccess?.(); }, isPending: false }) },
      markRead: { useMutation: () => ({ mutate: state.markRead, isPending: false }) },
    },
  },
}));

import { TutorAdminChatPanel } from "./TutorAdminChat";

const message = (over: Record<string, unknown> = {}) => ({ id: 1, senderRole: "admin", body: "Hello", attachmentUrl: null, attachmentContentType: null, createdAt: "2026-09-25T10:00:00.000Z", ...over });

afterEach(() => {
  cleanup();
  state.messages = [];
  state.isLoading = false;
  state.eligible = true;
  state.adminLastReadAt = null;
  state.send.mockReset();
  state.markRead.mockReset();
  state.onSocketFrame = null;
  state.sendFrame.mockReset();
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

  it("locks the composer until a tuition has been appointed", () => {
    state.eligible = false;
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("You can message the Admin team once at least one of your tuitions has been appointed.")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Write a message…")).toBeNull();
  });

  it("still shows an Admin-started conversation even while not yet eligible to reply", () => {
    state.eligible = false;
    state.messages = [message({ body: "Welcome to Connect Tutors!" })];
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("Welcome to Connect Tutors!")).toBeTruthy();
  });

  it("shows an image attachment inline", () => {
    state.messages = [message({ body: "", attachmentUrl: "https://example.test/photo.png", attachmentContentType: "image/png" })];
    render(<TutorAdminChatPanel />);
    expect(screen.getByRole("img", { name: "Attachment" })).toBeTruthy();
  });

  it("shows a non-image attachment as a file link", () => {
    state.messages = [message({ body: "", attachmentUrl: "https://example.test/file.pdf", attachmentContentType: "application/pdf" })];
    render(<TutorAdminChatPanel />);
    expect(screen.getByRole("link", { name: /Attachment/ })).toBeTruthy();
  });

  it("marks the Tutor's own last message Seen once the Admin has read up to it", () => {
    state.messages = [message({ id: 1, senderRole: "tutor", body: "I have a question", createdAt: "2026-09-25T10:00:00.000Z" })];
    state.adminLastReadAt = "2026-09-25T10:05:00.000Z";
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("Seen")).toBeTruthy();
  });

  it("shows Admin is typing… when a typing frame arrives over the socket", () => {
    render(<TutorAdminChatPanel />);
    expect(screen.queryByText("Admin is typing…")).toBeNull();
    act(() => { state.onSocketFrame?.({ type: "typing" }); });
    expect(screen.getByText("Admin is typing…")).toBeTruthy();
  });

  it("searches the loaded conversation locally", () => {
    state.messages = [message({ id: 1, body: "About my profile" }), message({ id: 2, body: "About payment" })];
    render(<TutorAdminChatPanel />);
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "payment" } });
    expect(screen.queryByText("About my profile")).toBeNull();
    expect(screen.getByText("About payment")).toBeTruthy();
  });
});
