import { History } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { clearRecentSearches, readRecentSearches, rememberRecentSearch } from "@/lib/recentSearches";

/**
 * Wraps a search box and offers what was searched here before, under it.
 *
 * It does not touch the box inside: it listens for focus, Enter and leaving
 * from around it, so the box keeps its own markup and its own state. A search is
 * remembered when the Admin presses Enter or leaves the box, not on every key,
 * so half-typed words do not pile up. Picking one hands it to `onPick`, the same
 * setter the box's own `onChange` uses.
 *
 * Nothing is shown until there is something to show: no history, no menu.
 */
export default function RecentSearches({ page, value, onPick, className = "", children }: {
  /** Names where the search lives; each list keeps its own history. */
  page: string;
  value: string;
  onPick: (term: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const typed = value.trim().toLowerCase();
  const shown = items.filter(item => item.toLowerCase() !== typed && (!typed || item.toLowerCase().includes(typed)));

  const pick = (term: string) => {
    onPick(term);
    setItems(rememberRecentSearch(page, term));
    setOpen(false);
  };

  return <div
    ref={rootRef}
    className={`relative ${className}`}
    // Focus opens it; a click opens it again after Escape closed it with the box still focused.
    onFocus={event => {
      if (event.target instanceof HTMLInputElement) {
        setItems(readRecentSearches(page));
        setOpen(true);
      }
    }}
    onClick={event => {
      if (event.target instanceof HTMLInputElement) {
        setItems(readRecentSearches(page));
        setOpen(true);
      }
    }}
    // Editing the words again after Enter has closed it brings it back, narrowed to what is typed.
    onInput={event => {
      if (event.target instanceof HTMLInputElement) {
        setItems(readRecentSearches(page));
        setOpen(true);
      }
    }}
    onBlur={event => {
      if (rootRef.current?.contains(event.relatedTarget as Node | null)) return;
      if (event.target instanceof HTMLInputElement) rememberRecentSearch(page, value);
      setOpen(false);
    }}
    onKeyDown={event => {
      if (!(event.target instanceof HTMLInputElement)) return;
      if (event.key === "Enter") {
        setItems(rememberRecentSearch(page, value));
        setOpen(false);
      } else if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key === "ArrowDown" && open && shown.length > 0) {
        event.preventDefault();
        rootRef.current?.querySelector<HTMLButtonElement>("ul button")?.focus();
      }
    }}
  >
    {children}
    {open && shown.length > 0 ? <ul
      aria-label="Recent searches"
      // A press on a suggestion must not move focus out of the box first, or the menu would close before the click lands.
      onMouseDown={event => event.preventDefault()}
      className="absolute left-0 top-full z-30 mt-1 w-full min-w-[15rem] overflow-hidden rounded-xl border border-j-border bg-white p-1 shadow-lg"
    >
      {shown.map(term => <li key={term}>
        <button type="button" onClick={() => pick(term)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm text-j-ink hover:bg-j-surface-sunken focus-visible:bg-j-surface-sunken focus-visible:outline-none">
          <History aria-hidden="true" className="size-3.5 shrink-0 text-j-ink-faint" /><span className="truncate">{term}</span>
        </button>
      </li>)}
      <li className="border-t border-j-border pt-1">
        <button type="button" onClick={() => { clearRecentSearches(page); setItems([]); setOpen(false); }} className="flex min-h-10 w-full items-center rounded-lg px-2.5 text-left text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken focus-visible:bg-j-surface-sunken focus-visible:outline-none">Clear</button>
      </li>
    </ul> : null}
  </div>;
}
