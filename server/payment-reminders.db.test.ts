import { randomBytes } from "node:crypto";
import { and, eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { adminPushSubscriptions, guardianProfiles, locations, tuitionPayments, tutorNotifications, tutorRequestOperationEvents, tutorRequests, users } from "../drizzle/schema";

const push = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("./chat-push", async importOriginal => ({ ...(await importOriginal<typeof import("./chat-push")>()), sendWebPushNotification: push.send }));

import { decideTuitionPayment, getDb, getTuitionPaymentLedger, recordTuitionPayment, reportTuitionPayment, runPaymentReminders } from "./db";

// The Tutor is seeded by scripts/seed-dev-discovery-fixtures.mjs. Everything else this
// test makes is removed afterwards, by id, and every run below is asked for this one
// tuition only, so whatever else the database holds changes nothing. The clock is the
// run's own `now`: the tuition was confirmed on 1 September 2026 at 10:00 in Dhaka, so
// its first window ends on 8 September and the rest is due on 1 October.
const tutorId = "dev-tutor-amina";
const tag = randomBytes(3).toString("hex");
const confirmedAt = new Date("2026-09-01T04:00:00Z");
const noon = (month: number, day: number) => new Date(Date.UTC(2026, month - 1, day, 6)); // 12:00 in Dhaka

let guardianUserId = 0;
let adminUserId = 0;
let requestId = 0;
let adminEndpoint = "";
const city = `test-remind-city-${tag}`;
const area = `test-remind-area-${tag}`;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

const run = (now: Date, dryRun = false) => runPaymentReminders({ now, dryRun, onlyRequestIds: [requestId] });
const keyFor = (kind: string, round = 0) => `payment-reminder:${kind}:${requestId}:${tutorId}:${round}`;
async function notice(key: string) {
  const db = await database();
  const [row] = await db.select().from(tutorNotifications).where(eq(tutorNotifications.deduplicationKey, key));
  return row;
}

beforeAll(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const db = await database();
  await db.insert(locations).values({ id: city, label: "Test City", type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: area, label: "Test Area", type: "area", country: "Bangladesh", parentId: city });
  const [guardian] = await db.insert(users).values({ openId: `test-remind-g-${tag}`, name: `Reminder Guardian ${tag}`, role: "guardian" });
  guardianUserId = Number(guardian.insertId);
  const [admin] = await db.insert(users).values({ openId: `test-remind-a-${tag}`, name: `Reminder Admin ${tag}`, role: "admin" });
  adminUserId = Number(admin.insertId);
  await db.insert(guardianProfiles).values({ userId: guardianUserId, guardianId: `S${tag}11`, phone: `+88017${Math.floor(10000000 + Math.random() * 89999999)}`, gender: "female", cityLocationId: city, locationId: area });
  const [made] = await db.insert(tutorRequests).values({
    guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 5", subjects: JSON.stringify(["Math"]),
    daysPerWeek: 3, locationText: "Dhaka", budgetAmount: 8000, status: "matched", tutorId,
    appointedAt: new Date("2026-08-28T04:00:00Z"), appointmentConfirmedAt: confirmedAt,
  });
  requestId = Number(made.insertId);
  adminEndpoint = `https://push.example.test/${tag}`;
  await db.insert(adminPushSubscriptions).values({ adminId: adminUserId, endpoint: adminEndpoint, p256dh: "key", auth: "auth" });
});

beforeEach(() => {
  push.send.mockReset();
  push.send.mockResolvedValue({ ok: true, gone: false });
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  await db.delete(adminPushSubscriptions).where(eq(adminPushSubscriptions.adminId, adminUserId));
  if (requestId) {
    const payments = await db.select({ id: tuitionPayments.id }).from(tuitionPayments).where(eq(tuitionPayments.tutorRequestId, requestId));
    const keys = [
      `closed:${requestId}:${tutorId}`,
      ...payments.flatMap(payment => [`payment:${payment.id}:recorded`, `payment:${payment.id}:verified`, `payment:${payment.id}:rejected`]),
    ];
    await db.delete(tutorNotifications).where(and(eq(tutorNotifications.tutorId, tutorId), inArray(tutorNotifications.deduplicationKey, keys)));
    await db.delete(tutorNotifications).where(like(tutorNotifications.deduplicationKey, `payment-reminder:%:${requestId}:${tutorId}:%`));
    await db.delete(tuitionPayments).where(eq(tuitionPayments.tutorRequestId, requestId));
    await db.delete(tutorRequestOperationEvents).where(eq(tutorRequestOperationEvents.tutorRequestId, requestId));
    await db.delete(tutorRequests).where(eq(tutorRequests.id, requestId));
  }
  await db.delete(guardianProfiles).where(eq(guardianProfiles.userId, guardianUserId));
  await db.delete(users).where(inArray(users.id, [guardianUserId, adminUserId]));
  await db.delete(locations).where(eq(locations.id, area));
  await db.delete(locations).where(eq(locations.id, city));
});

describe("the reduced-rate window", () => {
  it("sends nothing while the window's last day is more than two days off", async () => {
    const ledger = (await getTuitionPaymentLedger(requestId))!;
    // The test needs a reduced rate to exist; the default site limits have one.
    expect(ledger.charge!.early).toBeLessThan(ledger.charge!.total);

    expect(await run(noon(9, 3))).toMatchObject({ checked: 1, sent: 0 });
  });

  it("only counts on a dry run, and leaves the Tutor and the Admins alone", async () => {
    expect(await run(noon(9, 6), true)).toMatchObject({ sent: 1, counts: { window: 1, second: 0, overdue: 0 }, dryRun: true });

    expect(await notice(keyFor("window"))).toBeUndefined();
    expect(push.send).not.toHaveBeenCalled();
  });

  it("tells the Tutor how much more earns it, and the Admins in one line", async () => {
    const early = (await getTuitionPaymentLedger(requestId))!.charge!.early;

    expect(await run(noon(9, 6))).toMatchObject({ sent: 1, counts: { window: 1, second: 0, overdue: 0 } });

    const row = await notice(keyFor("window"));
    expect(row).toMatchObject({ tutorId, type: "payment", actionPath: "/tutor/dashboard/payment", readAt: null });
    expect(row?.title).toContain("কম রেটে চার্জ");
    expect(row?.message).toContain(`${early.toLocaleString("en-US")} টাকা`);
    expect(push.send).toHaveBeenCalledWith(expect.objectContaining({ endpoint: adminEndpoint }), {
      title: "Payment reminders sent",
      body: "1 reminder went to Tutors: 1 reduced-rate window closing.",
      url: "/admin/confirmed-jobs",
    });
  });

  it("sends it once: a second run, even after the Tutor read it, changes nothing", async () => {
    const db = await database();
    await db.update(tutorNotifications).set({ readAt: new Date() }).where(eq(tutorNotifications.deduplicationKey, keyFor("window")));

    expect(await run(noon(9, 6))).toMatchObject({ sent: 0 });
    expect(await run(noon(9, 7))).toMatchObject({ sent: 0 });

    expect((await notice(keyFor("window")))?.readAt).not.toBeNull();
    expect(push.send).not.toHaveBeenCalled();
  });
});

describe("the due date and after it", () => {
  it("sends the due-date reminder three days before, for the whole balance", async () => {
    const total = (await getTuitionPaymentLedger(requestId))!.charge!.total;

    expect(await run(noon(9, 27))).toMatchObject({ sent: 0 });
    expect(await run(noon(9, 28))).toMatchObject({ sent: 1, counts: { window: 0, second: 1, overdue: 0 } });

    const row = await notice(keyFor("second"));
    expect(row?.message).toContain("১ অক্টোবর");
    expect(row?.message).toContain(`${total.toLocaleString("en-US")} টাকা`);
  });

  it("then sends an overdue reminder for what is left after a part payment, and one more a week later", async () => {
    const before = (await getTuitionPaymentLedger(requestId))!.charge!;
    const part = Math.floor(before.first / 2);
    const recorded = await recordTuitionPayment({ adminUserId, requestId, amount: part, method: "cash", paidOn: "2026-09-20" });
    expect(recorded.outcome).toBe("recorded");

    expect(await run(noon(10, 3))).toMatchObject({ sent: 1, counts: { window: 0, second: 0, overdue: 1 } });
    expect((await notice(keyFor("overdue", 0)))?.message).toContain(`${(before.total - part).toLocaleString("en-US")} টাকা`);

    expect(await run(noon(10, 8))).toMatchObject({ sent: 0 });
    expect(await run(noon(10, 9))).toMatchObject({ sent: 1, counts: { overdue: 1 } });
    expect(await notice(keyFor("overdue", 1))).toBeDefined();
  });

  it("holds back while a payment the Tutor reported covers the balance, and goes on if it is turned down", async () => {
    const balance = (await getTuitionPaymentLedger(requestId))!.charge!.balance;
    const reported = await reportTuitionPayment({ tutorId, userId: adminUserId, requestId, amount: balance, method: "cash", paidOn: "2026-10-09" });
    expect(reported.outcome).toBe("reported");

    expect(await run(noon(10, 16))).toMatchObject({ sent: 0 });

    const db = await database();
    const [waiting] = await db.select({ id: tuitionPayments.id }).from(tuitionPayments).where(and(eq(tuitionPayments.tutorRequestId, requestId), eq(tuitionPayments.status, "submitted")));
    await decideTuitionPayment({ adminUserId, paymentId: waiting!.id, decision: "rejected" });

    expect(await run(noon(10, 16))).toMatchObject({ sent: 1, counts: { overdue: 1 } });
    expect(await notice(keyFor("overdue", 2))).toBeDefined();
  });

  it("stops once the fee is paid in full, because the tuition is no longer one with money owed", async () => {
    const balance = (await getTuitionPaymentLedger(requestId))!.charge!.balance;
    const recorded = await recordTuitionPayment({ adminUserId, requestId, amount: balance, method: "cash", paidOn: "2026-10-10" });
    expect(recorded.outcome).toBe("recorded");

    expect(await run(noon(10, 23))).toEqual({ checked: 0, sent: 0, counts: { window: 0, second: 0, overdue: 0 }, dryRun: false });
  });
});
