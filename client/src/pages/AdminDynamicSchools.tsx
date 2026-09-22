import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import StatusTabRow from "@/components/StatusTabRow";
import { TutorListPager } from "@/components/TutorListPager";
import { trpc } from "@/lib/trpc";
import { SCHOOL_NAME_MAX, schoolCollegeDivisionLabels, schoolCollegeDivisionValues, type SchoolCollegeDivision } from "@shared/school-colleges";
import { Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type View = "shared" | "created";
type Row = {
  id: number;
  name: string;
  division: string | null;
  active: boolean;
  createdAt: string | Date;
  tutorName: string | null;
  tutorId: string | null;
  tutorNumber: string | number | null;
};

const inputClass = "h-8 w-full min-w-0 rounded-lg border border-j-border bg-white px-2 text-sm text-j-ink-strong outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100";
const selectClass = "h-8 rounded-lg border border-j-border bg-white px-2 text-sm text-j-ink-strong";
const buttonClass = "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-j-accent px-3 text-xs font-bold text-white hover:bg-j-accent-hover disabled:opacity-40";

function DivisionSelect({ value, onChange, label, withAll = false }: { value: string; onChange: (value: string) => void; label: string; withAll?: boolean }) {
  return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className={selectClass}>
    {withAll ? <option value="all">All divisions</option> : null}
    {!withAll && !value ? <option value="">Division</option> : null}
    {schoolCollegeDivisionValues.map(division => <option key={division} value={division}>{schoolCollegeDivisionLabels[division]}</option>)}
  </select>;
}

/** One shared row: rename, move or hide it, and Save when something changed. */
function SharedRow({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const [name, setName] = useState(row.name);
  const [division, setDivision] = useState(row.division ?? "dhaka");
  const [active, setActive] = useState(row.active);
  useEffect(() => { setName(row.name); setDivision(row.division ?? "dhaka"); setActive(row.active); }, [row.name, row.division, row.active]);
  const update = trpc.schoolColleges.update.useMutation({ onSuccess: () => { toast.success("Saved."); onSaved(); }, onError: error => toast.error(error.message) });
  const dirty = name.trim() !== row.name || division !== row.division || active !== row.active;
  return <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-j-border py-1.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_9rem_auto_auto]">
    <input aria-label={`Name: ${row.name}`} value={name} maxLength={SCHOOL_NAME_MAX} onChange={event => setName(event.target.value)} className={`${inputClass} col-span-2 sm:col-span-1 ${active ? "" : "text-j-ink-faint line-through"}`} />
    <DivisionSelect label={`Division: ${row.name}`} value={division} onChange={setDivision} />
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-j-ink-soft"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} className="h-3.5 w-3.5 accent-j-accent" />Shown</label>
    <button type="button" disabled={!dirty || update.isPending || name.trim().length < 3} onClick={() => update.mutate({ id: row.id, name: name.trim(), division: division as SchoolCollegeDivision, active })} className={buttonClass}>Save</button>
  </li>;
}

/** One name a Tutor created: who, when, and Add to list in a chosen division. */
function CreatedRow({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const [division, setDivision] = useState("");
  const promote = trpc.schoolColleges.promote.useMutation({
    onSuccess: result => { toast.success(result.outcome === "already_listed" ? "Already on the list." : "Added to the list."); onSaved(); },
    onError: error => toast.error(error.message),
  });
  return <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-j-border py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_14rem_9rem_auto]">
    <span className="col-span-2 min-w-0 break-words text-sm font-semibold text-j-ink sm:col-span-1">{row.name}</span>
    <span className="col-span-2 min-w-0 text-xs text-j-ink-soft sm:col-span-1">
      {row.tutorId ? <Link href={`/admin/tutor-profiles/${row.tutorId}`} className="font-bold text-j-accent hover:underline">{row.tutorName ?? "Tutor"}</Link> : row.tutorName ?? "Tutor"}
      {row.tutorNumber ? <span className="tabular-nums"> · Tutor ID {row.tutorNumber}</span> : null}
    </span>
    <DivisionSelect label={`Division for ${row.name}`} value={division} onChange={setDivision} />
    <button type="button" disabled={!division || promote.isPending} onClick={() => promote.mutate({ id: row.id, division: division as SchoolCollegeDivision })} className={buttonClass}>Add to list</button>
  </li>;
}

/**
 * The school and college list Tutors pick from for Secondary and Higher
 * Secondary, and the names Tutors created that nobody else sees yet.
 */
export function SchoolCollegeManager() {
  const [view, setView] = useState<View>("shared");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [newName, setNewName] = useState("");
  const [newDivision, setNewDivision] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(queryInput.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  const utils = trpc.useUtils();
  const list = trpc.schoolColleges.list.useQuery({ view, query, division: division as "all" | SchoolCollegeDivision, page, pageSize });
  const refresh = () => { void utils.schoolColleges.list.invalidate(); };
  const add = trpc.schoolColleges.add.useMutation({
    onSuccess: () => { toast.success("Added."); setNewName(""); refresh(); },
    onError: error => toast.error(error.message),
  });
  const rows = (list.data?.rows ?? []) as Row[];
  const lastPage = Math.max(1, Math.ceil((list.data?.total ?? 0) / (list.data?.pageSize ?? pageSize)));

  return <div className="space-y-4">
    <StatusTabRow
      label="Schools and colleges"
      items={[{ key: "shared" as const, label: "On the list", count: list.data?.counts.shared }, { key: "created" as const, label: "Created by Tutors", count: list.data?.counts.created }]}
      selected={view}
      onSelect={key => { setView(key ?? "shared"); setPage(1); }}
    />
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-[14rem] flex-1">
        <span className="sr-only">Search names</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-j-ink-faint" />
        <input value={queryInput} onChange={event => setQueryInput(event.target.value)} placeholder="Search names" className={`${inputClass} pl-8`} />
      </label>
      {view === "shared" ? <DivisionSelect label="Division filter" value={division} withAll onChange={value => { setDivision(value); setPage(1); }} /> : null}
    </div>
    {view === "shared" ? <form className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-j-field-border p-2.5" onSubmit={event => {
      event.preventDefault();
      add.mutate({ name: newName.trim(), division: newDivision as SchoolCollegeDivision });
    }}>
      <input aria-label="New school or college" value={newName} maxLength={SCHOOL_NAME_MAX} onChange={event => setNewName(event.target.value)} placeholder="New school or college" className={`${inputClass} min-w-[14rem] flex-1`} />
      <DivisionSelect label="Division for the new name" value={newDivision} onChange={setNewDivision} />
      <button type="submit" disabled={newName.trim().length < 3 || !newDivision || add.isPending} className={buttonClass}><Plus size={14} /> Add</button>
    </form> : null}

    {list.isLoading ? <div className="flex min-h-32 items-center justify-center text-sm text-j-ink-soft"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div> : null}
    {list.isError ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{list.error.message}</p> : null}
    {list.data ? rows.length === 0
      ? <p className="rounded-xl bg-j-surface-sunken p-6 text-center text-sm text-j-ink-soft">{view === "shared" ? "No name matches." : "No Tutor has created a name."}</p>
      : <ul aria-label={view === "shared" ? "Names on the list" : "Names created by Tutors"} className="rounded-xl border border-j-border bg-white px-3">
        {rows.map(row => view === "shared" ? <SharedRow key={row.id} row={row} onSaved={refresh} /> : <CreatedRow key={row.id} row={row} onSaved={refresh} />)}
      </ul> : null}

    <TutorListPager
      page={page}
      totalPages={lastPage}
      onPage={setPage}
      label="Name pages"
      pageSize={pageSize}
      pageSizeOptions={[20, 50, 100]}
      onPageSize={next => { setPageSize(next); setPage(1); }}
      totalItems={list.data?.total}
    />
  </div>;
}

export default function AdminDynamicSchools() {
  return <AdminDynamicSectionPage title="Schools & colleges"><SchoolCollegeManager /></AdminDynamicSectionPage>;
}
