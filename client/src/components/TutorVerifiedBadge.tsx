import { BadgeCheck } from "lucide-react";

/** A Tutor with at least one Confirmed tuition. Nothing is shown before that. */
export default function TutorVerifiedBadge({ className = "" }: { className?: string }) {
  return <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-800 ${className}`}>
    <BadgeCheck size={12} aria-hidden={true} />Verified
  </span>;
}
