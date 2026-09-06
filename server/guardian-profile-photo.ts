import { TRPCError } from "@trpc/server";
import {
  clearGuardianProfilePhoto,
  getGuardianProfilePhotoByUserId,
  saveGuardianProfilePhoto,
} from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";

export const MAX_GUARDIAN_PROFILE_PHOTO_BYTES = 20 * 1024 * 1024;

type UploadUser = {
  id: number;
  role: "tutor" | "guardian" | "admin" | "user";
  accountStatus: "active" | "suspended" | "disabled" | "closed";
};

export type GuardianProfilePhotoFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

export type ValidatedGuardianProfilePhoto = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

export class GuardianProfilePhotoError extends Error {
  readonly code = "BAD_REQUEST" as const;

  constructor(message: string) {
    super(message);
    this.name = "GuardianProfilePhotoError";
  }
}

function invalidPhoto(message: string): never {
  throw new GuardianProfilePhotoError(message);
}

function normalizeDeclaredImageMimeType(mimetype: string) {
  const normalized = mimetype.trim().toLowerCase();
  if (normalized === "image/jpg" || normalized === "image/pjpeg") return "image/jpeg";
  return normalized;
}

function readPngDimensions(buffer: Buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 12, 16) !== "IHDR") return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return undefined;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return undefined;
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) return undefined;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return undefined;
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (length < 7) return undefined;
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  return undefined;
}

function readWebpDimensions(buffer: Buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return undefined;
  }
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  }
  if (chunk === "VP8 ") {
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return undefined;
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
  }
  return undefined;
}

/**
 * The photo has to be a real JPEG/PNG/WebP whose declared type matches its
 * bytes, and no larger than the size cap. Pixel dimensions are read for the
 * caller's return value but no longer gate the upload.
 */
export function validateGuardianProfilePhoto(file: GuardianProfilePhotoFile): ValidatedGuardianProfilePhoto {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    invalidPhoto("Upload one non-empty profile photo.");
  }
  if (file.buffer.length > MAX_GUARDIAN_PROFILE_PHOTO_BYTES) {
    invalidPhoto("Profile photos must be 20 MB or smaller.");
  }

  const png =
    file.buffer.length >= 8 &&
    file.buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg =
    file.buffer.length >= 3 &&
    file.buffer[0] === 0xff &&
    file.buffer[1] === 0xd8 &&
    file.buffer[2] === 0xff;
  const webp =
    file.buffer.length >= 12 &&
    file.buffer.toString("ascii", 0, 4) === "RIFF" &&
    file.buffer.toString("ascii", 8, 12) === "WEBP";
  const detected = png
    ? {
        contentType: "image/png" as const,
        extension: "png" as const,
        dimensions: readPngDimensions(file.buffer),
      }
    : jpeg
      ? {
          contentType: "image/jpeg" as const,
          extension: "jpg" as const,
          dimensions: readJpegDimensions(file.buffer),
        }
      : webp
        ? {
            contentType: "image/webp" as const,
            extension: "webp" as const,
            dimensions: readWebpDimensions(file.buffer),
          }
        : undefined;

  if (!detected?.dimensions) {
    invalidPhoto("Profile photos must be a valid JPEG, PNG, or WebP image.");
  }
  if (normalizeDeclaredImageMimeType(file.mimetype) !== detected.contentType) {
    invalidPhoto("The uploaded image type does not match its binary signature.");
  }

  return { contentType: detected.contentType, extension: detected.extension, ...detected.dimensions };
}

function assertAuthorizedGuardian(user: UploadUser | null): asserts user is UploadUser {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please log in to upload a profile photo." });
  }
  if (user.role !== "guardian" || user.accountStatus !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only active Guardian accounts can upload a profile photo.",
    });
  }
}

type PhotoUploadDependencies = {
  storagePut: typeof storagePut;
  saveGuardianProfilePhoto: typeof saveGuardianProfilePhoto;
};

type PhotoRemovalDependencies = {
  clearGuardianProfilePhoto: typeof clearGuardianProfilePhoto;
};

export async function uploadGuardianProfilePhoto({
  user,
  file,
  storagePut: put = storagePut,
  saveGuardianProfilePhoto: save = saveGuardianProfilePhoto,
}: {
  user: UploadUser | null;
  file: GuardianProfilePhotoFile;
} & Partial<PhotoUploadDependencies>) {
  assertAuthorizedGuardian(user);
  const photo = validateGuardianProfilePhoto(file);
  const stored = await put(
    `guardians/${user.id}/profile-photo.${photo.extension}`,
    file.buffer,
    photo.contentType,
  );
  await save({ guardianUserId: user.id, storageKey: stored.key });
  return { photoStatus: "photo" as const, width: photo.width, height: photo.height };
}

export async function removeGuardianProfilePhoto({
  user,
  clearGuardianProfilePhoto: clear = clearGuardianProfilePhoto,
}: {
  user: UploadUser | null;
} & Partial<PhotoRemovalDependencies>) {
  assertAuthorizedGuardian(user);
  await clear({ guardianUserId: user.id });
  return { photoStatus: "no_photo" as const };
}

function toSafeOwnerPhotoDto(
  record: Awaited<ReturnType<typeof getGuardianProfilePhotoByUserId>>,
  photoUrl: string | null,
) {
  return record
    ? { photoStatus: "photo" as const, photoUrl }
    : { photoStatus: "no_photo" as const, photoUrl: null };
}

export async function getGuardianProfilePhotoForOwner({
  user,
  getSignedUrl = storageGetSignedUrl,
}: {
  user: UploadUser | null;
  getSignedUrl?: typeof storageGetSignedUrl;
}) {
  assertAuthorizedGuardian(user);
  const record = await getGuardianProfilePhotoByUserId(user.id);
  const photoUrl = record ? await getSignedUrl(record.storageKey) : null;
  return toSafeOwnerPhotoDto(record, photoUrl);
}
