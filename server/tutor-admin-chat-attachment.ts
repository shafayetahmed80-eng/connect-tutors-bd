import { storagePut } from "./storage";
import { TutorProfilePhotoError, validateTutorProfilePhoto, type TutorProfilePhotoFile } from "./tutor-profile-photo";

export class ChatAttachmentError extends Error {
  readonly code = "BAD_REQUEST" as const;
}

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_VOICE_NOTE_BYTES = 20 * 1024 * 1024;
const VOICE_NOTE_EXTENSION_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
};

/**
 * An image (sniffed the same way a profile photo is), a plain PDF, or a
 * recorded voice note - the shapes a support conversation actually needs.
 * Anything else is refused before it ever reaches storage.
 *
 * A voice note's mimetype is trusted as the browser's `MediaRecorder`
 * reported it (unlike the image/PDF branches, there is no magic-byte sniff
 * for it) since it never runs through anything that interprets the bytes as
 * a document or executable - it is only ever played back through an
 * `<audio>` element.
 */
function validateChatAttachment(file: TutorProfilePhotoFile): { contentType: string; extension: string } {
  if (file.mimetype === "application/pdf") {
    if (file.buffer.length > MAX_PDF_BYTES) throw new ChatAttachmentError("Attachments must be 20 MB or smaller.");
    return { contentType: "application/pdf", extension: "pdf" };
  }
  const voiceExtension = VOICE_NOTE_EXTENSION_BY_MIME[file.mimetype.split(";")[0].trim()];
  if (voiceExtension) {
    if (file.buffer.length > MAX_VOICE_NOTE_BYTES) throw new ChatAttachmentError("Voice notes must be 20 MB or smaller.");
    return { contentType: file.mimetype.split(";")[0].trim(), extension: voiceExtension };
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
