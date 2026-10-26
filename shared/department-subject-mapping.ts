/**
 * Maps academic departments and faculties in Bangladesh (e.g., Mathematics,
 * EEE, Computer Science, English, Medicine, Business Administration) to
 * recommended school/college tuition subjects.
 *
 * This provides tutors with intelligent 1-tap subject recommendations
 * sorted to the top of the subject selector with a "Recommended" badge.
 */

export type DepartmentSubjectRecommendationRule = {
  departmentPattern: RegExp;
  subjects: readonly string[];
};

export const DEPARTMENT_SUBJECT_RULES: readonly DepartmentSubjectRecommendationRule[] = [
  {
    // Mathematics / Applied Math / Statistics
    departmentPattern: /(?:math|গণিত|statistics|পরিসংখ্যান)/i,
    subjects: ["Mathematics", "Higher Mathematics", "Statistics", "General Science"],
  },
  {
    // Physics / Applied Physics / EEE / Electronics / Mechanical / Civil / Engineering
    departmentPattern: /(?:physics|পদার্থ|electrical|electronic|eee|mechanical|civil|engineering|প্রকৌশল)/i,
    subjects: ["Physics", "Mathematics", "Higher Mathematics", "ICT", "General Science"],
  },
  {
    // Computer Science / CSE / IT / Software Engineering
    departmentPattern: /(?:comput|cse|software|তথ্যপ্রযুক্তি|it\b|information\s+tech)/i,
    subjects: ["ICT", "Computer Science", "Programming", "Mathematics", "Higher Mathematics"],
  },
  {
    // Chemistry / Applied Chemistry / Chemical Eng / Pharmacy / Biochemistry
    departmentPattern: /(?:chemist|রসায়ন|pharm|ফার্মাসি|biochem)/i,
    subjects: ["Chemistry", "General Science", "Biology", "Physics"],
  },
  {
    // Biology / Botany / Zoology / Medicine / MBBS / BDS / Genetic Eng / Microbiology / Biotechnology
    departmentPattern: /(?:bio|জীব|medic|mbbs|bds|dental|doctor|চিকিৎসা|microbio|genetic|zoology|botany)/i,
    subjects: ["Biology", "General Science", "Chemistry"],
  },
  {
    // English / English Language & Literature / Linguistics
    departmentPattern: /(?:english|ইংরেজি|linguistics)/i,
    subjects: ["English", "Spoken English", "IELTS Preparation"],
  },
  {
    // Bangla / Bengali Literature
    departmentPattern: /(?:bangla|বাংলা|bengali)/i,
    subjects: ["Bangla"],
  },
  {
    // Business Administration / BBA / Finance / Accounting / Management / Marketing / Banking
    departmentPattern: /(?:account|হিসাব|finance|অর্থায়ন|banking|business|ব্যবসায়|bba|management|marketing|commerce)/i,
    subjects: ["Accounting", "Finance and Banking", "Business Entrepreneurship", "Economics"],
  },
  {
    // Economics / Development Studies
    departmentPattern: /(?:econom|অর্থনীতি)/i,
    subjects: ["Economics", "Statistics", "Mathematics"],
  },
  {
    // Islamic Studies / Arabic / Al-Hadith / Dawah / Madrasah
    departmentPattern: /(?:islam|ইসলাম|arabic|আরবি|quran|hadith|dawah|madrasa)/i,
    subjects: ["Islam and Moral Education", "Arabic", "Quran and Tajweed"],
  },
  {
    // History / Civics / Political Science / International Relations / Sociology / Law
    departmentPattern: /(?:history|ইতিহাস|political|civic|পৌরনীতি|international\s+rel|sociology|law\b|আইন)/i,
    subjects: ["Civics and Citizenship", "History of Bangladesh and World Civilization", "Geography and Environment"],
  },
  {
    // Agriculture / Agronomy / Soil Science / Veterinary
    departmentPattern: /(?:agri|কৃষি|veterinary|soil)/i,
    subjects: ["Agricultural Studies", "General Science", "Biology"],
  },
];

/**
 * Returns an ordered array of recommended subject names for a given department name.
 * Returns empty array if department is blank or has no matched recommendation rule.
 */
export function getRecommendedSubjectNamesForDepartment(
  departmentName: string | null | undefined,
): string[] {
  if (!departmentName) return [];
  const trimmed = departmentName.trim();
  if (!trimmed) return [];

  const matchedSet = new Set<string>();
  for (const rule of DEPARTMENT_SUBJECT_RULES) {
    if (rule.departmentPattern.test(trimmed)) {
      for (const subject of rule.subjects) {
        matchedSet.add(subject);
      }
    }
  }

  return Array.from(matchedSet);
}

export type SubjectOptionWithBadge<T extends { id: string; label: string }> = T & {
  badge?: string;
};

/**
 * Takes a list of subject options and sorts recommended subjects to the top with
 * a "Recommended" badge, while preserving relative order for remaining subjects.
 */
export function sortAndBadgeSubjectsForDepartment<T extends { id: string; label: string }>(
  options: T[],
  departmentName: string | null | undefined,
): Array<SubjectOptionWithBadge<T>> {
  if (!options || options.length === 0) return [];
  const recommendedNames = getRecommendedSubjectNamesForDepartment(departmentName);
  if (recommendedNames.length === 0) {
    return options.map(opt => ({ ...opt }));
  }

  const recLowerMap = new Map<string, number>();
  recommendedNames.forEach((name, idx) => {
    recLowerMap.set(name.toLowerCase(), idx);
  });

  const recommendedList: Array<SubjectOptionWithBadge<T>> = [];
  const otherList: Array<SubjectOptionWithBadge<T>> = [];

  for (const option of options) {
    const key = option.label.trim().toLowerCase();
    if (recLowerMap.has(key)) {
      recommendedList.push({
        ...option,
        badge: "Recommended",
      });
    } else {
      otherList.push({
        ...option,
      });
    }
  }

  // Sort recommended options in the prioritized order defined by the recommendation rule
  recommendedList.sort((a, b) => {
    const rankA = recLowerMap.get(a.label.trim().toLowerCase()) ?? 999;
    const rankB = recLowerMap.get(b.label.trim().toLowerCase()) ?? 999;
    return rankA - rankB;
  });

  return [...recommendedList, ...otherList];
}
