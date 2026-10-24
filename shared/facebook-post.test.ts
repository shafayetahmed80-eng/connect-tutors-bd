import { describe, expect, it } from "vitest";
import {
  ITEM_DIVIDER,
  buildDynamicBulkHeadline,
  buildEnglishBulkFacebookPostText,
  buildEnglishJobDetailsInline,
  buildFacebookPostText,
  formatCompactClass,
  formatJobAreaItem,
  formatJobClassLine,
  formatJobEmojiLine,
  formatJobKeyPriority,
  formatJobMobileCard,
  formatJobStandardCard,
} from "./facebook-post";

describe("buildFacebookPostText", () => {
  it("generates an English Standard Card single post with hashtag location and apply link", () => {
    const text = buildFacebookPostText({
      id: 1024,
      jobId: "CT-1024",
      classCourse: "Class 9",
      category: "English Medium",
      curriculumType: "Edexcel",
      subjects: ["Math", "Physics", "Chemistry"],
      tuitionType: "home",
      tuitionLocationLabel: "Dhanmondi, Dhaka",
      addressDetails: "Road 27",
      budgetAmount: 8000,
      daysPerWeek: 3,
      tutoringTime: "6:00 PM",
      studentGender: "male",
      studentCount: 1,
      preferredGender: "female",
      instituteName: "DU / BUET preferred",
      notes: "Math expert required",
    });

    expect(text).toContain("🔴 NEW TUITION OFFER — CONNECT TUTORS 🔴");
    expect(text).toContain("📌 Job ID: CT-1024 (Female Tutor)");
    expect(text).toContain("📍 #DHANMONDI_DHAKA (Road 27)");
    expect(text).toContain("🔹 Standard: 9 EM");
    expect(text).toContain("📚 Subjects: Math, Physics, Chemistry  |  🗓️ 3 Days, Time: 6:00 PM  |  💰 Salary 8,000 BDT");
    expect(text).toContain("👨‍🎓 Student: Male Student");
    expect(text).toContain("🏫 School: DU / BUET preferred");
    expect(text).toContain("\n📋 Notes: Math expert required");
    expect(text).toContain(ITEM_DIVIDER);
    expect(text).toContain("🚀 How to Apply:");
    expect(text).toContain("https://connecttutorsbd.com/job-board?job=CT-1024");
    expect(text).toContain("Connect Tutors — The Most Trusted Digital Tuition Platform");
    expect(text).not.toContain("সম্পূর্ণ ফ্রি");
    expect(text).not.toContain("Zero Media Fees");
  });

  it("handles missing/optional fields gracefully without undefined or null", () => {
    const text = buildFacebookPostText({
      id: 55,
      jobId: "CT-0055",
      classCourse: "Class 5",
      subjects: null,
      budgetAmount: 0,
      daysPerWeek: 0,
    });

    expect(text).toContain("Job ID: CT-0055");
    expect(text).toContain("🔹 Class: 5");
    expect(text).toContain("All Subjects");
    expect(text).toContain("Salary Negotiable");
    expect(text).toContain("Flexible Days");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
  });

  it("handles online tuition location correctly", () => {
    const text = buildFacebookPostText({
      id: 88,
      tuitionType: "online",
      tuitionLocationLabel: "Chittagong",
      addressDetails: "Should be omitted for online",
    });

    expect(text).toContain("🌐 #ONLINE_TUITION");
    expect(text).not.toContain("Should be omitted for online");
  });
});

describe("buildEnglishJobDetailsInline", () => {
  it("formats single tuition details with tutor pref first and salary last", () => {
    const line = buildEnglishJobDetailsInline({
      id: 1042,
      jobId: "CT-1042",
      classCourse: "Class 9",
      curriculumType: "English Medium",
      subjects: ["Math", "Physics"],
      tuitionType: "home",
      tuitionLocationLabel: "Dhanmondi, Dhaka",
      addressDetails: "Road 27",
      budgetAmount: 8000,
      daysPerWeek: 3,
      tutoringTime: "6:00 PM",
      preferredGender: "male",
      instituteName: "BUET/DU",
      studentCount: 1,
      studentGender: "male",
      notes: "Experience preferred",
    });

    expect(line).toBe(
      "Job ID: CT-1042  |  🎓 Male Tutor  |  🔹 Standard: 9 EM  |  Math, Physics  |  📍 Dhanmondi, Dhaka (Road 27)  |  🗓️ 3 Days, Time: 6:00 PM  |  💰 Salary 8,000 BDT  |  👨‍🎓 Student: Male Student  |  🏫 School: BUET/DU  |  Notes: Experience preferred",
    );
  });

  it("includes apply link if includeApplyUrl option is explicitly true", () => {
    const line = buildEnglishJobDetailsInline(
      {
        id: 1042,
        jobId: "CT-1042",
        classCourse: "Class 9",
      },
      {
        origin: "https://connecttutorsbd.com",
        includeApplyUrl: true,
      },
    );

    expect(line).toContain("Job ID: CT-1042");
    expect(line).toContain("Apply: https://connecttutorsbd.com/job-board?job=CT-1042");
  });

  it("handles online and missing fields gracefully in English inline format", () => {
    const line = buildEnglishJobDetailsInline({
      id: 99,
      jobId: "CT-0099",
      classCourse: "HSC 1st Year",
      tuitionType: "online",
      subjects: null,
      budgetAmount: 0,
      daysPerWeek: 0,
    });

    expect(line).toContain("Job ID: CT-0099");
    expect(line).toContain("HSC 1st Year");
    expect(line).toContain("All Subjects");
    expect(line).toContain("Online");
    expect(line).toContain("Salary Negotiable");
    expect(line).toContain("Flexible Days");
    expect(line).toContain("Any Tutor");
    expect(line).not.toContain("undefined");
    expect(line).not.toContain("null");
  });
});

describe("buildEnglishBulkFacebookPostText formats", () => {
  const sampleJobs = [
    {
      id: 1,
      jobId: "CT-1001",
      classCourse: "Class 9",
      curriculumType: "English Medium",
      subjects: ["Math"],
      tuitionLocationLabel: "Gulshan, Dhaka",
      budgetAmount: 10000,
      daysPerWeek: 3,
      preferredGender: "female" as const,
    },
    {
      id: 2,
      jobId: "CT-1002",
      classCourse: "Class 6",
      category: "Bangla Medium",
      subjects: ["All Subjects"],
      tuitionLocationLabel: "Uttara, Dhaka",
      budgetAmount: 6000,
      daysPerWeek: 4,
      preferredGender: "male" as const,
    },
  ];

  it("Format 1 (emoji-line / Standard Card): formats with hashtag location in Line 2 and multiline card", () => {
    const post = buildEnglishBulkFacebookPostText(
      [
        {
          id: 1,
          jobId: "6806",
          classCourse: "Standard 1",
          curriculumType: "British",
          subjects: ["All"],
          tuitionLocationLabel: "Mohammadpur, Dhaka",
          addressDetails: "Housing Society",
          budgetAmount: 7000,
          daysPerWeek: 5,
          preferredGender: "female" as const,
          notes: "O&A Levels Background Tutors Are encouraged to apply",
        },
      ],
      {
        format: "emoji-line",
      },
    );

    expect(post).toContain("🔴 LIVE TUITION JOBS — CONNECT TUTORS 🔴");
    expect(post).toContain("📌 Job ID: 6806 (Female Tutor)");
    expect(post).toContain("📍 #MOHAMMADPUR_DHAKA (Housing Society)");
    expect(post).toContain("🔹 Standard: 1 EM");
    expect(post).toContain("📚 Subjects: All  |  🗓️ 5 Days  |  💰 Salary 7,000 BDT");
    expect(post).toContain("\n📋 Notes: O&A Levels Background Tutors Are encouraged to apply");
    expect(post).toContain("──────────────────────────");
  });

  it("Format 2 (mobile-card / Category Grouped): groups tuitions by category header with underline", () => {
    const post = buildEnglishBulkFacebookPostText(sampleJobs, {
      format: "mobile-card",
    });

    expect(post).toContain("📚 ENGLISH MEDIUM\n────────────────");
    expect(post).toContain("📌 Job ID: CT-1001 (Female Tutor)\n📍 #GULSHAN_DHAKA\n🔹 Standard: 9 EM\n📚 Subjects: Math  |  🗓️ 3 Days  |  💰 Salary 10,000 BDT");
    expect(post).toContain("📚 BANGLA MEDIUM\n───────────────");
    expect(post).toContain("📌 Job ID: CT-1002 (Male Tutor)\n📍 #UTTARA_DHAKA\n🔹 Class: 6 BM\n📚 Subjects: All Subjects  |  🗓️ 4 Days  |  💰 Salary 6,000 BDT");
    expect(post).toContain(ITEM_DIVIDER);
  });

  it("Format 3 (key-priority / Gender Grouped): groups by tutor gender with icons and compact 1-line cards", () => {
    const post = buildEnglishBulkFacebookPostText(
      [
        ...sampleJobs,
        {
          id: 3,
          jobId: "CT-1003",
          classCourse: "Standard 3",
          curriculumType: "Cambridge",
          subjects: ["English", "Math"],
          tuitionLocationLabel: "Mohammadpur, Dhaka",
          budgetAmount: 8000,
          daysPerWeek: 5,
        },
      ],
      {
        format: "key-priority",
      },
    );

    expect(post).toContain("👨‍🏫 Male Tuition Jobs\n──────────────────────────\n📌 Job ID: CT-1002, 📍 #UTTARA 🔹 Class: 6 BM, (All Subjects), 4D, 6,000 BDT");
    expect(post).toContain("👩‍🏫 Female Tuition Jobs\n──────────────────────────\n📌 Job ID: CT-1001, 📍 #GULSHAN 🔹 Standard: 9 EM, (Math), 3D, 10,000 BDT");
    expect(post).toContain("👥 Male/Female Tuition Jobs\n──────────────────────────\n📌 Job ID: CT-1003, 📍 #MOHAMMADPUR 🔹 Standard: 3 EM, (English + Math), 5D, 8,000 BDT");
    expect(post).toContain(ITEM_DIVIDER);
  });

  it("Format 4 (area-grouped): groups tuitions by hashtag area headers with matching underline length and multiline cards", () => {
    const post = buildEnglishBulkFacebookPostText(
      [
        ...sampleJobs,
        {
          id: 3,
          jobId: "6806",
          classCourse: "Standard 1",
          curriculumType: "British",
          subjects: ["All"],
          tuitionLocationLabel: "Mohammadpur, Dhaka",
          addressDetails: "Housing Society",
          budgetAmount: 7000,
          daysPerWeek: 5,
          preferredGender: "female" as const,
          notes: "O&A Levels Background Tutors Are encouraged to apply",
        },
      ],
      {
        format: "area-grouped",
      },
    );

    // Dynamic underline matching location hashtag length:
    // "📍 #MOHAMMADPUR_DHAKA" has 20 unicode code points -> 20 dashes
    expect(post).toContain("📍 #MOHAMMADPUR_DHAKA\n────────────────────\n\n📌 Job ID: 6806 (Female Tutor) • Housing Society");
    expect(post).toContain("🔹 Standard: 1 EM");
    expect(post).toContain("📚 Subjects: All  |  🗓️ 5 Days  |  💰 Salary 7,000 BDT");
    expect(post).toContain("\n📋 Notes: O&A Levels Background Tutors Are encouraged to apply");
    expect(post).toContain("──────────────────────────");

    // Gulshan hashtag has 16 unicode code points -> 16 dashes
    expect(post).toContain("📍 #GULSHAN_DHAKA\n────────────────\n\n📌 Job ID: CT-1001 (Female Tutor)");
    expect(post).toContain("🔹 Standard: 9 EM");
    expect(post).toContain("📚 Subjects: Math  |  🗓️ 3 Days  |  💰 Salary 10,000 BDT");

    // Divider is 26 characters (shortened to prevent 2-line wrap on mobile)
    expect(ITEM_DIVIDER).toBe("──────────────────────────");
    expect(ITEM_DIVIDER.length).toBe(26);
  });

  it("separates every two tuitions with a blank line after the divider across bulk formats", () => {
    const formats = ["emoji-line", "mobile-card", "area-grouped"] as const;
    for (const format of formats) {
      const post = buildEnglishBulkFacebookPostText(sampleJobs, { format });
      expect(post).toContain(`${ITEM_DIVIDER}\n\n`);
    }

    // Format 3 (Gender Grouped) uses blank lines between compact items without repeating divider
    const genderPost = buildEnglishBulkFacebookPostText(sampleJobs, { format: "key-priority" });
    expect(genderPost).toContain("👨‍🏫 Male Tuition Jobs\n──────────────────────────");
    expect(genderPost).toContain("👩‍🏫 Female Tuition Jobs\n──────────────────────────");
  });

  it("returns a clean message if list is empty", () => {
    const post = buildEnglishBulkFacebookPostText([]);
    expect(post).toBe("No live tuitions match the current criteria.");
  });

  it("supports dynamic custom header and footer with placeholders", () => {
    const post = buildEnglishBulkFacebookPostText(
      [
        {
          id: 1,
          jobId: "CT-2001",
          classCourse: "Class 8",
          tuitionLocationLabel: "Banani, Dhaka",
          budgetAmount: 7000,
        },
      ],
      {
        origin: "https://connecttutorsbd.com",
        template: {
          bulkHeader: "🔥 HOT TUITIONS ({count} AVAILABLE) 🔥\nWelcome tutors!",
          bulkFooter: "Apply now at {website} | Contact Support",
        },
      },
    );

    expect(post).toContain("🔥 HOT TUITIONS (1 AVAILABLE) 🔥\nWelcome tutors!");
    expect(post).toContain("Job ID: CT-2001");
    expect(post).toContain("Apply now at https://connecttutorsbd.com/job-board | Contact Support");
  });
});

describe("buildFacebookPostText with custom template", () => {
  it("supports dynamic custom header and footer for single job", () => {
    const post = buildFacebookPostText(
      {
        id: 77,
        jobId: "CT-0077",
        classCourse: "Class 7",
        tuitionLocationLabel: "Mohammadpur",
        budgetAmount: 5000,
      },
      {
        origin: "https://connecttutorsbd.com",
        template: {
          singleHeader: "⚡ TUITION NOTICE: {jobId} ⚡",
          singleFooter: "Apply Link: {applyUrl}",
        },
      },
    );

    expect(post).toContain("⚡ TUITION NOTICE: CT-0077 ⚡");
    expect(post).toContain("Job ID: CT-0077");
    expect(post).toContain("Apply Link: https://connecttutorsbd.com/job-board?job=CT-0077");
  });
});

describe("buildDynamicBulkHeadline", () => {
  it("formats all selected filters in the exact user-specified sequence and format", () => {
    const headline = buildDynamicBulkHeadline(8, {
      categories: ["Bangla Medium"],
      preferredTutorGender: "female",
      cityName: "Dhaka",
      locationNames: ["Dhanmondi", "Mohammadpur", "Shyamoli"],
    });

    expect(headline).toBe(
      "📢 Total 8 🔹 Bangla Medium 🎓 Female Tuitions Available At 📍 Dhaka City (Dhanmondi + Mohammadpur + Shyamoli) Area right now.",
    );
  });

  it("handles tuition type (online) with category and gender", () => {
    const headline = buildDynamicBulkHeadline(4, {
      tuitionTypes: ["online"],
      categories: ["English Medium"],
      preferredTutorGender: "male",
    });

    expect(headline).toBe(
      "📢 Total 4 🌐 Online 🔹 English Medium 🎓 Male Tuitions Available right now.",
    );
  });

  it("handles multiple categories with plus separator", () => {
    const headline = buildDynamicBulkHeadline(6, {
      categories: ["Bangla Medium", "English Version"],
      cityName: "Chittagong",
    });

    expect(headline).toBe(
      "📢 Total 6 🔹 Bangla Medium + English Version Tuitions Available At 📍 Chittagong City right now.",
    );
  });

  it("handles singular count (1 tuition available)", () => {
    const headline = buildDynamicBulkHeadline(1, {
      preferredTutorGender: "female",
    });

    expect(headline).toBe("📢 Total 1 🎓 Female Tuition Available right now.");
  });

  it("falls back to default headline when no filters are set", () => {
    const headline = buildDynamicBulkHeadline(20);
    expect(headline).toBe("📢 Total 20 Tuitions Available right now.");
  });

  it("renders dynamic headline inside buildEnglishBulkFacebookPostText header", () => {
    const post = buildEnglishBulkFacebookPostText(
      [
        {
          id: 1,
          jobId: "CT-101",
          classCourse: "Class 9",
          tuitionLocationLabel: "Dhanmondi",
          budgetAmount: 8000,
        },
      ],
      {
        filterOptions: {
          categories: ["Bangla Medium"],
          preferredTutorGender: "female",
          cityName: "Dhaka",
          locationNames: ["Dhanmondi"],
        },
      },
    );

    expect(post).toContain(
      "📢 Total 1 🔹 Bangla Medium 🎓 Female Tuition Available At 📍 Dhaka City (Dhanmondi) Area right now.",
    );
  });

  it("appends smart hashtags to single post when includeHashtags is true", () => {
    const post = buildFacebookPostText(
      {
        id: 1,
        jobId: "CT-101",
        classCourse: "Class 10",
        category: "English Medium",
        tuitionLocationLabel: "Dhanmondi, Dhaka",
        budgetAmount: 10000,
      },
      {
        includeHashtags: true,
      },
    );

    expect(post).toContain("#ConnectTutors");
    expect(post).toContain("#DhanmondiTuition");
    expect(post).toContain("#EnglishMediumTutors");
  });

  it("appends smart hashtags to bulk post when includeHashtags is true", () => {
    const post = buildEnglishBulkFacebookPostText(
      [
        {
          id: 1,
          jobId: "CT-101",
          classCourse: "Class 10",
          category: "English Medium",
          tuitionLocationLabel: "Dhanmondi, Dhaka",
          budgetAmount: 10000,
        },
      ],
      {
        includeHashtags: true,
      },
    );

    expect(post).toContain("#ConnectTutors");
    expect(post).toContain("#DhanmondiTuition");
  });
});

describe("formatJobClassLine curriculum-aware formatting", () => {
  it("uses 'Standard' for English Medium and strips duplicate prefixes/shortcodes", () => {
    expect(
      formatJobClassLine({
        id: 1,
        classCourse: "Class 9",
        curriculumType: "Edexcel",
      }),
    ).toBe("🔹 Standard: 9 EM");

    expect(
      formatJobClassLine({
        id: 2,
        classCourse: "Standard 3",
        curriculumType: "Cambridge",
      }),
    ).toBe("🔹 Standard: 3 EM");

    expect(
      formatJobClassLine({
        id: 3,
        classCourse: "Grade 11",
        category: "English Medium (British)",
      }),
    ).toBe("🔹 Standard: 11 EM");

    expect(
      formatJobClassLine({
        id: 4,
        classCourse: "O Level EM",
        curriculumType: "English Medium",
      }),
    ).toBe("🔹 Standard: O Level EM");
  });

  it("uses 'Class' for Bangla Medium, English Version, and others", () => {
    expect(
      formatJobClassLine({
        id: 5,
        classCourse: "Class 10",
        curriculumType: "Bangla Medium",
      }),
    ).toBe("🔹 Class: 10 BM");

    expect(
      formatJobClassLine({
        id: 6,
        classCourse: "Grade 8",
        curriculumType: "English Version",
      }),
    ).toBe("🔹 Class: 8 EV");

    expect(
      formatJobClassLine({
        id: 7,
        classCourse: "Alim",
        curriculumType: "Madrasah",
      }),
    ).toBe("🔹 Class: Alim Madrasah");

    expect(
      formatJobClassLine({
        id: 8,
        classCourse: "Medical Admission",
        curriculumType: "Admission",
      }),
    ).toBe("🔹 Class: Medical Admission");
  });

  it("never outputs 'Class / Standard' together", () => {
    const bmLine = formatJobClassLine({ id: 10, classCourse: "10", curriculumType: "Bangla Medium" });
    const emLine = formatJobClassLine({ id: 11, classCourse: "10", curriculumType: "English Medium" });

    expect(bmLine).not.toContain("Class / Standard");
    expect(emLine).not.toContain("Class / Standard");
    expect(bmLine).toBe("🔹 Class: 10 BM");
    expect(emLine).toBe("🔹 Standard: 10 EM");
  });

  it("deduplicates repeating Class/Standard words in multi-class course strings", () => {
    const multiBm = formatJobClassLine({
      id: 12,
      classCourse: "Class 7 & Class 5",
      curriculumType: "Bangla Medium",
    });
    expect(multiBm).toBe("🔹 Class: 7 & 5 BM");

    const multiEm = formatJobClassLine({
      id: 13,
      classCourse: "Standard 8 and Standard 6",
      curriculumType: "English Medium",
    });
    expect(multiEm).toBe("🔹 Standard: 8 and 6 EM");
  });
});

describe("Student School and 3-in-1 line formatting", () => {
  it("renders dedicated '🏫 School:' line when instituteName is present and keeps Line 1 clean", () => {
    const text = buildFacebookPostText({
      id: 6815,
      jobId: "6815",
      preferredGender: "male",
      tuitionLocationLabel: "Segunbagicha, Dhaka",
      addressDetails: "Kachabazar",
      classCourse: "10",
      curriculumType: "Bangla Medium",
      subjects: ["English", "Bangla", "Geography", "Economics"],
      daysPerWeek: 5,
      tutoringTime: "7:00 PM",
      budgetAmount: 7000,
      instituteName: "Birshrestho Munshi Abdur Rouf",
      notes: "Experienced Tutors are requested to apply",
    });

    expect(text).toContain("📌 Job ID: 6815 (Male Tutor)");
    expect(text).not.toContain("(Male Tutor (Birshrestho");
    expect(text).toContain("📍 #SEGUNBAGICHA_DHAKA (Kachabazar)");
    expect(text).toContain("🔹 Class: 10 BM");
    expect(text).toContain("📚 Subjects: English, Bangla, Geography, Economics  |  🗓️ 5 Days, Time: 7:00 PM  |  💰 Salary 7,000 BDT");
    expect(text).toContain("🏫 School: Birshrestho Munshi Abdur Rouf");
    expect(text).toContain("\n📋 Notes: Experienced Tutors are requested to apply");
  });

  it("omits '🏫 School:' line when instituteName is empty, null, or placeholder", () => {
    const textWithoutSchool = buildFacebookPostText({
      id: 6816,
      jobId: "6816",
      classCourse: "Class 8",
      curriculumType: "Bangla Medium",
      instituteName: "N/A",
      budgetAmount: 5000,
    });

    expect(textWithoutSchool).not.toContain("🏫 School:");
    expect(textWithoutSchool).toContain("🔹 Class: 8 BM");
    expect(textWithoutSchool).toContain("💰 Salary 5,000 BDT");
    expect(textWithoutSchool).not.toContain("/month");
  });

  it("renders dedicated Student info line when gender or multiple students exist and strips double parens from address", () => {
    const textFemaleStudent = buildFacebookPostText({
      id: 6820,
      jobId: "6820",
      studentGender: "female",
      studentCount: 1,
      addressDetails: "((Kachabazar))",
      tuitionLocationLabel: "Segunbagicha, Dhaka",
    });
    expect(textFemaleStudent).toContain("👨‍🎓 Student: Female Student");
    expect(textFemaleStudent).toContain("📍 #SEGUNBAGICHA_DHAKA (Kachabazar)");
    expect(textFemaleStudent).not.toContain("((Kachabazar))");

    const textMultiStudent = buildFacebookPostText({
      id: 6821,
      jobId: "6821",
      studentCount: 3,
    });
    expect(textMultiStudent).toContain("👥 Students: 3 Students");

    // Single student unspecified gender should not have a redundant line
    const textGeneric = buildFacebookPostText({
      id: 6822,
      jobId: "6822",
      studentCount: 1,
    });
    expect(textGeneric).not.toContain("Student:");
    expect(textGeneric).not.toContain("Students:");
  });
});
