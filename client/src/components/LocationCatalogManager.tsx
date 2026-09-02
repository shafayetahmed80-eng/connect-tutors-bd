import { trpc } from "@/lib/trpc";
import {
  LOCATION_PAGE_SIZE,
  MAX_LOCATION_LABEL_LENGTH,
  cannotSitInsideMessage,
  childTypesFor,
  isValidChildType,
  locationTypeLabels,
  type LocationType,
} from "@shared/location-catalog";
import {
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Move,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const inputClass = "h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100";
const iconButtonClass = "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 disabled:opacity-30";
const checkboxClass = "h-3.5 w-3.5 shrink-0 accent-[#116fc4]";

type Row = {
  id: string;
  label: string;
  type: string;
  active: boolean;
  origin: string;
  usageCount: number;
  childCount: number;
  path?: string[];
};

/**
 * Owner-facing editor for City & Location.
 *
 * The other catalogs are lists; this one is a tree, and that changes the whole
 * screen. A Guardian picks a city and then an area inside it, so an area with
 * no parent is an area nobody can reach - which is why adding one starts by
 * opening the place it belongs to rather than by typing a name into a box.
 *
 * Two ways in, because they answer different questions. Browsing answers
 * "what is inside Dhaka"; searching answers "where is Mirpur", and shows the
 * path to each hit, which is the only thing telling one "Bazar" from another.
 */
export default function LocationCatalogManager() {
  const [parentId, setParentId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<LocationType | "">("");
  const [drafts, setDrafts] = useState<Record<string, { label: string; active: boolean }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  // The place picked up for moving, held while the Owner navigates to where it
  // belongs. Cut and paste rather than a dropdown of 597 destinations: the
  // breadcrumb is already how you find a place, so it may as well be how you
  // choose one.
  const [moving, setMoving] = useState<{ id: string; label: string; type: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Typing should not fire a query per keystroke; the server does the filtering.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const searching = searchTerm.length > 0;
  const utils = trpc.useUtils();
  const browse = trpc.locationCatalog.browse.useQuery({ parentId, query: "", page }, { enabled: !searching });
  const search = trpc.locationCatalog.search.useQuery({ query: searchTerm, page }, { enabled: searching });
  const active = searching ? search : browse;

  const rows = useMemo<Row[]>(() => (active.data?.rows ?? []) as Row[], [active.data]);
  const total = active.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / LOCATION_PAGE_SIZE));
  const trail = (browse.data?.trail ?? []) as Array<{ id: string; label: string }>;
  const parentType = (browse.data?.parentType ?? null) as LocationType | null;
  const addableTypes = parentType ? childTypesFor(parentType) : [];

  // Re-seed on content, not array identity, so a refetch cannot wipe typing.
  const savedKey = JSON.stringify(rows.map(row => [row.id, row.label, row.active]));
  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map(row => [row.id, { label: row.label, active: row.active }])));
    setSelected(current => new Set(Array.from(current).filter(id => rows.some(row => row.id === id))));
    setConfirmBulkDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents, see above
  }, [savedKey]);

  useEffect(() => {
    if (addableTypes.length > 0 && !addableTypes.includes(newType as LocationType)) setNewType(addableTypes[0]);
    if (addableTypes.length === 0 && newType !== "") setNewType("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follows the open place
  }, [parentType]);

  const isDirty = (row: Row) => {
    const draft = drafts[row.id];
    return Boolean(draft) && (draft.label.trim() !== row.label || draft.active !== row.active);
  };
  const dirtyRows = rows.filter(isDirty);

  const create = trpc.locationCatalog.create.useMutation();
  const update = trpc.locationCatalog.update.useMutation();
  const remove = trpc.locationCatalog.remove.useMutation();
  const move = trpc.locationCatalog.move.useMutation();

  const refresh = async () => {
    await utils.locationCatalog.browse.invalidate();
    await utils.locationCatalog.search.invalidate();
  };

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Whether the place being carried can be dropped where the Owner is standing.
   *
   * The server checks all of this again; refusing here only means the button
   * can say why before the click rather than after it.
   */
  const moveBlockedBecause = (): string | null => {
    if (!moving) return null;
    if (parentId === null) return "The country cannot hold a place directly.";
    if (parentId === moving.id) return `"${moving.label}" cannot be moved inside itself.`;
    if (trail.some(step => step.id === moving.id)) return `This is inside "${moving.label}".`;
    if (rows.some(row => row.id === moving.id)) return `"${moving.label}" is already here.`;
    if (!parentType) return null;
    if (!isValidChildType(parentType, moving.type as LocationType)) {
      return cannotSitInsideMessage(moving.type as LocationType, parentType);
    }
    return null;
  };

  const dropHere = () => {
    if (!moving || !parentId) return;
    void run(async () => {
      await move.mutateAsync({ id: moving.id, newParentId: parentId });
      setMoving(null);
    }, "The place could not be moved.");
  };

  const openPlace = (id: string | null) => {
    setParentId(id);
    setPage(1);
    setSearchInput("");
    setSearchTerm("");
    setSelected(new Set());
    setConfirmBulkDelete(false);
    setError(null);
  };

  const saveAll = () => run(async () => {
    for (const row of dirtyRows) {
      const draft = drafts[row.id];
      await update.mutateAsync({ id: row.id, label: draft.label.trim(), active: draft.active });
    }
  }, "The changes could not be saved.");

  const addPlace = () => {
    const label = newLabel.trim();
    if (!label || !newType || !parentId) return;
    void run(async () => {
      await create.mutateAsync({ parentId, type: newType, label });
      setNewLabel("");
    }, "The place could not be added.");
  };

  const selectedRows = rows.filter(row => selected.has(row.id));
  // The same three rules as the per-row button: a shipped row returns on the
  // next deploy, a row in use belongs to a real profile, and a row with places
  // inside it would strand them.
  const canDelete = (row: Row) => row.usageCount === 0 && row.childCount === 0 && row.origin === "admin";
  const deletableSelected = selectedRows.filter(canDelete);

  const setActiveForSelected = (nextActive: boolean) => run(async () => {
    for (const row of selectedRows) {
      if (row.active === nextActive) continue;
      await update.mutateAsync({ id: row.id, label: drafts[row.id]?.label.trim() || row.label, active: nextActive });
    }
    setSelected(new Set());
  }, nextActive ? "The places could not be shown." : "The places could not be hidden.");

  const deleteSelected = () => run(async () => {
    for (const row of deletableSelected) await remove.mutateAsync({ id: row.id });
    setSelected(new Set());
    setConfirmBulkDelete(false);
  }, "The places could not be deleted.");

  const deleteReason = (row: Row) => {
    if (row.childCount > 0) return `${row.childCount} place${row.childCount === 1 ? "" : "s"} sit inside this one`;
    if (row.usageCount > 0) return "In use — hide it instead";
    if (row.origin === "seed") return "A built-in place can be hidden but not deleted";
    return "Delete";
  };

  const allOnPageSelected = rows.length > 0 && rows.every(row => selected.has(row.id));
  const here = trail.length > 0 ? trail[trail.length - 1].label : "Bangladesh";

  return <div className="space-y-3">
    <p className="text-[12px] leading-5 text-slate-600">
      Used by <span className="font-bold text-slate-800">registration, Request a tutor and the Job Board</span>. Places sit inside one another, so open a city to reach its areas. Hiding one keeps every profile that already chose it but stops it being offered on new forms.
    </p>

    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search every place</span>
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search every place" className={`${inputClass} pl-7`} />
      </label>
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={allOnPageSelected}
          aria-label="Select every row on this page"
          onChange={event => {
            const on = event.target.checked;
            setSelected(current => {
              const next = new Set(current);
              for (const row of rows) { if (on) next.add(row.id); else next.delete(row.id); }
              return next;
            });
            setConfirmBulkDelete(false);
          }}
        />
        Page
      </label>
      <span className="text-xs font-bold text-slate-500">{active.isFetching ? "Searching…" : `${total} found`}</span>
      <button type="button" disabled={busy || dirtyRows.length === 0} onClick={() => void saveAll()} className="h-8 rounded-md bg-[#116fc4] px-3 text-[13px] font-bold text-white disabled:opacity-40">
        {busy ? "Saving…" : dirtyRows.length > 0 ? `Save ${dirtyRows.length} change${dirtyRows.length === 1 ? "" : "s"}` : "Saved"}
      </button>
    </div>

    {searching
      ? <p className="text-[12px] font-bold text-slate-500">Searching every place. <button type="button" onClick={() => openPlace(parentId)} className="text-[#116fc4] underline">Back to {here}</button></p>
      : <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[13px]">
        <button type="button" onClick={() => openPlace(null)} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <Home className="h-3.5 w-3.5" /> All
        </button>
        {trail.map((step, index) => <span key={step.id} className="flex items-center gap-1">
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={() => openPlace(step.id)}
            disabled={index === trail.length - 1}
            className={`rounded-md px-1.5 py-0.5 font-bold ${index === trail.length - 1 ? "text-slate-800" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
          >{step.label}</button>
        </span>)}
      </nav>}

    {moving ? <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-2">
      <Move className="h-4 w-4 shrink-0 text-amber-700" />
      <span className="text-[13px] text-amber-900">
        Carrying <span className="font-bold">{moving.label}</span>. Open the place it belongs in, then drop it there.
      </span>
      <span className="flex-1" />
      {moveBlockedBecause()
        ? <span className="text-[12px] font-bold text-amber-800">{moveBlockedBecause()}</span>
        : null}
      <button
        type="button"
        disabled={busy || moveBlockedBecause() !== null}
        onClick={dropHere}
        className="h-8 rounded-md bg-amber-600 px-3 text-[13px] font-bold text-white disabled:opacity-40"
      >{busy ? "Moving…" : `Drop into ${here}`}</button>
      <button type="button" onClick={() => setMoving(null)} className="h-8 rounded-md px-2 text-[13px] font-medium text-amber-800 hover:text-amber-950">Cancel</button>
    </div> : null}

    {selected.size > 0 ? <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#116fc4]/30 bg-[#f2f9ff] p-2">
      <span className="text-[13px] font-bold text-[#0f4666]">{selected.size} selected</span>
      <button type="button" disabled={busy} onClick={() => void setActiveForSelected(false)} className="flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-bold text-slate-700 disabled:opacity-40"><EyeOff size={13} /> Hide</button>
      <button type="button" disabled={busy} onClick={() => void setActiveForSelected(true)} className="flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-bold text-slate-700 disabled:opacity-40"><Eye size={13} /> Show</button>
      <button
        type="button"
        disabled={busy || deletableSelected.length === 0}
        onClick={() => { if (!confirmBulkDelete) { setConfirmBulkDelete(true); return; } void deleteSelected(); }}
        className={`flex h-8 items-center gap-1 rounded-md border px-3 text-[13px] font-bold disabled:opacity-40 ${confirmBulkDelete ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-700"}`}
        title={deletableSelected.length < selected.size ? "Built-in places, places in use and places with others inside can only be hidden" : undefined}
      ><Trash2 size={13} /> {confirmBulkDelete ? `Confirm deleting ${deletableSelected.length}` : `Delete ${deletableSelected.length}`}</button>
      <button type="button" onClick={() => { setSelected(new Set()); setConfirmBulkDelete(false); }} className="h-8 rounded-md px-2 text-[13px] font-medium text-slate-500 hover:text-slate-800">Clear</button>
    </div> : null}

    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

    {!searching && parentId && addableTypes.length > 0 ? <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <label htmlFor="new-place-label" className="sr-only">Add a place inside {here}</label>
      <input
        id="new-place-label"
        value={newLabel}
        maxLength={MAX_LOCATION_LABEL_LENGTH}
        placeholder={`Add a place inside ${here}`}
        onChange={event => setNewLabel(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addPlace(); } }}
        className={`${inputClass} min-w-0 flex-1`}
      />
      <label className="sr-only" htmlFor="new-place-type">Kind of place</label>
      <select
        id="new-place-type"
        value={newType}
        onChange={event => setNewType(event.target.value as LocationType)}
        className={`${inputClass} w-auto`}
      >
        {addableTypes.map(type => <option key={type} value={type}>{locationTypeLabels[type]}</option>)}
      </select>
      <button type="button" disabled={busy || newLabel.trim().length === 0} onClick={addPlace} className="flex h-8 items-center gap-1 rounded-md bg-slate-900 px-3 text-[13px] font-bold text-white disabled:opacity-40">
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </div> : null}

    {!searching && !parentId ? <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
      Open a place to add anything inside it. The country itself is fixed.
    </p> : null}

    {active.isLoading
      ? <div className="flex min-h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading places…</div>
      : active.isError
      ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">This list could not be loaded.</div>
      : <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {rows.length === 0
          ? <p className="py-6 text-center text-sm text-slate-500">{searching ? "Nothing matches that search." : `There is nothing inside ${here} yet.`}</p>
          : rows.map(row => {
            const draft = drafts[row.id] ?? { label: row.label, active: row.active };
            return <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-50 py-1 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
              <div className="flex min-w-0 items-center gap-1.5">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={selected.has(row.id)}
                  aria-label={`Select ${row.label}`}
                  onChange={event => setSelected(current => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(row.id); else next.delete(row.id);
                    return next;
                  })}
                />
                <label htmlFor={`place-${row.id}`} className="sr-only">{row.label}</label>
                <input
                  id={`place-${row.id}`}
                  value={draft.label}
                  maxLength={MAX_LOCATION_LABEL_LENGTH}
                  onChange={event => setDrafts(current => ({ ...current, [row.id]: { ...draft, label: event.target.value } }))}
                  className={`${inputClass} ${draft.active ? "" : "text-slate-400 line-through"}`}
                />
                {isDirty(row) ? <span className="text-[#116fc4]" aria-label="unsaved">•</span> : null}
              </div>

              <div className="hidden min-w-0 flex-col sm:flex">
                <span className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {locationTypeLabels[row.type as LocationType] ?? row.type}
                </span>
                {row.path && row.path.length > 0
                  ? <span className="truncate text-[11px] text-slate-400" title={row.path.join(" / ")}>{row.path.join(" / ")}</span>
                  : row.usageCount > 0
                  ? <span className="text-[11px] text-slate-400">{row.usageCount} used</span>
                  : null}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={busy || row.childCount === 0}
                  onClick={() => openPlace(row.id)}
                  className={iconButtonClass}
                  aria-label={`Open ${row.label}`}
                  title={row.childCount > 0 ? `${row.childCount} inside` : "Nothing inside"}
                ><CornerDownRight className="h-3.5 w-3.5" /></button>
                <button
                  type="button"
                  disabled={busy || moving?.id === row.id}
                  onClick={() => { setMoving({ id: row.id, label: row.label, type: row.type }); setError(null); }}
                  className={iconButtonClass}
                  aria-label={`Move ${row.label}`}
                  title="Pick this up, then open where it belongs"
                ><Move className="h-3.5 w-3.5" /></button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDrafts(current => ({ ...current, [row.id]: { ...draft, active: !draft.active } }))}
                  className={iconButtonClass}
                  aria-label={draft.active ? `Hide ${row.label}` : `Show ${row.label}`}
                  title={draft.active ? "Hide from the forms" : "Show on the forms"}
                >{draft.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-amber-600" />}</button>
                <button
                  type="button"
                  disabled={busy || !canDelete(row)}
                  onClick={() => void run(() => remove.mutateAsync({ id: row.id }), "The place could not be deleted.")}
                  className={iconButtonClass}
                  aria-label={`Delete ${row.label}`}
                  title={deleteReason(row)}
                ><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>;
          })}

        {total > LOCATION_PAGE_SIZE ? <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <button type="button" disabled={page <= 1 || active.isFetching} onClick={() => setPage(current => Math.max(1, current - 1))} className="flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-[13px] font-bold text-slate-700 disabled:opacity-30">
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-[12px] font-bold text-slate-500">Page {page} of {lastPage}</span>
          <button type="button" disabled={page >= lastPage || active.isFetching} onClick={() => setPage(current => Math.min(lastPage, current + 1))} className="flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-[13px] font-bold text-slate-700 disabled:opacity-30">
            Next <ChevronRight size={14} />
          </button>
        </div> : null}
      </section>}
  </div>;
}
