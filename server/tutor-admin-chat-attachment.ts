import { storagePut } from "./storage";
import { TutorProfilePhotoError, validateTutorProfilePhoto, type TutorProfilePhotoFile } from "./tutor-profile-photo";

export class ChatAttachmentError extends Error {
  readonly code = "BAD_REQUEST" as const;
}

const MAX_PDF_BYTES = 20 * 1024 * 1024;

/**
 * An image (sniffed the same way a profile photo is) or a plain PDF - the two
 * shapes a support conversation actually needs. Anything else is refused
 * before it ever reaches storage.
 */
function validateChatAttachment(file: TutorProfilePhotoFile): { contentType: string; extension: string } {
  if (file.mimetype === "application/pdf") {
    if (file.buffer.length > MAX_PDF_BYTES) throw new ChatAttachmentError("Attachments must be 20 MB or smaller.");
    return { contentType: "application/pdf", extension: "pdf" };
  }
  try {
    const image = validateTutorProfilePhoto(file);
    return { contentType: image.contentType, extension: image.extension };
  } catch (error) {
    if (error instanceof TutorProfilePhotoError) throw new ChatAttachmentError(error.message.replace(/Profile photos?/gi, "Attachments"));
    throw error;
  }
}

/** Stored under the Tutor the thread belongs to, whichever side actually uploaded it. */
export async function uploadTutorAdminChatAttachment(input: { tutorId: string; file: TutorProfilePhotoFile; put?: typeof storagePut }) {
  const put = input.put ?? storagePut;
  const { contentType, extension } = validateChatAttachment(input.file);
  const stored = await put(`chat/${input.tutorId}/${Date.now()}.${extension}`, input.file.buffer, contentType);
  return { key: stored.key, url: stored.url, contentType };
}
