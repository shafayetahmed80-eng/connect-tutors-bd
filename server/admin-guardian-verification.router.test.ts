import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getGuardianProfileByUserId: vi.fn(),
  setGuardianVerification: vi.fn(),
}));
const nidMocks = vi.hoisted(() => ({ getGuardianNidDocumentUrls: vi.fn() }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});
vi.mock("./guardian-nid-document", async importOriginal => {
  const actual = await importOriginal<typeof import("./guardian-nid-document")>();
  return { ...actual, ...nidMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const adminUser = {
  id: 42, openId: ENV.ownerOpenId, email: "owner@example.com", name: "Owner",
  passwordHash: null, loginMethod: "oauth", role: "admin" as const, accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function createCaller(user: TrpcContext["user"] = adminUser) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.clearAllMocks());

describe("admin Guardian verification", () => {
  it("returns the profile with signed NID URLs, never a raw key", async () => {
    dbMocks.getGuardianProfileByUserId.mockResolvedValue({ guardianId: "GD-1", name: "Rahima", verificationStatus: "unverified", nidFrontUploaded: true, nidBackUploaded: false });
    nidMocks.getGuardianNidDocumentUrls.mockResolvedValue({ front: "https://signed/front", back: null });

    const result = await createCaller().admin.getGuardianProfile({ guardianUserId: 501 });

    expect(result).toMatchObject({ guardianId: "GD-1", nidDocuments: { front: "https://signed/front", back: null } });
    expect(result).not.toHaveProperty("nidFrontKey");
    expect(nidMocks.getGuardianNidDocumentUrls).toHaveBeenCalledWith({ userId: 501 });
  });

  it("flips the status and passes the reason only when rejecting", async () => {
    dbMocks.setGuardianVerification.mockResolvedValue({ updated: true });

    await createCaller().admin.setGuardianVerification({ guardianUserId: 501, status: "verified" });
    expect(dbMocks.setGuardianVerification).toHaveBeenCalledWith({ guardianUserId: 501, status: "verified", reason: undefined, adminUserId: 42 });

    await createCaller().admin.setGuardianVerification({ guardianUserId: 501, status: "rejected", reason: "  NID name mismatch  " });
    expect(dbMocks.setGuardianVerification).toHaveBeenLastCalledWith({ guardianUserId: 501, status: "rejected", reason: "NID name mismatch", adminUserId: 42 });
  });

  it("requires a reason to reject and refuses a non-admin caller", async () => {
    await expect(createCaller().admin.setGuardianVerification({ guardianUserId: 501, status: "rejected" })).rejects.toThrow();
    await expect(createCaller().admin.setGuardianVerification({ guardianUserId: 501, status: "rejected", reason: "x" })).rejects.toThrow();
    expect(dbMocks.setGuardianVerification).not.toHaveBeenCalled();

    const guardian = { ...adminUser, role: "guardian" as const };
    await expect(createCaller(guardian).admin.setGuardianVerification({ guardianUserId: 501, status: "verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reports a Guardian that could not be updated as not found", async () => {
    dbMocks.setGuardianVerification.mockResolvedValue({ updated: false });
    await expect(createCaller().admin.setGuardianVerification({ guardianUserId: 9999, status: "verified" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
