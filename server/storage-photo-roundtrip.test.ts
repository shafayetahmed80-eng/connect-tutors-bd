import express from "express";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerStorageProxy } from "./_core/storageProxy";
import { registerTutorProfilePhotoRoute } from "./tutor-profile-photo-route";
import { uploadTutorProfilePhoto } from "./tutor-profile-photo";

// End-to-end proof of the on-disk fallback: a real multipart upload runs the
// real validator and the real storagePut (disk branch), then the real proxy
// route serves the stored bytes back. Only the DB write and auth are faked.

function pngFixture(width = 320, height = 240) {
  const buffer = Buffer.alloc(24);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

let storageDir: string;

function createApp() {
  const app = express();
  registerStorageProxy(app);
  registerTutorProfilePhotoRoute(app, {
    authenticateRequest: async () => ({ id: 77, role: "tutor", name: "Tania", openId: "tutor:77" }) as any,
    getTutorAccountStatusByUserId: async () => "active",
    uploadTutorProfilePhoto: args => uploadTutorProfilePhoto({ ...args, saveTutorProfilePhotoKey: async () => {} }),
  });
  return app;
}

beforeAll(async () => {
  storageDir = await mkdtemp(path.join(tmpdir(), "ct-storage-rt-"));
  process.env.LOCAL_STORAGE_DIR = storageDir;
});

afterAll(async () => {
  delete process.env.LOCAL_STORAGE_DIR;
  await rm(storageDir, { recursive: true, force: true });
});

describe("profile photo upload + serve on the local storage fallback", () => {
  it("stores a real PNG on disk and serves it back through the proxy", async () => {
    const png = pngFixture(320, 240);
    const app = createApp();

    const upload = await request(app)
      .post("/api/tutor/profile-photo")
      .attach("photo", png, { filename: "portrait.png", contentType: "image/png" })
      .expect(201);

    expect(upload.body.width).toBe(320);
    expect(upload.body.height).toBe(240);
    expect(upload.body.profilePhotoUrl).toMatch(/^\/manus-storage\/tutors\/77\/profile-photo_[0-9a-f]{8}\.png$/);

    const download = await request(app).get(upload.body.profilePhotoUrl).expect(200);
    expect(download.headers["content-type"]).toContain("image/png");
    expect(Buffer.from(download.body)).toEqual(png);
  });

  it("returns 404 for a key that was never stored", async () => {
    await request(createApp()).get("/manus-storage/tutors/77/does-not-exist.png").expect(404);
  });
});
