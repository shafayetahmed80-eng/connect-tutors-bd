import { describe, expect, it } from "vitest";
import {
  buildEnglishBulkFacebookPostText,
  buildEnglishJobDetailsInline,
  buildFacebookPostText,
} from "./facebook-post";

describe("buildFacebookPostText", () => {
  it("generates a complete formatted Facebook post text with all details", () => {
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
      tutoringTime: "সন্ধ্যা ৬:০০ টা",
      studentGender: "male",
      studentCount: 1,
      preferredGender: "female",
      instituteName: "DU / BUET preferred",
      notes: "গণিতে ভালো দখল থাকতে হবে।",
    });

    expect(text).toContain("🔴 নতুন টিউশন অফার — কানেক্ট টিউটরস (Connect Tutors BD) 🔴");
    expect(text).toContain("📌 জব আইডি: CT-1024");
    expect(text).toContain("📚 শ্রেণি/কোর্স: Class 9 (Edexcel)");
    expect(text).toContain("📝 বিষয়সমূহ: Math, Physics, Chemistry");
    expect(text).toContain("📍 লোকেশন: Dhanmondi, Dhaka (Road 27)");
    expect(text).toContain("💰 পারিশ্রমিক/বেতন: 8,000 Taka");
    expect(text).toContain("📅 সপ্তাহে দিন: 3 দিন/সপ্তাহ");
    expect(text).toContain("⏰ পড়ার সময়: সন্ধ্যা ৬:০০ টা");
    expect(text).toContain("👨‍🎓 শিক্ষার্থীর তথ্য: 1 student (Male)");
    expect(text).toContain("🎓 টিউটর অগ্রাধিকার: Female টিউটর (DU / BUET preferred)");
    expect(text).toContain("📋 বিশেষ শর্তাবলী: গণিতে ভালো দখল থাকতে হবে।");
    expect(text).toContain("https://connecttutorsbd.com/job-board?job=CT-1024");
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

    expect(text).toContain("📌 জব আইডি: CT-0055");
    expect(text).toContain("📚 শ্রেণি/কোর্স: Class 5");
    expect(text).toContain("📝 বিষয়সমূহ: Not set");
    expect(text).toContain("💰 পারিশ্রমিক/বেতন: আলোচনা সাপেক্ষে (Negotiable)");
    expect(text).toContain("📅 সপ্তাহে দিন: আলোচনা সাপেক্ষে");
    expect(text).toContain("⏰ পড়ার সময়: আলোচনা সাপেক্ষে / ফ্লেক্সিবল");
    expect(text).toContain("📋 বিশেষ শর্তাবলী: কোনো বিশেষ শর্ত নেই");
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

    expect(text).toContain("📍 লোকেশন: Online — no travel");
    expect(text).not.toContain("Should be omitted for online");
  });
});

describe("buildEnglishJobDetailsInline", () => {
  it("formats single tuition details side-by-side with pipe (|) in English", () => {
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
      "Job #CT-1042 | Class 9 (English Medium) | Math, Physics | Dhanmondi, Dhaka (Road 27) | 8,000 BDT/month | 3 Days/week, 6:00 PM | Male Tutor (BUET/DU) | 1 Student (Male) | Notes: Experience preferred | Apply: https://connecttutorsbd.com/job-board?job=CT-1042",
    );
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

    expect(line).toContain("Job #CT-0099");
    expect(line).toContain("HSC 1st Year");
    expect(line).toContain("All Subjects");
    expect(line).toContain("Online");
    expect(line).toContain("Salary Negotiable");
    expect(line).toContain("Flexible Days");
    expect(line).toContain("Any Tutor");
    expect(line).toContain("Apply: https://connecttutorsbd.com/job-board?job=CT-0099");
    expect(line).not.toContain("undefined");
    expect(line).not.toContain("null");
  });
});

describe("buildEnglishBulkFacebookPostText", () => {
  it("formats multiple tuitions into a ready-to-publish English Facebook post", () => {
    const post = buildEnglishBulkFacebookPostText([
      {
        id: 1,
        jobId: "CT-1001",
        classCourse: "Class 9",
        curriculumType: "English Medium",
        subjects: ["Math"],
        tuitionLocationLabel: "Gulshan, Dhaka",
        budgetAmount: 10000,
        daysPerWeek: 3,
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
      },
    ]);

    expect(post).toContain("🔴 LIVE TUITION JOBS — CONNECT TUTORS BD 🔴");
    expect(post).toContain("Total 2 Tuitions Available right now.");
    expect(post).toContain("1. Job #CT-1001 | Class 9 (English Medium)");
    expect(post).toContain("2. Job #CT-1002 | Class 6 (Bangla Medium)");
    expect(post).toContain("https://connecttutorsbd.com/job-board");
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
    expect(post).toContain("1. Job #CT-2001");
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
          singleHeader: "⚡ টিউশন নোটিশ: {jobId} ⚡",
          singleFooter: "আবেদন লিংক: {applyUrl}",
        },
      },
    );

    expect(post).toContain("⚡ টিউশন নোটিশ: CT-0077 ⚡");
    expect(post).toContain("📌 জব আইডি: CT-0077");
    expect(post).toContain("আবেদন লিংক: https://connecttutorsbd.com/job-board?job=CT-0077");
  });
});


