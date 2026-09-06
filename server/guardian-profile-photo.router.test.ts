import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const photoServiceMocks = vi.hoisted(() => ({
  getGuardianProfilePhotoForOwner: vi.fn(),
}));

vi.mock("./guardian-profile-photo", async importOriginal => {
  const actual = await importOriginal<typeof import("./guardian-profile-photo")>();
  return { ...actual, ...photoServiceMocks };
});

import { appRouter } from "./routers";

const guardianUser = { id: 501, role: "guardian" as const, name: "Rahima", openId: "guardian:501" };

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

describe("Guardian photo owner procedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    photoServiceMocks.getGuardianProfilePhotoForOwner.mockResolvedValue({
      photoStatus: "photo",
      photoUrl: "https://private.example/photo",
    });
  });

  it("returns the current Guardian's photo state only to that Guardian", async () => {
    const result = await (createCaller().guardianProfile as any).photo();

    expect(result).toMatchObject({ photoStatus: "photo", photoUrl: "https://private.example/photo" });
    expect(photoServiceMocks.getGuardianProfilePhotoForOwner).toHaveBeenCalledWith({ user: guardianUser });

    const tutorCaller = createCaller({ user: { id: 1503, role: "tutor", name: "Amina", openId: "tutor:1503" } });
    await expect(Promise.resolve().then(() => (tutorCaller.guardianProfile as any).photo())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
