import { Check, ChevronDown, Search, X } from "lucide-react";
import React from "react";
import { KeyboardEvent, useId, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tutorProfileResponsiveClasses } from "@/pages/TutorProfileResponsive";
import {

  hudChipClassName,
  hudControlAccent,
  hudErrorBorder,
  hudErrorClassName,
  hudLabelClassName,
  hudOptionRowClassName,
  hudPopoverClassName,
  hudRequiredMark,
  hudTriggerClassName,
} from "@/pages/tutorProfileHud";

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
    <label className="flex items-center gap-2 rounded-lg border border-[#2f5675] bg-[#0a1a29]/70 px-3 py-2 text-[#8fb0c7] focus-within:border-[#4fd1ff] focus-within:ring-2 focus-within:ring-[#4fd1ff]/25">
      <Search aria-hidden="true" size={16} />
      <input autoFocus type="search" aria-label={`Search ${label}`} value={query} onChange={event => {
        const nextQuery = event.target.value;
        setQuery(nextQuery);
        onSearchQueryChange?.(nextQuery);
      }} className="min-w-0 flex-1 bg-transparent text-[13px] text-[#eaf6ff] outline-none placeholder:text-[#6d8ba3]" placeholder={`Search ${label.toLocaleLowerCase()}`} />
    </label>
    <div role="group" aria-label={`${label} results`} className={`mt-2 overflow-y-auto px-1 pb-1 ${compact ? "max-h-52" : "min-h-0 flex-1"}`}>
      {results.length === 0 ? <p className="px-2 py-4 text-[13px] text-[#8fb0c7]">{emptyMessage}</p> : results.map(option => {
        const selected = activeSelectedIds.includes(option.id);
        const limitReached = Boolean(maxSelections && !selected && activeSelectedIds.length >= maxSelections);
        return <label key={option.id} className={hudOptionRowClassName}>
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
            className={`h-4 w-4 rounded ${hudControlAccent}`}
          />
          <span className="flex-1">{option.label}</span>
          {selected ? <Check aria-label="Selected" size={15} className="text-[#5cd1ff]" /> : null}
        </label>;
      })}
    </div>
  </>;
  return <div className={tutorProfileResponsiveClasses.selectorRoot} onKeyDown={handleKeyDown}>
    <span className={hudLabelClassName}>{label}{required ? <span aria-hidden="true" className={hudRequiredMark}> *</span> : null}</span>
    {description ? <p className="mt-0.5 text-[11px] leading-4 text-[#7f9db4]">{description}</p> : null}
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
      className={`${hudTriggerClassName} ${tutorProfileResponsiveClasses.selectorTrigger} ${error ? hudErrorBorder : ""}`}
    >
      {/* The label already sits above this control; repeating it inside meant
          every field read its own name twice. The trigger now behaves like an
          input box and shows only what is in it. */}
      <span className={`${tutorProfileResponsiveClasses.selectorText} ${selectedOptions.length === 0 ? "text-[#6d8ba3]" : "text-[#eaf6ff]"}`}>{selectionText}</span>
      <ChevronDown aria-hidden="true" size={16} className={`shrink-0 text-[#8fb0c7] transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
    {error ? <p role="alert" className={hudErrorClassName}>{error}</p> : null}
    {selectedOptions.length > 0 ? <div className="mt-2 flex flex-wrap gap-2" aria-label={`${label} selected items`}>
      {selectedOptions.map(option => <span key={option.id} className={`${hudChipClassName} ${tutorProfileResponsiveClasses.selectorChip}`}>
        <span className={tutorProfileResponsiveClasses.selectorChipText}>{option.label}</span>
        <button type="button" onClick={() => toggle(option.id)} aria-label={`Remove ${option.label}`} className="rounded-full p-1 outline-none hover:bg-[#4fd1ff]/25 focus-visible:ring-2 focus-visible:ring-[#4fd1ff]"><X size={12} /></button>
      </span>)}
    </div> : null}
    {isOpen && !isMobile ? <div id={searchId} role="dialog" aria-label={`${label} options`} className={`absolute z-30 mt-2 w-full overflow-hidden p-2 ${hudPopoverClassName}`}>
      {selectorOptions(selectedIds, id => toggle(id), true)}
      <button type="button" onClick={close} className="mt-1 w-full rounded-lg px-3 py-2 text-[13px] font-bold text-[#5cd1ff] outline-none hover:bg-[#4fd1ff]/10 focus-visible:ring-2 focus-visible:ring-[#4fd1ff]">Done</button>
    </div> : null}
    <Sheet open={isOpen && isMobile} onOpenChange={nextOpen => nextOpen ? open() : cancelMobileSelection()}>
      <SheetContent id={searchId} side="bottom" aria-label={`${label} selection`} className="h-[min(88dvh,42rem)] w-full gap-0 rounded-t-3xl border-[#2f5675] bg-[#0e2233] p-0 text-[#cfe6f5] sm:max-w-none">
        <SheetHeader className="border-b border-[#24405a] px-5 pb-3 pt-5">
          <SheetTitle className="text-[#eaf6ff]">{label}</SheetTitle>
          <SheetDescription className="text-[#8fb0c7]">{pendingSelectedIds.length} selected · Search and select all that apply.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
          {selectorOptions(pendingSelectedIds, id => toggle(id, pendingSelectedIds, setPendingSelectedIds))}
        </div>
        <SheetFooter className="border-t border-[#24405a] bg-[#0a1a29] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row">
          <button type="button" onClick={cancelMobileSelection} className="min-h-11 rounded-xl border border-[#2f5675] px-4 text-[13px] font-bold text-[#cfe6f5] outline-none hover:bg-[#4fd1ff]/10 focus-visible:ring-2 focus-visible:ring-[#4fd1ff]">Cancel</button>
          <button type="button" onClick={confirmMobileSelection} className="min-h-11 rounded-xl bg-gradient-to-r from-[#2bb8f0] to-[#1a8fd0] px-4 text-[13px] font-bold text-[#04101c] outline-none hover:from-[#4fd1ff] hover:to-[#2bb8f0] focus-visible:ring-2 focus-visible:ring-[#4fd1ff] focus-visible:ring-offset-2">Done</button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </div>;
}

