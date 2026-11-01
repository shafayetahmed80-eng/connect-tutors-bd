/**
 * Connect Tutors BD — Guardian AI Live Chat Knowledge Base & Intent Engine
 *
 * Semantic intent classification, domain knowledge, and context-aware
 * automated responses tailored for Guardians / Parents in Bangladesh.
 */

export type GuardianAiChatIntent =
  | "GREETING"
  | "TUITION_FEE_ESTIMATE"
  | "POST_REQUEST_GUIDE"
  | "MATCHING_TIMEFRAME"
  | "TUTOR_VERIFICATION"
  | "ONLINE_VS_HOME"
  | "REPLACEMENT_GUARANTEE"
  | "SECURITY_SAFETY"
  | "MY_REQUEST_STATUS"
  | "HUMAN_ESCALATION"
  | "GENERAL_FAQ";

export interface GuardianChatContext {
  guardianName?: string | null;
  guardianId?: string | null;
  totalRequestsCount?: number;
  hasActiveRequest?: boolean;
  latestRequestStatus?: string | null;
}

export interface GuardianAiGeneratedReply {
  replyText: string;
  intent: GuardianAiChatIntent;
  confidence: number;
  isEscalated: boolean;
  suggestedQuickReplies?: string[];
  actionChips?: Array<{ label: string; url: string; icon?: string }>;
}

const GUARDIAN_INTENT_RULES: Array<{
  intent: GuardianAiChatIntent;
  patterns: RegExp[];
  keywords: string[];
  weight: number;
}> = [
  {
    intent: "HUMAN_ESCALATION",
    patterns: [
      /এডমিন|অ্যাডমিন|কথা বলতে চাই|মানুষ|হিউম্যান|অভিযোগ|কথা বলব|ফোন দিন|কল করুন|সরাসরি কথা/i,
      /talk to admin|speak to human|real person|human agent|call me|support team/i,
      /admin er shathe kotha|kotha bolbo|manush er shathe|call korun/i,
    ],
    keywords: ["admin", "human", "কথা বলতে চাই", "অভিযোগ", "এডমিন", "কল করুন"],
    weight: 100,
  },
  {
    intent: "TUITION_FEE_ESTIMATE",
    patterns: [
      /টিউশন ফি|ফি কেমন|ফি কত|বেতন|স্যালারি|পারিশ্রমিক|কত টাকা|কত খরচ|খরচ কেমন|বাজেট/i,
      /fee|salary|budget|how much|charges|monthly cost/i,
      /tuition fee|beton koto|salary koto|khoroch koto|taka koto/i,
    ],
    keywords: ["salary", "fee", "টিউশন ফি", "ফি", "বেতন", "খরচ", "টাকা", "বাজেট"],
    weight: 90,
  },
  {
    intent: "MATCHING_TIMEFRAME",
    patterns: [
      /কত দিন|কত সময়|কবে পাব|কখন পাব|দেরি হবে|সময় লাগবে|কতক্ষণ/i,
      /how long|timeframe|how many days|when will i get|how fast/i,
      /koto din lagbe|kobe pabo|koto shomoy lagbe/i,
    ],
    keywords: ["how long", "timeframe", "কত দিন", "কত সময়", "কবে পাব"],
    weight: 85,
  },
  {
    intent: "TUTOR_VERIFICATION",
    patterns: [
      /ভেরিফিকেশন|ভেরিফাই|আইডি কার্ড|এনআইডি|বিশ্ববিদ্যালয়|বিশ্বস্ত|নিরাপত্তা|ব্যাকগ্রাউন্ড/i,
      /verify|verification|background check|nid|student id|safe|trusted/i,
      /verify kivabe koren|tutor authentic ki/i,
    ],
    keywords: ["verify", "verification", "ভেরিফিকেশন", "এনআইডি", "নিরাপত্তা"],
    weight: 85,
  },
  {
    intent: "POST_REQUEST_GUIDE",
    patterns: [
      /কীভাবে.*টিউটর.*পাব|রিকোয়েস্ট.*পোস্ট|পোস্ট.*কীভাবে|টিউটর.*চাই|রিকোয়েস্ট.*দিব/i,
      /how to post|request a tutor|how to hire|find tutor/i,
      /kivabe request korbo|tutor kivabe pabo|post kivabe korbo/i,
    ],
    keywords: ["post request", "hire", "টিউটর চাই", "রিকোয়েস্ট", "পোস্ট"],
    weight: 80,
  },
  {
    intent: "REPLACEMENT_GUARANTEE",
    patterns: [
      /পছন্দ না হলে|পরিবর্তন|রিপ্লেসমেন্ট|টিউটর বদল|চেঞ্জ করা যাবে|বাদ দেওয়া/i,
      /replacement|change tutor|replace|not satisfied|dissatisfied/i,
      /pochondo na hole|change kora jabe|replace kora jabe/i,
    ],
    keywords: ["replacement", "change tutor", "পরিবর্তন", "রিপ্লেসমেন্ট", "পছন্দ না হলে"],
    weight: 85,
  },
  {
    intent: "ONLINE_VS_HOME",
    patterns: [
      /অনলাইন.*নাকি.*হোম|বাসায় এসে|অনলাইন ক্লাস|হোম টিউশন/i,
      /online vs home|home tutor|online class|home tutoring/i,
      /bashay eshe|online naki offline/i,
    ],
    keywords: ["online", "home tutor", "অনলাইন", "বাসায়", "হোম টিউশন"],
    weight: 80,
  },
  {
    intent: "SECURITY_SAFETY",
    patterns: [
      /নিরাপদ|বাসায়.*নিরাপত্তা|মহিলা টিউটর|লেডি টিউটর|বিশ্বাসযোগ্য/i,
      /safe|security|safety|female tutor|lady tutor|trusted/i,
      /nirapotta kemon|lady tutor ache/i,
    ],
    keywords: ["security", "safety", "female tutor", "নিরাপত্তা", "লেডি টিউটর"],
    weight: 80,
  },
  {
    intent: "MY_REQUEST_STATUS",
    patterns: [
      /আমার রিকোয়েস্ট|আবেদনের অবস্থা|কয়জন আবেদন|শর্টলিস্ট হয়েছে|আমার পোস্ট/i,
      /my request|status of my request|how many applied|applicants/i,
      /amar request er obostha|koyjon apply korlo/i,
    ],
    keywords: ["my request", "applicants", "আমার রিকোয়েস্ট", "আবেদন"],
    weight: 85,
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

export function detectGuardianAiChatIntent(rawMessage: string): {
  intent: GuardianAiChatIntent;
  confidence: number;
  matchedKeywords: string[];
} {
  const query = (rawMessage || "").trim().toLowerCase();
  if (!query) {
    return { intent: "GENERAL_FAQ", confidence: 0, matchedKeywords: [] };
  }

  let bestMatch = { intent: "GENERAL_FAQ" as GuardianAiChatIntent, confidence: 30, matchedKeywords: [] as string[] };

  for (const rule of GUARDIAN_INTENT_RULES) {
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

export function generateGuardianAiChatResponse(input: {
  message: string;
  guardianContext?: GuardianChatContext | null;
}): GuardianAiGeneratedReply {
  const { message, guardianContext } = input;
  const match = detectGuardianAiChatIntent(message);
  const guardianName = guardianContext?.guardianName?.trim() || "সম্মানিত অভিভাবক";

  switch (match.intent) {
    case "HUMAN_ESCALATION": {
      return {
        replyText: `ধন্যবাদ ${guardianName}। আপনার বার্তাটি সরাসরি আমাদের অভিভাবক সাপোর্ট ম্যানেজারের নিকট ফরোয়ার্ড করা হয়েছে। খুব শীঘ্রই একজন এডমিন সরাসরি আপনার সাথে কথা বলবেন বা হেল্পলাইন থেকে কল করবেন। যেকোনো জরুরি প্রয়োজনে আমাদের অফিশিয়াল নম্বরেও সরাসরি কল করতে পারেন: +8801516131411।`,
        intent: "HUMAN_ESCALATION",
        confidence: match.confidence,
        isEscalated: true,
        suggestedQuickReplies: ["জরুরি হেল্পলাইন নম্বর", "অফিস ঠিকানা"],
        actionChips: [{ label: "📞 সরাসরি কল করুন", url: "tel:+8801516131411" }],
      };
    }

    case "TUITION_FEE_ESTIMATE": {
      return {
        replyText: `আসসালামু আলাইকুম ${guardianName}। টিউশনের পারিশ্রমিক সাধারণত শিক্ষার্থীর শ্রেণি, কারিকুলাম ও সপ্তাহে দিনের সংখ্যার ওপর নির্ভর করে:\n• বাংলা মিডিয়াম (১ম-৫ম শ্রেণি, ৩ দিন): ৩,৫০০ - ৫,০০০ টাকা/মাস\n• বাংলা ও ইংলিশ ভার্সন (৬ষ্ঠ-১০ম শ্রেণি, ৩-৪ দিন): ৫,৫০০ - ৮,৫০০ টাকা/মাস\n• ইংলিশ মিডিয়াম / ও-লেভেল (Cambridge/Edexcel): ৮,০০০ - ১৫,০০০+ টাকা/মাস\n\nআপনি আপনার বাজেট অনুযায়ী টিউটর রিকোয়েস্ট পোস্ট করতে পারেন।`,
        intent: "TUITION_FEE_ESTIMATE",
        confidence: 90,
        isEscalated: false,
        suggestedQuickReplies: ["টিউটর রিকোয়েস্ট পাঠাতে চাই", "কত দিনে টিউটর পাব?"],
        actionChips: [{ label: "📝 রিকোয়েস্ট পোস্ট করুন", url: "/request-tutor" }],
      };
    }

    case "MATCHING_TIMEFRAME": {
      return {
        replyText: `কানেক্ট টিউটরস প্ল্যাটফর্মে রিকোয়েস্ট পোস্ট করার সাধারণত ২৪ থেকে ৪৮ ঘণ্টার মধ্যে আপনার চাহিদামতো সেরা ৩ থেকে ৫ জন যাচাইকৃত টিউটরের প্রোফাইল শর্টলিস্ট করে উপস্থাপন করা হয়। এরপর আপনি পছন্দ অনুযায়ী ডেমো ক্লাসের ব্যবস্থা করতে পারেন।`,
        intent: "MATCHING_TIMEFRAME",
        confidence: 85,
        isEscalated: false,
        suggestedQuickReplies: ["টিউটর ভেরিফিকেশন কীভাবে হয়?", "টিউটর রিকোয়েস্ট পোস্ট"],
        actionChips: [{ label: "📝 টিউটর রিকোয়েস্ট পোস্ট করুন", url: "/request-tutor" }],
      };
    }

    case "TUTOR_VERIFICATION": {
      return {
        replyText: `আমরা অত্যন্ত সতর্কতার সাথে প্রতিটি টিউটরের সত্যতা নিশ্চিত করি:\n১. জাতীয় পরিচয়পত্র (NID) ও স্মার্টকার্ড যাচাই।\n২. স্বনামধন্য বিশ্ববিদ্যালয়ের স্টুডেন্ট আইডি ও শিক্ষাগত সনদ যাচাই।\n৩. আমাদের প্ল্যাটফর্মটি বাংলাদেশ টিউশন প্রোভাইডার্স অ্যাসোসিয়েশনের নিবন্ধিত সদস্য (BTPA - 077)।\nনিযুক্তির পর কিউআর কোড সম্বলিত অফিশিয়াল লেটার প্রদান করা হয়।`,
        intent: "TUTOR_VERIFICATION",
        confidence: 90,
        isEscalated: false,
        suggestedQuickReplies: ["টিউটর পরিবর্তন গ্যারান্টি", "টিউশন ফির নিয়ম"],
        actionChips: [{ label: "🛡️ বিটিপিএ ভেরিফিকেশন তথ্য", url: "/about" }],
      };
    }

    case "POST_REQUEST_GUIDE": {
      return {
        replyText: `খুব সহজেই ৩টি ধাপে টিউটর রিকোয়েস্ট পোস্ট করতে পারেন:\n১. 'Request a Tutor' ফর্মে শিক্ষার্থীর শ্রেণি, বিষয় ও এলাকা নির্বাচন করুন।\n২. সপ্তাহে কত দিন এবং আপনার প্রস্তাবিত মাসিক বাজেট উল্লেখ করুন।\n৩. আপনার মোবাইল নম্বর দিয়ে সাবমিট করলেই আমাদের টিম উপযুক্ত টিউটর শর্টলিস্ট করবে।`,
        intent: "POST_REQUEST_GUIDE",
        confidence: 85,
        isEscalated: false,
        suggestedQuickReplies: ["টিউশন ফি কেমন হতে পারে?", "কত দিনে টিউটর পাব?"],
        actionChips: [{ label: "📝 টিউটর রিকোয়েস্ট ফর্ম পূরণ করুন", url: "/request-tutor" }],
      };
    }

    case "REPLACEMENT_GUARANTEE": {
      return {
        replyText: `জি ${guardianName}, কোনো কারণে নিযুক্ত টিউটরের পাঠদান সন্তোষজনক না হলে আমরা সম্পূর্ণ বিনামূল্যে দ্রুত বিকল্প টিউটর (Free Replacement) প্রদান করে থাকি। অভিভাবকের সন্তুষ্টিই আমাদের সর্বোচ্চ অগ্রাধিকার।`,
        intent: "REPLACEMENT_GUARANTEE",
        confidence: 85,
        isEscalated: false,
        suggestedQuickReplies: ["আমার রিকোয়েস্ট স্ট্যাটাস", "এডমিনের সাথে কথা বলুন"],
        actionChips: [{ label: "📋 আমার রিকোয়েস্ট দেখুন", url: "/guardian/requests" }],
      };
    }

    case "ONLINE_VS_HOME": {
      return {
        replyText: `কানেক্ট টিউটরস-এ আপনি হোম টিউটর (বাসায় এসে পড়ানো) এবং অনলাইন টিউটর (Zoom/Google Meet) উভয় সুবিধা পাবেন। আপনার এলাকায় অভিজ্ঞ টিউটর পেতে হোম টিউশন বেছে নিতে পারেন, অথবা দেশের শীর্ষ বিশ্ববিদ্যালয়ের টিউটরদের তত্ত্বাবধানে ঘরে বসেই সাশ্রয়ী খরচে অনলাইন ক্লাস করাতে পারেন।`,
        intent: "ONLINE_VS_HOME",
        confidence: 80,
        isEscalated: false,
        suggestedQuickReplies: ["টিউশন ফি বাজেট", "রিকোয়েস্ট পোস্ট"],
        actionChips: [{ label: "📝 টিউটর রিকোয়েস্ট পোস্ট করুন", url: "/request-tutor" }],
      };
    }

    case "SECURITY_SAFETY": {
      return {
        replyText: `বাসায় টিউটর রাখার ক্ষেত্রে অভিভাবকের নিরাপত্তা আমাদের প্রধান দায়িত্ব। আমাদের প্রতিটি টিউটরের এনআইডি ও স্থায়ী ঠিকানা সংরক্ষিত থাকে। এছাড়া নারী শিক্ষার্থীদের জন্য দক্ষ মহিলা টিউটর (Female Tutors) অগ্রাধিকার ভিত্তিতে সরবরাহ করা হয়।`,
        intent: "SECURITY_SAFETY",
        confidence: 80,
        isEscalated: false,
        suggestedQuickReplies: ["লেডি টিউটর পাওয়া যাবে?", "ভেরিফিকেশন নিয়ম"],
        actionChips: [{ label: "📝 রিকোয়েস্ট পোস্ট করুন", url: "/request-tutor" }],
      };
    }

    case "MY_REQUEST_STATUS": {
      if (guardianContext?.hasActiveRequest) {
        return {
          replyText: `জি ${guardianName}, আপনার বর্তমান টিউশন রিকোয়েস্টটি আমাদের সিস্টেমে সক্রিয় রয়েছে (স্ট্যাটাস: ${guardianContext.latestRequestStatus || "প্রক্রিয়াধীন"})। ড্যাশবোর্ডের 'Requests' সেকশনে গিয়ে আবেদনকারী টিউটরদের তালিকা ও তাদের শিক্ষাগত যোগ্যতা দেখতে পারেন।`,
          intent: "MY_REQUEST_STATUS",
          confidence: 90,
          isEscalated: false,
          suggestedQuickReplies: ["আবেদনকারী টিউটরদের তালিকা", "এডমিনের সাথে কথা বলুন"],
          actionChips: [{ label: "📋 রিকোয়েস্ট ডিটেইলস দেখুন", url: "/guardian/requests" }],
        };
      }
      return {
        replyText: `আসসালামু আলাইকুম ${guardianName}। আপনার অ্যাকাউন্টে বর্তমানে কোনো সক্রিয় টিউশন রিকোয়েস্ট নেই। নতুন টিউটর পেতে এখনই ১ মিনিটে টিউটর রিকোয়েস্ট পোস্ট করতে পারেন।`,
        intent: "MY_REQUEST_STATUS",
        confidence: 80,
        isEscalated: false,
        suggestedQuickReplies: ["রিকোয়েস্ট পোস্ট কীভাবে করব?", "টিউশন ফি কত?"],
        actionChips: [{ label: "📝 টিউটর রিকোয়েস্ট পোস্ট করুন", url: "/request-tutor" }],
      };
    }

    case "GREETING": {
      return {
        replyText: `আসসালামু আলাইকুম ${guardianName}! কানেক্ট টিউটরস বিডি-র অভিভাবক সাপোর্ট অ্যাসিস্ট্যান্টে আপনাকে স্বাগতম। আপনার সন্তানের জন্য সঠিক টিউটর নির্বাচন, টিউশন ফি বা রিকোয়েস্ট সংক্রান্ত যেকোনো প্রয়োজনে আমি সাহায্য করতে প্রস্তুত।`,
        intent: "GREETING",
        confidence: 70,
        isEscalated: false,
        suggestedQuickReplies: ["টিউশন ফি কেমন?", "কত দিনে টিউটর পাব?", "রিকোয়েস্ট পোস্ট করব"],
        actionChips: [{ label: "📝 টিউটর রিকোয়েস্ট পোস্ট করুন", url: "/request-tutor" }],
      };
    }

    default: {
      return {
        replyText: `ধন্যবাদ ${guardianName}। কানেক্ট টিউটরস বিডি বাংলাদেশের প্রথম সারির নিবন্ধিত টিউশন ম্যাচিং প্ল্যাটফর্ম (BTPA - 077)। আপনার প্রশ্নটির বিস্তারিত সমাধানের জন্য আমাদের এডমিন টিমকে অবগত করা হয়েছে, শীঘ্রই আপনাকে সহায়তা করা হবে।`,
        intent: "GENERAL_FAQ",
        confidence: 50,
        isEscalated: false,
        suggestedQuickReplies: ["টিউশন ফি সম্পর্কে জানুন", "টিউটর রিকোয়েস্ট পোস্ট", "এডমিনের সাথে কথা বলুন"],
        actionChips: [{ label: "📝 রিকোয়েস্ট পোস্ট করুন", url: "/request-tutor" }],
      };
    }
  }
}
