/**
 * Connect Tutors BD — AI Live Chat Knowledge Base & Intent Engine
 *
 * Provides domain knowledge, semantic intent detection, and context-aware
 * automated response generation for the Connect Tutors Live Chat assistant.
 * Supports Bengali, English, and Banglish inquiries with zero hallucination.
 */

import { toBanglaDigits } from "./digits";

export type AiChatIntent =
  | "GREETING"
  | "VERIFICATION_STATUS"
  | "VERIFICATION_DOCUMENTS"
  | "CV_DOWNLOAD"
  | "JOB_APPLICATION"
  | "TUITION_FEES"
  | "ONLINE_TUITION"
  | "APPOINTMENT_LETTER"
  | "PROFILE_EDIT"
  | "BTPA_MEMBERSHIP"
  | "CONTACT_SUPPORT"
  | "HUMAN_ESCALATION"
  | "GENERAL_FAQ";

export interface TutorChatContext {
  tutorName?: string | null;
  tutorId?: string | null;
  profileStatus?: "draft" | "pending" | "changes_requested" | "approved" | "suspended" | null;
  readinessScore?: number | null;
  hasNidUploaded?: boolean | null;
  hasStudentIdUploaded?: boolean | null;
  appliedJobsCount?: number | null;
  appointedJobsCount?: number | null;
}

export interface AiIntentMatch {
  intent: AiChatIntent;
  confidence: number; // 0 to 100
  matchedKeywords: string[];
}

export interface AiGeneratedReply {
  replyText: string;
  intent: AiChatIntent;
  confidence: number;
  isEscalated: boolean;
  suggestedQuickReplies?: string[];
}

/** Intent keyword dictionary covering Bengali, Banglish, and English */
const INTENT_RULES: Array<{
  intent: AiChatIntent;
  patterns: RegExp[];
  keywords: string[];
  weight: number;
}> = [
  {
    intent: "HUMAN_ESCALATION",
    patterns: [
      /এডমিন|অ্যাডমিন|কথা বলতে চাই|মানুষ|হিউম্যান|অভিযোগ|কথা বলব|ফোন দিন|কল করুন/i,
      /talk to admin|speak to human|real person|human agent|complaint|emergency call/i,
      /admin er shathe kotha|kotha bolbo|manush er shathe|call me|support team/i,
    ],
    keywords: ["admin", "human", "কথা বলতে চাই", "অভিযোগ", "এডমিন"],
    weight: 100,
  },
  {
    intent: "VERIFICATION_STATUS",
    patterns: [
      /ভেরিফাই.*হতে.*কত|ভেরিফিকেশন.*দেরি|কবে.*অ্যাপ্রুভ|স্ট্যাটাস.*পেন্ডিং|ভেরিফাই.*হয়নি|অ্যাপ্রুভাল/i,
      /verify.*status|verification.*time|how long.*verify|profile.*pending|when.*approve|when.*verif/i,
      /kobe verify hobe|verification keno hocche na|approve kobe hobe|status pending/i,
    ],
    keywords: ["verification", "verify", "অ্যাপ্রুভ", "পেন্ডিং", "দেরি"],
    weight: 90,
  },
  {
    intent: "VERIFICATION_DOCUMENTS",
    patterns: [
      /ডকুমেন্ট|এনআইডি|জাতীয় পরিচয়পত্র|পাসপোর্ট|স্টুডেন্ট আইডি|আইডি কার্ড|সার্টিফিকেট.*আপলোড|কি কি কাগজ/i,
      /document.*upload|nid.*card|student id|passport|certificates required|which documents/i,
      /ki ki document lagbe|nid upload|student id card|certificate/i,
    ],
    keywords: ["documents", "nid", "student id", "ডকুমেন্ট", "আইডি কার্ড"],
    weight: 85,
  },
  {
    intent: "CV_DOWNLOAD",
    patterns: [
      /সিভি|বায়োডাটা|সিভি.*ডাউনলোড|রেজুমে|পিডিএফ|বায়োডাটা.*পিডিএফ|cv download/i,
      /download cv|tutor cv|biodata pdf|resume download|1-page cv/i,
      /cv kivabe download korbo|cv pabo kothay|biodata pdf/i,
    ],
    keywords: ["cv", "biodata", "সিভি", "বায়োডাটা", "pdf"],
    weight: 85,
  },
  {
    intent: "JOB_APPLICATION",
    patterns: [
      /আবেদন|এপ্লাই|টিউশন.*পাব|জব বোর্ড|শর্টলিস্ট|টিউশন পাওয়া|ইন্টারভিউ|আবেদন করেছি/i,
      /apply.*job|job board|how to get tuition|shortlist.*interview|applied/i,
      /kivabe apply korbo|job kivabe pabo|tuition kivabe pabo|shortlisted/i,
    ],
    keywords: ["apply", "job board", "আবেদন", "টিউশন", "শর্টলিস্ট"],
    weight: 80,
  },
  {
    intent: "ONLINE_TUITION",
    patterns: [
      /অনলাইন|ট্রাভেল.*দূরত্ব|দূরত্ব.*ডিজেবল|অনলাইন.*টিউশন|ট্রাভেল ডিসট্যান্স/i,
      /online.*tuition|travel distance.*disabled|remote tuition/i,
      /online tuition|travel distance keno disabled/i,
    ],
    keywords: ["online", "travel distance", "অনলাইন", "দূরত্ব"],
    weight: 85,
  },
  {
    intent: "TUITION_FEES",
    patterns: [
      /বেতন|ফি|স্যালারি|পারিশ্রমিক|কত টাকা|কমিশন|সার্ভিস চার্জ|কত খরচ/i,
      /salary|fee|monthly budget|charges|commission|how much/i,
      /beton koto|salary koto|taka koto|service charge/i,
    ],
    keywords: ["salary", "fee", "বেতন", "ফি", "পারিশ্রমিক", "চার্জ"],
    weight: 75,
  },
  {
    intent: "APPOINTMENT_LETTER",
    patterns: [
      /লেটার|নিয়োগপত্র|কনফার্মেশন লেটার|কিউআর কোড|অ্যাপয়েন্টমেন্ট লেটার|verify letter/i,
      /confirmation letter|appointment letter|qr code verify|official letter/i,
      /confirmation letter kothay|letter kivabe pabo|appointment letter/i,
    ],
    keywords: ["confirmation letter", "appointment letter", "নিয়োগপত্র", "কিউআর"],
    weight: 85,
  },
  {
    intent: "PROFILE_EDIT",
    patterns: [
      /নাম.*পরিবর্তন|ফোন নম্বর.*বদল|এডিট|চেঞ্জ রিকোয়েস্ট|তথ্য ভুল|প্রোফাইল আপডেট/i,
      /change name|change phone|edit profile|update details|change request/i,
      /naam change korbo|phone number change|profile edit/i,
    ],
    keywords: ["edit profile", "change name", "change phone", "পরিবর্তন", "এডিট"],
    weight: 80,
  },
  {
    intent: "BTPA_MEMBERSHIP",
    patterns: [
      /বিটিপিএ|btpa|লাইসেন্স|অনুমোদন|সরকারি|বৈধতা|ট্রাস্ট/i,
      /btpa.*member|btpa-077|registered.*association|government approved/i,
      /btpa ki|btpa member/i,
    ],
    keywords: ["btpa", "btpa-077", "বিটিপিএ", "অনুমোদন"],
    weight: 90,
  },
  {
    intent: "CONTACT_SUPPORT",
    patterns: [
      /যোগাযোগ|হেল্পলাইন|অফিস|ঠিকানা|হোয়াটসঅ্যাপ|ফোন নম্বর|কন্টাক্ট/i,
      /contact us|helpline|office address|whatsapp number|support email/i,
      /jogajog kivabe korbo|helpline number koto|office kothay/i,
    ],
    keywords: ["contact", "helpline", "whatsapp", "যোগাযোগ", "হেল্পলাইন"],
    weight: 70,
  },
  {
    intent: "GREETING",
    patterns: [
      /^(হাই|হ্যালো|সালাম|আসসালামু আলাইকুম|কেমন আছেন|শুভ সকাল|শুভ সন্ধ্যা|hi|hello|salam|assalamu alaikum|hey)$/i,
      /সালামু আলাইকুম|assalamualaykum/i,
    ],
    keywords: ["সালাম", "hello", "hi", "হাই"],
    weight: 60,
  },
];

/**
 * Detects semantic intent from user text query
 */
export function detectAiChatIntent(rawMessage: string): AiIntentMatch {
  const query = (rawMessage || "").trim().toLowerCase();
  if (!query) {
    return { intent: "GENERAL_FAQ", confidence: 0, matchedKeywords: [] };
  }

  let bestMatch: AiIntentMatch = { intent: "GENERAL_FAQ", confidence: 30, matchedKeywords: [] };

  for (const rule of INTENT_RULES) {
    const matchedKeywords = rule.keywords.filter(kw => query.includes(kw.toLowerCase()));
    const patternMatched = rule.patterns.some(pattern => pattern.test(query));

    if (patternMatched || matchedKeywords.length > 0) {
      const matchScore = (patternMatched ? 60 : 0) + (matchedKeywords.length * 20);
      const calculatedConfidence = Math.min(rule.weight, Math.max(matchScore, 50));

      if (calculatedConfidence > bestMatch.confidence) {
        bestMatch = {
          intent: rule.intent,
          confidence: calculatedConfidence,
          matchedKeywords,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Connect Tutors Knowledge Base & Context-Aware Reply Generator
 */
export function generateAiChatResponse(input: {
  message: string;
  tutorContext?: TutorChatContext | null;
}): AiGeneratedReply {
  const { message, tutorContext } = input;
  const match = detectAiChatIntent(message);
  const tutorName = tutorContext?.tutorName?.trim() || "শিক্ষক";
  const tutorId = tutorContext?.tutorId ? `(ID: ${tutorContext.tutorId})` : "";

  switch (match.intent) {
    case "HUMAN_ESCALATION": {
      return {
        replyText: `ধন্যবাদ ${tutorName}। আপনার অনুরোধটি সরাসরি আমাদের সাপোর্ট এডমিন টিমের নিকট ফরোয়ার্ড করা হয়েছে। খুব শীঘ্রই একজন এডমিন সরাসরি এই চ্যাটে যুক্ত হয়ে আপনার সাথে কথা বলবেন। যেকোনো জরুরি প্রয়োজনে আমাদের অফিশিয়াল হেল্পলাইনেও যোগাযোগ করতে পারেন।`,
        intent: "HUMAN_ESCALATION",
        confidence: match.confidence,
        isEscalated: true,
        suggestedQuickReplies: ["জরুরি হেল্পলাইন নম্বর", "অফিস ঠিকানা"],
      };
    }

    case "VERIFICATION_STATUS": {
      if (tutorContext?.profileStatus === "approved") {
        return {
          replyText: `অভিনন্দন ${tutorName}! আপনার টিউটর প্রোফাইলটি ইতিমধ্যে অনুমোদিত (Approved) ও ভেরিফাইড হয়েছে। আপনি সরাসরি জব বোর্ড থেকে যেকোনো টিউশনে আবেদন করতে পারেন।`,
          intent: "VERIFICATION_STATUS",
          confidence: 95,
          isEscalated: false,
          suggestedQuickReplies: ["জব বোর্ডে আবেদন নিয়ম", "সিভি ডাউনলোড"],
        };
      }

      if (tutorContext?.hasNidUploaded === false) {
        return {
          replyText: `আসসালামু আলাইকুম ${tutorName}। আপনার প্রোফাইল ভেরিফিকেশনের জন্য জাতীয় পরিচয়পত্র (NID) বা স্টুডেন্ট আইডি আপলোড আবশ্যক। দয়া করে ড্যাশবোর্ডের Profile সেকশনে গিয়ে ভেরিফিকেশন ডকুমেন্ট আপলোড সম্পন্ন করুন। ডকুমেন্ট আপলোডের ২৪-৪৮ ঘণ্টার মধ্যে এডমিন টিম প্রোফাইল যাচাই সম্পন্ন করে।`,
          intent: "VERIFICATION_STATUS",
          confidence: 90,
          isEscalated: false,
          suggestedQuickReplies: ["কী কী ডকুমেন্ট লাগবে?", "প্রোফাইল চেকলিস্ট"],
        };
      }

      const score = tutorContext?.readinessScore ?? 0;
      if (score < 100) {
        return {
          replyText: `আসসালামু আলাইকুম ${tutorName}। আপনার প্রোফাইল প্রস্তুতি বর্তমানে ${score}% সম্পন্ন হয়েছে। ভেরিফিকেশনের জন্য ড্যাশবোর্ডের 'Verification Checklist' দেখে বাকি তথ্যগুলো পূরণ করুন। প্রোফাইল ১০০% সম্পন্ন হলে আমাদের কো-অর্ডিনেটর টিম দ্রুত রিভিউ সম্পন্ন করবে।`,
          intent: "VERIFICATION_STATUS",
          confidence: 88,
          isEscalated: false,
          suggestedQuickReplies: ["প্রোফাইল চেকলিস্ট দেখুন", "কী কী তথ্য বাকি?"],
        };
      }

      return {
        replyText: `আসসালামু আলাইকুম ${tutorName}। সাধারণ কর্মদিবসে প্রোফাইল সাবমিট বা ডকুমেন্ট আপলোডের ২৪ থেকে ৪৮ ঘণ্টার মধ্যে এডমিন টিম তথ্য ও সনদসমূহ যাচাই সম্পন্ন করে। প্রোফাইল এপ্রুভ হলে আপনি তাৎক্ষণিক নোটিফিকেশন পেয়ে যাবেন।`,
        intent: "VERIFICATION_STATUS",
        confidence: 85,
        isEscalated: false,
        suggestedQuickReplies: ["ডকুমেন্ট আপলোড নিয়ম", "এডমিনের সাথে কথা বলতে চাই"],
      };
    }

    case "VERIFICATION_DOCUMENTS": {
      return {
        replyText: `কানেক্ট টিউটরসে প্রোফাইল ভেরিফিকেশনের জন্য প্রধানত ৩ ধরনের ডকুমেন্ট প্রয়োজন হয়:\n১. জাতীয় পরিচয়পত্র (NID) অথবা পাসপোর্ট কপি (সম্পূর্ণ নিরাপদ ও এনক্রিপ্টেড)।\n২. বিশ্ববিদ্যালয় বা কলেজের স্টুডেন্ট আইডি কার্ড (Student ID)।\n৩. শিক্ষাগত যোগ্যতার সনদপত্র (SSC/HSC/Degree Certificates)।\nডকুমেন্টগুলো পরিষ্কারভাবে ছবি তুলে প্রোফাইল ওয়ার্কস্পেস থেকে আপলোড করতে পারেন।`,
        intent: "VERIFICATION_DOCUMENTS",
        confidence: 90,
        isEscalated: false,
        suggestedQuickReplies: ["ভেরিফিকেশনে কত সময় লাগে?", "প্রোফাইল চেকলিস্ট"],
      };
    }

    case "CV_DOWNLOAD": {
      return {
        replyText: `হ্যাঁ ${tutorName}! আপনার প্রোফাইল সম্পূর্ণ হলে টিউটর ড্যাশবোর্ডের মেনু থেকে এক ক্লিকেই অফিশিয়াল কানেক্ট টিউটরস লেটারহেড, ফটো ও ভেরিফিকেশন কিউআর কোড সম্বলিত ১-পেজ প্রফেশনাল এ৪ সিভি (Tutor CV PDF) বিনামূল্যে ডাউনলোড ও প্রিভিউ করতে পারবেন।`,
        intent: "CV_DOWNLOAD",
        confidence: 90,
        isEscalated: false,
        suggestedQuickReplies: ["প্রোফাইল এডিট করব কীভাবে?", "জব বোর্ডে আবেদন"],
      };
    }

    case "JOB_APPLICATION": {
      const appliedCount = tutorContext?.appliedJobsCount ?? 0;
      return {
        replyText: `কানেক্ট টিউটরস জব বোর্ডে প্রতিদিন ঢাকা ও দেশের বিভিন্ন প্রান্তের টিউশন প্রকাশিত হয়। আপনার পছন্দের লোকেশন, ক্লাস ও বিষয় মিলিয়ে যেকোনো জবে 'Apply' বাটনে ক্লিক করে আবেদন করতে পারবেন। আপনার প্রোফাইল পেন্ডিং থাকা অবস্থায়ও আবেদন করা সম্ভব (সেক্ষেত্রে 'Applied - Profile Pending' ব্যাজ থাকবে)।${appliedCount > 0 ? ` আপনি ইতিমধ্যে ${toBanglaDigits(appliedCount)}টি টিউশনে আবেদন করেছেন, যার অগ্রগতি 'Status' ট্যাবে দেখতে পাবেন।` : ""}`,
        intent: "JOB_APPLICATION",
        confidence: 88,
        isEscalated: false,
        suggestedQuickReplies: ["অ্যাপ্লিকেশন স্ট্যাটাস", "টিউশন স্যালারি রেঞ্জ"],
      };
    }

    case "ONLINE_TUITION": {
      return {
        replyText: `অনলাইন টিউশনের ক্ষেত্রে কোনো শারীরিক যাতায়াত করতে হয় না বিধায় টিউটর প্রোফাইল ফর্মে ট্রাভেল ডিসট্যান্স (Travel Distance Km) ফিল্ডটি স্বয়ক্রিয়ভাবে নিষ্ক্রিয় (Disabled) থাকে। আপনি চাইলে হোম ও অনলাইন উভয় মাধ্যমেই পাঠদানের সুযোগ নির্বাচন করতে পারেন।`,
        intent: "ONLINE_TUITION",
        confidence: 92,
        isEscalated: false,
        suggestedQuickReplies: ["পছন্দের এলাকা নির্বাচন", "টিউশন ফি নির্ধারণ"],
      };
    }

    case "TUITION_FEES": {
      return {
        replyText: `কানেক্ট টিউটরসে টিউশন ফি শিক্ষার্থীর ক্লাস, কারিকুলাম (বাংলা/ইংলিশ মিডিয়াম/ভার্সন), বিষয় এবং সপ্তাহের দিনের ওপর নির্ভর করে। সাধারণত মাসিক ফি ৪,০০০ টাকা থেকে ১৫,০০০+ টাকা পর্যন্ত হতে পারে। টিউটর প্রোফাইল ফর্মে আপনি আপনার সর্বনিম্ন ও সর্বোচ্চ গ্রহণযোগ্য ফি রেঞ্জ (Min/Max Fee) নির্ধারণ করে রাখতে পারেন।`,
        intent: "TUITION_FEES",
        confidence: 85,
        isEscalated: false,
        suggestedQuickReplies: ["অনলাইন টিউশন ফি", "জব বোর্ডে আবেদন"],
      };
    }

    case "APPOINTMENT_LETTER": {
      return {
        replyText: `কোনো টিউশনে অভিভাবক ও এডমিন কর্তৃক আপনি চূড়ান্তভাবে নিযুক্ত হলে একটি অফিশিয়াল নিয়োগ নিশ্চিতকরণ পত্র (Confirmation Letter) ইস্যু করা হয়। এটি আপনার ড্যাশবোর্ডের 'Confirmation Letter' সেকশন থেকে ডাউনলোড করতে পারবেন। এতে ডিজিটাল ওয়াটারমার্ক এবং স্ক্যানযোগ্য কিউআর কোড থাকে, যা দিয়ে ওয়েবসাইটে যেকোনো স্থান থেকে এর সত্যতা যাচাই করা যায়।`,
        intent: "APPOINTMENT_LETTER",
        confidence: 90,
        isEscalated: false,
        suggestedQuickReplies: ["লেটার ভেরিফাই কীভাবে করে?", "এডমিনের সাথে কথা বলুন"],
      };
    }

    case "PROFILE_EDIT": {
      return {
        replyText: `প্রোফাইলের শিক্ষাগত তথ্য, বিষয়, এলাকা ও বায়ো সরাসরি প্রোফাইল ওয়ার্কস্পেস থেকে এডিট করতে পারবেন। তবে নাম এবং মোবাইল নম্বর অত্যন্ত সংবেদনশীল হওয়ায় তা পরিবর্তনের জন্য সেটিংস থেকে একটি সুনির্দিষ্ট কারণ উল্লেখ করে 'Change Request' পাঠাতে হয়; এডমিন অনুমোদন করলেই তা কার্যকর হয়।`,
        intent: "PROFILE_EDIT",
        confidence: 85,
        isEscalated: false,
        suggestedQuickReplies: ["চেঞ্জ রিকোয়েস্ট কোথায়?", "প্রোফাইল চেকলিস্ট"],
      };
    }

    case "BTPA_MEMBERSHIP": {
      return {
        replyText: `কানেক্ট টিউটরস বিডি (Connect Tutors BD) হলো বাংলাদেশ টিউশন প্রোভাইডার্স অ্যাসোসিয়েশনের (BTPA) অফিশিয়াল নিবন্ধিত সদস্য (Member: BTPA - 077)। আমরা শতভাগ স্বচ্ছতা, শিক্ষক ও অভিভাবকদের নিরাপত্তা এবং কোয়ালিটি টিউশন নিশ্চিতকরণে অঙ্গীকারবদ্ধ।`,
        intent: "BTPA_MEMBERSHIP",
        confidence: 95,
        isEscalated: false,
        suggestedQuickReplies: ["নিরাপত্তা পলিসি", "যোগাযোগের ঠিকানা"],
      };
    }

    case "CONTACT_SUPPORT": {
      return {
        replyText: `আমাদের সাথে যোগাযোগের অফিশিয়াল মাধ্যমসমূহ:\n• ওয়েবসাইট: connecttutorsbd.com\n• প্ল্যাটফর্ম সাপোর্ট চ্যাট: এই লাইভ চ্যাটে যেকোনো বার্তা পাঠান।\n• সদস্যপদ: Member: BTPA - 077\nআমাদের কাস্টমার কেয়ার টিম সপ্তাহের ৭ দিনই আপনার সেবায় প্রস্তুত রয়েছে।`,
        intent: "CONTACT_SUPPORT",
        confidence: 85,
        isEscalated: false,
        suggestedQuickReplies: ["এডমিনের সাথে কথা বলতে চাই", "প্রোফাইল ভেরিফিকেশন"],
      };
    }

    case "GREETING": {
      return {
        replyText: `আসসালামু আলাইকুম ${tutorName} ${tutorId}! কানেক্ট টিউটরস এআই সাপোর্ট অ্যাসিস্ট্যান্টে আপনাকে স্বাগতম। আপনার প্রোফাইল ভেরিফিকেশন, জব বোর্ডে আবেদন, সিভি ডাউনলোড বা টিউশন সংক্রান্ত যেকোনো তথ্যে আমি আপনাকে সাহায্য করতে পারি। বলুন, কীভাবে সাহায্য করব?`,
        intent: "GREETING",
        confidence: 90,
        isEscalated: false,
        suggestedQuickReplies: ["প্রোফাইল ভেরিফিকেশন নিয়ম", "সিভি ডাউনলোড", "জব বোর্ডে আবেদন"],
      };
    }

    case "GENERAL_FAQ":
    default: {
      return {
        replyText: `ধন্যবাদ ${tutorName}। আপনার প্রশ্নটি বুঝতে পেরেছি। কানেক্ট টিউটরস প্ল্যাটফর্ম সংক্রান্ত যেকোনো জিজ্ঞাসা (যেমন: প্রোফাইল ভেরিফিকেশন, টিউশনে আবেদন, ১-পেজ সিভি ডাউনলোড, ফি পলিসি বা কনফার্মেশন লেটার) সম্পর্কে বিস্তারিত জানতে প্রশ্ন করতে পারেন। জরুরি সহায়তায় আমাদের এডমিন টিমের সাথেও কথা বলতে পারেন।`,
        intent: "GENERAL_FAQ",
        confidence: 45,
        isEscalated: false,
        suggestedQuickReplies: ["ভেরিফিকেশন কীভাবে করব?", "সিভি ডাউনলোড কীভাবে?", "এডমিনের সাথে কথা বলতে চাই"],
      };
    }
  }
}
