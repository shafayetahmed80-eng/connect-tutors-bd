import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { imageStudioFonts, imageStudioMarks } from "../drizzle/schema";
import { getDb } from "./db";
import { storageDelete, storageGetSignedUrl, storagePut } from "./storage";

/** Bangla fonts can be large; 10 MB holds every real one the Owner is likely to buy. */
export const MAX_IMAGE_STUDIO_FONT_BYTES = 10 * 1024 * 1024;

export const imageStudioFontScripts = ["bn", "en"] as const;
export const imageStudioFontCategories = ["sans", "serif", "display", "hand"] as const;
export type ImageStudioFontScript = (typeof imageStudioFontScripts)[number];
export type ImageStudioFontCategory = (typeof imageStudioFontCategories)[number];

export class ImageStudioFontError extends Error {}

const formats = {
  woff2: { contentType: "font/woff2" },
  woff: { contentType: "font/woff" },
  ttf: { contentType: "font/ttf" },
  otf: { contentType: "font/otf" },
} as const;
type FontFormat = keyof typeof formats;

/** What the file really is, from its first bytes - the name and the browser's claimed type are not trusted. */
export function detectFontFormat(buffer: Buffer): FontFormat | null {
  if (buffer.length < 12) return null;
  const tag = buffer.toString("latin1", 0, 4);
  if (tag === "wOF2") return "woff2";
  if (tag === "wOFF") return "woff";
  if (tag === "OTTO") return "otf";
  if (tag === "true" || buffer.readUInt32BE(0) === 0x00010000) return "ttf";
  return null;
}

export async function uploadImageStudioFont(input: {
  adminUserId: number;
  file: { buffer: Buffer; size: number };
  name: string;
  script: string;
  category: string;
}) {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 60) throw new ImageStudioFontError("Give the font a name of up to 60 characters.");
  if (!(imageStudioFontScripts as readonly string[]).includes(input.script)) throw new ImageStudioFontError("Choose Bangla or English for the font.");
  if (!(imageStudioFontCategories as readonly string[]).includes(input.category)) throw new ImageStudioFontError("Choose the font's type.");
  if (input.file.size > MAX_IMAGE_STUDIO_FONT_BYTES) throw new ImageStudioFontError("Fonts must be 10 MB or smaller.");
  const format = detectFontFormat(input.file.buffer);
  if (!format) throw new ImageStudioFontError("This file is not a font. Upload a .ttf, .otf, .woff or .woff2 file.");

  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const id = `upload-${randomBytes(6).toString("hex")}`;
  // Storage adds its own suffix to the name, so the key it hands back is the one to keep.
  const { key: fileKey } = await storagePut(`image-studio/fonts/${id}.${format}`, input.file.buffer, formats[format].contentType);
  await database.insert(imageStudioFonts).values({
    id,
    name,
    script: input.script,
    category: input.category,
    fileKey,
    format,
    sizeBytes: input.file.size,
    uploadedByAdminId: input.adminUserId,
  });
  return { id, name };
}

/** Every uploaded font, oldest first (so their U-codes stay put), each with a link only Admins can open. */
export async function listImageStudioUploadedFonts() {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const rows = await database.select().from(imageStudioFonts).orderBy(asc(imageStudioFonts.createdAt), asc(imageStudioFonts.id));
  return Promise.all(rows.map(async row => ({
    id: row.id,
    name: row.name,
    script: row.script as ImageStudioFontScript,
    category: row.category as ImageStudioFontCategory,
    format: row.format,
    sizeBytes: row.sizeBytes,
    url: await storageGetSignedUrl(row.fileKey),
  })));
}

/** Removes an uploaded font for good - its file, its row and any star or archive mark on it. */
export async function deleteImageStudioFont(id: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [row] = await database.select({ fileKey: imageStudioFonts.fileKey }).from(imageStudioFonts).where(eq(imageStudioFonts.id, id)).limit(1);
  if (!row) return { deleted: false as const };
  await database.delete(imageStudioMarks).where(and(eq(imageStudioMarks.kind, "font"), eq(imageStudioMarks.itemId, id)));
  await database.delete(imageStudioFonts).where(eq(imageStudioFonts.id, id));
  await storageDelete(row.fileKey);
  return { deleted: true as const };
}
