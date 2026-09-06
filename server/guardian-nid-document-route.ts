import type { Express, NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { isGuardianNidSide } from "@shared/guardian-profile";
import { getGuardianAccountStatusByUserId } from "./db";
import { sdk } from "./_core/sdk";
import { MAX_GUARDIAN_PROFILE_PHOTO_BYTES } from "./guardian-profile-photo";
import {
  GuardianNidDocumentError,
  removeGuardianNidDocument,
  uploadGuardianNidDocument,
} from "./guardian-nid-document";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_GUARDIAN_PROFILE_PHOTO_BYTES, files: 1, fields: 0 },
});

type EndpointUser = { id: number; role: "guardian"; accountStatus: "active" };

function sendUploadError(response: Response, error: unknown) {
  if (error instanceof MulterError) {
    return response.status(400).json({
      error: error.code === "LIMIT_FILE_SIZE"
        ? "NID card images must be 20 MB or smaller."
        : "Upload exactly one image using the document field.",
    });
  }
  if (
    error instanceof GuardianNidDocumentError ||
    (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "BAD_REQUEST")
  ) {
    return response.status(400).json({ error: error instanceof Error ? error.message : "Invalid NID card image." });
  }
  return response.status(500).json({ error: "Unable to upload the NID card image. Please try again." });
}

export function registerGuardianNidDocumentRoute(app: Express) {
  const authenticateGuardian = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await sdk.authenticateRequest(request);
      if (!user || user.role !== "guardian" || await getGuardianAccountStatusByUserId(user.id) !== "active") {
        return response.status(user ? 403 : 401).json({ error: "Only active Guardian accounts can upload a NID card image." });
      }
      response.locals.guardianNidUser = { id: user.id, role: "guardian", accountStatus: "active" } satisfies EndpointUser;
      return next();
    } catch {
      return response.status(401).json({ error: "Please log in to upload your NID card image." });
    }
  };

  const readSide = (request: Request, response: Response, next: NextFunction) => {
    if (!isGuardianNidSide(request.params.side)) {
      return response.status(400).json({ error: "Choose the front or back of the NID card." });
    }
    return next();
  };

  app.post(
    "/api/guardian/nid-document/:side",
    authenticateGuardian,
    readSide,
    (request, response, next) => upload.single("document")(request, response, error => (error ? sendUploadError(response, error) : next())),
    async (request, response) => {
      try {
        if (!request.file) return response.status(400).json({ error: "Upload exactly one NID card image." });
        const result = await uploadGuardianNidDocument({
          user: response.locals.guardianNidUser as EndpointUser,
          side: request.params.side as "front" | "back",
          file: request.file,
        });
        return response.status(201).json(result);
      } catch (error) {
        return sendUploadError(response, error);
      }
    },
  );

  app.delete("/api/guardian/nid-document/:side", authenticateGuardian, readSide, async (request, response) => {
    try {
      const result = await removeGuardianNidDocument({
        user: response.locals.guardianNidUser as EndpointUser,
        side: request.params.side as "front" | "back",
      });
      return response.status(200).json(result);
    } catch {
      return response.status(500).json({ error: "Unable to remove the NID card image. Please try again." });
    }
  });
}
