/**
 * What a Guardian can ask to have taught: the curricula ("categories"), the
 * classes in each, and the subjects of each class.
 *
 * It lived in the Guardian journey page. The Admin's Add Tuition form and the
 * shared learning-needs field read it too, and none of them should have to
 * import a page for a list - so it is its own module, and the page still
 * re-exports every name it used to.
 */

const guardianDefaultSubjects = ["Bangla", "English", "Mathematics", "Science", "Physics", "Chemistry", "Biology", "ICT"] as const;
export const guardianEarlyYearsSubjects = ["All", "English", "Bangla", "General Maths", "Handwriting", "Drawing", "Arts", "Religious Studies"] as const;
export const guardianEnglishMediumEarlyYearsSubjects = [...guardianEarlyYearsSubjects, "Others"] as const;
const guardianEarlyYearsLevels = ["Pre-Schooling", "Play", "Nursery", "KG"] as const;
export const guardianEnglishMediumClassOneToFiveSubjects = ["All", "Maths", "English Literature", "English", "Bangla", "Science", "Islamic Studies", "History", "ICT", "Social Science", "Bangladesh & Global Studies", "Geography", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishMediumClassOneToFiveLevels = ["Standard 1", "Standard 2", "Standard 3", "Standard 4", "Standard 5"] as const;
export const guardianEnglishMediumClassSixToSevenSubjects = ["All", "Physics", "Chemistry", "Biology", "Maths", "English Literature", "English", "Bangla", "Science", "Business Studies", "Islamic Studies", "History", "ICT", "Social Science", "Bangladesh & Global Studies", "Economics", "Geography", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishMediumClassSixToSevenLevels = ["Standard 6", "Standard 7"] as const;
export const guardianEnglishMediumStandardEightToNineAndOLevelSubjects = ["All", "Physics", "Chemistry", "Maths", "Maths B", "Maths D", "Additional Maths", "Biology", "English Literature", "English Language", "Bangla", "ICT", "Accounting", "Business Studies", "Economics", "Bangladesh Studies", "Commerce", "Islamic Studies", "Law", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishMediumStandardEightToNineAndOLevelLevels = ["Standard 8", "Standard 9", "O Level"] as const;
export const guardianEnglishMediumALevelSubjects = ["Chemistry", "Maths", "Maths B", "Maths D", "Additional Maths", "Biology", "Physics", "Environmental Systems and Societies", "Psychology", "English", "ICT", "Geography", "Economics", "Sociology", "Law", "Business Studies", "Commerce", "English Literature", "Accounting", "Bangla", "Politics", "Computer Science", "Finance", "Statistics", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishMediumALevels = ["A Level (AS)", "A Level (A2)"] as const;
export const guardianBanglaMediumClassOneToEightSubjects = ["All", "English", "Bangla", "BGS", "General Maths", "General Science", "ICT", "Religious Studies", "Hinduism Religious Studies", "Buddhism Religious Studies", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianBanglaMediumClassOneToEightLevels = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"] as const;
export const guardianEnglishVersionClassOneToEightSubjects = ["All", "English", "Bangla", "BGS", "General Maths", "General Science", "Social Science", "General Knowledge", "ICT", "History", "Geography", "Home Economics", "Agricultural Education", "Religious Studies", "Hinduism Religious Studies", "Buddhism Religious Studies", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishVersionClassOneToEightLevels = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"] as const;
export const guardianEnglishVersionClassNineToTenSubjects = ["Physics", "Chemistry", "Biology", "General Maths", "Higher Maths", "Social Science", "Bangla", "English", "General Science", "Computer Studies", "BGS", "Religious Studies", "Accounting", "Finance & Banking", "Management", "Business Entrepreneurship", "Economics", "Civics", "Home Economics", "Agricultural Education", "History", "Geography", "Psychology", "Physical Education", "Health & Sports", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishVersionClassNineToTenLevels = ["Class 9", "Class 10"] as const;
export const guardianBanglaMediumClassNineToTenSubjects = ["Physics", "Chemistry", "Biology", "General Maths", "Higher Maths", "Social Science", "Bangla", "English", "General Science", "ICT", "BGS", "Religious Studies", "Accounting", "Finance & Banking", "Management", "Business Entrepreneurship", "Economics", "Civics", "Home Economics", "Agricultural Education", "History", "Geography", "Psychology", "Physical Education", "Health & Sports", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianBanglaMediumClassNineToTenLevels = ["Class 9", "Class 10"] as const;
export const guardianBanglaMediumHscSubjects = ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "Accounting", "Finance", "Management", "Production Management & Marketing", "Statistics", "English", "Bangla", "Religious Studies", "Political Science", "History", "Islamic History and Culture", "Social Work", "Logic", "Agricultural Education", "Economics", "Sociology", "Geography", "Commercial Geography", "Psychology", "Civics", "All", "Others"] as const;
const guardianBanglaMediumHscLevels = ["HSC- 1st Year", "HSC- 2nd Year"] as const;
export const guardianEnglishVersionHscSubjects = ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "Accounting", "Finance", "Management", "Production Management & Marketing", "Statistics", "English", "Bangla", "Religious Studies", "Political Science", "History", "Islamic History and Culture", "Social Work", "Logic", "Agricultural Education", "Economics", "Sociology", "Geography", "Commercial Geography", "Psychology", "Civics", "All", "Others"] as const;
const guardianEnglishVersionHscLevels = ["HSC- 1st Year", "HSC- 2nd Year"] as const;
export const guardianMadrasaPlayToClassEightSubjects = ["All", "English", "Bangla", "BGS", "General Maths", "General Science", "ICT", "Quran Majid and Tajweed", "Akayeed and Fiqh", "Arabic", "Agriculture Education", "Home Economics", "Work and Life Oriented Education", "Hadith Sharif", "Physical Education", "Health & Sport", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianMadrasaPlayToClassEightLevels = ["Play", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"] as const;
export const guardianMadrasaClassNineToTenSubjects = ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "Home Economics", "Civics", "Arabic", "Akayeed and Fiqh", "Quran Majid and Tajweed", "Peace and Conflict Studies", "Career Studies", "All", "Physical Education", "Health & Sports", "Islamic studies", "Bangladesh and Global Studies", "Agriculture Education", "General Maths", "English", "Bangla"] as const;
const guardianMadrasaClassNineToTenLevels = ["Class 9", "Class 10"] as const;
export const guardianMadrasaAlimSubjects = ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "Civics", "Farsi", "Urdu", "Economics", "English", "Quran Majid and Tajweed", "Hadith Sharif", "Al Fiqh", "Arabic", "Islamic History", "Balagat and Mantik", "Bangla"] as const;
const guardianMadrasaAlimLevels = ["Alim- 1st Year", "Alim- 2nd Year"] as const;
export const guardianSchoolAdmissionSubjects = ["All", "English", "Bangla", "BGS", "General Maths", "General Science", "General Knowledge", "ICT", "Others"] as const;
const guardianSchoolAdmissionLevels = ["School Admission Test"] as const;
export const guardianPublicUniversityAdmissionSubjects = ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "General Knowledge", "Bangla", "English", "Management", "Business Principles", "Marketing", "Business Entrepreneurship", "Economics", "Civics", "Analytical Skills", "Finance & Banking", "Accounting", "All"] as const;
const guardianPublicUniversityAdmissionLevels = ["Public University Admission Test"] as const;
export const guardianPrivateUniversityAdmissionSubjects = ["Physics", "Chemistry", "Biology", "Maths", "English", "Bangla", "General Knowledge", "Accounting", "Management", "Analytical Skill"] as const;
const guardianPrivateUniversityAdmissionLevels = ["Private University Admission Test"] as const;
export const guardianEngineeringUniversityAdmissionSubjects = ["Physics", "Chemistry", "Higher Maths", "ICT", "English", "Bangla", "General Knowledge"] as const;
const guardianEngineeringUniversityAdmissionLevels = ["Engineering University Admission Test"] as const;
export const guardianMedicalCollegeAdmissionSubjects = ["Physics", "Chemistry", "Biology", "ICT", "English", "Bangla", "General Knowledge", "All"] as const;
const guardianMedicalCollegeAdmissionLevels = ["Medical College Admission Test"] as const;
export const guardianIbaAdmissionSubjects = ["Accounting", "Finance", "Management", "Production Management & Marketing", "Statistics", "English", "Bangla", "All"] as const;
const guardianIbaAdmissionLevels = ["IBA Admission"] as const;
export const guardianCurriculumCategories = [
  "Bangla Medium",
  "English Medium",
  "English Version",
  "Religious Studies",
  "Admission Test",
  "Arts",
  "Language Learning",
  "Test Preparation",
  "Professional Skill Development",
  "Special Skill Development",
  "Special Child Education",
  "University Help",
  "Madrasa Medium",
] as const;
const categories = guardianCurriculumCategories;
const fallbackGuardianLevels = ["Class 1–5", "Class 6–8", "Class 9–10", "SSC", "HSC", "University"] as const;
const banglaAndEnglishVersionLevels = [
  "Pre-Schooling",
  "Play",
  "Nursery",
  "KG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "HSC- 1st Year",
  "HSC- 2nd Year",
] as const;

export const guardianLevelsByCurriculum = {
  "Bangla Medium": banglaAndEnglishVersionLevels,
  "English Version": banglaAndEnglishVersionLevels,
  "English Medium": [
    "Pre-Schooling",
    "Nursery",
    "KG",
    "Play",
    "Standard 1",
    "Standard 2",
    "Standard 3",
    "Standard 4",
    "Standard 5",
    "Standard 6",
    "Standard 7",
    "Standard 8",
    "Standard 9",
    "O Level",
    "A Level (AS)",
    "A Level (A2)",
  ],
  "University Help": [
    "BA (English)",
    "BBA",
    "MBBS",
    "BS-Biochemistry",
    "BS-Biotechnology",
    "BS-Microbiology",
    "B.Pharm",
    "B.Sc-EEE",
    "B.Sc-CSE",
    "B.Sc-Civil Engineering",
    "B.Sc-Mathematics",
    "B.Sc-Mechanical Engineering",
    "BSS-Economics",
    "BSS-Anthropology",
    "BSS-Sociology",
    "LLB",
    "BFA-Sculpture",
    "BFA-Graphic Design",
    "B.Arch",
    "MBA",
    "MS-Biochemistry",
    "MS-Biotechnology",
    "MS-Microbiology",
    "M.Pharm",
    "M.Sc-EEE",
    "M.Sc-CSE",
    "M.Sc-Mathematics",
    "M.Sc-Mechanical Engineering",
    "MSS-Economics",
    "MSS-Sociology",
    "MSS-Anthropology",
    "LLM",
    "MFA-Sculpture",
    "MFA-Graphic Design",
    "Diploma-Civil Engineering",
    "Diploma-Computer Technology",
  ],
  "Madrasa Medium": [
    "Play",
    "Nursery",
    "KG",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Alim- 1st Year",
    "Alim- 2nd Year",
  ],
  "Religious Studies": [
    "Islamic Studies",
    "Hinduism Studies",
    "Buddhism Studies",
    "Christianity Studies",
  ],
  "Language Learning": [
    "Spoken English",
    "IELTS Preparation",
    "French",
    "German",
    "Japanese",
    "Korean",
    "Arabic",
  ],
  "Admission Test": [
    "School Admission Test",
    "Public University Admission Test",
    "Private University Admission Test",
    "Medical College Admission Test",
    "Engineering University Admission Test",
    "IBA Admission",
    "University Admission",
    "Medical Admission",
    "Engineering Admission",
    "IBA/MBA Admission",
  ],
  Arts: [
    "Drawing & Painting",
    "Handwriting",
    "Music",
    "Instrumental Music",
    "Dance",
    "Crafting",
    "Recitation",
  ],
  "Test Preparation": [
    "BCS",
    "Bank Job",
    "Government Job",
    "GRE",
    "GMAT",
    "SAT",
    "TOEFL",
  ],
  "Professional Skill Development": [
    "Artificial Intelligence",
    "Web Design",
    "Adobe Illustrator",
    "Adobe Photoshop",
    "Web Development",
    "Microsoft Office",
    "Fashion Design",
    "Fashion Drawing",
    "Sewing & Tailoring",
    "Digital Marketing",
    "Computer Programming",
    "Video Editing",
  ],
  "Special Skill Development": [
    "Mental Math/Abacus",
    "Coding for Kids",
    "Creative Writing",
    "Debate",
    "Photography",
    "Kung Fu",
    "Karate",
    "GYM",
    "Yoga",
    "Cooking",
  ],
  "Special Child Education": [
    "Basic Education",
    "Arts",
    "Religious Studies",
    "Special Skill Development",
  ],
} as const;

export function getGuardianLevelsForCurriculum(curriculum: string): readonly string[] {
  if (!curriculum) return [];
  return guardianLevelsByCurriculum[curriculum as keyof typeof guardianLevelsByCurriculum] ?? fallbackGuardianLevels;
}

export const guardianEnglishMediumCurriculumTypes = ["British", "Cambridge", "Ed-excel"] as const;

export function getGuardianCurriculumTypesForCategory(category: string): readonly string[] {
  return category === "English Medium" ? guardianEnglishMediumCurriculumTypes : [];
}

export function getGuardianCurriculumTypeForCategoryChange(currentCurriculumType: string, nextCategory: string) {
  return nextCategory === "English Medium" ? currentCurriculumType : "";
}

export function getGuardianSubjectsForLearningNeed(category: string, classCourse: string): readonly string[] {
  const usesBanglaMediumClassOneToEightSubjects =
    category === "Bangla Medium" &&
    guardianBanglaMediumClassOneToEightLevels.includes(classCourse as typeof guardianBanglaMediumClassOneToEightLevels[number]);
  const usesEnglishVersionClassOneToEightSubjects =
    category === "English Version" &&
    guardianEnglishVersionClassOneToEightLevels.includes(classCourse as typeof guardianEnglishVersionClassOneToEightLevels[number]);
  const usesEnglishVersionClassNineToTenSubjects =
    category === "English Version" &&
    guardianEnglishVersionClassNineToTenLevels.includes(classCourse as typeof guardianEnglishVersionClassNineToTenLevels[number]);
  const usesBanglaMediumClassNineToTenSubjects =
    category === "Bangla Medium" &&
    guardianBanglaMediumClassNineToTenLevels.includes(classCourse as typeof guardianBanglaMediumClassNineToTenLevels[number]);
  const usesBanglaMediumHscSubjects =
    category === "Bangla Medium" &&
    guardianBanglaMediumHscLevels.includes(classCourse as typeof guardianBanglaMediumHscLevels[number]);
  const usesEnglishVersionHscSubjects =
    category === "English Version" &&
    guardianEnglishVersionHscLevels.includes(classCourse as typeof guardianEnglishVersionHscLevels[number]);
  const usesMadrasaPlayToClassEightSubjects =
    category === "Madrasa Medium" &&
    guardianMadrasaPlayToClassEightLevels.includes(classCourse as typeof guardianMadrasaPlayToClassEightLevels[number]);
  const usesMadrasaClassNineToTenSubjects =
    category === "Madrasa Medium" &&
    guardianMadrasaClassNineToTenLevels.includes(classCourse as typeof guardianMadrasaClassNineToTenLevels[number]);
  const usesMadrasaAlimSubjects =
    category === "Madrasa Medium" &&
    guardianMadrasaAlimLevels.includes(classCourse as typeof guardianMadrasaAlimLevels[number]);
  const usesSchoolAdmissionSubjects =
    category === "Admission Test" &&
    guardianSchoolAdmissionLevels.includes(classCourse as typeof guardianSchoolAdmissionLevels[number]);
  const usesPublicUniversityAdmissionSubjects =
    category === "Admission Test" &&
    guardianPublicUniversityAdmissionLevels.includes(classCourse as typeof guardianPublicUniversityAdmissionLevels[number]);
  const usesPrivateUniversityAdmissionSubjects =
    category === "Admission Test" &&
    guardianPrivateUniversityAdmissionLevels.includes(classCourse as typeof guardianPrivateUniversityAdmissionLevels[number]);
  const usesEngineeringUniversityAdmissionSubjects =
    category === "Admission Test" &&
    guardianEngineeringUniversityAdmissionLevels.includes(classCourse as typeof guardianEngineeringUniversityAdmissionLevels[number]);
  const usesMedicalCollegeAdmissionSubjects =
    category === "Admission Test" &&
    guardianMedicalCollegeAdmissionLevels.includes(classCourse as typeof guardianMedicalCollegeAdmissionLevels[number]);
  const usesIbaAdmissionSubjects =
    category === "Admission Test" &&
    guardianIbaAdmissionLevels.includes(classCourse as typeof guardianIbaAdmissionLevels[number]);
  const usesEnglishMediumEarlyYearsSubjects =
    category === "English Medium" &&
    guardianEarlyYearsLevels.includes(classCourse as typeof guardianEarlyYearsLevels[number]);
  const usesEnglishMediumClassOneToFiveSubjects =
    category === "English Medium" &&
    guardianEnglishMediumClassOneToFiveLevels.includes(classCourse as typeof guardianEnglishMediumClassOneToFiveLevels[number]);
  const usesEnglishMediumClassSixToSevenSubjects =
    category === "English Medium" &&
    guardianEnglishMediumClassSixToSevenLevels.includes(classCourse as typeof guardianEnglishMediumClassSixToSevenLevels[number]);
  const usesEnglishMediumStandardEightToNineAndOLevelSubjects =
    category === "English Medium" &&
    guardianEnglishMediumStandardEightToNineAndOLevelLevels.includes(classCourse as typeof guardianEnglishMediumStandardEightToNineAndOLevelLevels[number]);
  const usesEnglishMediumALevelSubjects =
    category === "English Medium" &&
    guardianEnglishMediumALevels.includes(classCourse as typeof guardianEnglishMediumALevels[number]);
  const usesEarlyYearsSubjects =
    (category === "Bangla Medium" || category === "English Version") &&
    guardianEarlyYearsLevels.includes(classCourse as typeof guardianEarlyYearsLevels[number]);

  if (usesBanglaMediumClassOneToEightSubjects) return guardianBanglaMediumClassOneToEightSubjects;
  if (usesEnglishVersionClassOneToEightSubjects) return guardianEnglishVersionClassOneToEightSubjects;
  if (usesEnglishVersionClassNineToTenSubjects) return guardianEnglishVersionClassNineToTenSubjects;
  if (usesBanglaMediumClassNineToTenSubjects) return guardianBanglaMediumClassNineToTenSubjects;
  if (usesBanglaMediumHscSubjects) return guardianBanglaMediumHscSubjects;
  if (usesEnglishVersionHscSubjects) return guardianEnglishVersionHscSubjects;
  if (usesMadrasaPlayToClassEightSubjects) return guardianMadrasaPlayToClassEightSubjects;
  if (usesMadrasaClassNineToTenSubjects) return guardianMadrasaClassNineToTenSubjects;
  if (usesMadrasaAlimSubjects) return guardianMadrasaAlimSubjects;
  if (usesSchoolAdmissionSubjects) return guardianSchoolAdmissionSubjects;
  if (usesPublicUniversityAdmissionSubjects) return guardianPublicUniversityAdmissionSubjects;
  if (usesPrivateUniversityAdmissionSubjects) return guardianPrivateUniversityAdmissionSubjects;
  if (usesEngineeringUniversityAdmissionSubjects) return guardianEngineeringUniversityAdmissionSubjects;
  if (usesMedicalCollegeAdmissionSubjects) return guardianMedicalCollegeAdmissionSubjects;
  if (usesIbaAdmissionSubjects) return guardianIbaAdmissionSubjects;
  if (usesEnglishMediumEarlyYearsSubjects) return guardianEnglishMediumEarlyYearsSubjects;
  if (usesEnglishMediumClassOneToFiveSubjects) return guardianEnglishMediumClassOneToFiveSubjects;
  if (usesEnglishMediumClassSixToSevenSubjects) return guardianEnglishMediumClassSixToSevenSubjects;
  if (usesEnglishMediumStandardEightToNineAndOLevelSubjects) return guardianEnglishMediumStandardEightToNineAndOLevelSubjects;
  if (usesEnglishMediumALevelSubjects) return guardianEnglishMediumALevelSubjects;
  return usesEarlyYearsSubjects ? guardianEarlyYearsSubjects : guardianDefaultSubjects;
}

export function getGuardianSelectedSubjectsForLearningNeed(selectedSubjects: string[], category: string, classCourse: string) {
  const availableSubjects = new Set(getGuardianSubjectsForLearningNeed(category, classCourse));
  return selectedSubjects.filter((subject) => availableSubjects.has(subject));
}
