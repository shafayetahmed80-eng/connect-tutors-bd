import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/useMobile";
import { useAdminChatSocket } from "@/hooks/useChatSocket";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { trpc } from "@/lib/trpc";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import { ArchiveRestore, ArrowLeft, BellRing, ListPlus, Mic, Paperclip, Search, Send, Square, StickyNote, ThumbsUp, UserRound, UserRoundCheck, UserRoundX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";

const CHAT_MESSAGE_MAX = 2000;
// A slow fallback only - the WebSocket carries the real "something arrived" signal.
const CHAT_POLL_MS = 20000;
const TYPING_EXPIRES_MS = 3000;
const STARTER_MESSAGE = "Hi, this is the Connect Tutors Admin team. Let us know if you have any questions about your profile, tuitions, or account.";

type ChatMessage = { id: number; senderRole: "tutor" | "admin"; body: string; attachmentUrl: string | null; attachmentContentType: string | null; tutorReacted: boolean; adminReacted: boolean; createdAt: string | Date };
type ChatThreadRow = { tutorId: string; tutorName: string; tutorNumber: number | null; lastMessageAt: string | Date | null; lastMessagePreview: string | null; unreadCount: number; claimedByAdminId: number | null; claimedByAdminName: string | null };

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

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

/** Lets an Admin turn on desktop push alerts for a new Tutor message - useful exactly when this tab is not the one they are looking at. Renders nothing on a deployment with no VAPID keys configured, or a browser that cannot do push. */
function ChatPushToggle() {
  const keyQuery = trpc.admin.getChatPushPublicKey.useQuery();
  const subscribeMutation = trpc.admin.subscribeChatPush.useMutation();
  const unsubscribeMutation = trpc.admin.unsubscribeChatPush.useMutation();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

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
function QuickRepliesMenu({ onInsert }: { onInsert: (body: string) => void }) {
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [label, setLabel] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const utils = trpc.useUtils();
  const listQuery = trpc.admin.listChatQuickReplies.useQuery(undefined, { enabled: open });
  const create = trpc.admin.createChatQuickReply.useMutation({
    onSuccess: () => { setLabel(""); setDraftBody(""); void utils.admin.listChatQuickReplies.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.admin.deleteChatQuickReply.useMutation({ onSuccess: () => void utils.admin.listChatQuickReplies.invalidate() });
  const items = listQuery.data?.items ?? [];

  const submitNew = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedLabel = label.trim();
    const trimmedBody = draftBody.trim();
    if (!trimmedLabel || !trimmedBody) return;
    create.mutate({ label: trimmedLabel, body: trimmedBody });
  };

  return <div className="relative">
    <button type="button" onClick={() => setOpen(value => !value)} aria-label="Quick replies" aria-expanded={open} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-j-border text-j-ink-soft hover:bg-j-surface-sunken">
      <ListPlus className="size-4" />
    </button>
    {open ? <div className="absolute bottom-12 left-0 z-10 w-72 rounded-xl border border-j-border bg-white p-2 shadow-lg">
      <div className="flex items-center justify-between px-1 pb-1.5">
        <p className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Quick replies</p>
        <button type="button" onClick={() => setManaging(value => !value)} className="text-2xs font-bold text-j-accent">{managing ? "Done" : "Manage"}</button>
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {items.length === 0 ? <p className="px-1.5 py-2 text-xs text-j-ink-muted">No quick replies yet.</p> : null}
        {items.map(item => <div key={item.id} className="flex items-start gap-1.5 rounded-lg px-1.5 py-1.5 hover:bg-j-surface-sunken">
          <button type="button" onClick={() => { onInsert(item.body); setOpen(false); }} className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-bold text-j-ink">{item.label}</p>
            <p className="truncate text-2xs text-j-ink-muted">{item.body}</p>
          </button>
          {managing ? <button type="button" onClick={() => remove.mutate({ id: item.id })} aria-label={`Delete ${item.label}`} className="shrink-0 text-2xs font-bold text-red-600">Delete</button> : null}
        </div>)}
      </div>
      {managing ? <form onSubmit={submitNew} className="mt-2 space-y-1.5 border-t border-j-border pt-2">
        <input value={label} onChange={event => setLabel(event.target.value)} placeholder="Short label" maxLength={60} className="h-8 w-full rounded-lg border border-j-border px-2 text-xs outline-none focus:border-j-accent" />
        <Textarea value={draftBody} onChange={event => setDraftBody(event.target.value)} placeholder="Reply text" rows={2} className="text-xs" />
        <Button type="submit" size="sm" disabled={!label.trim() || !draftBody.trim() || create.isPending} className="w-full">Add quick reply</Button>
      </form> : null}
    </div> : null}
  </div>;
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

  return <Modal size="sm" onClose={onClose}>
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

/** The Admin's list of every Tutor who has written in - newest activity first, unread ones easy to spot. */
function ThreadList({ selectedTutorId, onSelect, archived, onArchivedChange }: { selectedTutorId: string | null; onSelect: (tutorId: string) => void; archived: boolean; onArchivedChange: (value: boolean) => void }) {
  const [query, setQuery] = useState("");
  const threadsQuery = trpc.admin.listTutorChatThreads.useQuery({ query, page: 1, pageSize: 50, archived });
  const items = (threadsQuery.data?.items ?? []) as ChatThreadRow[];

  return <div className="flex h-full flex-col">
    <div className="flex shrink-0 border-b border-[#dce9f1]">
      <button type="button" onClick={() => onArchivedChange(false)} aria-current={!archived ? "true" : undefined} className={`flex-1 border-b-2 py-2 text-xs font-bold ${!archived ? "border-j-accent text-j-accent" : "border-transparent text-j-ink-soft"}`}>Active</button>
      <button type="button" onClick={() => onArchivedChange(true)} aria-current={archived ? "true" : undefined} className={`flex-1 border-b-2 py-2 text-xs font-bold ${archived ? "border-j-accent text-j-accent" : "border-transparent text-j-ink-soft"}`}>Archived</button>
    </div>
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
    <div className="min-h-0 flex-1 overflow-y-auto">
      {threadsQuery.isLoading ? <p className="p-4 text-center text-sm font-semibold text-j-ink-muted">Loading conversations…</p> : null}
      {!threadsQuery.isLoading && items.length === 0
        ? <p className="p-4 text-center text-sm text-j-ink-muted">{query ? "Nothing matches that search." : archived ? "No archived conversations." : "No Tutor has written in yet."}</p>
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
  }, [messages.length]);

  const submitMessage = () => {
    const trimmed = body.trim();
    if (!trimmed || send.isPending) return;
    send.mutate({ tutorId, body: trimmed });
  };
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
      send.mutate({ tutorId, body: body.trim(), attachmentKey: result.key, attachmentContentType: result.contentType });
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

  return <div className="flex h-full min-h-0 flex-col">
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#dce9f1] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack ? <button type="button" onClick={onBack} aria-label="Back to Tutor list" className="grid size-8 shrink-0 place-items-center rounded-lg text-j-ink-soft hover:bg-j-surface-sunken"><ArrowLeft size={18} /></button> : null}
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
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
        <label className="relative hidden shrink-0 sm:block">
          <span className="sr-only">Search this conversation</span>
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-j-ink-faint" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search" className="h-8 w-32 rounded-lg border border-j-border bg-white pl-7 pr-2 text-xs outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
        </label>
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
      {!threadQuery.isLoading && messages.length === 0 ? <p className="pt-8 text-center text-sm text-j-ink-muted">{query ? "Nothing matches that search." : "No messages yet."}</p> : null}
      {messages.map(message => {
        const own = message.senderRole === "admin";
        const seen = own && message.id === lastOwnMessageId && tutorLastReadAt !== null && new Date(message.createdAt).getTime() <= tutorLastReadAt;
        return <div key={message.id} className={`flex animate-in fade-in slide-in-from-bottom-1 flex-col duration-200 motion-reduce:animate-none ${own ? "items-end" : "items-start"}`}>
          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${own ? "bg-j-accent text-white" : "border border-j-border bg-j-surface-muted text-j-ink"}`}>
            {!own ? <p className="mb-0.5 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Tutor</p> : null}
            {message.body ? <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p> : null}
            {message.attachmentUrl ? <AttachmentView url={message.attachmentUrl} contentType={message.attachmentContentType} /> : null}
            <p className={`mt-1 text-2xs font-semibold ${own ? "text-white/70" : "text-j-ink-faint"}`}>{formatChatTime(message.createdAt)}</p>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 px-1">
            <button
              type="button"
              onClick={() => react.mutate({ tutorId, messageId: message.id })}
              aria-pressed={message.adminReacted}
              aria-label={message.adminReacted ? "Remove your 👍" : "React with 👍"}
              className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-bold ${message.adminReacted ? "text-j-accent" : "text-j-ink-faint hover:text-j-ink-soft"}`}
            >
              <ThumbsUp className="size-3" fill={message.adminReacted ? "currentColor" : "none"} />
            </button>
            {message.tutorReacted ? <span className="text-2xs font-semibold text-j-ink-faint">👍 Tutor</span> : null}
            {seen ? <span className="text-2xs font-semibold text-j-ink-faint">Seen</span> : null}
          </div>
        </div>;
      })}
      {tutorIsTyping ? <p className="text-2xs font-semibold italic text-j-ink-faint">Tutor is typing…</p> : null}
      <div ref={bottomRef} />
    </div>

    <div className="border-t border-[#dce9f1]">
      {uploadProgress !== null
        ? <div className="h-0.5 w-full bg-j-surface-muted">
            <div className="h-full bg-j-accent transition-[width]" style={{ width: `${uploadProgress}%` }} />
          </div>
        : null}
      <form onSubmit={handleSubmit} className="flex items-end gap-1.5 p-3 sm:gap-2">
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={handleAttach} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadProgress !== null || voiceRecorder.recording} aria-label="Attach a file" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-j-border text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-50">
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
                disabled={uploadProgress !== null}
                aria-label={voiceRecorder.recording ? "Stop recording and send the voice note" : "Record a voice note"}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border disabled:opacity-50 ${voiceRecorder.recording ? "animate-pulse border-red-300 bg-red-50 text-red-600" : "border-j-border text-j-ink-soft hover:bg-j-surface-sunken"}`}
              >
                {voiceRecorder.recording ? <Square className="size-4" /> : <Mic className="size-4" />}
              </button>
            </>
          : null}
        <QuickRepliesMenu onInsert={text => setBody(current => (current ? `${current} ${text}` : text))} />
        <Textarea
          value={body}
          onChange={event => { setBody(event.target.value); onTyping(); }}
          onKeyDown={handleKeyDown}
          maxLength={CHAT_MESSAGE_MAX}
          rows={2}
          placeholder="Reply as Admin…"
          className="min-h-9 flex-1 resize-none"
        />
        <Button type="submit" size="icon" aria-label="Send reply" disabled={!body.trim() || send.isPending || uploadProgress !== null} className="h-10 w-10 shrink-0 rounded-xl">
          <Send className="size-4" />
        </Button>
      </form>
    </div>

    {notesOpen ? <ChatNotesModal tutorId={tutorId} onClose={() => setNotesOpen(false)} /> : null}
  </div>;
}

export function AdminTutorChatsContent() {
  const isMobile = useIsMobile();
  const search = useSearch();
  const utils = trpc.useUtils();
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(() => new URLSearchParams(search).get("tutorId"));
  const [archived, setArchived] = useState(false);
  const [noteAlertTutorIds, setNoteAlertTutorIds] = useState<ReadonlySet<string>>(new Set());
  const [typingTutorId, setTypingTutorId] = useState<string | null>(null);
  const [typingUntil, setTypingUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const frameClassName = "h-[calc(100vh-236px)] min-h-[420px] overflow-hidden rounded-xl border border-j-border bg-white shadow-[0_10px_26px_-18px_rgba(38,83,117,0.5)]";

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
    {isMobile
      ? <div className={frameClassName}>
          {selectedTutorId
            ? <ThreadPanel tutorId={selectedTutorId} onBack={() => setSelectedTutorId(null)} tutorIsTyping={tutorIsTyping} onTyping={onTyping} hasNoteAlert={noteAlertTutorIds.has(selectedTutorId)} onNotesViewed={onNotesViewed} />
            : <ThreadList selectedTutorId={selectedTutorId} onSelect={setSelectedTutorId} archived={archived} onArchivedChange={setArchived} />}
        </div>
      : <div className={`grid min-h-0 grid-cols-[320px_1fr] ${frameClassName}`}>
          <div className="min-h-0 border-r border-[#dce9f1]"><ThreadList selectedTutorId={selectedTutorId} onSelect={setSelectedTutorId} archived={archived} onArchivedChange={setArchived} /></div>
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
