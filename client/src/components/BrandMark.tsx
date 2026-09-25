import React, { useState } from "react";

export const brandWordmark = {
  primary: "Connect",
  secondary: "Tutors",
  homeLabel: "Connect Tutors home",
} as const;

/**
 * The Connect Tutors mark: a Newton's cradle. Four balls hang at rest and the
 * saffron one is lifted - the one that sets the rest moving. Drawn on a
 * 48-unit grid, cropped to the rows it uses; `.brand-mark` colours it. The
 * bar is drawn last so every string hangs from under it.
 */
export function BrandMark({ onAnimationEnd }: { onAnimationEnd?: React.AnimationEventHandler<SVGSVGElement> }) {
  return (
    <svg className="brand-mark" viewBox="0 8 48 32" aria-hidden="true" focusable="false" onAnimationEnd={onAnimationEnd}>
      <g className="brand-mark-free">
        <path d="M5.6 11V35" fill="none" stroke="currentColor" strokeWidth={1.3} />
        <circle cx={5.6} cy={35} r={3.6} fill="currentColor" />
      </g>
      <path d="M12.8 11V35M20 11V35M27.2 11V35" fill="none" stroke="currentColor" strokeWidth={1.3} />
      <circle cx={12.8} cy={35} r={3.6} fill="currentColor" />
      <circle cx={20} cy={35} r={3.6} fill="currentColor" />
      <circle cx={27.2} cy={35} r={3.6} fill="currentColor" />
      <g className="brand-mark-lifted" transform="rotate(-22 34.4 11)">
        <path d="M34.4 11V35" fill="none" stroke="currentColor" strokeWidth={1.3} />
        <circle cx={34.4} cy={35} r={3.6} fill="currentColor" />
      </g>
      <path d="M3 11H37" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

/**
 * One swing per visit. Spread `host` on the element that holds the mark and
 * hand `onAnimationEnd` to the mark: pointing at the host (or focusing it)
 * sets `data-swinging`, and the end of the swing clears it.
 */
export function useCradleSwing() {
  const [swinging, setSwinging] = useState(false);
  const swing = () => setSwinging(true);
  return {
    host: { "data-swinging": swinging ? "" : undefined, onPointerEnter: swing, onFocus: swing },
    onAnimationEnd: () => setSwinging(false),
  };
}

/**
 * The cradle as a loading indicator: it keeps swinging for as long as it is
 * on screen, in place of a spinning circle. Sized from the text beside it.
 */
export function LoadingCradle({ className = "" }: { className?: string }) {
  return (
    <span className={`loading-cradle ${className}`.trim()}>
      <BrandMark />
    </span>
  );
}
