/**
 * The Owner's switches for how the tuition flow behaves, set on the Dynamic
 * Section's Admin Control page.
 *
 * Each one is stored as a single number in `site_limits` - the same table the
 * Owner's numeric dials use, so no table of its own - under an id that is kept
 * out of the limits registry on purpose: a switch like this one has work to do
 * when it moves, so it is never saved through the plain Limits editor.
 */

/**
 * Which of a tuition's applicants a Guardian can see, open and ask about.
 * Either way the Guardian's applied count covers everyone, and an appointed
 * Tutor is always visible.
 */
export type GuardianApplicantVisibility = "all" | "shortlisted";

export const guardianApplicantVisibilityValues = ["all", "shortlisted"] as const satisfies readonly GuardianApplicantVisibility[];

/** The row id in `site_limits`. */
export const GUARDIAN_APPLICANT_VISIBILITY_ID = "control.guardianApplicantVisibility";

/** Until the Owner chooses, a Guardian sees only the Tutors an Admin shortlisted. */
export const DEFAULT_GUARDIAN_APPLICANT_VISIBILITY: GuardianApplicantVisibility = "shortlisted";

export function guardianApplicantVisibilityFromStored(value: number | null | undefined): GuardianApplicantVisibility {
  if (value === 0) return "all";
  if (value === 1) return "shortlisted";
  return DEFAULT_GUARDIAN_APPLICANT_VISIBILITY;
}

export function storedGuardianApplicantVisibility(mode: GuardianApplicantVisibility): number {
  return mode === "all" ? 0 : 1;
}

export const TUTOR_GUARDIAN_LOGIN_OTP_ENABLED_ID = "control.tutorGuardianLoginOtp";
export const TUTOR_GUARDIAN_LOGIN_OTP_DAYS_ID = "control.tutorGuardianLoginOtpDays";
/**
 * Counts how many times the Owner has reset every trusted browser. A proof is
 * signed with the count current when it was given, so raising it ends them all.
 */
export const TUTOR_GUARDIAN_LOGIN_OTP_EPOCH_ID = "control.tutorGuardianLoginOtpEpoch";

/** Off until the Owner turns it on from Admin Control. */
export const DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_ENABLED = false;
export const DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_DAYS = 30;
export const TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MIN = 1;
export const TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MAX = 90;

export function tutorGuardianLoginOtpEnabledFromStored(value: number | null | undefined): boolean {
  if (value === 1) return true;
  if (value === 0) return false;
  return DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_ENABLED;
}

export function tutorGuardianLoginOtpEpochFromStored(value: number | null | undefined): number {
  return Number.isInteger(value) && (value as number) > 0 ? (value as number) : 0;
}

export function tutorGuardianLoginOtpDaysFromStored(value: number | null | undefined): number {
  if (value === null || value === undefined) return DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_DAYS;
  return Math.min(TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MAX, Math.max(TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MIN, Math.round(value)));
}

/**
 * Whether a new tuition on the Job Board alerts the Tutors it fits - a notice in
 * their bell and a phone alert. On until the Owner turns it off, because the
 * phone alert was already going out before there was a switch for it.
 */
export const NEW_TUITION_TUTOR_ALERTS_ENABLED_ID = "control.newTuitionTutorAlerts";

export const DEFAULT_NEW_TUITION_TUTOR_ALERTS_ENABLED = true;

export function newTuitionTutorAlertsEnabledFromStored(value: number | null | undefined): boolean {
  if (value === 0) return false;
  if (value === 1) return true;
  return DEFAULT_NEW_TUITION_TUTOR_ALERTS_ENABLED;
}
/**
 * When a Tutor is eligible to send messages in Live Chat to the Admin team.
 * - "appointed": Tutor has at least one tuition in "matched" (appointed or confirmed) status.
 * - "approved": Tutor's profile status is "approved".
 * - "all": Any logged-in registered tutor can chat.
 * - "disabled": Chat is temporarily disabled for all tutors.
 */
export type TutorChatAccessMode = "appointed" | "approved" | "all" | "disabled";

export const tutorChatAccessModeValues = [
  "appointed",
  "approved",
  "all",
  "disabled",
] as const satisfies readonly TutorChatAccessMode[];

export const TUTOR_CHAT_ACCESS_MODE_ID = "control.tutorChatAccessMode";

export const DEFAULT_TUTOR_CHAT_ACCESS_MODE: TutorChatAccessMode = "appointed";

export function tutorChatAccessModeFromStored(value: number | null | undefined): TutorChatAccessMode {
  if (value === 0) return "appointed";
  if (value === 1) return "approved";
  if (value === 2) return "all";
  if (value === 3) return "disabled";
  return DEFAULT_TUTOR_CHAT_ACCESS_MODE;
}

export function storedTutorChatAccessMode(mode: TutorChatAccessMode): number {
  switch (mode) {
    case "appointed": return 0;
    case "approved": return 1;
    case "all": return 2;
    case "disabled": return 3;
  }
}

/**
 * Chat Business Hours & Out-of-Office Auto-Reply Bot.
 * Allows Project Owner to define daily office hours (in minutes from midnight, Bangladesh time UTC+6).
 * During off-hours, incoming messages from tutors trigger an immediate courteous auto-reply bot.
 */
export const CHAT_BUSINESS_HOURS_ENABLED_ID = "control.chatBusinessHoursEnabled";
export const CHAT_BUSINESS_HOURS_START_ID = "control.chatBusinessHoursStart";
export const CHAT_BUSINESS_HOURS_END_ID = "control.chatBusinessHoursEnd";

export const DEFAULT_CHAT_BUSINESS_HOURS_ENABLED = false;
export const DEFAULT_CHAT_BUSINESS_HOURS_START = 600; // 10:00 AM (10 * 60)
export const DEFAULT_CHAT_BUSINESS_HOURS_END = 1200; // 8:00 PM (20 * 60)

export const DEFAULT_CHAT_AUTO_REPLY_MESSAGE =
  "আসসালামু আলাইকুম। আমাদের অফিস সময় প্রতিদিন সকাল ১০:০০ টা থেকে রাত ৮:০০ টা পর্যন্ত। আপনার বার্তাটি আমরা পেয়েছি। অফিস শুরু হওয়ামাত্রই অ্যাডমিন টিম উত্তর দেবে। জরুরি প্রয়োজনে হেল্পলাইনে কল করুন।";

export function chatBusinessHoursEnabledFromStored(value: number | null | undefined): boolean {
  if (value === 0) return false;
  if (value === 1) return true;
  return DEFAULT_CHAT_BUSINESS_HOURS_ENABLED;
}

export function chatBusinessHoursStartFromStored(value: number | null | undefined): number {
  if (typeof value === "number" && value >= 0 && value < 1440) return value;
  return DEFAULT_CHAT_BUSINESS_HOURS_START;
}

export function chatBusinessHoursEndFromStored(value: number | null | undefined): number {
  if (typeof value === "number" && value >= 0 && value < 1440) return value;
  return DEFAULT_CHAT_BUSINESS_HOURS_END;
}

export function minutesToTimeString(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      return Math.max(0, Math.min(1439, h * 60 + m));
    }
  }
  return DEFAULT_CHAT_BUSINESS_HOURS_START;
}

export function isWithinBusinessHours(
  date: Date = new Date(),
  startMinutes = DEFAULT_CHAT_BUSINESS_HOURS_START,
  endMinutes = DEFAULT_CHAT_BUSINESS_HOURS_END
): boolean {
  // Bangladesh is UTC+6
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const bdTime = new Date(utc + 6 * 3600000);
  const currentMinutes = bdTime.getHours() * 60 + bdTime.getMinutes();
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Pre-Chat Topics for Tutor Live Chat
 */
export type TutorChatTopic = {
  id: string;
  label: string;
  icon: string;
  prefix: string;
};

export const TUTOR_CHAT_TOPICS: ReadonlyArray<TutorChatTopic> = [
  { id: "tuition_apply", label: "টিউশন আবেদন", icon: "💼", prefix: "[বিষয়: টিউশন আবেদন]" },
  { id: "payment_fee", label: "পেমেন্ট ও ফি", icon: "💳", prefix: "[বিষয়: পেমেন্ট ও ফি]" },
  { id: "profile_verify", label: "প্রোফাইল ভেরিফিকেশন", icon: "👤", prefix: "[বিষয়: প্রোফাইল ভেরিফিকেশন]" },
  { id: "demo_class", label: "ডেমো ক্লাস / শিডিউল", icon: "📅", prefix: "[বিষয়: ডেমো ক্লাস]" },
  { id: "general_inquiry", label: "সাধারণ জিজ্ঞাসা", icon: "❓", prefix: "[বিষয়: সাধারণ জিজ্ঞাসা]" },
];

export function extractTopicFromMessage(body: string): TutorChatTopic | undefined {
  if (!body) return undefined;
  return TUTOR_CHAT_TOPICS.find(t => body.includes(t.prefix) || body.toLowerCase().includes(t.label.toLowerCase()));
}
