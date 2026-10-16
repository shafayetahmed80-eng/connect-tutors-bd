import { describe, expect, it } from "vitest";
import { buildFacebookPostText } from "./facebook-post";

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
