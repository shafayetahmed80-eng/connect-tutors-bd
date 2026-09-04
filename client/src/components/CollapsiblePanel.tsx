import React, { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A panel whose header is the control that opens it.
 *
 * Filters were costing more screen than the thing they filter - on the Admin
 * matching workspace three panels came to 1,626px before the first request
 * card, roughly three screens of controls most visits never touch. Collapsed,
 * the page opens on its content.
 *
 * Closed is the default, with one exception that matters: a panel holding an
 * active filter opens itself. A hidden filter quietly shortening a list is how
 * somebody concludes there are no results when there are.
 *
 * `activeCount` also rides on the header while closed, so the state is legible
 * without opening anything.
 */
export function CollapsiblePanel({
  title,
  icon,
  activeCount = 0,
  children,
  className = "",
  tone = "neutral",
}: {
  title: string;
  icon?: React.ReactNode;
  /** How many of this panel's filters are set. Non-zero opens it on mount. */
  activeCount?: number;
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "accent";
}) {
  const bodyId = useId();
  // Only the first render decides; toggling afterwards is the reader's to do,
  // and re-opening a panel somebody just closed would be a fight.
  const [open, setOpen] = useState(() => activeCount > 0);

  const chipTone = tone === "accent"
    ? "bg-j-accent-wash text-j-accent"
    : "bg-j-surface-muted text-j-ink-muted";

  return <section className={`overflow-hidden rounded-xl border border-j-border bg-white shadow-sm ${className}`}>
    <h2>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-2.5 p-4 text-left transition-colors hover:bg-j-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-inset sm:p-5"
      >
        {icon ? <span aria-hidden="true" className="shrink-0 text-j-accent">{icon}</span> : null}
        <span className="font-semibold text-j-ink">{title}</span>
        {activeCount > 0
          ? <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${chipTone}`}>{activeCount} active</span>
          : null}
        <ChevronDown
          aria-hidden="true"
          size={16}
          className={`ml-auto shrink-0 text-j-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
    </h2>
    {/* Unmounted rather than hidden: a closed panel's controls should not be
        reachable by Tab, and a select nobody can see should not be focusable. */}
    {open ? <div id={bodyId} className="border-t border-j-border px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div> : null}
  </section>;
}
