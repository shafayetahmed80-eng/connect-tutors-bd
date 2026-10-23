// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  templates: [
    {
      id: 101,
      category: "tutor_chat",
      command: "/discount",
      title: "বিশেষ প্ল্যাটফর্ম ডিসকাউন্ট",
      body: "আপনার জন্য এই টিউশনে ২০% প্ল্যাটফর্ম ফি ছাড় দেওয়া হলো।",
      createdAt: new Date(),
    },
  ] as Array<{
    id: number;
    category: string;
    command?: string | null;
    title: string;
    body: string;
    createdAt: Date;
  }>,
  created: [] as any[],
  updated: [] as any[],
  deleted: [] as any[],
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        listMessageTemplates: { invalidate: state.invalidate },
      },
    }),
    admin: {
      listMessageTemplates: {
        useQuery: ({ category }: { category: string }) => ({
          data: {
            items: state.templates.filter(t => t.category === category),
          },
          isLoading: false,
        }),
      },
      createMessageTemplate: {
        useMutation: (opts: any) => ({
          mutate: (input: any) => {
            state.created.push(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
      updateMessageTemplate: {
        useMutation: (opts: any) => ({
          mutate: (input: any) => {
            state.updated.push(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
      deleteMessageTemplate: {
        useMutation: (opts: any) => ({
          mutate: (input: any) => {
            state.deleted.push(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

import AdminSlashPresetsManager from "./AdminSlashPresetsManager";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.templates = [
    {
      id: 101,
      category: "tutor_chat",
      command: "/discount",
      title: "বিশেষ প্ল্যাটফর্ম ডিসকাউন্ট",
      body: "আপনার জন্য এই টিউশনে ২০% প্ল্যাটফর্ম ফি ছাড় দেওয়া হলো।",
      createdAt: new Date(),
    },
  ];
  state.created = [];
  state.updated = [];
  state.deleted = [];
});

describe("AdminSlashPresetsManager", () => {
  it("renders header, category tabs, and both custom and system presets", () => {
    render(<AdminSlashPresetsManager />);

    expect(screen.getByText(/স্ল্যাশ কমান্ড ও মেসেজ প্রিসেট ম্যানেজার/i)).toBeTruthy();
    expect(screen.getByRole("tab", { name: /টিউটর লাইভ চ্যাট/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /টিউটর বাল্ক নোটিফাই/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /অভিভাবক বাল্ক নোটিফাই/i })).toBeTruthy();

    // Custom preset
    expect(screen.getByText("বিশেষ প্ল্যাটফর্ম ডিসকাউন্ট")).toBeTruthy();
    expect(screen.getByText("/discount")).toBeTruthy();

    // System preset for tutor_chat (e.g. /fee)
    expect(screen.getByText("/fee")).toBeTruthy();
    expect(screen.getByText("প্ল্যাটফর্ম ফি ও পেমেন্ট নিয়ম")).toBeTruthy();
  });

  it("switches category tab and displays category-specific presets", () => {
    render(<AdminSlashPresetsManager />);

    const tutorNotifyTab = screen.getByRole("tab", { name: /টিউটর বাল্ক নোটিফাই/i });
    fireEvent.click(tutorNotifyTab);

    // System preset for tutor_notify
    expect(screen.getByText("/urgent-jobs")).toBeTruthy();
    expect(screen.getByText("নতুন জরুরি টিউশন অ্যালার্ট")).toBeTruthy();
  });

  it("filters presets using search input", () => {
    render(<AdminSlashPresetsManager />);

    const searchInput = screen.getByPlaceholderText(/কমান্ড বা মেসেজ খুঁজুন/i);
    fireEvent.change(searchInput, { target: { value: "discount" } });

    expect(screen.getByText("বিশেষ প্ল্যাটফর্ম ডিসকাউন্ট")).toBeTruthy();
    // System presets not matching "discount" should be filtered out
    expect(screen.queryByText("প্ল্যাটফর্ম ফি ও পেমেন্ট নিয়ম")).toBeNull();
  });

  it("creates a new custom slash command preset via modal", () => {
    render(<AdminSlashPresetsManager />);

    fireEvent.click(screen.getByRole("button", { name: /নতুন কমান্ড \/ প্রিসেট যোগ করুন/i }));

    expect(screen.getByText("নতুন স্ল্যাশ কমান্ড ও প্রিসেট")).toBeTruthy();

    const commandInput = screen.getByPlaceholderText(/discount/i);
    const titleInput = screen.getByPlaceholderText(/যেমন: বিশেষ ছাড় ও অফার/i);
    const bodyInput = screen.getByPlaceholderText(/মেসেজের মূল বক্তব্য লিখুন/i);

    fireEvent.change(commandInput, { target: { value: "interview-call" } });
    fireEvent.change(titleInput, { target: { value: "জরুরি ইন্টারভিউ কল" } });
    fireEvent.change(bodyInput, { target: { value: "কাল সকাল ১১টায় অনলাইনে উপস্থিত থাকুন।" } });

    fireEvent.click(screen.getByRole("button", { name: "সংরক্ষণ করুন" }));

    expect(state.created).toHaveLength(1);
    expect(state.created[0]).toEqual({
      category: "tutor_chat",
      command: "/interview-call",
      title: "জরুরি ইন্টারভিউ কল",
      body: "কাল সকাল ১১টায় অনলাইনে উপস্থিত থাকুন।",
    });
    expect(state.invalidate).toHaveBeenCalled();
  });

  it("edits an existing custom preset", () => {
    render(<AdminSlashPresetsManager />);

    const editBtn = screen.getByRole("button", { name: /Edit বিশেষ প্ল্যাটফর্ম ডিসকাউন্ট/i });
    fireEvent.click(editBtn);

    expect(screen.getByText("স্ল্যাশ কমান্ড ও প্রিসেট সম্পাদনা")).toBeTruthy();

    const titleInput = screen.getByPlaceholderText(/যেমন: বিশেষ ছাড় ও অফার/i);
    fireEvent.change(titleInput, { target: { value: "আপডেটেড প্ল্যাটফর্ম ডিসকাউন্ট" } });

    fireEvent.click(screen.getByRole("button", { name: "আপডেট করুন" }));

    expect(state.updated).toHaveLength(1);
    expect(state.updated[0]).toEqual({
      id: 101,
      category: "tutor_chat",
      command: "/discount",
      title: "আপডেটেড প্ল্যাটফর্ম ডিসকাউন্ট",
      body: "আপনার জন্য এই টিউশনে ২০% প্ল্যাটফর্ম ফি ছাড় দেওয়া হলো।",
    });
  });

  it("deletes a custom preset after confirmation", () => {
    render(<AdminSlashPresetsManager />);

    const deleteBtn = screen.getByRole("button", { name: /Delete বিশেষ প্ল্যাটফর্ম ডিসকাউন্ট/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText("প্রিসেটটি মুছে ফেলতে চান?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "হ্যাঁ, মুছে ফেলুন" }));

    expect(state.deleted).toHaveLength(1);
    expect(state.deleted[0]).toEqual({ id: 101 });
  });

  it("allows customizing a system default preset by clicking customize and copy", () => {
    render(<AdminSlashPresetsManager />);

    const customizeBtns = screen.getAllByRole("button", { name: /কাস্টমাইজ ও কপি/i });
    expect(customizeBtns.length).toBeGreaterThan(0);
    fireEvent.click(customizeBtns[0]);

    // Modal opens with pre-filled content
    expect(screen.getByText("নতুন স্ল্যাশ কমান্ড ও প্রিসেট")).toBeTruthy();
    const titleInput = screen.getByPlaceholderText(/যেমন: বিশেষ ছাড় ও অফার/i) as HTMLInputElement;
    expect(titleInput.value.length).toBeGreaterThan(0);
  });
});
