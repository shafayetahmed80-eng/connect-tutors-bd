import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type StatusTabItem<K extends string> = {
  key: K;
  label: string;
  /** A word read after the label from `sm` up and dropped on a phone - "Jobs". */
  wideSuffix?: string;
  count?: number;
};

/**
 * A row of stages, each with its zero-padded count and an underline on the
 * chosen one - the look of the Tutor's Status tab and the Posted jobs bar.
 *
 * A plain row is a tablist: one stage is always chosen. A `toggle` row has no
 * "All" of its own - choosing the chosen stage again clears it.
 *
 * On a phone every row stays one line: tight 10px text, so five stages fit a
 * 375px screen, and sideways scrolling for a row that still does not. The text
 * is small but the tab is not: it stands 40px tall there, which is the height
 * of a finger, and takes the extra from its padding, not from a bigger label. From
 * `sm` up it wraps at its full size. The line under the tabs is drawn by the
 * inner row, not the scrolling box, so the chosen tab's underline is not
 * clipped by the scroll.
 *
 * The underline is one bar for the whole row, not one per tab, so choosing
 * another tab glides it there instead of blinking it off and on. It sits inside
 * the scrolling row, so it moves with the tabs. It only glides along one line:
 * when a wrapped row puts the new tab on another line it jumps, and a first
 * paint or a reduced-motion setting never animates.
 */
export default function StatusTabRow<K extends string>({ label, items, selected, onSelect, toggle = false, compact = false, flush = false }: {
  label: string;
  items: Array<StatusTabItem<K>>;
  selected: K | null;
  onSelect: (key: K | null) => void;
  toggle?: boolean;
  /** A second row under a first: smaller text on a lighter line. */
  compact?: boolean;
  /**
   * The row shares a bottom line with controls beside it from `sm` up, so it
   * draws its own line only on a phone, where those controls drop below it.
   */
  flush?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  // Where the bar sits, in the row's own coordinates, and whether it may glide to a new place.
  const [bar, setBar] = useState<{ x: number; y: number; w: number; glide: boolean } | null>(null);

  const measure = useCallback(() => {
    const tab = rowRef.current?.querySelector<HTMLElement>("[data-chosen]");
    if (!tab) {
      setBar(null);
      return;
    }
    // The bar covers the row's bottom line: 2px, centred on the tab's bottom edge.
    const next = { x: tab.offsetLeft, y: tab.offsetTop + tab.offsetHeight - 1, w: tab.offsetWidth };
    setBar(prev => prev && prev.x === next.x && prev.y === next.y && prev.w === next.w
      ? prev
      : { ...next, glide: prev !== null && prev.y === next.y });
  }, []);

  // Before paint, so the bar is already under the chosen tab on the first frame.
  useLayoutEffect(measure, [measure, selected, items]);
  // A count growing a digit, or a font arriving late, moves the tabs without a choice being made.
  useEffect(() => {
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [measure]);

  return <div className="overflow-x-auto [scrollbar-width:none] sm:overflow-visible [&::-webkit-scrollbar]:hidden">
    <div
      ref={rowRef}
      role={toggle ? "group" : "tablist"}
      aria-label={label}
      className={`relative flex w-max min-w-full flex-nowrap items-end gap-2 border-b sm:w-auto sm:flex-wrap ${flush ? "sm:border-b-0" : ""} ${compact ? "border-[#e8f0f5] sm:gap-4" : "border-[#dce9f1] sm:gap-5"}`}
    >
      {items.map(item => {
        const chosen = item.key === selected;
        return <button
          key={item.key}
          type="button"
          data-chosen={chosen ? "" : undefined}
          {...(toggle ? { "aria-pressed": chosen } : { role: "tab", "aria-selected": chosen })}
          onClick={() => onSelect(toggle && chosen ? null : item.key)}
          className={`relative shrink-0 whitespace-nowrap pb-2.5 pt-1.5 max-sm:pb-3 max-sm:pt-3 text-[10px] tracking-[-0.01em] sm:tracking-normal ${compact ? "sm:text-2xs" : "sm:text-xs"} font-semibold transition-colors ${chosen ? "font-bold text-[#1267c8]" : "text-j-ink-muted hover:text-[#173d60]"}`}
        >
          {item.label}{item.wideSuffix ? <> <span className="hidden sm:inline">{item.wideSuffix}</span></> : null} <span className={`tabular-nums sm:ml-1 ${chosen ? "text-[#1267c8]" : "text-j-ink-faint"}`}>{String(item.count ?? 0).padStart(2, "0")}</span>
        </button>;
      })}
      {bar ? <span
        aria-hidden
        data-tab-underline
        style={{ width: bar.w, transform: `translate(${bar.x}px, ${bar.y}px)` }}
        className={`pointer-events-none absolute left-0 top-0 h-0.5 rounded-t bg-[#1677e8] motion-reduce:transition-none ${bar.glide ? "transition-[transform,width] duration-200 ease-[cubic-bezier(.22,.61,.36,1)]" : ""}`}
      /> : null}
    </div>
  </div>;
}
