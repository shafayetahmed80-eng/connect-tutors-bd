import type { Express, NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { isAdminProfileImageKind, type AdminProfileImageKind } from "@shared/admin-profile";
import { sdk } from "./_core/sdk";
import { MAX_GUARDIAN_PROFILE_PHOTO_BYTES } from "./guardian-profile-photo";
import { AdminProfileImageError, removeAdminProfileImage, uploadAdminProfileImage } from "./admin-profile-image";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_GUARDIAN_PROFILE_PHOTO_BYTES, files: 1, fields: 0 },
});

type RouteDependencies = {
  authenticateRequest: typeof sdk.authenticateRequest;
  uploadAdminProfileImage: typeof uploadAdminProfileImage;
  removeAdminProfileImage: typeof removeAdminProfileImage;
};

function sendUploadError(response: Response, error: unknown) {
  if (error instanceof MulterError) {
    return response.status(400).json({
      error: error.code === "LIMIT_FILE_SIZE" ? "Images must be 20 MB or smaller." : "Upload exactly one image using the image field.",
    });
  }
  if (error instanceof AdminProfileImageError) return response.status(400).json({ error: error.message });
  return response.status(500).json({ error: "Unable to upload the image. Please try again." });
}

/**
 * The Admin profile's photo and NID images: one address per image kind, and
 * only ever the signed-in Admin's own. The Project Owner reads other Admins'
 * images through signed URLs; nobody uploads for someone else.
 */
export function registerAdminProfileImageRoute(app: Express, overrides: Partial<RouteDependencies> = {}) {
  const dependencies: RouteDependencies = {
    authenticateRequest: sdk.authenticateRequest.bind(sdk),
    uploadAdminProfileImage,
    removeAdminProfileImage,
    ...overrides,
  };

  const authenticateAdmin = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await dependencies.authenticateRequest(request);
      if (!user) return response.status(401).json({ error: "Please log in to change your profile images." });
      if (user.role !== "admin" || user.accountStatus !== "active") {
        return response.status(403).json({ error: "Only active Admin accounts can change Admin profile images." });
      }
      response.locals.adminImageUserId = user.id;
      return next();
    } catch {
      return response.status(401).json({ error: "Please log in to change your profile images." });
    }
  };

  const readKind = (request: Request, response: Response, next: NextFunction) => {
    if (!isAdminProfileImageKind(request.params.kind)) return response.status(400).json({ error: "Choose the photo, or the front or back of the NID card." });
    return next();
  };

  app.post(
    "/api/admin/profile-image/:kind",
    authenticateAdmin,
    readKind,
    (request, response, next) => upload.single("image")(request, response, error => (error ? sendUploadError(response, error) : next())),
    async (request, response) => {
      try {
        if (!request.file) return response.status(400).json({ error: "Upload exactly one image." });
        const result = await dependencies.uploadAdminProfileImage({
          userId: response.locals.adminImageUserId as number,
          kind: request.params.kind as AdminProfileImageKind,
          file: request.file,
        });
        return response.status(201).json(result);
      } catch (error) {
        return sendUploadError(response, error);
      }
    },
  );

  app.delete("/api/admin/profile-image/:kind", authenticateAdmin, readKind, async (request, response) => {
    try {
      const result = await dependencies.removeAdminProfileImage({
        userId: response.locals.adminImageUserId as number,
        kind: request.params.kind as AdminProfileImageKind,
      });
      return response.status(200).json(result);
    } catch {
      return response.status(500).json({ error: "Unable to remove the image. Please try again." });
    }
  });
}
