import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerGuardianProfilePhotoRoute } from "./guardian-profile-photo-route";

function pngFixture(width = 300, height = 300) {
  const buffer = Buffer.alloc(24);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

const currentUser = vi.hoisted(
  () => ({ value: { id: 501, role: "guardian", name: "Rahima", openId: "guardian-501" } as any }),
);
const endpointMocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getGuardianAccountStatusByUserId: vi.fn(),
  uploadGuardianProfilePhoto: vi.fn(),
  removeGuardianProfilePhoto: vi.fn(),
}));

function createApp() {
  const app = express();
  registerGuardianProfilePhotoRoute(app, endpointMocks);
  return app;
}

describe("Guardian profile photo multipart endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    endpointMocks.authenticateRequest.mockResolvedValue(currentUser.value);
    endpointMocks.getGuardianAccountStatusByUserId.mockResolvedValue("active");
    endpointMocks.uploadGuardianProfilePhoto.mockResolvedValue({
      photoStatus: "pending_review",
      width: 300,
      height: 300,
    });
    endpointMocks.removeGuardianProfilePhoto.mockResolvedValue({ photoStatus: "no_photo" });
  });

  it("accepts exactly one multipart photo from an active Guardian and returns no storage key or image URL", async () => {
    const response = await request(createApp())
      .post("/api/guardian/profile-photo")
      .attach("photo", pngFixture(), { filename: "portrait.png", contentType: "image/png" })
      .expect(201);

    expect(response.body).toEqual({ photoStatus: "pending_review", width: 300, height: 300 });
    expect(response.body).not.toHaveProperty("storageKey");
    expect(response.body).not.toHaveProperty("photoUrl");
    expect(endpointMocks.uploadGuardianProfilePhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 501, role: "guardian", accountStatus: "active" },
        file: expect.objectContaining({ mimetype: "image/png", originalname: "portrait.png" }),
      }),
    );
  });

  it("rejects unauthenticated, non-Guardian, and inactive callers before multipart parsing or storage", async () => {
    endpointMocks.authenticateRequest.mockResolvedValueOnce(null);
    await request(createApp()).post("/api/guardian/profile-photo").expect(401);

    endpointMocks.authenticateRequest.mockResolvedValueOnce({ ...currentUser.value, role: "tutor" });
    await request(createApp()).post("/api/guardian/profile-photo").expect(403);

    endpointMocks.getGuardianAccountStatusByUserId.mockResolvedValueOnce("suspended");
    await request(createApp()).post("/api/guardian/profile-photo").expect(403);

    expect(endpointMocks.uploadGuardianProfilePhoto).not.toHaveBeenCalled();
  });

  it("rejects malformed requests, wrong fields, and a second uploaded file without invoking upload storage", async () => {
    await request(createApp()).post("/api/guardian/profile-photo").expect(400);
    await request(createApp())
      .post("/api/guardian/profile-photo")
      .attach("wrongField", pngFixture(), { filename: "portrait.png", contentType: "image/png" })
      .expect(400);
    await request(createApp())
      .post("/api/guardian/profile-photo")
      .attach("photo", pngFixture(), { filename: "portrait-a.png", contentType: "image/png" })
      .attach("photo", pngFixture(), { filename: "portrait-b.png", contentType: "image/png" })
      .expect(400);
    expect(endpointMocks.uploadGuardianProfilePhoto).not.toHaveBeenCalled();
  });

  it("returns a safe validation error while hiding internal storage details", async () => {
    endpointMocks.uploadGuardianProfilePhoto.mockRejectedValueOnce(
      Object.assign(new Error("Invalid binary signature"), { code: "BAD_REQUEST" }),
    );
    await expect(
      request(createApp())
        .post("/api/guardian/profile-photo")
        .attach("photo", Buffer.from("not an image"), { filename: "portrait.png", contentType: "image/png" })
        .expect(400),
    ).resolves.toMatchObject({ body: { error: "Invalid binary signature" } });

    endpointMocks.uploadGuardianProfilePhoto.mockRejectedValueOnce(
      new Error("Storage presign failed: secret upstream detail"),
    );
    const response = await request(createApp())
      .post("/api/guardian/profile-photo")
      .attach("photo", pngFixture(), { filename: "portrait.png", contentType: "image/png" })
      .expect(500);

    expect(response.body).toEqual({ error: "Unable to upload the profile photo. Please try again." });
    expect(response.text).not.toContain("secret upstream detail");
  });

  it("clears only the active Guardian photo reference and returns no storage key", async () => {
    const response = await request(createApp()).delete("/api/guardian/profile-photo").expect(200);

    expect(response.body).toEqual({ photoStatus: "no_photo" });
    expect(response.body).not.toHaveProperty("storageKey");
    expect(endpointMocks.removeGuardianProfilePhoto).toHaveBeenCalledWith({
      user: { id: 501, role: "guardian", accountStatus: "active" },
    });
  });
});
