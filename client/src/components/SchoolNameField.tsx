import { trpc } from "@/lib/trpc";
import { normalizeSchoolName, SCHOOL_NAME_MAX, SCHOOL_NAME_MIN, schoolCollegeDivisionLabels, tidySchoolName, type SchoolCollegeDivision } from "@shared/school-colleges";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

type SchoolOption = { id: number; name: string; division: string | null; own: boolean };

/**
 * The Institute Name box of a Secondary or Higher Secondary record.
 *
 * Typing searches the school and college list; the saved value changes only
 * when a name is chosen, or created with the last row - `Create "…"` - when
 * the list does not have it. A created name is kept for this Tutor alone.
 * Leaving the box without choosing puts back the name already saved.
 */
export default function SchoolNameField({ label, value, onChange, placeholder, required, labelClassName, markerClassName, rootClassName, inputClassName }: {
  label: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  required?: boolean;
  rootClassName?: string;
  labelClassName?: string;
  markerClassName?: string;
  inputClassName?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState(value);
  const [search, setSearch] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => { if (!open) setQuery(value); }, [value, open]);
  // One request per pause in typing, not per key.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const searchable = open && normalizeSchoolName(search).length >= 2;
  const results = trpc.catalog.searchSchoolColleges.useQuery({ query: search }, { enabled: searchable, placeholderData: previous => previous });
  const create = trpc.catalog.createSchoolCollege.useMutation();
  const utils = trpc.useUtils();

  const typed = tidySchoolName(query);
  const options: SchoolOption[] = searchable ? (results.data ?? []) as SchoolOption[] : [];
  const exact = options.some(option => normalizeSchoolName(option.name) === normalizeSchoolName(typed));
  const canCreate = searchable && typed.length >= SCHOOL_NAME_MIN && !exact && !results.isFetching;
  const rowCount = options.length + (canCreate ? 1 : 0);

  const choose = (name: string) => {
    onChange(name);
    setQuery(name);
    setOpen(false);
  };
  const createTyped = () => {
    create.mutate({ name: typed }, {
      onSuccess: school => { void utils.catalog.searchSchoolColleges.invalidate(); choose(school.name); },
      onError: error => toast.error(error.message),
    });
  };
  const pick = (index: number) => {
    if (index < options.length) choose(options[index].name);
    else if (canCreate) createTyped();
  };

  return <div className={rootClassName}>
    <label htmlFor={`${listId}-input`} className={labelClassName}>{label}{required ? <span aria-hidden="true" className={markerClassName}> *</span> : null}</label>
    <div className="relative">
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={open && rowCount > 0}
        aria-controls={`${listId}-list`}
        aria-autocomplete="list"
        aria-required={required || undefined}
        aria-activedescendant={open && rowCount > 0 ? `${listId}-option-${highlight}` : undefined}
        autoComplete="off"
        value={query}
        maxLength={SCHOOL_NAME_MAX}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={event => { setQuery(event.target.value); setOpen(true); setHighlight(0); }}
        onBlur={() => { setOpen(false); setQuery(value); }}
        onKeyDown={event => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setHighlight(current => Math.min(current + 1, Math.max(rowCount - 1, 0))); }
          else if (event.key === "ArrowUp") { event.preventDefault(); setHighlight(current => Math.max(current - 1, 0)); }
          else if (event.key === "Enter" && open && rowCount > 0) { event.preventDefault(); pick(highlight); }
          else if (event.key === "Escape") { setOpen(false); setQuery(value); }
        }}
        className={`${inputClassName ?? ""} pr-8`}
      />
      {create.isPending || (searchable && results.isFetching)
        ? <Loader2 aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 animate-spin text-[#8ba1b2]" />
        : <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-[#8ba1b2]" />}
      {open && rowCount > 0 ? <ul
        id={`${listId}-list`}
        role="listbox"
        aria-label={label}
        // A press on the list would blur the box first and close the list under the pointer.
        onMouseDown={event => event.preventDefault()}
        className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#dbe7ef] bg-white py-1 text-sm shadow-lg"
      >
        {options.map((option, index) => <li
          key={option.id}
          id={`${listId}-option-${index}`}
          role="option"
          aria-selected={index === highlight}
          onMouseEnter={() => setHighlight(index)}
          onClick={() => pick(index)}
          className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 ${index === highlight ? "bg-[#eef6fd]" : ""}`}
        >
          <span className="min-w-0 break-words text-j-ink">{option.name}</span>
          {option.division ? <span className="shrink-0 text-2xs text-[#8ba1b2]">{schoolCollegeDivisionLabels[option.division as SchoolCollegeDivision] ?? option.division}</span> : null}
        </li>)}
        {canCreate ? <li
          id={`${listId}-option-${options.length}`}
          role="option"
          aria-selected={highlight === options.length}
          onMouseEnter={() => setHighlight(options.length)}
          onClick={() => pick(options.length)}
          className={`flex cursor-pointer items-center gap-2 border-t border-[#eef4f9] px-3 py-2 font-medium text-[#1267c8] ${highlight === options.length ? "bg-[#eef6fd]" : ""}`}
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 break-words">Create "{typed}"</span>
        </li> : null}
      </ul> : null}
    </div>
  </div>;
}
