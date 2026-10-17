import { formatDaysPerWeek, formatLocation, formatNotes, formatStudentCount, formatStudentGender, formatSubjects, formatTutorPreference } from "./job-card";
import { formatSalaryAmount } from "./salary-amount";
import { jobIdForRequest } from "./job-id";
import {
  formatHashtags,
  generateBulkSmartHashtags,
  generateSmartHashtags,
} from "./facebook-hashtags";

export {
  formatHashtags,
  generateBulkSmartHashtags,
  generateSmartHashtags,
};

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

export interface FacebookBulkHeaderFilterOptions {
  tuitionTypes?: string[];
  categories?: string[];
  preferredTutorGender?: "" | "male" | "female" | "any";
  cityName?: string;
  locationNames?: string[];
}

export interface BuildSinglePostOptions {
  origin?: string;
  template?: FacebookPostCustomTemplate;
  includeHashtags?: boolean;
}

export interface BuildBulkPostOptions {
  origin?: string;
  template?: FacebookPostCustomTemplate;
  format?: FacebookPostBulkFormat;
  filterOptions?: FacebookBulkHeaderFilterOptions;
  includeHashtags?: boolean;
}

export interface BuildJobDetailsInlineOptions {
  origin?: string;
  includeApplyUrl?: boolean;
  includeHashtags?: boolean;
}

export const ITEM_DIVIDER = "──────────────────────────";

export const DEFAULT_BULK_HEADER = `🔴 LIVE TUITION JOBS — CONNECT TUTORS 🔴
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{headline}
🔍 Search using "Job ID" on our website to view full details.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

export const DEFAULT_BULK_FOOTER = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 How to Apply:
👉 Visit our website and search using the "Job ID" to apply:
{website}

⚡ 1-Click Apply • Direct Guardian Contact • Verified Tuitions
🌐 Connect Tutors — The Most Trusted Digital Tuition Platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

export const DEFAULT_SINGLE_HEADER = `🔴 NEW TUITION OFFER — CONNECT TUTORS 🔴
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

export const DEFAULT_SINGLE_FOOTER = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 How to Apply:
👉 Direct Apply Link:
{applyUrl}

⚡ 1-Click Apply • Direct Guardian Contact • Verified Tuitions
🌐 Connect Tutors — The Most Trusted Digital Tuition Platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

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
 * Builds a clean, professional, high-converting English Facebook post text
 * for a single tuition in Area Grouped side-by-side format.
 */
export function buildFacebookPostText(
  job: FacebookPostJobInput,
  optionsOrOrigin: string | BuildSinglePostOptions = "https://connecttutorsbd.com",
): string {
  const origin = typeof optionsOrOrigin === "string" ? optionsOrOrigin : (optionsOrOrigin.origin || "https://connecttutorsbd.com");
  const template = typeof optionsOrOrigin === "object" ? optionsOrOrigin.template : undefined;
  const includeHashtags = typeof optionsOrOrigin === "object" ? Boolean(optionsOrOrigin.includeHashtags) : false;

  const code = job.jobId || jobIdForRequest(job.id);
  const cleanOrigin = origin.replace(/\/+$/, "");
  const applyUrl = `${cleanOrigin}/job-board?job=${encodeURIComponent(code)}`;

  const rawHeader = template?.singleHeader?.trim() || DEFAULT_SINGLE_HEADER;
  const rawFooter = template?.singleFooter?.trim() || DEFAULT_SINGLE_FOOTER;

  const header = renderTemplateText(rawHeader, { jobId: code, origin: cleanOrigin, applyUrl });
  const footer = renderTemplateText(rawFooter, { jobId: code, origin: cleanOrigin, applyUrl });

  const areaHeading = getJobAreaKey(job);
  const f = extractJobEnglishFields(job);
  const parts: string[] = [
    `Job ID: ${f.code}`,
    `🎓 ${f.tutorPref}`,
    f.classWithMedium,
    f.subjects,
    `🗓️ ${f.schedule}`,
    `💰 ${f.salary}`,
  ];
  if (f.studentInfo) {
    parts.push(f.studentInfo);
  }
  if (f.notes) {
    parts.push(`Notes: ${f.notes}`);
  }

  const jobLine = parts.join("  |  ");
  const body = `${areaHeading}\n${jobLine}\n${ITEM_DIVIDER}`;

  const postBlocks = [header, "", body, "", footer];
  if (includeHashtags) {
    const hashtags = formatHashtags(generateSmartHashtags(job));
    if (hashtags) {
      postBlocks.push("", hashtags);
    }
  }

  return postBlocks.join("\n");
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
  const notes =
    rawNotes &&
    rawNotes.toLowerCase() !== "no special requirements" &&
    rawNotes.toLowerCase() !== "nothing" &&
    rawNotes.toLowerCase() !== "none" &&
    rawNotes.toLowerCase() !== "n/a"
      ? rawNotes
      : null;

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
 * Order: Job ID | Tutor Pref | Class | Subjects | Location | Schedule | Salary
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
    `🎓 ${f.tutorPref}`,
    f.classWithMedium,
    f.subjects,
    `📍 ${f.loc}`,
    `🗓️ ${f.schedule}`,
    `💰 ${f.salary}`,
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
  let line = parts.join("  |  ");
  if (options.includeHashtags) {
    const hashtags = formatHashtags(generateSmartHashtags(job));
    if (hashtags) {
      line += `\n${hashtags}`;
    }
  }
  return line;
}

/**
 * Normalizes a location name into an uppercase hashtag with underscore city connector.
 * e.g., "Mohammadpur, Dhaka" -> "#MOHAMMADPUR_DHAKA"
 * "Mirpur DOHS, Dhaka" -> "#MIRPUR_DOHS_DHAKA"
 * "Bashundhara R/A, Dhaka" -> "#BASHUNDHARA_RA_DHAKA"
 * "Online" -> "#ONLINE"
 */
export function formatLocationHashtag(locationText: string | null | undefined): string {
  if (!locationText) return "#BANGLADESH";
  const clean = locationText
    .trim()
    .replace(/\bR\/A\b/gi, "RA")
    .replace(/[,/\\-]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
  return `#${clean || "LOCATION"}`;
}

/**
 * Formats location as an uppercase hashtag with optional address in parentheses.
 * e.g., "📍 #MOHAMMADPUR_DHAKA (Housing Society)" or "📍 #MOHAMMADPUR_DHAKA"
 */
export function formatLocationWithAddress(job: FacebookPostJobInput): string {
  if (job.tuitionType === "online") return "📍 #ONLINE";
  const rawLoc = (job.tuitionLocationLabel ?? job.locationText ?? "").trim();
  const tag = formatLocationHashtag(rawLoc || "Dhaka");
  if (job.addressDetails?.trim()) {
    return `📍 ${tag} (${job.addressDetails.trim()})`;
  }
  return `📍 ${tag}`;
}

/**
 * Helper to determine category group title for a job in Category Grouped format.
 */
export function getJobCategoryKey(job: FacebookPostJobInput): string {
  const raw = (job.category ?? job.curriculumType ?? "").trim();
  if (!raw) return "📚 GENERAL / OTHER";
  return `📚 ${raw.toUpperCase()}`;
}

/**
 * Format 1: Standard Card (formerly Iconic Emoji)
 * Line 1: 📌 Job ID: 6806 (Female Tutor)
 * Line 2: 📍 #MOHAMMADPUR_DHAKA (Housing Society)
 * Line 3: 🔹 Class- Standard 1 (British)
 * Line 4: 📚 Subjects- All  |  🗓️ 5 Days  |  💰 Salary 7,000 BDT/month
 * Line 5: 📋 Notes: ... (only shown if notes exist, preceded by blank line)
 */
export function formatJobStandardCard(job: FacebookPostJobInput, _index?: number): string {
  const f = extractJobEnglishFields(job);

  const line1 = `📌 Job ID: ${f.code} (${f.tutorPref})`;
  const line2 = formatLocationWithAddress(job);
  const line3 = `🔹 Class- ${f.classWithMedium}`;

  const daysText = job.daysPerWeek && job.daysPerWeek > 0
    ? `${job.daysPerWeek} ${job.daysPerWeek === 1 ? "Day" : "Days"}`
    : "Flexible Days";
  const scheduleText = job.tutoringTime?.trim()
    ? `${daysText}, ${job.tutoringTime.trim()}`
    : daysText;

  const salaryText = f.salary.startsWith("Salary ") ? f.salary : `Salary ${f.salary}`;
  const line4 = `📚 Subjects- ${f.subjects}  |  🗓️ ${scheduleText}  |  💰 ${salaryText}`;

  const lines = [line1, line2, line3, line4];
  if (f.notes) {
    lines.push(`\n📋 Notes: ${f.notes}`);
  }

  return lines.join("\n");
}

export const formatJobEmojiLine = formatJobStandardCard;
export const formatJobMobileCard = formatJobStandardCard;

/**
 * Format 3: Key Priority (High-Contrast)
 * Example: 1. [Job ID: 1024] 🎓 MALE TUTOR 🎯 MATH, PHYSICS  |  Class 9 (English Medium)  |  📍 #DHANMONDI_DHAKA  |  🗓️ 3 Days/week  |  💰 8,000 BDT/month
 */
export function formatJobKeyPriority(job: FacebookPostJobInput, index?: number): string {
  const f = extractJobEnglishFields(job);
  const prefix = typeof index === "number" ? `${index}. ` : "";
  const locWithTag = formatLocationWithAddress(job);
  const parts: string[] = [
    `${prefix}[Job ID: ${f.code}] 🎓 ${f.tutorPref.toUpperCase()} 🎯 ${f.subjects.toUpperCase()}`,
    f.classWithMedium,
    locWithTag,
    `🗓️ ${f.schedule}`,
    `💰 ${f.salary}`,
  ];
  if (f.studentInfo) {
    parts.push(`👨‍🎓 ${f.studentInfo}`);
  }
  if (f.notes) {
    parts.push(`📋 Notes: ${f.notes}`);
  }
  return parts.join("  |  ");
}

/**
 * Formats a single item under an area heading in Format 4: Area Grouped.
 * Line 1: 📌 Job ID: 6806 (Female Tutor)
 * Line 2: 🔹 Class- Standard 1 (British)
 * Line 3: 📚 Subjects- All  |  🗓️ 5 Days  |  💰 Salary 7,000 BDT/month
 * Line 4: 📋 Notes: ... (only shown if notes exist, preceded by blank line)
 */
export function formatJobAreaItem(job: FacebookPostJobInput, _index?: number): string {
  const f = extractJobEnglishFields(job);

  const line1 = `📌 Job ID: ${f.code} (${f.tutorPref})`;
  const line2 = `🔹 Class- ${f.classWithMedium}`;

  const daysText = job.daysPerWeek && job.daysPerWeek > 0
    ? `${job.daysPerWeek} ${job.daysPerWeek === 1 ? "Day" : "Days"}`
    : "Flexible Days";
  const scheduleText = job.tutoringTime?.trim()
    ? `${daysText}, ${job.tutoringTime.trim()}`
    : daysText;

  const salaryText = f.salary.startsWith("Salary ") ? f.salary : `Salary ${f.salary}`;
  const line3 = `📚 Subjects- ${f.subjects}  |  🗓️ ${scheduleText}  |  💰 ${salaryText}`;

  const lines = [line1, line2, line3];
  if (f.notes) {
    lines.push(`\n📋 Notes: ${f.notes}`);
  }

  return lines.join("\n");
}

/**
 * Helper to determine area group title for a job.
 */
export function getJobAreaKey(job: FacebookPostJobInput): string {
  if (job.tuitionType === "online") return "🌐 #ONLINE_TUITIONS";
  const raw = (job.tuitionLocationLabel ?? job.locationText ?? "").trim();
  if (!raw) return "📍 #OTHER_LOCATIONS";
  return `📍 ${formatLocationHashtag(raw)}`;
}

/**
 * Builds a dynamic, high-converting headline based on active search/filter criteria.
 * Order: 📢 Total {count} ➔ [🌐 Tuition Type] ➔ [🔹 Category] ➔ [🎓 Tutor Preference] ➔ Tuitions Available ➔ [At 📍 City (Locations) Area] ➔ right now.
 * Example: 📢 Total 8 🔹 Bangla Medium 🎓 Female Tuitions Available At 📍 Dhaka City (Dhanmondi + Mohammadpur + Shyamoli) Area right now.
 */
export function buildDynamicBulkHeadline(
  count: number,
  filters?: FacebookBulkHeaderFilterOptions,
): string {
  const parts: string[] = [`📢 Total ${count}`];

  // 1. Tuition Type
  if (filters?.tuitionTypes && filters.tuitionTypes.length > 0) {
    const typeParts: string[] = [];
    for (const t of filters.tuitionTypes) {
      if (t === "online") typeParts.push("🌐 Online");
      else if (t === "home") typeParts.push("🏠 Home Tuition");
      else if (t === "group") typeParts.push("👥 Group Tuition");
      else if (t.trim()) typeParts.push(t.trim());
    }
    if (typeParts.length > 0) {
      parts.push(typeParts.join(" + "));
    }
  }

  // 2. Category
  if (filters?.categories && filters.categories.length > 0) {
    const cleanCats = filters.categories.map(c => c.trim()).filter(Boolean);
    if (cleanCats.length > 0) {
      parts.push(`🔹 ${cleanCats.join(" + ")}`);
    }
  }

  // 3. Tutor Preference
  if (filters?.preferredTutorGender) {
    if (filters.preferredTutorGender === "female") {
      parts.push("🎓 Female");
    } else if (filters.preferredTutorGender === "male") {
      parts.push("🎓 Male");
    }
  }

  // 4. Tuitions Available
  parts.push(count === 1 ? "Tuition Available" : "Tuitions Available");

  // 5. City and Locations
  const rawCity = filters?.cityName?.trim();
  const rawLocs = filters?.locationNames?.map(l => l.trim()).filter(Boolean) ?? [];

  if (rawCity || rawLocs.length > 0) {
    let locStr = "At 📍";
    if (rawCity) {
      const cityFormatted = /city$/i.test(rawCity) ? rawCity : `${rawCity} City`;
      locStr += ` ${cityFormatted}`;
    }
    if (rawLocs.length > 0) {
      locStr += ` (${rawLocs.join(" + ")}) Area`;
    }
    parts.push(locStr);
  }

  // 6. Suffix
  parts.push("right now.");

  return parts.join(" ");
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
  const filterOptions = typeof optionsOrOrigin === "object" ? optionsOrOrigin.filterOptions : undefined;

  const cleanOrigin = origin.replace(/\/+$/, "");
  const jobBoardUrl = `${cleanOrigin}/job-board`;

  const headline = buildDynamicBulkHeadline(jobs.length, filterOptions);

  let rawHeader = template?.bulkHeader?.trim() || DEFAULT_BULK_HEADER;
  if (!rawHeader.includes("{headline}")) {
    if (rawHeader.includes("📢 Total {count} Tuitions Available right now.")) {
      rawHeader = rawHeader.replace("📢 Total {count} Tuitions Available right now.", "{headline}");
    }
  }
  const rawFooter = template?.bulkFooter?.trim() || DEFAULT_BULK_FOOTER;

  const vars = {
    count: jobs.length,
    headline,
    website: jobBoardUrl,
    origin: cleanOrigin,
  };

  const header = renderTemplateText(rawHeader, vars);
  const footer = renderTemplateText(rawFooter, vars);

  let bodyContent = "";

  if (format === "mobile-card") {
    // Format 2: Category Grouped
    const groups: Record<string, FacebookPostJobInput[]> = {};
    for (const job of jobs) {
      const cat = getJobCategoryKey(job);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(job);
    }
    const groupBlocks: string[] = [];
    const cats = Object.keys(groups);
    for (const cat of cats) {
      const catJobs = groups[cat];
      const underline = "─".repeat(Array.from(cat).length);
      const items = catJobs.map((job: FacebookPostJobInput) => {
        return `${formatJobStandardCard(job)}\n${ITEM_DIVIDER}`;
      });
      groupBlocks.push(`${cat}\n${underline}\n\n${items.join("\n\n")}`);
    }
    bodyContent = groupBlocks.join("\n\n");
  } else if (format === "key-priority") {
    bodyContent = jobs
      .map((job, idx) => `${formatJobKeyPriority(job, idx + 1)}\n${ITEM_DIVIDER}`)
      .join("\n\n");
  } else if (format === "area-grouped") {
    const groups: Record<string, FacebookPostJobInput[]> = {};
    for (const job of jobs) {
      const area = getJobAreaKey(job);
      if (!groups[area]) groups[area] = [];
      groups[area].push(job);
    }
    const groupBlocks: string[] = [];
    const areas = Object.keys(groups);
    for (const area of areas) {
      const areaJobs = groups[area];
      const underline = "─".repeat(Array.from(area).length);
      const items = areaJobs.map((job: FacebookPostJobInput) => {
        return `${formatJobAreaItem(job)}\n${ITEM_DIVIDER}`;
      });
      groupBlocks.push(`${area}\n${underline}\n\n${items.join("\n\n")}`);
    }
    bodyContent = groupBlocks.join("\n\n");
  } else {
    // "emoji-line" (default) -> Format 1: Standard Card
    bodyContent = jobs
      .map((job) => `${formatJobStandardCard(job)}\n${ITEM_DIVIDER}`)
      .join("\n\n");
  }

  const postBlocks = [header, "", bodyContent, "", footer];
  const includeHashtags = typeof optionsOrOrigin === "object" ? Boolean(optionsOrOrigin.includeHashtags) : false;
  if (includeHashtags) {
    const hashtags = formatHashtags(generateBulkSmartHashtags(jobs));
    if (hashtags) {
      postBlocks.push("", hashtags);
    }
  }

  return postBlocks.join("\n");
}


