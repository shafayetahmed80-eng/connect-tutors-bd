import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import fontFiles from "./image-studio-font-files.json";
import { studioFontPairs, studioFonts, visibleStudioFonts, type StudioFontMarks } from "./image-studio-fonts";

const PUBLIC = join(__dirname, "..", "..", "public");

describe("the Image Section font library", () => {
  it("holds the 13 Bangla and 30 English families of the specimen page, each code once", () => {
    expect(studioFonts.filter(font => font.script === "bn")).toHaveLength(13);
    expect(studioFonts.filter(font => font.script === "en")).toHaveLength(30);
    expect(new Set(studioFonts.map(font => font.code)).size).toBe(studioFonts.length);
    expect(new Set(studioFonts.map(font => font.id)).size).toBe(studioFonts.length);
  });

  it("ships every file it lists, and every family ships its licence", () => {
    const files = fontFiles as Record<string, { url: string }[]>;
    for (const font of studioFonts) {
      expect(files[font.id]?.length, font.id).toBeGreaterThan(0);
      for (const file of files[font.id]) expect(existsSync(join(PUBLIC, file.url)), file.url).toBe(true);
      const folder = readdirSync(join(PUBLIC, "image-fonts", font.id));
      expect(folder.some(name => name === "OFL.txt" || name === "COPYING.txt"), font.id).toBe(true);
    }
  });

  it("pairs a Bangla face with an English one", () => {
    for (const pair of studioFontPairs) {
      expect(studioFonts.find(font => font.id === pair.bn)?.script, pair.code).toBe("bn");
      expect(studioFonts.find(font => font.id === pair.en)?.script, pair.code).toBe("en");
    }
  });
});

describe("the list an Admin picks from", () => {
  const marks: StudioFontMarks = new Map([
    ["mina", { starred: true, archived: false }],
    ["galada", { starred: false, archived: true }],
  ]);

  it("leaves archived families out and puts starred ones first", () => {
    const ids = visibleStudioFonts({ script: "bn", marks }).map(font => font.id);
    expect(ids[0]).toBe("mina");
    expect(ids).not.toContain("galada");
    expect(ids).toHaveLength(12);
  });

  it("shows only the archived ones when asked, so they can be restored", () => {
    expect(visibleStudioFonts({ script: "bn", marks, showArchived: true }).map(font => font.id)).toEqual(["galada"]);
  });

  it("finds a family by name or by its specimen code, within a type", () => {
    expect(visibleStudioFonts({ script: "en", marks, search: "bebas" }).map(font => font.code)).toEqual(["E11"]);
    expect(visibleStudioFonts({ script: "en", marks, search: "e28" }).map(font => font.name)).toEqual(["Pacifico"]);
    expect(visibleStudioFonts({ script: "en", marks, category: "hand" }).map(font => font.code)).toEqual(["E28", "E29", "E30"]);
  });
});
