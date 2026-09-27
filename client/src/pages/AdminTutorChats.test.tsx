// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  isMobile: false,
  search: "",
  threads: [] as any[],
  threadsLoading: false,
  threadsQueryInput: null as unknown,
  threadInput: null as unknown,
  threadTutor: null as any,
  threadMessages: [] as any[],
  threadLoading: false,
  tutorLastReadAt: null as string | null,
  claimedByAdminId: null as number | null,
  claimedByAdminName: null as string | null,
  archivedAt: null as string | null,
  stats: { awaitingReplyCount: 0, avgResponseMinutes: null as number | null },
  pushPublicKey: null as string | null,
  quickReplies: [] as any[],
  notes: [] as any[],
  send: vi.fn(),
  markRead: vi.fn(),
  claim: vi.fn(),
  release: vi.fn(),
  reopen: vi.fn(),
  addNote: vi.fn(),
  createQuickReply: vi.fn(),
  deleteQuickReply: vi.fn(),
  react: vi.fn(),
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
vi.mock("@/hooks/useVoiceRecorder", () => ({ useVoiceRecorder: () => ({ recording: false, start: vi.fn(), stop: vi.fn(), cancel: vi.fn(), supported: false }) }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 42, name: "Test Admin", role: "admin" as const } }) }));
vi.mock("wouter", () => ({ useSearch: () => state.search }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        listTutorChatThreads: { invalidate: state.invalidateListThreads },
        tutorChatUnreadThreadCount: { invalidate: state.invalidateUnreadThreadCount },
        getTutorChatThread: { invalidate: state.invalidateThread },
        getTutorChatStats: { invalidate: vi.fn() },
        listChatQuickReplies: { invalidate: vi.fn() },
        listTutorChatNotes: { invalidate: vi.fn() },
      },
    }),
    admin: {
      listTutorChatThreads: {
        useQuery: (input: unknown) => {
          state.threadsQueryInput = input;
          return { data: { items: state.threads, total: state.threads.length, page: 1, pageSize: 50, totalPages: 1 }, isLoading: state.threadsLoading };
        },
      },
      getTutorChatThread: {
        useQuery: (input: unknown) => {
          state.threadInput = input;
          return { data: { tutor: state.threadTutor, messages: state.threadMessages, tutorLastReadAt: state.tutorLastReadAt, claimedByAdminId: state.claimedByAdminId, claimedByAdminName: state.claimedByAdminName, archivedAt: state.archivedAt }, isLoading: state.threadLoading };
        },
      },
      sendTutorChatMessage: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.send(input); options.onSuccess?.(); }, isPending: false }) },
      markTutorChatRead: { useMutation: () => ({ mutate: state.markRead, isPending: false }) },
      claimTutorChatThread: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.claim(input); options.onSuccess?.(); }, isPending: false }) },
      releaseTutorChatThread: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.release(input); options.onSuccess?.(); }, isPending: false }) },
      reopenTutorChatThread: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.reopen(input); options.onSuccess?.(); }, isPending: false }) },
      getTutorChatStats: { useQuery: () => ({ data: state.stats }) },
      getChatPushPublicKey: { useQuery: () => ({ data: { publicKey: state.pushPublicKey } }) },
      subscribeChatPush: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      unsubscribeChatPush: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      listChatQuickReplies: { useQuery: (_input: unknown, options?: { enabled?: boolean }) => ({ data: options?.enabled === false ? undefined : { items: state.quickReplies } }) },
      createChatQuickReply: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.createQuickReply(input); options.onSuccess?.(); }, isPending: false }) },
      updateChatQuickReply: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteChatQuickReply: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.deleteQuickReply(input); options.onSuccess?.(); }, isPending: false }) },
      listTutorChatNotes: { useQuery: () => ({ data: { notes: state.notes }, isLoading: false }) },
      addTutorChatNote: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.addNote(input); options.onSuccess?.(); }, isPending: false }) },
      reactToChatMessage: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.react(input); options.onSuccess?.(); }, isPending: false }) },
    },
  },
}));

import { AdminTutorChatsContent } from "./AdminTutorChats";

const thread = (over: Record<string, unknown> = {}) => ({ tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91, lastMessageAt: "2026-09-25T10:00:00.000Z", lastMessagePreview: "Need help with my profile", unreadCount: 0, claimedByAdminId: null, claimedByAdminName: null, ...over });
const message = (over: Record<string, unknown> = {}) => ({ id: 1, senderRole: "tutor", body: "Hi", attachmentUrl: null, attachmentContentType: null, tutorReacted: false, adminReacted: false, createdAt: "2026-09-25T09:00:00.000Z", ...over });

afterEach(() => {
  cleanup();
  state.isMobile = false;
  state.search = "";
  state.threads = [];
  state.threadsLoading = false;
  state.threadsQueryInput = null;
  state.threadInput = null;
  state.threadTutor = null;
  state.threadMessages = [];
  state.threadLoading = false;
  state.tutorLastReadAt = null;
  state.claimedByAdminId = null;
  state.claimedByAdminName = null;
  state.archivedAt = null;
  state.stats = { awaitingReplyCount: 0, avgResponseMinutes: null };
  state.pushPublicKey = null;
  state.quickReplies = [];
  state.notes = [];
  state.send.mockReset();
  state.markRead.mockReset();
  state.claim.mockReset();
  state.release.mockReset();
  state.reopen.mockReset();
  state.addNote.mockReset();
  state.createQuickReply.mockReset();
  state.deleteQuickReply.mockReset();
  state.react.mockReset();
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

  it("sends on Enter, and allows a newline with Shift+Enter", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    const box = screen.getByPlaceholderText("Reply as Admin…");
    fireEvent.change(box, { target: { value: "We are checking." } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(state.send).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(state.send).toHaveBeenCalledWith({ tutorId: "tutor-1", body: "We are checking." });
  });

  it("shows the Tutor's photo, mobile number, institute and department in the thread header, not a character count", () => {
    state.threads = [thread()];
    state.threadTutor = {
      tutorId: "tutor-1",
      tutorName: "Amina Rahman",
      tutorNumber: 91,
      phone: "01711000000",
      profilePhotoUrl: null,
      instituteName: "Dhaka University",
      departmentName: "Physics",
    };
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    expect(screen.getByText("01711000000")).toBeTruthy();
    expect(screen.getByText("Dhaka University")).toBeTruthy();
    expect(screen.getByText("Physics")).toBeTruthy();
    expect(screen.queryByText(/remaining/)).toBeNull();
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

  it("shows how many threads are awaiting a reply, and the average response time", () => {
    state.stats = { awaitingReplyCount: 3, avgResponseMinutes: 12 };
    render(<AdminTutorChatsContent />);
    expect(screen.getByText("3 awaiting reply")).toBeTruthy();
    expect(screen.getByText("~12 min avg. reply (30d)")).toBeTruthy();
  });

  it("says there is not enough data yet when no reply pair qualifies", () => {
    state.stats = { awaitingReplyCount: 0, avgResponseMinutes: null };
    render(<AdminTutorChatsContent />);
    expect(screen.getByText("Not enough replies yet for an average")).toBeTruthy();
  });

  it("switches between Active and Archived tabs", () => {
    state.threads = [thread()];
    render(<AdminTutorChatsContent />);
    expect(state.threadsQueryInput).toMatchObject({ archived: false });

    fireEvent.click(screen.getByRole("button", { name: "Archived" }));
    expect(state.threadsQueryInput).toMatchObject({ archived: true });
  });

  it("shows a Reopen banner for an archived thread and reopens it", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    state.archivedAt = "2026-08-01T00:00:00.000Z";
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    expect(screen.getByText(/Archived after 30 days idle/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Reopen/ }));
    expect(state.reopen).toHaveBeenCalledWith({ tutorId: "tutor-1" });
  });

  it("pre-fills a starter message for a Tutor with no messages yet", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    state.threadMessages = [];
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    const box = screen.getByPlaceholderText("Reply as Admin…") as HTMLTextAreaElement;
    expect(box.value).toContain("Connect Tutors Admin team");
  });

  it("opens the private notes and adds one, never visible to the Tutor's own thread", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    state.notes = [{ id: 1, body: "Called about a late payment.", createdAt: "2026-09-25T09:00:00.000Z", authorAdminName: "Rahim Admin" }];
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    fireEvent.click(screen.getByRole("button", { name: "Private notes" }));
    expect(screen.getByText("Called about a late payment.")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Add a note for other Admins…"), { target: { value: "Following up tomorrow." } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(state.addNote).toHaveBeenCalledWith({ tutorId: "tutor-1", body: "Following up tomorrow." });
  });

  it("inserts a quick reply into the composer", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    state.quickReplies = [{ id: 1, label: "Payment help", body: "Please share your payment reference number." }];
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    fireEvent.click(screen.getByRole("button", { name: "Quick replies" }));
    fireEvent.click(screen.getByText("Payment help"));

    const box = screen.getByPlaceholderText("Reply as Admin…") as HTMLTextAreaElement;
    expect(box.value).toContain("Please share your payment reference number.");
  });

  it("lets an Admin react to a message, and shows the Tutor's own reaction", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    state.threadMessages = [message({ id: 7, tutorReacted: true })];
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    expect(screen.getByText("👍 Tutor")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "React with 👍" }));
    expect(state.react).toHaveBeenCalledWith({ tutorId: "tutor-1", messageId: 7 });
  });

  it("shows a dot on Notes when another Admin adds one, and clears it on open", () => {
    state.threads = [thread()];
    state.threadTutor = { tutorId: "tutor-1", tutorName: "Amina Rahman", tutorNumber: 91 };
    render(<AdminTutorChatsContent />);
    fireEvent.click(screen.getByText("Amina Rahman"));

    expect(screen.queryByLabelText("New note")).toBeNull();
    act(() => { state.onSocketFrame?.({ type: "note", tutorId: "tutor-1" }); });
    expect(screen.getByLabelText("New note")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Private notes" }));
    expect(screen.queryByLabelText("New note")).toBeNull();
  });

  it("sorts unread threads first, keeping recency order within each group", () => {
    state.threads = [
      thread({ tutorId: "t1", tutorName: "Amina Rahman", unreadCount: 0 }),
      thread({ tutorId: "t2", tutorName: "Karim Sheikh", unreadCount: 3 }),
      thread({ tutorId: "t3", tutorName: "Nasrin Akter", unreadCount: 0 }),
    ];
    render(<AdminTutorChatsContent />);
    fireEvent.change(screen.getByLabelText("Sort conversations"), { target: { value: "unread" } });

    const names = screen.getAllByRole("button")
      .map(button => button.textContent ?? "")
      .filter(text => /Rahman|Sheikh|Akter/.test(text));
    expect(names[0]).toContain("Karim Sheikh");
    expect(names[1]).toContain("Amina Rahman");
    expect(names[2]).toContain("Nasrin Akter");
  });

  it("sorts the signed-in Admin's own claimed threads first", () => {
    state.threads = [
      thread({ tutorId: "t1", tutorName: "Amina Rahman", claimedByAdminId: null }),
      thread({ tutorId: "t2", tutorName: "Karim Sheikh", claimedByAdminId: 42, claimedByAdminName: "Test Admin" }),
    ];
    render(<AdminTutorChatsContent />);
    fireEvent.change(screen.getByLabelText("Sort conversations"), { target: { value: "mine" } });

    const names = screen.getAllByRole("button")
      .map(button => button.textContent ?? "")
      .filter(text => /Rahman|Sheikh/.test(text));
    expect(names[0]).toContain("Karim Sheikh");
  });
});
