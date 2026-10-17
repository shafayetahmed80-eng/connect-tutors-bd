import React, { useState, useEffect } from "react";
import { Briefcase, ExternalLink, Moon, Phone, Pin, PinOff, ShieldCheck, Tag, X, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";

/* -------------------------------------------------------------------------- */
/*                                   TASK 9                                   */
/*                    DIRECT TUITION JOB CARD SHARE & PIN                     */
/* -------------------------------------------------------------------------- */

/**
 * Extracts numeric job IDs referenced in a chat message.
 * Matches:
 *  - #JOB-6801 or JOB-6801 or #JOB6801
 *  - /job-board?job=6801
 *  - #6801 (any 4-6 digit number prefixed with #)
 */
export function extractJobIdsFromText(text: string): string[] {
  if (!text) return [];
  const results = new Set<string>();

  // Match /job-board?job=(\d+)
  const urlRegex = /(?:job-board\?job=)(\d{4,6})/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match[1]) results.add(match[1]);
  }

  // Match #JOB-6801 or JOB-6801
  const jobRegex = /(?:#?JOB-?)(\d{4,6})\b/gi;
  while ((match = jobRegex.exec(text)) !== null) {
    if (match[1]) results.add(match[1]);
  }

  // Match #6801
  const hashRegex = /(?:#)(\d{4,6})\b/g;
  while ((match = hashRegex.exec(text)) !== null) {
    if (match[1]) results.add(match[1]);
  }

  return Array.from(results);
}

export type ChatTuitionJobCardProps = {
  jobId: string;
  isPinned?: boolean;
  onTogglePin?: (jobId: string) => void;
  compact?: boolean;
  className?: string;
};

/**
 * An interactive preview card rendered when a message references a tuition job.
 * Displays Job ID, Bangladesh Tuition Provider context, and 1-click view link.
 */
export function ChatTuitionJobCard({
  jobId,
  isPinned,
  onTogglePin,
  compact = false,
  className = "",
}: ChatTuitionJobCardProps) {
  const jobUrl = `/job-board?job=${encodeURIComponent(jobId)}`;

  return (
    <div
      data-testid={`chat-tuition-job-card-${jobId}`}
      className={`my-2 rounded-xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-blue-50/60 p-3 shadow-xs transition-all ${
        compact ? "py-2 px-2.5 text-xs" : "p-3.5"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-sky-100 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="grid size-6 place-items-center rounded-lg bg-sky-600 text-white shadow-xs">
            <Briefcase className="size-3.5" />
          </div>
          <div>
            <span className="text-2xs font-extrabold uppercase tracking-wide text-sky-700">
              টিউশন সার্কুলার
            </span>
            <h4 className="text-xs font-bold text-j-ink">জব #{jobId}</h4>
          </div>
        </div>

        {onTogglePin ? (
          <button
            type="button"
            onClick={() => onTogglePin(jobId)}
            aria-label={isPinned ? `জব #${jobId} পিন থেকে সরান` : `জব #${jobId} উপরে পিন করুন`}
            title={isPinned ? "পিন সরানো" : "উপরে পিন করুন"}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-bold transition-colors ${
              isPinned
                ? "border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "border border-j-border bg-white text-j-ink-soft hover:bg-sky-50 hover:text-sky-700"
            }`}
          >
            {isPinned ? (
              <>
                <PinOff className="size-3 text-amber-700" />
                <span>পিন সরানো</span>
              </>
            ) : (
              <>
                <Pin className="size-3 text-j-ink-faint" />
                <span>পিন করুন</span>
              </>
            )}
          </button>
        ) : null}
      </div>

      <div className="mt-2 text-2xs text-j-ink-soft space-y-0.5">
        <p className="font-semibold text-j-ink">
          কানেক্ট টিউটরস ভেরিফাইড টিউশন অফার
        </p>
        <p className="text-3xs text-j-ink-faint">
          কারিকুলাম, বিষয়, লোকেশন এবং সম্মানী (BDT) দেখতে নিচে ক্লিক করুন।
        </p>
      </div>

      <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-sky-100/60">
        <a
          href={jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-2xs font-bold text-white shadow-xs transition-colors hover:bg-sky-700"
        >
          <span>বিস্তারিত ও আবেদন দেখুন</span>
          <ExternalLink className="size-3" />
        </a>
        <span className="text-3xs font-semibold text-sky-800">
          Member: BTPA - 077
        </span>
      </div>
    </div>
  );
}

/**
 * Sticky banner at top of chat showing the currently pinned job.
 */
export function PinnedJobBanner({
  jobId,
  onUnpin,
}: {
  jobId: string;
  onUnpin: () => void;
}) {
  return (
    <div
      data-testid="pinned-job-banner"
      className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50/90 px-3.5 py-2 text-xs font-semibold text-amber-950 backdrop-blur-xs"
    >
      <div className="flex items-center gap-2 truncate">
        <Pin className="size-3.5 shrink-0 text-amber-700" />
        <span className="truncate">
          পিন করা টিউশন: <strong>জব #{jobId}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`/job-board?job=${encodeURIComponent(jobId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-amber-200/80 px-2 py-0.5 text-2xs font-bold text-amber-900 transition-colors hover:bg-amber-300"
        >
          দেখুন
        </a>
        <button
          type="button"
          onClick={onUnpin}
          aria-label="পিন সরান"
          title="পিন সরান"
          className="grid size-5 place-items-center rounded text-amber-800 hover:bg-amber-200/60"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}

/**
 * Modal to pick or enter a tuition Job ID to share into the chat message.
 */
export function ShareJobModal({
  onSelectJob,
  onClose,
}: {
  onSelectJob: (jobText: string) => void;
  onClose: () => void;
}) {
  const [jobIdInput, setJobIdInput] = useState("");
  const recentJobSuggestions = ["6801", "6802", "6803", "6804"];

  const handleShare = (id: string) => {
    const cleanId = id.trim().replace(/^#?JOB-?/i, "");
    if (!cleanId) return;
    onSelectJob(`#JOB-${cleanId}`);
    onClose();
  };

  return (
    <Modal size="dialog" onClose={onClose}>
      <ModalHeader
        title="টিউশন জব কার্ড শেয়ার করুন"
        meta="চ্যাটে টিউশন সার্কুলার আইডি যুক্ত করুন যাতে উভয় পক্ষ সরাসরি দেখতে পায়"
      />
      <ModalBody className="space-y-4">
        <div>
          <label className="text-xs font-bold text-j-ink">
            টিউশন জব নম্বর বা আইডি
          </label>
          <div className="mt-1 flex gap-2">
            <input
              value={jobIdInput}
              onChange={e => setJobIdInput(e.target.value)}
              placeholder="যেমন: 6801"
              maxLength={10}
              className="h-control flex-1 rounded-xl border border-j-border px-3 text-xs outline-none focus:border-j-accent focus:ring-1 focus:ring-j-accent"
            />
            <Button
              type="button"
              disabled={!jobIdInput.trim()}
              onClick={() => handleShare(jobIdInput)}
              className="h-control rounded-xl text-xs font-bold"
            >
              যুক্ত করুন
            </Button>
          </div>
        </div>

        <div>
          <p className="text-2xs font-bold text-j-ink-soft mb-2">
            সম্প্রতি প্রকাশিত টিউশনসমূহ:
          </p>
          <div className="flex flex-wrap gap-2">
            {recentJobSuggestions.map(id => (
              <button
                key={id}
                type="button"
                onClick={() => handleShare(id)}
                className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-800 transition-colors hover:bg-sky-100"
              >
                <Briefcase className="size-3 text-sky-600" />
                <span>জব #{id}</span>
              </button>
            ))}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="h-control rounded-xl border border-j-border px-4 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken"
        >
          বন্ধ করুন
        </button>
      </ModalFooter>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   TASK 10                                  */
/*                   CHAT CATEGORY & PRIORITY TAGS IN ADMIN                   */
/* -------------------------------------------------------------------------- */

export type ChatPriorityTag = "urgent" | "payment" | "verification" | "general";

export const CHAT_PRIORITY_CONFIG: Record<
  ChatPriorityTag,
  { label: string; toneClass: string; badgeClass: string; activeClass: string }
> = {
  urgent: {
    label: "জরুরী",
    toneClass: "text-rose-700 bg-rose-50 border-rose-200",
    badgeClass: "bg-rose-100 text-rose-800 border border-rose-300",
    activeClass: "bg-rose-600 text-white border-rose-600",
  },
  payment: {
    label: "পেমেন্ট ইস্যু",
    toneClass: "text-amber-800 bg-amber-50 border-amber-200",
    badgeClass: "bg-amber-100 text-amber-800 border border-amber-300",
    activeClass: "bg-amber-600 text-white border-amber-600",
  },
  verification: {
    label: "ভেরিফিকেশন",
    toneClass: "text-blue-700 bg-blue-50 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800 border border-blue-300",
    activeClass: "bg-blue-600 text-white border-blue-600",
  },
  general: {
    label: "সাধারণ",
    toneClass: "text-slate-700 bg-slate-50 border-slate-200",
    badgeClass: "bg-slate-100 text-slate-800 border border-slate-300",
    activeClass: "bg-slate-700 text-white border-slate-700",
  },
};

/**
 * Filter chips at the top of thread list for triage.
 */
export function ChatPriorityFilterBar({
  selectedTag,
  onSelectTag,
  tagCounts,
}: {
  selectedTag: ChatPriorityTag | "all";
  onSelectTag: (tag: ChatPriorityTag | "all") => void;
  tagCounts?: Partial<Record<ChatPriorityTag, number>>;
}) {
  const options: Array<{ id: ChatPriorityTag | "all"; label: string }> = [
    { id: "all", label: "সকল" },
    { id: "urgent", label: "জরুরী" },
    { id: "payment", label: "পেমেন্ট ইস্যু" },
    { id: "verification", label: "ভেরিফিকেশন" },
    { id: "general", label: "সাধারণ" },
  ];

  return (
    <div
      data-testid="chat-priority-filter-bar"
      className="flex flex-wrap items-center gap-1.5 border-b border-[#e5edf3] bg-[#f8fbfe] px-3 py-2"
    >
      <Tag className="size-3.5 text-j-ink-faint mr-0.5 shrink-0" />
      {options.map(opt => {
        const isSelected = selectedTag === opt.id;
        const count = opt.id !== "all" && tagCounts ? tagCounts[opt.id] : undefined;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectTag(opt.id)}
            aria-pressed={isSelected}
            className={`rounded-full px-2.5 py-0.5 text-2xs font-bold transition-colors ${
              isSelected
                ? "bg-j-accent text-white shadow-2xs"
                : "border border-j-border bg-white text-j-ink-soft hover:bg-j-surface-sunken"
            }`}
          >
            {opt.label}
            {count !== undefined && count > 0 ? (
              <span className={`ml-1 text-3xs ${isSelected ? "text-white" : "text-j-ink-faint"}`}>
                ({count})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Dropdown / Badge to assign or change a thread's priority tag.
 */
export function ChatPriorityTagSelector({
  currentTag,
  onSelectTag,
}: {
  currentTag: ChatPriorityTag | null;
  onSelectTag: (tag: ChatPriorityTag) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeConfig = currentTag ? CHAT_PRIORITY_CONFIG[currentTag] : null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="চ্যাটের প্রায়োরিটি ট্যাগ নির্ধারণ করুন"
        title="ট্যাগ পরিবর্তন করুন"
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-bold border transition-colors ${
          activeConfig
            ? activeConfig.badgeClass
            : "border-j-border bg-white text-j-ink-soft hover:bg-j-surface-sunken"
        }`}
      >
        <Tag className="size-3" />
        <span>{activeConfig ? activeConfig.label : "ট্যাগ যোগ করুন"}</span>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-j-border bg-white p-1.5 shadow-lg">
            {(Object.keys(CHAT_PRIORITY_CONFIG) as ChatPriorityTag[]).map(tagKey => {
              const cfg = CHAT_PRIORITY_CONFIG[tagKey];
              const isSelected = currentTag === tagKey;
              return (
                <button
                  key={tagKey}
                  type="button"
                  onClick={() => {
                    onSelectTag(tagKey);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-2xs font-bold transition-colors ${
                    isSelected ? cfg.activeClass : "text-j-ink hover:bg-j-surface-sunken"
                  }`}
                >
                  <span>{cfg.label}</span>
                  {isSelected ? <span className="text-3xs">✓</span> : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   TASK 11                                  */
/*                   OUT-OF-OFFICE SMART AUTO-RESPONSE BANNER                 */
/* -------------------------------------------------------------------------- */

/**
 * Checks if current time is outside BST (Bangladesh Standard Time, UTC+6) office hours.
 * Office hours: 09:00 AM to 11:00 PM BST (09:00 - 23:00).
 * Out of office: 11:00 PM to 09:00 AM BST (23:00 - 09:00).
 */
export function isOutOfOfficeHours(date: Date = new Date()): boolean {
  const utcHours = date.getUTCHours();
  const bstHours = (utcHours + 6) % 24;
  return bstHours >= 23 || bstHours < 9;
}

export function ChatOutOfOfficeBanner({
  forceShow,
  testDate,
  onContactEmergency,
}: {
  forceShow?: boolean;
  testDate?: Date;
  onContactEmergency?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const outOfOffice = forceShow ?? isOutOfOfficeHours(testDate);

  if (!outOfOffice || dismissed) return null;

  return (
    <aside
      data-testid="chat-out-of-office-banner"
      aria-label="অফিস আওয়ার সমাপ্তি নোটিশ"
      className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-2.5 text-white shadow-xs"
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-indigo-800/80 text-amber-300">
          <Moon className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-amber-300">
              আমাদের সাপোর্ট টিম বর্তমানে অফলাইনে আছেন
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-800/80 px-1.5 py-0.2 text-3xs font-semibold text-indigo-200">
              <Clock className="size-2.5" /> রাত ১১টা – সকাল ৯টা
            </span>
          </div>
          <p className="mt-0.5 text-2xs text-slate-300 leading-snug">
            আপনার মেসেজটি সুরক্ষিতভাবে জমা হয়েছে। সকাল ৯টায় আমাদের টিম প্রথম অগ্রাধিকার ভিত্তিতে উত্তর প্রদান করবে।
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {onContactEmergency ? (
          <button
            type="button"
            onClick={onContactEmergency}
            className="rounded-lg bg-amber-400 px-2.5 py-1 text-2xs font-bold text-slate-950 transition-colors hover:bg-amber-300"
          >
            জরুরী যোগাযোগ
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="নোটিশ বন্ধ করুন"
          title="নোটিশ বন্ধ করুন"
          className="grid size-6 place-items-center rounded text-slate-400 hover:bg-indigo-900/60 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   TASK 12                                  */
/*                 VERIFIED EMERGENCY CALL & WHATSAPP LAUNCHER                */
/* -------------------------------------------------------------------------- */

export type SiteContactShape = {
  number: string;
  display: string;
  tel: string;
  whatsapp: (message?: string) => string;
};

export function ChatEmergencyCallWhatsAppActions({
  contact,
  className = "",
}: {
  contact: SiteContactShape;
  className?: string;
}) {
  const whatsappUrl = contact.whatsapp(
    "আসসালামু আলাইকুম, কানেক্ট টিউটরস অ্যাডমিন সাপোর্ট প্রয়োজন।"
  );

  return (
    <div
      data-testid="chat-emergency-call-whatsapp-actions"
      className={`flex items-center gap-1.5 ${className}`}
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp-এ যোগাযোগ করুন"
        title="WhatsApp-এ মেসেজ পাঠান"
        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100 active:scale-95"
      >
        <MessageSquare className="size-3 text-emerald-600" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>

      <a
        href={contact.tel}
        aria-label={`সরাসরি কল করুন ${contact.display}`}
        title={`সরাসরি কল: ${contact.display}`}
        className="inline-flex items-center gap-1 rounded-lg border border-j-border bg-white px-2.5 py-1 text-2xs font-bold text-j-ink-soft transition-colors hover:bg-j-surface-sunken active:scale-95"
      >
        <Phone className="size-3 text-sky-600" />
        <span className="hidden sm:inline">{contact.display}</span>
      </a>

      <div
        title="বাংলাদেশ টিউশন প্রোভাইডার্স অ্যাসোসিয়েশন অনুমোদিত (Member: BTPA - 077)"
        className="hidden md:inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.8 text-3xs font-extrabold text-sky-800"
      >
        <ShieldCheck className="size-3 text-sky-600" />
        <span>BTPA - 077</span>
      </div>
    </div>
  );
}
