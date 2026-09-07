import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ getTutorProfileForAdmin: vi.fn() }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
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

describe("admin.getTutorProfile", () => {
  it("hands back the profile with resolved labels, signed documents and the field config", async () => {
    dbMocks.getTutorProfileForAdmin.mockResolvedValue({
      tutorId: "tutor-175",
      name: "Tania Sultana",
      profileStatus: "approved",
      primarySubjectIds: [3, 4],
      catalogLabels: { subjects: { "3": "Mathematics", "4": "Higher Mathematics" }, locations: { "dhaka-city": "Dhaka" } },
      documents: { universityId: "https://signed/university-id", supporting: { experience_certificate: "https://signed/cert" } },
      fieldConfig: { all: [] },
    });

    const result = await createCaller().admin.getTutorProfile({ tutorId: "tutor-175" });

    expect(dbMocks.getTutorProfileForAdmin).toHaveBeenCalledWith({ tutorId: "tutor-175" });
    expect(result).toMatchObject({
      name: "Tania Sultana",
      catalogLabels: { subjects: { "3": "Mathematics" } },
      documents: { universityId: "https://signed/university-id" },
    });
    // The raw storage keys stay server-side; only signed URLs come back.
    expect(Object.keys(result)).not.toContain("profilePhotoKey");
    expect(JSON.stringify(result)).not.toMatch(/storageKey/);
  });

  it("reports an unknown Tutor as not found and refuses a non-admin caller", async () => {
    dbMocks.getTutorProfileForAdmin.mockResolvedValue(undefined);
    await expect(createCaller().admin.getTutorProfile({ tutorId: "tutor-nope" })).rejects.toMatchObject({ code: "NOT_FOUND" });

    const tutor = { ...adminUser, role: "tutor" as const };
    await expect(createCaller(tutor).admin.getTutorProfile({ tutorId: "tutor-175" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
