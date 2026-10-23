import React, { useState } from "react";
import { Check, Edit3, Forward, MoreHorizontal, RotateCcw, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const EDIT_DELETE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function isWithinFiveMinutes(createdAt: string | Date, windowMs: number = EDIT_DELETE_WINDOW_MS): boolean {
  const messageTime = new Date(createdAt).getTime();
  if (isNaN(messageTime)) return false;
  return Date.now() - messageTime <= windowMs;
}

export function getRemainingSeconds(createdAt: string | Date, windowMs: number = EDIT_DELETE_WINDOW_MS): number {
  const messageTime = new Date(createdAt).getTime();
  if (isNaN(messageTime)) return 0;
  const elapsed = Date.now() - messageTime;
  return Math.max(0, Math.floor((windowMs - elapsed) / 1000));
}

export function formatRemainingTime(remainingSeconds: number): string {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export interface ChatMessageActionMenuProps {
  messageId: number;
  createdAt: string | Date;
  body: string;
  isOwn: boolean;
  isDeleted?: boolean;
  onEdit?: (messageId: number, currentBody: string) => void;
  onDelete?: (messageId: number) => void;
  onCopy?: (text: string) => void;
  onForward?: (messageId: number, body: string) => void;
  onReply?: (messageId: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Tactical micro-motion action menu popping up with a soft spring when a bubble is tapped/clicked.
 */
export function ChatMessageActionMenu({
  messageId,
  createdAt,
  body,
  isOwn,
  isDeleted = false,
  onEdit,
  onDelete,
  onCopy,
  onForward,
  onReply,
  isOpen,
  onClose,
}: ChatMessageActionMenuProps) {
  if (!isOpen || isDeleted) return null;

  const canEditOrDelete = isOwn && isWithinFiveMinutes(createdAt);
  const remainingSecs = isOwn ? getRemainingSeconds(createdAt) : 0;

  return (
    <AnimatePresence>
      <div
        key="action-menu-backdrop"
        className="fixed inset-0 z-10 sm:hidden"
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />
      <motion.div
        key="action-menu-panel"
        initial={{ opacity: 0, scale: 0.9, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 4 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        className={`absolute z-20 mt-1 flex flex-wrap items-center gap-1 rounded-xl border border-j-border bg-white p-1.5 shadow-lg backdrop-blur-sm max-w-[calc(100vw-2.5rem)] sm:max-w-none ${
          isOwn ? "right-0" : "left-0"
        }`}
        data-testid="chat-message-action-menu"
        onClick={e => e.stopPropagation()}
      >
        {canEditOrDelete ? (
          <>
            <button
              type="button"
              onClick={() => {
                onEdit?.(messageId, body);
                onClose();
              }}
              title={`এডিট করুন (${formatRemainingTime(remainingSecs)} বাকি)`}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-j-ink hover:bg-j-accent-wash hover:text-j-accent transition-colors"
            >
              <Edit3 size={12} />
              <span>এডিট</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete?.(messageId);
                onClose();
              }}
              title={`সবার জন্য মুছুন (${formatRemainingTime(remainingSecs)} বাকি)`}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} />
              <span>মুছুন</span>
            </button>
          </>
        ) : isOwn ? (
          <span className="px-1.5 py-0.5 text-2xs font-medium text-j-ink-faint">
            ৫ মিনিট অতিক্রান্ত
          </span>
        ) : null}

        {onReply ? (
          <button
            type="button"
            onClick={() => {
              onReply(messageId);
              onClose();
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-j-ink hover:bg-j-surface-sunken transition-colors"
          >
            <RotateCcw size={12} />
            <span>রিপ্লাই</span>
          </button>
        ) : null}

        {onCopy && body ? (
          <button
            type="button"
            onClick={() => {
              onCopy(body);
              onClose();
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-j-ink hover:bg-j-surface-sunken transition-colors"
          >
            <span>কপি</span>
          </button>
        ) : null}

        {onForward && body ? (
          <button
            type="button"
            onClick={() => {
              onForward(messageId, body);
              onClose();
            }}
            aria-label="মেসেজ ফরওয়ার্ড করুন"
            title="মেসেজ ফরওয়ার্ড করুন"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-j-ink hover:bg-j-surface-sunken transition-colors"
          >
            <Forward size={12} />
            <span>ফরওয়ার্ড</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="ml-1 rounded-md p-1 text-j-ink-faint hover:bg-j-surface-sunken hover:text-j-ink"
        >
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Placeholder displayed when a message has been un-sent / deleted for everyone.
 */
export function DeletedMessagePlaceholder({ own }: { own?: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 italic text-2xs select-none ${
        own ? "text-white/70" : "text-j-ink-faint"
      }`}
      data-testid="deleted-message-placeholder"
    >
      <Trash2 size={12} className="opacity-70" />
      <span>[মেসেজটি মুছে ফেলা হয়েছে]</span>
    </div>
  );
}

/**
 * Badge displayed on an edited message timestamp.
 */
export function EditedMessageBadge({ own }: { own?: boolean }) {
  return (
    <span
      className={`ml-1 inline-flex items-center text-2xs font-medium ${
        own ? "text-white/60" : "text-j-ink-faint"
      }`}
      title="এই মেসেজটি ৫ মিনিটের মধ্যে সম্পাদিত হয়েছে"
      data-testid="edited-message-badge"
    >
      (সম্পাদিত)
    </span>
  );
}

/**
 * Inline editor for editing message within the 5-minute time window.
 */
export function InlineMessageEditor({
  initialText,
  onSave,
  onCancel,
}: {
  initialText: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-1 flex flex-col gap-1.5" data-testid="inline-message-editor">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={2}
        aria-label="Edit message"
        className="w-full rounded-lg border border-j-border bg-white px-2.5 py-1.5 text-sm leading-relaxed text-j-ink shadow-xs outline-none focus:border-j-accent focus:ring-1 focus:ring-j-accent"
        autoFocus
      />
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-semibold text-j-ink-soft hover:bg-j-surface-sunken"
        >
          <X size={12} />
          <span>বাতিল</span>
        </button>
        <button
          type="submit"
          disabled={!text.trim() || text.trim() === initialText.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-j-accent px-2.5 py-1 text-2xs font-semibold text-white shadow-xs hover:bg-[#156cb6] disabled:opacity-50"
        >
          <Check size={12} />
          <span>সংরক্ষণ করুন</span>
        </button>
      </div>
    </form>
  );
}
