import { Check, ChevronDown, Search, X } from "lucide-react";
import React from "react";
import { KeyboardEvent, useId, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tutorProfileResponsiveClasses } from "@/pages/TutorProfileResponsive";
import { tutorProfileTheme } from "@/pages/tutorProfileTheme";

export type SelectorOption = { id: string; label: string; disabled?: boolean };

type SearchableMultiSelectProps = {
  label: string;
  required?: boolean;
  options: SelectorOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  onSearchQueryChange?: (query: string) => void;
  emptyMessage: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  maxSelections?: number;
};

export function SearchableMultiSelect({
  label,
  required = false,
  options,
  selectedIds,
  onChange,
  onSearchQueryChange,
  emptyMessage,
  description,
  error,
  disabled = false,
  maxSelections,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingSelectedIds, setPendingSelectedIds] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const searchId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const selectedOptions = useMemo(() => options.filter(option => selectedIds.includes(option.id)), [options, selectedIds]);
  const results = useMemo(() => options.filter(option => option.label.toLocaleLowerCase().includes(normalizedQuery)), [normalizedQuery, options]);

  const close = () => {
    setIsOpen(false);
    setQuery("");
    onSearchQueryChange?.("");
    buttonRef.current?.focus();
  };
  const open = () => {
    if (isMobile) setPendingSelectedIds(selectedIds);
    setIsOpen(true);
  };
  const cancelMobileSelection = () => close();
  const confirmMobileSelection = () => {
    onChange(pendingSelectedIds);
    close();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };
  const toggle = (id: string, currentSelectedIds = selectedIds, updateSelectedIds = onChange) => {
    if (currentSelectedIds.includes(id)) {
      updateSelectedIds(currentSelectedIds.filter(selectedId => selectedId !== id));
      return;
    }
    if (maxSelections && currentSelectedIds.length >= maxSelections) return;
    updateSelectedIds([...currentSelectedIds, id]);
  };

  /**
   * What the closed trigger shows: a placeholder, then a count.
   *
   * Deliberately not the chosen names - the chips underneath already list them,
   * and repeating them here put the same text on screen twice.
   */
  const selectionText = selectedIds.length === 0
    ? `Select ${label.toLocaleLowerCase()}`
    : `${selectedIds.length} selected`;
  const selectorOptions = (activeSelectedIds: string[], onToggle: (id: string) => void, compact = false) => <>
    <label className="flex items-center gap-2 rounded-xl border border-[#dbe7ef] px-3 py-2 text-[#59788e] focus-within:border-j-accent focus-within:ring-4 focus-within:ring-[#dceffe]">
      <Search aria-hidden="true" size={16} />
      <input autoFocus type="search" aria-label={`Search ${label}`} value={query} onChange={event => {
        const nextQuery = event.target.value;
        setQuery(nextQuery);
        onSearchQueryChange?.(nextQuery);
      }} className="min-w-0 flex-1 bg-transparent text-sm text-j-ink outline-none placeholder:text-[#99aabb]" placeholder={`Search ${label.toLocaleLowerCase()}`} />
    </label>
    <div role="group" aria-label={`${label} results`} className={`mt-2 overflow-y-auto px-1 pb-1 ${compact ? "max-h-52" : "min-h-0 flex-1"}`}>
      {results.length === 0 ? <p className="px-2 py-4 text-sm text-[#72889a]">{emptyMessage}</p> : results.map(option => {
        const selected = activeSelectedIds.includes(option.id);
        const limitReached = Boolean(maxSelections && !selected && activeSelectedIds.length >= maxSelections);
        return <label key={option.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#284e6d] hover:bg-[#f1f9ff] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-j-accent">
          {/* A checkbox answers to Space but not Enter, and Enter is what a
              person reaches for after arrowing onto an option. */}
          <input
            type="checkbox"
            checked={selected}
            disabled={option.disabled || limitReached}
            onChange={() => onToggle(option.id)}
            onKeyDown={event => {
              if (event.key !== "Enter" || option.disabled || limitReached) return;
              event.preventDefault();
              onToggle(option.id);
            }}
            className="h-4 w-4 rounded border-[#9fc7de] text-j-accent"
          />
          <span className="flex-1">{option.label}</span>
          {selected ? <Check aria-label="Selected" size={15} className="text-j-accent" /> : null}
        </label>;
      })}
    </div>
  </>;
  return <div className={tutorProfileResponsiveClasses.selectorRoot} onKeyDown={handleKeyDown}>
    <span className={tutorProfileTheme.fieldLabel}>{label}{required ? <span aria-hidden="true" className="text-[#d84a4a]"> *</span> : null}</span>
    {description ? <p className="mt-0.5 text-2xs leading-4 text-[#72889a]">{description}</p> : null}
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      aria-expanded={isOpen}
      aria-controls={searchId}
      aria-required={required || undefined}
      onClick={() => isOpen ? close() : open()}
      aria-invalid={Boolean(error)}
      // The visible text no longer repeats the field name, so the accessible
      // name has to carry it - the control is otherwise unidentifiable to a
      // screen reader, and it stays the way every test finds this button.
      aria-label={`${label}, ${selectionText}`}
      className={`mt-1 flex min-h-9 items-center justify-between gap-3 rounded-lg border bg-white px-2.5 py-1.5 text-left text-xs text-j-ink outline-none transition hover:border-[#96c9e8] focus:border-j-accent focus:ring-4 focus:ring-[#dceffe] disabled:cursor-not-allowed disabled:bg-[#f4f8fb] ${tutorProfileResponsiveClasses.selectorTrigger} ${error ? "border-[#d84a4a]" : "border-[#dbe7ef]"}`}
    >
      {/* The label already sits above this control; repeating it inside meant
          every field read its own name twice. The trigger now behaves like an
          input box and shows only what is in it. */}
      <span className={`${tutorProfileResponsiveClasses.selectorText} ${selectedOptions.length === 0 ? "text-[#99aabb]" : "text-j-ink"}`}>{selectionText}</span>
      <ChevronDown aria-hidden="true" size={16} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
    {error ? <p role="alert" className="mt-1 text-2xs font-medium leading-4 text-[#b43e3e]">{error}</p> : null}
    {selectedOptions.length > 0 ? <div className="mt-2 flex flex-wrap gap-2" aria-label={`${label} selected items`}>
      {selectedOptions.map(option => <span key={option.id} className={`inline-flex items-center gap-1 rounded-full bg-[#eaf7ff] py-0.5 pl-2 pr-1 text-2xs font-semibold text-[#1a6794] ${tutorProfileResponsiveClasses.selectorChip}`}>
        <span className={tutorProfileResponsiveClasses.selectorChipText}>{option.label}</span>
        <button type="button" onClick={() => toggle(option.id)} aria-label={`Remove ${option.label}`} className="rounded-full p-1 outline-none hover:bg-[#ccecff] focus-visible:ring-2 focus-visible:ring-j-accent"><X size={12} /></button>
      </span>)}
    </div> : null}
    {isOpen && !isMobile ? <div id={searchId} role="dialog" aria-label={`${label} options`} className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#cae0ee] bg-white p-2 shadow-[0_16px_35px_rgba(25,78,115,0.18)]">
      {selectorOptions(selectedIds, id => toggle(id), true)}
      <button type="button" onClick={close} className="mt-1 w-full rounded-xl px-3 py-2 text-sm font-bold text-j-accent outline-none hover:bg-[#eef8ff] focus-visible:ring-2 focus-visible:ring-j-accent">Done</button>
    </div> : null}
    <Sheet open={isOpen && isMobile} onOpenChange={nextOpen => nextOpen ? open() : cancelMobileSelection()}>
      <SheetContent id={searchId} side="bottom" aria-label={`${label} selection`} className="h-[min(88dvh,42rem)] w-full gap-0 rounded-t-3xl border-[#cae0ee] bg-white p-0 sm:max-w-none">
        <SheetHeader className="border-b border-[#e3edf4] px-5 pb-3 pt-5">
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>{pendingSelectedIds.length} selected · Search and select all that apply.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
          {selectorOptions(pendingSelectedIds, id => toggle(id, pendingSelectedIds, setPendingSelectedIds))}
        </div>
        <SheetFooter className="border-t border-[#e3edf4] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row">
          <button type="button" onClick={cancelMobileSelection} className="min-h-11 rounded-xl border border-[#b9d2e2] px-4 text-sm font-bold text-[#315a74] outline-none hover:bg-[#f2f8fb] focus-visible:ring-2 focus-visible:ring-j-accent">Cancel</button>
          <button type="button" onClick={confirmMobileSelection} className="min-h-11 rounded-xl bg-j-accent px-4 text-sm font-bold text-white outline-none hover:bg-[#116bb9] focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2">Done</button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </div>;
}

type SearchableSingleSelectProps = {
  label: string;
  required?: boolean;
  options: SelectorOption[];
  value: string;
  onChange: (value: string) => void;
  emptyMessage: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

/**
 * One value, chosen from a short fixed list, filtered as you type. A trimmed
 * sibling of {@link SearchableMultiSelect}: no chips, no max, and picking an
 * option closes the picker straight away.
 */
export function SearchableSingleSelect({
  label,
  required = false,
  options,
  value,
  onChange,
  emptyMessage,
  placeholder,
  error,
  disabled = false,
}: SearchableSingleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isMobile = useIsMobile();
  const listboxId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const selectedOption = options.find(option => option.id === value);
  const results = useMemo(
    () => options.filter(option => option.label.toLocaleLowerCase().includes(normalizedQuery)),
    [normalizedQuery, options],
  );

  const close = () => {
    setIsOpen(false);
    setQuery("");
    buttonRef.current?.focus();
  };
  const pick = (id: string) => {
    onChange(id);
    close();
  };
  const triggerText = selectedOption?.label ?? placeholder ?? `Select ${label.toLocaleLowerCase()}`;

  const optionList = <>
    <label className="flex items-center gap-2 rounded-xl border border-[#dbe7ef] px-3 py-2 text-[#59788e] focus-within:border-j-accent focus-within:ring-4 focus-within:ring-[#dceffe]">
      <Search aria-hidden="true" size={16} />
      <input
        autoFocus
        type="search"
        aria-label={`Search ${label}`}
        value={query}
        onChange={event => setQuery(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-j-ink outline-none placeholder:text-[#99aabb]"
        placeholder={`Search ${label.toLocaleLowerCase()}`}
      />
    </label>
    <div role="listbox" aria-label={`${label} options`} className="mt-2 max-h-52 overflow-y-auto px-1 pb-1">
      {results.length === 0 ? <p className="px-2 py-4 text-sm text-[#72889a]">{emptyMessage}</p> : results.map(option => {
        const selected = option.id === value;
        return <button
          key={option.id}
          type="button"
          role="option"
          aria-selected={selected}
          disabled={option.disabled}
          onClick={() => pick(option.id)}
          className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#284e6d] outline-none hover:bg-[#f1f9ff] focus-visible:ring-2 focus-visible:ring-j-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex-1">{option.label}</span>
          {selected ? <Check aria-label="Selected" size={15} className="text-j-accent" /> : null}
        </button>;
      })}
    </div>
  </>;

  return <div className={tutorProfileResponsiveClasses.selectorRoot} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
    <span className={tutorProfileTheme.fieldLabel}>{label}{required ? <span aria-hidden="true" className="text-[#d84a4a]"> *</span> : null}</span>
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      aria-expanded={isOpen}
      aria-controls={listboxId}
      aria-required={required || undefined}
      aria-invalid={Boolean(error)}
      aria-label={`${label}, ${triggerText}`}
      onClick={() => isOpen ? close() : setIsOpen(true)}
      className={`mt-1 flex min-h-9 items-center justify-between gap-3 rounded-lg border bg-white px-2.5 py-1.5 text-left text-xs text-j-ink outline-none transition hover:border-[#96c9e8] focus:border-j-accent focus:ring-4 focus:ring-[#dceffe] disabled:cursor-not-allowed disabled:bg-[#f4f8fb] ${tutorProfileResponsiveClasses.selectorTrigger} ${error ? "border-[#d84a4a]" : "border-[#dbe7ef]"}`}
    >
      <span className={`${tutorProfileResponsiveClasses.selectorText} ${selectedOption ? "text-j-ink" : "text-[#99aabb]"}`}>{triggerText}</span>
      <ChevronDown aria-hidden="true" size={16} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
    {error ? <p role="alert" className="mt-1 text-2xs font-medium leading-4 text-[#b43e3e]">{error}</p> : null}
    {isOpen && !isMobile ? <div id={listboxId} role="dialog" aria-label={`${label} options`} className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#cae0ee] bg-white p-2 shadow-[0_16px_35px_rgba(25,78,115,0.18)]">
      {optionList}
    </div> : null}
    <Sheet open={isOpen && isMobile} onOpenChange={nextOpen => nextOpen ? setIsOpen(true) : close()}>
      <SheetContent id={listboxId} side="bottom" aria-label={`${label} selection`} className="h-[min(70dvh,34rem)] w-full gap-0 rounded-t-3xl border-[#cae0ee] bg-white p-0 sm:max-w-none">
        <SheetHeader className="border-b border-[#e3edf4] px-5 pb-3 pt-5">
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>Search and pick one.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
          {optionList}
        </div>
      </SheetContent>
    </Sheet>
  </div>;
}

