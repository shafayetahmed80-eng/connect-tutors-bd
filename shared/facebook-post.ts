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

/**
 * Builds a clean, professional, high-converting Bengali Facebook post text
 * formatted specifically for Facebook groups and pages.
 */
export function buildFacebookPostText(job: FacebookPostJobInput, origin = "https://connecttutorsbd.com"): string {
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

  const lines = [
    "🔴 নতুন টিউশন অফার — কানেক্ট টিউটরস (Connect Tutors BD) 🔴",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
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
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "👉 বিস্তারিত দেখে সরাসরি অনলাইনে আবেদন করতে ভিজিট করুন:",
    applyUrl,
    "",
    "🌐 কানেক্ট টিউটরস — কোনো মিডিয়া নয়, ১০০% স্মার্ট ও বিশ্বস্ত ডিজিটাল টিউশন প্ল্যাটফর্ম",
  ];

  return lines.join("\n");
}

/**
 * Formats a single tuition's details side-by-side in English separated by pipe (|).
 * Example:
 * Job #1024 | Class 9 (English Medium) | Math, Physics | Dhanmondi, Dhaka | 8,000 BDT/month | 3 Days/week | Male Tutor (BUET) | Apply: https://connecttutorsbd.com/job-board?job=1024
 */
export function buildEnglishJobDetailsInline(
  job: FacebookPostJobInput,
  origin = "https://connecttutorsbd.com",
): string {
  const code = job.jobId || jobIdForRequest(job.id);
  const parts: string[] = [];

  // 1. Job ID
  parts.push(`Job #${code}`);

  // 2. Class & Medium
  const classText = job.classCourse?.trim() || "General";
  const medium = job.curriculumType?.trim() || job.category?.trim();
  parts.push(medium ? `${classText} (${medium})` : classText);

  // 3. Subjects
  const subs = formatSubjects(job.subjects);
  parts.push(subs && subs !== "Not set" ? subs : "All Subjects");

  // 4. Location
  let loc = job.tuitionType === "online"
    ? "Online"
    : (job.tuitionLocationLabel ?? job.locationText ?? "Location not specified");
  if (job.addressDetails?.trim() && job.tuitionType !== "online") {
    loc += ` (${job.addressDetails.trim()})`;
  }
  parts.push(loc);

  // 5. Salary
  const salary = job.budgetAmount !== null && job.budgetAmount !== undefined && job.budgetAmount > 0
    ? `${Math.round(job.budgetAmount).toLocaleString("en-US")} BDT/month`
    : "Salary Negotiable";
  parts.push(salary);

  // 6. Schedule (Days / Week & Time)
  const days = job.daysPerWeek && job.daysPerWeek > 0
    ? `${job.daysPerWeek} ${job.daysPerWeek === 1 ? "Day" : "Days"}/week`
    : "Flexible Days";
  const time = job.tutoringTime?.trim();
  parts.push(time ? `${days}, ${time}` : days);

  // 7. Tutor Preference
  let tutorPref = "Any Tutor";
  if (job.preferredGender === "male") tutorPref = "Male Tutor";
  else if (job.preferredGender === "female") tutorPref = "Female Tutor";
  if (job.instituteName?.trim()) {
    tutorPref += ` (${job.instituteName.trim()})`;
  }
  parts.push(tutorPref);

  // 8. Student Info
  const count = job.studentCount && job.studentCount > 0 ? `${job.studentCount} ${job.studentCount === 1 ? "Student" : "Students"}` : null;
  const gender = job.studentGender === "male" ? "Male" : job.studentGender === "female" ? "Female" : null;
  if (count && gender) {
    parts.push(`${count} (${gender})`);
  } else if (count) {
    parts.push(count);
  } else if (gender) {
    parts.push(`${gender} Student`);
  }

  // 9. Notes (if any special requirements)
  const rawNotes = job.notes?.trim();
  if (rawNotes && rawNotes.toLowerCase() !== "no special requirements") {
    parts.push(`Notes: ${rawNotes}`);
  }

  // 10. Direct link
  const cleanOrigin = origin.replace(/\/+$/, "");
  parts.push(`Apply: ${cleanOrigin}/job-board?job=${encodeURIComponent(code)}`);

  return parts.join(" | ");
}

/**
 * Builds a bulk Facebook post in English with all filtered tuitions listed side-by-side in pipe format.
 */
export function buildEnglishBulkFacebookPostText(
  jobs: FacebookPostJobInput[],
  origin = "https://connecttutorsbd.com",
): string {
  if (jobs.length === 0) {
    return "No live tuitions match the current criteria.";
  }

  const cleanOrigin = origin.replace(/\/+$/, "");
  const jobBoardUrl = `${cleanOrigin}/job-board`;

  const lines = [
    "🔴 LIVE TUITION JOBS — CONNECT TUTORS BD 🔴",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `📢 Total ${jobs.length} ${jobs.length === 1 ? "Tuition Available" : "Tuitions Available"} right now.`,
    "👉 Tutors can view details and apply directly online for FREE!",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    ...jobs.map((job, idx) => `${idx + 1}. ${buildEnglishJobDetailsInline(job, cleanOrigin)}\n`),
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "📌 Browse all available tuition jobs and apply online:",
    jobBoardUrl,
    "",
    "🌐 Connect Tutors BD — The Most Trusted & 100% Free Application Platform for Tutors",
  ];

  return lines.join("\n");
}

