// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  isMobile: false,
  search: "",
  threads: [] as any[],
  threadsLoading: false,
  threadInput: null as unknown,
  threadTutor: null as any,
  threadMessages: [] as any[],
  threadLoading: false,
  send: vi.fn(),
  markRead: vi.fn(),
  adminSocketOnMessage: null as ((tutorId?: string) => void) | null,
  invalidateListThreads: vi.fn(),
  invalidateUnreadThreadCount: vi.fn(),
  invalidateThread: vi.fn(),
}));

vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => state.isMobile }));
vi.mock("@/hooks/useChatSocket", () => ({ useAdminChatSocket: (onMessage: (tutorId?: string) => void) => { state.adminSocketOnMessage = onMessage; } }));
vi.mock("wouter", () => ({ useSearch: () => state.search }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        listTutorChatThreads: { invalidate: state.invalidateListThreads },
        tutorChatUnreadThreadCount: { invalidate: state.invalidateUnreadThreadCount },
        getTutorChatThread: { invalidate: state.invalidateThread },
      },
    }),
    admin: {
      listTutorChatThreads: { useQuery: () => ({ data: { items: state.threads, total: state.threads.length, page: 1, pageSize: 50, totalPages: 1 }, isLoading: state.threadsLoading }) },
      getTutorChatThread: {
        useQuery: (input: unknown) => {
          state.threadInput = input;
          return { data: { tutor: state.threadTutor, messages: state.threadMessages }, isLoading: state.threadLoading };
        },
      },
      sendTutorChatMessage: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.send(input); options.onSuccess?.(); }, isPending: false }) },
      markTutorChatRead: { useMutation: () => ({ mutate: state.markRead, isPending: false }) },
    },
  },
}));

import { AdminTutorChatsContent } from "./AdminTutorChats";

const thread = (over: Record<string, unknown> = {}) => ({ tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91, lastMessageAt: "2026-09-25T10:00:00.000Z", lastMessagePreview: "Need help with my profile", unreadCount: 0, ...over });

afterEach(() => {
  cleanup();
  state.isMobile = false;
  state.search = "";
  state.threads = [];
  state.threadsLoading = false;
  state.threadInput = null;
  state.threadTutor = null;
  state.threadMessages = [];
  state.threadLoading = false;
  state.send.mockReset();
  state.markRead.mockReset();
  state.adminSocketOnMessage = null;
  state.invalidateListThreads.mockReset();
  state.invalidateUnreadThreadCount.mockReset();
  state.invalidateThread.mockReset();
});

describe("the Admin's Tutor chat list", () => {
  it("says no Tutor has written in yet", () => {
    render(<AdminTutorChatsContent />);
    expect(screen.getByText("No Tutor has written in yet.")).toBeTruthy();
  });

  it("shows every Tutor thread with its unread count and preview", () => {
    state.threads = [thread({ unreadCount: 2 })];
    render(<AdminTutorChatsContent />);
    expect(screen.getByText("Amina Rahman")).toBeTruthy();
    expect(screen.getByText("Tutor ID 91")).toBeTruthy();
    expect(screen.getByText("Need help with my profile")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("opens a Tutor's thread on click and marks it read", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    render(<AdminTutorChatsContent />);

    expect(screen.getByText("Select a Tutor to view the conversation.")).toBeTruthy();
    fireEvent.click(screen.getByText("Amina Rahman"));

    expect(state.threadInput).toEqual({ tutorId: "tutor-1" });
    expect(state.markRead).toHaveBeenCalledWith({ tutorId: "tutor-1" });
  });

  it("sends a reply without the input carrying which Admin it is", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    fireEvent.change(screen.getByPlaceholderText("Reply as Admin…"), { target: { value: "  We are checking.  " } });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));

    expect(state.send).toHaveBeenCalledWith({ tutorId: "tutor-1", body: "We are checking." });
  });

  it("shows a Tutor message labelled Tutor, distinct from an Admin reply", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    state.threadMessages = [
      { id: 1, senderRole: "tutor", body: "I need help", createdAt: "2026-09-25T09:00:00.000Z" },
      { id: 2, senderRole: "admin", body: "Sure, what is wrong?", createdAt: "2026-09-25T09:05:00.000Z" },
    ];
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    expect(screen.getByText("I need help")).toBeTruthy();
    expect(screen.getByText("Sure, what is wrong?")).toBeTruthy();
    expect(screen.getByText("Tutor")).toBeTruthy();
  });

  it("on mobile, shows the list first and a Back control once a thread opens", () => {
    state.isMobile = true;
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    render(<AdminTutorChatsContent />);

    expect(screen.getByText("Amina Rahman")).toBeTruthy();
    fireEvent.click(screen.getByText("Amina Rahman"));

    const back = screen.getByRole("button", { name: "Back to Tutor list" });
    expect(back).toBeTruthy();
    fireEvent.click(back);
    expect(screen.getByPlaceholderText("Search Tutor name or ID")).toBeTruthy();
  });

  it("opens straight to a Tutor named in the URL, even before that Tutor has a thread", () => {
    state.search = "tutorId=tutor-2";
    state.threadTutor = { tutorId: "tutor-2", tutorName: "Karim Sheikh", tutorNumber: 44 };
    render(<AdminTutorChatsContent />);

    expect(state.threadInput).toEqual({ tutorId: "tutor-2" });
    expect(screen.getByText("Karim Sheikh")).toBeTruthy();
  });

  it("refreshes the open thread and the list when the socket says something arrived", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    state.adminSocketOnMessage?.("tutor-1");

    expect(state.invalidateListThreads).toHaveBeenCalled();
    expect(state.invalidateUnreadThreadCount).toHaveBeenCalled();
    expect(state.invalidateThread).toHaveBeenCalledWith({ tutorId: "tutor-1" });
  });
});
