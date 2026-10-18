import { existsSync } from "node:fs";
import { eq } from "drizzle-orm";
import { resolveLocalStoragePath } from "./storage";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { listImageStudioMarks, setImageStudioMark } from "./image-studio";
import { deleteImageStudioFont, listImageStudioUploadedFonts, uploadImageStudioFont } from "./image-studio-fonts";

const runId = `${Date.now()}`;
let adminId: number;
const ttf = () => {
  const buffer = Buffer.alloc(128);
  buffer.set([0x00, 0x01, 0x00, 0x00], 0);
  return buffer;
};

beforeAll(async () => {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [result] = await database.insert(users).values({ openId: `test-font-upload-${runId}`, name: "Test Owner", role: "admin" });
  adminId = result.insertId as number;
});

afterAll(async () => {
  const database = await getDb();
  if (database) await database.delete(users).where(eq(users.id, adminId));
});

describe("uploaded fonts against the real database", () => {
  it("stores a font, lists it with a link, and deletes it with its marks", async () => {
    const { id } = await uploadImageStudioFont({ adminUserId: adminId, file: { buffer: ttf(), size: 128 }, name: `  Test   Font ${runId} `, script: "bn", category: "display" });
    expect(id).toMatch(/^upload-[a-f0-9]{12}$/);

    const listed = (await listImageStudioUploadedFonts()).find(font => font.id === id);
    expect(listed).toMatchObject({ name: `Test Font ${runId}`, script: "bn", category: "display", format: "ttf", sizeBytes: 128 });
    expect(listed?.url).toMatch(new RegExp(`image-studio/fonts/${id}[^/]*\\.ttf$`));
    const storedKey = listed!.url.replace(/^.*?(image-studio\/fonts\/)/, "$1");
    expect(existsSync(resolveLocalStoragePath(storedKey))).toBe(true);

    await setImageStudioMark({ kind: "font", itemId: id, starred: true, adminUserId: adminId });
    await expect(deleteImageStudioFont(id)).resolves.toEqual({ deleted: true });
    expect(existsSync(resolveLocalStoragePath(storedKey))).toBe(false);

    expect((await listImageStudioUploadedFonts()).some(font => font.id === id)).toBe(false);
    expect((await listImageStudioMarks()).some(mark => mark.itemId === id)).toBe(false);
    await expect(deleteImageStudioFont(id)).resolves.toEqual({ deleted: false });
  });
});
