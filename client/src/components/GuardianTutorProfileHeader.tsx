import { IdCard, UserRound } from "lucide-react";
import TutorVerifiedBadge from "@/components/TutorVerifiedBadge";
import { TutorRatingLine } from "@/components/TutorRating";
import type { TutorRatingSummary } from "@shared/tutor-reviews";

/** The strip a Guardian reads first: photo, name, the verified mark, headline, Tutor ID and the Guardians' star rating. */
export function GuardianTutorProfileHeader({ profile }: { profile: { profilePhotoUrl?: string | null; name?: string | null; verified?: boolean; headline?: string | null; tutorNumber?: number | null; rating?: TutorRatingSummary | null } }) {
  return <section className="rounded-2xl border border-j-border bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center gap-4">
      <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-sky-200 bg-[#f4f9fd] text-j-ink-faint">
        {profile.profilePhotoUrl
          ? <img src={profile.profilePhotoUrl} alt={profile.name ? `${profile.name} profile photo` : "Tutor profile photo"} className="size-full object-cover" />
          : <UserRound size={30} aria-hidden={true} />}
      </span>
      <div className="min-w-0 flex-1">
        {profile.name || profile.verified ? <div className="flex flex-wrap items-center gap-2">
          {profile.name ? <h2 className="text-lg font-bold tracking-[-0.02em] text-j-ink">{profile.name}</h2> : null}
          {profile.verified ? <TutorVerifiedBadge /> : null}
        </div> : null}
        {profile.headline ? <p className="mt-0.5 text-sm text-j-ink-soft">{profile.headline}</p> : null}
        {profile.tutorNumber || profile.rating?.count ? <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {profile.tutorNumber ? <p className="inline-flex items-center gap-1 text-2xs text-j-ink-muted"><IdCard size={13} />Tutor ID {profile.tutorNumber}</p> : null}
          <TutorRatingLine summary={profile.rating} />
        </div> : null}
      </div>
    </div>
  </section>;
}
