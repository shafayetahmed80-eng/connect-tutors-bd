import type { Express, NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { hasAdminTwoFactorProof } from "./admin-two-factor";
import * as db from "./db";
import { ImageStudioFontError, MAX_IMAGE_STUDIO_FONT_BYTES, uploadImageStudioFont } from "./image-studio-fonts";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_STUDIO_FONT_BYTES, files: 1, fields: 3 },
});

type RouteDependencies = {
  authenticateRequest: typeof sdk.authenticateRequest;
  /** Whether this Admin must clear a second factor in this browser first - the same rule as the Admin workspace. */
  twoFactorBlocked: (request: Request, user: { id: number; sessionsValidFrom?: Date | null }) => Promise<boolean>;
  uploadImageStudioFont: typeof uploadImageStudioFont;
};

function sendUploadError(response: Response, error: unknown) {
  if (error instanceof MulterError) {
    return response.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Fonts must be 10 MB or smaller." : "Upload exactly one font file." });
  }
  if (error instanceof ImageStudioFontError) return response.status(400).json({ error: error.message });
  return response.status(500).json({ error: "Unable to upload the font. Please try again." });
}

/** The Image Section's "Add font": the Project Owner uploads a font every Admin can then use. */
export function registerImageStudioFontRoute(app: Express, overrides: Partial<RouteDependencies> = {}) {
  const dependencies: RouteDependencies = {
    authenticateRequest: sdk.authenticateRequest.bind(sdk),
    twoFactorBlocked: async (request, user) => Boolean(await db.getAdminTwoFactorSettings(user.id)) && !hasAdminTwoFactorProof(request, user.id, user.sessionsValidFrom),
    uploadImageStudioFont,
    ...overrides,
  };

  const authenticateOwner = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await dependencies.authenticateRequest(request);
      if (!user) return response.status(401).json({ error: "Please log in to add a font." });
      if (user.role !== "admin" || user.accountStatus !== "active" || !ENV.ownerOpenId || user.openId !== ENV.ownerOpenId) {
        return response.status(403).json({ error: "Only the Project Owner can add fonts." });
      }
      if (await dependencies.twoFactorBlocked(request, user)) return response.status(403).json({ error: "Confirm your two-factor code first." });
      response.locals.fontOwnerId = user.id;
      return next();
    } catch {
      return response.status(401).json({ error: "Please log in to add a font." });
    }
  };

  app.post(
    "/api/admin/image-studio/fonts",
    authenticateOwner,
    (request, response, next) => upload.single("font")(request, response, error => (error ? sendUploadError(response, error) : next())),
    async (request, response) => {
      try {
        if (!request.file) return response.status(400).json({ error: "Upload exactly one font file." });
        const body = request.body as Record<string, string | undefined>;
        const result = await dependencies.uploadImageStudioFont({
          adminUserId: response.locals.fontOwnerId as number,
          file: request.file,
          name: body.name ?? "",
          script: body.script ?? "",
          category: body.category ?? "",
        });
        return response.status(201).json(result);
      } catch (error) {
        return sendUploadError(response, error);
      }
    },
  );
}
