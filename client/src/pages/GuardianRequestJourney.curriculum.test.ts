import {
  getGuardianCurriculumTypeForCategoryChange,
  getGuardianCurriculumTypesForCategory,
  getGuardianLevelsForCurriculum,
  getGuardianSelectedSubjectsForLearningNeed,
  getGuardianSubjectsForLearningNeed,
  guardianCurriculumCategories,
} from "./GuardianRequestJourney";
import { describe, expect, it } from "vitest";

describe("Guardian Curriculum Category options", () => {
  it("uses the approved category inventory once each", () => {
    expect(guardianCurriculumCategories).toEqual([
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
    ]);
    expect(new Set(guardianCurriculumCategories).size).toBe(
      guardianCurriculumCategories.length,
    );
  });

  it("returns the approved Class/Level options for the mapped curricula", () => {
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
    ];

    expect(getGuardianLevelsForCurriculum("Bangla Medium")).toEqual(banglaAndEnglishVersionLevels);
    expect(getGuardianLevelsForCurriculum("English Version")).toEqual(banglaAndEnglishVersionLevels);
    expect(getGuardianLevelsForCurriculum("English Medium")).toEqual([
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
    ]);
    expect(getGuardianLevelsForCurriculum("University Help")).toEqual([
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
    ]);
    expect(getGuardianLevelsForCurriculum("Madrasa Medium")).toEqual([
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
    ]);
    expect(getGuardianLevelsForCurriculum("Religious Studies")).toEqual([
      "Islamic Studies",
      "Hinduism Studies",
      "Buddhism Studies",
      "Christianity Studies",
    ]);
    expect(getGuardianLevelsForCurriculum("Language Learning")).toEqual([
      "Spoken English",
      "IELTS Preparation",
      "French",
      "German",
      "Japanese",
      "Korean",
      "Arabic",
    ]);
    expect(getGuardianLevelsForCurriculum("Admission Test")).toEqual([
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
    ]);
    expect(getGuardianLevelsForCurriculum("Arts")).toEqual([
      "Drawing & Painting",
      "Handwriting",
      "Music",
      "Instrumental Music",
      "Dance",
      "Crafting",
      "Recitation",
    ]);
    expect(getGuardianLevelsForCurriculum("Test Preparation")).toEqual([
      "BCS",
      "Bank Job",
      "Government Job",
      "GRE",
      "GMAT",
      "SAT",
      "TOEFL",
    ]);
    expect(
      getGuardianLevelsForCurriculum("Professional Skill Development")
    ).toEqual([
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
    ]);
    expect(getGuardianLevelsForCurriculum("Special Skill Development")).toEqual([
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
    ]);
    expect(getGuardianLevelsForCurriculum("Special Child Education")).toEqual([
      "Basic Education",
      "Arts",
      "Religious Studies",
      "Special Skill Development",
    ]);
  });

  it("offers exactly one English Medium-only Curriculum Type selection", () => {
    expect(getGuardianCurriculumTypesForCategory("English Medium")).toEqual([
      "British",
      "Cambridge",
      "Ed-excel",
    ]);
    expect(getGuardianCurriculumTypesForCategory("Bangla Medium")).toEqual([]);
    expect(new Set(getGuardianCurriculumTypesForCategory("English Medium")).size).toBe(3);
  });

  it("clears Curriculum Type when a Guardian changes away from English Medium", () => {
    expect(getGuardianCurriculumTypeForCategoryChange("Cambridge", "English Medium")).toBe("Cambridge");
    expect(getGuardianCurriculumTypeForCategoryChange("Cambridge", "Bangla Medium")).toBe("");
  });

  it("uses the approved early-years subjects for Bangla Medium and English Version", () => {
    const earlyYearsSubjects = [
      "All",
      "English",
      "Bangla",
      "General Maths",
      "Handwriting",
      "Drawing",
      "Arts",
      "Religious Studies",
    ];

    for (const category of ["Bangla Medium", "English Version"]) {
      for (const classCourse of ["Pre-Schooling", "Play", "Nursery", "KG"]) {
        expect(getGuardianSubjectsForLearningNeed(category, classCourse)).toEqual(earlyYearsSubjects);
      }
    }

    expect(getGuardianSubjectsForLearningNeed("English Version", "Class 9")).not.toEqual(earlyYearsSubjects);
    expect(getGuardianSubjectsForLearningNeed("English Version", "Class 9")).not.toContain("All");
  });

  it("uses the approved English Medium early-years subjects once each", () => {
    const englishMediumEarlyYearsSubjects = [
      "All",
      "English",
      "Bangla",
      "General Maths",
      "Handwriting",
      "Drawing",
      "Arts",
      "Religious Studies",
      "Others",
    ];

    for (const classCourse of ["Pre-Schooling", "Play", "Nursery", "KG"]) {
      expect(getGuardianSubjectsForLearningNeed("English Medium", classCourse)).toEqual(englishMediumEarlyYearsSubjects);
    }

    expect(new Set(getGuardianSubjectsForLearningNeed("English Medium", "KG")).size).toBe(9);
    expect(getGuardianSubjectsForLearningNeed("English Medium", "Standard 1")).not.toEqual(englishMediumEarlyYearsSubjects);
    expect(getGuardianSubjectsForLearningNeed("Bangla Medium", "KG")).not.toContain("Others");
  });

  it("uses the approved English Medium Class 1–5 subjects once each", () => {
    const englishMediumClassOneToFiveSubjects = [
      "All",
      "Maths",
      "English Literature",
      "English",
      "Bangla",
      "Science",
      "Islamic Studies",
      "History",
      "ICT",
      "Social Science",
      "Bangladesh & Global Studies",
      "Geography",
      "Handwriting",
      "Drawing",
      "Arts",
      "Others",
    ];

    for (const classCourse of ["Standard 1", "Standard 2", "Standard 3", "Standard 4", "Standard 5"]) {
      expect(getGuardianSubjectsForLearningNeed("English Medium", classCourse)).toEqual(englishMediumClassOneToFiveSubjects);
    }

    expect(new Set(getGuardianSubjectsForLearningNeed("English Medium", "Standard 1")).size).toBe(16);
    expect(getGuardianSubjectsForLearningNeed("English Medium", "KG")).not.toEqual(englishMediumClassOneToFiveSubjects);
    expect(getGuardianSubjectsForLearningNeed("English Version", "Class 1")).toContain("General Knowledge");
  });

  it("uses the approved English Medium Standard 6–7 subjects while preserving Standard 5", () => {
    const englishMediumStandardSixToSevenSubjects = [
      "All",
      "Physics",
      "Chemistry",
      "Biology",
      "Maths",
      "English Literature",
      "English",
      "Bangla",
      "Science",
      "Business Studies",
      "Islamic Studies",
      "History",
      "ICT",
      "Social Science",
      "Bangladesh & Global Studies",
      "Economics",
      "Geography",
      "Handwriting",
      "Drawing",
      "Arts",
      "Others",
    ];

    for (const classCourse of ["Standard 6", "Standard 7"]) {
      expect(getGuardianSubjectsForLearningNeed("English Medium", classCourse)).toEqual(
        englishMediumStandardSixToSevenSubjects,
      );
    }

    expect(
      new Set(getGuardianSubjectsForLearningNeed("English Medium", "Standard 6")).size,
    ).toBe(englishMediumStandardSixToSevenSubjects.length);
    expect(getGuardianSubjectsForLearningNeed("English Medium", "Standard 5")).not.toContain(
      "Business Studies",
    );
    expect(getGuardianSubjectsForLearningNeed("English Medium", "Standard 5")).toContain(
      "Maths",
    );
  });

  it("uses the approved English Medium Standard 8–9 and O Level subjects once each", () => {
    const englishMediumStandardEightToOLevelSubjects = [
      "All",
      "Physics",
      "Chemistry",
      "Maths",
      "Maths B",
      "Maths D",
      "Additional Maths",
      "Biology",
      "English Literature",
      "English Language",
      "Bangla",
      "ICT",
      "Accounting",
      "Business Studies",
      "Economics",
      "Bangladesh Studies",
      "Commerce",
      "Islamic Studies",
      "Law",
      "Handwriting",
      "Drawing",
      "Arts",
      "Others",
    ];

    for (const classCourse of ["Standard 8", "Standard 9", "O Level"]) {
      expect(getGuardianSubjectsForLearningNeed("English Medium", classCourse)).toEqual(
        englishMediumStandardEightToOLevelSubjects,
      );
    }

    expect(
      new Set(getGuardianSubjectsForLearningNeed("English Medium", "O Level")).size,
    ).toBe(englishMediumStandardEightToOLevelSubjects.length);
    expect(getGuardianSubjectsForLearningNeed("English Medium", "Standard 7")).toContain(
      "Social Science",
    );
    expect(getGuardianSubjectsForLearningNeed("English Medium", "A Level (AS)")).not.toEqual(
      englishMediumStandardEightToOLevelSubjects,
    );
  });

  it("uses the approved English Medium A Level (AS/A2) subjects once each", () => {
    const englishMediumALevelSubjects = [
      "Chemistry",
      "Maths",
      "Maths B",
      "Maths D",
      "Additional Maths",
      "Biology",
      "Physics",
      "Environmental Systems and Societies",
      "Psychology",
      "English",
      "ICT",
      "Geography",
      "Economics",
      "Sociology",
      "Law",
      "Business Studies",
      "Commerce",
      "English Literature",
      "Accounting",
      "Bangla",
      "Politics",
      "Computer Science",
      "Finance",
      "Statistics",
      "Handwriting",
      "Drawing",
      "Arts",
      "Others",
    ];

    for (const classCourse of ["A Level (AS)", "A Level (A2)"]) {
      expect(getGuardianSubjectsForLearningNeed("English Medium", classCourse)).toEqual(
        englishMediumALevelSubjects,
      );
    }

    expect(
      new Set(getGuardianSubjectsForLearningNeed("English Medium", "A Level (AS)")).size,
    ).toBe(englishMediumALevelSubjects.length);
    expect(getGuardianSubjectsForLearningNeed("English Medium", "O Level")).toContain(
      "Bangladesh Studies",
    );
    expect(getGuardianSubjectsForLearningNeed("English Medium", "Standard 7")).toContain(
      "Social Science",
    );
  });

  it("uses the approved Bangla Medium Class 1–8 subjects once each", () => {
    const banglaMediumClassOneToEightSubjects = [
      "All",
      "English",
      "Bangla",
      "BGS",
      "General Maths",
      "General Science",
      "ICT",
      "Religious Studies",
      "Hinduism Religious Studies",
      "Buddhism Religious Studies",
      "Handwriting",
      "Drawing",
      "Arts",
      "Others",
    ];

    for (const classCourse of ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"]) {
      expect(getGuardianSubjectsForLearningNeed("Bangla Medium", classCourse)).toEqual(banglaMediumClassOneToEightSubjects);
    }

    expect(new Set(getGuardianSubjectsForLearningNeed("Bangla Medium", "Class 1")).size).toBe(14);
    expect(getGuardianSubjectsForLearningNeed("English Version", "Class 1")).toContain("General Knowledge");
    expect(getGuardianSubjectsForLearningNeed("English Version", "HSC- 1st Year")).toContain("Higher Maths");
  });

  it("uses the approved English Version Class 1–8 subjects once each", () => {
    const englishVersionClassOneToEightSubjects = [
      "All",
      "English",
      "Bangla",
      "BGS",
      "General Maths",
      "General Science",
      "Social Science",
      "General Knowledge",
      "ICT",
      "History",
      "Geography",
      "Home Economics",
      "Agricultural Education",
      "Religious Studies",
      "Hinduism Religious Studies",
      "Buddhism Religious Studies",
      "Handwriting",
      "Drawing",
      "Arts",
      "Others",
    ];

    for (const classCourse of ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"]) {
      expect(getGuardianSubjectsForLearningNeed("English Version", classCourse)).toEqual(englishVersionClassOneToEightSubjects);
    }

    expect(new Set(getGuardianSubjectsForLearningNeed("English Version", "Class 1")).size).toBe(20);
    expect(getGuardianSubjectsForLearningNeed("Bangla Medium", "Class 1")).toContain("Buddhism Religious Studies");
    expect(getGuardianSubjectsForLearningNeed("English Version", "Class 9")).toContain("Computer Studies");
  });

  it("uses the approved English Version Class 9–10 subjects once each", () => {
    const englishVersionClassNineToTenSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "General Maths",
      "Higher Maths",
      "Social Science",
      "Bangla",
      "English",
      "General Science",
      "Computer Studies",
      "BGS",
      "Religious Studies",
      "Accounting",
      "Finance & Banking",
      "Management",
      "Business Entrepreneurship",
      "Economics",
      "Civics",
      "Home Economics",
      "Agricultural Education",
      "History",
      "Geography",
      "Psychology",
      "Physical Education",
      "Health & Sports",
      "Handwriting",
      "Drawing",
      "Arts",
      "Others",
    ];

    for (const classCourse of ["Class 9", "Class 10"]) {
      expect(getGuardianSubjectsForLearningNeed("English Version", classCourse)).toEqual(englishVersionClassNineToTenSubjects);
    }

    expect(new Set(getGuardianSubjectsForLearningNeed("English Version", "Class 9")).size).toBe(29);
    expect(getGuardianSubjectsForLearningNeed("Bangla Medium", "Class 9")).toContain("ICT");
    expect(getGuardianSubjectsForLearningNeed("English Version", "HSC- 1st Year")).toContain("Higher Maths");
  });

  it("uses the approved Bangla Medium Class 9–10 subjects once each", () => {
    const banglaMediumClassNineToTenSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "General Maths",
      "Higher Maths",
      "Social Science",
      "Bangla",
      "English",
      "General Science",
      "ICT",
      "BGS",
      "Religious Studies",
      "Accounting",
      "Finance & Banking",
      "Management",
      "Business Entrepreneurship",
      "Economics",
      "Civics",
      "Home Economics",
      "Agricultural Education",
      "History",
      "Geography",
      "Psychology",
      "Physical Education",
      "Health & Sports",
      "Handwriting",
      "Drawing",
      "Arts",
      "Others",
    ];

    for (const classCourse of ["Class 9", "Class 10"]) {
      expect(getGuardianSubjectsForLearningNeed("Bangla Medium", classCourse)).toEqual(banglaMediumClassNineToTenSubjects);
    }

    expect(new Set(getGuardianSubjectsForLearningNeed("Bangla Medium", "Class 9")).size).toBe(29);
    expect(getGuardianSubjectsForLearningNeed("Bangla Medium", "Class 8")).toContain("Hinduism Religious Studies");
    expect(getGuardianSubjectsForLearningNeed("English Version", "HSC- 1st Year")).toContain("Higher Maths");
  });

  it("uses the approved Bangla Medium HSC subjects once each", () => {
    const banglaMediumHscSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "Higher Maths",
      "ICT",
      "Accounting",
      "Finance",
      "Management",
      "Production Management & Marketing",
      "Statistics",
      "English",
      "Bangla",
      "Religious Studies",
      "Political Science",
      "History",
      "Islamic History and Culture",
      "Social Work",
      "Logic",
      "Agricultural Education",
      "Economics",
      "Sociology",
      "Geography",
      "Commercial Geography",
      "Psychology",
      "Civics",
      "All",
      "Others",
    ];

    for (const classCourse of ["HSC- 1st Year", "HSC- 2nd Year"]) {
      expect(getGuardianSubjectsForLearningNeed("Bangla Medium", classCourse)).toEqual(banglaMediumHscSubjects);
    }

    expect(new Set(getGuardianSubjectsForLearningNeed("Bangla Medium", "HSC- 1st Year")).size).toBe(27);
    expect(getGuardianSubjectsForLearningNeed("Bangla Medium", "Class 10")).toContain("Business Entrepreneurship");
    expect(getGuardianSubjectsForLearningNeed("English Version", "HSC- 2nd Year")).toContain("Higher Maths");
  });

  it("uses the approved English Version HSC subjects once each", () => {
    const englishVersionHscSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "Higher Maths",
      "ICT",
      "Accounting",
      "Finance",
      "Management",
      "Production Management & Marketing",
      "Statistics",
      "English",
      "Bangla",
      "Religious Studies",
      "Political Science",
      "History",
      "Islamic History and Culture",
      "Social Work",
      "Logic",
      "Agricultural Education",
      "Economics",
      "Sociology",
      "Geography",
      "Commercial Geography",
      "Psychology",
      "Civics",
      "All",
      "Others",
    ];

    for (const classCourse of ["HSC- 1st Year", "HSC- 2nd Year"]) {
      expect(getGuardianSubjectsForLearningNeed("English Version", classCourse)).toEqual(englishVersionHscSubjects);
    }

    expect(new Set(getGuardianSubjectsForLearningNeed("English Version", "HSC- 1st Year")).size).toBe(27);
    expect(getGuardianSubjectsForLearningNeed("English Version", "Class 10")).toContain("Computer Studies");
    expect(getGuardianSubjectsForLearningNeed("Bangla Medium", "HSC- 2nd Year")).toContain("Production Management & Marketing");
  });

  it("uses the approved Madrasa Medium subjects for every mapped class band", () => {
    const madrasaPlayToClassEightSubjects = [
      "All",
      "English",
      "Bangla",
      "BGS",
      "General Maths",
      "General Science",
      "ICT",
      "Quran Majid and Tajweed",
      "Akayeed and Fiqh",
      "Arabic",
      "Agriculture Education",
      "Home Economics",
      "Work and Life Oriented Education",
      "Hadith Sharif",
      "Physical Education",
      "Health & Sport",
      "Handwriting",
      "Drawing",
      "Arts",
      "Others",
    ];
    const madrasaClassNineToTenSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "Higher Maths",
      "ICT",
      "Home Economics",
      "Civics",
      "Arabic",
      "Akayeed and Fiqh",
      "Quran Majid and Tajweed",
      "Peace and Conflict Studies",
      "Career Studies",
      "All",
      "Physical Education",
      "Health & Sports",
      "Islamic studies",
      "Bangladesh and Global Studies",
      "Agriculture Education",
      "General Maths",
      "English",
      "Bangla",
    ];
    const madrasaAlimSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "Higher Maths",
      "ICT",
      "Civics",
      "Farsi",
      "Urdu",
      "Economics",
      "English",
      "Quran Majid and Tajweed",
      "Hadith Sharif",
      "Al Fiqh",
      "Arabic",
      "Islamic History",
      "Balagat and Mantik",
      "Bangla",
    ];

    for (const classCourse of ["Play", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"]) {
      expect(getGuardianSubjectsForLearningNeed("Madrasa Medium", classCourse)).toEqual(
        madrasaPlayToClassEightSubjects,
      );
    }
    for (const classCourse of ["Class 9", "Class 10"]) {
      expect(getGuardianSubjectsForLearningNeed("Madrasa Medium", classCourse)).toEqual(
        madrasaClassNineToTenSubjects,
      );
    }
    for (const classCourse of ["Alim- 1st Year", "Alim- 2nd Year"]) {
      expect(getGuardianSubjectsForLearningNeed("Madrasa Medium", classCourse)).toEqual(
        madrasaAlimSubjects,
      );
    }

    expect(new Set(madrasaPlayToClassEightSubjects).size).toBe(
      madrasaPlayToClassEightSubjects.length,
    );
    expect(new Set(madrasaClassNineToTenSubjects).size).toBe(
      madrasaClassNineToTenSubjects.length,
    );
    expect(new Set(madrasaAlimSubjects).size).toBe(madrasaAlimSubjects.length);
    expect(getGuardianSubjectsForLearningNeed("Madrasa Medium", "Class 8")).toContain(
      "Work and Life Oriented Education",
    );
    expect(getGuardianSubjectsForLearningNeed("Madrasa Medium", "Class 9")).not.toContain(
      "Others",
    );
    expect(getGuardianSubjectsForLearningNeed("Bangla Medium", "Class 1")).toContain(
      "Buddhism Religious Studies",
    );
  });

  it("uses the approved Admission Test subjects for every mapped admission level", () => {
    const schoolAdmissionSubjects = [
      "All",
      "English",
      "Bangla",
      "BGS",
      "General Maths",
      "General Science",
      "General Knowledge",
      "ICT",
      "Others",
    ];
    const publicUniversityAdmissionSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "Higher Maths",
      "ICT",
      "General Knowledge",
      "Bangla",
      "English",
      "Management",
      "Business Principles",
      "Marketing",
      "Business Entrepreneurship",
      "Economics",
      "Civics",
      "Analytical Skills",
      "Finance & Banking",
      "Accounting",
      "All",
    ];
    const privateUniversityAdmissionSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "Maths",
      "English",
      "Bangla",
      "General Knowledge",
      "Accounting",
      "Management",
      "Analytical Skill",
    ];
    const engineeringUniversityAdmissionSubjects = [
      "Physics",
      "Chemistry",
      "Higher Maths",
      "ICT",
      "English",
      "Bangla",
      "General Knowledge",
    ];
    const medicalCollegeAdmissionSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "ICT",
      "English",
      "Bangla",
      "General Knowledge",
      "All",
    ];
    const ibaAdmissionSubjects = [
      "Accounting",
      "Finance",
      "Management",
      "Production Management & Marketing",
      "Statistics",
      "English",
      "Bangla",
      "All",
    ];

    expect(getGuardianSubjectsForLearningNeed("Admission Test", "School Admission Test")).toEqual(
      schoolAdmissionSubjects,
    );
    expect(getGuardianSubjectsForLearningNeed("Admission Test", "Public University Admission Test")).toEqual(
      publicUniversityAdmissionSubjects,
    );
    expect(getGuardianSubjectsForLearningNeed("Admission Test", "Private University Admission Test")).toEqual(
      privateUniversityAdmissionSubjects,
    );
    expect(getGuardianSubjectsForLearningNeed("Admission Test", "Engineering University Admission Test")).toEqual(
      engineeringUniversityAdmissionSubjects,
    );
    expect(getGuardianSubjectsForLearningNeed("Admission Test", "Medical College Admission Test")).toEqual(
      medicalCollegeAdmissionSubjects,
    );
    expect(getGuardianSubjectsForLearningNeed("Admission Test", "IBA Admission")).toEqual(
      ibaAdmissionSubjects,
    );

    for (const subjectList of [
      schoolAdmissionSubjects,
      publicUniversityAdmissionSubjects,
      privateUniversityAdmissionSubjects,
      engineeringUniversityAdmissionSubjects,
      medicalCollegeAdmissionSubjects,
      ibaAdmissionSubjects,
    ]) {
      expect(new Set(subjectList).size).toBe(subjectList.length);
    }
    expect(getGuardianSubjectsForLearningNeed("Admission Test", "School Admission Test")).toContain(
      "General Knowledge",
    );
    expect(getGuardianSubjectsForLearningNeed("Admission Test", "Public University Admission Test")).toContain(
      "Business Principles",
    );
    expect(getGuardianSubjectsForLearningNeed("Madrasa Medium", "Class 9")).toContain(
      "Akayeed and Fiqh",
    );
  });

  it("keeps selected subjects compatible when the learning need changes", () => {
    expect(
      getGuardianSelectedSubjectsForLearningNeed(
        ["All", "English", "Mathematics"],
        "Bangla Medium",
        "Nursery",
      ),
    ).toEqual(["All", "English"]);
    expect(
      getGuardianSelectedSubjectsForLearningNeed(
        ["All", "English", "Mathematics"],
        "English Medium",
        "KG",
      ),
    ).toEqual(["All", "English"]);
  });
});
