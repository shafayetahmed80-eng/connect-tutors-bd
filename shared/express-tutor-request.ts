import { z } from "zod";
import { cleanBangladeshLocalPhoneDigits, isValidBangladeshLocalPhone } from "./phone";

export const EXPRESS_REQUEST_STATUSES = ["new", "contacted", "converted", "cancelled"] as const;
export type ExpressRequestStatus = (typeof EXPRESS_REQUEST_STATUSES)[number];

export const EXPRESS_REQUEST_SOURCES = [
  "home_hero",
  "job_board",
  "mobile_drawer",
  "floating_action",
  "direct",
] as const;
export type ExpressRequestSource = (typeof EXPRESS_REQUEST_SOURCES)[number];

export interface ExpressClassOption {
  id: string;
  label: string;
  category: string;
  curriculum: string;
}

export const EXPRESS_POPULAR_CLASSES: readonly ExpressClassOption[] = [
  { id: "class-9-10", label: "Class 9-10 (SSC)", category: "Secondary", curriculum: "Bangla Medium" },
  { id: "class-6-8", label: "Class 6-8 (JSC/Middle)", category: "Middle School", curriculum: "Bangla Medium" },
  { id: "class-1-5", label: "Class 1-5 (Primary)", category: "Primary", curriculum: "Bangla Medium" },
  { id: "hsc-science", label: "HSC (Science)", category: "Higher Secondary", curriculum: "Bangla Medium" },
  { id: "hsc-commerce-arts", label: "HSC (Commerce/Arts)", category: "Higher Secondary", curriculum: "Bangla Medium" },
  { id: "ev-class-9-10", label: "Class 9-10 (English Version)", category: "Secondary", curriculum: "English Version" },
  { id: "ev-class-6-8", label: "Class 6-8 (English Version)", category: "Middle School", curriculum: "English Version" },
  { id: "em-olevel", label: "O-Level / IGCSE", category: "English Medium", curriculum: "English Medium" },
  { id: "em-alevel", label: "A-Level", category: "English Medium", curriculum: "English Medium" },
  { id: "quran-madrasah", label: "Quran / Arabic / Madrasah", category: "Religious", curriculum: "Madrasah / Religious" },
] as const;

export const EXPRESS_CURRICULUM_OPTIONS = [
  "Bangla Medium",
  "English Version",
  "English Medium",
  "Madrasah / Religious",
  "Admission / Other",
] as const;

export const EXPRESS_COMMON_SUBJECTS = [
  "All Subjects",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Higher Math",
  "ICT",
  "Bangla",
  "Accounting",
] as const;

export const expressTutorRequestInputSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine(val => isValidBangladeshLocalPhone(val), {
      message: "সঠিক ১১ অঙ্কের বাংলাদেশি মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)।",
    }),
  guardianName: z.string().trim().max(120).optional().nullable(),
  classCourse: z.string().trim().min(1, "শিক্ষার্থীর শ্রেণি নির্বাচন বা উল্লেখ করুন।").max(120),
  curriculumType: z.string().trim().max(60).optional().default("Bangla Medium"),
  subjects: z.string().trim().max(255).optional().default("All Subjects"),
  tuitionType: z.enum(["home", "online", "group", "package"]).default("home"),
  cityLocationId: z.string().trim().max(80).optional().nullable(),
  locationId: z.string().trim().max(80).optional().nullable(),
  locationLabel: z.string().trim().min(2, "আপনার এলাকা বা থানা উল্লেখ করুন (যেমন: ধানমন্ডি, ঢাকা)।").max(160),
  notes: z.string().trim().max(500).optional().nullable(),
  source: z.enum(EXPRESS_REQUEST_SOURCES).default("home_hero"),
  honeypot: z.string().max(100).optional().nullable(),
});

export type ExpressTutorRequestInput = z.infer<typeof expressTutorRequestInputSchema>;

/**
 * Normalizes phone number into canonical 11-digit "01XXXXXXXXX" format.
 */
export function normalizeExpressRequestPhone(phone: string): string {
  const digits = cleanBangladeshLocalPhoneDigits(phone);
  return `0${digits}`;
}

/**
 * Generates an operational summary title for notification or admin lists.
 */
export function buildExpressRequestTitle(input: {
  classCourse: string;
  locationLabel: string;
  curriculumType?: string | null;
}): string {
  const curriculum = input.curriculumType && input.curriculumType !== "Bangla Medium" ? ` (${input.curriculumType})` : "";
  return `Need ${input.classCourse}${curriculum} Tutor in ${input.locationLabel}`;
}

/**
 * Formats a clean Telegram markdown/text message to immediately alert coordinators.
 */
export function buildExpressRequestTelegramMessage(input: {
  id: number;
  phone: string;
  guardianName?: string | null;
  classCourse: string;
  curriculumType?: string | null;
  subjects?: string | null;
  tuitionType: string;
  locationLabel: string;
  source: string;
  notes?: string | null;
}): string {
  const lines: string[] = [
    "⚡ *New Express Tutor Request*",
    `🆔 Lead #${input.id}`,
    `📱 Phone: ${input.phone}`,
  ];

  if (input.guardianName) {
    lines.push(`👤 Guardian: ${input.guardianName}`);
  }

  lines.push(
    `📚 Class: ${input.classCourse}${input.curriculumType ? ` (${input.curriculumType})` : ""}`,
    `📖 Subjects: ${input.subjects || "All Subjects"}`,
    `🏠 Type: ${input.tuitionType}`,
    `📍 Area: ${input.locationLabel}`,
    `🌐 Source: ${input.source}`,
  );

  if (input.notes) {
    lines.push(`📝 Notes: ${input.notes}`);
  }

  lines.push("⏱️ Please call the guardian promptly to coordinate.");
  return lines.join("\n");
}
