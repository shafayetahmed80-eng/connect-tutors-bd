import { LabelIcon } from "@/components/recordIcons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CharacterRemaining from "@/components/CharacterRemaining";
import { trpc } from "@/lib/trpc";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const CHAT_MESSAGE_MAX = 2000;
const CHAT_POLL_MS = 3000;

type ChatMessage = { id: number; senderRole: "tutor" | "admin"; body: string; createdAt: string | Date };

function formatChatTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMarkedRead = useRef(false);

  const send = trpc.tutorAdminChat.send.useMutation({
    onSuccess: async () => { setBody(""); await utils.tutorAdminChat.thread.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const markRead = trpc.tutorAdminChat.markRead.useMutation({ onSuccess: () => utils.tutorAdminChat.unreadCount.invalidate() });

  const messages = (threadQuery.data?.messages ?? []) as ChatMessage[];

  useEffect(() => {
    if (hasMarkedRead.current || threadQuery.isLoading) return;
    hasMarkedRead.current = true;
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadQuery.isLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || send.isPending) return;
    send.mutate({ body: trimmed });
  };

  return <section className="flex h-[calc(100vh-220px)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-j-border bg-white shadow-[0_10px_26px_-18px_rgba(38,83,117,0.5)]">
    <div className="flex items-center gap-1.5 border-b border-[#dce9f1] px-4 py-3 text-xs font-semibold text-j-ink-muted">
      <LabelIcon label="Chat with Admin" />
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {threadQuery.isLoading
        ? <p className="pt-8 text-center text-sm font-semibold text-j-ink-muted">Loading your conversation…</p>
        : null}

      {!threadQuery.isLoading && messages.length === 0
        ? <p className="pt-8 text-center text-sm text-j-ink-muted">No messages yet. Write to the Admin team below.</p>
        : null}

      {messages.map(message => {
        const own = message.senderRole === "tutor";
        return <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${own ? "bg-j-accent text-white" : "border border-j-border bg-j-surface-muted text-j-ink"}`}>
            {!own ? <p className="mb-0.5 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Admin</p> : null}
            <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
            <p className={`mt-1 text-2xs font-semibold ${own ? "text-white/70" : "text-j-ink-faint"}`}>{formatChatTime(message.createdAt)}</p>
          </div>
        </div>;
      })}
      <div ref={bottomRef} />
    </div>

    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-[#dce9f1] p-3">
      <div className="flex-1 space-y-1">
        <Textarea
          value={body}
          onChange={event => setBody(event.target.value)}
          maxLength={CHAT_MESSAGE_MAX}
          rows={2}
          placeholder="Write a message…"
          className="min-h-9 resize-none"
        />
        <CharacterRemaining value={body} maxLength={CHAT_MESSAGE_MAX} />
      </div>
      <Button type="submit" size="icon" aria-label="Send message" disabled={!body.trim() || send.isPending} className="h-10 w-10 shrink-0 rounded-xl">
        <Send className="size-4" />
      </Button>
    </form>
  </section>;
}
