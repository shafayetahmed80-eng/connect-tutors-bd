import { imageStudioMarks } from "../drizzle/schema";
import { getDb } from "./db";

/** What an Image Section mark can be about. Colours and uploaded fonts join the fonts in later steps. */
export const imageStudioMarkKinds = ["font"] as const;
export type ImageStudioMarkKind = (typeof imageStudioMarkKinds)[number];

export type ImageStudioMark = { kind: ImageStudioMarkKind; itemId: string; starred: boolean; archived: boolean };

/** Every mark the Project Owner has set; an item with no row is neither starred nor archived. */
export async function listImageStudioMarks(): Promise<ImageStudioMark[]> {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const rows = await database
    .select({ kind: imageStudioMarks.kind, itemId: imageStudioMarks.itemId, starred: imageStudioMarks.starred, archived: imageStudioMarks.archived })
    .from(imageStudioMarks);
  return rows
    .filter((row): row is typeof row & { kind: ImageStudioMarkKind } => (imageStudioMarkKinds as readonly string[]).includes(row.kind))
    .map(row => ({ ...row, starred: Boolean(row.starred), archived: Boolean(row.archived) }));
}

/** Stars or archives one item for every Admin's list. Only the field given changes; the other keeps its value. */
export async function setImageStudioMark(input: { kind: ImageStudioMarkKind; itemId: string; starred?: boolean; archived?: boolean; adminUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const changes = {
    ...(input.starred === undefined ? {} : { starred: input.starred }),
    ...(input.archived === undefined ? {} : { archived: input.archived }),
    updatedByAdminId: input.adminUserId,
  };
  await database
    .insert(imageStudioMarks)
    .values({ kind: input.kind, itemId: input.itemId, starred: input.starred ?? false, archived: input.archived ?? false, updatedByAdminId: input.adminUserId })
    .onDuplicateKeyUpdate({ set: changes });
  return { saved: true as const };
}
