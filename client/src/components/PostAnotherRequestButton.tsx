import React from "react";
import { Plus } from "lucide-react";
import { Link } from "wouter";

/**
 * "Post another request", in the two places a Guardian meets it.
 *
 * One component for one action, so the pair cannot drift apart and the next
 * screen that needs it inherits the treatment instead of reinventing it.
 *
 * What makes it read as considered is the plus sitting in its own chip and the
 * short, slow hover - not the fill. That leaves the fill free to answer the
 * question its surroundings ask:
 *
 * - `solid` where it is the only thing to do on the page, as on Posted jobs. A
 *   white card there would sink into the white job cards underneath it.
 * - `card` where it sits beside `View my request`, which is the primary blue.
 *   Two solids there left the Guardian guessing which one finished the job.
 */
const MOTION =
  "group inline-flex shrink-0 items-center transition-[transform,box-shadow,border-color,background-color] duration-[320ms] ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-[1.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const SKIN = {
  solid: {
    shell: `${MOTION} h-9 gap-2 rounded-xl bg-j-accent pl-1.5 pr-3.5 shadow-[0_1px_2px_rgba(22,125,221,.25)] hover:bg-j-accent-hover hover:shadow-[0_10px_28px_-8px_rgba(22,125,221,.45)]`,
    chip: "grid size-6 shrink-0 place-items-center rounded-lg bg-white/20 text-white",
    label: "text-xs font-bold text-white",
    plus: 13,
  },
  card: {
    shell: `${MOTION} gap-2.5 rounded-xl border border-[#dbe9f4] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(36,86,129,.05)] hover:border-[#a9cdf0] hover:shadow-[0_10px_32px_-6px_rgba(36,86,129,.14)]`,
    chip: "grid size-7 shrink-0 place-items-center rounded-lg bg-j-accent-wash text-j-accent transition-colors duration-[320ms] group-hover:bg-j-accent group-hover:text-white",
    label: "text-sm font-extrabold text-j-ink",
    plus: 15,
  },
} as const;

export function PostAnotherRequestButton({
  href,
  onClick,
  variant = "card",
  className = "",
}: {
  /** Renders a link. Give this or `onClick`, not both. */
  href?: string;
  /** Renders a button - the confirmation resets the journey in place. */
  onClick?: () => void;
  variant?: keyof typeof SKIN;
  className?: string;
}) {
  const skin = SKIN[variant];
  // The chip carries the plus, so the label does not spell it.
  const body = <>
    <span aria-hidden="true" className={skin.chip}><Plus size={skin.plus} strokeWidth={2.4} /></span>
    <span className={skin.label}>Post another request</span>
  </>;

  if (href) return <Link href={href} className={`${skin.shell} ${className}`}>{body}</Link>;
  return <button type="button" onClick={onClick} className={`${skin.shell} ${className}`}>{body}</button>;
}
