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

export interface FacebookBulkHeaderFilterOptions {
  tuitionTypes?: string[];
  categories?: string[];
  preferredTutorGender?: "" | "male" | "female" | "any";
  cityName?: string;
  locationNames?: string[];
}

export interface BuildBulkPostOptions {
  origin?: string;
  template?: FacebookPostCustomTemplate;
  format?: FacebookPostBulkFormat;
  filterOptions?: FacebookBulkHeaderFilterOptions;
}

export interface BuildJobDetailsInlineOptions {
  origin?: string;
  includeApplyUrl?: boolean;
}

export const ITEM_DIVIDER = "────────────────────────────────────────";

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
  optionsOrOrigin: string | { origin?: string; template?: FacebookPostCustomTemplate } = "https://connecttutorsbd.com",
): string {
  const origin = typeof optionsOrOrigin === "string" ? optionsOrOrigin : (optionsOrOrigin.origin || "https://connecttutorsbd.com");
  const template = typeof optionsOrOrigin === "object" ? optionsOrOrigin.template : undefined;

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

  return [header, "", body, "", footer].join("\n");
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
  return parts.join("  |  ");
}

/**
 * Format 1: Iconic Emoji (1-Line)
 * Example: 1. 📌 Job ID: 1024  |  🎓 Male Tutor  |  🔹 Class 9 (English Medium)  |  📚 Math, Physics  |  📍 Dhanmondi  |  🗓️ 3 Days/week  |  💰 8,000 BDT/month
 */
export function formatJobEmojiLine(job: FacebookPostJobInput, index?: number): string {
  const f = extractJobEnglishFields(job);
  const prefix = typeof index === "number" ? `${index}. ` : "";
  const parts: string[] = [
    `📌 Job ID: ${f.code}`,
    `🎓 ${f.tutorPref}`,
    `🔹 ${f.classWithMedium}`,
    `📚 ${f.subjects}`,
    `📍 ${f.loc}`,
    `🗓️ ${f.schedule}`,
    `💰 ${f.salary}`,
  ];
  if (f.studentInfo) {
    parts.push(`👨‍🎓 ${f.studentInfo}`);
  }
  if (f.notes) {
    parts.push(`📋 Notes: ${f.notes}`);
  }
  return `${prefix}${parts.join("  |  ")}`;
}

/**
 * Format 2: Mobile Card (2-Line)
 * Line 1: 1. 📌 Job ID: 1024 • 🎓 Male Tutor • 🔹 Class 9 (English Medium)
 * Line 2:    📚 Math, Physics  |  📍 Dhanmondi  |  🗓️ 3 Days/week  |  💰 8,000 BDT/month
 */
export function formatJobMobileCard(job: FacebookPostJobInput, index?: number): string {
  const f = extractJobEnglishFields(job);
  const prefix = typeof index === "number" ? `${index}. ` : "";
  const line1 = `${prefix}📌 Job ID: ${f.code} • 🎓 ${f.tutorPref} • 🔹 ${f.classWithMedium}`;

  const line2Parts: string[] = [
    `📚 ${f.subjects}`,
    `📍 ${f.loc}`,
    `🗓️ ${f.schedule}`,
    `💰 ${f.salary}`,
  ];
  if (f.studentInfo) {
    line2Parts.push(`👨‍🎓 ${f.studentInfo}`);
  }
  if (f.notes) {
    line2Parts.push(`📋 Notes: ${f.notes}`);
  }
  const indent = typeof index === "number" ? "   " : "";
  const line2 = `${indent}${line2Parts.join("  |  ")}`;
  return `${line1}\n${line2}`;
}

/**
 * Format 3: Key Priority (High-Contrast)
 * Example: 1. [Job ID: 1024] 🎓 MALE TUTOR 🎯 MATH, PHYSICS  |  Class 9 (English Medium)  |  📍 Dhanmondi  |  🗓️ 3 Days/week  |  💰 8,000 BDT/month
 */
export function formatJobKeyPriority(job: FacebookPostJobInput, index?: number): string {
  const f = extractJobEnglishFields(job);
  const prefix = typeof index === "number" ? `${index}. ` : "";
  const parts: string[] = [
    `${prefix}[Job ID: ${f.code}] 🎓 ${f.tutorPref.toUpperCase()} 🎯 ${f.subjects.toUpperCase()}`,
    f.classWithMedium,
    `📍 ${f.loc}`,
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
 * Omits repeating the location since the area header already shows it.
 */
export function formatJobAreaItem(job: FacebookPostJobInput, index: number): string {
  const f = extractJobEnglishFields(job);
  const parts: string[] = [
    `${index}. Job ID: ${f.code}`,
    `🎓 ${f.tutorPref}`,
    f.classWithMedium,
    f.subjects,
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
 * Helper to determine area group title for a job.
 */
export function getJobAreaKey(job: FacebookPostJobInput): string {
  if (job.tuitionType === "online") return "🌐 ONLINE TUITIONS";
  const raw = (job.tuitionLocationLabel ?? job.locationText ?? "").trim();
  if (!raw) return "📍 OTHER LOCATIONS";
  return `📍 ${raw.toUpperCase()}`;
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
    bodyContent = jobs
      .map((job, idx) => `${formatJobMobileCard(job, idx + 1)}\n${ITEM_DIVIDER}`)
      .join("\n");
  } else if (format === "key-priority") {
    bodyContent = jobs
      .map((job, idx) => `${formatJobKeyPriority(job, idx + 1)}\n${ITEM_DIVIDER}`)
      .join("\n");
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
        const itemStr = `${formatJobAreaItem(job, counter)}\n${ITEM_DIVIDER}`;
        counter++;
        return itemStr;
      });
      groupBlocks.push(`${area}\n${items.join("\n")}`);
    }
    bodyContent = groupBlocks.join("\n\n");
  } else {
    // "emoji-line" (default)
    bodyContent = jobs
      .map((job, idx) => `${formatJobEmojiLine(job, idx + 1)}\n${ITEM_DIVIDER}`)
      .join("\n");
  }

  return [header, "", bodyContent, "", footer].join("\n");
}


