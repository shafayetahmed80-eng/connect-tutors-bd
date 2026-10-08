import { useLayoutEffect, type RefObject } from "react";

/** Gap between one card and the next as a group comes into view. */
export const REVEAL_STAGGER_MS = 70;
/** Past this many, the rest arrive together: a long row should not take seconds to finish. */
export const REVEAL_STAGGER_LIMIT = 5;

type RevealWindow = Pick<Window, "matchMedia"> & { IntersectionObserver?: typeof IntersectionObserver };

/**
 * Lets the page settle in as it is scrolled: anything marked `data-reveal`, and
 * every child of a `data-reveal-group`, stays hidden until it comes into view,
 * then rises once. A child marked `data-reveal-skip` is left alone, for
 * decoration that must not move.
 *
 * Nothing is hidden unless this runs, so a browser without IntersectionObserver,
 * or a visitor who asked for less motion, simply sees the page.
 *
 * Returns what undoes it.
 */
export function startScrollReveal(root: HTMLElement, win: RevealWindow = window): () => void {
  if (win.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const Observer = win.IntersectionObserver;
  if (!Observer) return () => {};

  const targets = new Set<HTMLElement>(Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")));
  for (const group of Array.from(root.querySelectorAll<HTMLElement>("[data-reveal-group]"))) {
    const members = Array.from(group.children).filter((child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute("data-reveal-skip"));
    members.forEach((member, index) => {
      member.setAttribute("data-reveal", "");
      member.style.setProperty("--reveal-delay", `${Math.min(index, REVEAL_STAGGER_LIMIT) * REVEAL_STAGGER_MS}ms`);
      targets.add(member);
    });
  }

  root.classList.add("reveal-ready");
  const observer = new Observer(entries => {
    for (const entry of entries) {
      // Something already scrolled past (a reload part-way down, a jump to an
      // anchor) is above the view, not in it, and would otherwise stay hidden.
      if (!entry.isIntersecting && entry.boundingClientRect.top >= 0) continue;
      entry.target.setAttribute("data-revealed", "");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
  targets.forEach(target => observer.observe(target));

  return () => {
    observer.disconnect();
    root.classList.remove("reveal-ready");
  };
}

/**
 * Before the first paint, so nothing flashes visible and then hides.
 *
 * `resetKey` is for a page that swaps one document for another without
 * remounting (one component serving several routes): when it changes, the new
 * page is watched afresh.
 */
export function useScrollReveal(rootRef: RefObject<HTMLElement | null>, resetKey?: string) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    return root ? startScrollReveal(root) : undefined;
  }, [rootRef, resetKey]);
}
