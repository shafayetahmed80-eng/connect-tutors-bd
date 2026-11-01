import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Bot,
  CornerDownLeft,
  ExternalLink,
  MessageCircle,
  Minimize2,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const QUICK_GUARDIAN_PROMPTS = [
  { label: "টিউশন ফি কত হতে পারে?", prompt: "অভিভাবকদের জন্য টিউশন ফি সাধারণত কেমন হতে পারে?" },
  { label: "কতদিনে টিউটর পাবো?", prompt: "টিউটর রিকোয়েস্ট করার পর কতদিনের মধ্যে টিউটর পাওয়া যায়?" },
  { label: "টিউটর ভেরিফিকেশন", prompt: "টিউটরদের যোগ্যতা ও এনআইডি কীভাবে ভেরিফাই করা হয়?" },
  { label: "ডেমো ক্লাস ও রিপ্লেসমেন্ট", prompt: "ডেমো ক্লাসের নিয়ম ও টিউটর পছন্দ না হলে রিপ্লেসমেন্ট নীতি কী?" },
  { label: "এডমিনের সাথে কথা", prompt: "আমি সরাসরি একজন এডমিন বা কো-অর্ডিনেটরের সাথে কথা বলতে চাই।" },
];

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface GuardianChatMessageItem {
  id: number;
  senderRole: "guardian" | "assistant" | "admin";
  body: string;
  intentDetected?: string | null;
  aiActionChips?: unknown;
  aiFeedback?: "helpful" | "unhelpful" | null;
  aiFeedbackNote?: string | null;
  createdAt: Date | string;
}

export function GuardianAiChatModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils ? trpc.useUtils() : ({} as any);
  const threadQuery = trpc.guardianAiChat?.thread?.useQuery
    ? trpc.guardianAiChat.thread.useQuery(undefined, {
        enabled: isOpen,
        refetchInterval: isOpen ? 15000 : false,
      })
    : ({ data: undefined, isLoading: false } as any);

  const sendMutation = trpc.guardianAiChat?.send?.useMutation
    ? trpc.guardianAiChat.send.useMutation({
        onSuccess: () => {
          setInputText("");
          void utils.guardianAiChat?.thread?.invalidate?.();
        },
        onError: (err: any) => {
          toast.error(err.message || "মেসেজ পাঠানো সম্ভব হয়নি");
        },
      })
    : ({ mutate: () => {}, isPending: false } as any);

  const feedbackMutation = trpc.guardianAiChat?.submitAiFeedback?.useMutation
    ? trpc.guardianAiChat.submitAiFeedback.useMutation({
        onSuccess: () => {
          toast.success("আপনার মতামতের জন্য ধন্যবাদ!");
          void utils.guardianAiChat?.thread?.invalidate?.();
        },
        onError: (err: any) => {
          toast.error(err.message || "মতামত গ্রহণে সমস্যা হয়েছে");
        },
      })
    : ({ mutate: () => {}, isPending: false } as any);

  const messages: GuardianChatMessageItem[] = (threadQuery.data?.messages as GuardianChatMessageItem[]) ?? [];
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Trigger Pill */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 text-white shadow-xl shadow-sky-600/30 ring-2 ring-white/80 transition-all hover:scale-105 hover:shadow-2xl active:scale-95"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <Bot size={20} className="animate-bounce" />
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
          <span className="text-xs font-bold tracking-wide">এআই সহায়তা</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-3xs font-black uppercase text-white">
            Live
          </span>
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
                  <span>অভিভাবক এআই সহকারী</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-3xs font-bold text-emerald-200">
                    <span className="size-1 rounded-full bg-emerald-400" />
                    Online
                  </span>
                </h3>
                <p className="text-3xs text-sky-100 font-medium">
                  কানেক্ট টিউটরস (Member: BTPA-077)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
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
            {QUICK_GUARDIAN_PROMPTS.map((item, idx) => (
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
                  টিউশন ফি, শিক্ষক নির্বাচন, যোগ্যতা ভেরিফিকেশন বা আপনার রিকোয়েস্ট সম্পর্কে যেকোনো প্রশ্ন এখানে করতে পারেন।
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.senderRole === "guardian";
                const chips = (Array.isArray(msg.aiActionChips) ? (msg.aiActionChips as Array<{ label: string; url: string }>) : []);

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
                      ) : (
                        <>
                          <Bot size={10} className="text-sky-600" />
                          <span>কানেক্ট টিউটরস এআই</span>
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
                    {!isUser && (
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
                          <ThumbsUp size={11} className={msg.aiFeedback === "helpful" ? "fill-emerald-600" : ""} />
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
                          <ThumbsDown size={11} className={msg.aiFeedback === "unhelpful" ? "fill-rose-600" : ""} />
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
              জরুরি প্রয়োজনে অফিসিয়াল হটলাইনে কল করুন: 01700-000000
            </p>
          </div>
        </div>
      )}
    </>
  );
}
export default GuardianAiChatModal;
