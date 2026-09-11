import React, { useState } from "react";
import { ArrowRight, Camera, ChevronDown, Eye, GraduationCap, IdCard, Mail, MapPin, PencilLine, Phone, SquareLibrary, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoUploadSuccess } from "@/components/PhotoUploadSuccess";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { tutorProfileResponsiveClasses } from "./TutorProfileResponsive";

/**
 * One contact or education line.
 *
 * Nothing here is bold. Weight in this card means "this needs you", which is
 * why the only heavy value is a missing required one - and it is red as well,
 * so it reads as a flag rather than as emphasis. Label and value are separated
 * by size and colour instead.
 */
function MetaRow({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: string }) {
  return <div className="flex items-start gap-2.5">
    <Icon size={15} className="mt-0.5 shrink-0 text-[#8fa6b6]" aria-hidden={true} />
    <span className="min-w-0">
      <span className="block text-[11px] leading-4 text-[#8496a6]">{label}</span>
      <span className={`block break-words text-sm leading-5 ${value ? "text-j-ink" : tp.rowValueMissingTone}`}>{value || "Not given"}</span>
    </span>
  </div>;
}

/**
 * The identity rail beside the profile workspace: photo, name, Tutor ID,
 * completion, the latest institute, and the toggle between the editable tab
 * panel and the read-only profile summary.
 *
 * Two shapes, one card. From `lg` up it is the centred column it has always
 * been, in the grid's fixed 300px track. Below that it is a left-aligned
 * band - a small photo beside the name - because a phone reads this as a
 * header before the real work, not as a column beside it: stacked and centred
 * it cost around 500px of scroll before the first tab came into view, and its
 * `max-w-xs` left it narrower than the cards underneath it. The five contact
 * lines fold away behind a disclosure there for the same reason, and are
 * always open from `lg` up where the room exists.
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
  photoSuccessAt,
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
  /** Upload time of the last successful photo upload, or null. Drives the badge. */
  photoSuccessAt: number | null;
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
  // Phones only: from `lg` up the list is always on screen and this is unused.
  const [contactOpen, setContactOpen] = useState(false);
  const completionWidth = Math.max(0, Math.min(100, completionPercentage));

  return <section
    aria-label="Profile summary"
    className={`${tutorProfileResponsiveClasses.identityRail} ${tp.card} p-5 text-left lg:text-center`}
  >
    {/*
      Photo in the first column, spanning the three rows beside it. From `lg`
      the grid collapses to one centred column and the explicit placements are
      dropped, which restores the original stacking order - photo, the
      replace/remove pair, then the name.
    */}
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 lg:grid-cols-1 lg:justify-items-center">
      <div className={`relative row-span-3 w-24 rounded-full sm:w-28 lg:row-span-1 lg:w-32 ${photoError ? "ring-2 ring-j-err-border ring-offset-2" : ""}`}>
        <span className={tutorProfileResponsiveClasses.photoPreview}>
          {hasPhoto
            ? <img src={photoUrl ?? undefined} alt="Current Tutor profile photo" className="h-full w-full object-cover" onError={onPhotoPreviewError} />
            : <UserRound size={40} aria-hidden={true} />}
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
        {photoSuccessAt ? (
          <PhotoUploadSuccess
            key={photoSuccessAt}
            className="absolute left-1/2 top-[calc(100%+0.5rem)] -translate-x-1/2 whitespace-nowrap"
          />
        ) : null}
      </div>

      {/*
        In the DOM the replace/remove pair comes before the name, which is the
        order the desktop column has always stacked in. The explicit rows below
        put it back underneath the name on phones, where it belongs beside the
        photo rather than over it.
      */}
      {hasPhoto ? <p className="col-start-2 row-start-3 mt-1.5 text-xs lg:col-auto lg:row-auto lg:mt-2.5">
        <button type="button" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()} className="rounded font-medium text-j-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 disabled:opacity-60">
          {uploadingPhoto ? "Uploading…" : "Replace"}
        </button>
        <span className="px-1.5 text-[#c3d1db]" aria-hidden={true}>·</span>
        <button type="button" disabled={uploadingPhoto} onClick={onRemovePhoto} className="rounded font-medium text-[#bf3b3b] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 disabled:opacity-60">
          Remove photo
        </button>
      </p> : <p className="col-start-2 row-start-3 mt-1.5 text-xs font-medium text-j-err lg:col-auto lg:row-auto lg:mt-2.5">
        {uploadingPhoto ? "Uploading…" : "Add photo · required"}
      </p>}

      <h2 className="col-start-2 row-start-1 break-words text-base font-semibold leading-6 tracking-[-0.02em] text-j-ink lg:col-auto lg:row-auto lg:mt-3">
        {name || "Your Tutor profile"}
      </h2>
      <p className="col-start-2 row-start-2 mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-[#6b8497] lg:col-auto lg:row-auto lg:mt-1 lg:justify-center">
        <IdCard size={15} className="shrink-0 text-[#8fa6b6]" aria-hidden={true} />
        Tutor ID: {tutorNumber ?? "Preparing"}
      </p>
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
    {photoError ? <p role="alert" className="mt-2 text-2xs font-medium leading-4 text-j-err">{photoError}</p> : null}

    {/*
      The percentage keeps its sentence; the bar underneath is decoration for
      it and is hidden from assistive tech, which would otherwise hear the same
      number twice.
    */}
    <div className="mt-4 border-b border-j-border pb-4">
      <p className="text-xs text-[#6b8497]">Profile completed: <span className="font-semibold tabular-nums text-j-ink">{completionPercentage}%</span></p>
      <div aria-hidden={true} className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#e8eff5]">
        <div className="h-full rounded-full bg-j-accent transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${completionWidth}%` }} />
      </div>
    </div>

    {onReturnToSelectedJob ? <Button
      type="button"
      onClick={onReturnToSelectedJob}
      className={`mt-3 ${tp.primaryButton} ${tutorProfileResponsiveClasses.completionActionButton}`}
    >
      Return to selected tuition <ArrowRight size={15} />
    </Button> : null}

    <button
      type="button"
      onClick={() => setContactOpen(open => !open)}
      aria-expanded={contactOpen}
      className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg py-1 text-xs font-medium text-[#6b8497] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 lg:hidden"
    >
      Contact and institute
      <ChevronDown size={15} aria-hidden={true} className={`shrink-0 transition-transform motion-reduce:transition-none ${contactOpen ? "rotate-180" : ""}`} />
    </button>
    <div className={`gap-3 text-left sm:grid-cols-2 lg:mt-4 lg:grid lg:grid-cols-1 ${contactOpen ? "mt-2 grid" : "hidden"}`}>
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
      className={`mt-4 rounded-xl border-j-accent/40 bg-j-accent-wash font-semibold text-j-accent transition hover:bg-j-accent hover:text-white ${tutorProfileResponsiveClasses.completionActionButton}`}
    >
      {previewMode ? <><PencilLine size={15} /> Edit Information</> : <><Eye size={15} /> View Profile</>}
    </Button>
  </section>;
}
