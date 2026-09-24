import { Check, ChevronDown, Search } from "lucide-react";
import React from "react";
import { useId, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useIsMobile } from "@/hooks/useMobile";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tutorProfileResponsiveClasses } from "@/pages/TutorProfileResponsive";
import { tutorProfileTheme } from "@/pages/tutorProfileTheme";
import ChipMultiSelect from "@/components/ChipMultiSelect";

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
  className?: string;
};

/**
 * Several values in one profile field.
 *
 * This is the profile's chrome - label, required marker, error line - around
 * the same chip box the Job Board filters use. It used to be its own thing: a
 * popover of checkboxes on desktop, a full-height sheet with Cancel and Done
 * on a phone, chosen values staying in the list behind a tick, and the chips
 * stacked underneath the field. Two controls for one job, each with its own
 * rules, and the tick was answering a question the chip already answered.
 *
 * What the chip box does instead: the chosen values sit inside the box, a
 * value that has been chosen leaves the list, and typing narrows it. There is
 * nothing left for a checkbox to say.
 */
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
  className,
}: SearchableMultiSelectProps) {
  return <div className={`${tutorProfileResponsiveClasses.selectorRoot}${className ? ` ${className}` : ""}`}>
    <span className={tutorProfileTheme.fieldLabel}>{label}{required ? <span aria-hidden="true" className="text-tp-danger"> *</span> : null}</span>
    {description ? <p className="mt-0.5 text-2xs leading-4 text-tp-label">{description}</p> : null}
    <div className="mt-1">
      <ChipMultiSelect
        label={label}
        options={options}
        selectedIds={selectedIds}
        onChange={onChange}
        onSearchQueryChange={onSearchQueryChange}
        disabled={disabled}
        maxSelections={maxSelections}
        required={required}
        invalid={Boolean(error)}
        dense
        emptyMessage={emptyMessage}
      />
    </div>
    {error ? <p role="alert" className="mt-1 text-2xs font-medium leading-4 text-tp-danger-ink">{error}</p> : null}
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
    <label className="flex items-center gap-2 rounded-xl border border-tp-border px-3 py-2 text-tp-label focus-within:border-tp-accent focus-within:ring-4 focus-within:ring-tp-accent-wash">
      <Search aria-hidden="true" size={16} />
      <input
        autoFocus
        type="search"
        aria-label={`Search ${label}`}
        value={query}
        onChange={event => setQuery(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-tp-heading outline-none placeholder:text-tp-label-faint"
        placeholder={`Search ${label.toLocaleLowerCase()}`}
      />
    </label>
    <div role="listbox" aria-label={`${label} options`} className="mt-2 max-h-52 overflow-y-auto px-1 pb-1">
      {results.length === 0 ? <p className="px-2 py-4 text-sm text-tp-label">{emptyMessage}</p> : results.map(option => {
        const selected = option.id === value;
        return <button
          key={option.id}
          type="button"
          role="option"
          aria-selected={selected}
          disabled={option.disabled}
          onClick={() => pick(option.id)}
          className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-tp-value outline-none hover:bg-tp-accent-wash focus-visible:ring-2 focus-visible:ring-tp-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex-1">{option.label}</span>
          {selected ? <Check aria-label="Selected" size={15} className="text-tp-accent" /> : null}
        </button>;
      })}
    </div>
  </>;

  // On desktop `<Popover.Trigger asChild>` owns the click; the mobile Sheet
  // needs its own handler.
  const triggerButton = <button
    ref={buttonRef}
    type="button"
    disabled={disabled}
    aria-expanded={isOpen}
    aria-controls={listboxId}
    aria-required={required || undefined}
    aria-invalid={Boolean(error)}
    aria-label={`${label}, ${triggerText}`}
    onClick={isMobile ? () => (isOpen ? close() : setIsOpen(true)) : undefined}
    className={`mt-1 flex min-h-9 items-center justify-between gap-3 rounded-lg border bg-white px-2.5 py-1.5 text-left text-xs text-tp-heading outline-none transition hover:border-tp-accent-soft focus:border-tp-accent focus:ring-4 focus:ring-tp-accent-wash disabled:cursor-not-allowed disabled:bg-j-surface-sunken ${tutorProfileResponsiveClasses.selectorTrigger} ${error ? "border-tp-danger" : "border-tp-border"}`}
  >
    <span className={`${tutorProfileResponsiveClasses.selectorText} ${selectedOption ? "text-tp-heading" : "text-tp-label-faint"}`}>{triggerText}</span>
    <ChevronDown aria-hidden="true" size={16} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
  </button>;

  return <div className={tutorProfileResponsiveClasses.selectorRoot} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
    <span className={tutorProfileTheme.fieldLabel}>{label}{required ? <span aria-hidden="true" className="text-tp-danger"> *</span> : null}</span>
    {isMobile ? triggerButton : (
      <Popover.Root open={isOpen} onOpenChange={nextOpen => (nextOpen ? setIsOpen(true) : close())}>
        <Popover.Trigger asChild>{triggerButton}</Popover.Trigger>
        <Popover.Portal>
          {/* Portalled out of the scrolling ModalBody so the list is never
              clipped by its overflow or hidden behind the modal footer;
              Radix flips it above the trigger when there is no room below. */}
          <Popover.Content
            id={listboxId}
            role="group"
            aria-label={`${label} options`}
            align="start"
            side="bottom"
            sideOffset={8}
            collisionPadding={12}
            className="z-[60] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-2xl border border-tp-border bg-white p-2 shadow-[0_16px_35px_rgba(25,78,115,0.18)] focus:outline-none"
          >
            {optionList}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    )}
    {error ? <p role="alert" className="mt-1 text-2xs font-medium leading-4 text-tp-danger-ink">{error}</p> : null}
    <Sheet open={isOpen && isMobile} onOpenChange={nextOpen => nextOpen ? setIsOpen(true) : close()}>
      <SheetContent id={listboxId} side="bottom" aria-label={`${label} selection`} className="h-[min(70dvh,34rem)] w-full gap-0 rounded-t-3xl border-tp-border bg-white p-0 sm:max-w-none">
        <SheetHeader className="border-b border-tp-border px-5 pb-3 pt-5">
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

