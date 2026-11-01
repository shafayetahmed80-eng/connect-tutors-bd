// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TutorAiChatModal } from "./TutorAiChatModal";

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  sendMutate: vi.fn(),
  feedbackMutate: vi.fn(),
  messages: [
    {
      id: 1,
      senderRole: "tutor",
      body: "আমার জন্য কোনো টিউশন আছে?",
      createdAt: new Date("2026-11-01T12:00:00Z"),
      isAiGenerated: false,
    },
    {
      id: 2,
      senderRole: "admin",
      body: "হ্যাঁ, আপনার জন্য জব পাওয়া গেছে: [Job ID: TR-101]",
      createdAt: new Date("2026-11-01T12:01:00Z"),
      isAiGenerated: true,
      aiActionChips: [{ label: "জব বোর্ড", url: "/job-board" }],
      aiFeedback: null,
    },
  ],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      tutorAdminChat: { thread: { invalidate: mocks.invalidate } },
    }),
    tutorAdminChat: {
      thread: {
        useQuery: () => ({
          data: {
            messages: mocks.messages,
            aiEscalatedAt: null,
          },
          isLoading: false,
        }),
      },
      send: {
        useMutation: () => ({
          mutate: mocks.sendMutate,
          isPending: false,
        }),
      },
      submitAiFeedback: {
        useMutation: () => ({
          mutate: mocks.feedbackMutate,
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("./ChatTuitionActions", () => ({
  extractJobIdsFromText: (text: string) => (text.includes("TR-101") ? [101] : []),
  ChatTuitionJobCard: ({ jobId }: { jobId: number }) => (
    <div data-testid={`job-card-${jobId}`}>Job Card #{jobId}</div>
  ),
}));

describe("TutorAiChatModal", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the floating trigger button initially", () => {
    render(<TutorAiChatModal />);
    expect(screen.getByRole("button", { name: /টিউটর এআই সহায়তা চালু করুন/i })).toBeDefined();
    expect(screen.getByText("এআই সহায়তা")).toBeDefined();
  });

  it("hides the floating trigger button when hideFloatingButton is true", () => {
    render(<TutorAiChatModal hideFloatingButton={true} />);
    expect(screen.queryByRole("button", { name: /টিউটর এআই সহায়তা চালু করুন/i })).toBeNull();
  });

  it("opens the chat modal upon clicking the floating button", () => {
    render(<TutorAiChatModal />);
    const trigger = screen.getByRole("button", { name: /টিউটর এআই সহায়তা চালু করুন/i });
    fireEvent.click(trigger);

    expect(screen.getByText("টিউটর এআই সহকারী")).toBeDefined();
    expect(screen.getByText("কানেক্ট টিউটরস (Member: BTPA-077)")).toBeDefined();
    expect(screen.getByText("আমার জন্য কোনো টিউশন আছে?")).toBeDefined();
    expect(screen.getByTestId("job-card-101")).toBeDefined();
  });

  it("renders action chips and triggers feedback mutation on click", () => {
    render(<TutorAiChatModal />);
    fireEvent.click(screen.getByRole("button", { name: /টিউটর এআই সহায়তা চালু করুন/i }));

    expect(screen.getByText("জব বোর্ড")).toBeDefined();

    const helpfulBtn = screen.getByLabelText("Helpful AI response");
    fireEvent.click(helpfulBtn);

    expect(mocks.feedbackMutate).toHaveBeenCalledWith({
      messageId: 2,
      feedback: "helpful",
    });
  });

  it("sends a message when clicking a quick prompt chip", () => {
    render(<TutorAiChatModal />);
    fireEvent.click(screen.getByRole("button", { name: /টিউটর এআই সহায়তা চালু করুন/i }));

    const chip = screen.getByText("সিভি ডাউনলোড");
    fireEvent.click(chip);

    expect(mocks.sendMutate).toHaveBeenCalledWith({
      body: "আমার সিভি (CV) কীভাবে ডাউনলোড করবো?",
    });
  });
});
