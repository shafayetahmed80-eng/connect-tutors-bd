import { describe, expect, it, vi } from "vitest";
import {
  MAX_GUARDIAN_PROFILE_PHOTO_BYTES,
  GuardianProfilePhotoError,
  removeGuardianProfilePhoto,
  uploadGuardianProfilePhoto,
  validateGuardianPhotoReview,
  validateGuardianProfilePhoto,
} from "./guardian-profile-photo";

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
  return Buffer.from([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x08,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
  ]);
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

const activeGuardian = {
  id: 501,
  role: "guardian" as const,
  accountStatus: "active" as const,
};

describe("Guardian profile photo uploads and moderation contract", () => {
  it("validates JPEG, PNG, and WebP by signature and image dimensions", () => {
    expect(
      validateGuardianProfilePhoto({
        buffer: pngFixture(300, 420),
        mimetype: "image/png",
        originalname: "portrait.png",
      }),
    ).toEqual({ contentType: "image/png", extension: "png", width: 300, height: 420 });

    expect(
      validateGuardianProfilePhoto({
        buffer: jpegFixture(),
        mimetype: "image/pjpeg",
        originalname: "mobile-camera.jpg",
      }),
    ).toMatchObject({ contentType: "image/jpeg", extension: "jpg" });

    expect(
      validateGuardianProfilePhoto({
        buffer: webpFixture(),
        mimetype: "image/webp",
        originalname: "portrait.webp",
      }),
    ).toMatchObject({ contentType: "image/webp", extension: "webp" });
  });

  it.each([
    [
      "a mismatched declared MIME type",
      {
        buffer: pngFixture(300, 300),
        mimetype: "image/jpeg",
        originalname: "portrait.jpg",
      },
    ],
    [
      "an invalid binary signature",
      {
        buffer: Buffer.from("not an image"),
        mimetype: "image/png",
        originalname: "portrait.png",
      },
    ],
    [
      "an undersized image",
      {
        buffer: pngFixture(299, 300),
        mimetype: "image/png",
        originalname: "portrait.png",
      },
    ],
    [
      "an unsafe image dimension",
      {
        buffer: pngFixture(10_001, 300),
        mimetype: "image/png",
        originalname: "portrait.png",
      },
    ],
    [
      "a file larger than 5 MB",
      {
        buffer: Buffer.concat([
          pngFixture(300, 300),
          Buffer.alloc(MAX_GUARDIAN_PROFILE_PHOTO_BYTES),
        ]),
        mimetype: "image/png",
        originalname: "portrait.png",
      },
    ],
  ])("rejects %s before any storage access", (_reason, file) => {
    expect(() => validateGuardianProfilePhoto(file)).toThrow(GuardianProfilePhotoError);
  });

  it("uploads to the Guardian-scoped key and persists only the generated opaque object key as pending review", async () => {
    const storagePut = vi.fn().mockResolvedValue({
      key: "guardians/501/profile-photo_9fd18ca2.png",
      url: "/manus-storage/guardians/501/profile-photo_9fd18ca2.png",
    });
    const saveGuardianProfilePhoto = vi.fn().mockResolvedValue(undefined);

    await expect(
      uploadGuardianProfilePhoto({
        user: activeGuardian,
        file: {
          buffer: pngFixture(640, 640),
          mimetype: "image/png",
          originalname: "Rahman profile.png",
        },
        storagePut,
        saveGuardianProfilePhoto,
      }),
    ).resolves.toEqual({
      photoStatus: "pending_review",
      width: 640,
      height: 640,
    });

    expect(storagePut).toHaveBeenCalledWith(
      "guardians/501/profile-photo.png",
      expect.any(Buffer),
      "image/png",
    );
    expect(saveGuardianProfilePhoto).toHaveBeenCalledWith({
      guardianUserId: 501,
      storageKey: "guardians/501/profile-photo_9fd18ca2.png",
      actorUserId: 501,
    });
  });

  it("denies non-Guardian or inactive callers before storage and persistence", async () => {
    const storagePut = vi.fn();
    const saveGuardianProfilePhoto = vi.fn();
    const file = {
      buffer: pngFixture(300, 300),
      mimetype: "image/png",
      originalname: "portrait.png",
    };

    await expect(
      uploadGuardianProfilePhoto({ user: null, file, storagePut, saveGuardianProfilePhoto }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      uploadGuardianProfilePhoto({
        user: { ...activeGuardian, role: "tutor" },
        file,
        storagePut,
        saveGuardianProfilePhoto,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      uploadGuardianProfilePhoto({
        user: { ...activeGuardian, accountStatus: "suspended" },
        file,
        storagePut,
        saveGuardianProfilePhoto,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storagePut).not.toHaveBeenCalled();
    expect(saveGuardianProfilePhoto).not.toHaveBeenCalled();
  });

  it("removes only the active Guardian's current photo reference without returning a raw storage key", async () => {
    const clearGuardianProfilePhoto = vi.fn().mockResolvedValue(undefined);

    await expect(
      removeGuardianProfilePhoto({
        user: activeGuardian,
        clearGuardianProfilePhoto,
      }),
    ).resolves.toEqual({ photoStatus: "no_photo" });

    expect(clearGuardianProfilePhoto).toHaveBeenCalledWith({
      guardianUserId: 501,
      actorUserId: 501,
    });
  });

  it("allows only pending-review photos to receive a controlled Admin decision", () => {
    expect(
      validateGuardianPhotoReview({
        currentStatus: "pending_review",
        nextStatus: "approved",
      }),
    ).toEqual({ nextStatus: "approved", rejectionReason: null, moderationNote: null });

    expect(
      validateGuardianPhotoReview({
        currentStatus: "pending_review",
        nextStatus: "rejected",
        rejectionReason: "contains_contact_or_promotional_content",
        moderationNote: "Please upload a photo without contact details.",
      }),
    ).toEqual({
      nextStatus: "rejected",
      rejectionReason: "contains_contact_or_promotional_content",
      moderationNote: "Please upload a photo without contact details.",
    });

    expect(() =>
      validateGuardianPhotoReview({
        currentStatus: "approved",
        nextStatus: "rejected",
        rejectionReason: "low_quality_or_unrelated_image",
      }),
    ).toThrow(GuardianProfilePhotoError);
    expect(() =>
      validateGuardianPhotoReview({
        currentStatus: "pending_review",
        nextStatus: "rejected",
      }),
    ).toThrow(GuardianProfilePhotoError);
    expect(() =>
      validateGuardianPhotoReview({
        currentStatus: "pending_review",
        nextStatus: "approved",
        moderationNote: "Any note is disallowed when approving.",
      }),
    ).toThrow(GuardianProfilePhotoError);
  });
});
