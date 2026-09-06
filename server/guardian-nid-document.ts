import { TRPCError } from "@trpc/server";
import type { GuardianNidSide } from "@shared/guardian-profile";
import {
  clearGuardianNidDocumentKey,
  getGuardianNidDocumentKeys,
  saveGuardianNidDocumentKey,
} from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import {
  GuardianProfilePhotoError,
  validateGuardianProfilePhoto,
  type GuardianProfilePhotoFile,
} from "./guardian-profile-photo";

type UploadUser = {
  id: number;
  role: "tutor" | "guardian" | "admin" | "user";
  accountStatus: "active" | "suspended" | "disabled" | "closed";
};

export class GuardianNidDocumentError extends Error {
  readonly code = "BAD_REQUEST" as const;

  constructor(message: string) {
    super(message);
    this.name = "GuardianNidDocumentError";
  }
}

function assertAuthorizedGuardian(user: UploadUser | null): asserts user is UploadUser {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please log in to upload your NID card image." });
  }
  if (user.role !== "guardian" || user.accountStatus !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only active Guardian accounts can upload a NID card image." });
  }
}

type UploadDependencies = {
  storagePut: typeof storagePut;
  saveGuardianNidDocumentKey: typeof saveGuardianNidDocumentKey;
};

type RemovalDependencies = {
  clearGuardianNidDocumentKey: typeof clearGuardianNidDocumentKey;
};

/**
 * Stores one side of the NID card under a Guardian-private object key. The key
 * and the image URL are server-only - the owner gets a signed preview URL and
 * an Admin gets one for review; neither leaves in a public DTO.
 */
export async function uploadGuardianNidDocument({
  user,
  side,
  file,
  storagePut: put = storagePut,
  saveGuardianNidDocumentKey: save = saveGuardianNidDocumentKey,
}: {
  user: UploadUser | null;
  side: GuardianNidSide;
  file: GuardianProfilePhotoFile;
} & Partial<UploadDependencies>) {
  assertAuthorizedGuardian(user);
  let image: ReturnType<typeof validateGuardianProfilePhoto>;
  try {
    image = validateGuardianProfilePhoto(file);
  } catch (error) {
    if (error instanceof GuardianProfilePhotoError) {
      throw new GuardianNidDocumentError(error.message.replace(/Profile photos?/gi, "NID card images"));
    }
    throw error;
  }
  const stored = await put(`guardians/${user.id}/nid-${side}.${image.extension}`, file.buffer, image.contentType);
  await save(user.id, side, stored.key);
  return { side, nidDocumentStatus: "uploaded" as const };
}

export async function removeGuardianNidDocument({
  user,
  side,
  clearGuardianNidDocumentKey: clear = clearGuardianNidDocumentKey,
}: {
  user: UploadUser | null;
  side: GuardianNidSide;
} & Partial<RemovalDependencies>) {
  assertAuthorizedGuardian(user);
  await clear(user.id, side);
  return { side, nidDocumentStatus: "not_uploaded" as const };
}

/** Signed preview URLs for the two sides, for the owner or an Admin reviewer. */
export async function getGuardianNidDocumentUrls({
  userId,
  getKeys = getGuardianNidDocumentKeys,
  getSignedUrl = storageGetSignedUrl,
}: {
  userId: number;
  getKeys?: typeof getGuardianNidDocumentKeys;
  getSignedUrl?: typeof storageGetSignedUrl;
}) {
  const { frontKey, backKey } = await getKeys(userId);
  return {
    front: frontKey ? await getSignedUrl(frontKey) : null,
    back: backKey ? await getSignedUrl(backKey) : null,
  };
}
