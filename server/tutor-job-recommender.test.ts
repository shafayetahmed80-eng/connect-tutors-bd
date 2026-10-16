import { describe, expect, it } from "vitest";
import { scoreJobForTutor, type PublicTutorJob, type TutorMatchProfile } from "./tutor-job-recommender";

const sampleTutor: TutorMatchProfile = {
  tutorId: "tutor-101",
  gender: "male",
  currentCityId: "loc-dhaka",
  currentLocationId: "loc-dhanmondi",
  teachingAreaIds: ["loc-dhanmondi", "loc-kalabagan", "loc-lalmatia"],
  subjectNames: ["Physics", "Higher Mathematics", "Chemistry"],
  classLevelNames: ["Class 9", "Class 10", "HSC"],
  tuitionTypes: ["home", "online"],
  curriculaNames: ["English Medium", "Bangla Medium"],
};

const sampleJob: PublicTutorJob = {
  id: 1,
  publicJobId: "CT-J1042",
  tuitionType: "home",
  category: "English Medium",
  classCourse: "Class 10",
  subjects: "Physics, Higher Mathematics",
  studentCount: 1,
  studentGender: "male",
  preferredTutorGender: "male",
  daysPerWeek: 3,
  tutoringTime: "18:00",
  budgetAmount: 8000,
  country: "Bangladesh",
  cityLocationId: "loc-dhaka",
  locationId: "loc-dhanmondi",
  locationLabel: "Dhanmondi, Dhaka",
  notes: "Needs attentive tutor",
  directionLabel: null,
  publishedAt: new Date(),
};

describe("Tutor Job Recommender: scoreJobForTutor", () => {
  it("gives 100 points and perfect grade for an exact matching job", () => {
    const result = scoreJobForTutor(sampleJob, sampleTutor);
    expect(result.score).toBe(100);
    expect(result.grade).toBe("perfect");
    expect(result.reasons).toContain("📍 পছন্দের এলাকা");
    expect(result.reasons).toContain("📚 সব বিষয় মিলেছে");
    expect(result.reasons).toContain("🎓 শ্রেণি মিলেছে");
    expect(result.reasons).toContain("🏷️ কারিকুলাম মিলেছে");
    expect(result.reasons).toContain("👥 অভিভাবকের পছন্দের জেন্ডার");
    expect(result.reasons).toContain("🏠 টিউশন মাধ্যম");
  });

  it("handles same city match with partial subjects", () => {
    const cityJob: PublicTutorJob = {
      ...sampleJob,
      locationId: "loc-mirpur", // Not in tutor's teaching areas, but in same city
      cityLocationId: "loc-dhaka",
      subjects: "Physics, Biology", // Only Physics matches tutor
      classCourse: "Class 10",
      category: "Bangla Medium",
    };

    const result = scoreJobForTutor(cityJob, sampleTutor);
    // Location: 22 (city)
    // Subject: 18 (partial)
    // Class: 15
    // Curriculum: 5 (Bangla Medium matches)
    // Gender: 8 (male)
    // Mode: 7 (home)
    // Total = 75
    expect(result.score).toBe(75);
    expect(result.grade).toBe("high");
    expect(result.reasons).toContain("📍 একই শহর");
    expect(result.reasons).toContain("📚 বিষয় মিলেছে");
  });

  it("returns 0 score when guardian specifically requested a different gender", () => {
    const femaleJob: PublicTutorJob = {
      ...sampleJob,
      preferredTutorGender: "female", // Tutor is male
    };

    const result = scoreJobForTutor(femaleJob, sampleTutor);
    expect(result.score).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  it("accepts preferredTutorGender 'any'", () => {
    const anyGenderJob: PublicTutorJob = {
      ...sampleJob,
      preferredTutorGender: "any",
    };

    const result = scoreJobForTutor(anyGenderJob, sampleTutor);
    expect(result.score).toBe(100);
  });
});
