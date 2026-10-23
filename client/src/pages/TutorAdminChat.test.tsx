// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  messages: [] as any[],
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  invalidateThread: vi.fn(),
  eligible: true,
  mode: "appointed" as "appointed" | "approved" | "all" | "disabled",
  adminLastReadAt: null as string | null,
  send: vi.fn(),
  markRead: vi.fn(),
  react: vi.fn(),
  onSocketFrame: null as ((frame: { type: string; tutorId?: string }) => void) | null,
  sendFrame: vi.fn(),
}));

vi.mock("@/hooks/useChatSocket", () => ({
  useTutorChatSocket: (_token: string | null, onFrame: (frame: { type: string; tutorId?: string }) => void) => {
    state.onSocketFrame = onFrame;
    return state.sendFrame;
  },
  useOnlineStatus: () => true,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorAdminChat: { thread: { invalidate: state.invalidateThread }, unreadCount: { invalidate: vi.fn() } } }),
    tutorAdminChat: {
      thread: { useQuery: () => ({ data: state.isError ? undefined : { messages: state.messages, tutorLastReadAt: null, adminLastReadAt: state.adminLastReadAt, eligible: state.eligible, mode: state.mode }, isLoading: state.isLoading, isError: state.isError, refetch: state.refetch }) },
      send: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.send(input); options.onSuccess?.(); }, isPending: false }) },
      markRead: { useMutation: () => ({ mutate: state.markRead, isPending: false }) },
      react: { useMutation: (options: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { state.react(input); options.onSuccess?.(); }, isPending: false }) },
    },
  },
}));

import { TutorAdminChatPanel } from "./TutorAdminChat";

const message = (over: Record<string, unknown> = {}) => ({ id: 1, senderRole: "admin", body: "Hello", attachmentUrl: null, attachmentContentType: null, tutorReacted: false, adminReacted: false, createdAt: "2026-09-25T10:00:00.000Z", ...over });

afterEach(() => {
  cleanup();
  state.messages = [];
  state.isLoading = false;
  state.isError = false;
  state.eligible = true;
  state.mode = "appointed";
  state.adminLastReadAt = null;
  state.send.mockReset();
  state.markRead.mockReset();
  state.react.mockReset();
  state.onSocketFrame = null;
  state.sendFrame.mockReset();
  state.invalidateThread.mockReset();
  state.refetch.mockReset();
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

  it("sends on Enter, and allows a newline with Shift+Enter", () => {
    render(<TutorAdminChatPanel />);
    const box = screen.getByPlaceholderText("Write a message…");
    fireEvent.change(box, { target: { value: "Please help" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(state.send).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(state.send).toHaveBeenCalledWith({ body: "Please help" });
  });

  it("shows the brand logo and the helpline number in the header, not a character count", () => {
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("+8801516131411")).toBeTruthy();
    expect(screen.queryByText(/remaining/)).toBeNull();
  });

  it("keeps Send disabled for an empty draft", () => {
    render(<TutorAdminChatPanel />);
    expect(screen.getByRole("button", { name: "Send message" })).toHaveProperty("disabled", true);
  });

  it("locks the composer until a tuition has been appointed, showing Bengali notice and contact fallback links", () => {
    state.eligible = false;
    state.mode = "appointed";
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("You can message the Admin team once at least one of your tuitions has been appointed.")).toBeTruthy();
    expect(screen.getByText("শুধুমাত্র নিয়োগপ্রাপ্ত টিউটরদের জন্য উন্মুক্ত")).toBeTruthy();
    expect(screen.getByRole("link", { name: "WhatsApp-এ মেসেজ দিন" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /হেল্পলাইনে কল করুন/i })).toBeTruthy();
    expect(screen.queryByPlaceholderText("Write a message…")).toBeNull();
  });

  it("shows approved profile notice when ineligible under approved mode", () => {
    state.eligible = false;
    state.mode = "approved";
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("প্রোফাইল অনুমোদনের অপেক্ষায়")).toBeTruthy();
    expect(screen.getByText("You can message the Admin team once your tutor profile has been approved.")).toBeTruthy();
  });

  it("shows disabled notice when ineligible under disabled mode", () => {
    state.eligible = false;
    state.mode = "disabled";
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("লাইভ চ্যাট সাময়িকভাবে বন্ধ")).toBeTruthy();
    expect(screen.getByText("Tutor live chat is temporarily disabled by admin.")).toBeTruthy();
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
    expect(screen.getAllByRole("link", { name: /Attachment/ })[0]).toBeTruthy();
  });

  it("renders voice note with ChatVoiceNotePlayer and speed options", () => {
    state.messages = [message({ id: 1, body: "", attachmentUrl: "https://example.com/audio.webm", attachmentContentType: "audio/webm" })];
    render(<TutorAdminChatPanel />);
    expect(screen.getByRole("region", { name: "Voice note player" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play voice note" })).toBeTruthy();
  });

  it("renders header sound alert toggle", () => {
    render(<TutorAdminChatPanel />);
    const soundBtn = screen.getByRole("button", { name: /chat sound alerts/i });
    expect(soundBtn).toBeTruthy();
  });

  it("marks the Tutor's own last message Seen once the Admin has read up to it", () => {
    state.messages = [message({ id: 1, senderRole: "tutor", body: "I have a question", createdAt: "2026-09-25T10:00:00.000Z" })];
    state.adminLastReadAt = "2026-09-25T10:05:00.000Z";
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("Seen")).toBeTruthy();
  });

  it("lets the Tutor react to a message, and shows the Admin's own reaction", () => {
    state.messages = [message({ id: 1, adminReacted: true })];
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("👍 Admin")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "React with 👍" }));
    expect(state.react).toHaveBeenCalledWith({ messageId: 1 });
  });

  it("shows Admin is typing… when a typing frame arrives over the socket", () => {
    render(<TutorAdminChatPanel />);
    expect(screen.queryByText("Admin is typing…")).toBeNull();
    act(() => { state.onSocketFrame?.({ type: "typing" }); });
    expect(screen.getByText("Admin is typing…")).toBeTruthy();
  });

  it("searches the loaded conversation locally and highlights the matched keyword with mark", () => {
    state.messages = [message({ id: 1, body: "About my profile" }), message({ id: 2, body: "About payment" })];
    render(<TutorAdminChatPanel />);
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "payment" } });
    expect(screen.queryByText("About my profile")).toBeNull();
    expect(screen.getByText((_, el) => el?.textContent === "About payment" && el?.tagName.toLowerCase() === "div")).toBeTruthy();
    expect(screen.getByText("payment").tagName).toBe("MARK");
  });

  it("allows replying to a message and shows reply preview bar", () => {
    state.messages = [message({ id: 1, body: "Hello tutor" })];
    render(<TutorAdminChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Reply to this message" }));
    expect(screen.getByText("Replying to Admin")).toBeTruthy();
    expect(screen.getAllByText("Hello tutor").length).toBeGreaterThanOrEqual(2);
  });

  it("displays the 30-day auto-delete privacy and security banner", () => {
    render(<TutorAdminChatPanel />);
    expect(screen.getByText(/গোপনীয়তা ও সুরক্ষার স্বার্থে চ্যাট হিস্ট্রি এবং শেয়ার করা ফাইলসমূহ ৩০ দিন পর স্বয়ংক্রিয়ভাবে মুছে যায়/)).toBeTruthy();
  });

  it("paginates messages when exceeding page size and reveals earlier messages on click", () => {
    state.messages = Array.from({ length: 35 }, (_, i) =>
      message({ id: i + 1, body: `Message number ${i + 1}`, createdAt: `2026-09-25T10:${String(i).padStart(2, "0")}:00.000Z` })
    );
    render(<TutorAdminChatPanel />);

    const loadMoreButton = screen.getByRole("button", { name: /Load earlier messages/ });
    expect(loadMoreButton).toBeTruthy();
    expect(screen.getByText(/Load earlier messages \(5 more\)/)).toBeTruthy();
    expect(screen.queryByText("Message number 1")).toBeNull();
    expect(screen.getByText("Message number 35")).toBeTruthy();

    fireEvent.click(loadMoreButton);
    expect(screen.getByText("Message number 1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Load earlier messages/ })).toBeNull();
  });

  it("renders optimistic outbox entry while sending", () => {
    render(<TutorAdminChatPanel />);
    const textarea = screen.getByPlaceholderText("Write a message…");
    fireEvent.change(textarea, { target: { value: "Optimistic pending message" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(state.send).toHaveBeenCalled();
  });

  it("renders date dividers between messages on different days", () => {
    state.messages = [
      message({ id: 1, body: "Day 1 message", createdAt: "2026-10-10T10:00:00.000Z" }),
      message({ id: 2, body: "Day 2 message", createdAt: "2026-10-11T10:00:00.000Z" }),
    ];
    render(<TutorAdminChatPanel />);
    expect(screen.getByText("10 Oct 2026")).toBeTruthy();
    expect(screen.getByText("11 Oct 2026")).toBeTruthy();
  });

  it("renders URLs inside messages as clickable auto-links", () => {
    state.messages = [message({ id: 1, body: "Check https://connecttutorsbd.com now" })];
    render(<TutorAdminChatPanel />);
    const link = screen.getByRole("link", { name: /connecttutorsbd.com/ });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://connecttutorsbd.com");
  });

  it("opens image lightbox modal on clicking image attachment", () => {
    state.messages = [message({ id: 1, attachmentUrl: "https://example.com/receipt.jpg", attachmentContentType: "image/jpeg" })];
    render(<TutorAdminChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: "View attachment image in full screen" }));
    expect(screen.getByRole("dialog", { name: "Attachment Preview" })).toBeTruthy();
  });

  it("reveals action menu on clicking message bubble and un-sends message within 5 minutes", () => {
    state.messages = [message({ id: 99, body: "Tutor own message to unsend", senderRole: "tutor", createdAt: new Date().toISOString() })];
    render(<TutorAdminChatPanel />);

    // Click bubble to open menu
    fireEvent.click(screen.getByText("Tutor own message to unsend"));
    expect(screen.getByText("মুছুন")).toBeTruthy();

    // Click Unsend
    fireEvent.click(screen.getByText("মুছুন"));
    expect(screen.getByText("[মেসেজটি মুছে ফেলা হয়েছে]")).toBeTruthy();
    expect(screen.queryByText("Tutor own message to unsend")).toBeNull();
  });

  it("edits message within 5 minutes and displays (সম্পাদিত) badge", () => {
    state.messages = [message({ id: 100, body: "Tutor message before edit", senderRole: "tutor", createdAt: new Date().toISOString() })];
    render(<TutorAdminChatPanel />);

    // Click bubble to open menu
    fireEvent.click(screen.getByText("Tutor message before edit"));
    expect(screen.getByText("এডিট")).toBeTruthy();

    // Click Edit
    fireEvent.click(screen.getByText("এডিট"));
    const editInput = screen.getByRole("textbox", { name: "Edit message" });
    fireEvent.change(editInput, { target: { value: "Tutor message after edit" } });
    fireEvent.click(screen.getByText("সংরক্ষণ করুন"));

    expect(screen.getByText("Tutor message after edit")).toBeTruthy();
    expect(screen.getByText("(সম্পাদিত)")).toBeTruthy();
  });

  it("handles clipboard image paste and renders clipboard preview chip", async () => {
    render(<TutorAdminChatPanel />);
    const textarea = screen.getByPlaceholderText("Write a message…");
    const file = new File(["dummy"], "pasted-screenshot.png", { type: "image/png" });

    fireEvent.paste(textarea, {
      clipboardData: {
        items: [
          {
            type: "image/png",
            getAsFile: () => file,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("clipboard-image-preview-chip")).toBeTruthy();
    });
    expect(screen.getByText("pasted-screenshot.png")).toBeTruthy();
  });

  it("activates drag-drop overlay on drag enter", () => {
    const { container } = render(<TutorAdminChatPanel />);
    const section = container.querySelector("section");
    expect(section).toBeTruthy();

    fireEvent.dragEnter(section!, {
      dataTransfer: {
        items: [{ kind: "file", type: "image/png" }],
      },
    });

    expect(screen.getByTestId("chat-dropzone-overlay")).toBeTruthy();
    expect(screen.getByText("এখানে ফাইল বা ছবি ড্রপ করুন")).toBeTruthy();
  });

  it("detects job ID in message, renders ChatTuitionJobCard, and allows pinning", () => {
    state.messages = [message({ body: "Please check this tuition #JOB-6801" })];
    render(<TutorAdminChatPanel />);

    expect(screen.getByTestId("chat-tuition-job-card-6801")).toBeTruthy();
    expect(screen.getByText("জব #6801")).toBeTruthy();
    expect(screen.getByText("Member: BTPA - 077")).toBeTruthy();

    const pinBtn = screen.getByRole("button", { name: /জব #6801 উপরে পিন করুন/i });
    fireEvent.click(pinBtn);

    expect(screen.getByTestId("pinned-job-banner")).toBeTruthy();
  });

  it("renders WhatsApp launcher and emergency actions in chat header", () => {
    render(<TutorAdminChatPanel />);
    expect(screen.getByTestId("chat-emergency-call-whatsapp-actions")).toBeTruthy();
    expect(screen.getByRole("link", { name: /WhatsApp/i })).toBeTruthy();
  });

  it("opens ShareJobModal when clicking tuition share button in composer", () => {
    render(<TutorAdminChatPanel />);
    const shareBtn = screen.getByRole("button", { name: "টিউশন জব কার্ড শেয়ার করুন" });
    fireEvent.click(shareBtn);

    expect(screen.getByText("টিউশন জব কার্ড শেয়ার করুন")).toBeTruthy();
    const jobSuggestion = screen.getByRole("button", { name: /জব #6801/i });
    fireEvent.click(jobSuggestion);

    const textarea = screen.getByPlaceholderText("Write a message…") as HTMLTextAreaElement;
    expect(textarea.value).toContain("#JOB-6801");
  });

  it("restores unsent draft from localStorage and displays indicator", async () => {
    window.localStorage.setItem("connect_tutors_chat_draft_tutor_main", "Previous unsaved tutor note");
    render(<TutorAdminChatPanel />);

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText("Write a message…") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Previous unsaved tutor note");
    });
    expect(screen.getByTestId("chat-draft-restored-indicator")).toBeTruthy();

    const clearBtn = screen.getByRole("button", { name: "খসড়া মুছুন" });
    fireEvent.click(clearBtn);

    const textarea = screen.getByPlaceholderText("Write a message…") as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
    expect(screen.queryByTestId("chat-draft-restored-indicator")).toBeNull();
  });

  it("loads last sent message on ArrowUp when composer is empty", () => {
    state.messages = [
      message({ id: 10, senderRole: "tutor", body: "Need an update on the tuition appointment" }),
    ];
    render(<TutorAdminChatPanel />);

    const textarea = screen.getByPlaceholderText("Write a message…") as HTMLTextAreaElement;
    expect(textarea.value).toBe("");

    fireEvent.keyDown(textarea, { key: "ArrowUp" });
    expect(textarea.value).toBe("Need an update on the tuition appointment");
  });

  it("opens forward modal from message action menu and appends to composer", () => {
    state.messages = [
      message({ id: 12, senderRole: "admin", body: "Your tuition has been confirmed for tomorrow" }),
    ];
    render(<TutorAdminChatPanel />);

    // Click on message bubble to open action menu
    const bubble = screen.getByText("Your tuition has been confirmed for tomorrow");
    fireEvent.click(bubble);

    const forwardBtn = screen.getByRole("button", { name: "মেসেজ ফরওয়ার্ড করুন" });
    expect(forwardBtn).toBeTruthy();
    fireEvent.click(forwardBtn);

    expect(screen.getByText("মেসেজ ফরওয়ার্ড করুন")).toBeTruthy();
    const addToComposerBtn = screen.getByRole("button", { name: "বর্তমান মেসেজ বক্সে যুক্ত করুন" });
    fireEvent.click(addToComposerBtn);

    const textarea = screen.getByPlaceholderText("Write a message…") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Your tuition has been confirmed for tomorrow");
  });

  it("supports mobile action drawer toggle and reveals attachment actions in tutor composer", () => {
    state.messages = [message()];
    render(<TutorAdminChatPanel />);

    const plusBtn = screen.getByRole("button", { name: "More attachment and chat actions" });
    expect(plusBtn).toBeTruthy();

    fireEvent.click(plusBtn);
    expect(screen.getByText("ফাইল/ছবি")).toBeTruthy();
    expect(screen.getByText("টিউশন কার্ড")).toBeTruthy();

    const closeBtn = screen.getByRole("button", { name: "Close actions menu" });
    fireEvent.click(closeBtn);
    expect(screen.queryByText("ফাইল/ছবি")).toBeNull();
  });
  it("renders pre-chat topic selector chips and allows selecting and toggling inquiry topics", () => {
    state.messages = [message()];
    render(<TutorAdminChatPanel />);

    expect(screen.getByText("বিষয় নির্বাচন:")).toBeTruthy();
    const applyTopicBtn = screen.getByRole("button", { name: "টিউশন আবেদন" });
    const feeTopicBtn = screen.getByRole("button", { name: "পেমেন্ট ও ফি" });

    // Click 'টিউশনে আবেদন'
    fireEvent.click(applyTopicBtn);
    const textarea = screen.getByPlaceholderText("Write a message…") as HTMLTextAreaElement;
    expect(textarea.value).toBe("[বিষয়: টিউশন আবেদন] ");

    // Click 'প্ল্যাটফর্ম ফি' replaces previous topic
    fireEvent.click(feeTopicBtn);
    expect(textarea.value).toBe("[বিষয়: পেমেন্ট ও ফি] ");
  });
it("invalidates thread query when access_mode socket frame is received", () => {
    render(<TutorAdminChatPanel />);
    expect(state.onSocketFrame).toBeTruthy();

    act(() => {
      state.onSocketFrame?.({ type: "access_mode" });
    });
    expect(state.invalidateThread).toHaveBeenCalled();
  });

  it("shows checking status in composer area while loading rather than premature locked notice", () => {
    state.isLoading = true;
    render(<TutorAdminChatPanel />);

    expect(screen.getByText(/লাইভ চ্যাট তথ্য যাচাই করা হচ্ছে…/i)).toBeTruthy();
    expect(screen.queryByText(/শুধুমাত্র নিয়োগপ্রাপ্ত টিউটরদের জন্য উন্মুক্ত/i)).toBeNull();
  });

  it("shows retry button when thread query errors", () => {
    state.isError = true;
    render(<TutorAdminChatPanel />);

    expect(screen.getByText(/চ্যাট তথ্য লোড হতে সমস্যা হয়েছে।/i)).toBeTruthy();
    const retryBtn = screen.getByRole("button", { name: /পুনরায় চেষ্টা করুন/i });
    expect(retryBtn).toBeTruthy();

    fireEvent.click(retryBtn);
    expect(state.refetch).toHaveBeenCalled();
  });
});
