import type { Express, NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { getTutorAccountStatusByUserId } from "./db";
import { sdk } from "./_core/sdk";
import {
  MAX_TUTOR_PROFILE_PHOTO_BYTES,
  removeTutorProfilePhoto,
  TutorProfilePhotoError,
  uploadTutorProfilePhoto,
} from "./tutor-profile-photo";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_TUTOR_PROFILE_PHOTO_BYTES,
    files: 1,
    fields: 0,
  },
});

type EndpointUser = { id: number; role: string; name: string | null; openId: string };

type TutorProfilePhotoRouteDependencies = {
  authenticateRequest: typeof sdk.authenticateRequest;
  getTutorAccountStatusByUserId: typeof getTutorAccountStatusByUserId;
  uploadTutorProfilePhoto: typeof uploadTutorProfilePhoto;
  removeTutorProfilePhoto: typeof removeTutorProfilePhoto;
};

function sendUploadError(response: Response, error: unknown) {
  if (error instanceof MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Profile photos must be 5 MB or smaller."
      : "Upload exactly one photo using the photo field.";
    return response.status(400).json({ error: message });
  }
  if (error instanceof TutorProfilePhotoError || (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "BAD_REQUEST")) {
    return response.status(400).json({ error: error instanceof Error ? error.message : "Invalid profile photo." });
  }
  return response.status(500).json({ error: "Unable to upload the profile photo. Please try again." });
}

export function registerTutorProfilePhotoRoute(app: Express, overrides: Partial<TutorProfilePhotoRouteDependencies> = {}) {
  const dependencies: TutorProfilePhotoRouteDependencies = {
    authenticateRequest: sdk.authenticateRequest.bind(sdk),
    getTutorAccountStatusByUserId,
    uploadTutorProfilePhoto,
    removeTutorProfilePhoto,
    ...overrides,
  };

  const authenticateTutor = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await dependencies.authenticateRequest(request);
      if (!user) return response.status(401).json({ error: "Please log in to upload a profile photo." });
      if (user.role !== "tutor") return response.status(403).json({ error: "Only active Tutor accounts can upload a profile photo." });
      const accountStatus = await dependencies.getTutorAccountStatusByUserId(user.id);
      if (accountStatus !== "active") return response.status(403).json({ error: "Only active Tutor accounts can upload a profile photo." });
      response.locals.tutorPhotoUser = { id: user.id, role: "tutor", accountStatus: "active" };
      return next();
    } catch {
      return response.status(401).json({ error: "Please log in to upload a profile photo." });
    }
  };

  app.post(
    "/api/tutor/profile-photo",
    authenticateTutor,
    (request, response, next) => upload.single("photo")(request, response, error => {
      if (error) return sendUploadError(response, error);
      return next();
    }),
    async (request, response, next) => {
      try {
        if (!request.file) return response.status(400).json({ error: "Upload exactly one profile photo." });
        const result = await dependencies.uploadTutorProfilePhoto({
          user: response.locals.tutorPhotoUser as EndpointUser & { role: "tutor"; accountStatus: "active" },
          file: request.file,
        });
        return response.status(201).json(result);
      } catch (error) {
        return sendUploadError(response, error);
      }
    },
  );

  app.delete("/api/tutor/profile-photo", authenticateTutor, async (_request, response) => {
    try {
      const result = await dependencies.removeTutorProfilePhoto({
        user: response.locals.tutorPhotoUser as EndpointUser & { role: "tutor"; accountStatus: "active" },
      });
      return response.status(200).json(result);
    } catch {
      return response.status(500).json({ error: "Unable to remove the profile photo. Please try again." });
    }
  });
}
