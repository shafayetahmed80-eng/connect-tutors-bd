import { LayoutGrid, SlidersHorizontal, XCircle } from "lucide-react";
import type { ReactNode } from "react";

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
  caption: string;
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
        className="motion-interactive inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cfe0eb] bg-j-surface-sunken px-3 text-sm font-bold text-[#245676] hover:border-[#9fcbe6] hover:bg-[#eef8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2"
      ><SlidersHorizontal className="h-4 w-4" aria-hidden="true" /><span>Filter</span>{activeFilterCount ? <span className="grid size-5 place-items-center rounded-full bg-j-accent text-2xs text-white">{activeFilterCount}</span> : null}</button>
    </div>
  </header>;
}

/**
 * The panel the Filter button opens, inline under the card rather than in a
 * drawer: the fields want the width of the page, and the panel carries its own
 * count and its own way out. Choosing in it changes nothing until Apply.
 */
export function FilterPanelFrame({ id, ariaLabel, total, loading = false, noun = "jobs found", onClose, onClear, onApply, applyDisabled = false, alerts = [], children }: {
  id: string;
  ariaLabel: string;
  total: number | undefined;
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
  return <section id={id} aria-label={ariaLabel} className="rounded-xl border border-[#dce8f0] bg-[#f7fbfe] p-4 shadow-[0_10px_24px_rgba(38,83,117,0.05)] sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#e4edf3] pb-3">
      <p className="inline-flex items-center gap-2 text-sm text-[#55738a]"><LayoutGrid className="h-4 w-4 text-j-accent" aria-hidden="true" /><strong className="font-extrabold text-j-ink">{loading || total === undefined ? "—" : total}</strong> {noun}</p>
      <button type="button" onClick={onClose} className="motion-interactive inline-flex min-h-10 items-center gap-2 rounded-xl bg-j-accent px-4 text-sm font-bold text-white hover:bg-j-accent-hover"><XCircle className="h-4 w-4" aria-hidden="true" /> Close</button>
    </div>

    {children}

    {alerts.map(message => <p key={message} role="alert" className="mt-3 text-xs font-semibold text-[#bd3535]">{message}</p>)}

    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={onClear} className="motion-interactive min-h-10 rounded-xl bg-[#d43c3c] px-5 text-sm font-bold text-white hover:bg-[#b93232]">Clear</button>
      <button type="button" onClick={onApply} disabled={applyDisabled} className="motion-interactive min-h-10 rounded-xl bg-j-accent px-5 text-sm font-bold text-white hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-50">Apply</button>
    </div>
  </section>;
}
