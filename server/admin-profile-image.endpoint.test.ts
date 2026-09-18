import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerAdminProfileImageRoute } from "./admin-profile-image-route";

function pngFixture() {
  const buffer = Buffer.alloc(24);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(300, 16);
  buffer.writeUInt32BE(300, 20);
  return buffer;
}

const admin = { id: 42, role: "admin", accountStatus: "active", name: "Owner", openId: "owner" };
const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  uploadAdminProfileImage: vi.fn(),
  removeAdminProfileImage: vi.fn(),
}));

function createApp() {
  const app = express();
  registerAdminProfileImageRoute(app, mocks as never);
  return app;
}

describe("Admin profile image endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue(admin);
    mocks.uploadAdminProfileImage.mockResolvedValue({ kind: "photo", imageStatus: "uploaded" });
    mocks.removeAdminProfileImage.mockResolvedValue({ kind: "nid-front", imageStatus: "removed" });
  });

  it("stores the photo and each NID side for the signed-in Admin, returning no key or URL", async () => {
    for (const kind of ["photo", "nid-front", "nid-back"]) {
      const response = await request(createApp())
        .post(`/api/admin/profile-image/${kind}`)
        .attach("image", pngFixture(), { filename: "card.png", contentType: "image/png" })
        .expect(201);
      expect(response.body).not.toHaveProperty("storageKey");
      expect(mocks.uploadAdminProfileImage).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 42, kind }));
    }
  });

  it("removes an image for the signed-in Admin only", async () => {
    await request(createApp()).delete("/api/admin/profile-image/nid-front").expect(200);
    expect(mocks.removeAdminProfileImage).toHaveBeenCalledWith({ userId: 42, kind: "nid-front" });
  });

  it("refuses anyone who is not an active Admin, and an unknown image, before storing anything", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce(null);
    await request(createApp()).post("/api/admin/profile-image/photo").expect(401);
    mocks.authenticateRequest.mockResolvedValueOnce({ ...admin, role: "guardian" });
    await request(createApp()).post("/api/admin/profile-image/photo").expect(403);
    mocks.authenticateRequest.mockResolvedValueOnce({ ...admin, accountStatus: "suspended" });
    await request(createApp()).delete("/api/admin/profile-image/photo").expect(403);
    await request(createApp()).post("/api/admin/profile-image/passport").expect(400);

    expect(mocks.uploadAdminProfileImage).not.toHaveBeenCalled();
    expect(mocks.removeAdminProfileImage).not.toHaveBeenCalled();
  });

  it("asks for exactly one image in the image field", async () => {
    await request(createApp()).post("/api/admin/profile-image/photo").expect(400);
    await request(createApp())
      .post("/api/admin/profile-image/photo")
      .attach("photo", pngFixture(), { filename: "card.png", contentType: "image/png" })
      .expect(400);
    expect(mocks.uploadAdminProfileImage).not.toHaveBeenCalled();
  });
});
