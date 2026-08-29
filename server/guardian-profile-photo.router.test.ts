import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const photoServiceMocks = vi.hoisted(() => ({
  getGuardianProfilePhotoForOwner: vi.fn(),
  getPendingGuardianPhotoModerationQueue: vi.fn(),
  reviewGuardianProfilePhoto: vi.fn(),
}));

vi.mock("./guardian-profile-photo", async importOriginal => {
  const actual = await importOriginal<typeof import("./guardian-profile-photo")>();
  return { ...actual, ...photoServiceMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const guardianUser = { id: 501, role: "guardian" as const, name: "Rahima", openId: "guardian:501" };
const verifiedAdmin = { id: 42, role: "admin" as const, name: "Project Owner", openId: ENV.ownerOpenId };

function createCaller(input?: { user?: TrpcContext["user"] }) {
  return appRouter.createCaller({
    user: input?.user ?? guardianUser,
    req: {
      protocol: "https",
      headers: { host: "connecttutor.example" },
    },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

describe("Guardian photo owner and Admin moderation procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    photoServiceMocks.getGuardianProfilePhotoForOwner.mockResolvedValue({
      photoStatus: "pending_review",
      photoUrl: "https://private.example/photo",
      rejectionReason: null,
      moderationNote: null,
    });
    photoServiceMocks.getPendingGuardianPhotoModerationQueue.mockResolvedValue([
      {
        photoId: 18,
        guardianId: "GD-8K4M29",
        status: "pending_review",
        submittedAt: new Date("2026-08-20T00:00:00Z"),
        photoUrl: "https://private.example/photo",
      },
    ]);
    photoServiceMocks.reviewGuardianProfilePhoto.mockResolvedValue({ photoId: 18, photoStatus: "approved" });
  });

  it("returns the current Guardian's photo state only to that Guardian", async () => {
    const result = await (createCaller().guardianProfile as any).photo();

    expect(result).toMatchObject({ photoStatus: "pending_review", photoUrl: "https://private.example/photo" });
    expect(photoServiceMocks.getGuardianProfilePhotoForOwner).toHaveBeenCalledWith({ user: guardianUser });

    const tutorCaller = createCaller({ user: { id: 1503, role: "tutor", name: "Amina", openId: "tutor:1503" } });
    await expect(Promise.resolve().then(() => (tutorCaller.guardianProfile as any).photo())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an authenticated Admin to view Guardian photo queue records without an interactive two-factor proof", async () => {
    const caller = createCaller({ user: verifiedAdmin });

    await expect((caller.admin as any).listPendingGuardianPhotos()).resolves.toHaveLength(1);
    expect(photoServiceMocks.getPendingGuardianPhotoModerationQueue).toHaveBeenCalledTimes(1);
  });

  it("permits an authenticated Admin to review a pending Guardian photo without exposing Guardian contact data", async () => {
    const caller = createCaller({ user: verifiedAdmin });
    const queue = await (caller.admin as any).listPendingGuardianPhotos();
    const result = await (caller.admin as any).reviewGuardianPhoto({ photoId: 18, nextStatus: "approved" });

    expect(queue[0]).toEqual(expect.objectContaining({ photoId: 18, guardianId: "GD-8K4M29" }));
    expect(queue[0]).not.toHaveProperty("phone");
    expect(queue[0]).not.toHaveProperty("email");
    expect(result).toEqual({ photoId: 18, photoStatus: "approved" });
    expect(photoServiceMocks.reviewGuardianProfilePhoto).toHaveBeenCalledWith({
      photoId: 18,
      adminUserId: verifiedAdmin.id,
      nextStatus: "approved",
      rejectionReason: undefined,
      moderationNote: undefined,
    });
  });

  it("requires a standardized reason when rejecting and blocks a Guardian from any Admin moderation procedure", async () => {
    const adminCaller = createCaller({ user: verifiedAdmin });
    await expect(
      (adminCaller.admin as any).reviewGuardianPhoto({ photoId: 18, nextStatus: "rejected" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const guardianCaller = createCaller();
    await expect(
      Promise.resolve().then(() => (guardianCaller.admin as any).listPendingGuardianPhotos()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
