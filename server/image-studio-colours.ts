import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { colourContrast, MIN_TEXT_CONTRAST, normalizeHexColour } from "@shared/colour-contrast";
import { imageStudioColours, imageStudioMarks } from "../drizzle/schema";
import { getDb } from "./db";

export class ImageStudioColourError extends Error {}

/** Saves one colour pair for every Admin. The text must read on the ground, the same rule the screen shows. */
export async function createImageStudioColour(input: { adminUserId: number; name: string; ground: string; text: string; accent: string }) {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 40) throw new ImageStudioColourError("Give the colour pair a name of up to 40 characters.");
  const ground = normalizeHexColour(input.ground);
  const text = normalizeHexColour(input.text);
  const accent = normalizeHexColour(input.accent);
  if (!ground || !text || !accent) throw new ImageStudioColourError("Each colour must be a hex code like #0b4b86.");
  if (colourContrast(ground, text) < MIN_TEXT_CONTRAST) throw new ImageStudioColourError("The text is hard to read on that background. Pick a lighter or darker text colour.");

  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const id = `own-${randomBytes(6).toString("hex")}`;
  await database.insert(imageStudioColours).values({ id, name, ground, text, accent, createdByAdminId: input.adminUserId });
  return { id, name };
}

/** Every saved pair, oldest first, so their O-codes stay put. */
export async function listImageStudioOwnColours() {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const rows = await database.select().from(imageStudioColours).orderBy(asc(imageStudioColours.createdAt), asc(imageStudioColours.id));
  return rows.map(row => ({ id: row.id, name: row.name, ground: row.ground, text: row.text, accent: row.accent }));
}

/** Removes a saved pair for good, with any star or archive mark on it. */
export async function deleteImageStudioColour(id: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [row] = await database.select({ id: imageStudioColours.id }).from(imageStudioColours).where(eq(imageStudioColours.id, id)).limit(1);
  if (!row) return { deleted: false as const };
  await database.delete(imageStudioMarks).where(and(eq(imageStudioMarks.kind, "colour"), eq(imageStudioMarks.itemId, id)));
  await database.delete(imageStudioColours).where(eq(imageStudioColours.id, id));
  return { deleted: true as const };
}
