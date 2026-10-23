export type MessagePresetCategory = "tutor_chat" | "tutor_notify" | "guardian_notify";

export type MessagePreset = {
  id: string;
  command: string; // e.g. "/fee", "/verify", "/demo"
  title: string;
  body: string;
  category: MessagePresetCategory;
};

export const DEFAULT_MESSAGE_PRESETS: ReadonlyArray<MessagePreset> = [
  // --- Tutor Chat Quick Replies & Slash Commands ---
  {
    id: "chat-fee",
    command: "/fee",
    title: "প্ল্যাটফর্ম ফি ও পেমেন্ট নিয়ম",
    body: "আসসালামু আলাইকুম। টিউশন নিয়োগ নিশ্চিত হওয়ার পর প্রথম মাসের টিউশন ফির নির্ধারিত অংশ প্ল্যাটফর্ম চার্জ হিসেবে প্রদেয়। আপনি বিকাশ বা নগদ মার্চেন্ট নম্বরে পরিশোধ করে ট্রানজ্যাকশন আইডি সাবমিট করবেন।",
    category: "tutor_chat",
  },
  {
    id: "chat-verify",
    command: "/verify",
    title: "প্রোফাইল ভেরিফিকেশন তথ্য",
    body: "আপনার প্রোফাইল দ্রুত ভেরিফাই করতে অনুগ্রহ করে আপনার বিশ্ববিদ্যালয় স্টুডেন্ট আইডি কার্ড এবং এনআইডি (জাতীয় পরিচয়পত্র)-এর স্পষ্ট ছবি প্রোফাইল এডিটর থেকে আপলোড করুন।",
    category: "tutor_chat",
  },
  {
    id: "chat-demo",
    command: "/demo",
    title: "ডেমো ক্লাসের নিয়ম ও পরামর্শ",
    body: "অভিভাবকের সাথে আলোচনার ভিত্তিতে ১ম দিনের ডেমো ক্লাসের সময়সূচি নির্ধারণ করুন। ডেমো ক্লাসে বিষয়ভিত্তিক সিলেবাস ও স্টাডি প্ল্যান প্রস্তুত রাখুন এবং সময়মতো উপস্থিত থাকুন।",
    category: "tutor_chat",
  },
  {
    id: "chat-rules",
    command: "/rules",
    title: "টিউটর আচরণবিধি ও গাইডলাইন",
    body: "সম্মানিত টিউটর, কানেক্ট টিউটরস (BTPA-077 অনুমোদিত) কোড অব কন্ডাক্ট অনুযায়ী নিয়মিত ক্লাস নেওয়া, সময়ানুবর্তিতা বজায় রাখা এবং অভিভাবকের সাথে পেশাদার সম্পর্ক বজায় রাখা আবশ্যক।",
    category: "tutor_chat",
  },
  {
    id: "chat-contact",
    command: "/contact",
    title: "অফিসিয়াল হেল্পলাইন ও সাপোর্ট",
    body: "যেকোনো জরুরি জিজ্ঞাসা বা সহায়তার জন্য আমাদের অফিসিয়াল হেল্পলাইন ও হোয়াটসঅ্যাপ নম্বরে সরাসরি যোগাযোগ করতে পারেন।",
    category: "tutor_chat",
  },
  {
    id: "chat-congrats",
    command: "/congrats",
    title: "টিউশন নিয়োগের অভিনন্দন",
    body: "অভিনন্দন! সংশ্লিষ্ট টিউশনে আপনার নিয়োগ চূড়ান্ত হয়েছে। অনুগ্রহ করে আপনার ড্যাশবোর্ড থেকে অফিসিয়াল টিউশন কনফার্মেশন লেটার ডাউনলোড করে ক্লাসের প্রস্তুতি গ্রহণ করুন।",
    category: "tutor_chat",
  },

  // --- Tutor Bulk Notify Presets ---
  {
    id: "tutor-notify-urgent-jobs",
    command: "/urgent-jobs",
    title: "নতুন জরুরি টিউশন অ্যালার্ট",
    body: "আপনার পছন্দের এলাকায় নতুন টিউশন পোস্ট করা হয়েছে! দ্রুত জব বোর্ডে গিয়ে বিস্তারিত দেখে আবেদন করুন।",
    category: "tutor_notify",
  },
  {
    id: "tutor-notify-complete-profile",
    command: "/complete-profile",
    title: "প্রোফাইল সম্পূর্ণ ও সাবমিট করুন",
    body: "আপনার টিউটর প্রোফাইল এখনও অসম্পূর্ণ রয়েছে। টিউশনে আবেদন করতে ও দ্রুত অ্যাপ্রুভাল পেতে প্রয়োজনীয় সকল তথ্য পূরণ করে প্রোফাইল সাবমিট করুন।",
    category: "tutor_notify",
  },
  {
    id: "tutor-notify-fee-due",
    command: "/fee-due",
    title: "প্ল্যাটফর্ম চার্জ পরিশোধের তাগিদ",
    body: "সম্মানিত টিউটর, আপনার নিয়োগপ্রাপ্ত টিউশনের প্ল্যাটফর্ম চার্জ পরিশোধের সময় ঘনিয়ে এসেছে। বিলম্ব এড়াতে নির্ধারিত সময়ের মধ্যে বিকাশ/নগদে পরিশোধ সম্পন্ন করুন।",
    category: "tutor_notify",
  },
  {
    id: "tutor-notify-confirmation-letter",
    command: "/letter-ready",
    title: "অফিসিয়াল টিউশন কনফার্মেশন লেটার",
    body: "আপনার সাম্প্রতিক টিউশন নিয়োগের অফিসিয়াল কনফার্মেশন লেটার প্রস্তুত। ড্যাশবোর্ড থেকে লেটারটি ডাউনলোড ও প্রিন্ট করে নিতে পারেন।",
    category: "tutor_notify",
  },
  {
    id: "tutor-notify-holiday",
    command: "/holiday",
    title: "ছুটির নোটিশ ও শুভেচ্ছা",
    body: "উৎসবকালীন ছুটির সময়ে আমাদের নিয়মিত অফিস কার্যক্রম সীমিত থাকবে। তবে জরুরি প্রয়োজনে হেল্পলাইন সেবা সচল থাকবে। সবাইকে আন্তরিক শুভেচ্ছা!",
    category: "tutor_notify",
  },

  // --- Guardian Bulk Notify Presets ---
  {
    id: "guardian-notify-tutors-applied",
    command: "/tutors-applied",
    title: "আপনার টিউশনে অভিজ্ঞ টিউটররা আবেদন করেছেন",
    body: "আপনার পোস্টকৃত টিউশনে শীর্ষ বিশ্ববিদ্যালয়ের যোগ্য টিউটররা আবেদন করেছেন। ড্যাশবোর্ডে গিয়ে সিভি পর্যালোচনা করে ডেমো ক্লাসের জন্য শর্টলিস্ট করুন।",
    category: "guardian_notify",
  },
  {
    id: "guardian-notify-demo-scheduled",
    command: "/demo-scheduled",
    title: "টিউটরের সাথে ডেমো ক্লাস নির্ধারণ",
    body: "আপনার মনোনীত টিউটরের সাথে ডেমো ক্লাসের সময় নির্ধারণ করা হয়েছে। ক্লাসের পর আপনার মূল্যবান মতামত আমাদের জানাবেন।",
    category: "guardian_notify",
  },
  {
    id: "guardian-notify-review",
    command: "/review-request",
    title: "টিউশন ও টিউটর পারফরম্যান্স রিভিউ",
    body: "আপনার সন্তানের টিউশন ক্লাস কেমন চলছে? টিউটরের পাঠদান মান সম্পর্কে আপনার মূল্যবান রেটিং ও মন্তব্য দিয়ে আমাদের সেবা উন্নত করতে সহায়তা করুন।",
    category: "guardian_notify",
  },
];

export function getPresetsByCategory(category: MessagePresetCategory): MessagePreset[] {
  return DEFAULT_MESSAGE_PRESETS.filter(p => p.category === category);
}

/**
 * Normalizes a raw slash command string:
 * - Trims and lowercases
 * - Strips leading slashes
 * - Converts spaces and special characters to hyphens
 * - Ensures a single leading slash (e.g. "discount" -> "/discount")
 */
export function normalizeSlashCommand(cmd: string): string {
  if (!cmd) return "/";
  const trimmed = cmd.trim().toLowerCase().replace(/^\/+/, "");
  const slug = trimmed
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `/${slug}`;
}

/**
 * Validates whether a command string is an acceptable slash command.
 * Must start with optional `/` followed by 1 to 34 alphanumeric/dash/underscore characters.
 */
export function isValidSlashCommand(cmd: string): boolean {
  if (!cmd) return false;
  const trimmed = cmd.trim();
  const withoutSlash = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  if (!withoutSlash || withoutSlash.length > 34) return false;
  return /^[a-z0-9][a-z0-9_-]{0,33}$/i.test(withoutSlash);
}

export function findPresetByCommand(command: string): MessagePreset | undefined {
  const normalized = normalizeSlashCommand(command);
  return DEFAULT_MESSAGE_PRESETS.find(p => p.command.toLowerCase() === normalized);
}
