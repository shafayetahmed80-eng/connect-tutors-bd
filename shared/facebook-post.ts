import { formatDaysPerWeek, formatLocation, formatNotes, formatStudentCount, formatStudentGender, formatSubjects, formatTutorPreference } from "./job-card";
import { formatSalaryAmount } from "./salary-amount";
import { jobIdForRequest } from "./job-id";

export type FacebookPostJobInput = {
  id: number;
  jobId?: string | null;
  classCourse?: string | null;
  category?: string | null;
  curriculumType?: string | null;
  subjects?: unknown;
  tuitionType?: string | null;
  tuitionLocationLabel?: string | null;
  locationText?: string | null;
  addressDetails?: string | null;
  budgetAmount?: number | null;
  daysPerWeek?: number | null;
  tutoringTime?: string | null;
  studentGender?: string | null;
  studentCount?: number | null;
  preferredGender?: string | null;
  instituteName?: string | null;
  notes?: string | null;
  origin?: string;
};

export type FacebookPostCustomTemplate = {
  bulkHeader?: string;
  bulkFooter?: string;
  singleHeader?: string;
  singleFooter?: string;
};

export type FacebookPostBulkFormat =
  | "emoji-line"
  | "mobile-card"
  | "key-priority"
  | "area-grouped";

export interface BuildBulkPostOptions {
  origin?: string;
  template?: FacebookPostCustomTemplate;
  format?: FacebookPostBulkFormat;
}

export interface BuildJobDetailsInlineOptions {
  origin?: string;
  includeApplyUrl?: boolean;
}

export const DEFAULT_BULK_HEADER = `🔴 LIVE TUITION JOBS — CONNECT TUTORS 🔴
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 Total {count} Tuitions Available right now.
👉 Tutors can view details and apply directly online for FREE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

export const DEFAULT_BULK_FOOTER = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 HOW TO APPLY (100% FREE & DIRECT):
👉 Visit Job Board: {website}
🔍 Search using the "Job ID" to view full details
⚡ Apply in 1-Click • Zero Media Fees • Direct Guardian Contact

🌐 Connect Tutors — The Most Trusted Digital Tuition Platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

export const DEFAULT_SINGLE_HEADER = `🔴 নতুন টিউশন অফার — কানেক্ট টিউটরস (Connect Tutors) 🔴
━━━━━━━━━━━━━━━━━━━━━━━━`;

export const DEFAULT_SINGLE_FOOTER = `━━━━━━━━━━━━━━━━━━━━━━━━
🚀 আবেদন করার নিয়ম (সম্পূর্ণ ফ্রি):
👉 সরাসরি আবেদন লিংক:
{applyUrl}
⚡ কোনো মিডিয়া ফি নেই • সরাসরি অভিভাবকদের সাথে সংযোগ

🌐 কানেক্ট টিউটরস (Connect Tutors) — ১০০% বিশ্বস্ত ও স্মার্ট ডিজিটাল প্ল্যাটফর্ম
━━━━━━━━━━━━━━━━━━━━━━━━`;

/**
 * Replaces placeholders like {count}, {website}, {applyUrl}, {jobId} with actual values.
 */
export function renderTemplateText(
  template: string,
  variables: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, val] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, String(val));
  }
  return result;
}

/**
 * Builds a clean, professional, high-converting Bengali Facebook post text
 * formatted specifically for Facebook groups and pages.
 */
export function buildFacebookPostText(
  job: FacebookPostJobInput,
  optionsOrOrigin: string | { origin?: string; template?: FacebookPostCustomTemplate } = "https://connecttutorsbd.com",
): string {
  const origin = typeof optionsOrOrigin === "string" ? optionsOrOrigin : (optionsOrOrigin.origin || "https://connecttutorsbd.com");
  const template = typeof optionsOrOrigin === "object" ? optionsOrOrigin.template : undefined;

  const code = job.jobId || jobIdForRequest(job.id);
  const classText = job.classCourse?.trim() || "সাধারণ";
  const medium = job.curriculumType?.trim() || job.category?.trim();
  const classWithMedium = medium ? `${classText} (${medium})` : classText;

  const subjects = formatSubjects(job.subjects);
  
  // Location
  let loc = formatLocation({
    tuitionType: job.tuitionType || "home",
    locationLabel: job.tuitionLocationLabel ?? job.locationText,
  });
  if (job.addressDetails?.trim() && job.tuitionType !== "online") {
    loc += ` (${job.addressDetails.trim()})`;
  }

  // Salary
  const salary = job.budgetAmount !== null && job.budgetAmount !== undefined && job.budgetAmount > 0
    ? formatSalaryAmount(job.budgetAmount)
    : "আলোচনা সাপেক্ষে (Negotiable)";

  // Days
  const days = job.daysPerWeek && job.daysPerWeek > 0
    ? `${job.daysPerWeek} দিন/সপ্তাহ`
    : "আলোচনা সাপেক্ষে";

  // Time
  const time = job.tutoringTime?.trim() || "আলোচনা সাপেক্ষে / ফ্লেক্সিবল";

  // Student Info
  const countStr = formatStudentCount(job.studentCount);
  const genderStr = formatStudentGender(job.studentGender);
  const studentInfo = `${countStr} (${genderStr})`;

  // Tutor Preference
  const tutorGender = formatTutorPreference(job.preferredGender || "any");
  const institute = job.instituteName?.trim();
  const tutorPref = institute ? `${tutorGender} টিউটর (${institute})` : `${tutorGender} টিউটর`;

  // Notes
  const rawNotes = job.notes?.trim();
  const notesText = rawNotes && rawNotes.toLowerCase() !== "no special requirements"
    ? rawNotes
    : "কোনো বিশেষ শর্ত নেই";

  const cleanOrigin = origin.replace(/\/+$/, "");
  const applyUrl = `${cleanOrigin}/job-board?job=${encodeURIComponent(code)}`;

  const rawHeader = template?.singleHeader?.trim() || DEFAULT_SINGLE_HEADER;
  const rawFooter = template?.singleFooter?.trim() || DEFAULT_SINGLE_FOOTER;

  const header = renderTemplateText(rawHeader, { jobId: code, origin: cleanOrigin, applyUrl });
  const footer = renderTemplateText(rawFooter, { jobId: code, origin: cleanOrigin, applyUrl });

  const bodyLines = [
    `📌 জব আইডি: ${code}`,
    `📚 শ্রেণি/কোর্স: ${classWithMedium}`,
    `📝 বিষয়সমূহ: ${subjects}`,
    `📍 লোকেশন: ${loc}`,
    `💰 পারিশ্রমিক/বেতন: ${salary}`,
    `📅 সপ্তাহে দিন: ${days}`,
    `⏰ পড়ার সময়: ${time}`,
    `👨‍🎓 শিক্ষার্থীর তথ্য: ${studentInfo}`,
    `🎓 টিউটর অগ্রাধিকার: ${tutorPref}`,
    `📋 বিশেষ শর্তাবলী: ${notesText}`,
  ];

  return [header, ...bodyLines, footer].join("\n");
}

/**
 * Extracts and formats all normalized English fields for a tuition job.
 */
export function extractJobEnglishFields(job: FacebookPostJobInput) {
  const code = job.jobId || jobIdForRequest(job.id);
  const classText = job.classCourse?.trim() || "General";
  const medium = job.curriculumType?.trim() || job.category?.trim();
  const classWithMedium = medium ? `${classText} (${medium})` : classText;

  const rawSubs = formatSubjects(job.subjects);
  const subjects = rawSubs && rawSubs !== "Not set" ? rawSubs : "All Subjects";

  let loc = job.tuitionType === "online"
    ? "Online"
    : (job.tuitionLocationLabel ?? job.locationText ?? "Location not specified");
  if (job.addressDetails?.trim() && job.tuitionType !== "online") {
    loc += ` (${job.addressDetails.trim()})`;
  }

  const salary = job.budgetAmount !== null && job.budgetAmount !== undefined && job.budgetAmount > 0
    ? `${Math.round(job.budgetAmount).toLocaleString("en-US")} BDT/month`
    : "Salary Negotiable";

  const days = job.daysPerWeek && job.daysPerWeek > 0
    ? `${job.daysPerWeek} ${job.daysPerWeek === 1 ? "Day" : "Days"}/week`
    : "Flexible Days";
  const time = job.tutoringTime?.trim();
  const schedule = time ? `${days}, ${time}` : days;

  let tutorPref = "Any Tutor";
  if (job.preferredGender === "male") tutorPref = "Male Tutor";
  else if (job.preferredGender === "female") tutorPref = "Female Tutor";
  if (job.instituteName?.trim()) {
    tutorPref += ` (${job.instituteName.trim()})`;
  }

  const count = job.studentCount && job.studentCount > 0 ? `${job.studentCount} ${job.studentCount === 1 ? "Student" : "Students"}` : null;
  const gender = job.studentGender === "male" ? "Male" : job.studentGender === "female" ? "Female" : null;
  let studentInfo: string | null = null;
  if (count && gender) {
    studentInfo = `${count} (${gender})`;
  } else if (count) {
    studentInfo = count;
  } else if (gender) {
    studentInfo = `${gender} Student`;
  }

  const rawNotes = job.notes?.trim();
  const notes = rawNotes && rawNotes.toLowerCase() !== "no special requirements" ? rawNotes : null;

  return {
    code,
    classWithMedium,
    subjects,
    loc,
    salary,
    schedule,
    tutorPref,
    studentInfo,
    notes,
  };
}

/**
 * Formats a single tuition's details side-by-side in English.
 * Default: "Job ID: CT-1042 | Class 9 (English Medium) | Math, Physics | ..."
 * Without individual apply URL unless explicitly enabled.
 */
export function buildEnglishJobDetailsInline(
  job: FacebookPostJobInput,
  optionsOrOrigin: string | BuildJobDetailsInlineOptions = "https://connecttutorsbd.com",
): string {
  const origin = typeof optionsOrOrigin === "string" ? optionsOrOrigin : (optionsOrOrigin.origin || "https://connecttutorsbd.com");
  const options = typeof optionsOrOrigin === "object" ? optionsOrOrigin : {};
  const includeApplyUrl = options.includeApplyUrl ?? false;

  const f = extractJobEnglishFields(job);
  const parts: string[] = [
    `Job ID: ${f.code}`,
    f.classWithMedium,
    f.subjects,
    f.loc,
    f.salary,
    f.schedule,
    f.tutorPref,
  ];
  if (f.studentInfo) {
    parts.push(f.studentInfo);
  }
  if (f.notes) {
    parts.push(`Notes: ${f.notes}`);
  }
  if (includeApplyUrl) {
    const cleanOrigin = origin.replace(/\/+$/, "");
    parts.push(`Apply: ${cleanOrigin}/job-board?job=${encodeURIComponent(f.code)}`);
  }
  return parts.join(" | ");
}

/**
 * Format 1: Iconic Emoji (1-Line)
 * Example: 1. 📌 Job ID: 1024 | 🔹 Class 9 (English Medium) | 📚 Math, Physics | 📍 Dhanmondi | 💰 8,000 BDT/month | 🗓️ 3 Days/week | 🎓 Male Tutor
 */
export function formatJobEmojiLine(job: FacebookPostJobInput, index?: number): string {
  const f = extractJobEnglishFields(job);
  const prefix = typeof index === "number" ? `${index}. ` : "";
  const parts: string[] = [
    `📌 Job ID: ${f.code}`,
    `🔹 ${f.classWithMedium}`,
    `📚 ${f.subjects}`,
    `📍 ${f.loc}`,
    `💰 ${f.salary}`,
    `🗓️ ${f.schedule}`,
    `🎓 ${f.tutorPref}`,
  ];
  if (f.studentInfo) {
    parts.push(`👨‍🎓 ${f.studentInfo}`);
  }
  if (f.notes) {
    parts.push(`📋 Notes: ${f.notes}`);
  }
  return `${prefix}${parts.join(" | ")}`;
}

/**
 * Format 2: Mobile Card (2-Line)
 * Line 1: 1. 📌 Job ID: 1024 • Class 9 (English Medium) • 📚 Math, Physics
 * Line 2:    📍 Dhanmondi | 💰 8,000 BDT/month | 🗓️ 3 Days/week | 🎓 Male Tutor
 */
export function formatJobMobileCard(job: FacebookPostJobInput, index?: number): string {
  const f = extractJobEnglishFields(job);
  const prefix = typeof index === "number" ? `${index}. ` : "";
  const line1 = `${prefix}📌 Job ID: ${f.code} • ${f.classWithMedium} • 📚 ${f.subjects}`;

  const line2Parts: string[] = [
    `📍 ${f.loc}`,
    `💰 ${f.salary}`,
    `🗓️ ${f.schedule}`,
    `🎓 ${f.tutorPref}`,
  ];
  if (f.studentInfo) {
    line2Parts.push(`👨‍🎓 ${f.studentInfo}`);
  }
  if (f.notes) {
    line2Parts.push(`📋 Notes: ${f.notes}`);
  }
  const indent = typeof index === "number" ? "   " : "";
  const line2 = `${indent}${line2Parts.join(" | ")}`;
  return `${line1}\n${line2}`;
}

/**
 * Format 3: Key Priority (High-Contrast)
 * Example: 1. [Job ID: 1024] 🎯 MATH, PHYSICS 📍 DHANMONDI | Class 9 (English Medium) | 💰 8,000 BDT/month | ...
 */
export function formatJobKeyPriority(job: FacebookPostJobInput, index?: number): string {
  const f = extractJobEnglishFields(job);
  const prefix = typeof index === "number" ? `${index}. ` : "";
  const parts: string[] = [
    `${prefix}[Job ID: ${f.code}] 🎯 ${f.subjects.toUpperCase()} 📍 ${f.loc.toUpperCase()}`,
    f.classWithMedium,
    `💰 ${f.salary}`,
    `🗓️ ${f.schedule}`,
    `🎓 ${f.tutorPref}`,
  ];
  if (f.studentInfo) {
    parts.push(`👨‍🎓 ${f.studentInfo}`);
  }
  if (f.notes) {
    parts.push(`📋 Notes: ${f.notes}`);
  }
  return parts.join(" | ");
}

/**
 * Formats a single item under an area heading in Format 4: Area Grouped.
 * Omits repeating the location since the area header already shows it.
 */
export function formatJobAreaItem(job: FacebookPostJobInput, index: number): string {
  const f = extractJobEnglishFields(job);
  const parts: string[] = [
    `${index}. Job ID: ${f.code}`,
    f.classWithMedium,
    f.subjects,
    `💰 ${f.salary}`,
    `🗓️ ${f.schedule}`,
    `🎓 ${f.tutorPref}`,
  ];
  if (f.studentInfo) {
    parts.push(`👨‍🎓 ${f.studentInfo}`);
  }
  if (f.notes) {
    parts.push(`📋 Notes: ${f.notes}`);
  }
  return parts.join(" | ");
}

/**
 * Helper to determine area group title for a job.
 */
export function getJobAreaKey(job: FacebookPostJobInput): string {
  if (job.tuitionType === "online") return "🌐 ONLINE TUITIONS";
  const raw = (job.tuitionLocationLabel ?? job.locationText ?? "").trim();
  if (!raw) return "📍 OTHER LOCATIONS";
  return `📍 ${raw.toUpperCase()}`;
}

/**
 * Builds a bulk Facebook post in English with all filtered tuitions.
 * Supports 4 distinct high-converting formats:
 * - "emoji-line" (default)
 * - "mobile-card"
 * - "key-priority"
 * - "area-grouped"
 */
export function buildEnglishBulkFacebookPostText(
  jobs: FacebookPostJobInput[],
  optionsOrOrigin: string | BuildBulkPostOptions = "https://connecttutorsbd.com",
): string {
  if (jobs.length === 0) {
    return "No live tuitions match the current criteria.";
  }

  const origin = typeof optionsOrOrigin === "string" ? optionsOrOrigin : (optionsOrOrigin.origin || "https://connecttutorsbd.com");
  const template = typeof optionsOrOrigin === "object" ? optionsOrOrigin.template : undefined;
  const format: FacebookPostBulkFormat = typeof optionsOrOrigin === "object" && optionsOrOrigin.format ? optionsOrOrigin.format : "emoji-line";

  const cleanOrigin = origin.replace(/\/+$/, "");
  const jobBoardUrl = `${cleanOrigin}/job-board`;

  const rawHeader = template?.bulkHeader?.trim() || DEFAULT_BULK_HEADER;
  const rawFooter = template?.bulkFooter?.trim() || DEFAULT_BULK_FOOTER;

  const vars = {
    count: jobs.length,
    website: jobBoardUrl,
    origin: cleanOrigin,
  };

  const header = renderTemplateText(rawHeader, vars);
  const footer = renderTemplateText(rawFooter, vars);

  let bodyContent = "";

  if (format === "mobile-card") {
    bodyContent = jobs.map((job, idx) => formatJobMobileCard(job, idx + 1)).join("\n\n");
  } else if (format === "key-priority") {
    bodyContent = jobs.map((job, idx) => formatJobKeyPriority(job, idx + 1)).join("\n");
  } else if (format === "area-grouped") {
    const groups: Record<string, FacebookPostJobInput[]> = {};
    for (const job of jobs) {
      const area = getJobAreaKey(job);
      if (!groups[area]) groups[area] = [];
      groups[area].push(job);
    }
    const groupBlocks: string[] = [];
    let counter = 1;
    const areas = Object.keys(groups);
    for (const area of areas) {
      const areaJobs = groups[area];
      const items = areaJobs.map((job: FacebookPostJobInput) => {
        const itemStr = formatJobAreaItem(job, counter);
        counter++;
        return itemStr;
      });
      groupBlocks.push(`${area}:\n${items.join("\n")}`);
    }
    bodyContent = groupBlocks.join("\n\n");
  } else {
    // "emoji-line" (default)
    bodyContent = jobs.map((job, idx) => formatJobEmojiLine(job, idx + 1)).join("\n");
  }

  return [header, "", bodyContent, "", footer].join("\n");
}


