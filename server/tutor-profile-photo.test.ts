import { describe, expect, it, vi } from "vitest";
import {
  MAX_TUTOR_PROFILE_PHOTO_BYTES,
  removeTutorProfilePhoto,
  TutorProfilePhotoError,
  uploadTutorProfilePhoto,
  validateTutorProfilePhoto,
} from "./tutor-profile-photo";
import { toTutorProfileOwnerDto } from "./db";

function pngFixture(width: number, height: number) {
  const buffer = Buffer.alloc(24);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function jpegFixture(width = 300, height = 300) {
  return Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x08, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03]);
}

function webpFixture(width = 300, height = 300) {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
}

const allowedTutor = { id: 101, role: "tutor" as const, accountStatus: "active" as const };

describe("TP-06 Tutor Profile photo uploads", () => {
  it("detects a permitted PNG from its binary signature and enforces the minimum dimensions", () => {
    expect(validateTutorProfilePhoto({
      buffer: pngFixture(300, 420),
      mimetype: "image/png",
      originalname: "portrait.png",
    })).toEqual({ contentType: "image/png", extension: "png", width: 300, height: 420 });
  });

  it.each([
    ["JPEG", jpegFixture(), "image/jpeg", "jpg"],
    ["WebP", webpFixture(), "image/webp", "webp"],
  ])("accepts a valid %s binary signature and dimensions", (_label, buffer, mimetype, extension) => {
    expect(validateTutorProfilePhoto({ buffer, mimetype, originalname: `portrait.${extension}` })).toMatchObject({
      contentType: mimetype,
      extension,
      width: 300,
      height: 300,
    });
  });

  it.each(["image/jpg", "image/pjpeg"]) ("accepts the mobile JPEG MIME alias %s when the binary signature is JPEG", mimetype => {
    expect(validateTutorProfilePhoto({ buffer: jpegFixture(), mimetype, originalname: "mobile-camera.jpg" })).toMatchObject({
      contentType: "image/jpeg",
      extension: "jpg",
      width: 300,
      height: 300,
    });
  });

  it.each([
    ["a mismatched declared MIME type", { buffer: pngFixture(300, 300), mimetype: "image/jpeg", originalname: "portrait.jpg" }],
    ["an invalid binary signature", { buffer: Buffer.from("not an image"), mimetype: "image/png", originalname: "portrait.png" }],
    ["an undersized image", { buffer: pngFixture(299, 300), mimetype: "image/png", originalname: "portrait.png" }],
    ["an image with unsafe dimensions", { buffer: pngFixture(10_001, 300), mimetype: "image/png", originalname: "portrait.png" }],
    ["a file larger than 5 MB", { buffer: Buffer.concat([pngFixture(300, 300), Buffer.alloc(MAX_TUTOR_PROFILE_PHOTO_BYTES)]), mimetype: "image/png", originalname: "portrait.png" }],
  ])("rejects %s before storage access", (_reason, file) => {
    expect(() => validateTutorProfilePhoto(file)).toThrow(TutorProfilePhotoError);
  });

  it("stores only the newly generated opaque key after storage succeeds and returns an owner-usable URL", async () => {
    const storagePut = vi.fn().mockResolvedValue({
      key: "tutors/101/profile-photo_9fd18ca2.png",
      url: "/manus-storage/tutors/101/profile-photo_9fd18ca2.png",
    });
    const saveTutorProfilePhotoKey = vi.fn().mockResolvedValue(undefined);

    await expect(uploadTutorProfilePhoto({
      user: allowedTutor,
      file: { buffer: pngFixture(640, 640), mimetype: "image/png", originalname: "Amina profile.png" },
      storagePut,
      saveTutorProfilePhotoKey,
    })).resolves.toEqual({
      profilePhotoUrl: "/manus-storage/tutors/101/profile-photo_9fd18ca2.png",
      width: 640,
      height: 640,
    });
    expect(storagePut).toHaveBeenCalledWith("tutors/101/profile-photo.png", expect.any(Buffer), "image/png");
    expect(saveTutorProfilePhotoKey).toHaveBeenCalledWith(101, "tutors/101/profile-photo_9fd18ca2.png");
  });

  it("denies non-Tutor or inactive callers and never uploads before authorization succeeds", async () => {
    const storagePut = vi.fn();
    const saveTutorProfilePhotoKey = vi.fn();
    const file = { buffer: pngFixture(300, 300), mimetype: "image/png", originalname: "portrait.png" };

    await expect(uploadTutorProfilePhoto({ user: null, file, storagePut, saveTutorProfilePhotoKey })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(uploadTutorProfilePhoto({ user: { ...allowedTutor, role: "guardian" }, file, storagePut, saveTutorProfilePhotoKey })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(uploadTutorProfilePhoto({ user: { ...allowedTutor, accountStatus: "suspended" }, file, storagePut, saveTutorProfilePhotoKey })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storagePut).not.toHaveBeenCalled();
    expect(saveTutorProfilePhotoKey).not.toHaveBeenCalled();
  });

  it("does not persist a photo key when storage fails", async () => {
    const saveTutorProfilePhotoKey = vi.fn();
    await expect(uploadTutorProfilePhoto({
      user: allowedTutor,
      file: { buffer: pngFixture(300, 300), mimetype: "image/png", originalname: "portrait.png" },
      storagePut: vi.fn().mockRejectedValue(new Error("Storage unavailable")),
      saveTutorProfilePhotoKey,
    })).rejects.toThrow("Storage unavailable");
    expect(saveTutorProfilePhotoKey).not.toHaveBeenCalled();
  });

  it("removes only the active Tutor's current photo reference without returning a raw storage key", async () => {
    const clearTutorProfilePhotoKey = vi.fn().mockResolvedValue(undefined);

    await expect(removeTutorProfilePhoto({
      user: allowedTutor,
      clearTutorProfilePhotoKey,
    })).resolves.toEqual({ profilePhotoUrl: null });

    expect(clearTutorProfilePhotoKey).toHaveBeenCalledWith(101);
  });

  it("maps only the current photo to an owner-usable URL without exposing its raw storage key", () => {
    const ownerDto = toTutorProfileOwnerDto({
      tutorId: 1,
      profilePhotoKey: "tutors/101/profile-photo_9fd18ca2.png",
      name: "Amina Rahman",
    } as any);

    expect(ownerDto).toMatchObject({
      name: "Amina Rahman",
      profilePhotoUrl: "/manus-storage/tutors/101/profile-photo_9fd18ca2.png",
    });
    expect(ownerDto).not.toHaveProperty("profilePhotoKey");
  });
});
