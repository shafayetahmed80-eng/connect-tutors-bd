import { toBanglaDigits } from "./digits";
import type { LearningNeed } from "./learning-needs";
import { formatTutoringTime, normalizeTutoringTime } from "./tutoring-time";

/**
 * The words a Facebook poster prints, in Bangla and English.
 *
 * Every value on a request is stored in English (the catalog is English), so
 * the Bangla poster translates what it can and prints the English value for
 * anything it does not know — a class or subject the Owner added later, a
 * course outside school. Place names stay as stored in both languages: the
 * Owner chose that, and the 497 places are the Owner's to rename.
 *
 * The Job ID is never translated: Job ID search and the `?job=` link read
 * Latin digits only.
 */

export type PosterLocale = "bn" | "en";

const CURRICULA_BN: Record<string, string> = {
  "Bangla Medium": "বাংলা মিডিয়াম",
  "English Medium": "ইংলিশ মিডিয়াম",
  "English Version": "ইংলিশ ভার্সন",
  "Madrasa Medium": "মাদ্রাসা",
  "Religious Studies": "ধর্মীয় শিক্ষা",
  "Admission Test": "ভর্তি পরীক্ষা",
  Arts: "আর্টস",
  "Language Learning": "ভাষা শিক্ষা",
  "Test Preparation": "টেস্ট প্রস্তুতি",
  "Professional Skill Development": "পেশাগত দক্ষতা",
  "Special Skill Development": "বিশেষ দক্ষতা",
  "Special Child Education": "বিশেষ শিশু শিক্ষা",
  "University Help": "বিশ্ববিদ্যালয় সহায়তা",
};

const CLASSES_BN: Record<string, string> = {
  "Pre-Schooling": "প্রি-স্কুল",
  Play: "প্লে",
  Nursery: "নার্সারি",
  KG: "কেজি",
  "HSC- 1st Year": "এইচএসসি ১ম বর্ষ",
  "HSC- 2nd Year": "এইচএসসি ২য় বর্ষ",
  "Alim- 1st Year": "আলিম ১ম বর্ষ",
  "Alim- 2nd Year": "আলিম ২য় বর্ষ",
  "O Level": "ও লেভেল",
  "A Level (AS)": "এ লেভেল AS",
  "A Level (A2)": "এ লেভেল A2",
  SSC: "এসএসসি",
  HSC: "এইচএসসি",
  University: "বিশ্ববিদ্যালয়",
  "School Admission Test": "স্কুল ভর্তি পরীক্ষা",
};

const SUBJECTS_BN: Record<string, string> = {
  Accounting: "হিসাববিজ্ঞান",
  "Additional Maths": "অ্যাডিশনাল ম্যাথ",
  "Agricultural Education": "কৃষিশিক্ষা",
  "Agriculture Education": "কৃষিশিক্ষা",
  "Akayeed and Fiqh": "আকাইদ ও ফিকহ",
  "Al Fiqh": "আল ফিকহ",
  All: "সকল বিষয়",
  "Analytical Skill": "অ্যানালিটিক্যাল স্কিল",
  "Analytical Skills": "অ্যানালিটিক্যাল স্কিল",
  Arabic: "আরবি",
  Arts: "আর্টস",
  BGS: "বিজিএস",
  "Balagat and Mantik": "বালাগাত ও মানতিক",
  Bangla: "বাংলা",
  "Bangladesh & Global Studies": "বাংলাদেশ ও বিশ্বপরিচয়",
  "Bangladesh and Global Studies": "বাংলাদেশ ও বিশ্বপরিচয়",
  "Bangladesh Studies": "বাংলাদেশ স্টাডিজ",
  Biology: "জীববিজ্ঞান",
  "Buddhism Religious Studies": "বৌদ্ধধর্ম শিক্ষা",
  "Business Entrepreneurship": "ব্যবসায় উদ্যোগ",
  "Business Principles": "ব্যবসায় নীতি",
  "Business Studies": "বিজনেস স্টাডিজ",
  "Career Studies": "ক্যারিয়ার শিক্ষা",
  Chemistry: "রসায়ন",
  Civics: "পৌরনীতি",
  Commerce: "কমার্স",
  "Commercial Geography": "বাণিজ্যিক ভূগোল",
  "Computer Science": "কম্পিউটার সায়েন্স",
  "Computer Studies": "কম্পিউটার শিক্ষা",
  Drawing: "ড্রয়িং",
  Economics: "অর্থনীতি",
  English: "ইংরেজি",
  "English Language": "ইংলিশ ল্যাঙ্গুয়েজ",
  "English Literature": "ইংলিশ লিটারেচার",
  "Environmental Systems and Societies": "এনভায়রনমেন্টাল সিস্টেমস",
  Farsi: "ফারসি",
  Finance: "ফিন্যান্স",
  "Finance & Banking": "ফিন্যান্স ও ব্যাংকিং",
  "General Knowledge": "সাধারণ জ্ঞান",
  "General Maths": "সাধারণ গণিত",
  "General Science": "সাধারণ বিজ্ঞান",
  Geography: "ভূগোল",
  "Hadith Sharif": "হাদিস শরিফ",
  Handwriting: "হাতের লেখা",
  "Health & Sport": "স্বাস্থ্য ও খেলাধুলা",
  "Health & Sports": "স্বাস্থ্য ও খেলাধুলা",
  "Higher Maths": "উচ্চতর গণিত",
  "Hinduism Religious Studies": "হিন্দুধর্ম শিক্ষা",
  History: "ইতিহাস",
  "Home Economics": "গার্হস্থ্য বিজ্ঞান",
  ICT: "আইসিটি",
  "Islamic History": "ইসলামের ইতিহাস",
  "Islamic History and Culture": "ইসলামের ইতিহাস ও সংস্কৃতি",
  "Islamic Studies": "ইসলাম শিক্ষা",
  "Islamic studies": "ইসলাম শিক্ষা",
  Law: "আইন",
  Logic: "যুক্তিবিদ্যা",
  Management: "ব্যবস্থাপনা",
  Marketing: "মার্কেটিং",
  Mathematics: "গণিত",
  Maths: "ম্যাথ",
  "Maths B": "ম্যাথ বি",
  "Maths D": "ম্যাথ ডি",
  Others: "অন্যান্য",
  "Peace and Conflict Studies": "শান্তি ও সংঘাত অধ্যয়ন",
  "Physical Education": "শারীরিক শিক্ষা",
  Physics: "পদার্থবিজ্ঞান",
  "Political Science": "রাষ্ট্রবিজ্ঞান",
  Politics: "পলিটিক্স",
  "Production Management & Marketing": "উৎপাদন ব্যবস্থাপনা ও বিপণন",
  Psychology: "মনোবিজ্ঞান",
  "Quran Majid and Tajweed": "কুরআন মাজিদ ও তাজবিদ",
  "Religious Studies": "ধর্ম শিক্ষা",
  Science: "বিজ্ঞান",
  "Social Science": "সমাজবিজ্ঞান",
  "Social Work": "সমাজকর্ম",
  Sociology: "সমাজবিজ্ঞান",
  Statistics: "পরিসংখ্যান",
  Urdu: "উর্দু",
  "Work and Life Oriented Education": "কর্ম ও জীবনমুখী শিক্ষা",
};

const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const clean = (value: string | null | undefined) => (value ?? "").trim().replace(/\s+/g, " ");

/** Digits for this locale: Bangla digits on a Bangla poster, the value untouched on an English one. */
export function localDigits(value: string | number, locale: PosterLocale): string {
  return locale === "bn" ? toBanglaDigits(value) : String(value);
}

/** One curriculum name, e.g. "English Version" → "ইংলিশ ভার্সন". */
export function curriculumLabel(value: string, locale: PosterLocale): string {
  const name = clean(value);
  return locale === "bn" ? CURRICULA_BN[name] ?? name : name;
}

/** One class, e.g. "Class 8" → "ক্লাস ৮", "Standard 6" → "স্ট্যান্ডার্ড ৬", "Class 1–5" → "ক্লাস ১–৫". */
export function classLabel(value: string, locale: PosterLocale): string {
  const name = clean(value);
  // The catalog writes "HSC- 1st Year"; a poster reads "HSC 1st Year".
  if (locale === "en") return name.replace(/(\w)-\s+/g, "$1 ");
  const numbered = /^(Class|Standard)\s+(\d+(?:\s*[–-]\s*\d+)?)$/.exec(name);
  if (numbered) return `${numbered[1] === "Class" ? "ক্লাস" : "স্ট্যান্ডার্ড"} ${toBanglaDigits(numbered[2].replace(/\s+/g, ""))}`;
  return CLASSES_BN[name] ?? name;
}

/** One subject, e.g. "Physics" → "পদার্থবিজ্ঞান". Unknown subjects keep their English name. */
export function subjectLabel(value: string, locale: PosterLocale): string {
  const name = clean(value);
  if (locale === "en") return name === "All" ? "All subjects" : name;
  return SUBJECTS_BN[name] ?? name;
}

/**
 * A list cut to `max` items, with how many were left out:
 * ["A","B","C"] max 2 → "A, B +১টি" / "A, B +1 more".
 */
export function joinWithMore(items: string[], max: number, locale: PosterLocale, separator = ", "): string {
  if (items.length <= max) return items.join(separator);
  const rest = items.length - max;
  const more = locale === "bn" ? ` +${toBanglaDigits(rest)}টি` : ` +${rest} more`;
  return `${items.slice(0, max).join(separator)}${more}`;
}

/** Each class once, in the order the Guardian chose them, across every curriculum. */
function uniqueClasses(needs: LearningNeed[]): string[] {
  return Array.from(new Set(needs.flatMap(need => need.classes.map(item => clean(item.classCourse))).filter(Boolean)));
}

/** Each subject once across every class. */
function uniqueSubjects(needs: LearningNeed[]): string[] {
  return Array.from(new Set(needs.flatMap(need => need.classes.flatMap(item => item.subjects.map(clean))).filter(Boolean)));
}

/** The headline classes: "ক্লাস ৮" or "ক্লাস ৫, ক্লাস ৬ +১টি". */
export function classesText(needs: LearningNeed[], locale: PosterLocale, max = 3): string {
  const classes = uniqueClasses(needs).map(item => classLabel(item, locale));
  return classes.length ? joinWithMore(classes, max, locale) : locale === "bn" ? "টিউশন" : "Tuition";
}

/** The curricula beside the class: "ইংলিশ ভার্সন", or "ইংলিশ মিডিয়াম · Cambridge". */
export function curriculaText(needs: LearningNeed[], locale: PosterLocale, max = 2): string {
  const names = Array.from(new Set(needs.map(need => {
    const name = curriculumLabel(need.category, locale);
    const type = clean(need.curriculumType);
    return type ? `${name} · ${type}` : name;
  }).filter(Boolean)));
  return joinWithMore(names, max, locale, " / ");
}

/**
 * The curriculum a tuition is filed under on a grouped list: its first need's.
 * `key` is the stored English name (two tuitions of one curriculum share it);
 * `label` is what the list's section says.
 */
export function curriculumGroup(needs: LearningNeed[], locale: PosterLocale): { key: string; label: string } {
  const first = needs.map(need => clean(need.category)).find(Boolean);
  if (!first) return { key: "other", label: locale === "bn" ? "অন্যান্য" : "Other" };
  return { key: first, label: curriculumLabel(first, locale) };
}

/** The subjects, one chip each: at most `max`, then one "+২টি" chip for the rest. */
export function subjectChips(needs: LearningNeed[], locale: PosterLocale, max = 3): string[] {
  const subjects = uniqueSubjects(needs).map(item => subjectLabel(item, locale));
  if (!subjects.length) return [locale === "bn" ? "সকল বিষয়" : "All subjects"];
  if (subjects.length <= max) return subjects;
  const rest = subjects.length - max;
  return [...subjects.slice(0, max), locale === "bn" ? `+${toBanglaDigits(rest)}টি` : `+${rest} more`];
}

/** The preferred tutor as the kind the Mist poster colours by. */
export function tutorKind(preferredGender: string | null | undefined): "male" | "female" | "any" {
  if (preferredGender === "female") return "female";
  if (preferredGender === "male") return "male";
  return "any";
}

/** The subjects line: "গণিত · পদার্থবিজ্ঞান · রসায়ন", at most `max`, then "+২টি". */
export function subjectsText(needs: LearningNeed[], locale: PosterLocale, max = 4, separator = " · "): string {
  const subjects = uniqueSubjects(needs).map(item => subjectLabel(item, locale));
  if (!subjects.length) return locale === "bn" ? "সকল বিষয়" : "All subjects";
  return joinWithMore(subjects, max, locale, separator);
}

/**
 * Where: the stored place label, or Online; null when a request has neither.
 * The street address is private and never passes through here.
 */
export function areaText(input: { tuitionType?: string | null; tuitionLocationLabel?: string | null }, locale: PosterLocale): string | null {
  if (input.tuitionType === "online") return locale === "bn" ? "অনলাইন" : "Online";
  const label = clean(input.tuitionLocationLabel);
  return label || null;
}

/** The place without its city — "Dhanmondi" from "Dhanmondi, Dhaka" — for a row whose header already names the city. */
export function areaWithoutCity(area: string): string {
  const parts = area.split(",").map(part => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join(", ") : area;
}

/** The city a place label ends in, or null for Online or a label with no city. */
export function cityOf(input: { tuitionType?: string | null; tuitionLocationLabel?: string | null }): string | null {
  if (input.tuitionType === "online") return null;
  const parts = clean(input.tuitionLocationLabel).split(",").map(part => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

/** "৩ দিন" / "3 days" — the value under the "Per week" label. */
export function daysValue(daysPerWeek: number | null | undefined, locale: PosterLocale): string | null {
  if (!daysPerWeek || daysPerWeek < 1) return null;
  if (locale === "bn") return `${toBanglaDigits(daysPerWeek)} দিন`;
  return `${daysPerWeek} ${daysPerWeek === 1 ? "day" : "days"}`;
}

/** "সপ্তাহে ৩ দিন" / "3 days a week" — the whole phrase, for a row. */
export function daysPhrase(daysPerWeek: number | null | undefined, locale: PosterLocale): string | null {
  const value = daysValue(daysPerWeek, locale);
  if (!value) return null;
  return locale === "bn" ? `সপ্তাহে ${value}` : `${value} a week`;
}

/** The Bangla part of the day a 24-hour hour falls in. */
export function banglaDayPart(hours: number): string {
  if (hours >= 5 && hours < 12) return "সকাল";
  if (hours >= 12 && hours < 15) return "দুপুর";
  if (hours >= 15 && hours < 18) return "বিকাল";
  if (hours >= 18 && hours < 20) return "সন্ধ্যা";
  return "রাত";
}

/** "16:30" → "বিকাল ৪:৩০", "17:00" → "বিকাল ৫টা", "4:30 PM" in English; null when no time was given. */
export function timeValue(value: string | null | undefined, locale: PosterLocale): string | null {
  const time = normalizeTutoringTime(value);
  if (!time) return null;
  if (locale === "en") return formatTutoringTime(time);
  const [hours, minutes] = time.split(":").map(Number);
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const clock = minutes === 0 ? `${toBanglaDigits(hour12)}টা` : `${toBanglaDigits(hour12)}:${toBanglaDigits(String(minutes).padStart(2, "0"))}`;
  return `${banglaDayPart(hours)} ${clock}`;
}

/** The preferred tutor: মহিলা / পুরুষ / যেকোনো, Female / Male / Any. */
export function tutorValue(preferredGender: string | null | undefined, locale: PosterLocale): string {
  if (preferredGender === "female") return locale === "bn" ? "মহিলা" : "Female";
  if (preferredGender === "male") return locale === "bn" ? "পুরুষ" : "Male";
  return locale === "bn" ? "যেকোনো" : "Any";
}

/** A whole-taka amount grouped the South Asian way: 150000 → "1,50,000". */
export function lakhGrouping(amount: number): string {
  const digits = String(Math.round(Math.abs(amount)));
  if (digits.length <= 3) return digits;
  const last = digits.slice(-3);
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${head},${last}`;
}

/** "৳ ৮,০০০" / "৳ 8,000"; null when the request has no salary (only two old requests). */
export function salaryText(amount: number | null | undefined, locale: PosterLocale): string | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount <= 0) return null;
  if (locale === "bn") return `৳ ${toBanglaDigits(lakhGrouping(amount))}`;
  return `৳ ${Math.round(amount).toLocaleString("en-US")}`;
}

/** Today in Dhaka: "১৭ অক্টোবর ২০২৬" / "17 October 2026". */
export function posterDate(date: Date, locale: PosterLocale): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date);
  const read = (type: string) => Number(parts.find(part => part.type === type)?.value ?? 0);
  const day = read("day");
  const month = read("month") - 1;
  const year = read("year");
  if (locale === "bn") return `${toBanglaDigits(day)} ${BN_MONTHS[month]} ${toBanglaDigits(year)}`;
  return `${day} ${EN_MONTHS[month]} ${year}`;
}

/** "৪টি টিউশন" / "4 tuitions". */
export function tuitionCount(count: number, locale: PosterLocale): string {
  if (locale === "bn") return `${toBanglaDigits(count)}টি টিউশন`;
  return `${count} ${count === 1 ? "tuition" : "tuitions"}`;
}

/** The fixed words on every poster. */
export const POSTER_WORDS = {
  bn: {
    kicker: "শিক্ষক প্রয়োজন",
    weekLabel: "সপ্তাহে",
    timeLabel: "সময়",
    tutorLabel: "শিক্ষক",
    salaryLabel: "মাসিক বেতন",
    perMonth: "প্রতি মাসে",
    perMonthShort: "/ মাস",
    scanToApply: "স্ক্যান করে আবেদন করুন",
    scanForAll: "সব টিউশন দেখতে স্ক্যান করুন",
    tutorsNeeded: "শিক্ষক প্রয়োজন",
    navyTitle: "আজকের নতুন টিউশন",
    emeraldTitle: "উচ্চ বেতনের টিউশন",
    crimsonKicker: "জরুরি",
    crimsonTitle: "আজই শিক্ষক প্রয়োজন",
    applyNow: "এখনই আবেদন করুন",
    mistTitle: "টিউশন বেছে নিন",
    tutorPill: { male: "পুরুষ শিক্ষক", female: "মহিলা শিক্ষক", any: "পুরুষ / মহিলা" },
  },
  en: {
    kicker: "TUTOR NEEDED",
    weekLabel: "Per week",
    timeLabel: "Time",
    tutorLabel: "Tutor",
    salaryLabel: "Monthly salary",
    perMonth: "per month",
    perMonthShort: "/ month",
    scanToApply: "Scan to apply",
    scanForAll: "Scan to see every tuition",
    tutorsNeeded: "Tutors needed",
    navyTitle: "Today's new tuitions",
    emeraldTitle: "High-paying tuitions",
    crimsonKicker: "URGENT",
    crimsonTitle: "Tutors needed today",
    applyNow: "Apply now",
    mistTitle: "Choose your tuition",
    tutorPill: { male: "MALE TUTOR", female: "FEMALE TUTOR", any: "MALE / FEMALE" },
  },
} as const;
