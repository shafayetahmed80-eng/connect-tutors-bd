// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  messages: [] as any[],
  aiEscalatedAt: null as Date | null,
  sendMutate: vi.fn(),
  feedbackMutate: vi.fn(),
  invalidateThread: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      guardianAiChat: {
        thread: { invalidate: state.invalidateThread },
      },
    }),
    guardianAiChat: {
      thread: {
        useQuery: (_input: unknown, options?: { enabled?: boolean }) => ({
          data: options?.enabled
            ? {
                messages: state.messages,
                aiEscalatedAt: state.aiEscalatedAt,
              }
            : undefined,
          isLoading: false,
        }),
      },
      send: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (input: { body: string }) => {
            state.sendMutate(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
      submitAiFeedback: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (input: { messageId: number; feedback: "helpful" | "unhelpful" }) => {
            state.feedbackMutate(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
  },
}));

import { GuardianAiChatModal } from "./GuardianAiChatModal";

afterEach(() => {
  cleanup();
  state.messages = [];
  state.aiEscalatedAt = null;
  state.sendMutate.mockReset();
  state.feedbackMutate.mockReset();
  state.invalidateThread.mockReset();
});

describe("GuardianAiChatModal", () => {
  it("renders the floating trigger button initially", () => {
    render(<GuardianAiChatModal />);
    const trigger = screen.getByRole("button", { name: /Open AI Assistant/i });
    expect(trigger).toBeTruthy();
    expect(screen.getByText("এআই সহায়তা")).toBeTruthy();
  });

  it("opens modal and displays quick suggestion chips when clicked", () => {
    render(<GuardianAiChatModal />);
    const trigger = screen.getByRole("button", { name: /Open AI Assistant/i });
    fireEvent.click(trigger);

    expect(screen.getByText("অভিভাবক এআই সহকারী")).toBeTruthy();
    expect(screen.getByText("টিউশন ফি কত হতে পারে?")).toBeTruthy();
    expect(screen.getByText("কতদিনে টিউটর পাবো?")).toBeTruthy();
  });

  it("sends prompt when quick chip is clicked", () => {
    render(<GuardianAiChatModal />);
    fireEvent.click(screen.getByRole("button", { name: /Open AI Assistant/i }));

    const feeChip = screen.getByRole("button", { name: "টিউশন ফি কত হতে পারে?" });
    fireEvent.click(feeChip);

    expect(state.sendMutate).toHaveBeenCalledWith({
      body: "অভিভাবকদের জন্য টিউশন ফি সাধারণত কেমন হতে পারে?",
    });
  });

  it("renders messages, action chips, and triggers feedback mutation", () => {
    state.messages = [
      {
        id: 101,
        senderRole: "assistant",
        isAiGenerated: true,
        body: "কানেক্ট টিউটরস এআই সহায়তায় আপনাকে স্বাগতম।",
        aiFeedback: null,
        aiActionChips: [{ label: "টিউশন রিকোয়েস্ট", url: "/request-tutor" }],
        createdAt: new Date(),
      },
    ];

    render(<GuardianAiChatModal />);
    fireEvent.click(screen.getByRole("button", { name: /Open AI Assistant/i }));

    expect(screen.getByText("কানেক্ট টিউটরস এআই সহায়তায় আপনাকে স্বাগতম।")).toBeTruthy();
    expect(screen.getByText("টিউশন রিকোয়েস্ট")).toBeTruthy();

    const helpfulBtn = screen.getByRole("button", { name: "Helpful AI response" });
    fireEvent.click(helpfulBtn);

    expect(state.feedbackMutate).toHaveBeenCalledWith({
      messageId: 101,
      feedback: "helpful",
    });
  });

  it("shows escalation banner when aiEscalatedAt is present", () => {
    state.aiEscalatedAt = new Date();
    render(<GuardianAiChatModal />);
    fireEvent.click(screen.getByRole("button", { name: /Open AI Assistant/i }));

    expect(
      screen.getByText(/আপনার মেসেজটি পর্যালোচনা ও ফলো-আপের জন্য এডমিনের কাছে পাঠানো হয়েছে/i)
    ).toBeTruthy();
  });
});
