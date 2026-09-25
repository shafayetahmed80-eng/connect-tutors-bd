// A Tutor's star rating: the one-line average shown on profiles, and the
// Guardian's dialog for rating the Tutor on a Confirmed tuition.

import { Star } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import CharacterRemaining from "@/components/CharacterRemaining";
import { requiredMark } from "@/components/journeyField";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { formatTutorRating, TUTOR_RATING_MAX, TUTOR_REVIEW_COMMENT_MAX, type TutorRatingSummary } from "@shared/tutor-reviews";
import { jobIdForRequest } from "@shared/job-id";

/** "★ 4.6 · 5 ratings" - nothing at all until someone has rated. */
export function TutorRatingLine({ summary, className = "" }: { summary?: TutorRatingSummary | null; className?: string }) {
  const text = summary ? formatTutorRating(summary) : null;
  if (!text) return null;
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-j-ink-soft ${className}`}>
    <Star size={14} className="fill-amber-400 text-amber-400" aria-hidden="true" />
    <span aria-label={`Rated ${text.replace("·", "from")}`}>{text}</span>
  </span>;
}

/** Five stars as one radio group; arrow keys move, as in any radio group. */
export function StarPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return <div role="radiogroup" aria-label="Rating" className="flex gap-1">
    {Array.from({ length: TUTOR_RATING_MAX }, (_, index) => index + 1).map(star => <button
      key={star}
      type="button"
      role="radio"
      aria-checked={value === star}
      aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
      tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
      onClick={() => onChange(star)}
      onKeyDown={event => {
        if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); onChange(Math.min(TUTOR_RATING_MAX, star + 1)); }
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); onChange(Math.max(1, star - 1)); }
      }}
      className="rounded-lg p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <Star size={30} aria-hidden="true" className={star <= value ? "fill-amber-400 text-amber-400" : "text-j-border"} />
    </button>)}
  </div>;
}

/** The Guardian rates the Tutor on one Confirmed tuition, or changes the rating they gave. */
export function RateTutorDialog({ requestId, jobId, existing, onClose }: {
  requestId: number;
  jobId: string;
  existing?: { rating: number; comment: string | null } | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const save = trpc.tutorReviews.save.useMutation({
    onSuccess: () => { void utils.tutorReviews.mine.invalidate(); toast.success("Rating saved."); onClose(); },
    onError: error => toast.error(error.message),
  });

  return <Modal size="sm" onClose={onClose} busy={save.isPending}>
    <ModalHeader title={existing ? "Change your rating" : "Rate the Tutor"} meta={`Job ID ${jobId}`} />
    <ModalBody>
      <p className="text-sm font-bold text-j-ink-strong">Rating<span className={requiredMark}> *</span></p>
      <div className="mt-2"><StarPicker value={rating} onChange={setRating} /></div>
      <label className="mt-5 block text-sm font-bold text-j-ink-strong">
        Comment
        <textarea
          value={comment}
          onChange={event => setComment(event.target.value)}
          rows={3}
          maxLength={TUTOR_REVIEW_COMMENT_MAX}
          className="mt-2 w-full rounded-xl border border-j-field-border p-3 text-sm font-normal outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <CharacterRemaining value={comment} maxLength={TUTOR_REVIEW_COMMENT_MAX} />
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Back</button>
      <button
        type="button"
        disabled={save.isPending || rating < 1}
        onClick={() => save.mutate({ requestId, rating, comment: comment.trim() || null })}
        className="h-10 rounded-xl bg-j-accent px-4 text-sm font-bold text-white hover:bg-j-accent-hover disabled:opacity-50"
      >{save.isPending ? "Saving…" : "Save rating"}</button>
    </ModalFooter>
  </Modal>;
}

/** Five small stars, filled up to the rating - for reading, not choosing. */
function StarRow({ rating }: { rating: number }) {
  return <span className="inline-flex" aria-label={`${rating} of ${TUTOR_RATING_MAX} stars`}>
    {Array.from({ length: TUTOR_RATING_MAX }, (_, index) => <Star key={index} size={14} aria-hidden="true" className={index < rating ? "fill-amber-400 text-amber-400" : "text-j-border"} />)}
  </span>;
}

/** The Admin's view of what Guardians said about a Tutor: the average, then every rating newest first. */
export function AdminTutorRatings({ tutorId }: { tutorId: string }) {
  const utils = trpc.useUtils();
  const query = trpc.tutorReviews.forTutor.useQuery({ tutorId });
  const reviews = query.data?.reviews ?? [];
  const setHidden = trpc.tutorReviews.setHidden.useMutation({
    onSuccess: () => { void utils.tutorReviews.forTutor.invalidate({ tutorId }); },
    onError: error => toast.error(error.message),
  });
  return <section aria-labelledby="tutor-ratings-title" className="rounded-2xl border border-j-border bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 id="tutor-ratings-title" className="font-bold tracking-[-0.02em] text-j-ink">Ratings</h3>
      <TutorRatingLine summary={query.data?.summary} />
    </div>
    {query.isLoading ? <p className="mt-3 text-sm text-j-ink-soft">Loading…</p>
      : query.isError ? <p role="alert" className="mt-3 text-sm font-semibold text-j-err">The ratings could not be loaded.</p>
      : !reviews.length ? <p className="mt-3 rounded-xl bg-j-surface-sunken p-3 text-sm text-j-ink-soft">No Guardian has rated this Tutor yet.</p>
      : <ul className="mt-3 divide-y divide-j-border">
        {reviews.map(review => <li key={review.id} className={`py-3 ${review.hidden ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-j-ink-muted">
            <StarRow rating={review.rating} />
            <span className="font-semibold text-j-ink-strong">{review.guardianName || "Guardian"}</span>
            <span>Job ID {jobIdForRequest(review.requestId)}</span>
            <span>{new Date(review.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            {review.hidden ? <span className="rounded-full bg-j-err-wash px-2 py-0.5 font-semibold text-j-err">Hidden</span> : null}
            <button
              type="button"
              disabled={setHidden.isPending}
              onClick={() => setHidden.mutate({ reviewId: review.id, hidden: !review.hidden })}
              className="ml-auto text-xs font-bold text-j-accent hover:underline disabled:opacity-50"
            >{review.hidden ? "Unhide" : "Hide"}</button>
          </div>
          {review.comment ? <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-j-ink">{review.comment}</p> : null}
        </li>)}
      </ul>}
  </section>;
}
