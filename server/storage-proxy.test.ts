import express from "express";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getTutorProfileByUserId: vi.fn(),
  loginTwoFactorCleared: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({ getTutorProfileByUserId: mocks.getTutorProfileByUserId }));
vi.mock("./login-two-factor", () => ({ loginTwoFactorCleared: mocks.loginTwoFactorCleared }));

import { registerStorageProxy } from "./_core/storageProxy";

let storageDir: string;

function app() {
  const server = express();
  registerStorageProxy(server);
  return server;
}

const admin = { id: 1, role: "admin", name: "Admin User", openId: "admin-1" };
const tutorA = { id: 101, role: "tutor", name: "Tutor A", openId: "tutor-101" };
const tutorB = { id: 102, role: "tutor", name: "Tutor B", openId: "tutor-102" };

const dummyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeAll(async () => {
  storageDir = await mkdtemp(path.join(tmpdir(), "ct-storage-proxy-test-"));
  process.env.LOCAL_STORAGE_DIR = storageDir;

  // Create test files in mock local storage
  const tutorDir = path.join(storageDir, "tutors", "101");
  await mkdir(path.join(tutorDir, "documents"), { recursive: true });
  await writeFile(path.join(tutorDir, "university-id_test1234.png"), dummyPng);
  await writeFile(path.join(tutorDir, "documents", "nid_card_test5678.png"), dummyPng);
});

afterAll(async () => {
  delete process.env.LOCAL_STORAGE_DIR;
  await rm(storageDir, { recursive: true, force: true });
});

beforeEach(() => {
  vi.clearAllMocks();
  // By default, simulate tutor/guardian login 2FA OTP is ENABLED globally on the site
  // and non-admin without OTP cookie returns false from loginTwoFactorCleared
  mocks.loginTwoFactorCleared.mockResolvedValue(false);
  mocks.getTutorProfileByUserId.mockImplementation(async (userId: number) => {
    if (userId === 101) return { tutorId: "tutor-101" };
    if (userId === 102) return { tutorId: "tutor-102" };
    return null;
  });
});

describe("Storage proxy access control for private documents", () => {
  const universityIdPath = "/api/files/tutors/101/university-id_test1234.png";
  const supportingDocPath = "/api/files/tutors/101/documents/nid_card_test5678.png";

  it("serves private documents to an Admin even when tutor/guardian 2FA is enabled", async () => {
    mocks.authenticateRequest.mockResolvedValue(admin);

    const resUniv = await request(app()).get(universityIdPath);
    expect(resUniv.status).toBe(200);
    expect(resUniv.headers["content-type"]).toContain("image/png");
    expect(resUniv.body).toEqual(dummyPng);

    const resNid = await request(app()).get(supportingDocPath);
    expect(resNid.status).toBe(200);
    expect(resNid.headers["content-type"]).toContain("image/png");
    expect(resNid.body).toEqual(dummyPng);

    // loginTwoFactorCleared should not even be required to clear for admin
    expect(mocks.loginTwoFactorCleared).not.toHaveBeenCalled();
  });

  it("serves private documents to the owner Tutor when 2FA is cleared", async () => {
    mocks.authenticateRequest.mockResolvedValue(tutorA);
    mocks.loginTwoFactorCleared.mockResolvedValue(true);

    const res = await request(app()).get(universityIdPath);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(dummyPng);
    expect(mocks.loginTwoFactorCleared).toHaveBeenCalledWith(expect.anything(), 101);
  });

  it("refuses private documents to the owner Tutor when 2FA is not cleared", async () => {
    mocks.authenticateRequest.mockResolvedValue(tutorA);
    mocks.loginTwoFactorCleared.mockResolvedValue(false);

    const res = await request(app()).get(universityIdPath);
    expect(res.status).toBe(404);
    expect(res.text).toBe("Not found");
  });

  it("refuses private documents to a different Tutor (tutor 102 accessing tutor 101's docs)", async () => {
    mocks.authenticateRequest.mockResolvedValue(tutorB);
    mocks.loginTwoFactorCleared.mockResolvedValue(true);

    const res = await request(app()).get(universityIdPath);
    expect(res.status).toBe(404);
    expect(res.text).toBe("Not found");
  });

  it("refuses private documents to unauthenticated visitors", async () => {
    mocks.authenticateRequest.mockRejectedValue(new Error("Unauthorized"));

    const res = await request(app()).get(universityIdPath);
    expect(res.status).toBe(404);
    expect(res.text).toBe("Not found");
  });
});
