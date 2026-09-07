import { Users } from "lucide-react";
import { Link } from "wouter";

/**
 * How many Tutors have applied to one live tuition, and the way in to see them.
 *
 * It sits on the card and in the details dialog of both Posted jobs boards, so
 * it lives here rather than being written twice - the count is the same number
 * in both places and must stay the same shape.
 *
 * Only a live tuition has applicants: before it is on the Job Board no Tutor
 * can have seen it, so the callers render this on the Live stage alone.
 */
export default function AppliedTutorsButton({ href, count, size = "sm" }: {
  href: string;
  count: number;
  /** `sm` for the card foot, `md` for the details dialog's action row. */
  size?: "sm" | "md";
}) {
  const shape = size === "md"
    ? "h-8 gap-1.5 rounded-lg border border-[#dce9f1] bg-white px-3.5 text-xs hover:bg-[#f1f6fa]"
    : "gap-1.5 text-2xs hover:underline";
  return <Link
    href={href}
    onClick={event => event.stopPropagation()}
    className={`inline-flex items-center font-bold text-[#1267c8] ${shape}`}
  >
    <Users size={size === "md" ? 13 : 12} aria-hidden={true} />
    Applied Tutors <span className="tabular-nums">({count})</span>
  </Link>;
}
