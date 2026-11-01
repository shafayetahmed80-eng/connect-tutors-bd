// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  messages: [] as any[],
  submitAiFeedback: vi.fn(),
  invalidateThread: vi.fn(),
}));

vi.mock("@/hooks/useChatSocket", () => ({
  useTutorChatSocket: () => vi.fn(),
  useOnlineStatus: () => true,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      tutorAdminChat: {
        thread: { invalidate: state.invalidateThread },
        unreadCount: { invalidate: vi.fn() },
      },
    }),
    tutorAdminChat: {
      thread: {
        useQuery: () => ({
          data: {
            messages: state.messages,
            tutorLastReadAt: null,
            adminLastReadAt: null,
            eligible: true,
            mode: "appointed",
          },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
      send: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      markRead: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      react: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      submitAiFeedback: {
        useMutation: (options?: { onSuccess?: () => void }) => ({
          mutate: (input: unknown) => {
            state.submitAiFeedback(input);
            options?.onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
  },
}));

import { TutorAdminChatPanel } from "./TutorAdminChat";

afterEach(() => {
  cleanup();
  state.messages = [];
  state.submitAiFeedback.mockReset();
  state.invalidateThread.mockReset();
});

describe("TutorAdminChat AI Action Chips and Feedback", () => {
  it("renders actionable deep-link chips on AI generated bubble", () => {
    state.messages = [
      {
        id: 99,
        senderRole: "admin",
        body: "আপনার প্রোফাইল শতভাগ সম্পূর্ণ করতে পারেন।",
        attachmentUrl: null,
        attachmentContentType: null,
        tutorReacted: false,
        adminReacted: false,
        createdAt: "2026-11-01T10:00:00.000Z",
        isAiGenerated: true,
        aiActionChips: [
          { label: "প্রোফাইল আপডেট করুন", url: "/tutor/dashboard/profile" },
          { label: "জব বোর্ড দেখুন", url: "/job-board" },
        ],
      },
    ];

    render(<TutorAdminChatPanel />);

    expect(screen.getByText("প্রোফাইল আপডেট করুন")).toBeTruthy();
    expect(screen.getByText("জব বোর্ড দেখুন")).toBeTruthy();
  });

  it("triggers 1-click helpful and unhelpful feedback mutation", () => {
    state.messages = [
      {
        id: 100,
        senderRole: "admin",
        body: "ভেরিফিকেশন সম্পন্ন হতে ২৪-৪৮ ঘণ্টা সময় লাগতে পারে।",
        attachmentUrl: null,
        attachmentContentType: null,
        tutorReacted: false,
        adminReacted: false,
        createdAt: "2026-11-01T10:00:00.000Z",
        isAiGenerated: true,
        aiFeedback: null,
      },
    ];

    render(<TutorAdminChatPanel />);

    const helpfulBtn = screen.getByRole("button", { name: "Helpful AI response" });
    expect(helpfulBtn).toBeTruthy();

    fireEvent.click(helpfulBtn);
    expect(state.submitAiFeedback).toHaveBeenCalledWith({
      messageId: 100,
      feedback: "helpful",
    });

    const unhelpfulBtn = screen.getByRole("button", { name: "Unhelpful AI response" });
    expect(unhelpfulBtn).toBeTruthy();

    fireEvent.click(unhelpfulBtn);
    expect(state.submitAiFeedback).toHaveBeenCalledWith({
      messageId: 100,
      feedback: "unhelpful",
    });
  });
});
