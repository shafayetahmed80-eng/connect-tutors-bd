import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { imageStudioMarks, users } from "../drizzle/schema";
import { getDb } from "./db";
import { listImageStudioMarks, setImageStudioMark } from "./image-studio";

const runId = `${Date.now()}`;
const itemId = `test-font-${runId}`;
let adminId: number;

beforeAll(async () => {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [result] = await database.insert(users).values({ openId: `test-image-studio-${runId}`, name: "Test Owner", role: "admin" });
  adminId = result.insertId as number;
});

afterAll(async () => {
  const database = await getDb();
  if (!database) return;
  await database.delete(imageStudioMarks).where(and(eq(imageStudioMarks.kind, "font"), inArray(imageStudioMarks.itemId, [itemId])));
  await database.delete(users).where(eq(users.id, adminId));
});

describe("Image Section marks against the real database", () => {
  it("stars an item, then archives it without losing the star, then restores it", async () => {
    const mine = async () => (await listImageStudioMarks()).find(mark => mark.itemId === itemId);

    expect(await mine()).toBeUndefined();

    await setImageStudioMark({ kind: "font", itemId, starred: true, adminUserId: adminId });
    expect(await mine()).toEqual({ kind: "font", itemId, starred: true, archived: false });

    await setImageStudioMark({ kind: "font", itemId, archived: true, adminUserId: adminId });
    expect(await mine()).toEqual({ kind: "font", itemId, starred: true, archived: true });

    await setImageStudioMark({ kind: "font", itemId, archived: false, adminUserId: adminId });
    expect(await mine()).toEqual({ kind: "font", itemId, starred: true, archived: false });
  });
});
