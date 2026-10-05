import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUser = vi.hoisted(() => ({ value: { id: 501, role: "guardian", name: "Rahima", openId: "guardian-501" } as any }));
const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getGuardianAccountStatusByUserId: vi.fn(),
  getTutorGuardianLoginOtpSettings: vi.fn(),
  saveGuardianNidDocumentKey: vi.fn(),
  clearGuardianNidDocumentKey: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({
  getGuardianAccountStatusByUserId: mocks.getGuardianAccountStatusByUserId,
  getTutorGuardianLoginOtpSettings: mocks.getTutorGuardianLoginOtpSettings,
  saveGuardianNidDocumentKey: mocks.saveGuardianNidDocumentKey,
  clearGuardianNidDocumentKey: mocks.clearGuardianNidDocumentKey,
  getGuardianNidDocumentKeys: vi.fn(),
}));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut, storageGetSignedUrl: vi.fn() }));

import { LOGIN_TWO_FACTOR_COOKIE_NAME } from "@shared/const";
import { createAdminTwoFactorSessionProof } from "./admin-security";
import { ENV } from "./_core/env";
import { registerGuardianNidDocumentRoute } from "./guardian-nid-document-route";

function pngFixture() {
  const buffer = Buffer.alloc(24);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(600, 16);
  buffer.writeUInt32BE(400, 20);
  return buffer;
}

function createApp() {
  const app = express();
  registerGuardianNidDocumentRoute(app);
  return app;
}

describe("Guardian NID document multipart endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue(currentUser.value);
    mocks.getGuardianAccountStatusByUserId.mockResolvedValue("active");
    mocks.getTutorGuardianLoginOtpSettings.mockResolvedValue({ enabled: false, rememberDays: 30 });
    mocks.saveGuardianNidDocumentKey.mockResolvedValue(undefined);
    mocks.clearGuardianNidDocumentKey.mockResolvedValue(undefined);
    mocks.storagePut.mockResolvedValue({ key: "guardians/501/nid-front_x.png", url: "/manus-storage/guardians/501/nid-front_x.png" });
  });

  it("refuses an upload from a browser that has not cleared the sign-in code, and accepts one that has", async () => {
    mocks.getTutorGuardianLoginOtpSettings.mockResolvedValue({ enabled: true, rememberDays: 30 });

    const refused = await request(createApp())
      .post("/api/guardian/nid-document/front")
      .attach("document", pngFixture(), { filename: "nid.png", contentType: "image/png" })
      .expect(403);
    expect(refused.body.error).toContain("10004");
    expect(mocks.saveGuardianNidDocumentKey).not.toHaveBeenCalled();
    await request(createApp()).delete("/api/guardian/nid-document/front").expect(403);
    expect(mocks.clearGuardianNidDocumentKey).not.toHaveBeenCalled();

    const proof = createAdminTwoFactorSessionProof(currentUser.value.id, ENV.cookieSecret, Date.now() + 60_000);
    await request(createApp())
      .post("/api/guardian/nid-document/front")
      .set("Cookie", `${LOGIN_TWO_FACTOR_COOKIE_NAME}=${proof}`)
      .attach("document", pngFixture(), { filename: "nid.png", contentType: "image/png" })
      .expect(201);
  });

  it("accepts one image for a valid side from an active Guardian", async () => {
    const response = await request(createApp())
      .post("/api/guardian/nid-document/front")
      .attach("document", pngFixture(), { filename: "nid.png", contentType: "image/png" })
      .expect(201);

    expect(response.body).toEqual({ side: "front", nidDocumentStatus: "uploaded" });
    expect(response.body).not.toHaveProperty("storageKey");
    expect(mocks.saveGuardianNidDocumentKey).toHaveBeenCalledWith(501, "front", "guardians/501/nid-front_x.png");
  });

  it("rejects an unknown side without touching storage", async () => {
    await request(createApp())
      .post("/api/guardian/nid-document/sideways")
      .attach("document", pngFixture(), { filename: "nid.png", contentType: "image/png" })
      .expect(400);
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated and non-Guardian callers", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce(null);
    await request(createApp()).post("/api/guardian/nid-document/front").expect(401);

    mocks.authenticateRequest.mockResolvedValueOnce({ ...currentUser.value, role: "tutor" });
    await request(createApp()).post("/api/guardian/nid-document/front").expect(403);
  });

  it("clears one side on DELETE", async () => {
    const response = await request(createApp()).delete("/api/guardian/nid-document/back").expect(200);
    expect(response.body).toEqual({ side: "back", nidDocumentStatus: "not_uploaded" });
    expect(mocks.clearGuardianNidDocumentKey).toHaveBeenCalledWith(501, "back");
  });
});
