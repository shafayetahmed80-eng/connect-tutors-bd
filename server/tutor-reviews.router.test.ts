import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { appRouter } from "./routers";

const base = {
  email: null, loginPhone: null, passwordHash: null, loginMethod: "password", accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
const guardian = { ...base, id: 21, openId: "guardian-21", name: "Rina Akter", role: "guardian" as const };
const tutor = { ...base, id: 31, openId: "tutor-31", name: "Karim", role: "tutor" as const };
const admin = { ...base, id: 2, openId: "admin-2", name: "Admin", role: "admin" as const };

function caller(user: TrpcContext["user"]) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: {} },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.restoreAllMocks());

describe("tutorReviews.save", () => {
  it("saves the Guardian's rating, with an empty comment stored as none", async () => {
    const save = vi.spyOn(db, "saveTutorReview").mockResolvedValue({ saved: true });

    await expect(caller(guardian).tutorReviews.save({ requestId: 7, rating: 5, comment: "   " })).resolves.toEqual({ saved: true });
    expect(save).toHaveBeenCalledWith({ guardianUserId: 21, requestId: 7, rating: 5, comment: null });
  });

  it("refuses a tuition that is not the Guardian's, or not Confirmed yet", async () => {
    vi.spyOn(db, "saveTutorReview").mockResolvedValueOnce({ saved: false, reason: "not_found" }).mockResolvedValueOnce({ saved: false, reason: "not_confirmed" });

    await expect(caller(guardian).tutorReviews.save({ requestId: 7, rating: 4 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller(guardian).tutorReviews.save({ requestId: 7, rating: 4 })).rejects.toMatchObject({ code: "BAD_REQUEST", message: "A Tutor can be rated once the tuition is Confirmed." });
  });

  it("takes only 1 to 5 stars and a short comment", async () => {
    const save = vi.spyOn(db, "saveTutorReview");
    await expect(caller(guardian).tutorReviews.save({ requestId: 7, rating: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller(guardian).tutorReviews.save({ requestId: 7, rating: 6 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller(guardian).tutorReviews.save({ requestId: 7, rating: 5, comment: "x".repeat(301) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(save).not.toHaveBeenCalled();
  });

  it("is for Guardians only", async () => {
    await expect(caller(tutor).tutorReviews.save({ requestId: 7, rating: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("reading ratings", () => {
  it("gives a Tutor their own average", async () => {
    vi.spyOn(db, "getTutorRatingSummaryForUser").mockResolvedValue({ average: 4.5, count: 2 });
    await expect(caller(tutor).tutorReviews.mySummary()).resolves.toEqual({ average: 4.5, count: 2 });
  });

  it("gives an Admin the average and every rating, and nobody else", async () => {
    vi.spyOn(db, "getTutorRatingSummary").mockResolvedValue({ average: 5, count: 1 });
    vi.spyOn(db, "listTutorReviewsForAdmin").mockResolvedValue([{ id: 1, requestId: 7, rating: 5, comment: "Great", updatedAt: new Date(), guardianName: "Rina Akter" }]);

    await expect(caller(admin).tutorReviews.forTutor({ tutorId: "t-1" })).resolves.toMatchObject({ summary: { average: 5, count: 1 }, reviews: [{ rating: 5, comment: "Great" }] });
    await expect(caller(guardian).tutorReviews.forTutor({ tutorId: "t-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("puts the average on the applicant profile a Guardian opens", async () => {
    vi.spyOn(db, "getTutorProfileForGuardian").mockResolvedValue({ name: "Karim" } as Awaited<ReturnType<typeof db.getTutorProfileForGuardian>>);
    vi.spyOn(db, "getTutorRatingSummary").mockResolvedValue({ average: 4.7, count: 3 });

    await expect(caller(guardian).tutorRequests.appliedTutorProfile({ requestId: 7, tutorId: "t-1" })).resolves.toMatchObject({ name: "Karim", rating: { average: 4.7, count: 3 } });
  });
});

describe("tutorReviews.setHidden", () => {
  it("lets an Admin hide or restore a review", async () => {
    const setHidden = vi.spyOn(db, "setTutorReviewHidden").mockResolvedValue({ updated: true });

    await expect(caller(admin).tutorReviews.setHidden({ reviewId: 1, hidden: true })).resolves.toEqual({ updated: true });
    expect(setHidden).toHaveBeenCalledWith({ adminUserId: 2, reviewId: 1, hidden: true });
  });

  it("is not for a Guardian or Tutor", async () => {
    await expect(caller(guardian).tutorReviews.setHidden({ reviewId: 1, hidden: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(tutor).tutorReviews.setHidden({ reviewId: 1, hidden: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a review that no longer exists", async () => {
    vi.spyOn(db, "setTutorReviewHidden").mockResolvedValue({ updated: false });
    await expect(caller(admin).tutorReviews.setHidden({ reviewId: 999, hidden: true })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
