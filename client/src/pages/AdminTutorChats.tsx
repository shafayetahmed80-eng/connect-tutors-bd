import { AdminChatFilterFields, useAdminChatFilters } from "@/components/AdminChatFilters";
import { AdminRequestFilterBar } from "@/components/AdminRequestFilters";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import RecentSearches from "@/components/RecentSearches";
import SearchInput from "@/components/SearchInput";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import { useAdminChatSocket, useOnlineStatus } from "@/hooks/useChatSocket";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { compressImage } from "@/lib/compressImage";
import { trpc } from "@/lib/trpc";
import { supportsWebPush, urlBase64ToUint8Array } from "@/lib/webPush";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import { ChatAutoLink, ChatDateDivider, ImageLightboxModal, isDifferentDay } from "@/components/chat/ChatVisuals";
import { ChatMessageBody, EmojiReactionPicker, ReplyPreviewBar, TutorPeekProfileDrawer, type QuotedMessage } from "@/components/chat/ChatProductivity";
import { ChatAnimatedBubble, ChatSendButton, ChatTypingIndicator, VoiceRecordingBar } from "@/components/chat/ChatMotion";
import { ArchiveRestore, ArrowLeft, BellRing, BookmarkPlus, Clock, CornerUpLeft, ListPlus, Loader2, Maximize2, Mic, Paperclip, RotateCcw, Search, Send, Square, StickyNote, ThumbsUp, UserCheck, UserRound, UserRoundCheck, UserRoundX, WifiOff, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";

const CHAT_MESSAGE_MAX = 2000;
// A slow fallback only - the WebSocket carries the real "something arrived" signal.
const CHAT_POLL_MS = 20000;
const TYPING_EXPIRES_MS = 3000;
const PAGE_SIZE = 30;
const STARTER_MESSAGE = "Hi, this is the Connect Tutors Admin team. Let us know if you have any questions about your profile, tuitions, or account.";

type ChatMessage = { id: number; senderRole: "tutor" | "admin"; body: string; attachmentUrl: string | null; attachmentContentType: string | null; tutorReacted: boolean; adminReacted: boolean; createdAt: string | Date };
type ChatThreadRow = { tutorId: string; tutorName: string; tutorNumber: number | null; lastMessageAt: string | Date | null; lastMessagePreview: string | null; unreadCount: number; claimedByAdminId: number | null; claimedByAdminName: string | null };

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

/** How busy the inbox is right now - how many threads are waiting on a reply, and how fast Admins have actually been answering. */
function ChatStatsStrip() {
  const statsQuery = trpc.admin.getTutorChatStats.useQuery(undefined, { refetchInterval: 60000 });
  const stats = statsQuery.data;
  if (!stats) return null;
  return <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-j-ink-soft">
    <span>{stats.awaitingReplyCount} awaiting reply</span>
    <span className="text-j-ink-faint">·</span>
    <span>{stats.avgResponseMinutes !== null ? `~${stats.avgResponseMinutes} min avg. reply (30d)` : "Not enough replies yet for an average"}</span>
  </p>;
}

/** Lets an Admin turn on desktop push alerts for a new Tutor message - useful exactly when this tab is not the one they are looking at. Renders nothing on a deployment with no VAPID keys configured, or a browser that cannot do push. */
function ChatPushToggle() {
  const keyQuery = trpc.admin.getChatPushPublicKey.useQuery();
  const subscribeMutation = trpc.admin.subscribeChatPush.useMutation();
  const unsubscribeMutation = trpc.admin.unsubscribeChatPush.useMutation();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = supportsWebPush();

  useEffect(() => {
    if (!supported) return;
    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      setSubscribed(Boolean(existing));
    })();
  }, [supported]);

  if (!supported || !keyQuery.data?.publicKey) return null;
  const publicKey = keyQuery.data.publicKey;

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("The browser did not return a usable subscription.");
      await subscribeMutation.mutateAsync({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
      setSubscribed(true);
      toast.success("Desktop alerts are on for this browser.");
    } catch {
      toast.error("Could not enable desktop alerts.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      if (existing) {
        await unsubscribeMutation.mutateAsync({ endpoint: existing.endpoint });
        await existing.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  };

  return <button
    type="button"
    disabled={busy}
    onClick={() => void (subscribed ? disable() : enable())}
    aria-pressed={subscribed}
    className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-2xs font-bold disabled:opacity-50 ${subscribed ? "border-j-accent bg-j-accent-wash text-j-accent" : "border-j-border text-j-ink-soft hover:bg-j-surface-sunken"}`}
  >
    <BellRing size={13} /> {subscribed ? "Desktop alerts on" : "Enable desktop alerts"}
  </button>;
}

/** A shared library of canned replies any Admin can drop straight into the composer, managed from the same dropdown. */
function QuickRepliesMenu({ onInsert, currentDraft }: { onInsert: (body: string) => void; currentDraft?: string }) {
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [label, setLabel] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const utils = trpc.useUtils();
  const listQuery = trpc.admin.listChatQuickReplies.useQuery(undefined, { enabled: open });
  const templatesQuery = trpc.admin.listMessageTemplates.useQuery({ category: "tutor_chat" }, { enabled: open });
  const create = trpc.admin.createChatQuickReply.useMutation({
    onSuccess: () => {
      setLabel("");
      setDraftBody("");
      void utils.admin.listChatQuickReplies?.invalidate?.();
      void utils.admin.listMessageTemplates?.invalidate?.();
      toast.success("Saved as template.");
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.admin.deleteChatQuickReply.useMutation({
    onSuccess: () => {
      void utils.admin.listChatQuickReplies?.invalidate?.();
      void utils.admin.listMessageTemplates?.invalidate?.();
    },
  });
  const removeTemplate = trpc.admin.deleteMessageTemplate.useMutation({
    onSuccess: () => {
      void utils.admin.listChatQuickReplies?.invalidate?.();
      void utils.admin.listMessageTemplates?.invalidate?.();
    },
  });

  const rawQuickReplies = listQuery.data?.items ?? [];
  const rawTemplates = templatesQuery.data?.items ?? [];
  const items = [
    ...rawQuickReplies.map(item => ({ id: `qr-${item.id}`, numId: item.id, isTemplate: false, label: item.label, body: item.body })),
    ...rawTemplates
      .filter(t => !rawQuickReplies.some(q => q.label === t.title && q.body === t.body))
      .map(t => ({ id: `tpl-${t.id}`, numId: t.id, isTemplate: true, label: t.title, body: t.body })),
  ];

  const submitNew = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedLabel = label.trim();
    const trimmedBody = draftBody.trim();
    if (!trimmedLabel || !trimmedBody) return;
    create.mutate({ label: trimmedLabel, body: trimmedBody });
  };

  return <div className="relative">
    <button type="button" onClick={() => setOpen(value => !value)} aria-label="Quick replies" aria-expanded={open} className="grid h-control w-10 shrink-0 place-items-center rounded-xl border border-j-border text-j-ink-soft hover:bg-j-surface-sunken">
      <ListPlus className="size-4" />
    </button>
    {open ? <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] sm:hidden"
        onClick={() => { setOpen(false); setManaging(false); }}
        aria-hidden="true"
      />
      <div className="fixed inset-x-2 bottom-3 z-50 flex max-h-[85vh] flex-col rounded-2xl border border-j-border bg-white p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 sm:absolute sm:inset-auto sm:bottom-12 sm:left-0 sm:z-10 sm:max-h-none sm:w-80 sm:rounded-xl sm:p-2 sm:shadow-lg">
        <div className="flex items-center justify-between px-1 pb-2 sm:pb-1.5">
          <div className="flex items-center gap-1.5">
            <BookmarkPlus className="size-3.5 text-j-accent sm:hidden" />
            <p className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Quick replies &amp; Templates</p>
            <span className="rounded-full bg-j-surface-muted px-1.5 py-0.5 text-3xs font-semibold tabular-nums text-j-ink-muted">
              {items.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setManaging(value => !value)} className="text-2xs font-bold text-j-accent hover:underline">{managing ? "Done" : "Manage"}</button>
            <button
              type="button"
              onClick={() => { setOpen(false); setManaging(false); }}
              aria-label="Close"
              className="rounded-lg p-1 text-j-ink-muted hover:bg-j-surface-sunken hover:text-j-ink sm:hidden"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {currentDraft?.trim() && !managing ? (
          <div className="mb-2 border-b border-j-border pb-1.5">
            <button
              type="button"
              onClick={() => {
                setLabel(currentDraft.slice(0, 30).trim());
                setDraftBody(currentDraft.trim());
                setManaging(true);
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-2xs font-bold text-[#1267c8] hover:bg-sky-100 transition-colors"
            >
              <BookmarkPlus className="size-3" />
              <span>Save current message as template</span>
            </button>
          </div>
        ) : null}

        <div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
          {items.length === 0 ? <p className="px-1.5 py-3 text-center text-xs text-j-ink-muted">No quick replies yet.</p> : null}
          {items.map(item => <div key={item.id} className="flex items-start gap-1.5 rounded-lg px-1.5 py-1.5 hover:bg-j-surface-sunken transition-colors">
            <button type="button" onClick={() => { onInsert(item.body); setOpen(false); }} className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-bold text-j-ink">{item.label}</p>
              <p className="truncate text-2xs text-j-ink-muted">{item.body}</p>
            </button>
            {managing ? <button type="button" onClick={() => {
              if (item.isTemplate) {
                removeTemplate.mutate({ id: item.numId });
              } else {
                remove.mutate({ id: item.numId });
              }
            }} aria-label={`Delete ${item.label}`} className="shrink-0 rounded px-1 py-0.5 text-2xs font-bold text-red-600 hover:bg-red-50">Delete</button> : null}
          </div>)}
        </div>
        {managing ? <form onSubmit={submitNew} className="mt-2 space-y-2 border-t border-j-border pt-2">
          <p className="text-2xs font-bold text-j-ink-soft">Add new quick reply</p>
          <input value={label} onChange={event => setLabel(event.target.value)} placeholder="Short label" maxLength={60} className="h-control w-full rounded-xl border border-j-border px-2.5 text-xs outline-none focus:border-j-accent focus:ring-1 focus:ring-j-accent/20" />
          <Textarea value={draftBody} onChange={event => setDraftBody(event.target.value)} placeholder="Reply text…" rows={2} className="text-xs rounded-xl" />
          <Button type="submit" size="sm" disabled={!label.trim() || !draftBody.trim() || create.isPending} className="w-full h-8 rounded-xl text-xs font-semibold">
            {create.isPending ? "Saving…" : "Add quick reply"}
          </Button>
        </form> : null}
      </div>
    </> : null}
  </div>;
}

/** Modal to save any existing chat message directly as a template */
function SaveMessageAsTemplateModal({ body, onClose }: { body: string; onClose: () => void }) {
  const [label, setLabel] = useState(() => body.slice(0, 40).trim());
  const [messageBody, setMessageBody] = useState(body);
  const utils = trpc.useUtils();
  const create = trpc.admin.createChatQuickReply.useMutation({
    onSuccess: () => {
      toast.success("Saved as template.");
      void utils.admin.listChatQuickReplies?.invalidate?.();
      void utils.admin.listMessageTemplates?.invalidate?.();
      onClose();
    },
    onError: err => toast.error(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !messageBody.trim()) return;
    create.mutate({ label: label.trim(), body: messageBody.trim() });
  };

  return (
    <Modal size="dialog" onClose={onClose}>
      <ModalHeader title="Save as Template" meta="Add this message to reusable templates" />
      <form onSubmit={submit}>
        <ModalBody className="space-y-3">
          <div>
            <label className="text-xs font-bold text-j-ink">Template Label / Title</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Profile guidance"
              maxLength={60}
              required
              className="mt-1 h-control w-full rounded-xl border border-j-border px-3 text-xs outline-none focus:border-j-accent"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-j-ink">Template Message</label>
            <Textarea
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              rows={3}
              maxLength={2000}
              required
              className="mt-1 text-xs"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="h-control flex-1 sm:flex-none rounded-xl border border-j-border px-4 text-xs font-bold text-j-ink-soft">Cancel</button>
          <Button type="submit" disabled={!label.trim() || !messageBody.trim() || create.isPending} className="h-control flex-1 sm:flex-none rounded-xl text-xs">
            {create.isPending ? "Saving…" : "Save Template"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

/** Admin-only remarks on a Tutor's chat - coordination between Admins, never shown in the Tutor's own thread. */
function ChatNotesModal({ tutorId, onClose }: { tutorId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const notesQuery = trpc.admin.listTutorChatNotes.useQuery({ tutorId });
  const [body, setBody] = useState("");
  const add = trpc.admin.addTutorChatNote.useMutation({
    onSuccess: () => { setBody(""); void utils.admin.listTutorChatNotes.invalidate({ tutorId }); },
    onError: error => toast.error(error.message),
  });
  const notes = notesQuery.data?.notes ?? [];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    add.mutate({ tutorId, body: trimmed });
  };

  return <Modal size="dialog" onClose={onClose}>
    <ModalHeader title="Private notes" meta="Only Admins see this - never the Tutor." />
    <ModalBody className="space-y-3">
      {notesQuery.isLoading ? <p className="text-sm text-j-ink-muted">Loading…</p> : null}
      {!notesQuery.isLoading && notes.length === 0 ? <p className="text-sm text-j-ink-muted">No notes yet.</p> : null}
      {notes.map(note => <div key={note.id} className="rounded-lg border border-j-border bg-j-surface-muted p-2.5">
        <p className="whitespace-pre-wrap text-sm text-j-ink">{note.body}</p>
        <p className="mt-1 text-2xs font-semibold text-j-ink-faint">{note.authorAdminName ?? "An Admin"} · {formatChatTime(note.createdAt)}</p>
      </div>)}
    </ModalBody>
    <ModalFooter>
      <form onSubmit={submit} className="flex w-full items-end gap-2">
        <Textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Add a note for other Admins…" rows={2} className="flex-1 resize-none text-sm" />
        <Button type="submit" disabled={!body.trim() || add.isPending}>Add</Button>
      </form>
    </ModalFooter>
  </Modal>;
}

type ThreadSortMode = "recent" | "unread" | "mine";

/**
 * The Admin's list of every Tutor who has written in - newest activity first,
 * unread ones easy to spot. The page reads the list (the card over both panes
 * counts it); this draws it, with its tabs, search and sort.
 */
function ThreadList({ selectedTutorId, onSelect, archived, onArchivedChange, query, onQueryChange, threads, loading, narrowed }: {
  selectedTutorId: string | null;
  onSelect: (tutorId: string) => void;
  archived: boolean;
  onArchivedChange: (value: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  threads: ChatThreadRow[];
  loading: boolean;
  /** The search or the filter panel is narrowing the list. */
  narrowed: boolean;
}) {
  const [sortMode, setSortMode] = useState<ThreadSortMode>("recent");
  const { user } = useAuth();
  const rawItems = threads;
  // The server's own order (newest activity first) is always the tiebreaker -
  // `Array.prototype.sort` is stable, so this only ever regroups it, never
  // reshuffles within a group.
  const items = useMemo(() => {
    if (sortMode === "unread") return [...rawItems].sort((a, b) => Number(b.unreadCount > 0) - Number(a.unreadCount > 0));
    if (sortMode === "mine" && user) return [...rawItems].sort((a, b) => Number(b.claimedByAdminId === user.id) - Number(a.claimedByAdminId === user.id));
    return rawItems;
  }, [rawItems, sortMode, user]);

  return <div className="flex h-full flex-col">
    <div className="flex shrink-0 border-b border-[#dce9f1]">
      <button type="button" onClick={() => onArchivedChange(false)} aria-current={!archived ? "true" : undefined} className={`flex-1 border-b-2 py-2 text-xs font-bold ${!archived ? "border-j-accent text-j-accent" : "border-transparent text-j-ink-soft"}`}>Active</button>
      <button type="button" onClick={() => onArchivedChange(true)} aria-current={archived ? "true" : undefined} className={`flex-1 border-b-2 py-2 text-xs font-bold ${archived ? "border-j-accent text-j-accent" : "border-transparent text-j-ink-soft"}`}>Archived</button>
    </div>
    <div className="flex items-center gap-2 border-b border-[#dce9f1] p-3">
      <RecentSearches page="tutor-chats" value={query} onPick={term => onQueryChange(term)} className="min-w-0 flex-1">
        <SearchInput
          value={query}
          onChange={onQueryChange}
          onClear={() => onQueryChange("")}
          placeholder="Search Tutor name or ID"
          label="Search Tutor chats"
          variant="white"
        />
      </RecentSearches>
      <label className="relative shrink-0">
        <span className="sr-only">Sort conversations</span>
        <select
          value={sortMode}
          onChange={event => setSortMode(event.target.value as ThreadSortMode)}
          className="h-control rounded-lg border border-j-border bg-white pl-2 pr-6 text-xs font-semibold text-j-ink-soft outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
        >
          <option value="recent">Recent</option>
          <option value="unread">Unread first</option>
          <option value="mine">Mine first</option>
        </select>
      </label>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto">
      {loading ? <p className="p-4 text-center text-sm font-semibold text-j-ink-muted">Loading conversations…</p> : null}
      {!loading && items.length === 0
        ? <p className="p-4 text-center text-sm text-j-ink-muted">{narrowed ? "Nothing matches that search." : archived ? "No archived conversations." : "No Tutor has written in yet."}</p>
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
        {item.claimedByAdminName ? <span className="truncate text-2xs font-semibold text-j-accent">Claimed by {item.claimedByAdminName}</span> : null}
      </button>)}
    </div>
  </div>;
}

/** One Tutor's conversation. Any Admin may reply, so a reply never signs itself with the Admin's name. */
function ThreadPanel({ tutorId, onBack, tutorIsTyping, onTyping, hasNoteAlert, onNotesViewed }: { tutorId: string; onBack?: () => void; tutorIsTyping: boolean; onTyping: () => void; hasNoteAlert: boolean; onNotesViewed: () => void }) {
  const utils = trpc.useUtils();
  const threadQuery = trpc.admin.getTutorChatThread.useQuery({ tutorId }, { refetchInterval: CHAT_POLL_MS });
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [savingTemplateBody, setSavingTemplateBody] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<QuotedMessage | null>(null);
  const [emojisByMessage, setEmojisByMessage] = useState<Record<number, string>>({});
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markedTutorId = useRef<string | null>(null);
  const starterFilledFor = useRef<string | null>(null);

  const refreshLists = () => Promise.all([utils.admin.listTutorChatThreads.invalidate(), utils.admin.tutorChatUnreadThreadCount.invalidate()]);
  const send = trpc.admin.sendTutorChatMessage.useMutation({
    onSuccess: async () => { setBody(""); await Promise.all([utils.admin.getTutorChatThread.invalidate({ tutorId }), refreshLists()]); },
    onError: error => toast.error(error.message),
  });
  const markRead = trpc.admin.markTutorChatRead.useMutation({ onSuccess: refreshLists });
  const claim = trpc.admin.claimTutorChatThread.useMutation({
    onSuccess: async () => { await Promise.all([utils.admin.getTutorChatThread.invalidate({ tutorId }), utils.admin.listTutorChatThreads.invalidate()]); },
    onError: error => toast.error(error.message),
  });
  const release = trpc.admin.releaseTutorChatThread.useMutation({
    onSuccess: async () => { await Promise.all([utils.admin.getTutorChatThread.invalidate({ tutorId }), utils.admin.listTutorChatThreads.invalidate()]); },
  });
  const reopen = trpc.admin.reopenTutorChatThread.useMutation({
    onSuccess: async () => { await Promise.all([utils.admin.getTutorChatThread.invalidate({ tutorId }), utils.admin.listTutorChatThreads.invalidate()]); },
  });
  const react = trpc.admin.reactToChatMessage.useMutation({ onSuccess: () => utils.admin.getTutorChatThread.invalidate({ tutorId }) });

  const allMessages = (threadQuery.data?.messages ?? []) as ChatMessage[];
  const messages = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return trimmed ? allMessages.filter(message => message.body.toLowerCase().includes(trimmed)) : allMessages;
  }, [allMessages, query]);
  const isOnline = useOnlineStatus();
  const [outbox, setOutbox] = useState<{ tempId: string; body: string; status: "sending" | "failed" }[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleMessages = useMemo(() => {
    if (query.trim()) return messages;
    return messages.slice(Math.max(0, messages.length - visibleCount));
  }, [messages, visibleCount, query]);

  const tutor = threadQuery.data?.tutor;
  const tutorLastReadAt = threadQuery.data?.tutorLastReadAt ? new Date(threadQuery.data.tutorLastReadAt).getTime() : null;
  const lastOwnMessageId = [...allMessages].reverse().find(message => message.senderRole === "admin")?.id;
  const claimedByAdminName = threadQuery.data?.claimedByAdminName ?? null;
  const archivedAt = threadQuery.data?.archivedAt ?? null;

  useEffect(() => {
    if (threadQuery.isLoading || markedTutorId.current === tutorId) return;
    markedTutorId.current = tutorId;
    markRead.mutate({ tutorId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadQuery.isLoading, tutorId]);

  // Pre-fills a friendly opener the first time an Admin opens a Tutor who has
  // never written in - never overwrites a draft the Admin already started.
  useEffect(() => {
    if (threadQuery.isLoading || starterFilledFor.current === tutorId) return;
    starterFilledFor.current = tutorId;
    if (allMessages.length === 0) setBody(current => current || STARTER_MESSAGE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadQuery.isLoading, tutorId, allMessages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length, outbox.length]);

  const submitMessage = (retryTempId?: string, retryBody?: string) => {
    let text = retryBody ?? body.trim();
    if (!text) return;

    if (!retryTempId && replyingTo) {
      const quoteSender = replyingTo.senderRole === "admin" ? "Admin" : "Tutor";
      const snippet = (replyingTo.body || "Attachment").slice(0, 100).replace(/\n/g, " ");
      text = `> [Replying to ${quoteSender}]: "${snippet}"\n\n${text}`;
      setReplyingTo(null);
    }

    const tempId = retryTempId || `admin-temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (!retryTempId) {
      setBody("");
      setOutbox(prev => [...prev, { tempId, body: text, status: "sending" }]);
    } else {
      setOutbox(prev => prev.map(m => m.tempId === tempId ? { ...m, status: "sending" } : m));
    }

    send.mutate(
      { tutorId, body: text },
      {
        onSuccess: async () => {
          setOutbox(prev => prev.filter(m => m.tempId !== tempId));
          await Promise.all([utils.admin.getTutorChatThread.invalidate({ tutorId }), refreshLists()]);
        },
        onError: () => {
          setOutbox(prev => prev.map(m => m.tempId === tempId ? { ...m, status: "failed" } : m));
          toast.error("Message could not be sent. Check connection or tap retry.");
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
      formData.append("tutorId", tutorId);
      const result = await uploadFileWithProgress("/api/chat/attachment", formData, setUploadProgress);
      send.mutate({ tutorId, body: body.trim(), attachmentKey: result.key, attachmentContentType: result.contentType }, {
        onSuccess: async () => { setBody(""); await Promise.all([utils.admin.getTutorChatThread.invalidate({ tutorId }), refreshLists()]); },
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

  return <div className="flex h-full min-h-0 flex-col">
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#dce9f1] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack ? <button type="button" onClick={onBack} aria-label="Back to Tutor list" className="grid size-8 shrink-0 place-items-center rounded-lg text-j-ink-soft hover:bg-j-surface-sunken max-sm:size-10"><ArrowLeft size={18} /></button> : null}
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-sky-200 bg-[#f4f9fd] text-j-ink-faint">
          {tutor?.profilePhotoUrl
            ? <img src={tutor.profilePhotoUrl} alt="" className="size-full object-cover" />
            : <UserRound size={18} aria-hidden={true} />}
        </span>
        <div className="min-w-0">
          <p className="text-2xs font-bold text-j-ink-faint">Tutor ID {tutor?.tutorNumber ?? "—"}</p>
          <p className="truncate text-sm font-bold text-j-ink">{tutor?.tutorName ?? "Loading…"}</p>
          {tutor?.phone ? <p className="truncate text-2xs font-semibold text-j-ink-soft">{tutor.phone}</p> : null}
        </div>
        {tutor?.instituteName || tutor?.departmentName
          ? <div className="hidden min-w-0 border-l border-[#dce9f1] pl-3 sm:block">
              {tutor.instituteName ? <p className="truncate text-2xs font-bold text-j-ink">{tutor.instituteName}</p> : null}
              {tutor.departmentName ? <p className="truncate text-2xs font-semibold text-j-ink-soft">{tutor.departmentName}</p> : null}
            </div>
          : null}
        {!isOnline ? (
          <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-3xs font-bold text-amber-800">
            <WifiOff className="size-2.5" /> Offline
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-3xs font-bold text-emerald-700" title="Connected in real-time">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {tutor ? (
          <button
            type="button"
            onClick={() => setProfileDrawerOpen(true)}
            aria-label="View Tutor Profile"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-j-border px-2 py-1 text-2xs font-bold text-j-ink-soft hover:bg-j-surface-sunken"
          >
            <UserCheck size={13} /> Profile
          </button>
        ) : null}
        <button type="button" onClick={() => { setNotesOpen(true); onNotesViewed(); }} aria-label="Private notes" className="relative flex shrink-0 items-center gap-1 rounded-lg border border-j-border px-2 py-1 text-2xs font-bold text-j-ink-soft hover:bg-j-surface-sunken">
          <StickyNote size={13} /> Notes
          {hasNoteAlert ? <span aria-label="New note" className="absolute -right-1 -top-1 size-2 rounded-full bg-j-accent" /> : null}
        </button>
        {claimedByAdminName
          ? <button type="button" onClick={() => release.mutate({ tutorId })} className="flex shrink-0 items-center gap-1 rounded-lg border border-j-border px-2 py-1 text-2xs font-bold text-j-ink-soft hover:bg-j-surface-sunken">
              <UserRoundX size={13} /> Claimed by {claimedByAdminName}
            </button>
          : <button type="button" onClick={() => claim.mutate({ tutorId })} className="flex shrink-0 items-center gap-1 rounded-lg border border-j-border px-2 py-1 text-2xs font-bold text-j-ink-soft hover:bg-j-surface-sunken">
              <UserRoundCheck size={13} /> Claim
            </button>}
        <div className="hidden shrink-0 sm:block">
          <SearchInput
            value={query}
            onChange={setQuery}
            onClear={() => setQuery("")}
            placeholder="Search"
            label="Search this conversation"
            variant="white"
            size="sm"
            className="w-36"
          />
        </div>
      </div>
    </header>

    {archivedAt ? <p className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">
      Archived after 30 days idle.
      <button type="button" onClick={() => reopen.mutate({ tutorId })} className="flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-2xs font-bold text-amber-900 hover:bg-amber-100">
        <ArchiveRestore size={13} /> Reopen
      </button>
    </p> : null}

    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {threadQuery.isLoading ? <p className="pt-8 text-center text-sm font-semibold text-j-ink-muted">Loading the conversation…</p> : null}
      {!threadQuery.isLoading && messages.length === 0 && outbox.length === 0 ? <p className="pt-8 text-center text-sm text-j-ink-muted">{query ? "Nothing matches that search." : "No messages yet."}</p> : null}

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
        const own = message.senderRole === "admin";
        const seen = own && message.id === lastOwnMessageId && tutorLastReadAt !== null && new Date(message.createdAt).getTime() <= tutorLastReadAt;
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
                {!own ? <p className="mb-0.5 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Tutor</p> : null}
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
                  reacted={message.adminReacted}
                  currentEmoji={emojisByMessage[message.id]}
                  onToggle={() => react.mutate({ tutorId, messageId: message.id })}
                  onSelectEmoji={(emoji: string) => {
                    setEmojisByMessage(prev => ({ ...prev, [message.id]: emoji }));
                    if (!message.adminReacted) react.mutate({ tutorId, messageId: message.id });
                  }}
                />
                <button
                  type="button"
                  onClick={() => setReplyingTo({ id: message.id, senderRole: message.senderRole, body: message.body })}
                  aria-label="Reply to this message"
                  title="Reply"
                  className="flex min-h-[28px] items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold text-j-ink-faint transition-colors hover:bg-j-surface-sunken hover:text-j-accent active:bg-j-surface-muted"
                >
                  <CornerUpLeft className="size-3.5" />
                  <span className="hidden sm:inline">Reply</span>
                </button>
                {message.body ? (
                  <button
                    type="button"
                    onClick={() => setSavingTemplateBody(message.body)}
                    title="Save this message as template"
                    aria-label="Save this message as template"
                    className="flex min-h-[28px] items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold text-j-ink-faint transition-colors hover:bg-j-surface-sunken hover:text-j-accent active:bg-j-surface-muted"
                  >
                    <BookmarkPlus className="size-3.5" />
                    <span className="hidden sm:inline">Save as template</span>
                  </button>
                ) : null}
                {message.tutorReacted ? <span className="text-2xs font-semibold text-j-ink-faint">👍 Tutor</span> : null}
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
                Retry
              </button>
              <button
                type="button"
                onClick={() => setOutbox(prev => prev.filter(m => m.tempId !== item.tempId))}
                className="text-2xs font-semibold text-j-ink-faint hover:text-j-ink-soft"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </ChatAnimatedBubble>
      ))}

      {tutorIsTyping ? <ChatTypingIndicator senderRole="tutor" /> : null}
      <div ref={bottomRef} />
    </div>

    <div className="border-t border-[#dce9f1]">
      <ReplyPreviewBar replyingTo={replyingTo} onCancel={() => setReplyingTo(null)} currentRole="admin" />
      {uploadProgress !== null
        ? <div className="h-0.5 w-full bg-j-surface-muted">
            <div className="h-full bg-j-accent transition-[width]" style={{ width: `${uploadProgress}%` }} />
          </div>
        : null}
      <form onSubmit={handleSubmit} className="flex items-end gap-1.5 p-3 sm:gap-2">
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
            <QuickRepliesMenu onInsert={text => setBody(current => (current ? `${current} ${text}` : text))} currentDraft={body} />
            <Textarea
              value={body}
              onChange={event => { setBody(event.target.value); onTyping(); }}
              onKeyDown={handleKeyDown}
              maxLength={CHAT_MESSAGE_MAX}
              rows={2}
              placeholder="Reply as Admin…"
              className="min-h-9 flex-1 resize-none"
            />
            <ChatSendButton ariaLabel="Send reply" disabled={!body.trim() || send.isPending || uploadProgress !== null} isPending={send.isPending} />
          </>
        )}
      </form>
    </div>

    {notesOpen ? <ChatNotesModal tutorId={tutorId} onClose={() => setNotesOpen(false)} /> : null}
    {savingTemplateBody ? <SaveMessageAsTemplateModal body={savingTemplateBody} onClose={() => setSavingTemplateBody(null)} /> : null}
    {profileDrawerOpen && tutor ? <TutorPeekProfileDrawer tutor={tutor} onClose={() => setProfileDrawerOpen(false)} /> : null}
    <ImageLightboxModal url={lightboxUrl} onClose={() => setLightboxUrl(null)} title="Attachment Preview" />
  </div>;
}

export function AdminTutorChatsContent() {
  const isMobile = useIsMobile();
  const search = useSearch();
  const utils = trpc.useUtils();
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(() => new URLSearchParams(search).get("tutorId"));
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState("");
  const panel = useAdminChatFilters();
  const threadsQuery = trpc.admin.listTutorChatThreads.useQuery({ query, page: 1, pageSize: 50, archived, ...panel.input });
  const threads = (threadsQuery.data?.items ?? []) as ChatThreadRow[];
  const narrowed = panel.activeCount > 0 || query.trim().length > 0;
  const listProps = { query, onQueryChange: setQuery, threads, loading: threadsQuery.isLoading, narrowed };
  const [noteAlertTutorIds, setNoteAlertTutorIds] = useState<ReadonlySet<string>>(new Set());
  const [typingTutorId, setTypingTutorId] = useState<string | null>(null);
  const [typingUntil, setTypingUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  // On a phone an open conversation has the screen to itself: the card and its panel are for the list, and the room they take goes to the thread.
  const threadOpenOnPhone = isMobile && selectedTutorId !== null;
  const frameClassName = `${threadOpenOnPhone ? "h-[calc(100vh-236px)]" : "h-[calc(100vh-340px)]"} min-h-[420px] overflow-hidden rounded-xl border border-j-border bg-white shadow-[0_10px_26px_-18px_rgba(38,83,117,0.5)]`;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sendFrame = useAdminChatSocket(frame => {
    if (frame.type === "message") {
      void utils.admin.listTutorChatThreads.invalidate();
      void utils.admin.tutorChatUnreadThreadCount.invalidate();
      void utils.admin.getTutorChatStats.invalidate();
      if (frame.tutorId && frame.tutorId === selectedTutorId) void utils.admin.getTutorChatThread.invalidate({ tutorId: frame.tutorId });
    } else if (frame.type === "typing" && frame.tutorId) {
      setTypingTutorId(frame.tutorId);
      setTypingUntil(Date.now() + TYPING_EXPIRES_MS);
    } else if (frame.type === "note" && frame.tutorId) {
      const tutorId = frame.tutorId;
      setNoteAlertTutorIds(prev => new Set(prev).add(tutorId));
    }
  });

  const tutorIsTyping = typingTutorId !== null && typingTutorId === selectedTutorId && typingUntil > now;
  const onTyping = () => { if (selectedTutorId) sendFrame({ type: "typing", tutorId: selectedTutorId }); };
  const onNotesViewed = () => {
    if (!selectedTutorId) return;
    setNoteAlertTutorIds(prev => {
      if (!prev.has(selectedTutorId)) return prev;
      const next = new Set(prev);
      next.delete(selectedTutorId);
      return next;
    });
  };

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <ChatStatsStrip />
      <ChatPushToggle />
    </div>
    {threadOpenOnPhone ? null : <AdminRequestFilterBar
      filters={panel}
      eyebrow={archived ? "Archived Chats" : "Active Chats"}
      count={threadsQuery.data?.total}
      loading={threadsQuery.isLoading}
      caption={narrowed ? "matching conversations" : "conversations"}
      panelId="admin-chat-filters"
      panelLabel="Tutor chat filters"
      noun="conversations found"
    >
      <AdminChatFilterFields draft={panel.draft} setDraft={panel.setDraft} />
    </AdminRequestFilterBar>}
    {isMobile
      ? <div className={frameClassName}>
          {selectedTutorId
            ? <ThreadPanel tutorId={selectedTutorId} onBack={() => setSelectedTutorId(null)} tutorIsTyping={tutorIsTyping} onTyping={onTyping} hasNoteAlert={noteAlertTutorIds.has(selectedTutorId)} onNotesViewed={onNotesViewed} />
            : <ThreadList selectedTutorId={selectedTutorId} onSelect={setSelectedTutorId} archived={archived} onArchivedChange={setArchived} {...listProps} />}
        </div>
      : <div className={`grid min-h-0 grid-cols-[320px_1fr] ${frameClassName}`}>
          <div className="min-h-0 border-r border-[#dce9f1]"><ThreadList selectedTutorId={selectedTutorId} onSelect={setSelectedTutorId} archived={archived} onArchivedChange={setArchived} {...listProps} /></div>
          <div className="min-h-0">
            {selectedTutorId
              ? <ThreadPanel tutorId={selectedTutorId} tutorIsTyping={tutorIsTyping} onTyping={onTyping} hasNoteAlert={noteAlertTutorIds.has(selectedTutorId)} onNotesViewed={onNotesViewed} />
              : <p className="grid h-full place-items-center px-6 text-center text-sm text-j-ink-muted">Select a Tutor to view the conversation.</p>}
          </div>
        </div>}
  </div>;
}

export default function AdminTutorChats() {
  return <AdminWorkspaceLayout title="Tutor Chats">
    <div className="mx-auto w-full max-w-[100rem] pb-10">
      <AdminTutorChatsContent />
    </div>
  </AdminWorkspaceLayout>;
}
