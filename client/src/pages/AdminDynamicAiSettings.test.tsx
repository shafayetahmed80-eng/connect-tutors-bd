// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  aiSettings: {
    enabled: true,
    welcomeMessage: "স্বাগতম বার্তা",
    fallbackMessage: "ফলব্যাক বার্তা",
    systemPrompt: "সিস্টেম প্রম্পট",
  },
  analytics: {
    totalAiMessages: 42,
    tutorMessages: 28,
    guardianMessages: 14,
    helpfulCount: 38,
    unhelpfulCount: 4,
    escalatedCount: 3,
    satisfactionRate: 90,
  },
  faqs: [
    {
      id: 1,
      question: "ডেমো ক্লাসের নিয়ম কী?",
      answer: "ডেমো ক্লাসের পর অভিভাবক চূড়ান্ত সিদ্ধান্ত নেবেন।",
      category: "general",
      audience: "all" as const,
      isActive: true,
    },
  ],
  updateSettingsMutate: vi.fn(),
  createFaqMutate: vi.fn(),
  updateFaqMutate: vi.fn(),
  deleteFaqMutate: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, role: "admin" },
    loading: false,
  }),
}));

vi.mock("@/components/AdminDynamicSectionPage", () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="dynamic-section-page">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        getAiChatSettings: { invalidate: vi.fn() },
        listAiKnowledgeFaqs: { invalidate: vi.fn() },
      },
    }),
    admin: {
      getAiChatSettings: {
        useQuery: () => ({ data: state.aiSettings, isLoading: false }),
      },
      updateAiChatSettings: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (input: any) => {
            state.updateSettingsMutate(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
      getAiChatAnalytics: {
        useQuery: () => ({
          data: state.analytics,
          isLoading: false,
          refetch: vi.fn(),
          isFetching: false,
        }),
      },
      listAiKnowledgeFaqs: {
        useQuery: () => ({ data: state.faqs, isLoading: false }),
      },
      createAiKnowledgeFaq: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (input: any) => {
            state.createFaqMutate(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
      updateAiKnowledgeFaq: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (input: any) => {
            state.updateFaqMutate(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
      deleteAiKnowledgeFaq: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (input: any) => {
            state.deleteFaqMutate(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
  },
}));

import AdminDynamicAiSettings from "./AdminDynamicAiSettings";

afterEach(() => {
  cleanup();
  state.updateSettingsMutate.mockReset();
  state.createFaqMutate.mockReset();
  state.updateFaqMutate.mockReset();
  state.deleteFaqMutate.mockReset();
});

describe("AdminDynamicAiSettings", () => {
  it("renders page title and analytics metrics", () => {
    render(<AdminDynamicAiSettings />);

    expect(screen.getByText("AI Assistant Control & Training Center")).toBeTruthy();
    expect(screen.getByText("এআই লাইভ চ্যাট কন্ট্রোল ও নলেজ ট্রেইনিং")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy(); // totalAiMessages
    expect(screen.getByText("90%")).toBeTruthy(); // satisfactionRate
  });

  it("submits updated AI configuration when save button is clicked", () => {
    render(<AdminDynamicAiSettings />);

    const saveBtn = screen.getByRole("button", { name: /সেটিংস সংরক্ষণ/i });
    fireEvent.click(saveBtn);

    expect(state.updateSettingsMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        welcomeMessage: "স্বাগতম বার্তা",
        fallbackMessage: "ফলব্যাক বার্তা",
        systemPrompt: "সিস্টেম প্রম্পট",
      })
    );
  });

  it("creates a new knowledge FAQ on form submit", () => {
    render(<AdminDynamicAiSettings />);

    const questionInput = screen.getByPlaceholderText(/যেমন: ডেমো ক্লাসের নিয়ম কী\?/i);
    const answerInput = screen.getByPlaceholderText(/এআই ব্যবহারকারীকে যে বিস্তারিত উত্তরটি দেবে/i);

    fireEvent.change(questionInput, { target: { value: "পেমেন্ট কীভাবে করবো?" } });
    fireEvent.change(answerInput, { target: { value: "বিকাশ বা নগদ দিয়ে পেমেন্ট করা যাবে।" } });

    const submitBtn = screen.getByRole("button", { name: /জ্ঞানভাণ্ডারে যুক্ত করুন/i });
    fireEvent.click(submitBtn);

    expect(state.createFaqMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "পেমেন্ট কীভাবে করবো?",
        answer: "বিকাশ বা নগদ দিয়ে পেমেন্ট করা যাবে।",
        category: "general",
        audience: "all",
      })
    );
  });

  it("renders existing FAQ item and allows toggling status", () => {
    render(<AdminDynamicAiSettings />);

    expect(screen.getByText("ডেমো ক্লাসের নিয়ম কী?")).toBeTruthy();
    expect(screen.getByText("ডেমো ক্লাসের পর অভিভাবক চূড়ান্ত সিদ্ধান্ত নেবেন।")).toBeTruthy();

    const toggleBtn = screen.getByRole("button", { name: /পজ করুন/i });
    fireEvent.click(toggleBtn);

    expect(state.updateFaqMutate).toHaveBeenCalledWith({
      id: 1,
      isActive: false,
    });
  });
});
