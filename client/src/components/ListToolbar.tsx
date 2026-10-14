import { LayoutGrid, LoaderCircle, SlidersHorizontal, XCircle } from "lucide-react";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

const SLIDE_MS = 200;

/** A page that asks for less motion, or an environment that cannot say (a test), gets none. */
function slidesAllowed() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
}

type SlidePhase = "closed" | "opening" | "expanding" | "open" | "closing";

/**
 * Opens and closes a panel with a short slide: it grows from nothing to its own
 * height while it fades in, and shrinks back the same way, so the list below it
 * moves smoothly instead of jumping.
 *
 * The panel is still mounted only while it is open (or on its way out), so what
 * it asks the server for - the filter options - waits for the first open, as it
 * did before. It clips its content only while it is moving: at rest nothing is
 * clipped, because the Clear and Apply bar sticks to the foot of a phone's
 * screen and a clipping ancestor would stop it. With reduced motion it opens
 * and closes at once.
 */
export function SlidePanel({ open, children }: { open: boolean; children: ReactNode }) {
  const [phase, setPhase] = useState<SlidePhase>(open ? "open" : "closed");

  // Before paint, so a panel that is not animating never shows a frame of the shut style.
  useLayoutEffect(() => {
    if (!slidesAllowed()) {
      setPhase(open ? "open" : "closed");
      return;
    }
    if (open) {
      // Paint it shut first, then let it grow: two frames, or the browser has no starting point to move from.
      setPhase("opening");
      let second = 0;
      const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setPhase("expanding")); });
      return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
    }
    setPhase(current => (current === "closed" ? current : "closing"));
  }, [open]);

  useEffect(() => {
    if (phase !== "expanding" && phase !== "closing") return;
    const timer = window.setTimeout(() => setPhase(phase === "expanding" ? "open" : "closed"), SLIDE_MS + 30);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "closed" && !open) return null;
  // The render where `open` has just turned true is shut until the effect above says otherwise.
  const shown: SlidePhase = phase === "closed" ? "opening" : phase;
  const grown = shown === "expanding" || shown === "open";
  return <div
    data-slide={shown}
    className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${grown ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
  >
    <div className={`min-h-0 ${shown === "open" ? "" : "overflow-hidden"}`}>{children}</div>
  </div>;
}

/**
 * The card that heads a list of tuitions: what the list is, how many are in it,
 * and the Filter button with the number of filters narrowing it.
 *
 * The Job Board drew this first; the Admin's tuition lists draw the same card,
 * so the two read as one product and a change to it reaches both.
 */
export function ListToolbarCard({ eyebrow, count, caption, loading = false, filterOpen, onToggleFilter, activeFilterCount, panelId, actions }: {
  /** What the list is, in a few words: "Live Jobs". */
  eyebrow: string;
  count: number | undefined;
  /** The line under the number: "currently live", or "matching ..." while filters narrow it. */
  caption: ReactNode;
  loading?: boolean;
  filterOpen: boolean;
  onToggleFilter: () => void;
  activeFilterCount: number;
  /** The id of the panel the Filter button opens. */
  panelId: string;
  /** Other buttons for the list, drawn before Filter. */
  actions?: ReactNode;
}) {
  return <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce8f0] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(38,83,117,0.05)] sm:px-5">
    <div>
      <p className="text-2xs font-extrabold uppercase tracking-[0.14em] text-[#5a88a8]">{eyebrow}</p>
      <p aria-live="polite" className="mt-0.5 text-2xl font-extrabold tracking-[-0.03em] text-j-ink">{loading || count === undefined ? "—" : count}</p>
      <p className="text-xs font-semibold text-[#55738a]">{caption}</p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {actions}
      <button
        type="button"
        onClick={onToggleFilter}
        aria-expanded={filterOpen}
        aria-controls={panelId}
        className="motion-interactive inline-flex min-h-control items-center gap-2 rounded-xl border border-[#cfe0eb] bg-j-surface-sunken px-3 text-sm font-bold text-[#245676] hover:border-[#9fcbe6] hover:bg-[#eef8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2"
      ><SlidersHorizontal className="h-4 w-4" aria-hidden="true" /><span>Filter</span>{activeFilterCount ? <span className="grid size-5 place-items-center rounded-full bg-j-accent text-2xs text-white">{activeFilterCount}</span> : null}</button>
    </div>
  </header>;
}

/**
 * The panel the Filter button opens, inline under the card rather than in a
 * drawer: the fields want the width of the page, and the panel carries its own
 * count and its own way out. Choosing in it changes nothing until Apply.
 */
export function FilterPanelFrame({
  id,
  ariaLabel,
  total,
  totalDisplay,
  loading = false,
  noun = "jobs found",
  onClose,
  onClear,
  onApply,
  applyDisabled = false,
  alerts = [],
  children
}: {
  id: string;
  ariaLabel: string;
  total: number | undefined;
  totalDisplay?: ReactNode;
  loading?: boolean;
  /** What the number counts: "jobs found". */
  noun?: string;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
  applyDisabled?: boolean;
  /** Reasons Apply is waiting, each in red under the fields. */
  alerts?: string[];
  children: ReactNode;
}) {
  const displayTotal = totalDisplay ?? (total === undefined ? "—" : total);

  return <section id={id} aria-label={ariaLabel} className="rounded-xl border border-[#dce8f0] bg-[#f7fbfe] p-4 shadow-[0_10px_24px_rgba(38,83,117,0.05)] sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#e4edf3] pb-3">
      <p className="inline-flex items-center gap-2 text-sm text-[#55738a]" role="status" aria-live="polite">
        <LayoutGrid className="h-4 w-4 text-j-accent shrink-0" aria-hidden="true" />
        <span className="inline-flex items-center gap-1.5">
          <strong className="font-extrabold text-j-ink">{displayTotal}</strong>
          <span>{noun}</span>
          {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-j-accent ml-0.5 inline-block" aria-label="Loading preview" /> : null}
        </span>
      </p>
      <button type="button" onClick={onClose} className="motion-interactive inline-flex min-h-control items-center gap-2 rounded-xl bg-j-accent px-4 text-sm font-bold text-white hover:bg-j-accent-hover"><XCircle className="h-4 w-4" aria-hidden="true" /> Close</button>
    </div>

    {children}

    {alerts.map(message => <p key={message} role="alert" className="mt-3 text-xs font-semibold text-[#bd3535]">{message}</p>)}

    {/* On a phone the panel can run a thousand pixels, so the two buttons that finish it stay at the foot of the screen while it scrolls. */}
    <div className="mt-4 flex flex-wrap gap-2 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:rounded-b-xl max-sm:border-t max-sm:border-[#e4edf3] max-sm:bg-[#f7fbfe] max-sm:px-4 max-sm:py-3">
      <button type="button" onClick={onClear} className="motion-interactive min-h-control rounded-xl bg-[#d43c3c] px-5 text-sm font-bold text-white hover:bg-[#b93232]">Clear</button>
      <button type="button" onClick={onApply} disabled={applyDisabled} className="motion-interactive min-h-control rounded-xl bg-j-accent px-5 text-sm font-bold text-white hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-50">Apply</button>
    </div>
  </section>;
}
