// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  templates: [
    { id: 1, category: "tutor_notify", title: "Verify documents", body: "Please submit your documents." },
    { id: 2, category: "tutor_notify", title: "Interview schedule", body: "Your demo class is scheduled." },
  ],
  created: [] as unknown[],
  deleted: [] as unknown[],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        listMessageTemplates: { invalidate: vi.fn() },
        listChatQuickReplies: { invalidate: vi.fn() },
      },
    }),
    admin: {
      listMessageTemplates: {
        useQuery: (_input: unknown, options?: { enabled?: boolean }) => ({
          data: options?.enabled === false ? undefined : { items: state.templates },
          isLoading: false,
        }),
      },
      listChatQuickReplies: {
        useQuery: (_input: unknown, options?: { enabled?: boolean }) => ({
          data: options?.enabled === false ? undefined : { items: [] },
          isLoading: false,
        }),
      },
      createMessageTemplate: {
        useMutation: (options?: { onSuccess?: () => void }) => ({
          mutate: (input: unknown) => {
            state.created.push(input);
            options?.onSuccess?.();
          },
          isPending: false,
        }),
      },
      deleteMessageTemplate: {
        useMutation: (options?: { onSuccess?: () => void }) => ({
          mutate: (input: unknown) => {
            state.deleted.push(input);
            options?.onSuccess?.();
          },
          isPending: false,
        }),
      },
      deleteChatQuickReply: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { AdminMessageTemplatesMenu } from "./AdminMessageTemplatesMenu";

afterEach(() => {
  cleanup();
  state.created = [];
  state.deleted = [];
});

describe("AdminMessageTemplatesMenu", () => {
  it("renders trigger button and opens popover listing saved templates", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <AdminMessageTemplatesMenu
        category="tutor_notify"
        onSelect={onSelect}
        variant="button"
        buttonLabel="Templates"
      />
    );

    const trigger = screen.getByRole("button", { name: /Templates/i });
    expect(trigger).toBeTruthy();

    await user.click(trigger);

    expect(screen.getByText("Saved Templates")).toBeTruthy();
    expect(screen.getByText("Verify documents")).toBeTruthy();
    expect(screen.getByText("Interview schedule")).toBeTruthy();
  });

  it("selects a template and calls onSelect with title and body", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <AdminMessageTemplatesMenu
        category="tutor_notify"
        onSelect={onSelect}
        variant="button"
      />
    );

    await user.click(screen.getByRole("button", { name: /Templates/i }));
    await user.click(screen.getByText("Verify documents"));

    expect(onSelect).toHaveBeenCalledWith({
      title: "Verify documents",
      body: "Please submit your documents.",
    });
  });

  it("allows saving current draft as a reusable template", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <AdminMessageTemplatesMenu
        category="tutor_notify"
        onSelect={onSelect}
        variant="button"
        currentDraft={{ title: "Important Update", body: "Tuition timings have changed." }}
      />
    );

    await user.click(screen.getByRole("button", { name: /Templates/i }));

    const saveDraftBtn = screen.getByRole("button", { name: /Save Current Message as Template/i });
    expect(saveDraftBtn).toBeTruthy();

    await user.click(saveDraftBtn);

    const titleInput = screen.getByPlaceholderText("Template Title");
    expect((titleInput as HTMLInputElement).value).toBe("Important Update");

    const saveTemplateBtn = screen.getByRole("button", { name: "Save Template" });
    await user.click(saveTemplateBtn);

    expect(state.created).toHaveLength(1);
    expect(state.created[0]).toEqual({
      category: "tutor_notify",
      title: "Important Update",
      body: "Tuition timings have changed.",
    });
  });

  it("deletes a template when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <AdminMessageTemplatesMenu
        category="tutor_notify"
        onSelect={onSelect}
        variant="button"
      />
    );

    await user.click(screen.getByRole("button", { name: /Templates/i }));

    const deleteBtn = screen.getByRole("button", { name: "Delete template Verify documents" });
    await user.click(deleteBtn);

    expect(state.deleted).toEqual([{ id: 1 }]);
  });

  it("renders built-in system presets with command badge and inserts them when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <AdminMessageTemplatesMenu
        category="tutor_notify"
        onSelect={onSelect}
        variant="button"
      />
    );

    await user.click(screen.getByRole("button", { name: /Templates/i }));

    expect(screen.getByText("নতুন জরুরি টিউশন অ্যালার্ট")).toBeTruthy();
    expect(screen.getByText("/urgent-jobs")).toBeTruthy();

    await user.click(screen.getByText("নতুন জরুরি টিউশন অ্যালার্ট"));
    expect(onSelect).toHaveBeenCalledWith({
      title: "নতুন জরুরি টিউশন অ্যালার্ট",
      body: expect.stringContaining("টিউশন পোস্ট"),
    });
  });
});
