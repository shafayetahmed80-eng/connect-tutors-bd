import AdminSlashPresetsManager from "@/components/AdminSlashPresetsManager";
import SiteLimitEditor from "@/components/SiteLimitEditor";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_NEW_TUITION_TUTOR_ALERTS_ENABLED,
  DEFAULT_CHAT_AUTO_REPLY_MESSAGE,
  DEFAULT_CHAT_BUSINESS_HOURS_ENABLED,
  DEFAULT_CHAT_BUSINESS_HOURS_END,
  DEFAULT_CHAT_BUSINESS_HOURS_START,
  minutesToTimeString,
  timeStringToMinutes,
  DEFAULT_TUTOR_CHAT_ACCESS_MODE,
  DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_DAYS,
  DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_ENABLED,
  TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MAX,
  TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MIN,
  type GuardianApplicantVisibility,
  type TutorChatAccessMode,
} from "@shared/admin-control";
import { communityLinkSlotId, communityPanels, DEFAULT_COMMUNITY_LINK, isCommunityLink, type CommunityPanel } from "@shared/community";
import { paymentAccountMethods, paymentAccountSlotId, tuitionPaymentMethodLabels, type PaymentAccountMethod } from "@shared/platform-charge";
import { MAX_SITE_CONTENT_TEXT_LENGTH } from "@shared/site-content";
import { LoadingCradle } from "@/components/BrandMark";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const visibilityOptions: Array<{ value: GuardianApplicantVisibility; label: string }> = [
  { value: "all", label: "All applicants" },
  { value: "shortlisted", label: "Shortlisted only" },
];

const communityLabels: Record<CommunityPanel, string> = {
  tutor: "Tutor panel",
  guardian: "Guardian panel",
};

/**
 * Where each panel's "Join our Community" row goes.
 *
 * The two panels are set apart on purpose: the Tutors' group and the
 * Guardians' need not be the same one. An empty box means the shipped address,
 * which is what Reset restores.
 */
function CommunityLinks() {
  const utils = trpc.useUtils();
  const stored = trpc.siteContent.list.useQuery({ page: "admin-control" });
  const [drafts, setDrafts] = useState<Partial<Record<CommunityPanel, string>>>({});
  const save = trpc.siteContent.save.useMutation({
    onSuccess: () => { void utils.siteContent.list.invalidate({ page: "admin-control" }); toast.success("Saved."); },
    onError: error => { toast.error(error.message); },
  });

  const savedLink = (panel: CommunityPanel) =>
    stored.data?.find(row => row.slotId === communityLinkSlotId(panel))?.text?.trim() || DEFAULT_COMMUNITY_LINK;

  // The boxes start on what is stored, and pick up a save made elsewhere.
  useEffect(() => { if (stored.data) setDrafts({}); }, [stored.data]);

  return <section className="mt-3 rounded-xl border border-j-border bg-white p-3 shadow-sm">
    <h2 className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Join our Community</h2>
    <div className="mt-2 space-y-2">
      {communityPanels.map(panel => {
        const saved = savedLink(panel);
        const typed = drafts[panel] ?? saved;
        const valid = isCommunityLink(typed);
        const dirty = typed.trim() !== saved;
        const busy = save.isPending && save.variables?.slotId === communityLinkSlotId(panel);
        return <div key={panel} className="flex flex-wrap items-center gap-2">
          <label htmlFor={`community-${panel}`} className="w-28 shrink-0 text-sm font-bold text-j-ink">{communityLabels[panel]}</label>
          <input
            id={`community-${panel}`}
            value={typed}
            spellCheck={false}
            inputMode="url"
            aria-invalid={!valid}
            onChange={event => setDrafts(current => ({ ...current, [panel]: event.target.value }))}
            className={`h-control min-w-0 flex-1 rounded-xl border bg-j-surface-sunken px-3 text-sm outline-none focus:ring-2 focus:ring-sky-100 ${valid ? "border-j-border focus:border-j-accent" : "border-[#d84a4a]"}`}
          />
          <button
            type="button"
            disabled={!dirty || !valid || busy}
            onClick={() => save.mutate({ slotId: communityLinkSlotId(panel), text: typed.trim() === DEFAULT_COMMUNITY_LINK ? null : typed.trim() })}
            className="h-control rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-40"
          >{busy ? "Saving…" : "Save"}</button>
          <button
            type="button"
            disabled={saved === DEFAULT_COMMUNITY_LINK || busy}
            onClick={() => save.mutate({ slotId: communityLinkSlotId(panel), text: null })}
            className="h-control rounded-xl border border-j-border px-3 text-sm font-bold text-j-ink-soft disabled:opacity-40"
          >Reset</button>
        </div>;
      })}
    </div>
  </section>;
}

/**
 * Whether a new tuition on the Job Board alerts the Tutors it fits - a notice in
 * their bell and a phone alert. Saves as soon as it is picked.
 */

export const tutorChatAccessOptions: ReadonlyArray<{
  value: TutorChatAccessMode;
  label: string;
  badge?: string;
  description: string;
}> = [
  {
    value: "appointed",
    label: "নিয়োগপ্রাপ্ত (Appointed)",
    badge: "ডিফল্ট",
    description: "কমপক্ষে একটি টিউশনে নিযুক্ত/ম্যাচড হওয়া টিউটররা মেসেজ দিতে পারবেন",
  },
  {
    value: "approved",
    label: "অনুমোদিত (Approved)",
    description: "সকল অনুমোদিত প্রোফাইলধারী টিউটররা লাইভ চ্যাটে মেসেজ দিতে পারবেন",
  },
  {
    value: "all",
    label: "সকল টিউটর (All)",
    description: "যেকোনো নিবন্ধিত টিউটর লাইভ চ্যাটে মেসেজ দিতে পারবেন",
  },
  {
    value: "disabled",
    label: "সাময়িক বন্ধ (Disabled)",
    description: "সকল টিউটরের জন্য লাইভ চ্যাট সাময়িকভাবে বন্ধ থাকবে",
  },
];

const chatModeConfirmDetails: Record<
  TutorChatAccessMode,
  {
    warningTitle: string;
    warningDesc: string;
    warningType: "info" | "warning" | "danger";
    confirmButtonLabel: string;
    confirmButtonClass: string;
  }
> = {
  all: {
    warningTitle: "সতর্কতা: উন্মুক্ত চ্যাট অ্যাক্সেস",
    warningDesc: "প্ল্যাটফর্মের সকল নিবন্ধিত টিউটর (প্রোফাইল অনুমোদন ছাড়াই) অ্যাডমিন টিমের সাথে চ্যাট করতে পারবেন। এতে মেসেজের পরিমাণ ও ইনবক্সের কাজের চাপ বৃদ্ধি পেতে পারে।",
    warningType: "warning",
    confirmButtonLabel: "হ্যাঁ, সকল টিউটরকে চ্যাট অনুমতি দিন",
    confirmButtonClass: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  disabled: {
    warningTitle: "সতর্কতা: চ্যাট সাময়িক স্থগিত",
    warningDesc: "সকল টিউটরের জন্য নতুন মেসেজ পাঠানোর ইনপুট বন্ধ হয়ে যাবে। তবে কোনো অ্যাডমিন আগে মেসেজ পাঠালে টিউটর স্বাভাবিকভাবে রিপ্লাই দিতে পারবেন।",
    warningType: "danger",
    confirmButtonLabel: "হ্যাঁ, চ্যাট সাময়িক বন্ধ করুন",
    confirmButtonClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  appointed: {
    warningTitle: "নিয়োগপ্রাপ্ত টিউটর অ্যাক্সেস (ডিফল্ট)",
    warningDesc: "শুধুমাত্র কমপক্ষে একটি টিউশনে নিযুক্ত (Appointed বা Confirmed) হওয়া টিউটররা লাইভ চ্যাটে মেসেজ পাঠাতে পারবেন। এটি ইনবক্স স্প্যামমুক্ত রাখতে সহায়তা করে।",
    warningType: "info",
    confirmButtonLabel: "হ্যাঁ, মোড পরিবর্তন করুন",
    confirmButtonClass: "bg-j-accent hover:bg-sky-600 text-white",
  },
  approved: {
    warningTitle: "অনুমোদিত প্রোফাইল অ্যাক্সেস",
    warningDesc: "যেসব টিউটরের প্রোফাইল অ্যাডমিন টিম কর্তৃক ভেরিফায়েড ও অনুমোদিত (Approved) হয়েছে, তারা সবাই সরাসরি লাইভ চ্যাটে যোগাযোগ করতে পারবেন।",
    warningType: "info",
    confirmButtonLabel: "হ্যাঁ, মোড পরিবর্তন করুন",
    confirmButtonClass: "bg-j-accent hover:bg-sky-600 text-white",
  },
};

/**
 * Which tutors may initiate messages in live chat to the Admin team:
 * "appointed" (default), "approved", "all", or "disabled".
 * Admin-initiated messages can always be replied to by the tutor.
 */
function TutorChatAccessSwitch({ mode }: { mode: TutorChatAccessMode }) {
  const utils = trpc.useUtils();
  const [pendingMode, setPendingMode] = useState<TutorChatAccessMode | null>(null);

  const setMode = trpc.adminControl.setTutorChatAccessMode.useMutation({
    onSuccess: () => {
      setPendingMode(null);
      void utils.adminControl.get.invalidate();
      toast.success("Saved.");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleSelectMode = (target: TutorChatAccessMode) => {
    if (target === mode || setMode.isPending) return;
    setPendingMode(target);
  };

  const handleConfirm = () => {
    if (!pendingMode || setMode.isPending) return;
    setMode.mutate({ mode: pendingMode });
  };

  const currentOption = tutorChatAccessOptions.find(o => o.value === mode);
  const targetOption = tutorChatAccessOptions.find(o => o.value === pendingMode);
  const targetDetails = pendingMode ? chatModeConfirmDetails[pendingMode] : null;

  return <section className="mt-3 rounded-xl border border-j-border bg-white p-3 shadow-sm">
    <h2 id="tutor-chat-access-heading" className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">
      Tutor Live Chat Access (টিউটর লাইভ চ্যাট পারমিশন)
    </h2>
    <p className="mt-1 text-xs text-j-ink-muted">
      টিউটররা কখন অ্যাডমিন টিমের সাথে লাইভ চ্যাটে যোগাযোগ করতে পারবেন তা নিয়ন্ত্রণ করুন।
    </p>

    <div role="radiogroup" aria-labelledby="tutor-chat-access-heading" className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {tutorChatAccessOptions.map(option => {
        const selected = option.value === mode;
        return <button
          key={option.value}
          type="button"
          role="radio"
          aria-label={option.label}
          aria-checked={selected}
          disabled={setMode.isPending}
          onClick={() => handleSelectMode(option.value)}
          className={`relative flex flex-col items-start rounded-xl border p-3 text-left transition-all disabled:opacity-60 ${
            selected
              ? "border-j-accent bg-blue-50/50 shadow-sm ring-1 ring-j-accent"
              : "border-j-border bg-white hover:border-j-ink-faint hover:bg-j-surface-sunken"
          }`}
        >
          <div className="flex w-full items-center justify-between gap-1.5">
            <span className={`text-sm font-bold ${selected ? "text-j-accent" : "text-j-ink-strong"}`}>
              {option.label}
            </span>
            {option.badge ? (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-2xs font-semibold text-blue-700">
                {option.badge}
              </span>
            ) : null}
          </div>
          <span className="mt-1 text-xs leading-relaxed text-j-ink-soft">
            {option.description}
          </span>
        </button>;
      })}
    </div>

    <div className="mt-2.5 rounded-lg border border-sky-100 bg-sky-50/70 p-2 text-xs text-sky-900">
      <span className="font-semibold">💡 অ্যাডমিন রিপ্লাই বাইপাস:</span> অ্যাডমিন যদি কোনো টিউটরকে আগে মেসেজ পাঠান, তবে মোড যাই থাকুক না কেন টিউটর তাৎক্ষণিকভাবে উত্তর দিতে পারবেন।
    </div>

    {pendingMode && targetOption && targetDetails ? (
      <Modal
        size="dialog"
        onClose={() => { if (!setMode.isPending) setPendingMode(null); }}
        busy={setMode.isPending}
      >
        <ModalHeader title="টিউটর লাইভ চ্যাট পারমিশন পরিবর্তন নিশ্চিত করুন" />
        <ModalBody>
          <div className="space-y-3.5">
            <p className="text-xs leading-relaxed text-j-ink-soft">
              আপনি কি টিউটরদের লাইভ চ্যাট পারমিশন পরিবর্তন করতে চান? এই পরিবর্তনটি পুরো প্ল্যাটফর্মে অবিলম্বে কার্যকর হবে।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-j-border bg-j-surface-sunken p-2.5 text-xs">
              <div className="rounded-lg border border-j-border bg-white p-2.5">
                <span className="text-2xs font-semibold uppercase tracking-wider text-j-ink-faint">বর্তমান মোড</span>
                <p className="mt-0.5 font-bold text-j-ink-strong">{currentOption?.label ?? mode}</p>
                <p className="mt-0.5 text-2xs text-j-ink-muted">{currentOption?.description}</p>
              </div>
              <div className="rounded-lg border border-j-accent/30 bg-blue-50/60 p-2.5">
                <span className="text-2xs font-semibold uppercase tracking-wider text-j-accent">নতুন নির্বাচিত মোড</span>
                <p className="mt-0.5 font-bold text-j-accent">{targetOption.label}</p>
                <p className="mt-0.5 text-2xs text-j-ink-muted">{targetOption.description}</p>
              </div>
            </div>

            <div
              className={`rounded-xl border p-3 text-xs leading-relaxed ${
                targetDetails.warningType === "danger"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : targetDetails.warningType === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-sky-200 bg-sky-50 text-sky-900"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <span>{targetDetails.warningType === "danger" ? "🛑" : targetDetails.warningType === "warning" ? "⚠️" : "ℹ️"}</span>
                <span>{targetDetails.warningTitle}</span>
              </div>
              <p>{targetDetails.warningDesc}</p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            disabled={setMode.isPending}
            onClick={() => setPendingMode(null)}
            className="h-control rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-40"
          >
            বাতিল করুন
          </button>
          <button
            type="button"
            disabled={setMode.isPending}
            onClick={handleConfirm}
            className={`h-control rounded-xl px-4 text-sm font-bold transition-all disabled:opacity-50 ${targetDetails.confirmButtonClass}`}
          >
            {setMode.isPending ? "সংরক্ষণ হচ্ছে…" : targetDetails.confirmButtonLabel}
          </button>
        </ModalFooter>
      </Modal>
    ) : null}
  </section>;
}


/**
 * Live Chat Business Hours & Out-of-Office Auto-Reply Bot settings.
 * During off-hours, an incoming message from a tutor triggers a courteous auto-reply.
 */
function ChatBusinessHoursSettings({ settings }: { settings?: { enabled: boolean; startMinutes: number; endMinutes: number } }) {
  const utils = trpc.useUtils();
  const enabled = settings?.enabled ?? DEFAULT_CHAT_BUSINESS_HOURS_ENABLED;
  const startMin = settings?.startMinutes ?? DEFAULT_CHAT_BUSINESS_HOURS_START;
  const endMin = settings?.endMinutes ?? DEFAULT_CHAT_BUSINESS_HOURS_END;

  const [startTime, setStartTime] = useState(() => minutesToTimeString(startMin));
  const [endTime, setEndTime] = useState(() => minutesToTimeString(endMin));

  const setHours = trpc.adminControl.setChatBusinessHours.useMutation({
    onSuccess: () => { void utils.adminControl.get.invalidate(); toast.success("Saved."); },
    onError: error => { toast.error(error.message); },
  });

  const handleToggle = (nextEnabled: boolean) => {
    setHours.mutate({
      enabled: nextEnabled,
      startMinutes: timeStringToMinutes(startTime),
      endMinutes: timeStringToMinutes(endTime),
    });
  };

  const handleSaveTimes = () => {
    setHours.mutate({
      enabled,
      startMinutes: timeStringToMinutes(startTime),
      endMinutes: timeStringToMinutes(endTime),
    });
  };

  const changed = timeStringToMinutes(startTime) !== startMin || timeStringToMinutes(endTime) !== endMin;

  return (
    <section className="mt-3 rounded-xl border border-j-border bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="chat-business-hours-heading" className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">
            Live Chat Business Hours (অফিস সময় ও অটো-রেসপন্ডার)
          </h2>
          <p className="mt-0.5 text-xs text-j-ink-muted">
            অফিস সময়ের বাইরে কোনো টিউটর মেসেজ দিলে তাৎক্ষণিক স্বয়ংক্রিয় প্রফেশনাল বার্তা পাঠাবে।
          </p>
        </div>
        <div role="radiogroup" aria-labelledby="chat-business-hours-heading" className="inline-flex gap-1 rounded-xl border border-j-border bg-j-surface-sunken p-1">
          {([[false, "Off"], [true, "On"]] as const).map(([val, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={enabled === val}
              disabled={setHours.isPending}
              onClick={() => { if (enabled !== val) handleToggle(val); }}
              className={`h-8 rounded-lg px-3 text-xs font-bold disabled:opacity-60 ${
                enabled === val ? "bg-white text-j-accent shadow-sm" : "text-j-ink-soft hover:text-j-ink-strong"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {enabled ? (
        <div className="mt-3 space-y-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3 text-xs text-sky-950">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 font-semibold">
              <span>শুরু (Start):</span>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="h-8 rounded-lg border border-j-border bg-white px-2 text-xs font-medium text-j-ink"
              />
            </label>
            <label className="flex items-center gap-1.5 font-semibold">
              <span>শেষ (End):</span>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="h-8 rounded-lg border border-j-border bg-white px-2 text-xs font-medium text-j-ink"
              />
            </label>
            {changed ? (
              <button
                type="button"
                onClick={handleSaveTimes}
                disabled={setHours.isPending}
                className="h-8 rounded-lg bg-j-accent px-3 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Save Times
              </button>
            ) : null}
          </div>
          <p className="text-2xs leading-relaxed text-sky-800">
            🤖 <span className="font-semibold">স্বয়ংক্রিয় বার্তার নমুনা:</span> "{DEFAULT_CHAT_AUTO_REPLY_MESSAGE}"
          </p>
        </div>
      ) : null}
    </section>
  );
}

function NewTuitionAlertsSwitch({ enabled }: { enabled: boolean }) {
  const utils = trpc.useUtils();
  const setEnabled = trpc.adminControl.setNewTuitionTutorAlertsEnabled.useMutation({
    onSuccess: () => { void utils.adminControl.get.invalidate(); toast.success("Saved."); },
    onError: error => { toast.error(error.message); },
  });
  return <section className="mt-3 rounded-xl border border-j-border bg-white p-3 shadow-sm">
    <h2 id="new-tuition-alerts-heading" className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">New tuition alerts to Tutors</h2>
    <div role="radiogroup" aria-labelledby="new-tuition-alerts-heading" className="mt-2 inline-flex gap-1 rounded-xl border border-j-border bg-j-surface-sunken p-1">
      {([[true, "On"], [false, "Off"]] as const).map(([value, label]) => <button
        key={label}
        type="button"
        role="radio"
        aria-checked={enabled === value}
        disabled={setEnabled.isPending}
        onClick={() => { if (enabled !== value) setEnabled.mutate({ enabled: value }); }}
        className={`h-9 rounded-lg px-3.5 text-sm font-bold disabled:opacity-60 ${enabled === value ? "bg-white text-j-accent shadow-sm" : "text-j-ink-soft hover:text-j-ink-strong"}`}
      >{label}</button>)}
    </div>
  </section>;
}

/**
 * Whether a Tutor or Guardian must give an SMS code after their password, and
 * for how many days a browser that did stays trusted. The switch saves as soon
 * as it is picked; the days save on their own button. Resetting ends the trust
 * of every browser at once, after a confirmation.
 */
function LoginCodeSettings({ settings }: { settings?: { enabled: boolean; rememberDays: number } }) {
  const utils = trpc.useUtils();
  const enabled = settings?.enabled ?? DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_ENABLED;
  const savedDays = settings?.rememberDays ?? DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_DAYS;
  const [typedDays, setTypedDays] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const done = () => { void utils.adminControl.get.invalidate(); toast.success("Saved."); };
  const setEnabled = trpc.adminControl.setTutorGuardianLoginOtpEnabled.useMutation({ onSuccess: done, onError: error => { toast.error(error.message); } });
  const resetTrust = trpc.adminControl.resetTutorGuardianLoginTrust.useMutation({
    onSuccess: () => { setConfirmingReset(false); toast.success("Reset."); },
    onError: error => { toast.error(error.message); },
  });
  const setDays = trpc.adminControl.setTutorGuardianLoginOtpDays.useMutation({
    onSuccess: () => { setTypedDays(null); done(); },
    onError: error => { toast.error(error.message); },
  });

  const shown = typedDays ?? String(savedDays);
  const parsed = Number(shown);
  const valid = Number.isInteger(parsed) && parsed >= TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MIN && parsed <= TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MAX;
  const dirty = valid && parsed !== savedDays;

  return <section className="mt-3 rounded-xl border border-j-border bg-white p-3 shadow-sm">
    <h2 id="login-code-heading" className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Tutor and Guardian sign-in code</h2>
    <p className="mt-1 text-xs text-j-ink-soft">
      When Off, tutors and guardians can register and log in directly without SMS OTP codes. When On, 4-digit SMS OTP verification is required for registration and password sign-in.
    </p>
    <div role="radiogroup" aria-labelledby="login-code-heading" className="mt-2 inline-flex gap-1 rounded-xl border border-j-border bg-j-surface-sunken p-1">
      {([[true, "On"], [false, "Off"]] as const).map(([value, label]) => <button
        key={label}
        type="button"
        role="radio"
        aria-checked={enabled === value}
        disabled={setEnabled.isPending}
        onClick={() => { if (enabled !== value) setEnabled.mutate({ enabled: value }); }}
        className={`h-9 rounded-lg px-3.5 text-sm font-bold disabled:opacity-60 ${enabled === value ? "bg-white text-j-accent shadow-sm" : "text-j-ink-soft hover:text-j-ink-strong"}`}
      >{label}</button>)}
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label htmlFor="login-code-days" className="w-28 shrink-0 text-sm font-bold text-j-ink">Remember for</label>
      <input
        id="login-code-days"
        value={shown}
        inputMode="numeric"
        aria-invalid={!valid}
        onChange={event => setTypedDays(event.target.value.replace(/D/g, "").slice(0, 2))}
        className={`h-control w-20 rounded-xl border bg-j-surface-sunken px-3 text-center text-sm outline-none focus:ring-2 focus:ring-sky-100 ${valid ? "border-j-border focus:border-j-accent" : "border-[#d84a4a]"}`}
      />
      <span className="text-sm font-bold text-j-ink-soft">days</span>
      <button
        type="button"
        disabled={!dirty || setDays.isPending}
        onClick={() => setDays.mutate({ days: parsed })}
        className="h-control rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-40"
      >{setDays.isPending ? "Saving…" : "Save"}</button>
    </div>
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setConfirmingReset(true)}
        className="h-control rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft hover:text-j-ink-strong"
      >Reset trusted browsers</button>
    </div>
    {confirmingReset ? <Modal size="dialog" onClose={() => setConfirmingReset(false)} busy={resetTrust.isPending}>
      <ModalHeader title="Reset trusted browsers?" />
      <ModalBody>
        <p className="text-sm leading-6 text-j-ink-soft">Every Tutor and Guardian will be asked for a sign-in code again the next time they open their panel.</p>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setConfirmingReset(false)} className="h-control rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Back</button>
        <button
          type="button"
          disabled={resetTrust.isPending}
          onClick={() => resetTrust.mutate()}
          className="h-control rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >{resetTrust.isPending ? "Resetting…" : "Reset"}</button>
      </ModalFooter>
    </Modal> : null}
  </section>;
}

/**
 * Where a Tutor sends a platform charge, one line per method: the number or
 * account, and whose it is. A method left empty is not offered to Tutors.
 */
function PaymentAccounts() {
  const utils = trpc.useUtils();
  const stored = trpc.siteContent.list.useQuery({ page: "admin-control" });
  const [drafts, setDrafts] = useState<Partial<Record<PaymentAccountMethod, string>>>({});
  const save = trpc.siteContent.save.useMutation({
    onSuccess: () => { void utils.siteContent.list.invalidate({ page: "admin-control" }); toast.success("Saved."); },
    onError: error => { toast.error(error.message); },
  });

  const savedLine = (method: PaymentAccountMethod) =>
    stored.data?.find(row => row.slotId === paymentAccountSlotId(method))?.text?.trim() ?? "";

  useEffect(() => { if (stored.data) setDrafts({}); }, [stored.data]);

  return <section className="mt-3 rounded-xl border border-j-border bg-white p-3 shadow-sm">
    <h2 className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Where Tutors pay</h2>
    <div className="mt-2 space-y-2">
      {paymentAccountMethods.map(method => {
        const saved = savedLine(method);
        const typed = drafts[method] ?? saved;
        const dirty = typed.trim() !== saved;
        const busy = save.isPending && save.variables?.slotId === paymentAccountSlotId(method);
        const label = tuitionPaymentMethodLabels[method];
        return <div key={method} className="flex flex-wrap items-center gap-2">
          <label htmlFor={`account-${method}`} className="w-28 shrink-0 text-sm font-bold text-j-ink">{label}</label>
          <input
            id={`account-${method}`}
            value={typed}
            maxLength={MAX_SITE_CONTENT_TEXT_LENGTH}
            spellCheck={false}
            onChange={event => setDrafts(current => ({ ...current, [method]: event.target.value }))}
            className="h-control min-w-0 flex-1 rounded-xl border border-j-border bg-j-surface-sunken px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={() => save.mutate({ slotId: paymentAccountSlotId(method), text: typed.trim() || null })}
            className="h-control rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-40"
          >{busy ? "Saving…" : "Save"}</button>
          <button
            type="button"
            disabled={!saved || busy}
            onClick={() => save.mutate({ slotId: paymentAccountSlotId(method), text: null })}
            className="h-control rounded-xl border border-j-border px-3 text-sm font-bold text-j-ink-soft disabled:opacity-40"
          >Reset</button>
        </div>;
      })}
    </div>
  </section>;
}

/**
 * The Owner's switches: which applicants a Guardian meets, whether a new
 * tuition alerts the Tutors it fits, and the sign-in code.
 *
 * A choice saves as soon as it is picked, except turning to "Shortlisted only"
 * while Guardians have appointment requests for Tutors nobody shortlisted -
 * those are cancelled by the move, so the count is shown and confirmed first.
 */
export default function AdminControlEditor() {
  const utils = trpc.useUtils();
  const control = trpc.adminControl.get.useQuery();
  const [confirming, setConfirming] = useState(false);
  const setVisibility = trpc.adminControl.setGuardianApplicantVisibility.useMutation({
    onSuccess: result => {
      setConfirming(false);
      void utils.adminControl.get.invalidate();
      toast.success(result.cancelledAppointmentRequests
        ? `Saved. ${result.cancelledAppointmentRequests} appointment ${result.cancelledAppointmentRequests === 1 ? "request was" : "requests were"} cancelled.`
        : "Saved.");
    },
    onError: error => { toast.error(error.message); },
  });

  if (control.isLoading) {
    return <div className="flex min-h-32 items-center justify-center rounded-xl border border-j-border bg-white text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading Admin Control…</div>;
  }
  if (control.isError || !control.data) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Admin Control could not be loaded.</div>;
  }

  const current = control.data.guardianApplicantVisibility;
  const outsideShortlist = control.data.appointmentRequestsOutsideShortlist;
  const choose = (value: GuardianApplicantVisibility) => {
    if (value === current || setVisibility.isPending) return;
    if (value === "shortlisted" && outsideShortlist > 0) {
      setConfirming(true);
      return;
    }
    setVisibility.mutate({ visibility: value });
  };

  return <>
    <section className="rounded-xl border border-j-border bg-white p-3 shadow-sm">
      <h2 id="guardian-applicants-heading" className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Guardian applicants</h2>
      <div role="radiogroup" aria-labelledby="guardian-applicants-heading" className="mt-2 inline-flex flex-wrap gap-1 rounded-xl border border-j-border bg-j-surface-sunken p-1">
        {visibilityOptions.map(option => {
          const selected = option.value === current;
          return <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={setVisibility.isPending}
            onClick={() => choose(option.value)}
            className={`h-9 rounded-lg px-3.5 text-sm font-bold disabled:opacity-60 ${selected ? "bg-white text-j-accent shadow-sm" : "text-j-ink-soft hover:text-j-ink-strong"}`}
          >{option.label}</button>;
        })}
      </div>
    </section>

    <NewTuitionAlertsSwitch enabled={control.data.newTuitionTutorAlerts?.enabled ?? DEFAULT_NEW_TUITION_TUTOR_ALERTS_ENABLED} />

    <TutorChatAccessSwitch mode={control.data.tutorChatAccessMode ?? DEFAULT_TUTOR_CHAT_ACCESS_MODE} />

    <ChatBusinessHoursSettings settings={control.data.chatBusinessHours} />

    <AdminSlashPresetsManager />

    <LoginCodeSettings settings={control.data.tutorGuardianLoginOtp} />

    <CommunityLinks />

    <PaymentAccounts />

    <section className="mt-3">
      <h2 className="mb-2 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Platform charge</h2>
      <SiteLimitEditor groups={["Platform charge"]} />
    </section>

    {confirming ? <Modal size="dialog" onClose={() => setConfirming(false)} busy={setVisibility.isPending}>
      <ModalHeader title="Show Guardians shortlisted Tutors only?" />
      <ModalBody>
        <p className="text-sm leading-6 text-j-ink-soft">
          {outsideShortlist === 1
            ? "1 waiting appointment request is for a Tutor who is not shortlisted. It will be cancelled."
            : `${outsideShortlist} waiting appointment requests are for Tutors who are not shortlisted. They will be cancelled.`}
        </p>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setConfirming(false)} className="h-control rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Back</button>
        <button
          type="button"
          disabled={setVisibility.isPending}
          onClick={() => setVisibility.mutate({ visibility: "shortlisted" })}
          className="h-control rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >{setVisibility.isPending ? "Saving…" : "Cancel requests and save"}</button>
      </ModalFooter>
    </Modal> : null}
  </>;
}
