import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  guardianProfiles,
  guardianRequestNotifications,
  locations,
  tutorJobInterests,
  tutorJobs,
  tutorNotifications,
  tutorRequestPublicationEvents,
  tutorRequests,
  tutors,
  users,
} from "../drizzle/schema";
import { createAdminPostedTuition, getDb, listTutorApplicationsWithGuardianContact, listTutorJobInterestsForTutor } from "./db";

// Real tuitions posted through the real path, then put at each stage a Tutor's application can reach.
// Everything made here is removed again, and nothing else is touched.
const tag = randomBytes(3).toString("hex");
const made = { userIds: [] as number[], tutorIds: [] as string[], requestIds: [] as number[] };
let city = "";
let area = "";
let tutorArea = "";
let adminUserId = 0;
const tutorA = `gc-a-${tag}`;
const tutorB = `gc-b-${tag}`;

beforeAll(async () => {
  const database = (await getDb())!;
  city = `test-gcontact-city-${tag}`;
  area = `test-gcontact-area-${tag}`;
  tutorArea = `test-gcontact-tutor-area-${tag}`;
  await database.insert(locations).values({ id: city, label: "Contact City", type: "city", country: "Bangladesh" });
  await database.insert(locations).values([
    { id: area, label: "Contact Area", type: "area", country: "Bangladesh", parentId: city },
    { id: tutorArea, label: "Contact Tutor Area", type: "area", country: "Bangladesh", parentId: city },
  ]);

  const [admin] = await database.insert(users).values({ openId: `test:gcontact:${tag}:admin`, name: "Contact Admin", role: "admin", loginMethod: "password" });
  adminUserId = Number(admin.insertId);
  made.userIds.push(adminUserId);
  for (const [tutorId, label] of [[tutorA, "a"], [tutorB, "b"]] as const) {
    const [user] = await database.insert(users).values({ openId: `test:gcontact:${tag}:${label}`, name: `Contact Tutor ${label}`, role: "tutor", loginMethod: "password" });
    made.userIds.push(Number(user.insertId));
    // Away from the area the Guardians are in, and the tuitions name no place: no alert is sent to this Tutor.
    await database.insert(tutors).values({ id: tutorId, userId: Number(user.insertId), name: `Contact Tutor ${label}`, gender: "female", locationId: tutorArea, profileStatus: "approved" });
    made.tutorIds.push(tutorId);
  }
});

afterAll(async () => {
  const database = (await getDb())!;
  if (made.requestIds.length) {
    const jobIds = (await database.select({ id: tutorJobs.id }).from(tutorJobs).where(inArray(tutorJobs.tutorRequestId, made.requestIds))).map(row => row.id);
    if (jobIds.length) await database.delete(tutorJobInterests).where(inArray(tutorJobInterests.tutorJobId, jobIds));
    await database.delete(guardianRequestNotifications).where(inArray(guardianRequestNotifications.tutorRequestId, made.requestIds));
    await database.delete(tutorRequestPublicationEvents).where(inArray(tutorRequestPublicationEvents.tutorRequestId, made.requestIds));
    await database.delete(tutorJobs).where(inArray(tutorJobs.tutorRequestId, made.requestIds));
    const guardianIds = (await database.select({ id: tutorRequests.guardianUserId }).from(tutorRequests).where(inArray(tutorRequests.id, made.requestIds))).map(row => row.id);
    await database.delete(tutorRequests).where(inArray(tutorRequests.id, made.requestIds));
    if (guardianIds.length) {
      await database.delete(guardianProfiles).where(inArray(guardianProfiles.userId, guardianIds));
      await database.delete(users).where(inArray(users.id, guardianIds));
    }
  }
  if (made.tutorIds.length) {
    await database.delete(tutorNotifications).where(inArray(tutorNotifications.tutorId, made.tutorIds));
    await database.delete(tutors).where(inArray(tutors.id, made.tutorIds));
  }
  if (made.userIds.length) await database.delete(users).where(inArray(users.id, made.userIds));
  await database.delete(locations).where(inArray(locations.id, [area, tutorArea]));
  await database.delete(locations).where(inArray(locations.id, [city]));
});

let guardianCount = 0;
/** A Live tuition with its own Guardian; returns the request and the Guardian's name and stored number. */
async function postTuition() {
  const database = (await getDb())!;
  guardianCount += 1;
  const name = `Contact Guardian ${tag} ${guardianCount}`;
  const phone = `017${Math.floor(10000000 + Math.random() * 89999999)}`;
  const { id } = await createAdminPostedTuition({
    adminUserId,
    guardian: { name, phone, cityLocationId: city, locationId: area },
    request: {
      tuitionType: "home", category: "bangla-medium", curriculumType: null, classCourse: "Class 5", subjects: JSON.stringify(["Math"]),
      groupCapacity: null, packageDurationMonths: null, studentCount: 1, daysPerWeek: 3, preferredGender: "any", studentGender: null,
      addressDetails: null, tuitionCityLocationId: null, tuitionLocationId: null, tuitionLocationLabel: null,
      budgetAmount: 5000, instituteName: null, heardAboutUs: null, notes: null, contactConsent: "not_required", monthlyBudget: null, locationText: "Test area",
    },
  });
  made.requestIds.push(id);
  const [request] = await database.select({ guardianUserId: tutorRequests.guardianUserId }).from(tutorRequests).where(eq(tutorRequests.id, id)).limit(1);
  const [profile] = await database.select({ phone: guardianProfiles.phone }).from(guardianProfiles).where(eq(guardianProfiles.userId, request!.guardianUserId)).limit(1);
  const [job] = await database.select({ id: tutorJobs.id }).from(tutorJobs).where(eq(tutorJobs.tutorRequestId, id)).limit(1);
  return { requestId: id, jobId: job!.id, name, phone: profile!.phone };
}

type Interest = "interested" | "shortlisted" | "matched" | "withdrawn";
async function apply(jobId: number, tutorId: string, status: Interest) {
  const database = (await getDb())!;
  await database.insert(tutorJobInterests).values({ tutorJobId: jobId, tutorId, status });
}

/** The tuition's own side of an appointment: who holds it, and how far it has got. */
async function setTuition(requestId: number, set: Partial<typeof tutorRequests.$inferInsert>) {
  const database = (await getDb())!;
  await database.update(tutorRequests).set(set).where(eq(tutorRequests.id, requestId));
}

const confirmedAt = new Date("2026-09-05T08:00:00.000Z");
const appointedAt = new Date("2026-09-04T08:00:00.000Z");

describe("which applications carry the Guardian's name and number", () => {
  it("is the Tutor's own Appointed and Confirmed ones, and nothing else, with the number as the Guardian stored it", async () => {
    const applied = await postTuition();
    const shortlisted = await postTuition();
    const appointed = await postTuition();
    const confirmed = await postTuition();
    const closed = await postTuition();
    const cancelled = await postTuition();
    const withdrawn = await postTuition();
    const passedOver = await postTuition();

    await apply(applied.jobId, tutorA, "interested");
    await apply(shortlisted.jobId, tutorA, "shortlisted");
    await apply(appointed.jobId, tutorA, "matched");
    await setTuition(appointed.requestId, { tutorId: tutorA, status: "matched", appointedAt });
    await apply(confirmed.jobId, tutorA, "matched");
    await setTuition(confirmed.requestId, { tutorId: tutorA, status: "matched", appointedAt, appointmentConfirmedAt: confirmedAt });
    await apply(closed.jobId, tutorA, "matched");
    await setTuition(closed.requestId, { tutorId: tutorA, status: "matched", appointedAt, appointmentConfirmedAt: confirmedAt, paymentStatus: "full_paid" });
    await apply(cancelled.jobId, tutorA, "matched");
    await setTuition(cancelled.requestId, { tutorId: tutorA, status: "closed", publicationState: "closed", appointedAt, cancelledAt: confirmedAt });
    await apply(withdrawn.jobId, tutorA, "withdrawn");
    // Still marked matched for A, but the tuition now belongs to B: A was passed over.
    await apply(passedOver.jobId, tutorA, "matched");
    await apply(passedOver.jobId, tutorB, "matched");
    await setTuition(passedOver.requestId, { tutorId: tutorB, status: "matched", appointedAt });

    const rows = await listTutorApplicationsWithGuardianContact(tutorA);
    const byRequest = new Map(rows.map(row => [row.requestId, row]));
    const contactOf = (tuition: { requestId: number }) => {
      const row = byRequest.get(tuition.requestId)!;
      return { guardianName: row.guardianName, guardianPhone: row.guardianPhone };
    };
    const none = { guardianName: null, guardianPhone: null };

    // Every application is still listed; only the two at a contact stage carry anything.
    expect(rows).toHaveLength(8);
    expect(contactOf(appointed)).toEqual({ guardianName: appointed.name, guardianPhone: appointed.phone });
    expect(contactOf(confirmed)).toEqual({ guardianName: confirmed.name, guardianPhone: confirmed.phone });
    expect(contactOf(applied)).toEqual(none);
    expect(contactOf(shortlisted)).toEqual(none);
    expect(contactOf(closed)).toEqual(none);
    expect(contactOf(cancelled)).toEqual(none);
    expect(contactOf(withdrawn)).toEqual(none);
    expect(contactOf(passedOver)).toEqual(none);

    // B holds the one A was passed over on, and reads that Guardian - and only that one.
    const bRows = await listTutorApplicationsWithGuardianContact(tutorB);
    expect(bRows).toHaveLength(1);
    expect(bRows[0]).toMatchObject({ requestId: passedOver.requestId, guardianName: passedOver.name, guardianPhone: passedOver.phone });

    // Nothing of the contact reaches the plain list the Job Board and the Admin's copy read.
    const plain = await listTutorJobInterestsForTutor(tutorA);
    expect(plain).toHaveLength(8);
    for (const row of plain) {
      expect(row).not.toHaveProperty("guardianName");
      expect(row).not.toHaveProperty("guardianPhone");
    }
  });

  it("leaves a Tutor with no applications with an empty list", async () => {
    const database = (await getDb())!;
    const [user] = await database.insert(users).values({ openId: `test:gcontact:${tag}:none`, name: "Contact Tutor none", role: "tutor", loginMethod: "password" });
    made.userIds.push(Number(user.insertId));
    const lonely = `gc-n-${tag}`;
    await database.insert(tutors).values({ id: lonely, userId: Number(user.insertId), name: "Contact Tutor none", gender: "female", locationId: tutorArea, profileStatus: "approved" });
    made.tutorIds.push(lonely);

    await expect(listTutorApplicationsWithGuardianContact(lonely)).resolves.toEqual([]);
  });
});
