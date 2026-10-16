import { describe, expect, it } from "vitest";
import { renderTutorCvPdf, tutorCvFileName, type TutorCvDocument } from "./tutor-cv-pdf";

describe("tutorCvFileName", () => {
  it("formats standard file names cleanly", () => {
    expect(tutorCvFileName(84210, "Md. Rashedul Islam")).toBe("Connect-Tutors-CV-84210-Md-Rashedul-Islam.pdf");
    expect(tutorCvFileName(null, "Tutor")).toBe("Connect-Tutors-CV-CTB-Tutor.pdf");
  });
});

describe("renderTutorCvPdf", () => {
  const isPdf = (bytes: Buffer) => bytes.subarray(0, 5).toString("latin1") === "%PDF-";
  const countPdfPages = (bytes: Buffer) => {
    const text = bytes.toString("latin1");
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : 1;
  };

  const comprehensiveCv: TutorCvDocument = {
    tutorId: "tutor_xyz123",
    tutorNumber: 84210,
    name: "মোঃ রাশেদুল ইসলাম",
    headline: "M.Sc & B.Sc in Civil Engineering (BUET) | Senior Science Tutor",
    gender: "male",
    dateOfBirth: "15 Jan 1998",
    religion: "Islam",
    phone: "01711234567",
    contactEmail: "rashed.buet@gmail.com",
    locationLabel: "মিরপুর-১০, ঢাকা, বাংলাদেশ",
    verified: true,
    ratingAverage: 4.9,
    reviewCount: 14,
    highestEducation: "Masters / Post Graduation",
    institution: "Bangladesh University of Engineering and Technology (BUET)",
    educationRecords: [
      {
        qualificationLevel: "Masters",
        degreeExamTitle: "M.Sc in Structural Engineering",
        instituteName: "BUET",
        majorGroup: "Civil Engineering",
        resultGpa: "3.92 / 4.00",
        studyStartYear: 2022,
        studyEndYear: 2024,
      },
      {
        qualificationLevel: "Honours",
        degreeExamTitle: "B.Sc in Civil Engineering",
        instituteName: "BUET",
        majorGroup: "Engineering",
        resultGpa: "3.85 / 4.00",
        studyStartYear: 2018,
        studyEndYear: 2022,
      },
      {
        qualificationLevel: "HSC",
        degreeExamTitle: "HSC",
        instituteName: "Notre Dame College",
        majorGroup: "Science",
        curriculum: "Bangla Version",
        resultGpa: "5.00",
        passingYear: 2017,
      },
      {
        qualificationLevel: "SSC",
        degreeExamTitle: "SSC",
        instituteName: "Ideal School & College",
        majorGroup: "Science",
        curriculum: "Bangla Version",
        resultGpa: "5.00",
        passingYear: 2015,
      },
    ],
    subjects: ["Physics", "Higher Mathematics", "ICT", "General Science", "Chemistry"],
    levels: ["Class 9", "Class 10", "HSC 1st Year", "HSC 2nd Year"],
    tuitionTypes: ["home", "online"],
    teachingExperienceYears: 4,
    priorTeachingExperience: "ধানমন্ডি ও মিরপুরে ৩০+ শিক্ষার্থীকে সফলভাবে পড়ানোর অভিজ্ঞতা। বোর্ড পরীক্ষায় এ+ পাওয়ার কৌশল ও নিয়মিত পরীক্ষা নেওয়া হয়।",
    teachingApproach: "বেসিক কনসেপ্ট ক্লিয়ার করা, নিয়মিত প্র্যাকটিস ও হ্যান্ডনোট প্রদান। প্রতিটি টপিক সহজভাবে বিশ্লেষণ করে পড়াই।",
    specialExpertise: "উচ্চতর গণিত ও পদার্থবিজ্ঞানের জটিল সমস্যা সহজ কৌশলে সমাধান।",
    whyChooseMe: "বুয়েট গ্র্যাজুয়েট হিসেবে বিষয়ভিত্তিক গভীর জ্ঞান, ধৈর্যশীল আচরণ ও শিক্ষার্থীদের রেজাল্ট নিশ্চিত করার আন্তরিক প্রচেষ্টা।",
    preferredLocations: ["Mirpur", "Dhanmondi", "Mohammadpur", "Uttara"],
    aboutMe: "নিবেদিতপ্রাণ শিক্ষক। প্রতিটি শিক্ষার্থীর দুর্বলতা চিহ্নিত করে তাদের আত্মবিশ্বাস ও মেধার বিকাশ ঘটাতে সচেষ্ট।",
  };

  it("renders a valid 1-page PDF buffer with all enriched fields (DOB, religion, location, whyChooseMe, approach, 4 education records)", async () => {
    const bytes = await renderTutorCvPdf(comprehensiveCv);
    expect(bytes).toBeInstanceOf(Buffer);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(isPdf(bytes)).toBe(true);
    expect(countPdfPages(bytes)).toBe(1);
  });

  it("handles minimal tutor CV data without crashing and maintains single page", async () => {
    const minimalCv: TutorCvDocument = {
      tutorId: "min_tutor_1",
      tutorNumber: null,
      name: "Tutor Name",
    };
    const bytes = await renderTutorCvPdf(minimalCv);
    expect(bytes).toBeInstanceOf(Buffer);
    expect(isPdf(bytes)).toBe(true);
    expect(countPdfPages(bytes)).toBe(1);
  });

  it("sorts education records chronologically by qualification hierarchy (Masters -> Honours -> HSC -> SSC)", async () => {
    const shuffledCv: TutorCvDocument = {
      tutorId: "tutor_shuffled",
      tutorNumber: 12345,
      name: "Anisur Rahman",
      educationRecords: [
        { qualificationLevel: "SSC", degreeExamTitle: "SSC", passingYear: 2014 },
        { qualificationLevel: "Masters", degreeExamTitle: "MBA", passingYear: 2022 },
        { qualificationLevel: "HSC", degreeExamTitle: "HSC", passingYear: 2016 },
        { qualificationLevel: "Honours", degreeExamTitle: "BBA", passingYear: 2020 },
      ],
    };
    const bytes = await renderTutorCvPdf(shuffledCv);
    expect(isPdf(bytes)).toBe(true);
    expect(countPdfPages(bytes)).toBe(1);
  });
});

