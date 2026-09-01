import { Check, ChevronDown, Search, X } from "lucide-react";
import React from "react";
import { KeyboardEvent, useId, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tutorProfileResponsiveClasses } from "@/pages/TutorProfileResponsive";

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

  const selectionText = selectedIds.length === 0 ? "No selections" : `${selectedIds.length} selected`;
  const selectorOptions = (activeSelectedIds: string[], onToggle: (id: string) => void, compact = false) => <>
    <label className="flex items-center gap-2 rounded-xl border border-[#dbe7ef] px-3 py-2 text-[#59788e] focus-within:border-[#167ddd] focus-within:ring-4 focus-within:ring-[#dceffe]">
      <Search aria-hidden="true" size={16} />
      <input autoFocus type="search" aria-label={`Search ${label}`} value={query} onChange={event => {
        const nextQuery = event.target.value;
        setQuery(nextQuery);
        onSearchQueryChange?.(nextQuery);
      }} className="min-w-0 flex-1 bg-transparent text-sm text-[#173b60] outline-none placeholder:text-[#99aabb]" placeholder={`Search ${label.toLocaleLowerCase()}`} />
    </label>
    <div role="group" aria-label={`${label} results`} className={`mt-2 overflow-y-auto px-1 pb-1 ${compact ? "max-h-52" : "min-h-0 flex-1"}`}>
      {results.length === 0 ? <p className="px-2 py-4 text-sm text-[#72889a]">{emptyMessage}</p> : results.map(option => {
        const selected = activeSelectedIds.includes(option.id);
        const limitReached = Boolean(maxSelections && !selected && activeSelectedIds.length >= maxSelections);
        return <label key={option.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#284e6d] hover:bg-[#f1f9ff] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#167ddd]">
          <input type="checkbox" checked={selected} disabled={option.disabled || limitReached} onChange={() => onToggle(option.id)} className="h-4 w-4 rounded border-[#9fc7de] text-[#167ddd]" />
          <span className="flex-1">{option.label}</span>
          {selected ? <Check aria-label="Selected" size={15} className="text-[#167ddd]" /> : null}
        </label>;
      })}
    </div>
  </>;
  return <div className={tutorProfileResponsiveClasses.selectorRoot} onKeyDown={handleKeyDown}>
    <span className="block text-sm font-semibold text-[#244a6a]">{label}{required ? <span aria-hidden="true" className="text-[#d84a4a]"> *</span> : null}</span>
    {description ? <p className="mt-1 text-xs leading-5 text-[#72889a]">{description}</p> : null}
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      aria-expanded={isOpen}
      aria-controls={searchId}
      aria-required={required || undefined}
      onClick={() => isOpen ? close() : open()}
      aria-invalid={Boolean(error)}
      className={`mt-2 flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm text-[#173b60] outline-none transition hover:border-[#96c9e8] focus:border-[#167ddd] focus:ring-4 focus:ring-[#dceffe] disabled:cursor-not-allowed disabled:bg-[#f4f8fb] ${tutorProfileResponsiveClasses.selectorTrigger} ${error ? "border-[#d84a4a]" : "border-[#dbe7ef]"}`}
    >
      <span className={tutorProfileResponsiveClasses.selectorText}><span className="font-semibold">{label}</span><span className="ml-1.5 font-normal text-[#6f8798]">· {selectionText}</span></span>
      <ChevronDown aria-hidden="true" size={16} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
    {error ? <p role="alert" className="mt-1.5 text-xs font-medium leading-5 text-[#b43e3e]">{error}</p> : null}
    {selectedOptions.length > 0 ? <div className="mt-2 flex flex-wrap gap-2" aria-label={`${label} selected items`}>
      {selectedOptions.map(option => <span key={option.id} className={`inline-flex items-center gap-1 rounded-full bg-[#eaf7ff] py-1 pl-2.5 pr-1 text-xs font-semibold text-[#1a6794] ${tutorProfileResponsiveClasses.selectorChip}`}>
        <span className={tutorProfileResponsiveClasses.selectorChipText}>{option.label}</span>
        <button type="button" onClick={() => toggle(option.id)} aria-label={`Remove ${option.label}`} className="rounded-full p-1 outline-none hover:bg-[#ccecff] focus-visible:ring-2 focus-visible:ring-[#167ddd]"><X size={12} /></button>
      </span>)}
    </div> : null}
    {isOpen && !isMobile ? <div id={searchId} role="dialog" aria-label={`${label} options`} className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#cae0ee] bg-white p-2 shadow-[0_16px_35px_rgba(25,78,115,0.18)]">
      {selectorOptions(selectedIds, id => toggle(id), true)}
      <button type="button" onClick={close} className="mt-1 w-full rounded-xl px-3 py-2 text-sm font-bold text-[#167ddd] outline-none hover:bg-[#eef8ff] focus-visible:ring-2 focus-visible:ring-[#167ddd]">Done</button>
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
          <button type="button" onClick={cancelMobileSelection} className="min-h-11 rounded-xl border border-[#b9d2e2] px-4 text-sm font-bold text-[#315a74] outline-none hover:bg-[#f2f8fb] focus-visible:ring-2 focus-visible:ring-[#167ddd]">Cancel</button>
          <button type="button" onClick={confirmMobileSelection} className="min-h-11 rounded-xl bg-[#167ddd] px-4 text-sm font-bold text-white outline-none hover:bg-[#116bb9] focus-visible:ring-2 focus-visible:ring-[#167ddd] focus-visible:ring-offset-2">Done</button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </div>;
}

