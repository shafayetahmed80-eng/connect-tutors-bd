import { describe, expect, it } from "vitest";
import {
  DEFAULT_JOB_EXPIRY_DAYS,
  buildPublishedTutorJobProjection,
  generateAutoJobId,
  getPublishedTutorJobRefresh,
  toPublicTutorJob,
} from "./job-board-projection";

describe("Job Board published projection", () => {
  it("uses the approved 14-day availability window by default", () => {
    expect(DEFAULT_JOB_EXPIRY_DAYS).toBe(14);
  });

  it("creates a deterministic immutable auto Job ID from the source request", () => {
    expect(generateAutoJobId(1503)).toBe("8302");
    expect(generateAutoJobId(1503)).toBe(generateAutoJobId(1503));
    expect(() => generateAutoJobId(0)).toThrow("positive");
  });

  it("builds a projection with a configurable default expiry and only safe location data", () => {
    const publishedAt = new Date("2026-08-21T00:00:00.000Z");
    const job = buildPublishedTutorJobProjection({
      requestId: 1503,
      tuitionType: "home",
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: ["English", "Mathematics"],
      groupCapacity: null,
      studentCount: 2,
      studentGender: "female",
      daysPerWeek: 4,
      preferredTutorGender: "female",
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
      locationLabel: "Mirpur 10, Dhaka",
      budgetAmount: 7000,
      publishedAt,
      privateAddress: "House 99, Road 7",
      addressDetails: "Use the west entrance",
      guardianPhone: "+8801516131411",
    });

    expect(job.publicJobId).toBe("8302");
    expect(job.directionLabel).toBe("Mirpur 10, Dhaka");
    expect(job.studentCount).toBe(2);
    expect(job.studentGender).toBe("female");
    expect(job.expiresAt.getTime()).toBe(publishedAt.getTime() + DEFAULT_JOB_EXPIRY_DAYS * 86_400_000);
    expect(job).not.toHaveProperty("privateAddress");
    expect(job).not.toHaveProperty("addressDetails");
    expect(job).not.toHaveProperty("guardianPhone");
  });

  it("maps Group capacity only to the safe public student count", () => {
    const groupJob = buildPublishedTutorJobProjection({
      requestId: 1504,
      tuitionType: "group",
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: ["English"],
      groupCapacity: 8,
      daysPerWeek: 4,
      preferredTutorGender: "any",
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
      locationLabel: "Mirpur 10, Dhaka",
      budgetAmount: null,
      publishedAt: new Date("2026-08-21T00:00:00.000Z"),
      privateAddress: "House 99, Road 7",
      guardianPhone: "+8801516131411",
    });

    expect(groupJob.studentCount).toBe(8);
    expect(groupJob).not.toHaveProperty("privateAddress");
    expect(groupJob).not.toHaveProperty("guardianPhone");
    expect(groupJob).not.toHaveProperty("packageDurationMonths");
    expect(buildPublishedTutorJobProjection({
      requestId: 1505,
      tuitionType: "home",
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: ["English"],
      groupCapacity: 8,
      daysPerWeek: 4,
      preferredTutorGender: "any",
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
      locationLabel: "Mirpur 10, Dhaka",
      budgetAmount: null,
      publishedAt: new Date("2026-08-21T00:00:00.000Z"),
    }).studentCount).toBe(1);
  });

  it("returns a public read model without Guardian, student, or exact-address data", () => {
    const job = toPublicTutorJob({
      id: 8,
      publicJobId: "8302",
      tuitionType: "home",
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: "[\"English\",\"Mathematics\"]",
      studentCount: 1,
      studentGender: null,
      preferredTutorGender: "female",
      daysPerWeek: 4,
      budgetAmount: 7000,
      country: "Bangladesh",
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
      locationLabel: "Mirpur 10, Dhaka",
      directionLabel: "Mirpur 10, Dhaka",
      publishedAt: new Date("2026-08-21T00:00:00.000Z"),
      expiresAt: new Date("2026-09-20T00:00:00.000Z"),
      guardianName: "Private Guardian",
      guardianPhone: "+8801516131411",
      studentFirstName: "Private Student",
      notes: "Please start after Eid",
      instituteName: "Dhaka College",
      heardAboutUs: "facebook",
      exactAddress: "House 99, Road 7",
    });

    expect(job).toMatchObject({
      jobId: "8302",
      title: "Need English Medium Tutor for Standard 2 Student - 4 Days / Week",
      locationLabel: "Mirpur 10, Dhaka",
      directionLabel: "Mirpur 10, Dhaka",
      budgetAmount: 7000,
      // Published on purpose: nothing reaches this board without an Admin
      // reading the request and approving it. Contacts, the student's name and
      // the exact address stay out - those are never reviewed into publication.
      notes: "Please start after Eid",
    });
    // Neither answer is a Tutor's to read: the referral is ours to count,
    // and the student's institute beside a city and an area narrows an
    // address further than the Guardian agreed to.
    expect(job).not.toHaveProperty("instituteName");
    expect(job).not.toHaveProperty("heardAboutUs");
    expect(job).not.toHaveProperty("guardianName");
    expect(job).not.toHaveProperty("guardianPhone");
    expect(job).not.toHaveProperty("studentFirstName");
    expect(job).not.toHaveProperty("exactAddress");
  });

  it("refreshes every safe job-facing field on re-publish while preserving the immutable public Job ID", () => {
    const refreshed = getPublishedTutorJobRefresh(buildPublishedTutorJobProjection({
      requestId: 1503,
      tuitionType: "online",
      category: "English Medium",
      classCourse: "Standard 3",
      subjects: ["English"],
      groupCapacity: null,
      daysPerWeek: 3,
      preferredTutorGender: "any",
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
      locationLabel: "Mirpur 10, Dhaka",
      budgetAmount: null,
      publishedAt: new Date("2026-08-21T00:00:00.000Z"),
    }));

    expect(refreshed).toMatchObject({
      tuitionType: "online",
      classCourse: "Standard 3",
      subjects: "[\"English\"]",
      budgetAmount: null,
      locationLabel: null,
      directionLabel: null,
      publicationStatus: "published",
    });
    expect(refreshed).not.toHaveProperty("publicJobId");
    expect(refreshed).not.toHaveProperty("tutorRequestId");
  });
});
