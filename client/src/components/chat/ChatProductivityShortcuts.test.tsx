// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, renderHook, act } from "@testing-library/react";
import React, { useRef } from "react";
import {
  useChatDraftPersistence,
  ChatDraftRestoredIndicator,
  useChatKeyboardShortcuts,
  ChatShortcutsHelpPill,
  copyMessageToClipboard,
  ChatForwardModal,
} from "./ChatProductivityShortcuts";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("ChatProductivityShortcuts", () => {
  describe("Task 20: Draft Persistence", () => {
    it("restores saved draft from localStorage on mount", () => {
      window.localStorage.setItem("connect_tutors_chat_draft_tutor_1", "Saved draft content");

      const { result } = renderHook(() => {
        const [body, setBody] = React.useState("");
        const draft = useChatDraftPersistence({
          threadKey: "tutor_1",
          body,
          setBody,
        });
        return { body, setBody, ...draft };
      });

      expect(result.current.body).toBe("Saved draft content");
      expect(result.current.hasRestoredDraft).toBe(true);
    });

    it("persists draft to localStorage as user types and clears when emptied", () => {
      const { result } = renderHook(() => {
        const [body, setBody] = React.useState("");
        const draft = useChatDraftPersistence({
          threadKey: "tutor_2",
          body,
          setBody,
        });
        return { body, setBody, ...draft };
      });

      act(() => {
        result.current.setBody("Typing something...");
      });

      expect(window.localStorage.getItem("connect_tutors_chat_draft_tutor_2")).toBe("Typing something...");

      // Update to empty
      act(() => {
        result.current.setBody("");
      });
      expect(window.localStorage.getItem("connect_tutors_chat_draft_tutor_2")).toBeNull();

      // Clear draft explicitly
      act(() => {
        result.current.setBody("Another message");
      });
      expect(window.localStorage.getItem("connect_tutors_chat_draft_tutor_2")).toBe("Another message");

      act(() => {
        result.current.clearDraft();
      });
      expect(result.current.body).toBe("");
      expect(window.localStorage.getItem("connect_tutors_chat_draft_tutor_2")).toBeNull();
    });

    it("renders ChatDraftRestoredIndicator and handles clear button", () => {
      const onClear = vi.fn();
      render(<ChatDraftRestoredIndicator onClear={onClear} />);

      expect(screen.getByText(/অসম্পূর্ণ খসড়া \(Draft\) রিস্টোর করা হয়েছে/)).toBeTruthy();
      const clearBtn = screen.getByRole("button", { name: "খসড়া মুছুন" });
      fireEvent.click(clearBtn);

      expect(onClear).toHaveBeenCalledOnce();
    });
  });

  describe("Task 13: Keyboard Navigation & Shortcuts", () => {
    it("handles Esc to cancel reply, edit, and action menus", () => {
      const onCancelReply = vi.fn();
      const onCancelEdit = vi.fn();
      const onCancelActionMenu = vi.fn();

      renderHook(() =>
        useChatKeyboardShortcuts({
          body: "",
          setBody: vi.fn(),
          onCancelReply,
          onCancelEdit,
          onCancelActionMenu,
        })
      );

      fireEvent.keyDown(window, { key: "Escape" });

      expect(onCancelReply).toHaveBeenCalledOnce();
      expect(onCancelEdit).toHaveBeenCalledOnce();
      expect(onCancelActionMenu).toHaveBeenCalledOnce();
    });

    it("focuses search input when Ctrl+F or Cmd+F is pressed", () => {
      const searchInput = document.createElement("input");
      document.body.appendChild(searchInput);
      const searchInputRef = { current: searchInput };
      const focusSpy = vi.spyOn(searchInput, "focus");

      renderHook(() =>
        useChatKeyboardShortcuts({
          body: "",
          setBody: vi.fn(),
          searchInputRef,
        })
      );

      fireEvent.keyDown(window, { key: "f", ctrlKey: true });

      expect(focusSpy).toHaveBeenCalledOnce();
    });

    it("loads last own message on ArrowUp when composer is empty", () => {
      const setBody = vi.fn();
      const { result } = renderHook(() =>
        useChatKeyboardShortcuts({
          body: "",
          setBody,
          lastOwnMessageBody: "My previous message",
        })
      );

      const dummyEvent = {
        key: "ArrowUp",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      result.current.handleComposerKeyDown(dummyEvent);

      expect(dummyEvent.preventDefault).toHaveBeenCalled();
      expect(setBody).toHaveBeenCalledWith("My previous message");
    });

    it("renders ChatShortcutsHelpPill with shortcut hints", () => {
      render(<ChatShortcutsHelpPill />);
      expect(screen.getByText("Esc")).toBeTruthy();
      expect(screen.getByText("↑")).toBeTruthy();
      expect(screen.getByText("Ctrl+F")).toBeTruthy();
    });
  });

  describe("Task 16: Quick Message Copy & Forward", () => {
    it("copies text to clipboard via copyMessageToClipboard", () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText },
      });

      copyMessageToClipboard("Hello connect tutors");
      expect(writeText).toHaveBeenCalledWith("Hello connect tutors");
    });

    it("renders ChatForwardModal and forwards to current composer", () => {
      const onForwardToComposer = vi.fn();
      const onClose = vi.fn();

      render(
        <ChatForwardModal
          messageBody="Important info from tutor"
          onForwardToComposer={onForwardToComposer}
          onClose={onClose}
        />
      );

      expect(screen.getByText(/Important info from tutor/)).toBeTruthy();

      const forwardBtn = screen.getByRole("button", { name: /বর্তমান মেসেজ বক্সে যুক্ত করুন/ });
      fireEvent.click(forwardBtn);

      expect(onForwardToComposer).toHaveBeenCalledWith('[ফরওয়ার্ডকৃত মেসেজ]: "Important info from tutor"');
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("renders ChatForwardModal with admin thread target options and forwards to selected thread", () => {
      const onForwardToComposer = vi.fn();
      const onForwardToThread = vi.fn();
      const onClose = vi.fn();

      const adminThreads = [
        { tutorId: "t101", tutorName: "Rahim Uddin", tutorNumber: 101 },
      ];

      render(
        <ChatForwardModal
          messageBody="Please check this"
          onForwardToComposer={onForwardToComposer}
          onForwardToThread={onForwardToThread}
          onClose={onClose}
          adminThreads={adminThreads}
        />
      );

      expect(screen.getByText("Rahim Uddin")).toBeTruthy();

      const threadBtn = screen.getByRole("button", { name: /Rahim Uddin/ });
      fireEvent.click(threadBtn);

      expect(onForwardToThread).toHaveBeenCalledWith("t101", '[ফরওয়ার্ডকৃত মেসেজ]: "Please check this"');
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
