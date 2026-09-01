import { TRPCError } from "@trpc/server";
import {
  isTutorSupportingDocumentType,
  tutorSupportingDocumentLabels,
  type TutorSupportingDocumentType,
} from "@shared/tutor-documents";
import { saveTutorSupportingDocument } from "./db";
import { storagePut } from "./storage";
import { TutorProfilePhotoError, validateTutorProfilePhoto, type TutorProfilePhotoFile } from "./tutor-profile-photo";

type UploadUser = {
  id: number;
  role: "tutor" | "guardian" | "admin" | "user";
  accountStatus: "active" | "suspended" | "disabled";
};

export class TutorSupportingDocumentError extends Error {
  readonly code = "BAD_REQUEST" as const;

  constructor(message: string) {
    super(message);
    this.name = "TutorSupportingDocumentError";
  }
}

function assertAuthorizedTutor(user: UploadUser | null): asserts user is UploadUser {
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please log in to upload a verification document." });
  if (user.role !== "tutor" || user.accountStatus !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only active Tutor accounts can upload a verification document." });
  }
}

type UploadDependencies = {
  storagePut: typeof storagePut;
  saveTutorSupportingDocument: typeof saveTutorSupportingDocument;
};

/**
 * Stores one optional verification image under a Tutor-private object key and
 * returns only which document type is now on file. Re-uploading the same type
 * replaces it, so a Tutor can correct a bad scan without a delete step.
 */
export async function uploadTutorSupportingDocument({
  user,
  documentType,
  file,
  storagePut: put = storagePut,
  saveTutorSupportingDocument: save = saveTutorSupportingDocument,
}: {
  user: UploadUser | null;
  documentType: string;
  file: TutorProfilePhotoFile;
} & Partial<UploadDependencies>) {
  assertAuthorizedTutor(user);
  if (!isTutorSupportingDocumentType(documentType)) {
    throw new TutorSupportingDocumentError("Unknown verification document type.");
  }

  const label = tutorSupportingDocumentLabels[documentType];
  let image: ReturnType<typeof validateTutorProfilePhoto>;
  try {
    // The photo validator carries the binary sniffing; only its wording differs.
    image = validateTutorProfilePhoto(file);
  } catch (error) {
    if (error instanceof TutorProfilePhotoError) {
      throw new TutorSupportingDocumentError(error.message.replace(/Profile photos?/gi, `${label} images`));
    }
    throw error;
  }

  const stored = await put(`tutors/${user.id}/documents/${documentType}.${image.extension}`, file.buffer, image.contentType);
  await save(user.id, documentType, stored.key);
  return { documentType: documentType as TutorSupportingDocumentType, status: "uploaded" as const };
}
