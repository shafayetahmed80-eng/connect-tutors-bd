import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { ChatSendButton } from "@/components/chat/ChatMotion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function formatGuardianChatTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleTimeString("bn-BD", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

const GUARDIAN_QUICK_PRESETS = [
  "আসসালামু আলাইকুম! কানেক্ট টিউটরস এডমিন টিম থেকে জানাচ্ছি। আপনার কি ধরনের টিউটর প্রয়োজন বিস্তারিত জানাবেন?",
  "ধন্যবাদ মেসেজ দেওয়ার জন্য। আমরা আপনার রিকোয়েস্টটি দ্রুত রিভিউ করে সেরা টিউটর প্রপোজাল পাঠাচ্ছি।",
  "আপনার সাথে সরাসরি ফোনে বিস্তারিত কথা বলতে চাচ্ছি। উপযুক্ত সময় জানাবেন প্লিজ।",
  "আপনার সমস্যাটির সমাধান করা হয়েছে। আর কোনো তথ্য জানার থাকলে অবশ্যই জানাবেন।",
];

export function AdminGuardianChatsPanel() {
  const isMobile = useIsMobile();
  const utils = trpc.useUtils();

  const [query, setQuery] = useState("");
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const threadsQuery = trpc.admin.listGuardianChatThreads.useQuery(
    { query, page: 1, pageSize: 50, escalatedOnly },
    { refetchInterval: 15000 }
  );

  const activeThreadQuery = trpc.admin.getGuardianChatThread.useQuery(
    { threadId: selectedThreadId! },
    { enabled: selectedThreadId !== null, refetchInterval: 8000 }
  );

  // Mutations
  const sendMutation = trpc.admin.sendGuardianChatMessage.useMutation({
    onSuccess: () => {
      setReplyBody("");
      void utils.admin.getGuardianChatThread.invalidate({ threadId: selectedThreadId! });
      void utils.admin.listGuardianChatThreads.invalidate();
      toast.success("মেসেজ সফলভাবে পাঠানো হয়েছে");
    },
    onError: err => {
      toast.error(`মেসেজ পাঠানো যায়নি: ${err.message}`);
    },
  });

  const resolveEscalationMutation = trpc.admin.resolveGuardianChatEscalation.useMutation({
    onSuccess: () => {
      void utils.admin.getGuardianChatThread.invalidate({ threadId: selectedThreadId! });
      void utils.admin.listGuardianChatThreads.invalidate();
      toast.success("এসকেলেশন সফলভাবে রিসলভ করা হয়েছে");
    },
    onError: err => {
      toast.error(`এসকেলেশন আপডেট ব্যর্থ: ${err.message}`);
    },
  });

  const threads = useMemo(() => threadsQuery.data?.items ?? [], [threadsQuery.data]);
  const activeThreadData = activeThreadQuery.data;

  // Auto-scroll to bottom on thread load or message update
  useEffect(() => {
    if (activeThreadData?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThreadData?.messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = replyBody.trim();
    if (!trimmed || !selectedThreadId || sendMutation.isPending) return;

    sendMutation.mutate({
      threadId: selectedThreadId,
      body: trimmed,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const frameClassName = "h-[calc(100dvh-260px)] sm:h-[calc(100vh-340px)] min-h-[380px] sm:min-h-[460px] overflow-hidden rounded-xl border border-j-border bg-white shadow-[0_10px_26px_-18px_rgba(38,83,117,0.5)]";

  const renderThreadList = () => (
    <div className="flex h-full flex-col">
      {/* Search and Filters */}
      <div className="border-b border-[#dce9f1] p-3 space-y-2 bg-slate-50/50">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="অভিভাবকের নাম, ফোন বা আইডি দিয়ে খুঁজুন..."
            className="w-full h-9 rounded-lg border border-j-border bg-white pl-9 pr-8 text-xs font-semibold text-j-ink outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setEscalatedOnly(false)}
            className={`rounded-lg px-2.5 py-1 text-2xs font-bold transition-colors ${
              !escalatedOnly
                ? "bg-j-accent text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            সব চ্যাট ({threadsQuery.data?.total ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setEscalatedOnly(true)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-2xs font-bold transition-colors ${
              escalatedOnly
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            <AlertTriangle className="size-3" />
            <span>এসকেলেটেড (সহায়তা আবশ্যক)</span>
          </button>
        </div>
      </div>

      {/* Thread Rows */}
      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-100">
        {threadsQuery.isLoading ? (
          <p className="p-6 text-center text-xs font-semibold text-slate-400">
            অভিভাবক চ্যাট লোড হচ্ছে...
          </p>
        ) : threads.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {escalatedOnly
              ? "বর্তমানে কোনো এসকেলেটেড চ্যাট নেই।"
              : query
              ? "এই সার্চে কোনো অভিভাবক চ্যাট পাওয়া যায়নি।"
              : "এখনো কোনো অভিভাবক চ্যাট শুরু করেননি।"}
          </div>
        ) : (
          threads.map(thread => {
            const isSelected = selectedThreadId === thread.threadId;
            const hasEscalation = !!thread.aiEscalatedAt;

            return (
              <button
                key={thread.threadId}
                type="button"
                onClick={() => setSelectedThreadId(thread.threadId)}
                aria-current={isSelected ? "true" : undefined}
                className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "bg-sky-50/80 border-l-4 border-l-j-accent"
                    : "hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-xs font-bold text-slate-800">
                      {thread.guardianName || "অভিভাবক"}
                    </span>
                    {thread.guardianId && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 shrink-0">
                        GDN-{thread.guardianId}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatGuardianChatTime(thread.lastMessageAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="truncate">{thread.guardianPhone || "ফোন নম্বর নেই"}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <p className="truncate text-xs text-slate-600 min-w-0">
                    {thread.lastMessagePreview || "কোনো মেসেজ নেই"}
                  </p>
                  {hasEscalation && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 shrink-0">
                      <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                      লাইভ সহায়তা
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderThreadPanel = () => {
    if (!selectedThreadId || !activeThreadData?.thread) {
      return (
        <div className="grid h-full place-items-center p-8 text-center text-sm text-slate-400">
          <div className="space-y-2 max-w-xs">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
              <Bot className="size-6" />
            </div>
            <p className="font-semibold text-slate-700">অভিভাবক চ্যাট সিলেক্ট করুন</p>
            <p className="text-xs text-slate-500">
              বাম পাশের তালিকা থেকে যেকোনো অভিভাবকের চ্যাট থ্রেড নির্বাচন করে সরাসরি লাইভ উত্তর দিন বা এসকেলেশন হ্যান্ডেল করুন।
            </p>
          </div>
        </div>
      );
    }

    const thread = activeThreadData.thread;
    const messages = activeThreadData.messages ?? [];
    const isEscalated = !!thread.aiEscalatedAt;

    return (
      <div className="flex h-full flex-col">
        {/* Thread Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#dce9f1] px-4 py-3 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && (
              <button
                type="button"
                onClick={() => setSelectedThreadId(null)}
                className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-sky-100 to-indigo-100 text-sky-800 font-bold text-xs">
              <User className="size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-bold text-slate-900">
                  {thread.guardianName || "অভিভাবক"}
                </h3>
                {thread.guardianId && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                    GDN-{thread.guardianId}
                  </span>
                )}
                <span className="hidden sm:inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                  <ShieldCheck className="size-3" />
                  Member: BTPA - 077
                </span>
              </div>
              <div className="flex items-center gap-3 text-2xs text-slate-500">
                {thread.guardianPhone && (
                  <a
                    href={`tel:${thread.guardianPhone}`}
                    className="inline-flex items-center gap-1 hover:text-sky-600 font-medium"
                  >
                    <Phone className="size-3" />
                    <span>{thread.guardianPhone}</span>
                  </a>
                )}
                {thread.guardianEmail && (
                  <span className="hidden md:inline truncate">{thread.guardianEmail}</span>
                )}
              </div>
            </div>
          </div>

          {/* Escalation Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isEscalated ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-1 text-2xs font-extrabold text-rose-700">
                  <AlertTriangle className="size-3" />
                  <span>এসকেলেটেড</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveEscalationMutation.mutate({ threadId: thread.id })}
                  disabled={resolveEscalationMutation.isPending}
                  className="h-7 text-2xs font-bold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 gap-1"
                >
                  <CheckCircle2 className="size-3" />
                  <span>রিসলভ করুন</span>
                </Button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1 text-2xs font-bold text-emerald-700">
                <CheckCircle2 className="size-3" />
                <span>স্বাভাবিক / এআই সক্রিয়</span>
              </span>
            )}
          </div>
        </div>

        {/* Messages Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">
              এই থ্রেডে এখনো কোনো মেসেজ পাওয়া যায়নি।
            </p>
          ) : (
            messages.map(msg => {
              const isGuardian = msg.senderRole === "guardian";
              const isAssistant = msg.senderRole === "assistant";
              const isAdmin = msg.senderRole === "admin";

              if (isAdmin) {
                return (
                  <div key={msg.id} className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold pr-1">
                      <span>কানেক্ট টিউটরস এডমিন</span>
                      <span>·</span>
                      <span>{formatGuardianChatTime(msg.createdAt)}</span>
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-br-xs bg-gradient-to-br from-sky-600 to-indigo-600 px-3.5 py-2.5 text-xs text-white shadow-sm leading-relaxed whitespace-pre-wrap">
                      {msg.body}
                    </div>
                  </div>
                );
              }

              if (isAssistant) {
                return (
                  <div key={msg.id} className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-sky-700 font-bold pl-1">
                      <Bot className="size-3 text-sky-600" />
                      <span>Connect Tutors AI Assistant</span>
                      <span className="text-slate-400 font-normal">·</span>
                      <span className="text-slate-400 font-normal">
                        {formatGuardianChatTime(msg.createdAt)}
                      </span>
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-bl-xs border border-sky-100 bg-white px-3.5 py-2.5 text-xs text-slate-800 shadow-xs leading-relaxed whitespace-pre-wrap">
                      {msg.body}
                      {msg.aiFeedback && (
                        <div className="mt-2 border-t border-slate-100 pt-1.5 flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <span>ফিডব্যাক:</span>
                          <span
                            className={
                              msg.aiFeedback === "helpful"
                                ? "text-emerald-600 font-bold"
                                : "text-amber-600 font-bold"
                            }
                          >
                            {msg.aiFeedback === "helpful" ? "👍 সহায়ক হয়েছে" : "👎 সহায়ক নয়"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Guardian message
              return (
                <div key={msg.id} className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold pl-1">
                    <span>অভিভাবক</span>
                    <span>·</span>
                    <span>{formatGuardianChatTime(msg.createdAt)}</span>
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-xs bg-slate-200/80 px-3.5 py-2.5 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {msg.body}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-[#dce9f1] p-3 bg-white space-y-2">
          {/* Quick reply templates */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-2xs scrollbar-none">
            <span className="text-slate-400 font-bold shrink-0">কুইক রিপ্লাই:</span>
            {GUARDIAN_QUICK_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReplyBody(prev => (prev ? `${prev} ${preset}` : preset))}
                className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200 transition-colors truncate max-w-[200px]"
                title={preset}
              >
                {preset}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex items-end gap-2">
            <Textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="অভিভাবককে এডমিন হিসেবে উত্তর লিখুন (Enter পাঠাতে, Shift+Enter নতুন লাইনে)..."
              rows={2}
              className="min-h-10 flex-1 resize-none py-2 text-xs leading-relaxed"
            />
            <ChatSendButton
              ariaLabel="Send reply to guardian"
              disabled={!replyBody.trim() || sendMutation.isPending}
              isPending={sendMutation.isPending}
              className="bg-gradient-to-tr from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-md h-10 w-10 shrink-0"
            />
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className={frameClassName}>
      {isMobile ? (
        selectedThreadId ? (
          renderThreadPanel()
        ) : (
          renderThreadList()
        )
      ) : (
        <div className="grid h-full grid-cols-[340px_1fr] divide-x divide-[#dce9f1]">
          {renderThreadList()}
          {renderThreadPanel()}
        </div>
      )}
    </div>
  );
}
