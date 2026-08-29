import type { Express, NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { getTutorAccountStatusByUserId } from "./db";
import { sdk } from "./_core/sdk";
import { TutorUniversityIdDocumentError, uploadTutorUniversityIdDocument } from "./tutor-university-id-document";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });

type EndpointUser = { id: number; role: string; name: string | null; openId: string };

function sendUploadError(response: Response, error: unknown) {
  if (error instanceof MulterError) {
    return response.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "University ID images must be 5 MB or smaller." : "Upload exactly one image using the document field." });
  }
  if (error instanceof TutorUniversityIdDocumentError || (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "BAD_REQUEST")) {
    return response.status(400).json({ error: error instanceof Error ? error.message : "Invalid University ID image." });
  }
  return response.status(500).json({ error: "Unable to upload the University ID image. Please try again." });
}

export function registerTutorUniversityIdDocumentRoute(app: Express) {
  const authenticateTutor = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await sdk.authenticateRequest(request);
      if (!user || user.role !== "tutor" || await getTutorAccountStatusByUserId(user.id) !== "active") {
        return response.status(user ? 403 : 401).json({ error: "Only active Tutor accounts can upload a University ID image." });
      }
      response.locals.tutorUniversityIdUser = { id: user.id, role: "tutor", accountStatus: "active" };
      return next();
    } catch {
      return response.status(401).json({ error: "Please log in to upload your University ID image." });
    }
  };

  app.post("/api/tutor/university-id-document", authenticateTutor, (request, response, next) => upload.single("document")(request, response, error => error ? sendUploadError(response, error) : next()), async (request, response) => {
    try {
      if (!request.file) return response.status(400).json({ error: "Upload exactly one University ID image." });
      const result = await uploadTutorUniversityIdDocument({ user: response.locals.tutorUniversityIdUser as EndpointUser & { role: "tutor"; accountStatus: "active" }, file: request.file });
      return response.status(201).json(result);
    } catch (error) {
      return sendUploadError(response, error);
    }
  });
}
