import type { FacebookPostJobInput } from "./facebook-post";
import { formatSubjects } from "./job-card";

/**
 * Normalizes text into a clean CamelCase hashtag without spaces or special characters.
 * e.g. "Dhanmondi, Dhaka" -> "DhanmondiDhaka"
 * "English Medium" -> "EnglishMedium"
 */
export function toCamelCaseTag(text: string): string {
  const words = text
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

/**
 * Extracts recognized Dhaka / BD location keys and maps them to clean CamelCase hashtags.
 */
export function extractLocationHashtags(job: FacebookPostJobInput): string[] {
  const tags: string[] = [];
  if (job.tuitionType === "online") {
    tags.push("OnlineTuition", "OnlineTutorBD");
    return tags;
  }

  const rawLocation = [
    job.tuitionLocationLabel || "",
    job.locationText || "",
    job.addressDetails || "",
  ].join(" ").toLowerCase();

  // Known areas in Dhaka and major cities
  const knownAreas = [
    { key: "dhanmondi", tag: "DhanmondiTuition" },
    { key: "mirpur", tag: "MirpurTuition" },
    { key: "uttara", tag: "UttaraTuition" },
    { key: "gulshan", tag: "GulshanTuition" },
    { key: "banani", tag: "BananiTuition" },
    { key: "mohammadpur", tag: "MohammadpurTuition" },
    { key: "bashundhara", tag: "BashundharaTuition" },
    { key: "badda", tag: "BaddaTuition" },
    { key: "khilgaon", tag: "KhilgaonTuition" },
    { key: "malibagh", tag: "MalibaghTuition" },
    { key: "rampura", tag: "RampuraTuition" },
    { key: "banasree", tag: "BanasreeTuition" },
    { key: "lalmatia", tag: "LalmatiaTuition" },
    { key: "shantinagar", tag: "ShantinagarTuition" },
    { key: "wari", tag: "WariTuition" },
    { key: "motijheel", tag: "MotijheelTuition" },
    { key: "farmgate", tag: "FarmgateTuition" },
    { key: "chittagong", tag: "ChittagongTuition" },
    { key: "sylhet", tag: "SylhetTuition" },
  ];

  let matched = false;
  for (const area of knownAreas) {
    if (rawLocation.includes(area.key)) {
      tags.push(area.tag);
      matched = true;
    }
  }

  // If specific area matched, also add area-tutors tag
  if (tags.length > 0) {
    const primary = tags[0].replace("Tuition", "Tutors");
    tags.push(primary);
  }

  // Fallback if no specific area matched
  if (!matched && job.locationText?.trim()) {
    const custom = toCamelCaseTag(job.locationText.trim());
    if (custom) {
      tags.push(`${custom}Tuition`);
    }
  }

  return tags;
}

/**
 * Extracts curriculum & category based hashtags.
 */
export function extractCurriculumHashtags(job: FacebookPostJobInput): string[] {
  const tags: string[] = [];
  const text = `${job.curriculumType || ""} ${job.category || ""}`.toLowerCase();

  if (text.includes("english medium") || text.includes("cambridge") || text.includes("edexcel")) {
    tags.push("EnglishMediumTutors", "EnglishMediumTuition", "OLevelTutors", "ALevelTutors");
  } else if (text.includes("english version")) {
    tags.push("EnglishVersionTuition", "EnglishVersionTutors");
  } else if (text.includes("bangla medium")) {
    tags.push("BanglaMediumTuition", "BanglaMediumTutors");
  } else if (text.includes("madrasah")) {
    tags.push("MadrasahTuition");
  }

  return tags;
}

/**
 * Extracts subject based hashtags.
 */
export function extractSubjectHashtags(job: FacebookPostJobInput): string[] {
  const tags: string[] = [];
  const rawSubs = formatSubjects(job.subjects).toLowerCase();

  if (rawSubs.includes("physics")) tags.push("PhysicsTutor");
  if (rawSubs.includes("chemistry")) tags.push("ChemistryTutor");
  if (rawSubs.includes("math")) tags.push("MathTutor");
  if (rawSubs.includes("biology")) tags.push("BiologyTutor");
  if (rawSubs.includes("english")) tags.push("EnglishTutor");
  if (rawSubs.includes("ict") || rawSubs.includes("computer")) tags.push("ICTTutor");
  if (rawSubs.includes("accounting") || rawSubs.includes("finance") || rawSubs.includes("economics")) {
    tags.push("CommerceTutors");
  }

  return tags;
}

/**
 * Extracts university preference or tutor demographic hashtags.
 */
export function extractPreferenceHashtags(job: FacebookPostJobInput): string[] {
  const tags: string[] = [];
  const combined = [job.instituteName || "", job.notes || ""].join(" ").toLowerCase();

  if (combined.includes("buet")) tags.push("BUETTutors");
  if (combined.includes("dhaka university") || /\bdu\b/.test(combined)) tags.push("DhakaUniversityTutors");
  if (combined.includes("medical") || combined.includes("dmc")) tags.push("MedicalTutors");

  if (job.preferredGender === "female") tags.push("FemaleTutorWanted");
  else if (job.preferredGender === "male") tags.push("MaleTutorWanted");

  return tags;
}

/**
 * Generates an ordered, deduplicated list of clean CamelCase hashtags for a single tuition job.
 */
export function generateSmartHashtags(job: FacebookPostJobInput, maxTags = 12): string[] {
  const collected: string[] = [];

  // 1. Core Brand Tag
  collected.push("ConnectTutors");

  // 2. Location Tags (Primary area first)
  const locTags = extractLocationHashtags(job);
  if (locTags.length > 0) {
    collected.push(locTags[0]); // Primary location e.g. UttaraTuition
  }

  // 3. Curriculum / Medium Tag (Primary medium first)
  const currTags = extractCurriculumHashtags(job);
  if (currTags.length > 0) {
    collected.push(currTags[0]); // Primary medium e.g. EnglishMediumTutors
  }

  // 4. Universal High-Traffic Tuition Tags
  collected.push("DhakaTutors", "HomeTuitionDhaka", "TuitionBD");

  // 5. Subject Tags
  collected.push(...extractSubjectHashtags(job));

  // 6. University / Preference Tags
  collected.push(...extractPreferenceHashtags(job));

  // 7. Remaining Location & Curriculum Tags
  if (locTags.length > 1) {
    collected.push(...locTags.slice(1));
  }
  if (currTags.length > 1) {
    collected.push(...currTags.slice(1));
  }

  collected.push("HomeTutor");

  // Deduplicate case-insensitively
  const seen = new Set<string>();
  const uniqueTags: string[] = [];

  for (const tag of collected) {
    const clean = tag.startsWith("#") ? tag.slice(1) : tag;
    const lower = clean.toLowerCase();
    if (!seen.has(lower) && clean.trim().length > 0) {
      seen.add(lower);
      uniqueTags.push(clean);
    }
    if (uniqueTags.length >= maxTags) {
      break;
    }
  }

  return uniqueTags.map(t => `#${t}`);
}

/**
 * Generates combined smart hashtags for multiple (bulk) tuition jobs.
 */
export function generateBulkSmartHashtags(jobs: FacebookPostJobInput[], maxTags = 14): string[] {
  if (jobs.length === 0) {
    return ["#ConnectTutors", "#DhakaTutors", "#HomeTuitionDhaka", "#TuitionBD"];
  }

  const collected: string[] = ["ConnectTutors"];

  // Collect primary location from each job first
  for (const job of jobs) {
    const locs = extractLocationHashtags(job);
    if (locs.length > 0) collected.push(locs[0]);
  }

  // Collect primary curriculum from each job
  for (const job of jobs) {
    const currs = extractCurriculumHashtags(job);
    if (currs.length > 0) collected.push(currs[0]);
  }

  // High-volume anchor tags
  collected.push("DhakaTutors", "HomeTuitionDhaka", "TuitionBD");

  // Collect subjects
  for (const job of jobs) {
    collected.push(...extractSubjectHashtags(job));
  }

  // Collect institute preferences
  for (const job of jobs) {
    collected.push(...extractPreferenceHashtags(job));
  }

  // Collect remaining locations & curriculums
  for (const job of jobs) {
    collected.push(...extractLocationHashtags(job));
    collected.push(...extractCurriculumHashtags(job));
  }

  const seen = new Set<string>();
  const uniqueTags: string[] = [];

  for (const tag of collected) {
    const clean = tag.startsWith("#") ? tag.slice(1) : tag;
    const lower = clean.toLowerCase();
    if (!seen.has(lower) && clean.trim().length > 0) {
      seen.add(lower);
      uniqueTags.push(clean);
    }
    if (uniqueTags.length >= maxTags) {
      break;
    }
  }

  return uniqueTags.map(t => `#${t}`);
}

/**
 * Formats an array of hashtags into a clean string ready for Facebook posts.
 * e.g. "#ConnectTutors #DhanmondiTuition #EnglishMediumTutors"
 */
export function formatHashtags(hashtags: string[]): string {
  if (!hashtags || hashtags.length === 0) return "";
  return hashtags.join(" ");
}
