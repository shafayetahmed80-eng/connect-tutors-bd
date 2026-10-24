import { describe, expect, it } from "vitest";
import {
  extractCurriculumHashtags,
  extractLocationHashtags,
  extractPreferenceHashtags,
  extractSubjectHashtags,
  formatHashtags,
  generateBulkSmartHashtags,
  generateSmartHashtags,
  toCamelCaseTag,
} from "./facebook-hashtags";
import type { FacebookPostJobInput } from "./facebook-post";

describe("facebook-hashtags", () => {
  it("converts strings to clean camel case tags", () => {
    expect(toCamelCaseTag("Dhanmondi, Dhaka")).toBe("DhanmondiDhaka");
    expect(toCamelCaseTag("English Medium - Cambridge")).toBe("EnglishMediumCambridge");
    expect(toCamelCaseTag("")).toBe("");
  });

  it("extracts recognized location hashtags for offline and online tuitions", () => {
    const job1: FacebookPostJobInput = {
      id: 1,
      tuitionType: "home",
      locationText: "Dhanmondi",
      tuitionLocationLabel: "Dhanmondi, Dhaka",
    };
    const tags1 = extractLocationHashtags(job1);
    expect(tags1).toContain("DhanmondiTuition");
    expect(tags1).toContain("DhanmondiTutors");

    const jobOnline: FacebookPostJobInput = {
      id: 2,
      tuitionType: "online",
      locationText: "Anywhere",
    };
    const tagsOnline = extractLocationHashtags(jobOnline);
    expect(tagsOnline).toEqual(["OnlineTuition", "OnlineTutorBD"]);
  });

  it("extracts curriculum hashtags accurately", () => {
    const emJob: FacebookPostJobInput = {
      id: 10,
      category: "English Medium",
      curriculumType: "Cambridge",
    };
    const tags = extractCurriculumHashtags(emJob);
    expect(tags).toContain("EnglishMediumTutors");
    expect(tags).toContain("OLevelTutors");

    const evJob: FacebookPostJobInput = {
      id: 11,
      category: "English Version",
      curriculumType: "National Curriculum",
    };
    const evTags = extractCurriculumHashtags(evJob);
    expect(evTags).toContain("EnglishVersionTuition");
  });

  it("extracts subject hashtags correctly", () => {
    const job: FacebookPostJobInput = {
      id: 20,
      subjects: JSON.stringify(["Physics", "Higher Math", "Chemistry"]),
    };
    const tags = extractSubjectHashtags(job);
    expect(tags).toContain("PhysicsTutor");
    expect(tags).toContain("MathTutor");
    expect(tags).toContain("ChemistryTutor");
  });

  it("extracts institute preference hashtags", () => {
    const job: FacebookPostJobInput = {
      id: 30,
      instituteName: "BUET or DU preferred",
      preferredGender: "female",
    };
    const tags = extractPreferenceHashtags(job);
    expect(tags).toContain("BUETTutors");
    expect(tags).toContain("DhakaUniversityTutors");
    expect(tags).toContain("FemaleTutorWanted");
  });

  it("extracts institute preference hashtags from job.notes as fallback/addition", () => {
    const job: FacebookPostJobInput = {
      id: 31,
      notes: "Strictly BUET or Medical tutors needed",
      preferredGender: "male",
    };
    const tags = extractPreferenceHashtags(job);
    expect(tags).toContain("BUETTutors");
    expect(tags).toContain("MedicalTutors");
    expect(tags).toContain("MaleTutorWanted");
  });

  it("generates deduplicated smart hashtags for a single tuition", () => {
    const job: FacebookPostJobInput = {
      id: 101,
      tuitionType: "home",
      tuitionLocationLabel: "Uttara, Dhaka",
      locationText: "Uttara Sector 7",
      category: "English Medium",
      subjects: JSON.stringify(["Physics"]),
      instituteName: "BUET",
      preferredGender: "male",
    };

    const tags = generateSmartHashtags(job);
    expect(tags[0]).toBe("#ConnectTutors");
    expect(tags).toContain("#UttaraTuition");
    expect(tags).toContain("#EnglishMediumTutors");
    expect(tags).toContain("#PhysicsTutor");
    expect(tags).toContain("#BUETTutors");
    expect(tags).toContain("#DhakaTutors");

    const formatted = formatHashtags(tags);
    expect(formatted).toMatch(/^#ConnectTutors/);
    expect(formatted).toContain("#UttaraTuition");
  });

  it("generates bulk smart hashtags across multiple jobs", () => {
    const jobs: FacebookPostJobInput[] = [
      {
        id: 1,
        tuitionType: "home",
        tuitionLocationLabel: "Dhanmondi",
        category: "English Medium",
      },
      {
        id: 2,
        tuitionType: "home",
        tuitionLocationLabel: "Mirpur",
        category: "Bangla Medium",
      },
    ];

    const bulkTags = generateBulkSmartHashtags(jobs);
    expect(bulkTags).toContain("#ConnectTutors");
    expect(bulkTags).toContain("#DhanmondiTuition");
    expect(bulkTags).toContain("#MirpurTuition");
    expect(bulkTags).toContain("#EnglishMediumTutors");
    expect(bulkTags).toContain("#BanglaMediumTuition");
  });
});
