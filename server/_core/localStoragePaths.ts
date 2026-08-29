import path from "node:path";

/**
 * Root directory for locally stored uploads (Guardian/Tutor profile
 * photos, etc). Defaults to a folder outside the built client bundle so
 * files are never served as static public assets by accident. Override with
 * LOCAL_STORAGE_DIR for deployments that want the uploads on a different
 * disk, mount point, or path.
 */
export const LOCAL_STORAGE_ROOT = path.resolve(
  process.env.LOCAL_STORAGE_DIR?.trim() || path.join(process.cwd(), "private-uploads")
);

/** Rejects any key that could escape LOCAL_STORAGE_ROOT via `..` segments. */
export function resolveSafeStoragePath(relKey: string): string | undefined {
  const normalized = relKey.replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return undefined;
  const resolved = path.resolve(LOCAL_STORAGE_ROOT, normalized);
  if (resolved !== LOCAL_STORAGE_ROOT && !resolved.startsWith(LOCAL_STORAGE_ROOT + path.sep)) return undefined;
  return resolved;
}
