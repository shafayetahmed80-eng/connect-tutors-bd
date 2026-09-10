import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type ChipOption = { id: string; label: string };

/**
 * Several values in one box.
 *
 * The chosen ones sit inside the field rather than under it, so the box says
 * what it holds without a second line to read; it starts one row tall and
 * grows as they accumulate. A value that has been chosen leaves the list -
 * there is nothing to do with it there but choose it twice - and comes back
 * when its chip is dismissed.
 *
 * The field is a row of controls rather than one big button, because each chip
 * carries its own real dismiss button and a button cannot hold another. The
 * trigger beside them is what opens the list and what a screen reader names.
 *
 * Not `SearchableMultiSelect`: that one keeps chosen values in the list behind
 * a tick, stacks its chips below the field, and is wired to the Tutor profile's
 * own theme. The interaction is the same idea; the rules are not.
 */
export default function ChipMultiSelect({
  label,
  options,
  selectedIds,
  onChange,
  disabled = false,
  disabledPlaceholder,
  maxSelections,
  emptyMessage = "Nothing left to choose",
}: {
  /** Shown inside the empty box, and as the field's accessible name. */
  label: string;
  options: ChipOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
  /** What the box says instead of the label while it is disabled. */
  disabledPlaceholder?: string;
  maxSelections?: number;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = useMemo(() => {
    const byId = new Map(options.map(option => [option.id, option] as const));
    // An id whose option has gone - its jobs were filtered away underneath the
    // selection - still shows, so a chip never silently vanishes.
    return selectedIds.map(id => byId.get(id) ?? { id, label: id });
  }, [options, selectedIds]);
  const available = useMemo(() => options.filter(option => !selectedIds.includes(option.id)), [options, selectedIds]);
  const full = maxSelections !== undefined && selectedIds.length >= maxSelections;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  const add = (id: string) => {
    if (full) return;
    onChange([...selectedIds, id]);
    // Closing on the last allowed pick says the box is full without a message.
    if (maxSelections !== undefined && selectedIds.length + 1 >= maxSelections) setOpen(false);
  };
  const remove = (id: string) => onChange(selectedIds.filter(selectedId => selectedId !== id));

  return <div ref={rootRef} className="relative">
    <div className={`flex min-h-11 w-full items-start gap-1.5 rounded-xl border border-[#dbe7ef] px-3 py-2 transition focus-within:border-j-accent focus-within:ring-2 focus-within:ring-sky-100 ${disabled ? "bg-[#f4f8fb]" : "bg-white"}`}>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {selected.map(option => <span key={option.id} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-[#eaf4fd] py-0.5 pl-2 pr-1 text-xs font-semibold text-[#1267c8]">
          <span className="truncate">{option.label}</span>
          <button
            type="button"
            aria-label={`Remove ${option.label}`}
            onClick={() => remove(option.id)}
            className="grid size-4 shrink-0 place-items-center rounded outline-none hover:bg-[#cfe6fa] focus-visible:ring-2 focus-visible:ring-j-accent"
          ><X size={11} aria-hidden={true} /></button>
        </span>)}
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={`${label}${selected.length ? `, ${selected.length} selected` : ""}`}
          onClick={() => setOpen(current => !current)}
          className="min-w-[3rem] flex-1 py-0.5 text-left text-sm text-[#8fa3b4] outline-none disabled:cursor-not-allowed"
        >{selected.length === 0 ? (disabled ? disabledPlaceholder ?? label : label) : ""}</button>
      </span>
      <ChevronDown size={16} className={`mt-1.5 shrink-0 text-[#8fa3b4] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden={true} />
    </div>

    {open && !disabled ? <ul
      id={listId}
      role="listbox"
      aria-label={label}
      className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#dbe7ef] bg-white py-1 shadow-[0_12px_28px_rgba(38,83,117,.14)]"
    >
      {available.length === 0
        ? <li className="px-3 py-2 text-xs text-j-ink-muted">{emptyMessage}</li>
        : available.map(option => <li key={option.id} role="option" aria-selected={false}>
            <button
              type="button"
              onClick={() => add(option.id)}
              className="w-full px-3 py-2 text-left text-sm text-j-ink outline-none hover:bg-[#f2f8fd] focus-visible:bg-[#f2f8fd]"
            >{option.label}</button>
          </li>)}
    </ul> : null}
  </div>;
}
