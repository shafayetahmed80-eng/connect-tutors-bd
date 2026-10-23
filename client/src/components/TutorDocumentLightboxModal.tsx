import React, { useEffect, useState } from "react";
import { AlertCircle, Check, ExternalLink, ImagePlus, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TutorDocumentVerificationStatus } from "@shared/tutor-documents";

export type TutorDocumentLightboxModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  imageUrl: string;
  status?: TutorDocumentVerificationStatus;
  rejectionReason?: string | null;
  onTriggerUpload?: () => void;
};

/**
 * Full-screen accessible document lightbox for previewing uploaded credentials
 * (University ID, NID, certificates) with zoom, rotation, status banner,
 * and seamless replacement action without navigating away.
 */
export function TutorDocumentLightboxModal({
  isOpen,
  onClose,
  title,
  imageUrl,
  status,
  rejectionReason,
  onTriggerUpload,
}: TutorDocumentLightboxModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom & rotation when modal opens/closes or image changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, imageUrl]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isApproved = status === "approved";
  const isRejected = status === "changes_requested";

  const handleZoomIn = () => setZoom(prev => Math.min(3, Number((prev + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom(prev => Math.max(0.6, Number((prev - 0.25).toFixed(2))));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${title}`}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Header bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-sm sm:text-base font-bold text-white">{title}</h2>
          {isApproved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-2xs font-bold text-emerald-300 border border-emerald-500/30">
              <Check size={12} aria-hidden="true" /> Verified
            </span>
          ) : isRejected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-2xs font-bold text-rose-300 border border-rose-500/30">
              <AlertCircle size={12} aria-hidden="true" /> Re-upload Requested
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-2xs font-bold text-blue-300 border border-blue-500/30">
              Uploaded
            </span>
          )}
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2">
          {/* External open link */}
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${title} in new tab`}
            className="grid size-8 place-items-center rounded-lg border border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink size={15} />
          </a>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document preview"
            className="grid size-8 place-items-center rounded-lg border border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Main Image Viewport */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6">
        <div
          className="relative max-h-full max-w-full transition-transform duration-150 ease-out flex items-center justify-center select-none"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[72dvh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      </main>

      {/* Footer / Control bar */}
      <footer className="flex flex-wrap shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-slate-900/90 px-4 py-3 sm:px-6">
        {/* Zoom & Rotation toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom out"
            disabled={zoom <= 0.6}
            className="grid size-8 place-items-center rounded-lg border border-white/20 text-white/90 hover:bg-white/10 disabled:opacity-40"
          >
            <ZoomOut size={15} />
          </button>
          <span className="min-w-12 text-center text-xs font-mono text-white/90">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom in"
            disabled={zoom >= 3}
            className="grid size-8 place-items-center rounded-lg border border-white/20 text-white/90 hover:bg-white/10 disabled:opacity-40"
          >
            <ZoomIn size={15} />
          </button>

          <div className="mx-1 h-5 w-px bg-white/20" aria-hidden="true" />

          <button
            type="button"
            onClick={handleRotate}
            aria-label="Rotate 90 degrees"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/20 px-2.5 text-xs font-medium text-white/90 hover:bg-white/10"
          >
            <RotateCw size={14} /> Rotate
          </button>
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset zoom and rotation"
            disabled={zoom === 1 && rotation === 0}
            className="grid size-8 place-items-center rounded-lg border border-white/20 text-white/90 hover:bg-white/10 disabled:opacity-40"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Replacement Action */}
        {onTriggerUpload ? (
          <Button
            type="button"
            onClick={() => {
              onClose();
              onTriggerUpload();
            }}
            className="bg-blue-600 text-white hover:bg-blue-700 font-semibold gap-1.5"
          >
            <ImagePlus size={15} /> Upload Replacement
          </Button>
        ) : null}
      </footer>
    </div>
  );
}
