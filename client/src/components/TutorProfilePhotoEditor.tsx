import Cropper, { type Area } from "react-easy-crop";
import { Check, Grid, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { tutorProfileResponsiveClasses } from "@/pages/TutorProfileResponsive";
import { SiteText } from "@/lib/siteContent";

type TutorProfilePhotoEditorProps = {
  imageUrl: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

/** Convert degree to radians */
function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

async function cropSquarePhoto(imageUrl: string, area: Area, rotation = 0) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const source = new Image();
    source.onload = () => resolve(source);
    source.onerror = () => reject(new Error("The selected photo could not be prepared."));
    source.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the profile photo.");

  if (rotation === 0) {
    context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  } else {
    // Intermediate canvas for rotated bounding box
    const rotCanvas = document.createElement("canvas");
    const rotContext = rotCanvas.getContext("2d");
    if (!rotContext) throw new Error("Your browser could not prepare the profile photo.");

    const rad = toRadians(rotation);
    const bBoxWidth = Math.abs(Math.cos(rad) * image.width) + Math.abs(Math.sin(rad) * image.height);
    const bBoxHeight = Math.abs(Math.sin(rad) * image.width) + Math.abs(Math.cos(rad) * image.height);

    rotCanvas.width = bBoxWidth;
    rotCanvas.height = bBoxHeight;

    rotContext.translate(bBoxWidth / 2, bBoxHeight / 2);
    rotContext.rotate(rad);
    rotContext.drawImage(image, -image.width / 2, -image.height / 2);

    context.drawImage(rotCanvas, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  }

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Your browser could not prepare the profile photo.");
  return new File([blob], "tutor-profile-photo.jpg", { type: "image/jpeg" });
}

/**
 * A client-only square cropper on the shared `<Modal>` shell. It opens over the
 * profile section editor, which watches for the panel's test id to hand the
 * keyboard across while this is up. The server still validates every uploaded
 * byte and dimension.
 *
 * Enhanced with Package 4: Smooth interactive controls for Zoom, 90° rotation,
 * grid alignment guides, and aspect framing toggle.
 */
export function TutorProfilePhotoEditor({ imageUrl, isSubmitting = false, onCancel, onConfirm }: TutorProfilePhotoEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [cropShape, setCropShape] = useState<"round" | "rect">("round");
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmCrop = async () => {
    if (!croppedAreaPixels) return;
    setError(null);
    try {
      onConfirm(await cropSquarePhoto(imageUrl, croppedAreaPixels, rotation));
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "The selected photo could not be prepared.");
    }
  };

  const resetAll = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  return (
    <Modal size="panel" onClose={onCancel} busy={isSubmitting} panelTestId="tutor-profile-photo-editor-panel">
      <ModalHeader title="Crop photo" meta="Keep your face within the frame. This will be a square profile photo." />
      <ModalBody className="space-y-3 !px-0 !py-0">
        <div data-testid="tutor-profile-photo-editor-crop-stage" className={tutorProfileResponsiveClasses.photoEditorCropStage}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape={cropShape}
            showGrid={showGrid}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>
        <div className="space-y-2.5 px-4 pb-1 sm:px-5">
          {/* Zoom controls */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-tp-value">Zoom ({Math.round(zoom * 100)}%)</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(1, Number((z - 0.2).toFixed(2))))}
                aria-label="Zoom out"
                disabled={zoom <= 1}
                className="grid size-7 place-items-center rounded-lg border border-tp-border text-tp-value hover:bg-tp-accent-wash disabled:opacity-40"
              >
                <ZoomOut size={14} />
              </button>
              <input
                className="w-28 sm:w-44 accent-tp-accent"
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={event => setZoom(Number(event.target.value))}
                aria-label="Photo zoom"
              />
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(3, Number((z + 0.2).toFixed(2))))}
                aria-label="Zoom in"
                disabled={zoom >= 3}
                className="grid size-7 place-items-center rounded-lg border border-tp-border text-tp-value hover:bg-tp-accent-wash disabled:opacity-40"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          </div>

          {/* Quick tool buttons: Rotate 90°, Toggle Grid, Shape Preview */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-tp-border/60 pt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRotation(r => (r + 90) % 360)}
                aria-label="Rotate 90 degrees clockwise"
                className="inline-flex items-center gap-1 rounded-lg border border-tp-border px-2.5 py-1 text-2xs font-semibold text-tp-value hover:bg-tp-accent-wash active:scale-95"
              >
                <RotateCw size={13} /> Rotate 90°
              </button>
              <button
                type="button"
                onClick={() => setShowGrid(g => !g)}
                aria-label="Toggle grid guidelines"
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-2xs font-semibold transition ${
                  showGrid ? "border-tp-accent bg-tp-accent-wash text-tp-accent" : "border-tp-border text-tp-value hover:bg-tp-accent-wash"
                }`}
              >
                <Grid size={13} /> Grid
              </button>
              <button
                type="button"
                onClick={() => setCropShape(s => (s === "round" ? "rect" : "round"))}
                aria-label="Toggle avatar shape preview"
                className="inline-flex items-center gap-1 rounded-lg border border-tp-border px-2.5 py-1 text-2xs font-semibold text-tp-value hover:bg-tp-accent-wash"
              >
                {cropShape === "round" ? "Round Frame" : "Square Frame"}
              </button>
            </div>
            {rotation !== 0 ? (
              <span className="text-3xs font-mono text-tp-label">Rotation: {rotation}°</span>
            ) : null}
          </div>

          {error ? <p role="alert" className="text-sm font-medium text-tp-danger-ink">{error}</p> : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={resetAll} className="border-tp-border text-tp-value">
          <RotateCcw size={15} /> <SiteText slotId="button-section.profile.photoReset" fallback="Reset" />
        </Button>
        <Button type="button" disabled={isSubmitting || !croppedAreaPixels} onClick={() => void confirmCrop()} className="bg-tp-accent font-bold">
          <Check size={16} /> {isSubmitting ? "Uploading…" : <SiteText slotId="button-section.profile.photoUse" fallback="Use this photo" />}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
