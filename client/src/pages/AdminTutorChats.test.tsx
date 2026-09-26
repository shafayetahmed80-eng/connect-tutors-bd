// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  tutorLastReadAt: null as string | null,
  claimedByAdminId: null as number | null,
  claimedByAdminName: null as string | null,
  send: vi.fn(),
  markRead: vi.fn(),
  claim: vi.fn(),
  release: vi.fn(),
  onSocketFrame: null as ((frame: { type: string; tutorId?: string }) => void) | null,
  sendFrame: vi.fn(),
  invalidateListThreads: vi.fn(),
  invalidateUnreadThreadCount: vi.fn(),
  invalidateThread: vi.fn(),
}));

vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => state.isMobile }));
vi.mock("@/hooks/useChatSocket", () => ({
  useAdminChatSocket: (onFrame: (frame: { type: string; tutorId?: string }) => void) => {
    state.onSocketFrame = onFrame;
    return state.sendFrame;
  },
}));
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
          return { data: { tutor: state.threadTutor, messages: state.threadMessages, tutorLastReadAt: state.tutorLastReadAt, claimedByAdminId: state.claimedByAdminId, claimedByAdminName: state.claimedByAdminName }, isLoading: state.threadLoading };
        },
      },
      sendTutorChatMessage: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.send(input); options.onSuccess?.(); }, isPending: false }) },
      markTutorChatRead: { useMutation: () => ({ mutate: state.markRead, isPending: false }) },
      claimTutorChatThread: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.claim(input); options.onSuccess?.(); }, isPending: false }) },
      releaseTutorChatThread: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.release(input); options.onSuccess?.(); }, isPending: false }) },
    },
  },
}));

import { AdminTutorChatsContent } from "./AdminTutorChats";

const thread = (over: Record<string, unknown> = {}) => ({ tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91, lastMessageAt: "2026-09-25T10:00:00.000Z", lastMessagePreview: "Need help with my profile", unreadCount: 0, claimedByAdminId: null, claimedByAdminName: null, ...over });
const message = (over: Record<string, unknown> = {}) => ({ id: 1, senderRole: "tutor", body: "Hi", attachmentUrl: null, attachmentContentType: null, createdAt: "2026-09-25T09:00:00.000Z", ...over });

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
  state.tutorLastReadAt = null;
  state.claimedByAdminId = null;
  state.claimedByAdminName = null;
  state.send.mockReset();
  state.markRead.mockReset();
  state.claim.mockReset();
  state.release.mockReset();
  state.onSocketFrame = null;
  state.sendFrame.mockReset();
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

  it("shows which Admin has claimed a thread, in the list", () => {
    state.threads = [thread({ claimedByAdminId: 7, claimedByAdminName: "Rahim Admin" })];
    render(<AdminTutorChatsContent />);
    expect(screen.getByText("Claimed by Rahim Admin")).toBeTruthy();
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
      message({ id: 1, senderRole: "tutor", body: "I need help", createdAt: "2026-09-25T09:00:00.000Z" }),
      message({ id: 2, senderRole: "admin", body: "Sure, what is wrong?", createdAt: "2026-09-25T09:05:00.000Z" }),
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

  it("refreshes the open thread and the list when the socket says a message arrived", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    act(() => { state.onSocketFrame?.({ type: "message", tutorId: "tutor-1" }); });

    expect(state.invalidateListThreads).toHaveBeenCalled();
    expect(state.invalidateUnreadThreadCount).toHaveBeenCalled();
    expect(state.invalidateThread).toHaveBeenCalledWith({ tutorId: "tutor-1" });
  });

  it("shows Tutor is typing… only while that Tutor's own thread is open", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    act(() => { state.onSocketFrame?.({ type: "typing", tutorId: "tutor-2" }); });
    expect(screen.queryByText("Tutor is typing…")).toBeNull();

    act(() => { state.onSocketFrame?.({ type: "typing", tutorId: "tutor-1" }); });
    expect(screen.getByText("Tutor is typing…")).toBeTruthy();
  });

  it("lets an Admin claim an unclaimed thread, then release it", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    fireEvent.click(screen.getByRole("button", { name: /Claim/ }));
    expect(state.claim).toHaveBeenCalledWith({ tutorId: "tutor-1" });
  });

  it("shows who claimed the open thread, with a way to release it", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    state.claimedByAdminId = 7;
    state.claimedByAdminName = "Rahim Admin";
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    const releaseButton = screen.getByRole("button", { name: /Claimed by Rahim Admin/ });
    fireEvent.click(releaseButton);
    expect(state.release).toHaveBeenCalledWith({ tutorId: "tutor-1" });
  });

  it("shows an image attachment inline", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    state.threadMessages = [message({ body: "", attachmentUrl: "https://example.test/photo.png", attachmentContentType: "image/png" })];
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));
    expect(screen.getByRole("img", { name: "Attachment" })).toBeTruthy();
  });

  it("searches the open conversation locally", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    state.threadMessages = [message({ id: 1, body: "About my profile" }), message({ id: 2, body: "About payment" })];
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "payment" } });
    expect(screen.queryByText("About my profile")).toBeNull();
    expect(screen.getByText("About payment")).toBeTruthy();
  });
});
