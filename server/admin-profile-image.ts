import type { AdminProfileImageKind } from "@shared/admin-profile";
import { getAdminProfileImageKeys, setAdminProfileImageKey } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import {
  GuardianProfilePhotoError,
  validateGuardianProfilePhoto,
  type GuardianProfilePhotoFile,
} from "./guardian-profile-photo";

export class AdminProfileImageError extends Error {
  readonly code = "BAD_REQUEST" as const;

  constructor(message: string) {
    super(message);
    this.name = "AdminProfileImageError";
  }
}

const imageNames: Record<AdminProfileImageKind, string> = {
  photo: "Profile photos",
  "nid-front": "NID card images",
  "nid-back": "NID card images",
};

/**
 * Stores one of an Admin's three images under an Admin-private key. The file
 * is checked the way a Guardian's photo is - a real JPEG, PNG or WebP whose
 * declared type matches its bytes, 20 MB at most - and only the key is kept.
 */
export async function uploadAdminProfileImage({
  userId,
  kind,
  file,
  put = storagePut,
  save = setAdminProfileImageKey,
}: {
  userId: number;
  kind: AdminProfileImageKind;
  file: GuardianProfilePhotoFile;
  put?: typeof storagePut;
  save?: typeof setAdminProfileImageKey;
}) {
  let image: ReturnType<typeof validateGuardianProfilePhoto>;
  try {
    image = validateGuardianProfilePhoto(file);
  } catch (error) {
    if (error instanceof GuardianProfilePhotoError) {
      throw new AdminProfileImageError(error.message.replace(/Profile photos?/gi, imageNames[kind]));
    }
    throw error;
  }
  const stored = await put(`admins/${userId}/${kind}.${image.extension}`, file.buffer, image.contentType);
  await save(userId, kind, stored.key);
  return { kind, imageStatus: "uploaded" as const };
}

export async function removeAdminProfileImage({ userId, kind, save = setAdminProfileImageKey }: {
  userId: number;
  kind: AdminProfileImageKind;
  save?: typeof setAdminProfileImageKey;
}) {
  await save(userId, kind, null);
  return { kind, imageStatus: "removed" as const };
}

/** Just the photo, for the sidebar and the workspace header on every Admin page. */
export async function getAdminProfilePhotoUrl({ userId, getKeys = getAdminProfileImageKeys, getSignedUrl = storageGetSignedUrl }: {
  userId: number;
  getKeys?: typeof getAdminProfileImageKeys;
  getSignedUrl?: typeof storageGetSignedUrl;
}) {
  const { photo } = await getKeys(userId);
  return { photoUrl: photo ? await getSignedUrl(photo) : null };
}

/** Signed URLs for the three images, for the Admin themself or the Project Owner. */
export async function getAdminProfileImageUrls({ userId, getKeys = getAdminProfileImageKeys, getSignedUrl = storageGetSignedUrl }: {
  userId: number;
  getKeys?: typeof getAdminProfileImageKeys;
  getSignedUrl?: typeof storageGetSignedUrl;
}) {
  const keys = await getKeys(userId);
  return {
    photo: keys.photo ? await getSignedUrl(keys.photo) : null,
    nidFront: keys.nidFront ? await getSignedUrl(keys.nidFront) : null,
    nidBack: keys.nidBack ? await getSignedUrl(keys.nidBack) : null,
  };
}
