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

  const sampleCv: TutorCvDocument = {
    tutorId: "tutor_xyz123",
    tutorNumber: 84210,
    name: "মোঃ রাশেদুল ইসলাম",
    headline: "B.Sc in Civil Engineering (BUET) | Experienced Science Tutor",
    phone: "01711234567",
    contactEmail: "rashed.buet@gmail.com",
    locationLabel: "ধানমন্ডি, ঢাকা",
    verified: true,
    ratingAverage: 4.9,
    reviewCount: 14,
    highestEducation: "Honours / Bachelor",
    institution: "Bangladesh University of Engineering and Technology (BUET)",
    educationRecords: [
      {
        qualificationLevel: "Honours / Bachelor",
        degreeExamTitle: "B.Sc in Civil Engineering",
        instituteName: "BUET",
        majorGroup: "Engineering",
        resultGpa: "3.85 / 4.00",
        studyStartYear: 2018,
        studyEndYear: 2022,
      },
      {
        qualificationLevel: "Higher Secondary / HSC",
        degreeExamTitle: "HSC",
        instituteName: "Notre Dame College",
        majorGroup: "Science",
        resultGpa: "5.00",
        passingYear: 2017,
      },
      {
        qualificationLevel: "Secondary / SSC",
        degreeExamTitle: "SSC",
        instituteName: "Ideal School & College",
        majorGroup: "Science",
        resultGpa: "5.00",
        passingYear: 2015,
      },
    ],
    subjects: ["Physics", "Higher Mathematics", "ICT", "General Science"],
    levels: ["Class 9", "Class 10", "HSC 1st Year", "HSC 2nd Year"],
    tuitionTypes: ["home", "online"],
    teachingExperienceYears: 4,
    priorTeachingExperience: "Taught 30+ students in Dhanmondi and Mirpur. Specialized in board exam preparation and conceptual problem solving.",
    preferredLocations: ["Dhanmondi", "Lalmatia", "Mirpur", "Mohammadpur"],
    aboutMe: "Dedicated educator with 4+ years of tutoring experience in high school and college science subjects.",
  };

  it("renders a valid 1-page PDF buffer from sample tutor CV data", async () => {
    const bytes = await renderTutorCvPdf(sampleCv);
    expect(bytes).toBeInstanceOf(Buffer);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(isPdf(bytes)).toBe(true);
  });

  it("handles minimal tutor CV data without crashing", async () => {
    const minimalCv: TutorCvDocument = {
      tutorId: "min_tutor_1",
      tutorNumber: null,
      name: "Tutor Name",
    };
    const bytes = await renderTutorCvPdf(minimalCv);
    expect(bytes).toBeInstanceOf(Buffer);
    expect(isPdf(bytes)).toBe(true);
  });
});
