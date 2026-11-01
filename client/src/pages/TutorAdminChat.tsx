import { BrandMark, brandWordmark } from "@/components/BrandMark";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { TUTOR_CHAT_TOPICS, isWithinBusinessHours, type TutorChatAccessMode } from "@shared/admin-control";
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
import { ChatSoundToggle, ChatVoiceNotePlayer, MessageStatusTicks, ScrollToBottomFloatingButton, useChatSoundAlert } from "@/components/chat/ChatRealtimeUX";
import { ChatMessageActionMenu, DeletedMessagePlaceholder, EditedMessageBadge, InlineMessageEditor, isWithinFiveMinutes } from "@/components/chat/ChatMessageLifecycle";
import { ChatDocumentCard, ChatDropzoneOverlay, ChatMediaGallery, ClipboardImagePreviewChip, parseImageUrls } from "@/components/chat/ChatAttachments";
import { ChatEmergencyCallWhatsAppActions, ChatOutOfOfficeBanner, ChatTuitionJobCard, PinnedJobBanner, ShareJobModal, extractJobIdsFromText } from "@/components/chat/ChatTuitionActions";
import {
  ChatDraftRestoredIndicator,
  ChatForwardModal,
  ChatShortcutsHelpPill,
  copyMessageToClipboard,
  useChatDraftPersistence,
  useChatKeyboardShortcuts,
} from "@/components/chat/ChatProductivityShortcuts";
import { motion } from "framer-motion";
import SearchInput from "@/components/SearchInput";
import { AlertTriangle, Bot, Briefcase, Check, Clock, CornerUpLeft, ExternalLink, Loader2, Maximize2, Mic, Paperclip, Phone, Plus, RotateCcw, Send, ShieldCheck, Sparkles, Square, ThumbsDown, ThumbsUp, User, WifiOff, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const CHAT_MESSAGE_MAX = 2000;
// A slow fallback only - the WebSocket carries the real "something arrived" signal.
const CHAT_POLL_MS = 20000;
const TYPING_PING_MS = 2000;
const TYPING_EXPIRES_MS = 3000;
const PAGE_SIZE = 30;

type ChatMessage = {
  id: number;
  senderRole: "tutor" | "admin";
  body: string;
  attachmentUrl: string | null;
  attachmentContentType: string | null;
  tutorReacted: boolean;
  adminReacted: boolean;
  createdAt: string | Date;
  isAiGenerated?: boolean | null;
  aiFeedback?: "helpful" | "unhelpful" | null;
  aiFeedbackNote?: string | null;
  aiActionChips?: Array<{ label: string; url: string; icon?: string }> | null;
};

const AI_QUICK_SUGGESTIONS = [
  { label: "আমার জন্য টিউশন আছে?", prompt: "আমার প্রোফাইলের সাথে মিলে এমন কোনো টিউশন বা জব আছে কি?" },
  { label: "ভেরিফিকেশন নিয়ম", prompt: "ভেরিফিকেশন হতে কত সময় লাগে এবং কী কী ডকুমেন্ট প্রয়োজন?" },
  { label: "সিভি ডাউনলোড", prompt: "আমার সিভি (CV) কীভাবে ডাউনলোড করবো?" },
  { label: "টিউশন ফি ও পেমেন্ট", prompt: "টিউশন প্ল্যাটফর্ম ফি ও পেমেন্টের নিয়ম কী?" },
  { label: "অনলাইন টিউশন ও দূরত্ব", prompt: "অনলাইন টিউশনে ট্রাভেল ডিসট্যান্স বা দূরত্বের নিয়ম কী?" },
  { label: "এডমিনের সাথে কথা বলা", prompt: "আমি জরুরি প্রয়োজনে সরাসরি একজন এডমিনের সাথে কথা বলতে চাই।" },
];

type OutboxMessage = {
  tempId: string;
  body: string;
  status: "sending" | "failed";
  createdAt: number;
};

function formatChatTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AttachmentView({ url, contentType, own, onImageClick, onImageLoad }: { url: string; contentType: string | null; own?: boolean; onImageClick?: (url: string) => void; onImageLoad?: () => void }) {
  if (contentType?.startsWith("image/") || url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
    return <ChatMediaGallery urls={parseImageUrls(url)} onImageClick={onImageClick} own={own} onImageLoad={onImageLoad} />;
  }
  if (contentType?.startsWith("audio/")) {
    return <ChatVoiceNotePlayer url={url} dark={own} />;
  }
  return <ChatDocumentCard url={url} own={own} />;
}

/**
 * The Tutor's one support thread with the site. Any Admin may reply, so the
 * Tutor only ever sees the sender as "Admin" - never a specific person - the
 * same "any Admin" shape as a bulk notice.
 */
const ineligibleChatNotices: Record<TutorChatAccessMode, { titleBn: string; descBn: string; subtitleEn: string }> = {
  appointed: {
    titleBn: "শুধুমাত্র নিয়োগপ্রাপ্ত টিউটরদের জন্য উন্মুক্ত",
    descBn: "কমপক্ষে একটি টিউশন নিয়োগ (Appointed) হওয়ার পর লাইভ চ্যাটে মেসেজ পাঠানো যাবে।",
    subtitleEn: "You can message the Admin team once at least one of your tuitions has been appointed.",
  },
  approved: {
    titleBn: "প্রোফাইল অনুমোদনের অপেক্ষায়",
    descBn: "আপনার টিউটর প্রোফাইল অ্যাডমিন কর্তৃক অনুমোদিত (Approved) হলে লাইভ চ্যাটে মেসেজ পাঠানো যাবে।",
    subtitleEn: "You can message the Admin team once your tutor profile has been approved.",
  },
  all: {
    titleBn: "লাইভ চ্যাট সাময়িক সীমিত",
    descBn: "বর্তমানে লাইভ চ্যাটে মেসেজ পাঠানো সীমিত রয়েছে।",
    subtitleEn: "You can message the Admin team once chat access is enabled.",
  },
  disabled: {
    titleBn: "লাইভ চ্যাট সাময়িকভাবে বন্ধ",
    descBn: "টিউটর লাইভ চ্যাট বর্তমানে সাময়িকভাবে বন্ধ রয়েছে।",
    subtitleEn: "Tutor live chat is temporarily disabled by admin.",
  },
};

export function TutorAdminChatPanel() {
  const utils = trpc.useUtils();
  const threadQuery = trpc.tutorAdminChat.thread.useQuery(undefined, {
    refetchInterval: CHAT_POLL_MS,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
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
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<number>>(() => new Set());
  const [editedMessages, setEditedMessages] = useState<Record<number, string>>({});
  const [activeActionMenuId, setActiveActionMenuId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [pastedImageFile, setPastedImageFile] = useState<File | null>(null);
  const [shareJobModalOpen, setShareJobModalOpen] = useState(false);
  const [forwardMessageBody, setForwardMessageBody] = useState<string | null>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [pinnedJobId, setPinnedJobId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("chat_pinned_job_tutor") || null;
    } catch {
      return null;
    }
  });

  const { hasRestoredDraft, clearDraft } = useChatDraftPersistence({
    threadKey: "tutor_main",
    body,
    setBody,
  });

  const handleTogglePin = (id: string) => {
    setPinnedJobId(prev => {
      const next = prev === id ? null : id;
      try {
        if (next) localStorage.setItem("chat_pinned_job_tutor", next);
        else localStorage.removeItem("chat_pinned_job_tutor");
      } catch {}
      return next;
    });
  };
  const dragCounter = useRef(0);
  const isOnline = useOnlineStatus();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasMarkedRead = useRef(false);
  const lastTypingPingAt = useRef(0);

  const send = trpc.tutorAdminChat.send.useMutation({
    onSuccess: async () => { setBody(""); await utils.tutorAdminChat.thread.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const markRead = trpc.tutorAdminChat.markRead.useMutation({ onSuccess: () => utils.tutorAdminChat.unreadCount.invalidate() });
  const react = trpc.tutorAdminChat.react.useMutation({ onSuccess: () => utils.tutorAdminChat.thread.invalidate() });
  const submitFeedback = trpc.tutorAdminChat.submitAiFeedback.useMutation({
    onSuccess: () => {
      toast.success("আপনার মতামতের জন্য ধন্যবাদ!");
      void utils.tutorAdminChat.thread.invalidate();
    },
    onError: error => toast.error(error.message || "মতামত গ্রহণে সমস্যা হয়েছে"),
  });
  const contact = useSiteContact();
  const [isCalling, setIsCalling] = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const portalToken = getCurrentTutorPortalToken();
  const sendFrame = useTutorChatSocket(
    portalToken,
    frame => {
      if (frame.type === "message" || frame.type === "access_mode") void utils.tutorAdminChat.thread.invalidate();
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
  const chatAccessMode: TutorChatAccessMode = threadQuery.data?.mode ?? "appointed";
  const adminLastReadAt = threadQuery.data?.adminLastReadAt ? new Date(threadQuery.data.adminLastReadAt).getTime() : null;
  const lastOwnMessage = [...allMessages].reverse().find(message => message.senderRole === "tutor" && !deletedMessageIds.has(message.id));
  const lastOwnMessageId = lastOwnMessage?.id;
  const lastOwnMessageBody = lastOwnMessage?.body;
  const adminIsTyping = adminTypingUntil > now;

  const { handleComposerKeyDown } = useChatKeyboardShortcuts({
    body,
    setBody,
    lastOwnMessageBody,
    onCancelEdit: () => setEditingMessageId(null),
    onCancelReply: () => setReplyingTo(null),
    onCancelActionMenu: () => setActiveActionMenuId(null),
    searchInputRef,
    onSubmit: () => void handleSubmit(),
  });

  const latestMessage = allMessages[allMessages.length - 1];
  const isLatestFromPeer = latestMessage?.senderRole === "admin";
  const { muted, toggleMute } = useChatSoundAlert({
    messageCount: allMessages.length,
    isLatestFromPeer,
  });

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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounter.current = 0;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const processed = file.type.startsWith("image/") ? await compressImage(file) : file;
      await uploadAndSend(processed);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const processed = await compressImage(file);
          setPastedImageFile(processed);
          toast.success("ছবি ক্লিপবোর্ড থেকে যুক্ত হয়েছে");
          return;
        }
      }
    }
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (pastedImageFile) {
      const fileToUpload = pastedImageFile;
      setPastedImageFile(null);
      await uploadAndSend(fileToUpload);
      return;
    }
    submitMessage();
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleComposerKeyDown(event);
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

  return <section
    onDragEnter={handleDragEnter}
    onDragLeave={handleDragLeave}
    onDragOver={handleDragOver}
    onDrop={handleDrop}
    className="relative flex h-[calc(100dvh-160px)] sm:h-[calc(100vh-220px)] min-h-[340px] sm:min-h-[420px] flex-col overflow-hidden rounded-xl border border-j-border bg-white shadow-[0_10px_26px_-18px_rgba(38,83,117,0.5)]"
  >
    <ChatDropzoneOverlay isDragging={isDraggingOver} />
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 px-4 py-3 text-white shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="grid size-9 place-items-center rounded-xl bg-white/15 text-white backdrop-blur-xs">
          <Bot size={20} />
        </div>
        <div>
          <div className="brand-logo flex items-center gap-2 text-white" style={{ fontSize: "16px" }}>
            <BrandMark />
            <span className="brand-wordmark flex text-white"><strong className="text-white">{brandWordmark.primary}</strong><em className="text-sky-200">{brandWordmark.secondary}</em></span>
          </div>
          <p className="text-3xs text-sky-100 font-medium">
            কানেক্ট টিউটরস (Member: BTPA-077) · সার্বক্ষণিক এআই ও অ্যাডমিন সহায়তা
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {!isOnline ? (
          <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-800">
            <WifiOff className="size-2.5" /> Offline
          </span>
        ) : connectionStatus === "connected" ? (
          <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2 py-0.5 text-2xs font-bold text-emerald-200" title="Connected in real-time">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
        ) : null}
        <ChatEmergencyCallWhatsAppActions contact={contact} />
        <ChatSoundToggle muted={muted} onToggle={toggleMute} />
      </div>
    </header>

    <ChatOutOfOfficeBanner />
    {Boolean(threadQuery.data?.aiEscalatedAt) && (
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
        <AlertTriangle size={15} className="shrink-0 text-amber-600" />
        <span>আপনার মেসেজটি পর্যালোচনা ও ফলো-আপের জন্য এডমিন টিমের কাছে এসকেলেট করা হয়েছে। এডমিন দ্রুত রেসপন্স করবেন।</span>
      </div>
    )}
    {pinnedJobId ? (
      <PinnedJobBanner jobId={pinnedJobId} onUnpin={() => handleTogglePin(pinnedJobId)} />
    ) : null}

    <div className="border-b border-[#dce9f1] p-3">
      <SearchInput
        ref={searchInputRef}
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

    <div ref={scrollContainerRef} className="relative min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
        const isDeleted = deletedMessageIds.has(message.id);
        const currentBody = editedMessages[message.id] ?? message.body;
        const jobIds = !isDeleted ? extractJobIdsFromText(currentBody) : [];
        const isEdited = !!editedMessages[message.id];
        const isEditing = editingMessageId === message.id;
        const seen = own && message.id === lastOwnMessageId && adminLastReadAt !== null && new Date(message.createdAt).getTime() <= adminLastReadAt;
        const prevMessage = index > 0 ? visibleMessages[index - 1] : null;
        const showDateDivider = !prevMessage || isDifferentDay(prevMessage.createdAt, message.createdAt);

        return (
          <React.Fragment key={message.id}>
            {showDateDivider ? <ChatDateDivider date={message.createdAt} /> : null}
            <ChatAnimatedBubble own={own} className={`relative flex flex-col ${own ? "items-end" : "items-start"}`}>
              <motion.div
                whileTap={!isDeleted && !isEditing ? { scale: 0.98 } : undefined}
                transition={{ duration: 0.12 }}
                onClick={() => {
                  if (!isDeleted && !isEditing) {
                    setActiveActionMenuId(prev => (prev === message.id ? null : message.id));
                  }
                }}
                className={`max-w-[80%] px-4 py-2.5 shadow-xs cursor-pointer select-text transition-shadow ${
                  own
                    ? "rounded-2xl rounded-tr-xs bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-2xs"
                    : "rounded-2xl rounded-tl-xs border border-sky-100 bg-white text-j-ink shadow-2xs"
                }`}
              >
                {!own ? (
                  <div className="mb-1 flex items-center gap-1.5">
                    {message.isAiGenerated ? (
                      <>
                        <Bot className="size-3 text-sky-600" />
                        <p className="text-2xs font-extrabold text-sky-800">কানেক্ট টিউটরস এআই</p>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.2 text-3xs font-bold text-sky-700 border border-sky-200">
                          <Sparkles className="size-2 text-sky-600" />
                          AI Assistant
                        </span>
                      </>
                    ) : (
                      <>
                        <Bot className="size-3 text-indigo-600" />
                        <p className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Admin</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mb-1 flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-white/80">
                    <span>আপনি</span>
                    <User size={10} />
                  </div>
                )}
                {isDeleted ? (
                  <DeletedMessagePlaceholder own={own} />
                ) : isEditing ? (
                  <InlineMessageEditor
                    initialText={currentBody}
                    onSave={newText => {
                      setEditedMessages(prev => ({ ...prev, [message.id]: newText }));
                      setEditingMessageId(null);
                      toast.success("মেসেজটি সম্পাদিত হয়েছে");
                    }}
                    onCancel={() => setEditingMessageId(null)}
                  />
                ) : (
                  <>
                    {currentBody ? <ChatMessageBody text={currentBody} query={query} /> : null}
                    {message.attachmentUrl ? (
                      <AttachmentView
                        url={message.attachmentUrl}
                        contentType={message.attachmentContentType}
                        own={own}
                        onImageClick={setLightboxUrl}
                        onImageLoad={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                      />
                    ) : null}
                  </>
                )}
                <div className="mt-1 flex items-center gap-1">
                  <p className={`text-2xs font-semibold ${own ? "text-white/70" : "text-j-ink-faint"}`}>
                    {formatChatTime(message.createdAt)}
                  </p>
                  {isEdited ? <EditedMessageBadge own={own} /> : null}
                </div>
              </motion.div>

              {!own && message.isAiGenerated && message.aiActionChips && message.aiActionChips.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                  {message.aiActionChips.map((chip, chipIdx) => (
                    <a
                      key={chipIdx}
                      href={chip.url}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-3xs font-bold text-sky-800 shadow-2xs hover:bg-sky-100 hover:border-sky-300 transition-colors"
                    >
                      <span>{chip.label}</span>
                      <ExternalLink size={9} />
                    </a>
                  ))}
                </div>
              ) : null}

              {jobIds.map(jid => (
                <ChatTuitionJobCard
                  key={jid}
                  jobId={jid}
                  isPinned={pinnedJobId === jid}
                  onTogglePin={handleTogglePin}
                />
              ))}

              <ChatMessageActionMenu
                messageId={message.id}
                createdAt={message.createdAt}
                body={currentBody}
                isOwn={own}
                isDeleted={isDeleted}
                isOpen={activeActionMenuId === message.id}
                onClose={() => setActiveActionMenuId(null)}
                onEdit={() => {
                  setEditingMessageId(message.id);
                  setActiveActionMenuId(null);
                }}
                onDelete={() => {
                  setDeletedMessageIds(prev => new Set(prev).add(message.id));
                  setActiveActionMenuId(null);
                  toast.info("মেসেজটি সবার জন্য মুছে ফেলা হয়েছে");
                }}
                onCopy={text => {
                  copyMessageToClipboard(text);
                }}
                onForward={(msgId, text) => {
                  setForwardMessageBody(text);
                  setActiveActionMenuId(null);
                }}
                onReply={() => setReplyingTo({ id: message.id, body: currentBody, senderRole: message.senderRole })}
              />

              {!isDeleted ? (
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
                    onClick={() => setReplyingTo({ id: message.id, body: currentBody, senderRole: message.senderRole })}
                    title="Reply to this message"
                    aria-label="Reply to this message"
                    className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-semibold text-j-ink-faint hover:bg-j-surface-sunken hover:text-j-ink-soft transition-colors"
                  >
                    <CornerUpLeft className="size-3" />
                    <span>Reply</span>
                  </button>
                  {!own && message.isAiGenerated ? (
                    <div className="inline-flex items-center gap-1 border-l border-j-border/60 pl-1.5">
                      <span className="text-3xs font-semibold text-j-ink-faint mr-0.5">সহায়ক?</span>
                      <button
                        type="button"
                        onClick={() => submitFeedback.mutate({ messageId: message.id, feedback: "helpful" })}
                        disabled={submitFeedback.isPending}
                        title="সহায়ক উত্তর (Helpful)"
                        aria-label="Helpful AI response"
                        className={`p-1 rounded-full text-2xs transition-colors ${
                          message.aiFeedback === "helpful"
                            ? "bg-emerald-100 text-emerald-700 font-bold ring-1 ring-emerald-300"
                            : "text-j-ink-faint hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        <ThumbsUp size={11} className={message.aiFeedback === "helpful" ? "fill-emerald-600 text-emerald-600" : ""} />
                      </button>
                      <button
                        type="button"
                        onClick={() => submitFeedback.mutate({ messageId: message.id, feedback: "unhelpful" })}
                        disabled={submitFeedback.isPending}
                        title="অপ্রাসঙ্গিক বা ভুল (Unhelpful)"
                        aria-label="Unhelpful AI response"
                        className={`p-1 rounded-full text-2xs transition-colors ${
                          message.aiFeedback === "unhelpful"
                            ? "bg-rose-100 text-rose-700 font-bold ring-1 ring-rose-300"
                            : "text-j-ink-faint hover:text-rose-600 hover:bg-rose-50"
                        }`}
                      >
                        <ThumbsDown size={11} className={message.aiFeedback === "unhelpful" ? "fill-rose-600 text-rose-600" : ""} />
                      </button>
                    </div>
                  ) : null}
                  {message.adminReacted ? <span className="text-2xs font-semibold text-j-ink-faint">👍 Admin</span> : null}
                  {own ? (
                    <MessageStatusTicks status={seen ? "seen" : "delivered"} />
                  ) : null}
                </div>
              ) : null}
            </ChatAnimatedBubble>
          </React.Fragment>
        );
      })}

      {outbox.map(item => (
        <ChatAnimatedBubble key={item.tempId} own={true} className="flex flex-col items-end">
          <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-xs ${item.status === "failed" ? "border border-red-300 bg-red-50 text-red-900" : "bg-gradient-to-br from-j-accent/90 to-[#156cb6]/90 text-white"}`}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>
            <div className="mt-1 flex items-center justify-end gap-1 text-2xs font-medium opacity-80">
              {item.status === "sending" ? (
                <>
                  <MessageStatusTicks status="sending" />
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
      <ScrollToBottomFloatingButton
        containerRef={scrollContainerRef}
        onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
      />
      <div ref={bottomRef} />
    </div>

    {threadQuery.isLoading ? (
      <div className="border-t border-[#dce9f1] bg-j-surface-sunken/30 p-4 text-center">
        <div className="mx-auto flex items-center justify-center gap-2 text-xs text-j-ink-muted">
          <div className="size-3.5 animate-spin rounded-full border-2 border-j-accent border-t-transparent" />
          <span>লাইভ চ্যাট তথ্য যাচাই করা হচ্ছে…</span>
        </div>
      </div>
    ) : threadQuery.isError ? (
      <div className="border-t border-[#dce9f1] bg-red-50/50 p-4 text-center">
        <div className="mx-auto max-w-sm space-y-1">
          <p className="text-xs font-semibold text-red-600">চ্যাট তথ্য লোড হতে সমস্যা হয়েছে।</p>
          <button
            type="button"
            onClick={() => void threadQuery.refetch()}
            className="text-xs font-bold text-j-accent underline hover:text-sky-700"
          >
            পুনরায় চেষ্টা করুন (Retry)
          </button>
        </div>
      </div>
    ) : eligible ? (
      <div className="border-t border-[#dce9f1]">
          {uploadProgress !== null
            ? <div className="h-0.5 w-full bg-j-surface-muted">
                <div className="h-full bg-j-accent transition-[width]" style={{ width: `${uploadProgress}%` }} />
              </div>
            : null}
          {pastedImageFile ? (
            <div className="p-3 pb-0">
              <ClipboardImagePreviewChip file={pastedImageFile} onRemove={() => setPastedImageFile(null)} />
            </div>
          ) : null}
          <ReplyPreviewBar replyingTo={replyingTo} onCancel={() => setReplyingTo(null)} currentRole="tutor" />
          <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 pt-2">
            {hasRestoredDraft ? <ChatDraftRestoredIndicator onClear={clearDraft} /> : <div />}
            <ChatShortcutsHelpPill />
          </div>
          {!isWithinBusinessHours(new Date()) ? (
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/70 px-3 py-1.5 text-2xs font-semibold text-amber-900">
              <Clock className="size-3 text-amber-600 shrink-0" />
              <span>অফিস আওয়ারের বাইরে (নিয়মিত সময়: সকাল ১০টা – রাত ৮টা)। মেসেজ পাঠিয়ে রাখুন, টিম অনলাইন হয়ে দ্রুত উত্তর দেবে।</span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#eef3f7] bg-slate-50/60 px-3 py-1.5 text-2xs">
            <span className="font-bold text-j-ink-muted">বিষয় নির্বাচন:</span>
            {TUTOR_CHAT_TOPICS.map(topic => {
              const isSelected = body.startsWith(topic.prefix) || body.includes(`[বিষয়: ${topic.label}]`) || body.includes(`[বিষয়: ${topic.label}]`);
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setBody(prev => {
                      let clean = prev;
                      for (const t of TUTOR_CHAT_TOPICS) {
                        if (clean.startsWith(t.prefix)) {
                          clean = clean.slice(t.prefix.length).trimStart();
                        } else if (clean.startsWith(`[বিষয়: ${t.label}]`)) {
                          clean = clean.slice(`[বিষয়: ${t.label}]`.length).trimStart();
                        } else if (clean.startsWith(`[বিষয়: ${t.label}]`)) {
                          clean = clean.slice(`[বিষয়: ${t.label}]`.length).trimStart();
                        }
                      }
                      if (isSelected) {
                        return clean;
                      }
                      return clean ? `${topic.prefix} ${clean}` : `${topic.prefix} `;
                    });
                  }}
                  className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-2xs font-semibold transition-colors ${
                    isSelected
                      ? "border-sky-300 bg-sky-100 text-[#1267c8] shadow-xs"
                      : "border-slate-200 bg-white text-j-ink-soft hover:border-sky-200 hover:bg-sky-50/50 hover:text-[#1267c8]"
                  }`}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5 overflow-x-auto border-b border-sky-100 bg-sky-50/60 p-2 scrollbar-none items-center">
            <span className="shrink-0 flex items-center gap-1 text-3xs font-extrabold text-sky-800 uppercase tracking-wider pl-1">
              <Sparkles className="size-3 text-sky-600 shrink-0" />
              <span>দ্রুত প্রশ্ন (AI):</span>
            </span>
            {AI_QUICK_SUGGESTIONS.map(item => (
              <button
                key={item.label}
                type="button"
                onClick={() => setBody(item.prompt)}
                className="shrink-0 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-3xs font-bold text-sky-800 shadow-2xs hover:bg-sky-100 hover:border-sky-300 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={handleAttach} />
            {voiceRecorder.recording ? (
              <VoiceRecordingBar onStop={handleMic} onCancel={voiceRecorder.cancel} />
            ) : (
              <>
            {/* Mobile action drawer toggle button */}
            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setMobileActionsOpen(prev => !prev)}
                aria-label={mobileActionsOpen ? "Close actions menu" : "More attachment and chat actions"}
                aria-expanded={mobileActionsOpen}
                className={`grid h-control w-10 shrink-0 place-items-center rounded-xl border transition-colors ${
                  mobileActionsOpen
                    ? "border-j-accent bg-j-accent-wash text-j-accent"
                    : "border-j-border text-j-ink-soft hover:bg-j-surface-sunken"
                }`}
              >
                <Plus className={`size-4 transition-transform duration-200 ${mobileActionsOpen ? "rotate-45" : ""}`} />
              </button>

              {mobileActionsOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
                    onClick={() => setMobileActionsOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="fixed inset-x-3 bottom-18 z-40 flex items-center justify-around gap-2 rounded-2xl border border-j-border bg-white p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileActionsOpen(false);
                        fileInputRef.current?.click();
                      }}
                      disabled={uploadProgress !== null}
                      aria-label="Attach a file"
                      className="flex flex-col items-center gap-1 text-2xs font-semibold text-j-ink-soft"
                    >
                      <span className="grid size-10 place-items-center rounded-xl border border-j-border bg-j-surface-sunken text-j-ink">
                        <Paperclip className="size-4" />
                      </span>
                      <span>ফাইল/ছবি</span>
                    </button>

                    {voiceRecorder.supported ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileActionsOpen(false);
                          void handleMic();
                        }}
                        disabled={uploadProgress !== null}
                        aria-label="Record a voice note"
                        className="flex flex-col items-center gap-1 text-2xs font-semibold text-j-ink-soft"
                      >
                        <span className="grid size-10 place-items-center rounded-xl border border-j-border bg-j-surface-sunken text-j-ink">
                          <Mic className="size-4" />
                        </span>
                        <span>ভয়েস</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setMobileActionsOpen(false);
                        setShareJobModalOpen(true);
                      }}
                      disabled={uploadProgress !== null}
                      aria-label="টিউশন জব কার্ড শেয়ার করুন"
                      title="টিউশন শেয়ার করুন"
                      className="flex flex-col items-center gap-1 text-2xs font-semibold text-j-ink-soft"
                    >
                      <span className="grid size-10 place-items-center rounded-xl border border-j-border bg-j-surface-sunken text-j-ink">
                        <Briefcase className="size-4" />
                      </span>
                      <span>টিউশন কার্ড</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex sm:items-center sm:gap-2">
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
                <button
                  type="button"
                  onClick={() => setShareJobModalOpen(true)}
                  disabled={uploadProgress !== null}
                  aria-label="টিউশন জব কার্ড শেয়ার করুন"
                  title="টিউশন শেয়ার করুন"
                  className="grid h-control w-control shrink-0 place-items-center rounded-xl border border-j-border text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-50"
                >
                  <Briefcase className="size-4" />
                </button>
                </div>
                <Textarea
                  value={body}
                  onChange={event => { setBody(event.target.value); pingTyping(); }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  maxLength={CHAT_MESSAGE_MAX}
                  rows={1}
                  enterKeyHint="send"
                  placeholder="Write a message…"
                  className="min-h-9 flex-1 resize-none py-2 text-sm leading-relaxed"
                />
                <ChatSendButton ariaLabel="Send message" disabled={(!body.trim() && !pastedImageFile) || send.isPending || uploadProgress !== null} isPending={send.isPending} className="bg-gradient-to-tr from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-md" />
              </>
            )}
          </form>
        </div>
    ) : (
      <div className="border-t border-[#dce9f1] bg-j-surface-sunken/40 p-4 text-center">
          <div className="mx-auto max-w-lg space-y-1.5">
            <p className="text-sm font-bold text-j-ink-strong">
              {ineligibleChatNotices[chatAccessMode]?.titleBn ?? ineligibleChatNotices.appointed.titleBn}
            </p>
            <p className="text-xs leading-relaxed text-j-ink-soft">
              {ineligibleChatNotices[chatAccessMode]?.descBn ?? ineligibleChatNotices.appointed.descBn}
            </p>
            <p className="text-2xs text-j-ink-faint">
              {ineligibleChatNotices[chatAccessMode]?.subtitleEn ?? ineligibleChatNotices.appointed.subtitleEn}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <a
                href={contact.whatsapp("আসসালামু আলাইকুম, আমি টিউটর সাপোর্ট চাই।")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                <WhatsAppIcon className="size-3.5 fill-emerald-600" />
                WhatsApp-এ মেসেজ দিন
              </a>
              <a
                href={contact.tel}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-j-border bg-white px-3 text-xs font-semibold text-j-ink-strong transition-colors hover:bg-j-surface-sunken"
              >
                <Phone className="size-3.5 text-j-accent" />
                হেল্পলাইনে কল করুন ({contact.display})
              </a>
            </div>
          </div>
        </div>
    )}
    <ImageLightboxModal url={lightboxUrl} onClose={() => setLightboxUrl(null)} title="Attachment Preview" />
    {shareJobModalOpen ? (
      <ShareJobModal
        onSelectJob={jobTag => setBody(prev => (prev ? `${prev} ${jobTag}` : jobTag))}
        onClose={() => setShareJobModalOpen(false)}
      />
    ) : null}
    {forwardMessageBody ? (
      <ChatForwardModal
        messageBody={forwardMessageBody}
        onClose={() => setForwardMessageBody(null)}
        onForwardToComposer={(text: string) => setBody(prev => (prev ? `${prev}\n${text}` : text))}
      />
    ) : null}
  </section>;
}
