import Cropper, { type Area } from "react-easy-crop";
import { Check, RotateCcw } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { tutorProfileResponsiveClasses } from "@/pages/TutorProfileResponsive";

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

/**
 * A client-only square cropper on the shared `<Modal>` shell. It opens over the
 * profile section editor, which watches for the panel's test id to hand the
 * keyboard across while this is up. The server still validates every uploaded
 * byte and dimension.
 */
export function TutorProfilePhotoEditor({ imageUrl, isSubmitting = false, onCancel, onConfirm }: TutorProfilePhotoEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <Modal size="md" onClose={onCancel} busy={isSubmitting} panelTestId="tutor-profile-photo-editor-panel">
      <ModalHeader title="Crop photo" meta="Keep your face within the frame. This will be a square profile photo." />
      <ModalBody className="space-y-3 !px-0 !py-0">
        <div data-testid="tutor-profile-photo-editor-crop-stage" className={tutorProfileResponsiveClasses.photoEditorCropStage}>
          <Cropper image={imageUrl} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)} />
        </div>
        <div className="space-y-3 px-4 pb-1 sm:px-5">
          <label className="block text-sm font-semibold text-[#244a6a]">Zoom <input className="mt-2 w-full accent-j-accent" type="range" min={1} max={3} step={0.05} value={zoom} onChange={event => setZoom(Number(event.target.value))} aria-label="Photo zoom" /></label>
          {error ? <p role="alert" className="text-sm font-medium text-[#bf3b3b]">{error}</p> : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); }} className="border-[#c9ddeb] text-[#42657d]"><RotateCcw size={15} /> Reset</Button>
        <Button type="button" disabled={isSubmitting || !croppedAreaPixels} onClick={() => void confirmCrop()} className="bg-j-accent font-bold"><Check size={16} /> {isSubmitting ? "Uploading…" : "Use this photo"}</Button>
      </ModalFooter>
    </Modal>
  );
}
