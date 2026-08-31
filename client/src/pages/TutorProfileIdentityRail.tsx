import React from "react";
import { ArrowRight, Camera, Eye, GraduationCap, IdCard, Mail, MapPin, PencilLine, Phone, SquareLibrary, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { tutorProfileResponsiveClasses } from "./TutorProfileResponsive";

function MetaRow({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: string }) {
  return <div className="flex items-start gap-2.5">
    <Icon size={15} className="mt-0.5 shrink-0 text-[#8fa6b6]" aria-hidden={true} />
    <span className="min-w-0">
      <span className="block text-[11px] text-[#8496a6]">{label}</span>
      <span className={`block break-words text-[13px] ${value ? "font-medium text-j-ink" : tp.rowValueMissing}`}>{value || "Not given"}</span>
    </span>
  </div>;
}

/**
 * The identity rail beside the profile workspace: photo, name, Tutor ID,
 * completion, the latest institute, and the toggle between the editable tab
 * panel and the read-only profile summary.
 *
 * The photo is managed here rather than inside a section popup. It is never
 * part of a draft payload (`profilePhotoUrl` is in no section's `fieldKeys`) —
 * upload and remove go straight to /api/tutor/profile-photo.
 */
export function TutorProfileIdentityRail({
  name,
  tutorNumber,
  photoUrl,
  photoPreviewFailed,
  photoError,
  uploadingPhoto,
  photoInputRef,
  onSelectPhoto,
  onRemovePhoto,
  onPhotoPreviewError,
  completionPercentage,
  email,
  phone,
  address,
  universityName,
  subjectName,
  onReturnToSelectedJob,
  previewMode,
  onTogglePreview,
}: {
  name: string;
  tutorNumber: number | null | undefined;
  photoUrl: string | null;
  photoPreviewFailed: boolean;
  photoError?: string;
  uploadingPhoto: boolean;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectPhoto: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onPhotoPreviewError: () => void;
  completionPercentage: number;
  email: string;
  phone: string;
  address: string;
  universityName: string;
  subjectName: string;
  /** Set only when the tutor arrived from a job "Apply Now" and is now approved. */
  onReturnToSelectedJob?: () => void;
  previewMode: boolean;
  onTogglePreview: () => void;
}) {
  const hasPhoto = Boolean(photoUrl) && !photoPreviewFailed;

  return <section
    aria-label="Profile summary"
    className={`${tutorProfileResponsiveClasses.identityRail} ${tp.card} p-5 text-center`}
  >
    <div className={`relative mx-auto w-28 rounded-full sm:w-32 ${photoError ? "ring-2 ring-j-err-border ring-offset-2" : ""}`}>
      <span className={tutorProfileResponsiveClasses.photoPreview}>
        {hasPhoto
          ? <img src={photoUrl ?? undefined} alt="Current Tutor profile photo" className="h-full w-full object-cover" onError={onPhotoPreviewError} />
          : <UserRound size={44} aria-hidden={true} />}
      </span>
      <button
        type="button"
        disabled={uploadingPhoto}
        onClick={() => photoInputRef.current?.click()}
        aria-label={hasPhoto ? "Replace photo" : "Upload photo"}
        className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border-2 border-white bg-j-accent text-white shadow-sm transition hover:bg-j-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 disabled:opacity-60"
      >
        <Camera size={15} aria-hidden={true} />
      </button>
    </div>
    <input
      ref={photoInputRef}
      id="tutor-profile-photo"
      type="file"
      className="sr-only"
      aria-label="Upload Tutor profile photo"
      aria-invalid={Boolean(photoError)}
      aria-required="true"
      accept="image/jpeg,image/jpg,image/pjpeg,image/png,image/webp"
      onChange={onSelectPhoto}
    />

    {hasPhoto ? <p className="mt-2.5 text-[12px]">
      <button type="button" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()} className="rounded font-semibold text-j-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 disabled:opacity-60">
        {uploadingPhoto ? "Uploading…" : "Replace"}
      </button>
      <span className="px-1.5 text-[#c3d1db]" aria-hidden={true}>·</span>
      <button type="button" disabled={uploadingPhoto} onClick={onRemovePhoto} className="rounded font-semibold text-[#bf3b3b] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 disabled:opacity-60">
        Remove photo
      </button>
    </p> : <p className="mt-2.5 text-[12px] font-semibold text-j-err">
      {uploadingPhoto ? "Uploading…" : "Add photo · required"}
    </p>}
    {photoError ? <p role="alert" className="mt-1 text-[11px] font-medium leading-4 text-j-err">{photoError}</p> : null}

    <h2 className={`mt-3 break-words text-base ${tp.heading}`}>{name || "Your Tutor profile"}</h2>
    <p className="mt-1 flex items-center justify-center gap-1.5 text-[12px] font-bold text-j-ink">
      <IdCard size={15} className="shrink-0 text-[#8fa6b6]" aria-hidden={true} />
      Tutor ID: {tutorNumber ?? "Preparing"}
    </p>

    <p className="mt-3 border-b border-j-border pb-3 text-[12px] font-bold text-j-ink">Profile completed: {completionPercentage}%</p>

    {onReturnToSelectedJob ? <Button
      type="button"
      onClick={onReturnToSelectedJob}
      className={`mt-3 ${tp.primaryButton} ${tutorProfileResponsiveClasses.completionActionButton}`}
    >
      Return to selected tuition <ArrowRight size={15} />
    </Button> : null}

    <div className="mt-4 space-y-3 text-left">
      <MetaRow icon={Mail} label="Email" value={email} />
      <MetaRow icon={Phone} label="Phone Number" value={phone} />
      <MetaRow icon={MapPin} label="Address" value={address} />
      <MetaRow icon={GraduationCap} label="Institute" value={universityName} />
      <MetaRow icon={SquareLibrary} label="Department / subject" value={subjectName} />
    </div>

    <Button
      type="button"
      variant="outline"
      onClick={onTogglePreview}
      className={`mt-4 rounded-xl border-j-accent/40 bg-j-accent-wash font-bold text-j-accent transition hover:bg-j-accent hover:text-white ${tutorProfileResponsiveClasses.completionActionButton}`}
    >
      {previewMode ? <><PencilLine size={15} /> Edit Information</> : <><Eye size={15} /> View Profile</>}
    </Button>
  </section>;
}
