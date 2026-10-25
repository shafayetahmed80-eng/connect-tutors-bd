import React, { useEffect, useId, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { normalizeSchoolName, schoolCollegeDivisionLabels, type SchoolCollegeDivision } from "@shared/school-colleges";
import { ChevronDown, Loader2 } from "lucide-react";

export type SchoolAutocompleteInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  inputClassName?: string;
  icon?: React.ReactNode;
  maxLength?: number;
  disabled?: boolean;
  "aria-label"?: string;
  onBlur?: () => void;
};

type SchoolItem = {
  id: number;
  name: string;
  division: string | null;
  own?: boolean;
};

export default function SchoolAutocompleteInput({
  value,
  onChange,
  placeholder = "Search or type school / college name",
  id,
  className = "",
  inputClassName = "",
  icon,
  maxLength = 160,
  disabled = false,
  "aria-label": ariaLabel,
  onBlur,
}: SchoolAutocompleteInputProps) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-school-input`;
  const listId = `${inputId}-listbox`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(0);

  // Debounce search query so we don't query on every single keystroke
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(value);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [value]);

  const searchable = open && normalizeSchoolName(search).length >= 2;
  const resultsQuery = trpc.catalog.searchSchoolColleges.useQuery(
    { query: search },
    { enabled: searchable, placeholderData: previous => previous }
  );

  const options: SchoolItem[] = searchable ? ((resultsQuery.data ?? []) as SchoolItem[]) : [];
  const showDropdown = open && options.length > 0;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectOption = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {icon ? (
        <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-j-accent z-10">
          {icon}
        </span>
      ) : null}

      <input
        id={inputId}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listId : undefined}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={event => {
          onChange(event.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onBlur={onBlur}
        onKeyDown={event => {
          if (!showDropdown) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlight(prev => (prev + 1) % options.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight(prev => (prev - 1 + options.length) % options.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (options[highlight]) {
              selectOption(options[highlight].name);
            }
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`${inputClassName} ${icon ? "pl-10" : ""}`}
      />

      {searchable && resultsQuery.isFetching ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-j-ink-faint">
          <Loader2 size={16} className="animate-spin text-j-accent" />
        </span>
      ) : null}

      {showDropdown ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggested schools and colleges"
          className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-j-border bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {options.map((item, index) => {
            const isHighlighted = index === highlight;
            const divLabel = item.division && item.division in schoolCollegeDivisionLabels
              ? schoolCollegeDivisionLabels[item.division as SchoolCollegeDivision]
              : item.division;

            return (
              <li
                key={item.id}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => selectOption(item.name)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-xs transition-colors ${
                  isHighlighted ? "bg-j-accent-wash text-j-accent font-semibold" : "text-j-ink hover:bg-j-surface-sunken"
                }`}
              >
                <span className="truncate">{item.name}</span>
                {divLabel ? (
                  <span className="shrink-0 rounded-md bg-j-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-j-ink-soft">
                    {divLabel}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
