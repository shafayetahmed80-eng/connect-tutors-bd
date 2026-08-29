import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerTutorProfilePhotoRoute } from "./tutor-profile-photo-route";

function pngFixture(width = 300, height = 300) {
  const buffer = Buffer.alloc(24);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

const currentUser = vi.hoisted(() => ({ value: { id: 101, role: "tutor", name: "Amina", openId: "tutor-101" } as any }));
const endpointMocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getTutorAccountStatusByUserId: vi.fn(),
  uploadTutorProfilePhoto: vi.fn(),
  removeTutorProfilePhoto: vi.fn(),
}));

function createApp() {
  const app = express();
  registerTutorProfilePhotoRoute(app, endpointMocks);
  return app;
}

describe("TP-06 profile photo multipart endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    endpointMocks.authenticateRequest.mockResolvedValue(currentUser.value);
    endpointMocks.getTutorAccountStatusByUserId.mockResolvedValue("active");
    endpointMocks.uploadTutorProfilePhoto.mockResolvedValue({
      profilePhotoUrl: "/manus-storage/tutors/101/profile-photo_9fd18ca2.png",
      width: 300,
      height: 300,
    });
    endpointMocks.removeTutorProfilePhoto.mockResolvedValue({ profilePhotoUrl: null });
  });

  it("accepts exactly one multipart photo from an active Tutor and returns no storage key", async () => {
    const response = await request(createApp())
      .post("/api/tutor/profile-photo")
      .attach("photo", pngFixture(), { filename: "portrait.png", contentType: "image/png" })
      .expect(201);

    expect(response.body).toEqual({
      profilePhotoUrl: "/manus-storage/tutors/101/profile-photo_9fd18ca2.png",
      width: 300,
      height: 300,
    });
    expect(response.body).not.toHaveProperty("profilePhotoKey");
    expect(endpointMocks.uploadTutorProfilePhoto).toHaveBeenCalledWith(expect.objectContaining({
      user: { id: 101, role: "tutor", accountStatus: "active" },
      file: expect.objectContaining({ mimetype: "image/png", originalname: "portrait.png" }),
    }));
  });

  it("rejects unauthenticated, non-Tutor, and suspended callers before multipart parsing or storage", async () => {
    endpointMocks.authenticateRequest.mockResolvedValueOnce(null);
    await request(createApp()).post("/api/tutor/profile-photo").expect(401);

    endpointMocks.authenticateRequest.mockResolvedValueOnce({ ...currentUser.value, role: "guardian" });
    await request(createApp()).post("/api/tutor/profile-photo").expect(403);

    endpointMocks.getTutorAccountStatusByUserId.mockResolvedValueOnce("suspended");
    await request(createApp()).post("/api/tutor/profile-photo").expect(403);

    expect(endpointMocks.uploadTutorProfilePhoto).not.toHaveBeenCalled();
  });

  it("rejects malformed requests, wrong fields, and a second uploaded file without calling storage", async () => {
    await request(createApp()).post("/api/tutor/profile-photo").expect(400);
    await request(createApp())
      .post("/api/tutor/profile-photo")
      .attach("wrongField", pngFixture(), { filename: "portrait.png", contentType: "image/png" })
      .expect(400);
    await request(createApp())
      .post("/api/tutor/profile-photo")
      .attach("photo", pngFixture(), { filename: "portrait-a.png", contentType: "image/png" })
      .attach("photo", pngFixture(), { filename: "portrait-b.png", contentType: "image/png" })
      .expect(400);
    expect(endpointMocks.uploadTutorProfilePhoto).not.toHaveBeenCalled();
  });

  it("returns a safe validation error when the upload service rejects untrusted image bytes", async () => {
    endpointMocks.uploadTutorProfilePhoto.mockRejectedValueOnce(Object.assign(new Error("Invalid binary signature"), { code: "BAD_REQUEST" }));
    const response = await request(createApp())
      .post("/api/tutor/profile-photo")
      .attach("photo", Buffer.from("not an image"), { filename: "portrait.png", contentType: "image/png" })
      .expect(400);

    expect(response.body).toEqual({ error: "Invalid binary signature" });
  });

  it("does not expose internal storage errors to the Tutor", async () => {
    endpointMocks.uploadTutorProfilePhoto.mockRejectedValueOnce(new Error("Storage presign failed: secret upstream detail"));

    const response = await request(createApp())
      .post("/api/tutor/profile-photo")
      .attach("photo", pngFixture(), { filename: "portrait.png", contentType: "image/png" })
      .expect(500);

    expect(response.body).toEqual({ error: "Unable to upload the profile photo. Please try again." });
    expect(response.text).not.toContain("secret upstream detail");
  });

  it("clears only the active Tutor photo reference and returns no storage key", async () => {
    const response = await request(createApp()).delete("/api/tutor/profile-photo").expect(200);

    expect(response.body).toEqual({ profilePhotoUrl: null });
    expect(response.body).not.toHaveProperty("profilePhotoKey");
    expect(endpointMocks.removeTutorProfilePhoto).toHaveBeenCalledWith({
      user: { id: 101, role: "tutor", accountStatus: "active" },
    });
  });
});
