import type { Express } from "express";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { ENV } from "./env";
import { isLocalStorageBackend, resolveLocalStoragePath } from "../storage";

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (isLocalStorageBackend()) {
      // Local dev: stream the file storagePut wrote to disk.
      try {
        const filePath = resolveLocalStoragePath(key);
        const info = await stat(filePath).catch(() => null);
        if (!info?.isFile()) {
          res.status(404).send("Not found");
          return;
        }
        res.set("Cache-Control", "no-store");
        res.type(CONTENT_TYPE_BY_EXTENSION[path.extname(filePath).toLowerCase()] ?? "application/octet-stream");
        createReadStream(filePath).pipe(res);
      } catch (err) {
        console.error("[StorageProxy] local serve failed:", err);
        res.status(500).send("Storage proxy error");
      }
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
