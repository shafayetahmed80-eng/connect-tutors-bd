/**
 * Smart client-side image compression for chat attachments.
 * Resizes large photos (e.g. 5-10MB phone camera shots) to a reasonable max dimension
 * and compresses them before upload, reducing upload time by up to 80-90% and saving bandwidth.
 */

export type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  minSizeToCompressBytes?: number;
};

const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_MAX_HEIGHT = 1600;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_MIN_SIZE_BYTES = 250 * 1024; // Only compress if > 250KB

export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
    minSizeToCompressBytes = DEFAULT_MIN_SIZE_BYTES,
  } = options;

  // Only compress raster images; skip PDFs, audio, svgs, gifs, etc.
  const isCompressible =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp";

  if (!isCompressible || file.size <= minSizeToCompressBytes) {
    return file;
  }

  // Graceful fallback for non-browser or environments without canvas
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Calculate constrained dimensions
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const targetMime = file.type === "image/png" ? "image/png" : "image/jpeg";

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compression didn't actually reduce size, keep original
            resolve(file);
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: blob.type || targetMime,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        targetMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
