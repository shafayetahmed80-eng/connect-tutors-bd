import React, { useEffect, useRef, useState, useCallback } from "react";
import { CornerUpRight, Copy, Check, X, Search, RotateCcw, FileText, ArrowUp, Keyboard } from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/*                                   TASK 20                                  */
/*                   LOCAL DRAFT PERSISTENCE PER THREAD                       */
/* -------------------------------------------------------------------------- */

const DRAFT_PREFIX = "connect_tutors_chat_draft_";

/**
 * Automatically persists unsent drafts to localStorage per thread.
 * Restores draft on mount or when switching between different threads,
 * and purges draft when message is sent.
 */
export function useChatDraftPersistence({
  threadKey,
  body,
  setBody,
}: {
  threadKey: string;
  body: string;
  setBody: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const isRestoredRef = useRef(false);

  // Restore on thread switch or mount
  useEffect(() => {
    isRestoredRef.current = false;
    try {
      const saved = localStorage.getItem(`${DRAFT_PREFIX}${threadKey}`);
      if (saved && saved.trim()) {
        setBody(saved);
        setHasRestoredDraft(true);
        isRestoredRef.current = true;
      } else {
        setHasRestoredDraft(false);
      }
    } catch {
      // localStorage may fail in restricted sandboxes
    }
  }, [threadKey, setBody]);

  // Persist current draft
  useEffect(() => {
    if (!threadKey) return;
    try {
      if (body.trim()) {
        localStorage.setItem(`${DRAFT_PREFIX}${threadKey}`, body);
        isRestoredRef.current = false;
      } else if (!isRestoredRef.current) {
        localStorage.removeItem(`${DRAFT_PREFIX}${threadKey}`);
        setHasRestoredDraft(false);
      }
    } catch {}
  }, [threadKey, body]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${threadKey}`);
    } catch {}
    setBody("");
    setHasRestoredDraft(false);
  }, [threadKey, setBody]);

  const purgeSavedDraft = useCallback(() => {
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${threadKey}`);
    } catch {}
    setHasRestoredDraft(false);
  }, [threadKey]);

  return {
    hasRestoredDraft,
    clearDraft,
    purgeSavedDraft,
  };
}

/**
 * Subtle banner showing that an unsent draft was restored.
 */
export function ChatDraftRestoredIndicator({
  onClear,
}: {
  onClear: () => void;
}) {
  return (
    <div
      data-testid="chat-draft-restored-indicator"
      className="flex items-center justify-between border-b border-sky-100 bg-sky-50/70 px-3 py-1 text-2xs text-sky-800"
    >
      <span className="flex items-center gap-1.5 font-medium">
        <FileText className="size-3 text-sky-600" />
        অসম্পূর্ণ খসড়া (Draft) রিস্টোর করা হয়েছে
      </span>
      <button
        type="button"
        onClick={onClear}
        className="font-bold text-sky-700 hover:text-sky-900 underline text-3xs"
      >
        খসড়া মুছুন
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   TASK 13                                  */
/*               KEYBOARD NAVIGATION & PRODUCTIVITY SHORTCUTS                 */
/* -------------------------------------------------------------------------- */

export type ChatKeyboardShortcutsOptions = {
  body: string;
  setBody: React.Dispatch<React.SetStateAction<string>>;
  lastOwnMessageBody?: string | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  onCancelActionMenu?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  onSubmit?: () => void;
};

/**
 * Manages chat keyboard shortcuts:
 * - Esc: Cancels active reply, editing, or menus.
 * - Ctrl+F / Cmd+F: Focuses search input.
 * - ArrowUp: Loads last own sent message when textarea is empty.
 */
export function useChatKeyboardShortcuts({
  body,
  setBody,
  lastOwnMessageBody,
  onCancelReply,
  onCancelEdit,
  onCancelActionMenu,
  searchInputRef,
  onSubmit,
}: ChatKeyboardShortcutsOptions) {
  // Global shortcuts (Esc, Ctrl+F)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancelReply?.();
        onCancelEdit?.();
        onCancelActionMenu?.();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        if (searchInputRef?.current) {
          e.preventDefault();
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onCancelReply, onCancelEdit, onCancelActionMenu, searchInputRef]);

  // Textarea specific keydown handler
  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ArrowUp on empty composer retrieves last sent message
    if (e.key === "ArrowUp" && !body.trim() && lastOwnMessageBody) {
      e.preventDefault();
      setBody(lastOwnMessageBody);
      toast.info("পূর্ববর্তী মেসেজ লোড হয়েছে");
      return;
    }

    // Enter without shift submits
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return {
    handleComposerKeyDown,
  };
}

/**
 * Subtle pill showing available keyboard shortcuts.
 */
export function ChatShortcutsHelpPill() {
  return (
    <div
      data-testid="chat-shortcuts-help-pill"
      className="hidden lg:flex items-center gap-2 text-3xs font-semibold text-j-ink-faint select-none"
    >
      <span className="flex items-center gap-0.5">
        <kbd className="rounded bg-slate-100 border border-slate-300 px-1 py-0.2 text-3xs font-mono">Esc</kbd>
        <span>বাতিল</span>
      </span>
      <span>·</span>
      <span className="flex items-center gap-0.5">
        <kbd className="rounded bg-slate-100 border border-slate-300 px-1 py-0.2 text-3xs font-mono">↑</kbd>
        <span>পূর্বের মেসেজ</span>
      </span>
      <span>·</span>
      <span className="flex items-center gap-0.5">
        <kbd className="rounded bg-slate-100 border border-slate-300 px-1 py-0.2 text-3xs font-mono">Ctrl+F</kbd>
        <span>সার্চ</span>
      </span>
      <span>·</span>
      <span className="flex items-center gap-0.5">
        <kbd className="rounded bg-slate-100 border border-slate-300 px-1 py-0.2 text-3xs font-mono">/</kbd>
        <span>কুইক রিপ্লাই</span>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   TASK 16                                  */
/*            1-CLICK QUICK MESSAGE COPY & FORWARD ACTION MODAL               */
/* -------------------------------------------------------------------------- */

export function copyMessageToClipboard(text: string) {
  if (!text) return;
  void navigator.clipboard?.writeText(text);
  toast.success("মেসেজটি ক্লিপবোর্ডে কপি হয়েছে");
}

export type ChatForwardModalProps = {
  messageBody: string;
  onForwardToComposer: (forwardedText: string) => void;
  onClose: () => void;
  adminThreads?: Array<{ tutorId: string; tutorName: string; tutorNumber: number | null }>;
  onForwardToThread?: (targetTutorId: string, text: string) => void;
};

/**
 * Modal to forward a message into current composer or to another conversation thread.
 */
export function ChatForwardModal({
  messageBody,
  onForwardToComposer,
  onClose,
  adminThreads = [],
  onForwardToThread,
}: ChatForwardModalProps) {
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const formattedSnippet = `[ফরওয়ার্ডকৃত মেসেজ]: "${messageBody}"`;

  const handleCopy = () => {
    copyMessageToClipboard(messageBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleForwardCurrent = () => {
    onForwardToComposer(formattedSnippet);
    onClose();
    toast.success("মেসেজে যুক্ত করা হয়েছে");
  };

  const filteredThreads = adminThreads.filter(t =>
    t.tutorName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (t.tutorNumber && String(t.tutorNumber).includes(searchFilter))
  );

  return (
    <Modal size="dialog" onClose={onClose}>
      <ModalHeader
        title="মেসেজ ফরওয়ার্ড করুন"
        meta="মেসেজটি বর্তমান চ্যাটে অথবা অন্য টিউটর থ্রেডে শেয়ার করুন"
      />
      <ModalBody className="space-y-4">
        {/* Message preview */}
        <div className="rounded-xl border border-j-border bg-slate-50 p-3">
          <p className="text-2xs font-bold text-j-ink-faint mb-1">ফরওয়ার্ডকৃত কন্টেন্ট:</p>
          <p className="text-xs text-j-ink line-clamp-4 whitespace-pre-wrap">{messageBody}</p>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md border border-j-border bg-white px-2 py-0.5 text-2xs font-bold text-j-ink-soft hover:bg-slate-100"
            >
              {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              <span>{copied ? "কপি হয়েছে" : "কপি করুন"}</span>
            </button>
          </div>
        </div>

        {/* Action 1: Load into composer */}
        <div>
          <Button
            type="button"
            onClick={handleForwardCurrent}
            className="w-full flex items-center justify-center gap-1.5 h-control rounded-xl text-xs font-bold"
          >
            <CornerUpRight className="size-3.5" />
            <span>বর্তমান মেসেজ বক্সে যুক্ত করুন</span>
          </Button>
        </div>

        {/* Action 2: Forward to another thread (Admin only) */}
        {adminThreads.length > 0 && onForwardToThread ? (
          <div className="border-t border-j-border pt-3">
            <p className="text-2xs font-bold text-j-ink mb-2">অন্য টিউটর চ্যাটে ফরওয়ার্ড করুন:</p>
            <input
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="টিউটর নাম বা আইডি দিয়ে খুঁজুন…"
              className="h-control w-full rounded-xl border border-j-border px-3 text-xs outline-none focus:border-j-accent mb-2"
            />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredThreads.slice(0, 8).map(thread => (
                <button
                  key={thread.tutorId}
                  type="button"
                  onClick={() => {
                    onForwardToThread(thread.tutorId, formattedSnippet);
                    onClose();
                    toast.success(`${thread.tutorName}-এর চ্যাটে ফরওয়ার্ড করা হয়েছে`);
                  }}
                  className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-slate-100 text-xs font-semibold text-j-ink transition-colors"
                >
                  <span className="truncate">{thread.tutorName}</span>
                  <span className="text-2xs text-j-ink-faint shrink-0">ID {thread.tutorNumber ?? "—"}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="h-control rounded-xl border border-j-border px-4 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken"
        >
          বন্ধ করুন
        </button>
      </ModalFooter>
    </Modal>
  );
}
