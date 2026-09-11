import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type ChipOption = { id: string; label: string };

/**
 * Several values in one box, found by typing.
 *
 * The chosen ones sit inside the field rather than under it, so the box says
 * what it holds without a second line to read; it starts one row tall and
 * grows as they accumulate. A value that has been chosen leaves the list -
 * there is nothing to do with it there but choose it twice - and comes back
 * when its chip is dismissed.
 *
 * The field is a row of controls rather than one big button, because each chip
 * carries its own real dismiss button and a button cannot hold another. What
 * sits beside them is a text box: Location alone can offer a hundred areas,
 * and scrolling a list that long to find one name is the slowest way to answer
 * a question you could have typed in three letters. So the box filters as you
 * type, Enter takes the first match, and Backspace on an empty box takes back
 * the last chip.
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
  noMatchMessage = "Nothing matches that",
  onSearchQueryChange,
  required = false,
  invalid = false,
  dense = false,
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
  /** Shown when everything is still available but the typed text finds none of it. */
  noMatchMessage?: string;
  /**
   * Told what was typed, for a list too long to hold: Teaching areas searches
   * 597 Bangladesh locations server-side and is handed back 50 at a time.
   * Without it the component filters only what it was given, which is right
   * for every list that arrives whole.
   */
  onSearchQueryChange?: (query: string) => void;
  required?: boolean;
  /** Draws the box in the error colour; the message itself belongs to the caller. */
  invalid?: boolean;
  /** The tighter scale the Tutor Profile modal uses. */
  dense?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = useMemo(() => {
    const byId = new Map(options.map(option => [option.id, option] as const));
    // An id whose option has gone - its jobs were filtered away underneath the
    // selection - still shows, so a chip never silently vanishes.
    return selectedIds.map(id => byId.get(id) ?? { id, label: id });
  }, [options, selectedIds]);
  const available = useMemo(() => options.filter(option => !selectedIds.includes(option.id)), [options, selectedIds]);
  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () => (needle ? available.filter(option => option.label.toLowerCase().includes(needle)) : available),
    [available, needle],
  );
  const full = maxSelections !== undefined && selectedIds.length >= maxSelections;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => { if (disabled) close(); }, [disabled]);

  const search = (next: string) => {
    setQuery(next);
    onSearchQueryChange?.(next);
  };
  /** Closing always drops the typed text, so the box never reopens mid-search. */
  function close() {
    setOpen(false);
    search("");
  }

  const add = (id: string) => {
    if (full) return;
    onChange([...selectedIds, id]);
    search("");
    // Closing on the last allowed pick says the box is full without a message.
    if (maxSelections !== undefined && selectedIds.length + 1 >= maxSelections) close();
  };
  const remove = (id: string) => onChange(selectedIds.filter(selectedId => selectedId !== id));

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (event.key === "Enter") {
      // Enter with one obvious answer on screen should take it; with the list
      // shut it would otherwise submit the filter panel around the box.
      event.preventDefault();
      if (matches.length > 0) { setOpen(true); add(matches[0].id); }
      return;
    }
    if (event.key === "Backspace" && query === "" && selected.length > 0) {
      remove(selected[selected.length - 1].id);
    }
  };

  return <div
    ref={rootRef}
    className="relative"
    // Tabbing to the next filter leaves no mousedown behind, so without this
    // a keyboard user collects one open list per field they pass through.
    onBlur={event => { if (!rootRef.current?.contains(event.relatedTarget as Node | null)) close(); }}
  >
    <div className={`flex w-full items-start gap-1.5 border transition focus-within:border-j-accent focus-within:ring-2 focus-within:ring-sky-100 ${dense ? "min-h-9 rounded-lg px-2.5 py-1.5" : "min-h-11 rounded-xl px-3 py-2"} ${invalid ? "border-[#d84a4a]" : "border-[#dbe7ef]"} ${disabled ? "bg-[#f4f8fb]" : "bg-white"}`}>
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
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-label={`${label}${selected.length ? `, ${selected.length} selected` : ""}`}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={query}
          placeholder={selected.length === 0 ? (disabled ? disabledPlaceholder ?? label : label) : "Type to search"}
          onChange={event => { search(event.target.value); setOpen(true); }}
          // A click, not focus. The Tutor Profile section modal autofocuses
          // its first control, and opening from that focus put a list up over
          // the editor the moment it appeared.
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={`min-w-[6rem] flex-1 bg-transparent py-0.5 text-j-ink outline-none placeholder:text-[#8fa3b4] disabled:cursor-not-allowed ${dense ? "text-xs" : "text-sm"}`}
        />
      </span>
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-hidden={true}
        onClick={() => {
          if (open) { close(); return; }
          setOpen(true);
          inputRef.current?.focus();
        }}
        className="mt-1 shrink-0 rounded text-[#8fa3b4] outline-none disabled:cursor-not-allowed"
      ><ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} /></button>
    </div>

    {open && !disabled ? <ul
      id={listId}
      role="listbox"
      aria-label={label}
      className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#dbe7ef] bg-white py-1 shadow-[0_12px_28px_rgba(38,83,117,.14)]"
    >
      {matches.length === 0
        ? <li className="px-3 py-2 text-xs text-j-ink-muted">{available.length === 0 ? emptyMessage : noMatchMessage}</li>
        : matches.map(option => <li key={option.id} role="option" aria-selected={false}>
            <button
              type="button"
              // The box keeps the caret so the next name can be typed straight
              // away; without this the click would take focus and shut the list.
              onMouseDown={event => event.preventDefault()}
              onClick={() => add(option.id)}
              className="w-full px-3 py-2 text-left text-sm text-j-ink outline-none hover:bg-[#f2f8fd] focus-visible:bg-[#f2f8fd]"
            >{option.label}</button>
          </li>)}
    </ul> : null}
  </div>;
}
