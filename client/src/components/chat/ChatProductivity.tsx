import React, { useState } from "react";
import { Check, Copy, CornerUpLeft, ExternalLink, Phone, ShieldCheck, User, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

export interface QuotedMessage {
  id: number;
  body: string;
  senderRole: "admin" | "tutor";
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/** Formats a message with optional quote card, URL auto-linking, and search keyword highlighting */
export function ChatMessageBody({ text, query }: { text: string; query?: string }) {
  // Check for structured quote prefix: `> [Replying to ...]: "..."\n\n[actual message]`
  const quoteMatch = text.match(/^> \[(Replying to [^\]]+)\]:\s*"([^"]*)"\n\n([\s\S]*)$/);

  let quoteHeader: string | null = null;
  let quoteSnippet: string | null = null;
  let bodyText = text;

  if (quoteMatch) {
    quoteHeader = quoteMatch[1];
    quoteSnippet = quoteMatch[2];
    bodyText = quoteMatch[3];
  }

  const renderHighlightedContent = (content: string) => {
    // If no search query, fall back to URL auto-link
    const trimmedQuery = query?.trim();
    if (!trimmedQuery) {
      const parts = content.split(URL_REGEX);
      return parts.map((part, index) => {
        if (part.match(URL_REGEX)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 underline font-semibold decoration-current/40 hover:decoration-current hover:opacity-90 break-all"
            >
              <span>{part}</span>
              <ExternalLink className="inline size-3 shrink-0 ml-0.5" aria-hidden="true" />
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      });
    }

    // Split text by both URL and query pattern
    try {
      const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(`(${escapedQuery})`, "gi");

      const urlParts = content.split(URL_REGEX);
      return urlParts.map((urlPart, uIndex) => {
        if (urlPart.match(URL_REGEX)) {
          return (
            <a
              key={`url-${uIndex}`}
              href={urlPart}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 underline font-semibold decoration-current/40 hover:decoration-current hover:opacity-90 break-all"
            >
              <span>{urlPart}</span>
              <ExternalLink className="inline size-3 shrink-0 ml-0.5" aria-hidden="true" />
            </a>
          );
        }

        // Highlight matched keyword in non-url parts
        const searchParts = urlPart.split(searchRegex);
        return (
          <span key={`text-${uIndex}`}>
            {searchParts.map((subPart, sIndex) => {
              if (subPart.toLowerCase() === trimmedQuery.toLowerCase()) {
                return (
                  <mark
                    key={`mark-${sIndex}`}
                    className="bg-amber-300 text-amber-950 font-bold px-0.5 rounded-xs selection:bg-amber-400"
                  >
                    {subPart}
                  </mark>
                );
              }
              return <span key={`sub-${sIndex}`}>{subPart}</span>;
            })}
          </span>
        );
      });
    } catch {
      return <span>{content}</span>;
    }
  };

  return (
    <div className="leading-6">
      {quoteHeader && quoteSnippet ? (
        <div className="mb-2 rounded-lg border-l-3 border-j-accent bg-black/10 px-2.5 py-1.5 text-2xs text-current/90 backdrop-blur-xs">
          <p className="font-bold uppercase tracking-wider text-2xs text-current/90">{quoteHeader}</p>
          <p className="line-clamp-2 italic text-current/80">{quoteSnippet}</p>
        </div>
      ) : null}
      <span className="whitespace-pre-wrap">{renderHighlightedContent(bodyText)}</span>
    </div>
  );
}

/** Previews the message being replied to directly above the composer input */
export function ReplyPreviewBar({
  replyingTo,
  onCancel,
  currentRole,
}: {
  replyingTo: QuotedMessage | null;
  onCancel: () => void;
  currentRole: "admin" | "tutor";
}) {
  if (!replyingTo) return null;

  const isOwn = replyingTo.senderRole === currentRole;
  const senderLabel = isOwn ? "yourself" : replyingTo.senderRole === "admin" ? "Admin" : "Tutor";

  return (
    <div className="flex items-center justify-between border-b border-[#dce9f1] bg-[#f0f6fa] px-3 py-1.5 text-xs text-j-ink-soft animate-in slide-in-from-bottom-1 duration-150">
      <div className="flex min-w-0 items-center gap-2 border-l-3 border-j-accent pl-2">
        <CornerUpLeft className="size-3.5 text-j-accent shrink-0" />
        <div className="min-w-0">
          <p className="text-3xs font-bold uppercase tracking-wider text-j-accent">
            Replying to {senderLabel}
          </p>
          <p className="truncate text-2xs text-j-ink">{replyingTo.body || "Attachment"}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel reply"
        className="rounded-full p-1 text-j-ink-faint hover:bg-j-surface-sunken hover:text-j-ink transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export const CHAT_EMOJIS = ["👍", "❤️", "👏", "🙏", "💡"] as const;

/** Multi-emoji reaction picker with 5 popular reactions */
export function EmojiReactionPicker({
  reacted,
  currentEmoji,
  onToggle,
  onSelectEmoji,
}: {
  reacted: boolean;
  currentEmoji?: string;
  onToggle: () => void;
  onSelectEmoji: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const displayEmoji = currentEmoji || "👍";

  return (
    <div className="relative inline-flex items-center">
      {open ? (
        <div
          role="menu"
          aria-label="Choose reaction"
          className="absolute -top-10 left-0 z-20 flex items-center gap-1 rounded-full border border-j-border bg-white p-1 shadow-md animate-in fade-in zoom-in-95 duration-150"
          onMouseLeave={() => setOpen(false)}
        >
          {CHAT_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelectEmoji(emoji);
                setOpen(false);
              }}
              title={`React with ${emoji}`}
              aria-label={`React with ${emoji}`}
              className="grid size-7 place-items-center rounded-full text-sm transition-transform hover:scale-125 hover:bg-j-surface-muted active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggle}
          onContextMenu={e => {
            e.preventDefault();
            setOpen(true);
          }}
          aria-pressed={reacted}
          aria-label={reacted ? `Remove your ${displayEmoji}` : `React with ${displayEmoji}`}
          className={`flex min-h-[26px] items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold transition-colors ${
            reacted
              ? "bg-j-accent/10 text-j-accent"
              : "text-j-ink-faint hover:bg-j-surface-sunken hover:text-j-ink-soft"
          }`}
        >
          <span>{displayEmoji}</span>
        </button>

        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          title="More reactions"
          aria-label="More reactions"
          className="grid size-5 place-items-center rounded-full text-3xs text-j-ink-faint hover:bg-j-surface-sunken hover:text-j-ink"
        >
          +
        </button>
      </div>
    </div>
  );
}

export interface TutorPeekData {
  tutorId: string;
  tutorNumber: number | null;
  tutorName: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  instituteName?: string | null;
  departmentName?: string | null;
}

/** Slide-over drawer for Admins to view the Tutor's quick credentials without leaving chat */
export function TutorPeekProfileDrawer({
  tutor,
  onClose,
}: {
  tutor: TutorPeekData | null;
  onClose: () => void;
}) {
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!tutor) return null;

  const handleCopyPhone = () => {
    if (!tutor.phone) return;
    navigator.clipboard.writeText(tutor.phone);
    setCopiedPhone(true);
    toast.success("Phone number copied to clipboard");
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutor Quick Profile"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <header className="flex items-center justify-between border-b border-[#dce9f1] px-4 py-3">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4 text-j-accent" />
            <h3 className="text-sm font-bold text-j-ink">Tutor Quick Profile</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile drawer"
            className="grid size-7 place-items-center rounded-lg text-j-ink-faint hover:bg-j-surface-sunken hover:text-j-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Top Identity Card */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-j-border bg-gradient-to-b from-sky-50/50 to-white">
            <span className="grid size-18 place-items-center overflow-hidden rounded-full border-2 border-sky-200 bg-white shadow-xs mb-3">
              {tutor.profilePhotoUrl ? (
                <img src={tutor.profilePhotoUrl} alt={tutor.tutorName} className="size-full object-cover" />
              ) : (
                <User size={32} className="text-j-ink-faint" />
              )}
            </span>
            <p className="text-2xs font-bold uppercase tracking-wider text-j-accent">
              Tutor ID {tutor.tutorNumber ?? "—"}
            </p>
            <h4 className="text-base font-bold text-j-ink">{tutor.tutorName}</h4>
            {tutor.instituteName ? (
              <p className="text-xs font-semibold text-j-ink-soft mt-0.5">{tutor.instituteName}</p>
            ) : null}
            {tutor.departmentName ? (
              <p className="text-2xs text-j-ink-faint">{tutor.departmentName}</p>
            ) : null}
          </div>

          {/* Quick Contact & Action strip */}
          {tutor.phone ? (
            <div className="flex items-center justify-between rounded-xl border border-j-border p-3 bg-white shadow-2xs">
              <div>
                <p className="text-3xs font-bold uppercase text-j-ink-faint">Contact Phone</p>
                <p className="text-sm font-bold text-j-ink">{tutor.phone}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  title="Copy phone number"
                  aria-label="Copy phone number"
                  className="grid size-8 place-items-center rounded-lg border border-j-border text-j-ink-soft hover:bg-j-surface-sunken transition-colors"
                >
                  {copiedPhone ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </button>
                <a
                  href={`tel:${tutor.phone}`}
                  title="Call tutor"
                  aria-label="Call tutor"
                  className="grid size-8 place-items-center rounded-lg bg-j-accent text-white hover:bg-j-accent/90 transition-colors shadow-xs"
                >
                  <Phone className="size-3.5" />
                </a>
              </div>
            </div>
          ) : null}

          {/* Trust and Organization membership */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-2xs text-sky-950 flex items-start gap-2.5">
            <ShieldCheck className="size-4 shrink-0 text-sky-700 mt-0.5" />
            <div>
              <p className="font-bold">Verified Tuition Provider Platform</p>
              <p className="text-sky-900 mt-0.5">
                Official Bangladesh Tuition Provider Association (BTPA) member: <strong>Member: BTPA - 077</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <footer className="border-t border-[#dce9f1] p-3 bg-j-surface-muted flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-j-border bg-white px-3 py-1.5 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
