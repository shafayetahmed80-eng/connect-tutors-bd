import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { listImageStudioMarks, setImageStudioMark } from "./image-studio";
import { ImageStudioColourError, createImageStudioColour, deleteImageStudioColour, listImageStudioOwnColours } from "./image-studio-colours";

const runId = `${Date.now()}`;
let adminId: number;

beforeAll(async () => {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [result] = await database.insert(users).values({ openId: `test-colours-${runId}`, name: "Test Owner", role: "admin" });
  adminId = result.insertId as number;
});

afterAll(async () => {
  const database = await getDb();
  if (database) await database.delete(users).where(eq(users.id, adminId));
});

describe("saved colour pairs against the real database", () => {
  it("saves a pair (short hex widened), lists it, and deletes it with its marks", async () => {
    const { id } = await createImageStudioColour({ adminUserId: adminId, name: `  Eid   Gold ${runId} `, ground: "#612", text: "FFF4E6", accent: "#f5c35a" });
    expect(id).toMatch(/^own-[a-f0-9]{12}$/);

    const saved = (await listImageStudioOwnColours()).find(colour => colour.id === id);
    expect(saved).toEqual({ id, name: `Eid Gold ${runId}`, ground: "#661122", text: "#fff4e6", accent: "#f5c35a" });

    await setImageStudioMark({ kind: "colour", itemId: id, starred: true, adminUserId: adminId });
    await expect(deleteImageStudioColour(id)).resolves.toEqual({ deleted: true });
    expect((await listImageStudioOwnColours()).some(colour => colour.id === id)).toBe(false);
    expect((await listImageStudioMarks()).some(mark => mark.itemId === id)).toBe(false);
    await expect(deleteImageStudioColour(id)).resolves.toEqual({ deleted: false });
  });

  it("refuses a bad name, a malformed colour, and text that does not read on its background", async () => {
    const good = { adminUserId: adminId, name: "X", ground: "#0b4b86", text: "#ffffff", accent: "#7cc4ff" };
    await expect(createImageStudioColour({ ...good, name: " " })).rejects.toThrow(ImageStudioColourError);
    await expect(createImageStudioColour({ ...good, accent: "blue" })).rejects.toThrow(/hex code/);
    await expect(createImageStudioColour({ ...good, ground: "#ffffff", text: "#f0f0f0" })).rejects.toThrow(/hard to read/);
  });
});
