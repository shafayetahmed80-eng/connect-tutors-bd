import { BrandMark, brandWordmark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTutorChatSocket } from "@/hooks/useChatSocket";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useSiteContact } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";
import { getCurrentTutorPortalToken } from "@/lib/tutorPortalSession";
import { Mic, Paperclip, Phone, Search, Send, Square, ThumbsUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const CHAT_MESSAGE_MAX = 2000;
// A slow fallback only - the WebSocket carries the real "something arrived" signal.
const CHAT_POLL_MS = 20000;
const TYPING_PING_MS = 2000;
const TYPING_EXPIRES_MS = 3000;

type ChatMessage = { id: number; senderRole: "tutor" | "admin"; body: string; attachmentUrl: string | null; attachmentContentType: string | null; tutorReacted: boolean; adminReacted: boolean; createdAt: string | Date };

function formatChatTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AttachmentView({ url, contentType }: { url: string; contentType: string | null }) {
  if (contentType?.startsWith("image/")) {
    return <a href={url} target="_blank" rel="noreferrer" className="mt-1.5 block overflow-hidden rounded-lg"><img src={url} alt="Attachment" className="max-h-56 w-full object-cover" /></a>;
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
  const [uploading, setUploading] = useState(false);
  const [adminTypingUntil, setAdminTypingUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
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

  const portalToken = getCurrentTutorPortalToken();
  const sendFrame = useTutorChatSocket(portalToken, frame => {
    if (frame.type === "message") void utils.tutorAdminChat.thread.invalidate();
    else if (frame.type === "typing") setAdminTypingUntil(Date.now() + TYPING_EXPIRES_MS);
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const allMessages = (threadQuery.data?.messages ?? []) as ChatMessage[];
  const messages = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return trimmed ? allMessages.filter(message => message.body.toLowerCase().includes(trimmed)) : allMessages;
  }, [allMessages, query]);
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
  }, [messages.length]);

  const pingTyping = () => {
    const nowMs = Date.now();
    if (nowMs - lastTypingPingAt.current < TYPING_PING_MS) return;
    lastTypingPingAt.current = nowMs;
    sendFrame({ type: "typing" });
  };

  const submitMessage = () => {
    const trimmed = body.trim();
    if (!trimmed || send.isPending) return;
    send.mutate({ body: trimmed });
  };
  const handleSubmit = (event: React.FormEvent) => { event.preventDefault(); submitMessage(); };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitMessage(); }
  };

  const uploadAndSend = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/chat/attachment", { method: "POST", credentials: "include", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Upload failed.");
      send.mutate({ body: body.trim(), attachmentKey: result.key, attachmentContentType: result.contentType });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload the attachment.");
    } finally {
      setUploading(false);
    }
  };

  const handleAttach = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadAndSend(file);
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
      <div className="brand-logo flex items-center" style={{ fontSize: "17px" }}>
        <BrandMark />
        <span className="brand-wordmark flex"><strong>{brandWordmark.primary}</strong><em>{brandWordmark.secondary}</em></span>
      </div>
      <a href={contact.tel} className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-j-accent">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-j-accent-wash text-j-accent"><Phone size={13} /></span>
        {contact.display}
      </a>
    </header>

    <label className="relative block border-b border-[#dce9f1] p-3">
      <span className="sr-only">Search this conversation</span>
      <Search className="pointer-events-none absolute left-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-j-ink-faint" />
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search" className="h-8 w-full rounded-lg border border-j-border bg-white pl-8 pr-2 text-xs outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
    </label>

    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {threadQuery.isLoading
        ? <p className="pt-8 text-center text-sm font-semibold text-j-ink-muted">Loading your conversation…</p>
        : null}

      {!threadQuery.isLoading && messages.length === 0
        ? <p className="pt-8 text-center text-sm text-j-ink-muted">{query ? "Nothing matches that search." : "No messages yet. Write to the Admin team below."}</p>
        : null}

      {messages.map(message => {
        const own = message.senderRole === "tutor";
        const seen = own && message.id === lastOwnMessageId && adminLastReadAt !== null && new Date(message.createdAt).getTime() <= adminLastReadAt;
        return <div key={message.id} className={`flex animate-in fade-in slide-in-from-bottom-1 flex-col duration-200 motion-reduce:animate-none ${own ? "items-end" : "items-start"}`}>
          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${own ? "bg-j-accent text-white" : "border border-j-border bg-j-surface-muted text-j-ink"}`}>
            {!own ? <p className="mb-0.5 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Admin</p> : null}
            {message.body ? <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p> : null}
            {message.attachmentUrl ? <AttachmentView url={message.attachmentUrl} contentType={message.attachmentContentType} /> : null}
            <p className={`mt-1 text-2xs font-semibold ${own ? "text-white/70" : "text-j-ink-faint"}`}>{formatChatTime(message.createdAt)}</p>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 px-1">
            <button
              type="button"
              onClick={() => react.mutate({ messageId: message.id })}
              aria-pressed={message.tutorReacted}
              aria-label={message.tutorReacted ? "Remove your 👍" : "React with 👍"}
              className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-bold ${message.tutorReacted ? "text-j-accent" : "text-j-ink-faint hover:text-j-ink-soft"}`}
            >
              <ThumbsUp className="size-3" fill={message.tutorReacted ? "currentColor" : "none"} />
            </button>
            {message.adminReacted ? <span className="text-2xs font-semibold text-j-ink-faint">👍 Admin</span> : null}
            {seen ? <span className="text-2xs font-semibold text-j-ink-faint">Seen</span> : null}
          </div>
        </div>;
      })}
      {adminIsTyping ? <p className="text-2xs font-semibold italic text-j-ink-faint">Admin is typing…</p> : null}
      <div ref={bottomRef} />
    </div>

    {eligible
      ? <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-[#dce9f1] p-3">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={handleAttach} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || voiceRecorder.recording} aria-label="Attach a file" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-j-border text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-50">
            <Paperclip className="size-4" />
          </button>
          {voiceRecorder.supported
            ? <>
                {voiceRecorder.recording
                  ? <button type="button" onClick={voiceRecorder.cancel} aria-label="Cancel the recording" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-j-border text-j-ink-soft hover:bg-j-surface-sunken">
                      <X className="size-4" />
                    </button>
                  : null}
                <button
                  type="button"
                  onClick={handleMic}
                  disabled={uploading}
                  aria-label={voiceRecorder.recording ? "Stop recording and send the voice note" : "Record a voice note"}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border disabled:opacity-50 ${voiceRecorder.recording ? "animate-pulse border-red-300 bg-red-50 text-red-600" : "border-j-border text-j-ink-soft hover:bg-j-surface-sunken"}`}
                >
                  {voiceRecorder.recording ? <Square className="size-4" /> : <Mic className="size-4" />}
                </button>
              </>
            : null}
          <Textarea
            value={body}
            onChange={event => { setBody(event.target.value); pingTyping(); }}
            onKeyDown={handleKeyDown}
            maxLength={CHAT_MESSAGE_MAX}
            rows={2}
            placeholder="Write a message…"
            className="min-h-9 flex-1 resize-none"
          />
          <Button type="submit" size="icon" aria-label="Send message" disabled={!body.trim() || send.isPending || uploading} className="h-10 w-10 shrink-0 rounded-xl">
            <Send className="size-4" />
          </Button>
        </form>
      : <p className="border-t border-[#dce9f1] p-4 text-center text-sm text-j-ink-muted">You can message the Admin team once at least one of your tuitions has been appointed.</p>}
  </section>;
}
