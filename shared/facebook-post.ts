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
