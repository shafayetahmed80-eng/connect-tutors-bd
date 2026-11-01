import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminDynamicAiSettings() {
  const utils = trpc.useUtils();
  const aiSettingsQuery = trpc.admin.getAiChatSettings.useQuery();
  const analyticsQuery = trpc.admin.getAiChatAnalytics.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const faqsQuery = trpc.admin.listAiKnowledgeFaqs.useQuery();

  const updateAiSettings = trpc.admin.updateAiChatSettings.useMutation({
    onSuccess: () => {
      toast.success("এআই সেটিংস সফলভাবে সংরক্ষিত হয়েছে");
      void utils.admin.getAiChatSettings.invalidate();
    },
    onError: (err: { message?: string }) => toast.error(err.message || "সেটিংস সংরক্ষণ ব্যর্থ হয়েছে"),
  });

  const createFaq = trpc.admin.createAiKnowledgeFaq.useMutation({
    onSuccess: () => {
      toast.success("নতুন এফএকিউ জ্ঞান যুক্ত হয়েছে");
      setFaqQuestion("");
      setFaqAnswer("");
      void utils.admin.listAiKnowledgeFaqs.invalidate();
    },
    onError: (err: { message?: string }) => toast.error(err.message || "এফএকিউ যোগ ব্যর্থ হয়েছে"),
  });

  const updateFaq = trpc.admin.updateAiKnowledgeFaq.useMutation({
    onSuccess: () => {
      toast.success("এফএকিউ হালনাগাদ হয়েছে");
      void utils.admin.listAiKnowledgeFaqs.invalidate();
    },
    onError: (err: { message?: string }) => toast.error(err.message || "হালনাগাদ ব্যর্থ হয়েছে"),
  });

  const deleteFaq = trpc.admin.deleteAiKnowledgeFaq.useMutation({
    onSuccess: () => {
      toast.success("এফএকিউ মুছে ফেলা হয়েছে");
      void utils.admin.listAiKnowledgeFaqs.invalidate();
    },
    onError: (err: { message?: string }) => toast.error(err.message || "মুছে ফেলা ব্যর্থ হয়েছে"),
  });

  // State for AI Chat Settings
  const [aiEnabled, setAiEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  // State for New FAQ Form
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState("general");
  const [faqAudience, setFaqAudience] = useState<"all" | "tutor" | "guardian">("all");

  useEffect(() => {
    if (aiSettingsQuery.data) {
      const s = aiSettingsQuery.data;
      setAiEnabled(s.enabled ?? true);
      setWelcomeMessage(s.welcomeMessage ?? "");
      setFallbackMessage(s.fallbackMessage ?? "");
      setSystemPrompt(s.systemPrompt ?? "");
    }
  }, [aiSettingsQuery.data]);

  const handleSaveSettings = () => {
    updateAiSettings.mutate({
      enabled: aiEnabled,
      welcomeMessage: welcomeMessage.trim() || undefined,
      fallbackMessage: fallbackMessage.trim() || undefined,
      systemPrompt: systemPrompt.trim() || null,
    });
  };

  const handleCreateFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      toast.error("প্রশ্ন ও উত্তরের বিবরণ আবশ্যক");
      return;
    }
    createFaq.mutate({
      question: faqQuestion.trim(),
      answer: faqAnswer.trim(),
      category: faqCategory,
      audience: faqAudience,
    });
  };

  const analytics = analyticsQuery.data;

  return (
    <AdminDynamicSectionPage title="AI Assistant Control & Training Center">
      <div className="space-y-8">
        {/* Header Summary */}
        <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-blue-50/50 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-tr from-j-accent to-[#156cb6] text-white shadow-md shadow-sky-500/20">
                <BrainCircuit size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-j-ink">এআই লাইভ চ্যাট কন্ট্রোল ও নলেজ ট্রেইনিং</h2>
                <p className="text-xs font-medium text-j-ink-soft">
                  কানেক্ট টিউটরস প্ল্যাটফর্মে টিউটর ও অভিভাবক লাইভ চ্যাট এআই অটোমেশন পরিচালনা, সন্তুষ্টি পরিমাপ ও কাস্টম উত্তর ট্রেইনিং।
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                aiEnabled ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-200 text-slate-700"
              }`}>
                <span className={`size-2 rounded-full ${aiEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                {aiEnabled ? "এআই অটো-রিপ্লাই সচল" : "এআই অটো-রিপ্লাই বন্ধ"}
              </span>
            </div>
          </div>
        </section>

        {/* 1. Analytics & Quality Metrics */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-j-ink">
              <TrendingUp size={16} className="text-j-accent" />
              <span>এআই পারফরম্যান্স ও সন্তুষ্টি অ্যানালিটিক্স</span>
            </h3>
            <button
              type="button"
              onClick={() => analyticsQuery.refetch()}
              disabled={analyticsQuery.isFetching}
              className="inline-flex items-center gap-1 text-2xs font-semibold text-j-ink-soft hover:text-j-accent transition-colors"
            >
              <RefreshCw size={12} className={analyticsQuery.isFetching ? "animate-spin" : ""} />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-j-border bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-j-ink-faint">
                <span className="text-2xs font-bold uppercase tracking-wider">মোট এআই বার্তা</span>
                <MessageSquare size={14} className="text-sky-600" />
              </div>
              <p className="mt-2 text-xl font-bold text-j-ink">
                {analytics?.totalAiMessages ?? 0}
              </p>
              <p className="mt-0.5 text-3xs text-j-ink-soft">টিউটর ও অভিভাবক চ্যাট</p>
            </div>

            <div className="rounded-xl border border-j-border bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-j-ink-faint">
                <span className="text-2xs font-bold uppercase tracking-wider">টিউটর বার্তা</span>
                <Users size={14} className="text-blue-600" />
              </div>
              <p className="mt-2 text-xl font-bold text-j-ink">
                {analytics?.tutorMessages ?? 0}
              </p>
              <p className="mt-0.5 text-3xs text-j-ink-soft">টিউটর প্যানেল থেকে</p>
            </div>

            <div className="rounded-xl border border-j-border bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-j-ink-faint">
                <span className="text-2xs font-bold uppercase tracking-wider">অভিভাবক বার্তা</span>
                <Bot size={14} className="text-indigo-600" />
              </div>
              <p className="mt-2 text-xl font-bold text-j-ink">
                {analytics?.guardianMessages ?? 0}
              </p>
              <p className="mt-0.5 text-3xs text-j-ink-soft">অভিভাবক প্যানেল থেকে</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-2xs font-bold uppercase tracking-wider">সন্তুষ্টি রেট</span>
                <Sparkles size={14} className="text-emerald-600" />
              </div>
              <p className="mt-2 text-xl font-bold text-emerald-900">
                {analytics?.satisfactionRate ?? 100}%
              </p>
              <p className="mt-0.5 text-3xs text-emerald-700 font-medium">উপকারী উত্তরের হার</p>
            </div>

            <div className="rounded-xl border border-j-border bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-j-ink-faint">
                <span className="text-2xs font-bold uppercase tracking-wider">ফিডব্যাক ভোট</span>
                <ThumbsUp size={14} className="text-emerald-600" />
              </div>
              <p className="mt-2 text-xl font-bold text-j-ink">
                <span className="text-emerald-700">{analytics?.helpfulCount ?? 0}</span>
                <span className="text-xs text-j-ink-faint mx-1">/</span>
                <span className="text-rose-600">{analytics?.unhelpfulCount ?? 0}</span>
              </p>
              <p className="mt-0.5 text-3xs text-j-ink-soft">👍 সহায়ক / 👎 ভুল</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-2xs font-bold uppercase tracking-wider">হিউম্যান এডমিন</span>
                <ShieldAlert size={14} className="text-amber-600" />
              </div>
              <p className="mt-2 text-xl font-bold text-amber-900">
                {analytics?.escalatedCount ?? 0}
              </p>
              <p className="mt-0.5 text-3xs text-amber-700 font-medium">এডমিনের দৃষ্টি আকর্ষণ</p>
            </div>
          </div>
        </section>

        {/* 2. System Settings & Controls */}
        <section className="rounded-2xl border border-j-border bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-j-border/60 pb-4">
            <div>
              <h3 className="text-base font-bold text-j-ink">এআই সিস্টেম কনফিগারেশন ও কন্ট্রোল</h3>
              <p className="text-xs text-j-ink-soft">
                প্ল্যাটফর্ম জুড়ে এআই চ্যাটবটের আচরণ, প্রম্পট ও ডিফল্ট বার্তা নির্ধারণ করুন।
              </p>
            </div>
            <Button
              type="button"
              onClick={handleSaveSettings}
              disabled={updateAiSettings.isPending}
              className="inline-flex items-center gap-1.5 bg-j-accent text-white hover:bg-j-accent/90"
            >
              <Save size={14} />
              <span>{updateAiSettings.isPending ? "সংরক্ষণ হচ্ছে..." : "সেটিংস সংরক্ষণ"}</span>
            </Button>
          </div>

          <div className="space-y-5">
            {/* Master Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-j-border bg-j-surface-soft p-4">
              <div>
                <p className="text-sm font-bold text-j-ink">এআই লাইভ চ্যাট মাস্টার সুইচ (Global Enable)</p>
                <p className="text-xs text-j-ink-soft">
                  চালু থাকলে টিউটর ও অভিভাবক চ্যাটে তাৎক্ষণিক নির্ভুল উত্তর প্রদান করবে। বন্ধ রাখলে শুধুমাত্র হিউম্যান এডমিন রিপ্লাই দিতে পারবেন।
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-j-accent peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>

            {/* Welcome Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-j-ink">স্বাগতম বার্তা (Welcome Greeting)</label>
                <button
                  type="button"
                  onClick={() =>
                    setWelcomeMessage(
                      "আসসালামু আলাইকুম! কানেক্ট টিউটরস এআই সহায়কে স্বাগতম। আপনার যেকোনো জিজ্ঞাসা এখানে লিখতে পারেন।"
                    )
                  }
                  className="text-2xs font-semibold text-j-accent hover:underline"
                >
                  ডিফল্ট টেক্সট আনুন
                </button>
              </div>
              <Textarea
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="নতুন চ্যাট শুরু হলে এআই যে বার্তা পাঠাবে..."
                className="text-sm"
              />
            </div>

            {/* Fallback Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-j-ink">অপারগতা বা বিকল্প বার্তা (Fallback / Human Escalation)</label>
                <button
                  type="button"
                  onClick={() =>
                    setFallbackMessage(
                      "দুঃখিত, এই বিষয়টি পর্যালোচনার জন্য আমাদের এডমিন টিমের দৃষ্টি আকর্ষণ করা হয়েছে। একজন এডমিন শীঘ্রই আপনার সাথে যোগাযোগ করবেন।"
                    )
                  }
                  className="text-2xs font-semibold text-j-accent hover:underline"
                >
                  ডিফল্ট টেক্সট আনুন
                </button>
              </div>
              <Textarea
                rows={2}
                value={fallbackMessage}
                onChange={(e) => setFallbackMessage(e.target.value)}
                placeholder="এআই কোনো প্রশ্নের উত্তর না জানলে বা এডমিন চাইলে যে বার্তা দেখাবে..."
                className="text-sm"
              />
            </div>

            {/* Custom System Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-j-ink">সিস্টেম প্রম্পট নির্দেশনা (System Persona Instruction)</label>
                <button
                  type="button"
                  onClick={() =>
                    setSystemPrompt(
                      "You are Connect Tutors BD AI Assistant (BTPA-077 member). Be helpful, polite, professional, and answer in Bengali. Guide users to verified platform processes."
                    )
                  }
                  className="text-2xs font-semibold text-j-accent hover:underline"
                >
                  ডিফল্ট প্রম্পট আনুন
                </button>
              </div>
              <Textarea
                rows={3}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="এআই মডেলের ব্যক্তিত্ব ও নির্দেশাবলি..."
                className="text-sm font-mono"
              />
            </div>
          </div>
        </section>

        {/* 3. Custom Knowledge Base & FAQ Training Manager */}
        <section className="rounded-2xl border border-j-border bg-white p-6 shadow-xs space-y-6">
          <div className="border-b border-j-border/60 pb-4">
            <h3 className="text-base font-bold text-j-ink">কাস্টম জ্ঞানভাণ্ডার ও এফএকিউ ট্রেইনিং (Knowledge Training Center)</h3>
            <p className="text-xs text-j-ink-soft">
              প্ল্যাটফর্মের নিয়মিত প্রশ্ন ও উত্তর এখানে যুক্ত করুন। ব্যবহারকারী এই ধরণের প্রশ্ন করলে এআই তাৎক্ষণিকভাবে নির্ভুল উত্তর দেবে।
            </p>
          </div>

          {/* New FAQ Form */}
          <form onSubmit={handleCreateFaq} className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-4">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-sky-900 uppercase tracking-wide">
              <Plus size={14} className="text-sky-700" />
              <span>নতুন প্রশ্ন ও উত্তর প্রশিক্ষণ দিন</span>
            </h4>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-j-ink">প্রশ্ন / ইনপুট প্যাটার্ন *</label>
                <input
                  type="text"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="যেমন: ডেমো ক্লাসের নিয়ম কী?"
                  className="w-full rounded-lg border border-j-border bg-white px-3 py-1.5 text-xs font-medium text-j-ink focus:border-j-accent focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-j-ink">ক্যাটাগরি</label>
                  <select
                    value={faqCategory}
                    onChange={(e) => setFaqCategory(e.target.value)}
                    className="w-full rounded-lg border border-j-border bg-white px-2.5 py-1.5 text-xs font-medium text-j-ink focus:border-j-accent focus:outline-none"
                  >
                    <option value="general">সাধারণ (General)</option>
                    <option value="tuition">টিউশন সংক্রান্ত</option>
                    <option value="fee">ফি ও পেমেন্ট</option>
                    <option value="verification">ভেরিফিকেশন</option>
                    <option value="policy">নিয়মাবলি ও গ্যারান্টি</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-j-ink">লক্ষ্য শ্রোতা</label>
                  <select
                    value={faqAudience}
                    onChange={(e) => setFaqAudience(e.target.value as "all" | "tutor" | "guardian")}
                    className="w-full rounded-lg border border-j-border bg-white px-2.5 py-1.5 text-xs font-medium text-j-ink focus:border-j-accent focus:outline-none"
                  >
                    <option value="all">উভয় (All)</option>
                    <option value="tutor">শুধুমাত্র টিউটর</option>
                    <option value="guardian">শুধুমাত্র অভিভাবক</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-bold text-j-ink">এআই উত্তর (AI Trained Answer) *</label>
              <Textarea
                rows={3}
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                placeholder="এআই ব্যবহারকারীকে যে বিস্তারিত উত্তরটি দেবে..."
                className="text-xs bg-white"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={createFaq.isPending}
                size="sm"
                className="bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs"
              >
                <Plus size={14} className="mr-1" />
                <span>{createFaq.isPending ? "যুক্ত হচ্ছে..." : "জ্ঞানভাণ্ডারে যুক্ত করুন"}</span>
              </Button>
            </div>
          </form>

          {/* Existing FAQ List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-j-ink uppercase tracking-wider">
              বর্তমান সক্রিয় এফএকিউ তালিকা ({faqsQuery.data?.length ?? 0} টি)
            </h4>

            {faqsQuery.isLoading ? (
              <p className="text-xs text-j-ink-faint">এফএকিউ তালিকা লোড হচ্ছে...</p>
            ) : !faqsQuery.data || faqsQuery.data.length === 0 ? (
              <div className="rounded-xl border border-dashed border-j-border p-6 text-center text-xs text-j-ink-soft">
                এখনও কোনো কাস্টম এফএকিউ যোগ করা হয়নি। উপরের ফরম থেকে যুক্ত করুন।
              </div>
            ) : (
              <div className="space-y-3">
                {faqsQuery.data.map((faq) => (
                  <div
                    key={faq.id}
                    className={`rounded-xl border p-4 transition-all ${
                      faq.isActive ? "border-j-border bg-white" : "border-slate-200 bg-slate-50 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-j-ink">{faq.question}</span>
                          <span className="rounded-md bg-sky-100 px-2 py-0.5 text-3xs font-bold text-sky-800 uppercase">
                            {faq.category}
                          </span>
                          <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-3xs font-bold text-indigo-700">
                            শ্রোতা: {faq.audience === "all" ? "উভয়" : faq.audience === "tutor" ? "টিউটর" : "অভিভাবক"}
                          </span>
                          {!faq.isActive ? (
                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-3xs font-bold text-slate-700">
                              নিষ্ক্রিয়
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs leading-relaxed text-j-ink-soft whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                        <button
                          type="button"
                          onClick={() => updateFaq.mutate({ id: faq.id, isActive: !faq.isActive })}
                          className={`rounded-lg px-2.5 py-1 text-2xs font-bold border transition-colors ${
                            faq.isActive
                              ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          {faq.isActive ? "পজ করুন" : "সচল করুন"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("আপনি কি নিশ্চিত এই এফএকিউটি মুছে ফেলতে চান?")) {
                              deleteFaq.mutate({ id: faq.id });
                            }
                          }}
                          className="rounded-lg p-1.5 text-j-ink-faint hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminDynamicSectionPage>
  );
}
