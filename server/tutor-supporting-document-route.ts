import type { Express, NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { getSiteLimits, getTutorAccountStatusByUserId } from "./db";
import { documentByteLimit, siteLimitCeiling } from "@shared/site-limits";
import { sdk } from "./_core/sdk";
import { TutorSupportingDocumentError, uploadTutorSupportingDocument } from "./tutor-supporting-document";

/**
 * Multer is configured once, when the module loads, so its ceiling is the
 * highest the Owner could ever set rather than the number they have set. That
 * keeps a hostile upload from being buffered while the settings are read; the
 * Owner's own limit is then checked below, once the file is in hand and its
 * size is known.
 */
const MAX_UPLOAD_CEILING_BYTES = siteLimitCeiling("upload.documentMb") * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_CEILING_BYTES, files: 1, fields: 0 } });

type EndpointUser = { id: number; role: "tutor"; accountStatus: "active" };

function sendUploadError(response: Response, error: unknown) {
  if (error instanceof MulterError) {
    return response.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? `Verification documents must be ${siteLimitCeiling("upload.documentMb")} MB or smaller.` : "Upload exactly one image using the document field." });
  }
  if (error instanceof TutorSupportingDocumentError || (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "BAD_REQUEST")) {
    return response.status(400).json({ error: error instanceof Error ? error.message : "Invalid verification document." });
  }
  return response.status(500).json({ error: "Unable to upload the document. Please try again." });
}

/** One route for every optional document; the type travels in the path. */
export function registerTutorSupportingDocumentRoute(app: Express) {
  const authenticateTutor = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await sdk.authenticateRequest(request);
      if (!user || user.role !== "tutor" || await getTutorAccountStatusByUserId(user.id) !== "active") {
        return response.status(user ? 403 : 401).json({ error: "Only active Tutor accounts can upload a verification document." });
      }
      response.locals.tutorSupportingDocumentUser = { id: user.id, role: "tutor", accountStatus: "active" };
      return next();
    } catch {
      return response.status(401).json({ error: "Please log in to upload a verification document." });
    }
  };

  app.post(
    "/api/tutor/supporting-document/:documentType",
    authenticateTutor,
    (request, response, next) => upload.single("document")(request, response, error => error ? sendUploadError(response, error) : next()),
    async (request, response) => {
      try {
        if (!request.file) return response.status(400).json({ error: "Upload exactly one image." });
        const allowedBytes = documentByteLimit(await getSiteLimits());
        if (request.file.size > allowedBytes) {
          return response.status(400).json({ error: `Verification documents must be ${Math.round(allowedBytes / (1024 * 1024))} MB or smaller.` });
        }
        const result = await uploadTutorSupportingDocument({
          user: response.locals.tutorSupportingDocumentUser as EndpointUser,
          documentType: request.params.documentType,
          file: request.file,
        });
        return response.status(201).json(result);
      } catch (error) {
        return sendUploadError(response, error);
      }
    },
  );
}
