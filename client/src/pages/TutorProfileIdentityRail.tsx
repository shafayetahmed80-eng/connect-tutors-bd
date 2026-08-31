import React from "react";
import { ArrowRight, Camera, Eye, GraduationCap, LockKeyhole, PencilLine, SquareLibrary, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { tutorProfileResponsiveClasses } from "./TutorProfileResponsive";
import type { TutorProfileStatusCard } from "./TutorProfileStatusCard";

const PROFILE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "Pending review",
  changes_requested: "Changes requested",
  approved: "Approved",
  suspended: "Suspended",
};

/** Completion band + bar tint, keyed off the status card's tone. */
const TONE: Record<TutorProfileStatusCard["tone"], { band: string; bar: string }> = {
  attention: { band: "border-[#f1dbaa] bg-[#fff9ed] text-[#9b6411]", bar: "bg-[#e6a23c]" },
  review: { band: "border-[#bfe4f6] bg-[#f0faff] text-j-accent", bar: "bg-j-accent" },
  success: { band: "border-[#c7e7d7] bg-[#f3fbf6] text-[#16714a]", bar: "bg-[#22a06b]" },
};

/** Local, human-readable "last saved" string — no timezone surprises in tests. */
export function formatTutorProfileLastUpdated(value: Date | string | null | undefined) {
  if (!value) return "not saved yet";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "not saved yet" : date.toLocaleString();
}

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
 * completion, the one state-aware action, the latest institute, and the toggle
 * between the editable tab panel and the read-only profile summary.
 *
 * The photo is managed here rather than inside a section popup. It is never
 * part of a draft payload (`profilePhotoUrl` is in no section's `fieldKeys`) —
 * upload and remove go straight to /api/tutor/profile-photo.
 */
export function TutorProfileIdentityRail({
  name,
  tutorNumber,
  profileStatus,
  lastUpdatedAt,
  photoUrl,
  photoPreviewFailed,
  photoError,
  uploadingPhoto,
  photoInputRef,
  onSelectPhoto,
  onRemovePhoto,
  onPhotoPreviewError,
  completionPercentage,
  statusCard,
  actionPending,
  submitting,
  onAction,
  universityName,
  subjectName,
  previewMode,
  onTogglePreview,
}: {
  name: string;
  tutorNumber: number | null | undefined;
  profileStatus: string | null | undefined;
  lastUpdatedAt: Date | string | null | undefined;
  photoUrl: string | null;
  photoPreviewFailed: boolean;
  photoError?: string;
  uploadingPhoto: boolean;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectPhoto: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onPhotoPreviewError: () => void;
  completionPercentage: number;
  statusCard: TutorProfileStatusCard;
  actionPending: boolean;
  submitting: boolean;
  onAction: () => void;
  universityName: string;
  subjectName: string;
  previewMode: boolean;
  onTogglePreview: () => void;
}) {
  const tone = TONE[statusCard.tone];
  const statusLabel = profileStatus ? PROFILE_STATUS_LABEL[profileStatus] ?? profileStatus : null;
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
      aria-describedby="tutor-profile-photo-help"
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
    <p id="tutor-profile-photo-help" className="mt-1 text-[11px] leading-4 text-[#8496a6]">Recent clear face photo · JPEG, PNG, or WebP.</p>
    {photoError ? <p role="alert" className="mt-1 text-[11px] font-medium leading-4 text-j-err">{photoError}</p> : null}

    <h2 className={`mt-3 break-words text-base ${tp.heading}`}>{name || "Your Tutor profile"}</h2>
    <p className="mt-0.5 text-[11px] text-[#8496a6]">Tutor ID: {tutorNumber ?? "Preparing"}</p>
    {statusLabel ? <p className="mt-0.5 text-[11px] text-[#8496a6]">{statusLabel} · saved {formatTutorProfileLastUpdated(lastUpdatedAt)}</p> : null}

    <div className={`mt-4 rounded-xl border px-3 py-2.5 ${tone.band}`}>
      <p className="text-[12px] font-bold">Profile completed: {completionPercentage}%</p>
      <span
        className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/80"
        role="progressbar"
        aria-label="Profile completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={completionPercentage}
      >
        <span className={`block h-full rounded-full ${tone.bar} transition-[width] duration-200`} style={{ width: `${completionPercentage}%` }} />
      </span>
    </div>

    {statusCard.action !== "none" ? <Button
      type="button"
      disabled={submitting}
      onClick={onAction}
      className={`mt-3 ${tp.primaryButton} ${tutorProfileResponsiveClasses.completionActionButton}`}
    >
      {statusCard.action === "submit" ? <LockKeyhole size={15} /> : null}
      {actionPending ? (statusCard.action === "save" ? "Saving…" : "Submitting…") : statusCard.actionLabel}
      {statusCard.action === "complete" ? <ArrowRight size={15} /> : null}
    </Button> : null}

    <div className="mt-4 space-y-3 border-t border-j-border pt-4 text-left">
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
