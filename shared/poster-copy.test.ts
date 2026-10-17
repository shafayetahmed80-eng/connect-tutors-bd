import { describe, expect, it } from "vitest";
import type { LearningNeed } from "./learning-needs";
import {
  areaText,
  areaWithoutCity,
  banglaDayPart,
  cityOf,
  classesText,
  classLabel,
  curriculaText,
  curriculumLabel,
  daysPhrase,
  daysValue,
  joinWithMore,
  lakhGrouping,
  posterDate,
  salaryText,
  subjectLabel,
  subjectsText,
  timeValue,
  tuitionCount,
  tutorValue,
} from "./poster-copy";

const englishVersionClass8: LearningNeed[] = [
  { category: "English Version", curriculumType: null, classes: [{ classCourse: "Class 8", subjects: ["Mathematics", "Physics", "Chemistry"] }] },
];

describe("poster copy: classes, curricula and subjects", () => {
  it("translates numbered classes with Bangla digits", () => {
    expect(classLabel("Class 8", "bn")).toBe("ক্লাস ৮");
    expect(classLabel("Standard 10", "bn")).toBe("স্ট্যান্ডার্ড ১০");
    expect(classLabel("Class 1–5", "bn")).toBe("ক্লাস ১–৫");
    expect(classLabel("HSC- 2nd Year", "bn")).toBe("এইচএসসি ২য় বর্ষ");
    expect(classLabel("Class 8", "en")).toBe("Class 8");
    expect(classLabel("HSC- 1st Year", "en")).toBe("HSC 1st Year");
    expect(subjectLabel("All", "en")).toBe("All subjects");
  });

  it("keeps a course outside the catalog in English on the Bangla poster", () => {
    expect(classLabel("IELTS Preparation", "bn")).toBe("IELTS Preparation");
    expect(subjectLabel("Kung Fu", "bn")).toBe("Kung Fu");
  });

  it("uses the Owner's spelling for curricula", () => {
    expect(curriculumLabel("English Version", "bn")).toBe("ইংলিশ ভার্সন");
    expect(curriculumLabel("Bangla Medium", "bn")).toBe("বাংলা মিডিয়াম");
  });

  it("reads one subject spelling variant like the other", () => {
    expect(subjectLabel("Health & Sport", "bn")).toBe(subjectLabel("Health & Sports", "bn"));
    expect(subjectLabel("Physics", "bn")).toBe("পদার্থবিজ্ঞান");
  });

  it("builds the headline, curriculum and subjects from the learning needs", () => {
    expect(classesText(englishVersionClass8, "bn")).toBe("ক্লাস ৮");
    expect(curriculaText(englishVersionClass8, "bn")).toBe("ইংলিশ ভার্সন");
    expect(subjectsText(englishVersionClass8, "bn")).toBe("গণিত · পদার্থবিজ্ঞান · রসায়ন");
    expect(subjectsText(englishVersionClass8, "en")).toBe("Mathematics · Physics · Chemistry");
  });

  it("names the English Medium board beside its curriculum", () => {
    const needs: LearningNeed[] = [{ category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "O Level", subjects: ["Physics"] }] }];
    expect(curriculaText(needs, "en")).toBe("English Medium · Cambridge");
    expect(classesText(needs, "bn")).toBe("ও লেভেল");
  });

  it("cuts long lists and says how many were left out", () => {
    expect(joinWithMore(["a", "b", "c", "d"], 2, "bn")).toBe("a, b +২টি");
    expect(joinWithMore(["a", "b", "c"], 2, "en")).toBe("a, b +1 more");
    const many: LearningNeed[] = [{ category: "Bangla Medium", classes: [{ classCourse: "Class 9", subjects: ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "English"] }] }];
    expect(subjectsText(many, "bn")).toBe("পদার্থবিজ্ঞান · রসায়ন · জীববিজ্ঞান · উচ্চতর গণিত +২টি");
  });

  it("falls back to all subjects when none were picked", () => {
    expect(subjectsText([{ category: "Bangla Medium", classes: [{ classCourse: "Class 2", subjects: [] }] }], "bn")).toBe("সকল বিষয়");
  });
});

describe("poster copy: place, days, time, tutor, salary, date", () => {
  it("prints only the stored place, never an address", () => {
    expect(areaText({ tuitionType: "home", tuitionLocationLabel: "Dhanmondi, Dhaka" }, "bn")).toBe("Dhanmondi, Dhaka");
    expect(areaText({ tuitionType: "online", tuitionLocationLabel: null }, "bn")).toBe("অনলাইন");
    expect(areaText({ tuitionType: "home", tuitionLocationLabel: null }, "en")).toBeNull();
    expect(areaWithoutCity("Mirpur 10, Dhaka")).toBe("Mirpur 10");
    expect(cityOf({ tuitionType: "home", tuitionLocationLabel: "Mirpur 10, Dhaka" })).toBe("Dhaka");
    expect(cityOf({ tuitionType: "online", tuitionLocationLabel: null })).toBeNull();
  });

  it("writes days in both languages", () => {
    expect(daysValue(3, "bn")).toBe("৩ দিন");
    expect(daysValue(1, "en")).toBe("1 day");
    expect(daysPhrase(3, "bn")).toBe("সপ্তাহে ৩ দিন");
    expect(daysPhrase(4, "en")).toBe("4 days a week");
    expect(daysValue(0, "en")).toBeNull();
  });

  it("turns the stored 24-hour time into a reading time", () => {
    expect(timeValue("16:30", "bn")).toBe("বিকাল ৪:৩০");
    expect(timeValue("17:00", "bn")).toBe("বিকাল ৫টা");
    expect(timeValue("07:15", "bn")).toBe("সকাল ৭:১৫");
    expect(timeValue("16:30", "en")).toBe("4:30 PM");
    expect(timeValue("", "bn")).toBeNull();
    expect(timeValue("6:00 PM", "en")).toBeNull();
  });

  it("splits the day at fixed hours", () => {
    expect([4, 5, 12, 15, 18, 20].map(banglaDayPart)).toEqual(["রাত", "সকাল", "দুপুর", "বিকাল", "সন্ধ্যা", "রাত"]);
  });

  it("names the preferred tutor", () => {
    expect(tutorValue("female", "bn")).toBe("মহিলা");
    expect(tutorValue("male", "en")).toBe("Male");
    expect(tutorValue("any", "bn")).toBe("যেকোনো");
  });

  it("formats the salary, grouping Bangla amounts in lakhs", () => {
    expect(lakhGrouping(150000)).toBe("1,50,000");
    expect(lakhGrouping(8000)).toBe("8,000");
    expect(salaryText(8000, "bn")).toBe("৳ ৮,০০০");
    expect(salaryText(150000, "bn")).toBe("৳ ১,৫০,০০০");
    expect(salaryText(150000, "en")).toBe("৳ 150,000");
    expect(salaryText(null, "bn")).toBeNull();
  });

  it("dates the poster in Dhaka time", () => {
    const lateUtc = new Date("2026-10-16T20:30:00Z");
    expect(posterDate(lateUtc, "bn")).toBe("১৭ অক্টোবর ২০২৬");
    expect(posterDate(lateUtc, "en")).toBe("17 October 2026");
  });

  it("counts tuitions", () => {
    expect(tuitionCount(4, "bn")).toBe("৪টি টিউশন");
    expect(tuitionCount(1, "en")).toBe("1 tuition");
  });
});
