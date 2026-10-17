import { BrandMark, brandWordmark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTutorChatSocket, useOnlineStatus, type ChatConnectionStatus } from "@/hooks/useChatSocket";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { compressImage } from "@/lib/compressImage";
import { useSiteContact } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";
import { getCurrentTutorPortalToken } from "@/lib/tutorPortalSession";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import { ChatAutoLink, ChatDateDivider, ImageLightboxModal, isDifferentDay } from "@/components/chat/ChatVisuals";
import { ChatMessageBody, EmojiReactionPicker, ReplyPreviewBar, type QuotedMessage } from "@/components/chat/ChatProductivity";
import { ChatAnimatedBubble, ChatSendButton, ChatTypingIndicator, VoiceRecordingBar } from "@/components/chat/ChatMotion";
import SearchInput from "@/components/SearchInput";
import { Check, Clock, CornerUpLeft, Loader2, Maximize2, Mic, Paperclip, Phone, RotateCcw, Send, ShieldCheck, Square, ThumbsUp, WifiOff, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const CHAT_MESSAGE_MAX = 2000;
// A slow fallback only - the WebSocket carries the real "something arrived" signal.
const CHAT_POLL_MS = 20000;
const TYPING_PING_MS = 2000;
const TYPING_EXPIRES_MS = 3000;
const PAGE_SIZE = 30;

type ChatMessage = { id: number; senderRole: "tutor" | "admin"; body: string; attachmentUrl: string | null; attachmentContentType: string | null; tutorReacted: boolean; adminReacted: boolean; createdAt: string | Date };

type OutboxMessage = {
  tempId: string;
  body: string;
  status: "sending" | "failed";
  createdAt: number;
};

function formatChatTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AttachmentView({ url, contentType, onImageClick }: { url: string; contentType: string | null; onImageClick?: (url: string) => void }) {
  if (contentType?.startsWith("image/")) {
    return (
      <button
        type="button"
        onClick={() => onImageClick?.(url)}
        className="group relative mt-1.5 block max-w-full overflow-hidden rounded-lg cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-white/50"
        title="Click to view full image"
        aria-label="View attachment image in full screen"
      >
        <img src={url} alt="Attachment" className="max-h-60 w-full object-cover transition-transform duration-200 group-hover:scale-102" />
        <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-3xs font-semibold text-white backdrop-blur-xs opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 size={10} /> Full View
        </span>
      </button>
    );
  }
  if (contentType?.startsWith("audio/")) {
    return <audio controls src={url} className="mt-1.5 h-9 w-full max-w-[220px]" />;
  }
  return <a href={url} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-current/20 px-2.5 py-1.5 text-xs font-bold underline"><Paperclip size={13} /> Attachment</a>;
}

/**
 * The Tutor's one support thread with the site. Any Admin may reply, so the
 * Tutor only ever sees the sender as "Admin" - never a specific person - the
 * same "any Admin" shape as a bulk notice.
 */
export function TutorAdminChatPanel() {
  const utils = trpc.useUtils();
  const threadQuery = trpc.tutorAdminChat.thread.useQuery(undefined, { refetchInterval: CHAT_POLL_MS });
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [adminTypingUntil, setAdminTypingUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [outbox, setOutbox] = useState<OutboxMessage[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>("connecting");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<QuotedMessage | null>(null);
  const [emojisByMessage, setEmojisByMessage] = useState<Record<number, string>>({});
  const isOnline = useOnlineStatus();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasMarkedRead = useRef(false);
  const lastTypingPingAt = useRef(0);

  const send = trpc.tutorAdminChat.send.useMutation({
    onSuccess: async () => { setBody(""); await utils.tutorAdminChat.thread.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const markRead = trpc.tutorAdminChat.markRead.useMutation({ onSuccess: () => utils.tutorAdminChat.unreadCount.invalidate() });
  const react = trpc.tutorAdminChat.react.useMutation({ onSuccess: () => utils.tutorAdminChat.thread.invalidate() });
  const contact = useSiteContact();
  const [isCalling, setIsCalling] = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const portalToken = getCurrentTutorPortalToken();
  const sendFrame = useTutorChatSocket(
    portalToken,
    frame => {
      if (frame.type === "message") void utils.tutorAdminChat.thread.invalidate();
      else if (frame.type === "typing") setAdminTypingUntil(Date.now() + TYPING_EXPIRES_MS);
    },
    setConnectionStatus
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const allMessages = (threadQuery.data?.messages ?? []) as ChatMessage[];
  const messages = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return trimmed ? allMessages.filter(message => message.body.toLowerCase().includes(trimmed)) : allMessages;
  }, [allMessages, query]);

  const visibleMessages = useMemo(() => {
    if (query.trim()) return messages;
    return messages.slice(-visibleCount);
  }, [messages, visibleCount, query]);

  const eligible = threadQuery.data?.eligible ?? false;
  const adminLastReadAt = threadQuery.data?.adminLastReadAt ? new Date(threadQuery.data.adminLastReadAt).getTime() : null;
  const lastOwnMessageId = [...allMessages].reverse().find(message => message.senderRole === "tutor")?.id;
  const adminIsTyping = adminTypingUntil > now;

  useEffect(() => {
    if (hasMarkedRead.current || threadQuery.isLoading) return;
    hasMarkedRead.current = true;
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadQuery.isLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length, outbox.length]);

  const pingTyping = () => {
    const nowMs = Date.now();
    if (nowMs - lastTypingPingAt.current < TYPING_PING_MS) return;
    lastTypingPingAt.current = nowMs;
    sendFrame({ type: "typing" });
  };

  const submitMessage = (retryId?: string, retryBody?: string) => {
    let textToSend = (retryBody ?? body).trim();
    if (!textToSend) return;

    if (!retryId && replyingTo) {
      const quoteSender = replyingTo.senderRole === "admin" ? "Admin" : "Tutor";
      const snippet = (replyingTo.body || "Attachment").slice(0, 100).replace(/\n/g, " ");
      textToSend = `> [Replying to ${quoteSender}]: "${snippet}"\n\n${textToSend}`;
      setReplyingTo(null);
    }

    const tempId = retryId || `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (!retryId) {
      setOutbox(prev => [...prev, { tempId, body: textToSend, status: "sending", createdAt: Date.now() }]);
      setBody("");
    } else {
      setOutbox(prev => prev.map(m => m.tempId === tempId ? { ...m, status: "sending" } : m));
    }

    send.mutate(
      { body: textToSend },
      {
        onSuccess: async () => {
          setOutbox(prev => prev.filter(m => m.tempId !== tempId));
          await utils.tutorAdminChat.thread.invalidate();
        },
        onError: error => {
          setOutbox(prev => prev.map(m => m.tempId === tempId ? { ...m, status: "failed" } : m));
          toast.error(error.message);
        },
      }
    );
  };

  // Auto-retry failed outbox messages when back online
  useEffect(() => {
    if (isOnline && outbox.some(m => m.status === "failed")) {
      outbox.filter(m => m.status === "failed").forEach(m => submitMessage(m.tempId, m.body));
    }
  }, [isOnline]);

  const handleSubmit = (event: React.FormEvent) => { event.preventDefault(); submitMessage(); };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitMessage(); }
  };

  const uploadAndSend = async (file: File) => {
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadFileWithProgress("/api/chat/attachment", formData, setUploadProgress);
      send.mutate({ body: body.trim(), attachmentKey: result.key, attachmentContentType: result.contentType }, {
        onSuccess: async () => { setBody(""); await utils.tutorAdminChat.thread.invalidate(); },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload the attachment.");
    } finally {
      setUploadProgress(null);
    }
  };

  const handleAttach = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const processedFile = await compressImage(file);
    await uploadAndSend(processedFile);
  };

  const voiceRecorder = useVoiceRecorder();
  const handleMic = async () => {
    if (voiceRecorder.recording) {
      const file = await voiceRecorder.stop();
      if (file) await uploadAndSend(file);
      return;
    }
    try {
      await voiceRecorder.start();
    } catch {
      toast.error("Please allow microphone access to record a voice note.");
    }
  };

  return <section className="flex h-[calc(100vh-220px)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-j-border bg-white shadow-[0_10px_26px_-18px_rgba(38,83,117,0.5)]">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dce9f1] px-4 py-3">
      <div className="brand-logo flex items-center gap-2" style={{ fontSize: "17px" }}>
        <BrandMark />
        <span className="brand-wordmark flex"><strong>{brandWordmark.primary}</strong><em>{brandWordmark.secondary}</em></span>
      </div>
      <div className="flex items-center gap-2.5">
        {!isOnline ? (
          <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-3xs font-bold text-amber-800">
            <WifiOff className="size-2.5" /> Offline
          </span>
        ) : connectionStatus === "connected" ? (
          <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-3xs font-bold text-emerald-700" title="Connected in real-time">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        ) : null}
        <a
          href={contact.tel}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            setIsCalling(true);
            if (callTimerRef.current) clearTimeout(callTimerRef.current);
            callTimerRef.current = setTimeout(() => setIsCalling(false), 700);
          }}
          data-calling={isCalling ? "true" : undefined}
          aria-label={`Call ${contact.display}`}
          className="group phone-contact-call flex shrink-0 items-center gap-1.5 text-sm font-bold text-j-accent transition-transform duration-200 active:scale-95"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-j-accent-wash text-j-accent">
            {isCalling ? (
              <Check size={13} className="text-j-ok animate-in zoom-in-75" />
            ) : (
              <Phone size={13} className="phone-contact-icon transition-transform duration-200 group-hover:-rotate-12" />
            )}
          </span>
          {contact.display}
        </a>
      </div>
    </header>

    <div className="border-b border-[#dce9f1] p-3">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search"
        label="Search this conversation"
        className="h-control w-full rounded-lg border border-j-border bg-white text-xs"
      />
    </div>

    <div className="flex items-center gap-2 border-b border-[#e2eaf1] bg-[#f4f8fb] px-3.5 py-2 text-2xs font-medium text-j-ink-muted">
      <ShieldCheck className="size-3.5 shrink-0 text-[#1677c8]" aria-hidden="true" />
      <span>গোপনীয়তা ও সুরক্ষার স্বার্থে চ্যাট হিস্ট্রি এবং শেয়ার করা ফাইলসমূহ ৩০ দিন পর স্বয়ংক্রিয়ভাবে মুছে যায়।</span>
    </div>

    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {threadQuery.isLoading
        ? <p className="pt-8 text-center text-sm font-semibold text-j-ink-muted">Loading your conversation…</p>
        : null}

      {!threadQuery.isLoading && messages.length === 0 && outbox.length === 0
        ? <p className="pt-8 text-center text-sm text-j-ink-muted">{query ? "Nothing matches that search." : "No messages yet. Write to the Admin team below."}</p>
        : null}

      {messages.length > visibleCount && !query.trim() ? (
        <div className="py-1 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="inline-flex items-center gap-1.5 rounded-full border border-j-border bg-white px-3 py-1 text-2xs font-semibold text-j-ink-soft shadow-xs hover:bg-j-surface-sunken transition-colors"
          >
            <Clock size={12} />
            <span>Load earlier messages ({messages.length - visibleCount} more)</span>
          </button>
        </div>
      ) : null}

      {visibleMessages.map((message, index) => {
        const own = message.senderRole === "tutor";
        const seen = own && message.id === lastOwnMessageId && adminLastReadAt !== null && new Date(message.createdAt).getTime() <= adminLastReadAt;
        const prevMessage = index > 0 ? visibleMessages[index - 1] : null;
        const showDateDivider = !prevMessage || isDifferentDay(prevMessage.createdAt, message.createdAt);

        return (
          <React.Fragment key={message.id}>
            {showDateDivider ? <ChatDateDivider date={message.createdAt} /> : null}
            <ChatAnimatedBubble own={own} className={`flex flex-col ${own ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 shadow-xs ${
                own
                  ? "rounded-2xl rounded-tr-xs bg-gradient-to-br from-j-accent to-[#156cb6] text-white"
                  : "rounded-2xl rounded-tl-xs border border-j-border bg-gradient-to-br from-slate-50 to-white text-j-ink"
              }`}>
                {!own ? <p className="mb-0.5 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Admin</p> : null}
                {message.body ? <ChatMessageBody text={message.body} query={query} /> : null}
                {message.attachmentUrl ? (
                  <AttachmentView
                    url={message.attachmentUrl}
                    contentType={message.attachmentContentType}
                    onImageClick={setLightboxUrl}
                  />
                ) : null}
                <p className={`mt-1 text-2xs font-semibold ${own ? "text-white/70" : "text-j-ink-faint"}`}>{formatChatTime(message.createdAt)}</p>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 px-1">
                <EmojiReactionPicker
                  reacted={message.tutorReacted}
                  currentEmoji={emojisByMessage[message.id]}
                  onToggle={() => react.mutate({ messageId: message.id })}
                  onSelectEmoji={emoji => {
                    setEmojisByMessage(prev => ({ ...prev, [message.id]: emoji }));
                    if (!message.tutorReacted) react.mutate({ messageId: message.id });
                  }}
                />
                <button
                  type="button"
                  onClick={() => setReplyingTo({ id: message.id, body: message.body, senderRole: message.senderRole })}
                  title="Reply to this message"
                  aria-label="Reply to this message"
                  className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-semibold text-j-ink-faint hover:bg-j-surface-sunken hover:text-j-ink-soft transition-colors"
                >
                  <CornerUpLeft className="size-3" />
                  <span>Reply</span>
                </button>
                {message.adminReacted ? <span className="text-2xs font-semibold text-j-ink-faint">👍 Admin</span> : null}
                {seen ? <span className="text-2xs font-semibold text-j-ink-faint">Seen</span> : null}
              </div>
            </ChatAnimatedBubble>
          </React.Fragment>
        );
      })}

      {outbox.map(item => (
        <ChatAnimatedBubble key={item.tempId} own={true} className="flex flex-col items-end">
          <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-xs ${item.status === "failed" ? "border border-red-300 bg-red-50 text-red-900" : "bg-gradient-to-br from-j-accent/90 to-[#156cb6]/90 text-white"}`}>
            <p className="whitespace-pre-wrap text-sm leading-6">{item.body}</p>
            <div className="mt-1 flex items-center justify-end gap-1 text-2xs font-medium opacity-80">
              {item.status === "sending" ? (
                <>
                  <Loader2 className="size-2.5 animate-spin" />
                  <span>Sending…</span>
                </>
              ) : (
                <span className="font-bold text-red-700">Failed to send</span>
              )}
            </div>
          </div>
          {item.status === "failed" ? (
            <div className="mt-1 flex items-center gap-2 px-1">
              <button
                type="button"
                onClick={() => submitMessage(item.tempId, item.body)}
                className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-2xs font-bold text-red-700 hover:bg-red-200 transition-colors"
              >
                <RotateCcw className="size-2.5" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => setOutbox(prev => prev.filter(m => m.tempId !== item.tempId))}
                className="text-2xs text-j-ink-faint hover:text-j-ink-soft"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </ChatAnimatedBubble>
      ))}
      {adminIsTyping ? <ChatTypingIndicator senderRole="admin" /> : null}
      <div ref={bottomRef} />
    </div>

    {eligible
      ? <div className="border-t border-[#dce9f1]">
          {uploadProgress !== null
            ? <div className="h-0.5 w-full bg-j-surface-muted">
                <div className="h-full bg-j-accent transition-[width]" style={{ width: `${uploadProgress}%` }} />
              </div>
            : null}
          <ReplyPreviewBar replyingTo={replyingTo} onCancel={() => setReplyingTo(null)} currentRole="tutor" />
          <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={handleAttach} />
            {voiceRecorder.recording ? (
              <VoiceRecordingBar onStop={handleMic} onCancel={voiceRecorder.cancel} />
            ) : (
              <>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadProgress !== null} aria-label="Attach a file" className="grid h-control w-control shrink-0 place-items-center rounded-xl border border-j-border text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-50">
                  <Paperclip className="size-4" />
                </button>
                {voiceRecorder.supported ? (
                  <button
                    type="button"
                    onClick={handleMic}
                    disabled={uploadProgress !== null}
                    aria-label="Record a voice note"
                    className="grid h-control w-control shrink-0 place-items-center rounded-xl border border-j-border text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-50"
                  >
                    <Mic className="size-4" />
                  </button>
                ) : null}
                <Textarea
                  value={body}
                  onChange={event => { setBody(event.target.value); pingTyping(); }}
                  onKeyDown={handleKeyDown}
                  maxLength={CHAT_MESSAGE_MAX}
                  rows={2}
                  placeholder="Write a message…"
                  className="min-h-9 flex-1 resize-none"
                />
                <ChatSendButton ariaLabel="Send message" disabled={!body.trim() || send.isPending || uploadProgress !== null} isPending={send.isPending} />
              </>
            )}
          </form>
        </div>
      : <p className="border-t border-[#dce9f1] p-4 text-center text-sm text-j-ink-muted">You can message the Admin team once at least one of your tuitions has been appointed.</p>}
    <ImageLightboxModal url={lightboxUrl} onClose={() => setLightboxUrl(null)} title="Attachment Preview" />
  </section>;
}
