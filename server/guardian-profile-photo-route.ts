import type { Express, NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { getGuardianAccountStatusByUserId } from "./db";
import { sdk } from "./_core/sdk";
import {
  GuardianProfilePhotoError,
  MAX_GUARDIAN_PROFILE_PHOTO_BYTES,
  removeGuardianProfilePhoto,
  uploadGuardianProfilePhoto,
} from "./guardian-profile-photo";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_GUARDIAN_PROFILE_PHOTO_BYTES,
    files: 1,
    fields: 0,
  },
});

type EndpointUser = { id: number; role: string; name: string | null; openId: string };

type GuardianProfilePhotoRouteDependencies = {
  authenticateRequest: typeof sdk.authenticateRequest;
  getGuardianAccountStatusByUserId: typeof getGuardianAccountStatusByUserId;
  uploadGuardianProfilePhoto: typeof uploadGuardianProfilePhoto;
  removeGuardianProfilePhoto: typeof removeGuardianProfilePhoto;
};

function sendUploadError(response: Response, error: unknown) {
  if (error instanceof MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Profile photos must be 5 MB or smaller."
      : "Upload exactly one photo using the photo field.";
    return response.status(400).json({ error: message });
  }
  if (
    error instanceof GuardianProfilePhotoError ||
    (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "BAD_REQUEST")
  ) {
    return response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid profile photo.",
    });
  }
  return response.status(500).json({ error: "Unable to upload the profile photo. Please try again." });
}

export function registerGuardianProfilePhotoRoute(
  app: Express,
  overrides: Partial<GuardianProfilePhotoRouteDependencies> = {},
) {
  const dependencies: GuardianProfilePhotoRouteDependencies = {
    authenticateRequest: sdk.authenticateRequest.bind(sdk),
    getGuardianAccountStatusByUserId,
    uploadGuardianProfilePhoto,
    removeGuardianProfilePhoto,
    ...overrides,
  };

  const authenticateGuardian = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await dependencies.authenticateRequest(request);
      if (!user) return response.status(401).json({ error: "Please log in to upload a profile photo." });
      if (user.role !== "guardian") {
        return response.status(403).json({ error: "Only active Guardian accounts can upload a profile photo." });
      }
      const accountStatus = await dependencies.getGuardianAccountStatusByUserId(user.id);
      if (accountStatus !== "active") {
        return response.status(403).json({ error: "Only active Guardian accounts can upload a profile photo." });
      }
      response.locals.guardianPhotoUser = { id: user.id, role: "guardian", accountStatus: "active" };
      return next();
    } catch {
      return response.status(401).json({ error: "Please log in to upload a profile photo." });
    }
  };

  app.post(
    "/api/guardian/profile-photo",
    authenticateGuardian,
    (request, response, next) =>
      upload.single("photo")(request, response, error => {
        if (error) return sendUploadError(response, error);
        return next();
      }),
    async (request, response) => {
      try {
        if (!request.file) {
          return response.status(400).json({ error: "Upload exactly one profile photo." });
        }
        const result = await dependencies.uploadGuardianProfilePhoto({
          user: response.locals.guardianPhotoUser as EndpointUser & {
            role: "guardian";
            accountStatus: "active";
          },
          file: request.file,
        });
        return response.status(201).json(result);
      } catch (error) {
        return sendUploadError(response, error);
      }
    },
  );

  app.delete("/api/guardian/profile-photo", authenticateGuardian, async (_request, response) => {
    try {
      const result = await dependencies.removeGuardianProfilePhoto({
        user: response.locals.guardianPhotoUser as EndpointUser & {
          role: "guardian";
          accountStatus: "active";
        },
      });
      return response.status(200).json(result);
    } catch {
      return response.status(500).json({ error: "Unable to remove the profile photo. Please try again." });
    }
  });
}
