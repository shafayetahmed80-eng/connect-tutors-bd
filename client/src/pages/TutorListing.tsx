import { useMemo, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, ChevronLeft, ChevronRight, Filter, MapPin, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { modeLabel } from "@shared/tutors";
import type { TuitionMode } from "@shared/tutors";

export type ListingState = {
  query: string;
  country: string;
  city: string;
  division: string;
  district: string;
  mode: "all" | TuitionMode;
  subjects: string[];
  levels: string[];
  languages: string[];
  gender: "all" | "male" | "female";
  verifiedOnly: boolean;
  minFee?: number;
  maxFee?: number;
  page: number;
};

type ActiveFilterChip = { key: string; label: string };
type DirectoryFilterScope = "desktop" | "mobile";

const initialFilters: ListingState = {
  query: "",
  country: "all",
  city: "all",
  division: "all",
  district: "all",
  mode: "all",
  subjects: [],
  levels: [],
  languages: [],
  gender: "all",
  verifiedOnly: false,
  minFee: undefined,
  maxFee: undefined,
  page: 1,
};

export function getActiveFilterChips(filters: ListingState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const query = filters.query.trim();
  if (query) chips.push({ key: "query", label: `Search: ${query}` });
  (["country", "division", "city", "district"] as const).forEach((key) => {
    if (filters[key] !== "all") chips.push({ key, label: filters[key] });
  });
  if (filters.mode !== "all") chips.push({ key: "mode", label: modeLabel(filters.mode) });
  (["subjects", "levels", "languages"] as const).forEach((key) => {
    filters[key].forEach((value) => chips.push({ key: `${key}:${value}`, label: value }));
  });
  if (filters.gender !== "all") chips.push({ key: "gender", label: filters.gender === "female" ? "Female tutor" : "Male tutor" });
  if (filters.verifiedOnly) chips.push({ key: "verifiedOnly", label: "Verified" });
  if (filters.minFee || filters.maxFee) {
    const minimum = filters.minFee ? `From ৳${filters.minFee.toLocaleString()}` : "Any minimum fee";
    const maximum = filters.maxFee ? `Up to ৳${filters.maxFee.toLocaleString()}` : "";
    chips.push({ key: "fee", label: [minimum, maximum].filter(Boolean).join(" · ") });
  }
  return chips;
}

export function getDirectoryFilterControlId(scope: DirectoryFilterScope, name: string) {
  return `${scope === "mobile" ? "mobile-" : ""}listing-${name}`;
}

function MultiSelect({ id, label, values, options, onChange }: { id: string; label: string; values: string[]; options: string[]; onChange: (values: string[]) => void }) {
  return <div className="filter-block">
    <label htmlFor={id}>{label}</label>
    <select id={id} className="directory-select min-h-24" multiple value={values} onChange={(event) => onChange(Array.from(event.target.selectedOptions, option => option.value))}>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
    <p className="mt-1 text-xs text-j-ink-muted">Use Ctrl/Cmd or touch selection for multiple options.</p>
  </div>;
}

type FilterControlsProps = {
  scope: DirectoryFilterScope;
  filters: ListingState;
  countries: { id: string; label: string }[];
  divisions: { id: string; label: string }[];
  cities: { id: string; label: string; country: string }[];
  districts: { id: string; label: string }[];
  catalogOptions: { subjects: string[]; levels: string[]; languages: string[] };
  update: <K extends keyof ListingState>(key: K, value: ListingState[K], resetPage?: boolean) => void;
  changeCountry: (value: string) => void;
  changeDivision: (value: string) => void;
};

function DirectoryFilterControls({ scope, filters, countries, divisions, cities, districts, catalogOptions, update, changeCountry, changeDivision }: FilterControlsProps) {
  const controlId = (name: string) => getDirectoryFilterControlId(scope, name);
  return <>
    <label className="search-field"><Search size={17}/><input value={filters.query} onChange={(event) => update("query", event.target.value)} placeholder="Search subject or tutor" aria-label="Search subject or tutor"/></label>
    <div className="filter-block"><label htmlFor={controlId("country")}>Country</label><select id={controlId("country")} className="directory-select" value={filters.country} onChange={(event) => changeCountry(event.target.value)}><option value="all">All countries</option>{countries.map(location => <option key={location.id} value={location.label}>{location.label}</option>)}</select></div>
    <div className="filter-block"><label htmlFor={controlId("division")}>Bangladesh division</label><select id={controlId("division")} className="directory-select" value={filters.division} onChange={(event) => changeDivision(event.target.value)} disabled={filters.country !== "all" && filters.country !== "Bangladesh"}><option value="all">All divisions</option>{divisions.map(location => <option key={location.id} value={location.label}>{location.label}</option>)}</select></div>
    <div className="filter-block"><label htmlFor={controlId("city")}>Specific city</label><select id={controlId("city")} className="directory-select" value={filters.city} onChange={(event) => update("city", event.target.value)}><option value="all">All cities</option>{cities.map(location => <option key={location.id} value={location.label}>{location.label} · {location.country}</option>)}</select></div>
    <div className="filter-block"><label htmlFor={controlId("district")}>Bangladesh district</label><select id={controlId("district")} className="directory-select" value={filters.district} onChange={(event) => update("district", event.target.value)} disabled={filters.country !== "all" && filters.country !== "Bangladesh"}><option value="all">All districts</option>{districts.map(location => <option key={location.id} value={location.label}>{location.label}</option>)}</select></div>
    <div className="filter-block"><label>Tuition mode</label><div className="mode-options">{([['all','Any mode'],['home','Home tuition'],['online','Online tuition'],['both','Home + online']] as const).map(([value, label]) => <button type="button" key={value} className={filters.mode === value ? "mode-option active" : "mode-option"} onClick={() => update("mode", value)}><span className="radio-dot"/>{label}</button>)}</div></div>
    <MultiSelect id={controlId("subjects")} label="Subjects" values={filters.subjects} options={catalogOptions.subjects} onChange={values => update("subjects", values)} />
    <MultiSelect id={controlId("class-level")} label="Class / level" values={filters.levels} options={catalogOptions.levels} onChange={values => update("levels", values)} />
    <MultiSelect id={controlId("teaching-language")} label="Teaching language" values={filters.languages} options={catalogOptions.languages} onChange={values => update("languages", values)} />
    <div className="filter-block"><label htmlFor={controlId("gender")}>Tutor gender</label><select id={controlId("gender")} className="directory-select" value={filters.gender} onChange={(event) => update("gender", event.target.value as ListingState["gender"])}><option value="all">Any gender</option><option value="female">Female tutor</option><option value="male">Male tutor</option></select></div>
    <div className="filter-block"><label>Monthly fee range (BDT)</label><div className="grid grid-cols-2 gap-2"><input className="directory-select" type="number" min="0" placeholder="Minimum" value={filters.minFee ?? ""} onChange={(event) => update("minFee", event.target.value ? Number(event.target.value) : undefined)} aria-label="Minimum monthly fee"/><input className="directory-select" type="number" min="0" placeholder="Maximum" value={filters.maxFee ?? ""} onChange={(event) => update("maxFee", event.target.value ? Number(event.target.value) : undefined)} aria-label="Maximum monthly fee"/></div></div>
    <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#244a6a]"><input type="checkbox" checked={filters.verifiedOnly} onChange={(event) => update("verifiedOnly", event.target.checked)}/> Verified profiles only</label>
  </>;
}

export default function TutorListing() {
  const { data: locations = [], isLoading: locationsLoading } = trpc.locations.list.useQuery();
  const [filters, setFilters] = useState<ListingState>(initialFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const listingInput = useMemo(() => ({ ...filters, pageSize: 6 }), [filters]);
  const { data: listing, isLoading: tutorsLoading, isError } = trpc.tutors.listPage.useQuery(listingInput);
  const countries = useMemo(() => locations.filter(location => location.type === "country"), [locations]);
  const selectedCountry = filters.country === "all" ? undefined : filters.country;
  const divisions = useMemo(() => locations.filter(location => location.type === "division" && (!selectedCountry || location.country === selectedCountry)), [locations, selectedCountry]);
  const cities = useMemo(() => locations.filter(location => location.type === "city" && (!selectedCountry || location.country === selectedCountry) && (filters.division === "all" || location.parentId === divisions.find(item => item.label === filters.division)?.id)), [locations, selectedCountry, filters.division, divisions]);
  const districts = useMemo(() => locations.filter(location => location.type === "district" && (!selectedCountry || location.country === selectedCountry) && (filters.division === "all" || location.parentId === divisions.find(item => item.label === filters.division)?.id)), [locations, selectedCountry, filters.division, divisions]);
  const catalogOptions = listing?.facets ?? { subjects: [], levels: [], languages: [] };
  const tutors = listing?.items ?? [];
  const loading = locationsLoading || tutorsLoading;
  const activeFilterChips = useMemo(() => getActiveFilterChips(filters), [filters]);

  const update = <K extends keyof ListingState>(key: K, value: ListingState[K], resetPage = true) => {
    setFilters(current => ({ ...current, [key]: value, ...(resetPage ? { page: 1 } : {}) }));
  };
  const reset = () => setFilters(initialFilters);
  const changeCountry = (value: string) => setFilters(current => ({ ...current, country: value, city: "all", division: "all", district: "all", page: 1 }));
  const changeDivision = (value: string) => setFilters(current => ({ ...current, division: value, city: "all", district: "all", page: 1 }));
  const removeFilter = (key: string) => {
    const [collection, ...valueParts] = key.split(":");
    const value = valueParts.join(":");
    if (["subjects", "levels", "languages"].includes(collection)) {
      const filterKey = collection as "subjects" | "levels" | "languages";
      update(filterKey, filters[filterKey].filter(item => item !== value));
      return;
    }
    if (key === "fee") {
      setFilters(current => ({ ...current, minFee: undefined, maxFee: undefined, page: 1 }));
      return;
    }
    if (key === "verifiedOnly") return update("verifiedOnly", false);
    if (key === "query") return update("query", "");
    if (key === "mode") return update("mode", "all");
    if (key === "gender") return update("gender", "all");
    if (key === "country") return changeCountry("all");
    if (key === "division") return changeDivision("all");
    if (key === "city") return update("city", "all");
    if (key === "district") return update("district", "all");
  };
  const page = listing?.page ?? filters.page;
  const totalPages = listing?.totalPages ?? 0;
  const renderFilterControls = (scope: DirectoryFilterScope) => <DirectoryFilterControls scope={scope} filters={filters} countries={countries} divisions={divisions} cities={cities} districts={districts} catalogOptions={catalogOptions} update={update} changeCountry={changeCountry} changeDivision={changeDivision} />;

  return <div className="site-page"><SiteHeader/><main>
    <section className="directory-hero"><div className="shell directory-hero-inner"><div><p className="eyebrow">Find your learning match</p><h1>Meet a tutor who fits <span>your world.</span></h1><p>Search approved tutor profiles across Bangladesh and selected international cities. Refine by subject, level, teaching mode, budget, language, and verification status.</p></div><div className="directory-hero-art"><Sparkles size={24}/><strong>One thoughtful<br/>connection at a time.</strong></div></div></section>
    <section className="directory-section"><div className="shell"><div className="directory-toolbar"><div><p className="eyebrow">Tutor directory</p><h2>{loading ? "Loading tutors…" : `${listing?.totalItems ?? 0} tutors ready to connect`}</h2></div><button className="filter-reset desktop-filter-reset" onClick={reset} type="button"><X size={15}/> Reset filters</button></div>
      <div className="mobile-directory-controls"><button type="button" className="mobile-filter-trigger" onClick={() => setMobileFiltersOpen(true)}><SlidersHorizontal size={17}/> Filters ({activeFilterChips.length})</button><button className="mobile-clear-all" onClick={reset} type="button" disabled={!activeFilterChips.length}>Clear all</button></div>
      {activeFilterChips.length > 0 && <div className="applied-filter-chips" aria-live="polite"><span>Applied filters</span>{activeFilterChips.map(chip => <button key={chip.key} type="button" onClick={() => removeFilter(chip.key)} aria-label={`Remove ${chip.label} filter`}>{chip.label}<X size={13} aria-hidden="true"/></button>)}</div>}
      <div className="directory-layout">
        <aside className="filter-panel desktop-filter-panel"><div className="filter-heading"><div><SlidersHorizontal size={18}/><strong>Refine your search</strong></div><span>Live filters</span></div>{renderFilterControls("desktop")}</aside>
        <div className="directory-results"><div className="result-note"><span><Filter size={15}/> {isError ? "Unable to load live tutor data" : "Showing approved public profiles"}</span><span>{loading ? "…" : `${listing?.totalItems ?? 0} results`}</span></div>{loading ? <div className="empty-directory"><Search size={24}/><h3>Loading tutors from Connect Tutors BD</h3><p>We are fetching the latest profiles and locations.</p></div> : tutors.length ? <><div className="tutor-grid">{tutors.map(tutor => <article className="tutor-card" key={tutor.id}><div className="tutor-avatar" style={{background:tutor.accent}}>{tutor.initials}</div><div className="tutor-card-body"><div className="tutor-name-row"><h3>{tutor.name}</h3>{tutor.verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700" aria-label="Verified tutor profile"><CheckCircle2 size={14} aria-hidden="true"/> Verified</span>}</div><p className="tutor-headline">{tutor.headline}</p><div className="tutor-meta"><span><MapPin size={14}/>{tutor.locationLabel}</span><span>{tutor.experience} yrs experience</span></div><div className="tutor-tags">{tutor.subjects.slice(0,2).map(subject => <span key={subject}>{subject}</span>)}<span>{modeLabel(tutor.mode)}</span></div><div className="tutor-card-footer"><strong>৳{tutor.fee.toLocaleString()}<small>/month</small></strong><Link href={`/tutors/${tutor.id}`} className="text-action">View profile <span>→</span></Link></div></div></article>)}</div><nav className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="Tutor listing pagination"><button type="button" className="filter-reset" onClick={() => update("page", Math.max(1, page - 1), false)} disabled={page <= 1}><ChevronLeft size={16}/> Previous</button><span className="text-sm font-semibold text-j-ink-soft">Page {page} of {totalPages}</span><button type="button" className="filter-reset" onClick={() => update("page", Math.min(totalPages, page + 1), false)} disabled={page >= totalPages}><ChevronRight size={16}/> Next</button></nav></> : <div className="empty-directory"><Search size={24}/><h3>No tutors match these filters yet</h3><p>Try another location or reset your filters.</p><button type="button" className="button-primary" onClick={reset}>Show all tutors</button></div>}</div>
      </div>
    </div></section>
    <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}><SheetContent side="bottom" className="mobile-filter-sheet"><SheetHeader className="mobile-filter-sheet-heading"><SheetTitle>Refine your tutor search</SheetTitle><SheetDescription>Filters update the same live directory results as you choose them.</SheetDescription></SheetHeader><div className="mobile-filter-sheet-body">{renderFilterControls("mobile")}</div><SheetFooter className="mobile-filter-sheet-footer"><button className="filter-reset" onClick={reset} type="button"><X size={15}/> Clear all</button><SheetClose asChild><button className="button-primary" type="button">Show {listing?.totalItems ?? 0} results</button></SheetClose></SheetFooter></SheetContent></Sheet>
  </main><SiteFooter/></div>;
}
