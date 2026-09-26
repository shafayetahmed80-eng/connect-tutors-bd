import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CharacterRemaining from "@/components/CharacterRemaining";
import { useIsMobile } from "@/hooks/useMobile";
import { useAdminChatSocket } from "@/hooks/useChatSocket";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Search, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";

const CHAT_MESSAGE_MAX = 2000;
// A slow fallback only - the WebSocket carries the real "something arrived" signal.
const CHAT_POLL_MS = 20000;

type ChatMessage = { id: number; senderRole: "tutor" | "admin"; body: string; createdAt: string | Date };
type ChatThreadRow = { tutorId: string; tutorName: string; tutorNumber: number | null; lastMessageAt: string | Date | null; lastMessagePreview: string | null; unreadCount: number };

function formatChatTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** The Admin's list of every Tutor who has written in - newest activity first, unread ones easy to spot. */
function ThreadList({ selectedTutorId, onSelect }: { selectedTutorId: string | null; onSelect: (tutorId: string) => void }) {
  const [query, setQuery] = useState("");
  const threadsQuery = trpc.admin.listTutorChatThreads.useQuery({ query, page: 1, pageSize: 50 });
  const items = (threadsQuery.data?.items ?? []) as ChatThreadRow[];

  return <div className="flex h-full flex-col">
    <label className="relative block border-b border-[#dce9f1] p-3">
      <span className="sr-only">Search Tutor chats</span>
      <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
      <input
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search Tutor name or ID"
        className="h-9 w-full rounded-lg border border-j-border bg-white pl-9 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
      />
    </label>
    <div className="flex-1 overflow-y-auto">
      {threadsQuery.isLoading ? <p className="p-4 text-center text-sm font-semibold text-j-ink-muted">Loading conversations…</p> : null}
      {!threadsQuery.isLoading && items.length === 0
        ? <p className="p-4 text-center text-sm text-j-ink-muted">{query ? "Nothing matches that search." : "No Tutor has written in yet."}</p>
        : null}
      {items.map(item => <button
        key={item.tutorId}
        type="button"
        onClick={() => onSelect(item.tutorId)}
        aria-current={selectedTutorId === item.tutorId ? "true" : undefined}
        className={`flex w-full flex-col gap-0.5 border-b border-[#eef3f7] px-4 py-3 text-left hover:bg-j-surface-sunken ${selectedTutorId === item.tutorId ? "bg-j-accent-wash" : ""}`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-bold text-j-ink">{item.tutorName}</span>
          {item.unreadCount > 0 ? <span className="shrink-0 rounded-full bg-j-accent px-1.5 py-0.5 text-2xs font-bold text-white">{item.unreadCount > 99 ? "99+" : item.unreadCount}</span> : null}
        </span>
        <span className="text-2xs font-semibold text-j-ink-faint">Tutor ID {item.tutorNumber ?? "—"}</span>
        {item.lastMessagePreview ? <span className="truncate text-xs text-j-ink-soft">{item.lastMessagePreview}</span> : null}
      </button>)}
    </div>
  </div>;
}

/** One Tutor's conversation. Any Admin may reply, so a reply never signs itself with the Admin's name. */
function ThreadPanel({ tutorId, onBack }: { tutorId: string; onBack?: () => void }) {
  const utils = trpc.useUtils();
  const threadQuery = trpc.admin.getTutorChatThread.useQuery({ tutorId }, { refetchInterval: CHAT_POLL_MS });
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedTutorId = useRef<string | null>(null);

  const refreshLists = () => Promise.all([utils.admin.listTutorChatThreads.invalidate(), utils.admin.tutorChatUnreadThreadCount.invalidate()]);
  const send = trpc.admin.sendTutorChatMessage.useMutation({
    onSuccess: async () => { setBody(""); await Promise.all([utils.admin.getTutorChatThread.invalidate({ tutorId }), refreshLists()]); },
    onError: error => toast.error(error.message),
  });
  const markRead = trpc.admin.markTutorChatRead.useMutation({ onSuccess: refreshLists });

  const messages = (threadQuery.data?.messages ?? []) as ChatMessage[];
  const tutor = threadQuery.data?.tutor;

  useEffect(() => {
    if (threadQuery.isLoading || markedTutorId.current === tutorId) return;
    markedTutorId.current = tutorId;
    markRead.mutate({ tutorId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadQuery.isLoading, tutorId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || send.isPending) return;
    send.mutate({ tutorId, body: trimmed });
  };

  return <div className="flex h-full flex-col">
    <div className="flex items-center gap-2 border-b border-[#dce9f1] px-4 py-3">
      {onBack ? <button type="button" onClick={onBack} aria-label="Back to Tutor list" className="grid size-8 shrink-0 place-items-center rounded-lg text-j-ink-soft hover:bg-j-surface-sunken"><ArrowLeft size={18} /></button> : null}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-j-ink">{tutor?.tutorName ?? "Loading…"}</p>
        {tutor ? <p className="text-2xs font-semibold text-j-ink-faint">Tutor ID {tutor.tutorNumber ?? "—"}</p> : null}
      </div>
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {threadQuery.isLoading ? <p className="pt-8 text-center text-sm font-semibold text-j-ink-muted">Loading the conversation…</p> : null}
      {!threadQuery.isLoading && messages.length === 0 ? <p className="pt-8 text-center text-sm text-j-ink-muted">No messages yet.</p> : null}
      {messages.map(message => {
        const own = message.senderRole === "admin";
        return <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${own ? "bg-j-accent text-white" : "border border-j-border bg-j-surface-muted text-j-ink"}`}>
            {!own ? <p className="mb-0.5 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Tutor</p> : null}
            <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
            <p className={`mt-1 text-2xs font-semibold ${own ? "text-white/70" : "text-j-ink-faint"}`}>{formatChatTime(message.createdAt)}</p>
          </div>
        </div>;
      })}
      <div ref={bottomRef} />
    </div>

    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-[#dce9f1] p-3">
      <div className="flex-1 space-y-1">
        <Textarea value={body} onChange={event => setBody(event.target.value)} maxLength={CHAT_MESSAGE_MAX} rows={2} placeholder="Reply as Admin…" className="min-h-9 resize-none" />
        <CharacterRemaining value={body} maxLength={CHAT_MESSAGE_MAX} />
      </div>
      <Button type="submit" size="icon" aria-label="Send reply" disabled={!body.trim() || send.isPending} className="h-10 w-10 shrink-0 rounded-xl">
        <Send className="size-4" />
      </Button>
    </form>
  </div>;
}

export function AdminTutorChatsContent() {
  const isMobile = useIsMobile();
  const search = useSearch();
  const utils = trpc.useUtils();
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(() => new URLSearchParams(search).get("tutorId"));
  const frameClassName = "h-[calc(100vh-200px)] min-h-[420px] overflow-hidden rounded-xl border border-j-border bg-white shadow-[0_10px_26px_-18px_rgba(38,83,117,0.5)]";

  useAdminChatSocket(tutorId => {
    void utils.admin.listTutorChatThreads.invalidate();
    void utils.admin.tutorChatUnreadThreadCount.invalidate();
    if (tutorId && tutorId === selectedTutorId) void utils.admin.getTutorChatThread.invalidate({ tutorId });
  });

  if (isMobile) {
    return <div className={frameClassName}>
      {selectedTutorId
        ? <ThreadPanel tutorId={selectedTutorId} onBack={() => setSelectedTutorId(null)} />
        : <ThreadList selectedTutorId={selectedTutorId} onSelect={setSelectedTutorId} />}
    </div>;
  }

  return <div className={`grid grid-cols-[320px_1fr] ${frameClassName}`}>
    <div className="border-r border-[#dce9f1]"><ThreadList selectedTutorId={selectedTutorId} onSelect={setSelectedTutorId} /></div>
    <div>
      {selectedTutorId
        ? <ThreadPanel tutorId={selectedTutorId} />
        : <p className="grid h-full place-items-center px-6 text-center text-sm text-j-ink-muted">Select a Tutor to view the conversation.</p>}
    </div>
  </div>;
}

export default function AdminTutorChats() {
  return <AdminWorkspaceLayout title="Tutor Chats">
    <div className="mx-auto w-full max-w-[100rem] pb-10">
      <AdminTutorChatsContent />
    </div>
  </AdminWorkspaceLayout>;
}
