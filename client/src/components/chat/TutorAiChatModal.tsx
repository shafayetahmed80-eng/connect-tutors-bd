import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Bot,
  ExternalLink,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ChatTuitionJobCard, extractJobIdsFromText } from "./ChatTuitionActions";

export const QUICK_TUTOR_PROMPTS = [
  { label: "আমার জন্য টিউশন আছে?", prompt: "আমার প্রোফাইলের সাথে মিলে এমন কোনো টিউশন বা জব আছে কি?" },
  { label: "ভেরিফিকেশন নিয়ম", prompt: "ভেরিফিকেশন হতে কত সময় লাগে এবং কী কী ডকুমেন্ট প্রয়োজন?" },
  { label: "সিভি ডাউনলোড", prompt: "আমার সিভি (CV) কীভাবে ডাউনলোড করবো?" },
  { label: "টিউশন ফি ও পেমেন্ট", prompt: "টিউশন প্ল্যাটফর্ম ফি ও পেমেন্টের নিয়ম কী?" },
  { label: "অনলাইন টিউশন ও দূরত্ব", prompt: "অনলাইন টিউশনে ট্রাভেল ডিসট্যান্স বা দূরত্বের নিয়ম কী?" },
  { label: "এডমিনের সাথে কথা বলা", prompt: "আমি জরুরি প্রয়োজনে সরাসরি একজন এডমিনের সাথে কথা বলতে চাই।" },
];

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TutorChatMessageItem {
  id: number;
  senderRole: "tutor" | "admin";
  body: string;
  isAiGenerated?: boolean | null;
  aiFeedback?: "helpful" | "unhelpful" | null;
  aiFeedbackNote?: string | null;
  aiActionChips?: unknown;
  createdAt: Date | string;
}

export interface TutorAiChatModalProps {
  hideFloatingButton?: boolean;
  unreadCount?: number;
}

export function TutorAiChatModal({ hideFloatingButton = false, unreadCount }: TutorAiChatModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (hideFloatingButton) {
      setIsOpen(false);
    }
  }, [hideFloatingButton]);

  const utils = trpc.useUtils ? trpc.useUtils() : ({} as any);
  const threadQuery = trpc.tutorAdminChat?.thread?.useQuery
    ? trpc.tutorAdminChat.thread.useQuery(undefined, {
        enabled: isOpen,
        refetchInterval: isOpen ? 15000 : false,
      })
    : ({ data: undefined, isLoading: false } as any);

  const sendMutation = trpc.tutorAdminChat?.send?.useMutation
    ? trpc.tutorAdminChat.send.useMutation({
        onSuccess: () => {
          setInputText("");
          void utils.tutorAdminChat?.thread?.invalidate?.();
        },
        onError: (err: any) => {
          toast.error(err.message || "মেসেজ পাঠানো সম্ভব হয়নি");
        },
      })
    : ({ mutate: () => {}, isPending: false } as any);

  const feedbackMutation = trpc.tutorAdminChat?.submitAiFeedback?.useMutation
    ? trpc.tutorAdminChat.submitAiFeedback.useMutation({
        onSuccess: () => {
          toast.success("আপনার মতামতের জন্য ধন্যবাদ!");
          void utils.tutorAdminChat?.thread?.invalidate?.();
        },
        onError: (err: any) => {
          toast.error(err.message || "মতামত গ্রহণে সমস্যা হয়েছে");
        },
      })
    : ({ mutate: () => {}, isPending: false } as any);

  const messages: TutorChatMessageItem[] = (threadQuery.data?.messages as TutorChatMessageItem[]) ?? [];
  const isEscalated = Boolean(threadQuery.data?.aiEscalatedAt);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || sendMutation.isPending) return;

    sendMutation.mutate({ body: text });
    if (!textToSend) setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Assistant Trigger Button */}
      {!hideFloatingButton && !isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 px-4 py-2.5 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all ring-4 ring-sky-500/20 group"
          aria-label="টিউটর এআই সহায়তা চালু করুন"
        >
          <div className="relative">
            <Bot size={18} className="transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
          <span className="text-xs font-bold tracking-wide">এআই সহায়তা</span>
          {typeof unreadCount === "number" && unreadCount > 0 ? (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-3xs font-extrabold text-white animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : (
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-3xs font-black uppercase text-white">
              Live
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[580px] w-[95vw] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sky-100 bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-white/15 text-white backdrop-blur-xs">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                  <span>কানেক্ট সাপোর্ট ও এআই সহকারী</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-3xs font-bold text-emerald-200">
                    <span className="size-1 rounded-full bg-emerald-400" />
                    Live
                  </span>
                </h3>
                <p className="text-3xs text-sky-100 font-medium">
                  কানেক্ট টিউটরস (Member: BTPA-077) · সার্বক্ষণিক সহায়তা
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setLocation("/tutor/dashboard/chat");
                }}
                className="grid size-7 place-items-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                title="পূর্ণাঙ্গ সাপোর্ট চ্যাটে দেখুন"
                aria-label="পূর্ণাঙ্গ সাপোর্ট চ্যাটে দেখুন"
              >
                <Maximize2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid size-7 place-items-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                title="মিনিমাইজ করুন"
              >
                <Minimize2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid size-7 place-items-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                title="বন্ধ করুন"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Escalation alert if admin assistance requested */}
          {isEscalated && (
            <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3.5 py-2 text-2xs font-semibold text-amber-800">
              <AlertTriangle size={13} className="shrink-0 text-amber-600" />
              <span>আপনার মেসেজটি পর্যালোচনা ও ফলো-আপের জন্য এডমিনের কাছে পাঠানো হয়েছে।</span>
            </div>
          )}

          {/* Quick Suggestion Chips */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-j-border/60 bg-sky-50/50 p-2 scrollbar-none">
            {QUICK_TUTOR_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(item.prompt)}
                disabled={sendMutation.isPending}
                className="shrink-0 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-3xs font-bold text-sky-800 shadow-2xs hover:bg-sky-100 hover:border-sky-300 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Message Thread Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-j-ink-soft">
                <div className="grid size-12 place-items-center rounded-2xl bg-sky-100 text-sky-700 mb-2.5">
                  <Sparkles size={22} />
                </div>
                <p className="text-xs font-bold text-j-ink">কানেক্ট টিউটরস এআই সহায়কে স্বাগতম!</p>
                <p className="mt-1 max-w-[280px] text-3xs leading-relaxed text-j-ink-faint">
                  টিউশন খোঁজ, ভেরিফিকেশন স্ট্যাটাস, পেমেন্ট ও প্ল্যাটফর্মের যেকোনো জিজ্ঞাসার দ্রুত উত্তর পেতে এখানে লিখুন।
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.senderRole === "tutor";
                const isAi = Boolean(msg.isAiGenerated);
                const chips = Array.isArray(msg.aiActionChips)
                  ? (msg.aiActionChips as Array<{ label: string; url: string }>)
                  : [];
                const jobIds = extractJobIdsFromText(msg.body);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1 mb-1 px-1 text-3xs font-bold uppercase tracking-wider text-j-ink-faint">
                      {isUser ? (
                        <>
                          <span>আপনি</span>
                          <User size={10} />
                        </>
                      ) : isAi ? (
                        <>
                          <Bot size={10} className="text-sky-600" />
                          <span>কানেক্ট টিউটরস এআই</span>
                        </>
                      ) : (
                        <>
                          <Bot size={10} className="text-indigo-600" />
                          <span>এডমিন</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed ${
                        isUser
                          ? "rounded-tr-xs bg-gradient-to-br from-sky-600 to-indigo-600 text-white"
                          : "rounded-tl-xs border border-sky-100 bg-white text-j-ink"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.body}</p>

                      <div
                        className={`mt-1 flex items-center justify-end text-3xs ${
                          isUser ? "text-white/70" : "text-j-ink-faint"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>

                    {/* Job Cards if any recommended */}
                    {jobIds.length > 0 && (
                      <div className="mt-2 w-full max-w-[85%] space-y-2">
                        {jobIds.map((jid) => (
                          <ChatTuitionJobCard key={jid} jobId={jid} />
                        ))}
                      </div>
                    )}

                    {/* Action Chips */}
                    {!isUser && chips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                        {chips.map((chip, cIdx) => (
                          <a
                            key={cIdx}
                            href={chip.url}
                            className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-3xs font-bold text-sky-800 shadow-2xs hover:bg-sky-100 hover:border-sky-300 transition-colors"
                          >
                            <span>{chip.label}</span>
                            <ExternalLink size={9} />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* 1-Click Feedback */}
                    {!isUser && isAi && (
                      <div className="mt-1 flex items-center gap-1.5 px-1">
                        <span className="text-3xs font-semibold text-j-ink-faint">সহায়ক?</span>
                        <button
                          type="button"
                          onClick={() =>
                            feedbackMutation.mutate({ messageId: msg.id, feedback: "helpful" })
                          }
                          disabled={feedbackMutation.isPending}
                          title="সহায়ক উত্তর (Helpful)"
                          aria-label="Helpful AI response"
                          className={`rounded-full p-1 text-3xs transition-colors ${
                            msg.aiFeedback === "helpful"
                              ? "bg-emerald-100 text-emerald-700 font-bold ring-1 ring-emerald-300"
                              : "text-j-ink-faint hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          <ThumbsUp size={11} className={msg.aiFeedback === "helpful" ? "fill-emerald-600 text-emerald-600" : ""} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            feedbackMutation.mutate({ messageId: msg.id, feedback: "unhelpful" })
                          }
                          disabled={feedbackMutation.isPending}
                          title="উপকারী ছিল না (Unhelpful)"
                          aria-label="Unhelpful AI response"
                          className={`rounded-full p-1 text-3xs transition-colors ${
                            msg.aiFeedback === "unhelpful"
                              ? "bg-rose-100 text-rose-700 font-bold ring-1 ring-rose-300"
                              : "text-j-ink-faint hover:text-rose-600 hover:bg-rose-50"
                          }`}
                        >
                          <ThumbsDown size={11} className={msg.aiFeedback === "unhelpful" ? "fill-rose-600 text-rose-600" : ""} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer Footer */}
          <div className="border-t border-sky-100 bg-white p-2.5">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="আপনার জিজ্ঞাসা লিখুন (Enter চাপুন)..."
                className="max-h-24 min-h-[40px] resize-none rounded-xl border-j-border bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-sky-500"
                disabled={sendMutation.isPending}
              />
              <Button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || sendMutation.isPending}
                size="sm"
                className="size-10 shrink-0 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 p-0 text-white hover:from-sky-700 hover:to-indigo-700 shadow-md"
              >
                <Send size={15} />
              </Button>
            </div>
            <p className="mt-1.5 text-center text-3xs text-j-ink-faint">
              জরুরি প্রয়োজনে অফিসিয়াল হটলাইনে যোগাযোগ করুন
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default TutorAiChatModal;
