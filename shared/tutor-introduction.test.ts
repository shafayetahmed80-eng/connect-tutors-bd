import { describe, expect, it } from "vitest";
import {
  validateIntroductionQuality,
  validateIntroductionField,
  INTRODUCTION_QUALITY_GUIDANCE,
} from "./tutor-introduction";

describe("validateIntroductionQuality", () => {
  it("allows null, undefined, or empty strings", () => {
    expect(validateIntroductionQuality(null, "aboutMe")).toBeNull();
    expect(validateIntroductionQuality(undefined, "aboutMe")).toBeNull();
    expect(validateIntroductionQuality("", "aboutMe")).toBeNull();
    expect(validateIntroductionQuality("   ", "aboutMe")).toBeNull();
  });

  it("accepts a meaningful, descriptive essay", () => {
    const validAboutMe = "I am an experienced Mathematics teacher currently studying at Dhaka University. I love helping students build strong conceptual foundations.";
    expect(validateIntroductionQuality(validAboutMe, "aboutMe")).toBeNull();

    const validApproach = "My teaching methodology focuses on interactive problem solving, regular assessments, and adapting to each student's pace.";
    expect(validateIntroductionQuality(validApproach, "teachingApproach")).toBeNull();

    const validWhyChooseMe = "I have a proven track record of mentoring 50+ students with A+ results in SSC and HSC board exams.";
    expect(validateIntroductionQuality(validWhyChooseMe, "whyChooseMe")).toBeNull();
  });

  it("rejects single repeated characters", () => {
    const repeated = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(validateIntroductionQuality(repeated, "aboutMe")).toBe(INTRODUCTION_QUALITY_GUIDANCE.aboutMe);
    expect(validateIntroductionQuality("........................................", "teachingApproach")).toBe(INTRODUCTION_QUALITY_GUIDANCE.teachingApproach);
  });

  it("rejects long character streaks embedded in text", () => {
    const textWithStreak = "I am a tutor aaaaaaaaaaaaaaaaaaaaaaaa and I teach well";
    expect(validateIntroductionQuality(textWithStreak, "aboutMe")).toBe(INTRODUCTION_QUALITY_GUIDANCE.aboutMe);
  });

  it("rejects single repeated words", () => {
    const wordLoop = "tutor tutor tutor tutor tutor tutor tutor tutor tutor tutor";
    expect(validateIntroductionQuality(wordLoop, "aboutMe")).toBe(INTRODUCTION_QUALITY_GUIDANCE.aboutMe);
  });

  it("rejects two-word loops", () => {
    const loop = "good tutor good tutor good tutor good tutor good tutor";
    expect(validateIntroductionQuality(loop, "aboutMe")).toBe(INTRODUCTION_QUALITY_GUIDANCE.aboutMe);
  });

  it("rejects dummy placeholder keywords", () => {
    const dummy1 = "test test test test test test test test";
    expect(validateIntroductionQuality(dummy1, "aboutMe")).toBe(INTRODUCTION_QUALITY_GUIDANCE.aboutMe);

    const dummy2 = "asdf qwerty demo sample testing blah lorem ipsum";
    expect(validateIntroductionQuality(dummy2, "teachingApproach")).toBe(INTRODUCTION_QUALITY_GUIDANCE.teachingApproach);

    const dummy3 = "N/A N/A N/A N/A N/A N/A N/A N/A";
    expect(validateIntroductionQuality(dummy3, "whyChooseMe")).toBe(INTRODUCTION_QUALITY_GUIDANCE.whyChooseMe);
  });

  it("rejects long text with fewer than 3 words (unbroken gibberish)", () => {
    const gibberish = "abcdefghijklmnopqrstuvwxyz1234567890abcdef";
    expect(validateIntroductionQuality(gibberish, "aboutMe")).toBe(INTRODUCTION_QUALITY_GUIDANCE.aboutMe);
  });

  it("rejects unnaturally low unique letter count", () => {
    const lowUniqueLetters = "ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab";
    expect(validateIntroductionQuality(lowUniqueLetters, "aboutMe")).toBe(INTRODUCTION_QUALITY_GUIDANCE.aboutMe);
  });
});

describe("validateIntroductionField", () => {
  it("enforces dynamic minimum character limits", () => {
    const shortText = "Short text";
    const res = validateIntroductionField(shortText, "aboutMe", { minChars: 30, maxChars: 2000 });
    expect(res).toBe("Write at least 30 characters in About Me.");
  });

  it("enforces dynamic maximum character limits", () => {
    const longText = "A".repeat(50);
    const res = validateIntroductionField(longText, "teachingApproach", { minChars: 10, maxChars: 40 });
    expect(res).toBe("Teaching Approach must be 40 characters or fewer.");
  });

  it("validates quality when within min/max limits", () => {
    const loop = "tutor tutor tutor tutor tutor tutor tutor tutor tutor";
    const res = validateIntroductionField(loop, "whyChooseMe", { minChars: 30, maxChars: 2000 });
    expect(res).toBe(INTRODUCTION_QUALITY_GUIDANCE.whyChooseMe);
  });

  it("returns null when text is valid and within limits", () => {
    const valid = "I have over 5 years of tutoring experience in Cambridge O-Level and Edexcel curriculum.";
    const res = validateIntroductionField(valid, "aboutMe", { minChars: 30, maxChars: 2000 });
    expect(res).toBeNull();
  });
});
