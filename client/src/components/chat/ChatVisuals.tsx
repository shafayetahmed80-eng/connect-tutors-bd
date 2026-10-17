import React, { useEffect, useState } from "react";
import { Download, ExternalLink, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from "lucide-react";

/** Formats a date into a friendly chat grouping label */
export function formatChatDateGroup(value: string | Date): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Determines if two dates are from different calendar days */
export function isDifferentDay(d1?: string | Date | null, d2?: string | Date | null): boolean {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;

  return (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getDate() !== date2.getDate()
  );
}

/** Sticky centered date divider chip */
export function ChatDateDivider({ date }: { date: string | Date }) {
  const label = formatChatDateGroup(date);
  if (!label) return null;

  return (
    <div className="my-3 flex items-center justify-center">
      <span className="rounded-full border border-j-border/60 bg-white/95 px-3 py-0.5 text-3xs font-bold uppercase tracking-wider text-j-ink-faint shadow-2xs backdrop-blur-xs select-none">
        {label}
      </span>
    </div>
  );
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/** Parses plain message text and converts valid URLs into safe clickable links */
export function ChatAutoLink({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);

  return (
    <span className="whitespace-pre-wrap leading-6">
      {parts.map((part, index) => {
        if (part.match(URL_REGEX)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 underline font-semibold decoration-current/40 hover:decoration-current hover:opacity-90 break-all"
            >
              <span>{part}</span>
              <ExternalLink className="inline size-3 shrink-0 ml-0.5" aria-hidden="true" />
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

export interface ImageLightboxModalProps {
  url: string | null;
  onClose: () => void;
  title?: string;
}

/** In-app image viewer with zoom controls, reset, and direct download */
export function ImageLightboxModal({ url, onClose, title = "Image Preview" }: ImageLightboxModalProps) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [url]);

  useEffect(() => {
    if (!url) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "+" || event.key === "=") setZoom(z => Math.min(z + 0.25, 3));
      if (event.key === "-") setZoom(z => Math.max(z - 0.25, 0.5));
      if (event.key === "0") setZoom(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <header
        className="flex w-full max-w-4xl items-center justify-between gap-3 text-white"
        onClick={e => e.stopPropagation()}
      >
        <span className="truncate text-xs font-semibold text-white/80">{title}</span>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center rounded-lg bg-white/10 p-0.5 text-white/90">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
              title="Zoom out (-)"
              aria-label="Zoom out"
              disabled={zoom <= 0.5}
              className="grid size-8 place-items-center rounded-md hover:bg-white/20 disabled:opacity-30"
            >
              <ZoomOut className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              title="Reset zoom (0)"
              aria-label="Reset zoom"
              className="px-2 text-2xs font-bold hover:bg-white/20 rounded-md py-1"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
              title="Zoom in (+)"
              aria-label="Zoom in"
              disabled={zoom >= 3}
              className="grid size-8 place-items-center rounded-md hover:bg-white/20 disabled:opacity-30"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>

          {/* Download button */}
          <a
            href={url}
            download="attachment"
            target="_blank"
            rel="noopener noreferrer"
            title="Download image"
            aria-label="Download image"
            className="grid size-8 place-items-center rounded-lg bg-white/10 text-white/90 hover:bg-white/20 transition-colors"
          >
            <Download className="size-4" />
          </a>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close image preview"
            className="grid size-8 place-items-center rounded-lg bg-white/10 text-white/90 hover:bg-red-500/80 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {/* Image Preview Canvas */}
      <div
        className="flex min-h-0 flex-1 w-full items-center justify-center overflow-auto p-2"
        onClick={onClose}
      >
        <img
          src={url}
          alt={title}
          onClick={e => e.stopPropagation()}
          style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease-out" }}
          className="max-h-[85vh] max-w-[90vw] select-none rounded-lg object-contain shadow-2xl"
        />
      </div>

      {/* Footer hint */}
      <footer className="text-3xs font-medium text-white/50 select-none">
        Click anywhere outside or press Esc to close · Use +/- to zoom
      </footer>
    </div>
  );
}
