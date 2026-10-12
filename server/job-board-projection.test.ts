import { describe, expect, it } from "vitest";
import {
  buildPublishedTutorJobProjection,
  generateAutoJobId,
  getPublishedTutorJobRefresh,
  toPublicTutorJob,
} from "./job-board-projection";

describe("Job Board published projection", () => {
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
    // A listing has no end date: it stays until an Admin takes the tuition further.
    expect(job).not.toHaveProperty("expiresAt");
    expect(job).not.toHaveProperty("privateAddress");
    expect(job).not.toHaveProperty("addressDetails");
    expect(job).not.toHaveProperty("guardianPhone");
  });

  it("carries the Guardian's Tutoring Time into the projection, and null when there is none", () => {
    const request = {
      requestId: 1506,
      tuitionType: "home" as const,
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: ["English"],
      groupCapacity: null,
      studentCount: 1,
      studentGender: null,
      daysPerWeek: 4,
      preferredTutorGender: "any" as const,
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
      locationLabel: "Mirpur 10, Dhaka",
      budgetAmount: 7000,
      notes: null,
      publishedAt: new Date("2026-08-21T00:00:00.000Z"),
    };

    expect(buildPublishedTutorJobProjection({ ...request, tutoringTime: "16:30" }).tutoringTime).toBe("16:30");
    // Null whether the request says null or says nothing, so the stored
    // projection is never left holding a stale or undefined time.
    expect(buildPublishedTutorJobProjection({ ...request, tutoringTime: null })).toHaveProperty("tutoringTime", null);
    expect(buildPublishedTutorJobProjection({ ...request, tutoringTime: undefined })).toHaveProperty("tutoringTime", null);
    expect(buildPublishedTutorJobProjection(request)).toHaveProperty("tutoringTime", null);
  });

  it("keeps the Tutoring Time on an online tuition, where the location is dropped", () => {
    const job = buildPublishedTutorJobProjection({
      requestId: 1507,
      tuitionType: "online",
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: ["English"],
      groupCapacity: null,
      studentCount: 1,
      studentGender: null,
      daysPerWeek: 4,
      tutoringTime: "19:00",
      preferredTutorGender: "any",
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
      locationLabel: "Mirpur 10, Dhaka",
      budgetAmount: null,
      notes: null,
      publishedAt: new Date("2026-08-21T00:00:00.000Z"),
    });

    expect(job.locationLabel).toBeNull();
    expect(job.tutoringTime).toBe("19:00");
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
      tutoringTime: "16:30",
      guardianName: "Private Guardian",
      guardianPhone: "+8801516131411",
      studentFirstName: "Private Student",
      notes: "Please start after Eid",
      instituteName: "Dhaka College",
      heardAboutUs: "facebook",
      exactAddress: "House 99, Road 7",
      addressDetails: "Use the west entrance",
    });

    expect(job).toMatchObject({
      jobId: "8302",
      title: "Need English Medium Tutor for Standard 2 Student - 4 Days / Week",
      locationLabel: "Mirpur 10, Dhaka",
      directionLabel: "Mirpur 10, Dhaka",
      budgetAmount: 7000,
      // A time of day is public the way Days / Week is: it says when, not who or where.
      tutoringTime: "16:30",
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
    expect(job).not.toHaveProperty("addressDetails");
  });

  it("reads the Tutoring Time as null when a listing has none, whether the row holds null or no value at all", () => {
    const row = {
      id: 9,
      publicJobId: "8303",
      tuitionType: "home" as const,
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: "[\"English\"]",
      studentCount: 1,
      studentGender: null,
      preferredTutorGender: "any" as const,
      daysPerWeek: 4,
      budgetAmount: 7000,
      country: "Bangladesh",
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
      locationLabel: "Mirpur 10, Dhaka",
      directionLabel: "Mirpur 10, Dhaka",
      publishedAt: new Date("2026-08-21T00:00:00.000Z"),
      notes: null,
    };

    // A listing published before the field existed comes back with null; a
    // caller that never selected the column has no key at all. Both read as
    // null, so the board leaves the row out either way.
    expect(toPublicTutorJob({ ...row, tutoringTime: null })).toHaveProperty("tutoringTime", null);
    expect(toPublicTutorJob(row)).toHaveProperty("tutoringTime", null);
    expect(toPublicTutorJob({ ...row, tutoringTime: "00:00" })).toHaveProperty("tutoringTime", "00:00");
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

  it("refreshes the Tutoring Time on re-publish, and sets it to null when the Guardian has since cleared it", () => {
    const request = {
      requestId: 1503,
      tuitionType: "online" as const,
      category: "English Medium",
      classCourse: "Standard 3",
      subjects: ["English"],
      groupCapacity: null,
      studentCount: 1,
      studentGender: null,
      daysPerWeek: 3,
      preferredTutorGender: "any" as const,
      cityLocationId: null,
      locationId: null,
      locationLabel: null,
      budgetAmount: null,
      notes: null,
      publishedAt: new Date("2026-08-21T00:00:00.000Z"),
    };

    const withTime = getPublishedTutorJobRefresh(buildPublishedTutorJobProjection({ ...request, tutoringTime: "16:30" }));
    expect(withTime).toMatchObject({ tutoringTime: "16:30", publicationStatus: "published" });

    // The refresh is written over the stored listing. A cleared time has to
    // arrive as null: a missing key is skipped by the update and the board
    // would go on showing the time the Guardian took off.
    const cleared = getPublishedTutorJobRefresh(buildPublishedTutorJobProjection({ ...request, tutoringTime: null }));
    expect(cleared).toHaveProperty("tutoringTime", null);
    const neverSet = getPublishedTutorJobRefresh(buildPublishedTutorJobProjection(request));
    expect(neverSet).toHaveProperty("tutoringTime", null);
  });
});
