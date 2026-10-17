import { describe, expect, it } from "vitest";
import {
  ITEM_DIVIDER,
  buildDynamicBulkHeadline,
  buildEnglishBulkFacebookPostText,
  buildEnglishJobDetailsInline,
  buildFacebookPostText,
  formatJobAreaItem,
  formatJobEmojiLine,
  formatJobKeyPriority,
  formatJobMobileCard,
} from "./facebook-post";

describe("buildFacebookPostText", () => {
  it("generates an English Area-Grouped side-by-side single post with underline divider and apply link", () => {
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
    expect(text).toContain("📍 #DHANMONDI_DHAKA");
    expect(text).toContain("Job ID: CT-1024");
    expect(text).toContain("🎓 Female Tutor (DU / BUET preferred)");
    expect(text).toContain("Class 9 (Edexcel)");
    expect(text).toContain("Math, Physics, Chemistry");
    expect(text).toContain("3 Days/week, 6:00 PM");
    expect(text).toContain("💰 8,000 BDT/month");
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
    expect(text).toContain("Class 5");
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

    expect(text).toContain("🌐 #ONLINE_TUITIONS");
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
      "Job ID: CT-1042  |  🎓 Male Tutor (BUET/DU)  |  Class 9 (English Medium)  |  Math, Physics  |  📍 Dhanmondi, Dhaka (Road 27)  |  🗓️ 3 Days/week, 6:00 PM  |  💰 8,000 BDT/month  |  1 Student (Male)  |  Notes: Experience preferred",
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
    expect(post).toContain("🔹 Class- Standard 1 (British)");
    expect(post).toContain("📚 Subjects- All  |  🗓️ 5 Days  |  💰 Salary 7,000 BDT/month");
    expect(post).toContain("\n📋 Notes: O&A Levels Background Tutors Are encouraged to apply");
    expect(post).toContain("──────────────────────────");
  });

  it("Format 2 (mobile-card / Category Grouped): groups tuitions by category header with underline", () => {
    const post = buildEnglishBulkFacebookPostText(sampleJobs, {
      format: "mobile-card",
    });

    expect(post).toContain("📚 ENGLISH MEDIUM\n────────────────");
    expect(post).toContain("📌 Job ID: CT-1001 (Female Tutor)\n📍 #GULSHAN_DHAKA\n🔹 Class- Class 9 (English Medium)\n📚 Subjects- Math  |  🗓️ 3 Days  |  💰 Salary 10,000 BDT/month");
    expect(post).toContain("📚 BANGLA MEDIUM\n───────────────");
    expect(post).toContain("📌 Job ID: CT-1002 (Male Tutor)\n📍 #UTTARA_DHAKA\n🔹 Class- Class 6 (Bangla Medium)\n📚 Subjects- All Subjects  |  🗓️ 4 Days  |  💰 Salary 6,000 BDT/month");
    expect(post).toContain(ITEM_DIVIDER);
  });

  it("Format 3 (key-priority): puts tutor pref and subjects upfront with hashtag location", () => {
    const post = buildEnglishBulkFacebookPostText(sampleJobs, {
      format: "key-priority",
    });

    expect(post).toContain("1. [Job ID: CT-1001] 🎓 FEMALE TUTOR 🎯 MATH  |  Class 9 (English Medium)  |  📍 #GULSHAN_DHAKA  |  🗓️ 3 Days/week  |  💰 10,000 BDT/month");
    expect(post).toContain("2. [Job ID: CT-1002] 🎓 MALE TUTOR 🎯 ALL SUBJECTS  |  Class 6 (Bangla Medium)  |  📍 #UTTARA_DHAKA  |  🗓️ 4 Days/week  |  💰 6,000 BDT/month");
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
    expect(post).toContain("📍 #MOHAMMADPUR_DHAKA\n────────────────────\n\n📌 Job ID: 6806 (Female Tutor)");
    expect(post).toContain("🔹 Class- Standard 1 (British)");
    expect(post).toContain("📚 Subjects- All  |  🗓️ 5 Days  |  💰 Salary 7,000 BDT/month");
    expect(post).toContain("\n📋 Notes: O&A Levels Background Tutors Are encouraged to apply");
    expect(post).toContain("──────────────────────────");

    // Gulshan hashtag has 16 unicode code points -> 16 dashes
    expect(post).toContain("📍 #GULSHAN_DHAKA\n────────────────\n\n📌 Job ID: CT-1001 (Female Tutor)");
    expect(post).toContain("🔹 Class- Class 9 (English Medium)");
    expect(post).toContain("📚 Subjects- Math  |  🗓️ 3 Days  |  💰 Salary 10,000 BDT/month");

    // Divider is 26 characters (shortened to prevent 2-line wrap on mobile)
    expect(ITEM_DIVIDER).toBe("──────────────────────────");
    expect(ITEM_DIVIDER.length).toBe(26);
  });

  it("separates every two tuitions with a blank line after the divider across bulk formats", () => {
    const formats = ["emoji-line", "mobile-card", "key-priority", "area-grouped"] as const;
    for (const format of formats) {
      const post = buildEnglishBulkFacebookPostText(sampleJobs, { format });
      expect(post).toContain(`${ITEM_DIVIDER}\n\n`);
    }
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
