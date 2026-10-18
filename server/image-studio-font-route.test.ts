import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import { detectFontFormat, uploadImageStudioFont } from "./image-studio-fonts";
import { registerImageStudioFontRoute } from "./image-studio-font-route";

/** The first bytes of each real font format, padded to a plausible header. */
const fontFile = (head: number[] | string) => {
  const buffer = Buffer.alloc(64);
  if (typeof head === "string") buffer.write(head, 0, "latin1");
  else buffer.set(head, 0);
  return buffer;
};

const owner = { id: 1, role: "admin", accountStatus: "active", openId: ENV.ownerOpenId };
const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn(), twoFactorBlocked: vi.fn(), uploadImageStudioFont: vi.fn() }));

function createApp(useRealUpload = false) {
  const app = express();
  registerImageStudioFontRoute(app, {
    authenticateRequest: mocks.authenticateRequest,
    twoFactorBlocked: mocks.twoFactorBlocked,
    ...(useRealUpload ? {} : { uploadImageStudioFont: mocks.uploadImageStudioFont }),
  } as never);
  return app;
}

const post = (app: express.Express, file: Buffer, fields: Record<string, string> = { name: "Li Ador Noirrit", script: "bn", category: "sans" }) => {
  let req = request(app).post("/api/admin/image-studio/fonts");
  for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
  return req.attach("font", file, "font.ttf");
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticateRequest.mockResolvedValue(owner);
  mocks.twoFactorBlocked.mockResolvedValue(false);
  mocks.uploadImageStudioFont.mockResolvedValue({ id: "upload-0123456789ab", name: "Li Ador Noirrit" });
});

describe("what counts as a font", () => {
  it("knows the four formats by their first bytes, and nothing else", () => {
    expect(detectFontFormat(fontFile([0x00, 0x01, 0x00, 0x00]))).toBe("ttf");
    expect(detectFontFormat(fontFile("true"))).toBe("ttf");
    expect(detectFontFormat(fontFile("OTTO"))).toBe("otf");
    expect(detectFontFormat(fontFile("wOFF"))).toBe("woff");
    expect(detectFontFormat(fontFile("wOF2"))).toBe("woff2");
    expect(detectFontFormat(fontFile("%PDF"))).toBeNull();
    expect(detectFontFormat(Buffer.from("tiny"))).toBeNull();
  });
});

describe("POST /api/admin/image-studio/fonts", () => {
  it("takes a font from the Project Owner, with its name, language and type", async () => {
    const response = await post(createApp(), fontFile([0x00, 0x01, 0x00, 0x00]));

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: "upload-0123456789ab", name: "Li Ador Noirrit" });
    expect(mocks.uploadImageStudioFont).toHaveBeenCalledWith(expect.objectContaining({ adminUserId: 1, name: "Li Ador Noirrit", script: "bn", category: "sans" }));
  });

  it("refuses other Admins, anyone signed out, and an Owner who has not cleared two-factor in this browser", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({ ...owner, id: 2, openId: "admin-2" });
    expect((await post(createApp(), fontFile("wOF2"))).status).toBe(403);

    mocks.authenticateRequest.mockResolvedValueOnce(null);
    expect((await post(createApp(), fontFile("wOF2"))).status).toBe(401);

    mocks.twoFactorBlocked.mockResolvedValueOnce(true);
    expect((await post(createApp(), fontFile("wOF2"))).status).toBe(403);

    expect(mocks.uploadImageStudioFont).not.toHaveBeenCalled();
  });

  it("explains a file that is not a font, a missing name, an unknown language, and a file over 10 MB", async () => {
    const app = createApp(true);

    const notFont = await post(app, fontFile("%PDF"));
    expect(notFont.status).toBe(400);
    expect(notFont.body.error).toMatch(/not a font/);

    expect((await post(app, fontFile("wOF2"), { name: " ", script: "bn", category: "sans" })).body.error).toMatch(/name/);
    expect((await post(app, fontFile("wOF2"), { name: "X", script: "fr", category: "sans" })).body.error).toMatch(/Bangla or English/);

    const huge = await post(app, Buffer.alloc(10 * 1024 * 1024 + 1));
    expect(huge.status).toBe(400);
    expect(huge.body.error).toMatch(/10 MB/);
  });
});

it("rejects the same bad inputs when called directly, before touching storage", async () => {
  await expect(uploadImageStudioFont({ adminUserId: 1, file: { buffer: fontFile("%PDF"), size: 64 }, name: "X", script: "bn", category: "sans" })).rejects.toThrow(/not a font/);
  await expect(uploadImageStudioFont({ adminUserId: 1, file: { buffer: fontFile("wOF2"), size: 64 }, name: "X", script: "bn", category: "fancy" })).rejects.toThrow(/type/);
});
