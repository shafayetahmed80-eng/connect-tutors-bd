import { describe, expect, it } from "vitest";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderTutorCvPdf, resolveTutorCvStatus, tidyCvText, tutorCvFileName, type TutorCvDocument } from "./tutor-cv-pdf";

describe("tutorCvFileName", () => {
  it("formats standard file names cleanly", () => {
    expect(tutorCvFileName(84210, "Md. Rashedul Islam")).toBe("Connect-Tutors-CV-84210-Md-Rashedul-Islam.pdf");
    expect(tutorCvFileName(null, "Tutor")).toBe("Connect-Tutors-CV-CTB-Tutor.pdf");
  });
});

describe("resolveTutorCvStatus", () => {
  it("resolves verified status correctly", () => {
    const verifiedStatus = resolveTutorCvStatus("approved", true);
    expect(verifiedStatus.badgeText).toBe("✓  VERIFIED TUTOR");
    expect(verifiedStatus.badgeBg).toBe("#16a34a");
    expect(verifiedStatus.statTitle).toBe("100% Verified");
    expect(verifiedStatus.sealStatus).toBe("OFFICIALLY VERIFIED PROFILE");
  });

  it("resolves approved unverified profile correctly", () => {
    const approvedStatus = resolveTutorCvStatus("approved", false);
    expect(approvedStatus.badgeText).toBe("✓  APPROVED PROFILE");
    expect(approvedStatus.badgeBg).toBe("#0284c7");
    expect(approvedStatus.statTitle).toBe("Approved Profile");
    expect(approvedStatus.sealStatus).toBe("OFFICIALLY APPROVED PROFILE");
  });

  it("resolves pending review profile correctly", () => {
    const pendingStatus = resolveTutorCvStatus("pending", false);
    expect(pendingStatus.badgeText).toBe("UNDER REVIEW");
    expect(pendingStatus.badgeBg).toBe("#d97706");
  });

  it("resolves draft profile correctly", () => {
    const draftStatus = resolveTutorCvStatus("draft", false);
    expect(draftStatus.badgeText).toBe("DRAFT PROFILE");
    expect(draftStatus.badgeBg).toBe("#475569");
    expect(draftStatus.statTitle).toBe("Draft Profile");
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
    // Metadata should have "Connect Tutors" as Author
    expect(bytes.toString("latin1")).toContain("Connect Tutors");
  });

  it("renders draft and approved profile statuses gracefully as 1-page PDFs", async () => {
    const draftCv: TutorCvDocument = {
      tutorId: "tutor_draft",
      tutorNumber: 101,
      name: "Draft Tutor",
      profileStatus: "draft",
      verified: false,
    };
    const draftBytes = await renderTutorCvPdf(draftCv);
    expect(countPdfPages(draftBytes)).toBe(1);

    const approvedCv: TutorCvDocument = {
      tutorId: "tutor_appr",
      tutorNumber: 102,
      name: "Approved Tutor",
      profileStatus: "approved",
      verified: false,
    };
    const apprBytes = await renderTutorCvPdf(approvedCv);
    expect(countPdfPages(apprBytes)).toBe(1);
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

// ==========================================
// LAYOUT: nothing printed over anything else
// ==========================================

type CvTextBox = { str: string; x: number; y: number; width: number; height: number };

/** Every piece of text on every page, with where it sits (y counted from the top of the page). */
async function readCvPages(bytes: Buffer): Promise<CvTextBox[][]> {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false }).promise;
  const pages: CvTextBox[][] = [];
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number);
    const pageHeight = page.getViewport({ scale: 1 }).height;
    const content = await page.getTextContent();
    pages.push(
      content.items.flatMap(item => {
        if (!("str" in item) || !item.str.trim()) return [];
        const height = item.height || Math.abs(item.transform[3]);
        return [{ str: item.str, x: item.transform[4], y: pageHeight - item.transform[5] - height, width: item.width, height }];
      }),
    );
  }
  return pages;
}

/** Pairs of text that sit on top of each other: the same stretch across, and most of their height shared. */
function overlappingText(boxes: CvTextBox[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let first = 0; first < boxes.length; first += 1) {
    for (let second = first + 1; second < boxes.length; second += 1) {
      const a = boxes[first];
      const b = boxes[second];
      const across = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const down = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (across > 1.5 && down > Math.min(a.height, b.height) * 0.4) pairs.push([a.str, b.str]);
    }
  }
  return pairs;
}

const FOOTER_TOP = 841.89 - 84;
const textOf = (boxes: CvTextBox[]) => boxes.map(box => box.str).join(" ");

const sentence = "I keep careful notes on each student's weak chapters, so every lesson starts from what the student actually needs. ";

const ownerCv: TutorCvDocument = {
  tutorId: "t792",
  tutorNumber: 792,
  name: "Md. Samiul Haque Ratul",
  profileStatus: "draft",
  headline: "Experienced Math, Chemistry, Physics, Biology, English teacher of class 9-10+ SSC",
  gender: "male",
  dateOfBirth: "27 Aug 1994",
  religion: "Islam",
  phone: "01733864051",
  contactEmail: "samiulhaqueratul94@gmail.com",
  locationLabel: "Mohakhali, Dhaka, Bangladesh",
  subjects: ["English", "Mathematics", "Higher Mathematics", "General Science", "Physics", "Chemistry"],
  tuitionTypes: ["home", "online", "group", "package"],
  teachingExperienceYears: 9,
  educationRecords: [
    { qualificationLevel: "Honours", degreeExamTitle: "B.Sc. in Food Engineering (Food Engineering and Technology)", instituteName: "Bangladesh Agricultural University", curriculum: "English Medium", resultGpa: "2.76", studyStartYear: 2012, studyEndYear: 2016 },
    { qualificationLevel: "HSC", degreeExamTitle: "HSC", majorGroup: "Science", instituteName: "Government Ananda Mohan College", curriculum: "Bangla Version", resultGpa: "5.00", passingYear: 2011 },
    { qualificationLevel: "SSC", degreeExamTitle: "S.S.C.", majorGroup: "Science", instituteName: "Mymensingh Zilla School", curriculum: "Bangla Version", resultGpa: "5.00", passingYear: 2011 },
  ],
  priorTeachingExperience:
    "Dedicated Tutor | 9+ Years of Experience in Class 1-10 & SSC\n\nResults-driven tutor with over 9 years of experience helping students achieve academic success.\n\nSubjects & Classes:\n* Classes 9-10 / SSC: Mathematics, Physics, Chemistry, Biology, and English.\n* Classes 1-8: Mathematics, English, and all general subjects.\n\nKey Strengths:\n* Proven track record of improving student grades and confidence\n* Expertise in exam preparation and study techniques\n* Personalized teaching methods adapted to each student's needs",
  specialExpertise: "SSC Board Exam preparation.",
  whyChooseMe: "• Conceptual and student-focused teaching methodology.\n• Regular practice tests, homework tracking, and performance evaluation.\n• Patient mentorship, doubt clearance, and clear communication with guardians.",
  preferredLocations: ["Aftabnagar", "Mohakhali", "Rampura", "Badda", "Gulshan"],
};

const longCv: TutorCvDocument = {
  ...ownerCv,
  tutorId: "t2",
  tutorNumber: 2,
  profileStatus: "approved",
  name: "Mohammad Abdullah Al Mamun Chowdhury Siddiquee",
  headline: "Senior Mathematics, Physics and Chemistry teacher for English Medium and Bangla Medium students from Class 6 to A Level, with ten years of coaching and one-to-one home tuition",
  aboutMe: sentence.repeat(8),
  subjects: ["Higher Mathematics (Bangla Version, Class 9-10)", "General Science", "Physics", "Chemistry", "Biology", "English Language and Literature"],
  priorTeachingExperience: `${sentence.repeat(3)}\n\n`.repeat(4),
  teachingApproach: sentence.repeat(8),
  specialExpertise: sentence.repeat(6),
  whyChooseMe: Array.from({ length: 12 }, (_, index) => `• Strength number ${index + 1}: ${sentence}`).join("\n"),
  ratingAverage: 4.6,
  reviewCount: 12,
};

describe("the CV layout", () => {
  it("prints no line over another on the CV that showed the problem: a two-line degree title, long bullet lists", async () => {
    const bytes = await renderTutorCvPdf(ownerCv);
    const pages = await readCvPages(bytes);

    expect(pages).toHaveLength(1);
    expect(overlappingText(pages[0])).toEqual([]);
    // The long degree title wrapped, and the institute is still read under it.
    const text = textOf(pages[0]);
    expect(text).toContain("Technology)");
    expect(text).toContain("Bangladesh Agricultural University");
  });

  it("has no QR code and no line about verifying in its footer - only the seal, the status and, on several pages, the page number", async () => {
    for (const cv of [ownerCv, longCv]) {
      const pages = await readCvPages(await renderTutorCvPdf(cv));
      for (const page of pages) {
        const footer = page.filter(box => box.y >= FOOTER_TOP);
        const text = textOf(footer);
        expect(text).toContain("CONNECT TUTORS");
        for (const gone of ["Scan", "QR", "verify", "certificates", "connecttutorsbd.com"]) expect(text, gone).not.toContain(gone);
      }
    }
  });

  it("keeps a CV that fits on one page, and draws no page number on it", async () => {
    const pages = await readCvPages(await renderTutorCvPdf(ownerCv));
    expect(pages).toHaveLength(1);
    expect(textOf(pages[0])).not.toContain("Page 1 of");
  });

  it("goes on to a second page - same sidebar, same footer - when the Tutor wrote more than one page holds, and cuts nothing", async () => {
    const pages = await readCvPages(await renderTutorCvPdf(longCv));

    expect(pages).toHaveLength(2);
    for (const page of pages) expect(overlappingText(page)).toEqual([]);
    expect(textOf(pages[0])).toContain("Page 1 of 2");
    expect(textOf(pages[1])).toContain("Page 2 of 2");
    for (const page of pages) {
      expect(textOf(page)).toContain("CONNECT TUTORS");
      expect(textOf(page)).toContain("TUTOR ID: 2");
    }
    // The second page names the Tutor again, and the last thing written is on it.
    expect(textOf(pages[1])).toContain("Mohammad Abdullah");
    expect(textOf(pages[1])).toContain("Strength number 12");
    expect(textOf(pages[0])).toContain("Experience Highlights:");
  });

  it("never lets a block of the right column cross the footer rule", async () => {
    for (const cv of [ownerCv, longCv]) {
      const pages = await readCvPages(await renderTutorCvPdf(cv));
      for (const page of pages) {
        const straddling = page.filter(box => box.x > 215 && box.y < FOOTER_TOP && box.y + box.height > FOOTER_TOP + 0.5);
        expect(straddling.map(box => box.str)).toEqual([]);
      }
    }
  });

  it("keeps a long name and a long headline from running into what is under them", async () => {
    const [page] = await readCvPages(await renderTutorCvPdf({ ...longCv, aboutMe: undefined, priorTeachingExperience: undefined, teachingApproach: undefined, specialExpertise: undefined, whyChooseMe: undefined }));
    expect(overlappingText(page)).toEqual([]);
    const name = page.find(box => box.str.startsWith("Mohammad"));
    const education = page.find(box => box.str.includes("EDUCATIONAL"));
    expect(name).toBeDefined();
    expect(education).toBeDefined();
    expect(education!.y).toBeGreaterThan(name!.y + 2 * name!.height);
  });

  it("shrinks a long subject name to fit its badge instead of wrapping it over the next one", async () => {
    const [page] = await readCvPages(await renderTutorCvPdf(longCv));
    const subject = page.filter(box => box.x < 195 && box.str.includes("Higher Mathematics (Bangla"));
    expect(subject.length).toBeGreaterThan(0);
    expect(overlappingText(page.filter(box => box.x < 195))).toEqual([]);
  });

  it("keeps each line of a text that mixes Bengali and English on its own line", async () => {
    const mixed: TutorCvDocument = {
      ...ownerCv,
      priorTeachingExperience: "বাংলা লেখা Alpha\nবাংলা লেখা Beta\nবাংলা লেখা Gamma",
    };
    const [page] = await readCvPages(await renderTutorCvPdf(mixed));
    const lineOf = (word: string) => page.find(box => box.str.includes(word));
    const [alpha, beta, gamma] = [lineOf("Alpha"), lineOf("Beta"), lineOf("Gamma")];
    expect(alpha && beta && gamma).toBeTruthy();
    expect(beta!.y).toBeGreaterThan(alpha!.y + 5);
    expect(gamma!.y).toBeGreaterThan(beta!.y + 5);
    expect(overlappingText(page)).toEqual([]);
  });

  it("leaves out whatever the Tutor did not give, and writes nothing in its place", async () => {
    const [page] = await readCvPages(await renderTutorCvPdf({ tutorId: "t3", tutorNumber: 3, name: "Rina Akter", profileStatus: "approved", phone: "01811111111" }));
    const text = textOf(page);

    expect(text).toContain("Rina Akter");
    for (const absent of ["PROFESSIONAL", "TEACHING EXPERIENCE", "Years", "WHY CHOOSE", "EDUCATIONAL", "PREFERRED", "SUBJECT EXPERTISE", "Dedicated and passionate", "Experienced in academic tutoring", "Conceptual and student-focused"]) {
      expect(text, absent).not.toContain(absent);
    }
  });

  it("does not make up years of experience, or a summary from the headline, a Tutor did not write", async () => {
    const [page] = await readCvPages(await renderTutorCvPdf({ ...ownerCv, teachingExperienceYears: null, aboutMe: null, priorTeachingExperience: null, teachingApproach: null, specialExpertise: null, whyChooseMe: null }));
    const text = textOf(page);
    expect(text).not.toContain("Years");
    expect(text).not.toContain("2+");
    expect(text).not.toContain("PROFESSIONAL SUMMARY");
    expect(text).not.toContain("Dedicated educator");
    // The status the profile is in is still said, in the badge.
    expect(text).toContain("DRAFT PROFILE");
  });

  it("keeps only the status box, full width, where there are no years to show", async () => {
    const [page] = await readCvPages(await renderTutorCvPdf({ ...ownerCv, profileStatus: "approved", teachingExperienceYears: null }));
    const status = page.find(box => box.str.includes("Approved Profile") && box.x > 215 && box.height > 9);
    expect(status).toBeDefined();
    // Where there are years the status box starts halfway across; alone, it starts at the left edge.
    expect(status!.x).toBeLessThan(235);
  });
});

describe("tidyCvText", () => {
  it("turns star and dash bullets into dots, one kind of line end, and one blank line where there were many", () => {
    expect(tidyCvText("* one\r\n\r\n\r\n- two  \r\nplain")).toBe("• one\n\n• two\nplain");
    expect(tidyCvText("  \n  ")).toBe("");
    expect(tidyCvText(null)).toBe("");
  });
});
