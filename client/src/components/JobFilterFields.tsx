import ChipMultiSelect, { type ChipOption } from "@/components/ChipMultiSelect";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

/**
 * The thirteen filters a tuition is narrowed by, in one place.
 *
 * The Job Board and the Admin's tuition lists both draw them from here, so a
 * rule about them - Location waits for a City, a Class belongs to a Category,
 * dropping a parent drops its children - is written once and the two cannot
 * drift. What each list adds on top is its own.
 */

type TuitionType = "home" | "online" | "both" | "group" | "package";
type TutorGender = "male" | "female" | "any";

/** The two ceilings the panel enforces; the server carries them as well. */
export const JOB_FILTER_LOCATION_LIMIT = 10;
export const JOB_FILTER_SUBJECT_LIMIT = 12;

/** The fields every list that uses these filters holds. */
export type JobCoreFilters = {
  /** `yyyy-mm-dd`, as a date input gives it. */
  postedFrom: string;
  postedTo: string;
  cityId: string;
  locationIds: string[];
  tuitionTypes: string[];
  daysPerWeek: string[];
  categories: string[];
  classCourses: string[];
  subjects: string[];
  studentGender: "" | "male" | "female";
  preferredTutorGender: "" | TutorGender;
  jobId: string;
};

/** What the filters may offer. `countries` is for the one list that has a Country box. */
export type JobFilterOptions = {
  countries?: string[];
  tuitionTypes: string[];
  daysPerWeek: number[];
  cities: ChipOption[];
  locationsByCity: Record<string, ChipOption[]>;
  classesByCategory: Record<string, string[]>;
  subjectsByClass: Record<string, string[]>;
};

export const EMPTY_JOB_FILTER_OPTIONS: JobFilterOptions = { countries: [], tuitionTypes: [], daysPerWeek: [], cities: [], locationsByCity: {}, classesByCategory: {}, subjectsByClass: {} };

export const asChips = (values: readonly string[]): ChipOption[] => values.map(value => ({ id: value, label: value }));

export function formatJobBoardTuitionType(type: TuitionType) {
  return type === "home" ? "Home Tutoring" : type === "online" ? "Online Tutoring" : type === "group" ? "Group Tutoring" : type === "package" ? "Package Tutoring" : "Home and Online Tutoring";
}

/**
 * Keeps a selection honest when what it depends on changes.
 *
 * Choosing a City is what makes areas meaningful, and a Category is what makes
 * a Class meaningful, so dropping either has to take its children with it -
 * otherwise a filter no one can see goes on narrowing the list.
 */
export function reconcileJobFilters<T extends Pick<JobCoreFilters, "cityId" | "locationIds" | "categories" | "classCourses" | "subjects">>(
  filters: T,
  options: Pick<JobFilterOptions, "locationsByCity" | "classesByCategory" | "subjectsByClass">,
): T {
  const allowedLocations = new Set((filters.cityId ? options.locationsByCity[filters.cityId] ?? [] : []).map(option => option.id));
  const allowedClasses = new Set(filters.categories.flatMap(category => options.classesByCategory[category] ?? []));
  const classCourses = filters.classCourses.filter(classCourse => allowedClasses.has(classCourse));
  const allowedSubjects = new Set(classCourses.flatMap(classCourse => options.subjectsByClass[classCourse] ?? []));
  return {
    ...filters,
    locationIds: filters.locationIds.filter(id => allowedLocations.has(id)),
    classCourses,
    subjects: filters.subjects.filter(subject => allowedSubjects.has(subject)),
  };
}

const boxClass = "h-11 w-full rounded-xl border border-[#dbe7ef] bg-white px-3 text-sm outline-none placeholder:text-[#8fa3b4] focus:border-j-accent focus:ring-2 focus:ring-sky-100";

/**
 * A date box that says what it is for.
 *
 * A native date input has no placeholder - it shows the locale mask instead,
 * so two of them side by side both read "mm/dd/yyyy" and neither says which
 * end of the range it is. It starts as a text box carrying its own label and
 * becomes a date picker the moment it is focused or holds a value.
 */
export function DateField({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const [focused, setFocused] = useState(false);
  return <input
    type={focused || value ? "date" : "text"}
    aria-label={label}
    placeholder={label}
    value={value}
    min={min}
    max={max}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    onChange={event => onChange(event.target.value)}
    className={`${boxClass} ${value ? "text-j-ink" : "text-[#8fa3b4]"}`}
  />;
}

/**
 * A choice that reads as its own label until one is made.
 *
 * The browser's own arrow sits wherever the browser puts it, a little further
 * right than the one in a chip box beside it; the arrow here is drawn at the
 * chip box's own place so the two read as one set of fields.
 */
export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: ChipOption[] }) {
  return <div className="relative">
    <select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className={`${boxClass} appearance-none pr-9 ${value ? "text-j-ink" : "text-[#8fa3b4]"}`}>
      <option value="">{label}</option>
      {options.map(option => <option key={option.id} value={option.id} className="text-j-ink">{option.label}</option>)}
    </select>
    <ChevronDown size={16} aria-hidden={true} className="pointer-events-none absolute right-3 top-3 text-[#8fa3b4]" />
  </div>;
}

/** A line of text that reads as its own label until something is typed. */
export function FilterTextBox({ label, value, onChange, inputMode, suffix }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "numeric"; suffix?: string }) {
  const input = <input
    aria-label={label}
    value={value}
    inputMode={inputMode}
    onChange={event => onChange(event.target.value)}
    placeholder={label}
    className={suffix ? "min-w-0 flex-1 bg-transparent px-3 text-sm text-j-ink outline-none placeholder:text-[#8fa3b4]" : `${boxClass} text-j-ink`}
  />;
  if (!suffix) return input;
  // A money box carries its currency word, as every other money box in the app does.
  return <span className="flex h-11 w-full items-stretch overflow-hidden rounded-xl border border-[#dbe7ef] bg-white focus-within:border-j-accent focus-within:ring-2 focus-within:ring-sky-100">
    {input}
    <span className="flex items-center border-l border-[#dbe7ef] px-3 text-xs font-semibold text-[#55738a]">{suffix}</span>
  </span>;
}

/**
 * The thirteen filters, all on one grid.
 *
 * The four that depend on something else say so by going quiet rather than by
 * explaining themselves: Location waits for a City, Class for a Category,
 * Subject for a Class. What each one may offer comes from the tuitions that
 * are actually there, so nothing here can be chosen that returns an empty list.
 *
 * `children` are the list's own filters, drawn after Job ID on the same grid.
 * A list with no Country box (the Admin's, which holds one country) passes
 * `showCountry={false}` and City takes the space.
 */
export function JobCoreFilterFields<T extends JobCoreFilters & { country?: string }>({
  draft, setDraft, options, showCountry = true, locationLimit = JOB_FILTER_LOCATION_LIMIT, subjectLimit = JOB_FILTER_SUBJECT_LIMIT, pairOnPhone = false, children,
}: {
  draft: T;
  setDraft: (next: T) => void;
  options: JobFilterOptions;
  showCountry?: boolean;
  locationLimit?: number;
  subjectLimit?: number;
  /** On a phone, two short boxes that sit side by side share a row (dates, salary), instead of one column of twenty. */
  pairOnPhone?: boolean;
  children?: ReactNode;
}) {
  const set = (change: Partial<T>) => setDraft(reconcileJobFilters({ ...draft, ...change }, options));

  const locationOptions = draft.cityId ? options.locationsByCity[draft.cityId] ?? [] : [];
  const classOptions = asChips(Array.from(new Set(draft.categories.flatMap(category => options.classesByCategory[category] ?? []))).sort());
  const subjectOptions = asChips(Array.from(new Set(draft.classCourses.flatMap(classCourse => options.subjectsByClass[classCourse] ?? []))).sort());
  // The boxes that need the whole row on a phone when it holds two columns.
  const full = pairOnPhone ? "max-sm:col-span-2" : "";
  const city = <FilterSelect label="City" value={draft.cityId} onChange={cityId => set({ cityId } as Partial<T>)} options={options.cities} />;

  return <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${pairOnPhone ? "max-sm:grid-cols-2" : ""}`}>
    <DateField label="Posted Date From" value={draft.postedFrom} max={draft.postedTo || undefined} onChange={postedFrom => set({ postedFrom } as Partial<T>)} />
    <DateField label="Posted Date To" value={draft.postedTo} min={draft.postedFrom || undefined} onChange={postedTo => set({ postedTo } as Partial<T>)} />
    <div className={`lg:col-span-2 ${full}`}>
      <ChipMultiSelect label="Tuition Type" options={asChips(options.tuitionTypes.map(type => formatJobBoardTuitionType(type as TuitionType)))} selectedIds={draft.tuitionTypes.map(type => formatJobBoardTuitionType(type as TuitionType))} onChange={labels => set({ tuitionTypes: options.tuitionTypes.filter(type => labels.includes(formatJobBoardTuitionType(type as TuitionType))) } as Partial<T>)} />
    </div>

    {showCountry ? <>
      <FilterSelect label="Country" value={draft.country ?? ""} onChange={country => set({ country } as Partial<T>)} options={asChips(options.countries ?? [])} />
      {city}
    </> : <div className={`lg:col-span-2 ${full}`}>{city}</div>}
    <div className={`lg:col-span-2 ${full}`}>
      <ChipMultiSelect label="Tutoring Days Per Week" options={options.daysPerWeek.map(days => ({ id: String(days), label: `${days} day${days === 1 ? "" : "s"}` }))} selectedIds={draft.daysPerWeek} onChange={daysPerWeek => set({ daysPerWeek } as Partial<T>)} />
    </div>

    <div className={`sm:col-span-2 ${full}`}>
      <ChipMultiSelect label="Category" options={asChips(Object.keys(options.classesByCategory).sort())} selectedIds={draft.categories} onChange={categories => set({ categories } as Partial<T>)} />
    </div>
    <div className={`sm:col-span-2 ${full}`}>
      <ChipMultiSelect label="Location" options={locationOptions} selectedIds={draft.locationIds} onChange={locationIds => set({ locationIds } as Partial<T>)} disabled={!draft.cityId} disabledPlaceholder="Location - select a City first" maxSelections={locationLimit} />
    </div>

    <div className={`sm:col-span-2 ${full}`}>
      <FilterSelect label="Student Gender" value={draft.studentGender} onChange={value => set({ studentGender: value } as Partial<T>)} options={[{ id: "male", label: "Male" }, { id: "female", label: "Female" }]} />
    </div>
    <div className={`sm:col-span-2 ${full}`}>
      <ChipMultiSelect label="Class" options={classOptions} selectedIds={draft.classCourses} onChange={classCourses => set({ classCourses } as Partial<T>)} disabled={draft.categories.length === 0} disabledPlaceholder="Class - select a Category first" />
    </div>

    <div className={`sm:col-span-2 ${full}`}>
      <ChipMultiSelect label="Subject" options={subjectOptions} selectedIds={draft.subjects} onChange={subjects => set({ subjects } as Partial<T>)} disabled={draft.classCourses.length === 0} disabledPlaceholder="Subject - select a Class first" maxSelections={subjectLimit} />
    </div>
    <FilterSelect label="Tutor Gender" value={draft.preferredTutorGender} onChange={value => set({ preferredTutorGender: value } as Partial<T>)} options={[{ id: "male", label: "Male" }, { id: "female", label: "Female" }, { id: "any", label: "Any" }]} />
    <input aria-label="Job ID" value={draft.jobId} onChange={event => set({ jobId: event.target.value } as Partial<T>)} placeholder="Job ID" className={`${boxClass} text-j-ink`} />
    {children}
  </div>;
}
