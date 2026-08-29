import { TRPCError } from "@trpc/server";
import { saveTutorUniversityIdDocument } from "./db";
import { storagePut } from "./storage";
import { TutorProfilePhotoError, validateTutorProfilePhoto, type TutorProfilePhotoFile } from "./tutor-profile-photo";

type UploadUser = {
  id: number;
  role: "tutor" | "guardian" | "admin" | "user";
  accountStatus: "active" | "suspended" | "disabled";
};

export class TutorUniversityIdDocumentError extends Error {
  readonly code = "BAD_REQUEST" as const;

  constructor(message: string) {
    super(message);
    this.name = "TutorUniversityIdDocumentError";
  }
}

function assertAuthorizedTutor(user: UploadUser | null): asserts user is UploadUser {
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please log in to upload your University ID image." });
  if (user.role !== "tutor" || user.accountStatus !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only active Tutor accounts can upload a University ID image." });
  }
}

type UploadDependencies = {
  storagePut: typeof storagePut;
  saveTutorUniversityIdDocument: typeof saveTutorUniversityIdDocument;
};

/**
 * Stores the ID image under a Tutor-private object key and returns only a safe
 * status. The key and image URL must never be included in public/Guardian DTOs.
 */
export async function uploadTutorUniversityIdDocument({
  user,
  file,
  storagePut: put = storagePut,
  saveTutorUniversityIdDocument: save = saveTutorUniversityIdDocument,
}: {
  user: UploadUser | null;
  file: TutorProfilePhotoFile;
} & Partial<UploadDependencies>) {
  assertAuthorizedTutor(user);
  let image: ReturnType<typeof validateTutorProfilePhoto>;
  try {
    image = validateTutorProfilePhoto(file);
  } catch (error) {
    if (error instanceof TutorProfilePhotoError) {
      throw new TutorUniversityIdDocumentError(error.message.replace(/Profile photos?/gi, "University ID images"));
    }
    throw error;
  }
  const stored = await put(`tutors/${user.id}/university-id.${image.extension}`, file.buffer, image.contentType);
  await save(user.id, stored.key);
  return { universityIdDocumentStatus: "uploaded" as const };
}
