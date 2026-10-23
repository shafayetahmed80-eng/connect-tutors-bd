import React, { useState } from "react";
import { Download, ExternalLink, FileText, FileUp, Maximize2, UploadCloud, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Extracts a readable filename from an attachment URL or storage key.
 */
export function extractFilename(url: string): string {
  try {
    const parts = url.split("?")[0].split("/");
    const lastPart = parts[parts.length - 1] || "document.pdf";
    return decodeURIComponent(lastPart);
  } catch {
    return "document.pdf";
  }
}

/**
 * Parse single or multiple image URLs from attachment string (supports comma-delimited or JSON array).
 */
export function parseImageUrls(url: string | null): string[] {
  if (!url) return [];
  const trimmed = url.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // Fall through
    }
  }
  if (trimmed.includes(",")) {
    return trimmed.split(",").map(u => u.trim()).filter(Boolean);
  }
  return [trimmed];
}

/**
 * Task 6: Animated Drag & Drop File Upload Zone Overlay.
 */
export function ChatDropzoneOverlay({ isDragging }: { isDragging: boolean }) {
  if (!isDragging) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl bg-sky-500/10 p-6 backdrop-blur-xs"
        data-testid="chat-dropzone-overlay"
      >
        <motion.div
          initial={{ scale: 0.9, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 10 }}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-j-accent bg-white/95 px-8 py-6 shadow-xl"
        >
          <div className="grid size-12 place-items-center rounded-full bg-j-accent-wash text-j-accent animate-bounce">
            <UploadCloud size={28} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-j-ink">এখানে ফাইল বা ছবি ড্রপ করুন</p>
            <p className="mt-0.5 text-2xs font-semibold text-j-ink-faint">ছবি (PNG, JPG, WEBP) অথবা PDF ডকুমেন্টস</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Task 7: Professional PDF & Document Attachment Card.
 */
export function ChatDocumentCard({
  url,
  filename,
  fileSizeText,
  own = false,
}: {
  url: string;
  filename?: string;
  fileSizeText?: string;
  own?: boolean;
}) {
  const name = filename || extractFilename(url);
  const isPdf = name.toLowerCase().endsWith(".pdf") || url.toLowerCase().includes(".pdf");

  return (
    <div
      className={`mt-1.5 flex max-w-sm items-center gap-3 rounded-xl border p-2.5 shadow-xs transition-shadow hover:shadow-md ${
        own
          ? "border-white/20 bg-white/10 text-white"
          : "border-j-border bg-white text-j-ink"
      }`}
      data-testid="chat-document-card"
    >
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-lg ${
          isPdf
            ? own ? "bg-red-500/20 text-red-200" : "bg-red-50 text-red-600"
            : own ? "bg-sky-500/20 text-sky-200" : "bg-sky-50 text-sky-600"
        }`}
      >
        <FileText size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold leading-snug" title={name}>
          {name}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-2xs font-medium opacity-80">
          <span className="uppercase tracking-wide">{isPdf ? "PDF Document" : "Attachment"}</span>
          {fileSizeText ? <span>• {fileSizeText}</span> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="ডকুমেন্টটি ওপেন করুন"
          aria-label={`Attachment: Open ${name}`}
          className={`grid size-7 place-items-center rounded-lg transition-colors ${
            own
              ? "text-white/80 hover:bg-white/20 hover:text-white"
              : "text-j-ink-soft hover:bg-j-surface-sunken hover:text-j-accent"
          }`}
        >
          <ExternalLink size={14} />
        </a>
        <a
          href={url}
          download={name}
          title="ডাউনলোড করুন"
          aria-label={`Attachment: Download ${name}`}
          className={`grid size-7 place-items-center rounded-lg transition-colors ${
            own
              ? "text-white/80 hover:bg-white/20 hover:text-white"
              : "text-j-ink-soft hover:bg-j-surface-sunken hover:text-j-accent"
          }`}
        >
          <Download size={14} />
        </a>
      </div>
    </div>
  );
}

/**
 * Task 8: Multi-Image Collaged Gallery View.
 */
export function ChatMediaGallery({
  urls,
  onImageClick,
  onImageLoad,
  own = false,
}: {
  urls: string[];
  onImageClick?: (url: string) => void;
  onImageLoad?: () => void;
  own?: boolean;
}) {
  if (urls.length === 0) return null;

  if (urls.length === 1) {
    const singleUrl = urls[0];
    return (
      <button
        type="button"
        onClick={() => onImageClick?.(singleUrl)}
        className="group relative mt-1.5 block max-w-full overflow-hidden rounded-lg cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-white/50"
        title="Click to view full image"
        aria-label="View attachment image in full screen"
      >
        <img
          src={singleUrl}
          alt="Attachment"
          onLoad={onImageLoad}
          className="max-h-60 w-full object-cover transition-transform duration-200 group-hover:scale-102"
        />
        <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-2xs font-medium text-white backdrop-blur-xs opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 size={10} /> Full View
        </span>
      </button>
    );
  }

  // Multi-image collage grid (2 columns)
  const displayImages = urls.slice(0, 4);
  const extraCount = urls.length - 4;

  return (
    <div
      className={`mt-1.5 grid max-w-sm gap-1.5 overflow-hidden rounded-xl ${
        urls.length === 2 ? "grid-cols-2" : "grid-cols-2"
      }`}
      data-testid="chat-media-gallery"
    >
      {displayImages.map((imgUrl, idx) => {
        const isLastAndExtra = idx === 3 && extraCount > 0;
        return (
          <button
            key={imgUrl + idx}
            type="button"
            onClick={() => onImageClick?.(imgUrl)}
            className="group relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-white/50"
            title={`ছবি ${idx + 1} ওপেন করুন`}
          >
            <img
              src={imgUrl}
              alt={`Gallery image ${idx + 1}`}
              onLoad={onImageLoad}
              className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            {isLastAndExtra ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-bold text-white text-base">
                +{extraCount + 1}
              </div>
            ) : (
              <span className="absolute bottom-1 right-1 rounded bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Maximize2 size={10} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Task 5: Clipboard image attachment preview chip in composer.
 */
export function ClipboardImagePreviewChip({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [previewUrl] = useState<string>(() => {
    if (typeof window !== "undefined" && typeof window.URL?.createObjectURL === "function") {
      try {
        return window.URL.createObjectURL(file);
      } catch {
        return "";
      }
    }
    return "";
  });

  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 shadow-xs"
      data-testid="clipboard-image-preview-chip"
    >
      {previewUrl ? (
        <img src={previewUrl} alt="Pasted preview" className="size-8 rounded-lg object-cover shadow-xs" />
      ) : (
        <div className="grid size-8 place-items-center rounded-lg bg-sky-200 text-sky-800 text-2xs font-bold">
          IMG
        </div>
      )}
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-2xs font-bold text-sky-900">{file.name || "Pasted image"}</p>
        <p className="text-2xs font-medium text-sky-700">ক্লিপবোর্ড থেকে যুক্ত হয়েছে</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove pasted image"
        className="rounded-full p-1 text-sky-700 hover:bg-sky-200/60 transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}
