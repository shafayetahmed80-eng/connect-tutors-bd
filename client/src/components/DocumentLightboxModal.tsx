import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Maximize2,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { cn } from "@/lib/utils";

export type LightboxDocumentItem = {
  id: string;
  label: string;
  url: string | null;
  status?: "not_uploaded" | "uploaded" | "pending" | "approved" | "rejected" | "changes_requested";
  reason?: string | null;
};

export type DocumentLightboxModalProps = {
  isOpen: boolean;
  onClose: () => void;
  items: LightboxDocumentItem[];
  initialIndex?: number;
  tutorName?: string;
  onApprove?: (item: LightboxDocumentItem) => void;
  onRequestReupload?: (item: LightboxDocumentItem) => void;
};

export function DocumentLightboxModal({
  isOpen,
  onClose,
  items,
  initialIndex = 0,
  tutorName,
  onApprove,
  onRequestReupload,
}: DocumentLightboxModalProps) {
  useBodyScrollLock(isOpen);

  // Filter only items that have an accessible URL, or keep all to show missing ones
  const validItems = items.filter(it => Boolean(it.url));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialIndex when opening
  useEffect(() => {
    if (isOpen) {
      const idx = initialIndex >= 0 && initialIndex < items.length ? initialIndex : 0;
      // Find matching item in validItems if possible
      const targetItem = items[idx];
      const validIdx = validItems.findIndex(it => it.id === targetItem?.id);
      setCurrentIndex(validIdx >= 0 ? validIdx : 0);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, items]);

  // Reset transform when changing current item
  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handlePrev = useCallback(() => {
    if (validItems.length <= 1) return;
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : validItems.length - 1));
    resetTransform();
  }, [validItems.length, resetTransform]);

  const handleNext = useCallback(() => {
    if (validItems.length <= 1) return;
    setCurrentIndex(prev => (prev < validItems.length - 1 ? prev + 1 : 0));
    resetTransform();
  }, [validItems.length, resetTransform]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(4, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(0.5, Math.round((prev - 0.25) * 100) / 100);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotateCw = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleRotateCcw = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (e.shiftKey) handleRotateCcw();
        else handleRotateCw();
      } else if (e.key === "0") {
        e.preventDefault();
        resetTransform();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose, resetTransform]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Mouse drag for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    setPan({
      x: dragStart.current.panX + deltaX,
      y: dragStart.current.panY + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag for pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || zoom <= 1 || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStart.current.x;
    const deltaY = e.touches[0].clientY - dragStart.current.y;
    setPan({
      x: dragStart.current.panX + deltaX,
      y: dragStart.current.panY + deltaY,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  const currentItem = validItems[currentIndex];

  const handleDownload = () => {
    if (!currentItem?.url) return;
    const a = document.createElement("a");
    a.href = currentItem.url;
    a.download = `${tutorName ? `${tutorName}-` : ""}${currentItem.id}.png`;
    a.target = "_blank";
    a.rel = "noreferrer noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentItem ? `${currentItem.label} document preview` : "Document lightbox"}
      className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-md select-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Header Bar */}
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-black/60 px-4 text-white sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-sky-400">
            <FileText size={18} aria-hidden={true} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-tight sm:text-base">
              {currentItem?.label || "Document Preview"}
            </h2>
            <div className="flex items-center gap-2 text-2xs text-white/60">
              {tutorName ? <span className="truncate max-w-[140px] sm:max-w-none">{tutorName}</span> : null}
              {tutorName && validItems.length > 0 ? <span>•</span> : null}
              {validItems.length > 0 ? (
                <span>
                  {currentIndex + 1} of {validItems.length}
                </span>
              ) : null}
            </div>
          </div>

          {/* Status Badge */}
          {currentItem?.status && currentItem.status !== "not_uploaded" ? (
            <span
              className={cn(
                "ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-3xs font-bold uppercase tracking-wider",
                currentItem.status === "approved"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : currentItem.status === "changes_requested" || currentItem.status === "rejected"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-sky-500/20 text-sky-300 border border-sky-500/30",
              )}
            >
              {currentItem.status === "approved" ? <Check size={11} /> : null}
              {currentItem.status === "changes_requested" || currentItem.status === "rejected" ? (
                <AlertCircle size={11} />
              ) : null}
              {currentItem.status.replace("_", " ")}
            </span>
          ) : null}
        </div>

        {/* Header Right Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom & Rotation indicator pill */}
          <div className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-2xs font-medium text-white/75 sm:flex">
            <span>{Math.round(zoom * 100)}%</span>
            {rotation !== 0 ? (
              <>
                <span>•</span>
                <span>{rotation}°</span>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close document preview"
            title="Close (Esc)"
            className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Viewport Stage */}
      <main
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-6",
          zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default",
        )}
      >
        {currentItem?.url ? (
          <div
            className="relative flex items-center justify-center transition-transform"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
          >
            <img
              src={currentItem.url}
              alt={currentItem.label}
              draggable={false}
              className="max-h-[72dvh] max-w-[92vw] rounded-lg object-contain shadow-2xl drop-shadow-2xl sm:max-h-[76vh] sm:max-w-[85vw]"
            />
          </div>
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-white/20 p-8 text-center text-white/60">
            <FileText size={48} className="mb-3 text-white/30" />
            <p className="text-sm font-semibold">No document image available</p>
          </div>
        )}

        {/* Previous Navigation Button */}
        {validItems.length > 1 ? (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous document"
            title="Previous document (Left Arrow)"
            className="group absolute left-2 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full border border-white/15 bg-black/60 text-white shadow-xl backdrop-blur transition hover:scale-110 hover:bg-black/90 hover:border-sky-400 active:scale-95 sm:left-6 sm:size-12"
          >
            <ChevronLeft size={24} className="transition group-hover:-translate-x-0.5" />
          </button>
        ) : null}

        {/* Next Navigation Button */}
        {validItems.length > 1 ? (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next document"
            title="Next document (Right Arrow)"
            className="group absolute right-2 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full border border-white/15 bg-black/60 text-white shadow-xl backdrop-blur transition hover:scale-110 hover:bg-black/90 hover:border-sky-400 active:scale-95 sm:right-6 sm:size-12"
          >
            <ChevronRight size={24} className="transition group-hover:translate-x-0.5" />
          </button>
        ) : null}
      </main>

      {/* Floating Control Dock & Bottom Thumbnails */}
      <footer className="relative z-10 flex shrink-0 flex-col items-center gap-2 border-t border-white/10 bg-black/75 px-4 py-2.5 backdrop-blur-md sm:py-3">
        {/* Floating Toolbar Pill */}
        <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-xl backdrop-blur sm:gap-1.5">
          {/* Rotate Counter-Clockwise */}
          <button
            type="button"
            onClick={handleRotateCcw}
            aria-label="Rotate 90 degrees counter-clockwise"
            title="Rotate Left (Shift+R)"
            className="grid size-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95"
          >
            <RotateCcw size={17} />
          </button>

          {/* Rotate Clockwise */}
          <button
            type="button"
            onClick={handleRotateCw}
            aria-label="Rotate 90 degrees clockwise"
            title="Rotate Right (R)"
            className="grid size-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95"
          >
            <RotateCw size={17} />
          </button>

          <span className="mx-0.5 h-5 w-px bg-white/20" />

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            aria-label="Zoom out"
            title="Zoom Out (-)"
            className="grid size-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95 disabled:opacity-40"
          >
            <ZoomOut size={17} />
          </button>

          {/* Reset Transform */}
          <button
            type="button"
            onClick={resetTransform}
            aria-label="Reset zoom and rotation"
            title="Reset to Fit (0)"
            className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95"
          >
            <Maximize2 size={15} />
            <span className="hidden sm:inline">Fit</span>
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            aria-label="Zoom in"
            title="Zoom In (+)"
            className="grid size-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95 disabled:opacity-40"
          >
            <ZoomIn size={17} />
          </button>

          <span className="mx-0.5 h-5 w-px bg-white/20" />

          {/* Download Original Image */}
          {currentItem?.url ? (
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Download document"
              title="Download image"
              className="grid size-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95"
            >
              <Download size={17} />
            </button>
          ) : null}

          {/* Open Original in New Tab */}
          {currentItem?.url ? (
            <a
              href={currentItem.url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Open original image in new tab"
              title="Open full resolution in new tab"
              className="grid size-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95"
            >
              <ExternalLink size={17} />
            </a>
          ) : null}

          {/* Optional Action Buttons (Approve / Request Re-upload hooks) */}
          {onApprove && currentItem ? (
            <>
              <span className="mx-0.5 h-5 w-px bg-white/20" />
              <button
                type="button"
                onClick={() => onApprove(currentItem)}
                aria-label="Approve document"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-500 active:scale-95"
              >
                <Check size={14} />
                <span>Approve</span>
              </button>
            </>
          ) : null}

          {onRequestReupload && currentItem ? (
            <button
              type="button"
              onClick={() => onRequestReupload(currentItem)}
              aria-label="Request re-upload for this document"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-3 text-xs font-bold text-white transition hover:bg-rose-500 active:scale-95"
            >
              <AlertCircle size={14} />
              <span>Request Re-upload</span>
            </button>
          ) : null}
        </div>

        {/* Thumbnail Navigation Strip */}
        {validItems.length > 1 ? (
          <div className="flex max-w-full items-center gap-1.5 overflow-x-auto py-1 scrollbar-none sm:gap-2">
            {validItems.map((item, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    resetTransform();
                  }}
                  aria-label={`Switch to ${item.label}`}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-2xs font-semibold transition",
                    isSelected
                      ? "border-sky-400 bg-sky-500/20 text-white shadow-sm ring-1 ring-sky-400"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90",
                  )}
                >
                  <span className="truncate max-w-[100px] sm:max-w-none">{item.label}</span>
                  {item.status === "approved" ? (
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                  ) : item.status === "changes_requested" || item.status === "rejected" ? (
                    <span className="size-1.5 rounded-full bg-rose-400" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </footer>
    </div>
  );
}
