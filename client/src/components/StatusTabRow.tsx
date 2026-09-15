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
 * On a phone every row stays one line: tight 10px text, so the five job
 * stages fit a 375px screen, and sideways scrolling for a row that still does
 * not. From `sm` up it wraps at its full size. The line under the tabs is drawn
 * by the inner row, not the scrolling box, so the chosen tab's underline is not
 * clipped by the scroll.
 */
export default function StatusTabRow<K extends string>({ label, items, selected, onSelect, toggle = false, compact = false }: {
  label: string;
  items: Array<StatusTabItem<K>>;
  selected: K | null;
  onSelect: (key: K | null) => void;
  toggle?: boolean;
  /** A second row under a first: smaller text on a lighter line. */
  compact?: boolean;
}) {
  return <div className="overflow-x-auto [scrollbar-width:none] sm:overflow-visible [&::-webkit-scrollbar]:hidden">
    <div
      role={toggle ? "group" : "tablist"}
      aria-label={label}
      className={`flex w-max min-w-full flex-nowrap items-end gap-2 border-b sm:w-auto sm:flex-wrap ${compact ? "border-[#e8f0f5] sm:gap-4" : "border-[#dce9f1] sm:gap-5"}`}
    >
      {items.map(item => {
        const chosen = item.key === selected;
        return <button
          key={item.key}
          type="button"
          {...(toggle ? { "aria-pressed": chosen } : { role: "tab", "aria-selected": chosen })}
          onClick={() => onSelect(toggle && chosen ? null : item.key)}
          className={`relative shrink-0 whitespace-nowrap pb-2.5 pt-1.5 text-[10px] tracking-[-0.01em] sm:tracking-normal ${compact ? "sm:text-2xs" : "sm:text-xs"} font-semibold transition-colors ${chosen ? "font-bold text-[#1267c8]" : "text-j-ink-muted hover:text-[#173d60]"}`}
        >
          {item.label}{item.wideSuffix ? <> <span className="hidden sm:inline">{item.wideSuffix}</span></> : null} <span className={`tabular-nums sm:ml-1 ${chosen ? "text-[#1267c8]" : "text-j-ink-faint"}`}>{String(item.count ?? 0).padStart(2, "0")}</span>
          {chosen ? <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-t bg-[#1677e8]" /> : null}
        </button>;
      })}
    </div>
  </div>;
}
