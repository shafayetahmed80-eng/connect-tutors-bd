import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getTutorAccountStatusByUserId: vi.fn(),
  getTutorProfileByUserId: vi.fn(),
  getTutorGuardianLoginOtpSettings: vi.fn(),
  getSiteLimits: vi.fn(),
  uploadTutorSupportingDocument: vi.fn(),
  uploadTutorUniversityIdDocument: vi.fn(),
  uploadTutorAdminChatAttachment: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({
  getTutorAccountStatusByUserId: mocks.getTutorAccountStatusByUserId,
  getTutorProfileByUserId: mocks.getTutorProfileByUserId,
  getTutorGuardianLoginOtpSettings: mocks.getTutorGuardianLoginOtpSettings,
  getSiteLimits: mocks.getSiteLimits,
}));
vi.mock("./tutor-supporting-document", async importOriginal => ({
  ...(await importOriginal<typeof import("./tutor-supporting-document")>()),
  uploadTutorSupportingDocument: mocks.uploadTutorSupportingDocument,
}));
vi.mock("./tutor-university-id-document", async importOriginal => ({
  ...(await importOriginal<typeof import("./tutor-university-id-document")>()),
  uploadTutorUniversityIdDocument: mocks.uploadTutorUniversityIdDocument,
}));
vi.mock("./tutor-admin-chat-attachment", async importOriginal => ({
  ...(await importOriginal<typeof import("./tutor-admin-chat-attachment")>()),
  uploadTutorAdminChatAttachment: mocks.uploadTutorAdminChatAttachment,
}));

import { LOGIN_TWO_FACTOR_COOKIE_NAME } from "@shared/const";
import { createAdminTwoFactorSessionProof } from "./admin-security";
import { ENV } from "./_core/env";
import { registerTutorAdminChatAttachmentRoute } from "./tutor-admin-chat-attachment-route";
import { registerTutorSupportingDocumentRoute } from "./tutor-supporting-document-route";
import { registerTutorUniversityIdDocumentRoute } from "./tutor-university-id-document-route";

const tutor = { id: 101, role: "tutor", name: "Amina", openId: "tutor-101" };
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 2, 88, 0, 0, 1, 144]);

function app() {
  const server = express();
  registerTutorSupportingDocumentRoute(server);
  registerTutorUniversityIdDocumentRoute(server);
  registerTutorAdminChatAttachmentRoute(server);
  return server;
}

function proofCookie(userId = tutor.id) {
  return `${LOGIN_TWO_FACTOR_COOKIE_NAME}=${createAdminTwoFactorSessionProof(userId, ENV.cookieSecret, Date.now() + 60_000)}`;
}

const routes = [
  { name: "certificate", path: "/api/tutor/supporting-document/degree", field: "document", saved: mocks.uploadTutorSupportingDocument },
  { name: "University ID", path: "/api/tutor/university-id-document", field: "document", saved: mocks.uploadTutorUniversityIdDocument },
  { name: "chat attachment", path: "/api/chat/attachment", field: "file", saved: mocks.uploadTutorAdminChatAttachment },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticateRequest.mockResolvedValue(tutor);
  mocks.getTutorAccountStatusByUserId.mockResolvedValue("active");
  mocks.getTutorProfileByUserId.mockResolvedValue({ tutorId: "tutor-1503" });
  mocks.getTutorGuardianLoginOtpSettings.mockResolvedValue({ enabled: true, rememberDays: 30 });
  mocks.getSiteLimits.mockResolvedValue({});
  for (const route of routes) route.saved.mockResolvedValue({ ok: true });
});

describe.each(routes)("the Tutor's $name upload", ({ path, field, saved }) => {
  it("is refused from a browser that has not cleared the sign-in code", async () => {
    const response = await request(app()).post(path).attach(field, png, { filename: "a.png", contentType: "image/png" });
    expect(response.status).toBe(403);
    expect(response.body.error).toContain("10004");
    expect(saved).not.toHaveBeenCalled();
  });

  it("is refused with another account's proof", async () => {
    const response = await request(app()).post(path).set("Cookie", proofCookie(999)).attach(field, png, { filename: "a.png", contentType: "image/png" });
    expect(response.status).toBe(403);
    expect(saved).not.toHaveBeenCalled();
  });

  it("goes through once this browser holds the proof", async () => {
    const response = await request(app()).post(path).set("Cookie", proofCookie()).attach(field, png, { filename: "a.png", contentType: "image/png" });
    expect(response.status).toBe(201);
    expect(saved).toHaveBeenCalledTimes(1);
  });

  it("is untouched while the Owner's switch is off", async () => {
    mocks.getTutorGuardianLoginOtpSettings.mockResolvedValue({ enabled: false, rememberDays: 30 });
    const response = await request(app()).post(path).attach(field, png, { filename: "a.png", contentType: "image/png" });
    expect(response.status).toBe(201);
  });
});
