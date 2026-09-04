import Cropper, { type Area } from "react-easy-crop";
import { Check, RotateCcw, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { tutorProfileResponsiveClasses } from "@/pages/TutorProfileResponsive";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type TutorProfilePhotoEditorProps = {
  imageUrl: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

async function cropSquarePhoto(imageUrl: string, area: Area) {
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
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Your browser could not prepare the profile photo.");
  return new File([blob], "tutor-profile-photo.jpg", { type: "image/jpeg" });
}

/** A client-only square cropper. The server still validates all uploaded bytes and dimensions. */
export function TutorProfilePhotoEditor({ imageUrl, isSubmitting = false, onCancel, onConfirm }: TutorProfilePhotoEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock();

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onCancel();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isSubmitting, onCancel]);

  const confirmCrop = async () => {
    if (!croppedAreaPixels) return;
    setError(null);
    try {
      onConfirm(await cropSquarePhoto(imageUrl, croppedAreaPixels));
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "The selected photo could not be prepared.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#102840]/65 p-0 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="photo-editor-title">
      <div data-testid="tutor-profile-photo-editor-panel" className={tutorProfileResponsiveClasses.photoEditorPanel}>
        <div className="flex items-start justify-between gap-4 border-b border-[#e1edf4] px-5 py-4">
          <div><h2 id="photo-editor-title" className="text-base font-bold text-j-ink">Crop photo</h2><p className="mt-1 text-sm text-[#698399]">Keep your face within the frame. This will be a square profile photo.</p></div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close photo editor" disabled={isSubmitting} onClick={onCancel}><X size={18} /></Button>
        </div>
        <div data-testid="tutor-profile-photo-editor-crop-stage" className={tutorProfileResponsiveClasses.photoEditorCropStage}>
          <Cropper image={imageUrl} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)} />
        </div>
        <div className="space-y-3 px-5 py-4">
          <label className="block text-sm font-semibold text-[#244a6a]">Zoom <input className="mt-2 w-full accent-j-accent" type="range" min={1} max={3} step={0.05} value={zoom} onChange={event => setZoom(Number(event.target.value))} aria-label="Photo zoom" /></label>
          {error ? <p role="alert" className="text-sm font-medium text-[#bf3b3b]">{error}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); }} className="border-[#c9ddeb] text-[#42657d]"><RotateCcw size={15} /> Reset</Button>
            <Button type="button" disabled={isSubmitting || !croppedAreaPixels} onClick={() => void confirmCrop()} className="bg-j-accent font-bold"><Check size={16} /> {isSubmitting ? "Uploading…" : "Use this photo"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
