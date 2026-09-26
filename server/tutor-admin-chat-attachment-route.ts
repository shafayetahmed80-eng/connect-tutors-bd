import type { Express, NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { getTutorAccountStatusByUserId, getTutorProfileByUserId } from "./db";
import { sdk } from "./_core/sdk";
import { ChatAttachmentError, uploadTutorAdminChatAttachment } from "./tutor-admin-chat-attachment";

const MAX_UPLOAD_CEILING_BYTES = 20 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_CEILING_BYTES, files: 1, fields: 1 } });

function sendUploadError(response: Response, error: unknown) {
  if (error instanceof MulterError) {
    return response.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Attachments must be 20 MB or smaller." : "Upload exactly one file using the file field." });
  }
  if (error instanceof ChatAttachmentError) return response.status(400).json({ error: error.message });
  return response.status(500).json({ error: "Unable to upload the attachment. Please try again." });
}

/**
 * One upload endpoint for both sides of the chat: a Tutor's own `tutorId` is
 * resolved from their session (never taken from the request, so one Tutor
 * cannot attach into another's thread); an Admin names the `tutorId` in the
 * form body, the same as `admin.sendTutorChatMessage` already does.
 */
export function registerTutorAdminChatAttachmentRoute(app: Express) {
  app.post(
    "/api/chat/attachment",
    (request, response, next) => upload.single("file")(request, response, error => error ? sendUploadError(response, error) : next()),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const user = await sdk.authenticateRequest(request);
        if (!user) return response.status(401).json({ error: "Please log in first." });

        let tutorId: string | null = null;
        if (user.role === "tutor") {
          if (await getTutorAccountStatusByUserId(user.id) !== "active") return response.status(403).json({ error: "Only active Tutor accounts can send an attachment." });
          const profile = await getTutorProfileByUserId(user.id);
          tutorId = profile?.tutorId ?? null;
        } else if (user.role === "admin") {
          const requested = typeof request.body?.tutorId === "string" ? request.body.tutorId.trim() : "";
          tutorId = requested || null;
        }
        if (!tutorId) return response.status(403).json({ error: "Only an active Tutor or an Admin can send a chat attachment." });

        if (!request.file) return response.status(400).json({ error: "Upload exactly one file." });
        const result = await uploadTutorAdminChatAttachment({ tutorId, file: request.file });
        return response.status(201).json(result);
      } catch (error) {
        return sendUploadError(response, error);
      }
    },
  );
}
