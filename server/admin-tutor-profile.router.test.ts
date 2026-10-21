import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getTutorProfileForAdmin: vi.fn(),
  getTutorCvPdfForAdmin: vi.fn(),
  verifyTutorDocument: vi.fn(),
  getAdminPasswordChangeRequired: vi.fn(),
  getAdminTwoFactorSettings: vi.fn(),
}));

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

beforeEach(() => {
  dbMocks.getAdminPasswordChangeRequired.mockResolvedValue(false);
  dbMocks.getAdminTwoFactorSettings.mockResolvedValue(undefined);
});

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

describe("admin.getTutorCvPdf", () => {
  it("returns base64 pdf and file name for valid tutorId", async () => {
    dbMocks.getTutorCvPdfForAdmin.mockResolvedValue({
      fileName: "Connect-Tutors-CV-84210-Tania-Sultana.pdf",
      pdfBase64: "JVBERi0xLjQK",
    });

    const result = await createCaller().admin.getTutorCvPdf({ tutorId: "tutor-175" });

    expect(dbMocks.getTutorCvPdfForAdmin).toHaveBeenCalledWith({ tutorId: "tutor-175" });
    expect(result).toEqual({
      fileName: "Connect-Tutors-CV-84210-Tania-Sultana.pdf",
      pdfBase64: "JVBERi0xLjQK",
    });
  });

  it("rejects non-admin callers and throws NOT_FOUND on error", async () => {
    dbMocks.getTutorCvPdfForAdmin.mockRejectedValue(new Error("Tutor profile not found"));

    await expect(createCaller().admin.getTutorCvPdf({ tutorId: "tutor-unknown" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    const tutor = { ...adminUser, role: "tutor" as const };
    await expect(createCaller(tutor).admin.getTutorCvPdf({ tutorId: "tutor-175" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("admin.verifyTutorDocument", () => {
  it("approves a document and records admin user id", async () => {
    dbMocks.verifyTutorDocument.mockResolvedValue({
      updated: true,
      documentType: "universityId",
      status: "approved",
      verifiedBy: "Owner",
      verifiedAt: new Date(),
    });

    const result = await createCaller().admin.verifyTutorDocument({
      tutorId: "tutor-175",
      documentType: "universityId",
      status: "approved",
    });

    expect(dbMocks.verifyTutorDocument).toHaveBeenCalledWith({
      tutorId: "tutor-175",
      documentType: "universityId",
      status: "approved",
      adminUserId: 42,
    });
    expect(result).toMatchObject({
      updated: true,
      status: "approved",
    });
  });

  it("requests re-upload with a custom reason", async () => {
    dbMocks.verifyTutorDocument.mockResolvedValue({
      updated: true,
      documentType: "nid_card",
      status: "changes_requested",
      rejectionReason: "ছবিটি ঝাপসা",
      verifiedBy: "Owner",
      verifiedAt: new Date(),
    });

    const result = await createCaller().admin.verifyTutorDocument({
      tutorId: "tutor-175",
      documentType: "nid_card",
      status: "changes_requested",
      reason: "ছবিটি ঝাপসা",
    });

    expect(dbMocks.verifyTutorDocument).toHaveBeenCalledWith({
      tutorId: "tutor-175",
      documentType: "nid_card",
      status: "changes_requested",
      reason: "ছবিটি ঝাপসা",
      adminUserId: 42,
    });
    expect(result).toMatchObject({
      updated: true,
      status: "changes_requested",
      rejectionReason: "ছবিটি ঝাপসা",
    });
  });

  it("throws NOT_FOUND when tutor profile does not exist", async () => {
    dbMocks.verifyTutorDocument.mockResolvedValue({
      updated: false,
      reason: "TUTOR_NOT_FOUND",
    });

    await expect(
      createCaller().admin.verifyTutorDocument({
        tutorId: "tutor-missing",
        documentType: "universityId",
        status: "approved",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when document has not been uploaded yet", async () => {
    dbMocks.verifyTutorDocument.mockResolvedValue({
      updated: false,
      reason: "DOCUMENT_NOT_UPLOADED",
    });

    await expect(
      createCaller().admin.verifyTutorDocument({
        tutorId: "tutor-175",
        documentType: "passport",
        status: "approved",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects non-admin callers with FORBIDDEN", async () => {
    const tutor = { ...adminUser, role: "tutor" as const };
    await expect(
      createCaller(tutor).admin.verifyTutorDocument({
        tutorId: "tutor-175",
        documentType: "universityId",
        status: "approved",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
