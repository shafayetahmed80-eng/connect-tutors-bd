import { trpc } from "@/lib/trpc";
import {
  LARGE_CATALOG_PAGE_SIZE,
  MAX_LARGE_CATALOG_NAME_LENGTH,
  largeCatalogs,
  type LargeCatalogId,
} from "@shared/option-catalogs";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const inputClass = "h-8 w-full min-w-0 rounded-lg border border-j-border bg-white px-2 text-sm text-j-ink-strong outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100";
const iconButtonClass = "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-j-border text-j-ink-muted hover:border-j-field-border hover:text-j-ink-strong disabled:opacity-30";
const checkboxClass = "h-3.5 w-3.5 shrink-0 accent-j-accent";
const rowClass = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-j-border py-1 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_5rem_auto]";

type Entry = { id: number; name: string; active: boolean; origin: string; usageCount: number };

/**
 * Owner-facing editor for the two large catalogs: Institutes, and the
 * Department / subject vocabulary.
 *
 * Unlike the five small lists next door, these are searched and paged on the
 * server — 300-odd rows are neither quick to send nor usable as one list — and
 * they offer no manual ordering, because dragging a row through three hundred
 * is no way to arrange anything. They read alphabetically; search is how a row
 * is found.
 */
export default function LargeCatalogManager() {
  const [catalog, setCatalog] = useState<LargeCatalogId>("institutes");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<number, { name: string; active: boolean }>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Typing should not fire a query per keystroke; the server is doing the
  // filtering now, not the browser.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  const utils = trpc.useUtils();
  const results = trpc.optionCatalogs.searchLarge.useQuery({ catalog, query, page });
  const meta = largeCatalogs.find(item => item.id === catalog)!;

  const rows = useMemo<Entry[]>(() => (results.data?.rows ?? []) as Entry[], [results.data]);
  const total = results.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / LARGE_CATALOG_PAGE_SIZE));

  // Re-seed on content, not array identity, so a refetch cannot wipe typing.
  const savedKey = JSON.stringify(rows.map(row => [row.id, row.name, row.active]));
  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map(row => [row.id, { name: row.name, active: row.active }])));
    setSelected(current => new Set(Array.from(current).filter(id => rows.some(row => row.id === id))));
    setConfirmBulkDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents, see above
  }, [savedKey]);

  const isDirty = (row: Entry) => {
    const draft = drafts[row.id];
    return Boolean(draft) && (draft.name.trim() !== row.name || draft.active !== row.active);
  };
  const dirtyRows = rows.filter(isDirty);

  const create = trpc.optionCatalogs.createLarge.useMutation();
  const update = trpc.optionCatalogs.updateLarge.useMutation();
  const remove = trpc.optionCatalogs.removeLarge.useMutation();

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await utils.optionCatalogs.searchLarge.invalidate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const saveAll = () => run(async () => {
    for (const row of dirtyRows) {
      const draft = drafts[row.id];
      await update.mutateAsync({ catalog, id: row.id, name: draft.name.trim(), active: draft.active });
    }
  }, "The changes could not be saved.");

  const addEntry = () => {
    const name = newName.trim();
    if (!name) return;
    void run(async () => {
      await create.mutateAsync({ catalog, name });
      setNewName("");
    }, `The ${meta.itemLabel} could not be added.`);
  };

  const selectedRows = rows.filter(row => selected.has(row.id));
  // The same two rules as the per-row button: a built-in comes back on the next
  // deploy, and a row in use belongs to a real profile.
  const deletableSelected = selectedRows.filter(row => row.usageCount === 0 && row.origin === "admin");

  const setActiveForSelected = (active: boolean) => run(async () => {
    for (const row of selectedRows) {
      if (row.active === active) continue;
      await update.mutateAsync({ catalog, id: row.id, name: drafts[row.id]?.name.trim() || row.name, active });
    }
    setSelected(new Set());
  }, active ? "The rows could not be shown." : "The rows could not be hidden.");

  const deleteSelected = () => run(async () => {
    for (const row of deletableSelected) await remove.mutateAsync({ catalog, id: row.id });
    setSelected(new Set());
    setConfirmBulkDelete(false);
  }, "The rows could not be deleted.");

  const switchCatalog = (next: LargeCatalogId) => {
    // Row ids belong to one catalog; carrying a selection across would point at
    // unrelated rows in the other.
    setCatalog(next);
    setQueryInput("");
    setQuery("");
    setPage(1);
    setSelected(new Set());
    setConfirmBulkDelete(false);
    setError(null);
  };

  const allOnPageSelected = rows.length > 0 && rows.every(row => selected.has(row.id));

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Large catalogs">
      {largeCatalogs.map(item => <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={item.id === catalog}
        onClick={() => switchCatalog(item.id)}
        className={`h-8 rounded-lg px-3 text-sm font-bold ${item.id === catalog ? "bg-j-accent text-white" : "border border-j-border bg-white text-j-ink-soft hover:border-j-field-border"}`}
      >{item.label}</button>)}
    </div>

    <p className="text-xs leading-5 text-j-ink-soft">
      Used by <span className="font-bold text-j-ink-strong">{meta.usedFor}</span>. This list is searched on the server and shown a page at a time, so type to find a row rather than scrolling. Hiding one keeps every existing selection intact but stops it being offered on new forms.
    </p>

    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-j-border bg-white/95 p-2 shadow-sm backdrop-blur">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search {meta.label}</span>
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-j-ink-faint" />
        <input value={queryInput} onChange={event => setQueryInput(event.target.value)} placeholder={`Search ${meta.label.toLowerCase()}`} className={`${inputClass} pl-7`} />
      </label>
      <label className="flex items-center gap-1.5 text-xs font-bold text-j-ink-muted">
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
      <span className="text-xs font-bold text-j-ink-muted">{results.isFetching ? "Searching…" : `${total} found`}</span>
      <button type="button" disabled={busy || dirtyRows.length === 0} onClick={() => void saveAll()} className="h-8 rounded-lg bg-j-accent px-3 text-sm font-bold text-white disabled:opacity-40">
        {busy ? "Saving…" : dirtyRows.length > 0 ? `Save ${dirtyRows.length} change${dirtyRows.length === 1 ? "" : "s"}` : "Saved"}
      </button>
    </div>

    {selected.size > 0 ? <div className="flex flex-wrap items-center gap-2 rounded-xl border border-j-accent/30 bg-[#f2f9ff] p-2">
      <span className="text-sm font-bold text-[#0f4666]">{selected.size} selected</span>
      <button type="button" disabled={busy} onClick={() => void setActiveForSelected(false)} className="flex h-8 items-center gap-1 rounded-lg border border-j-field-border bg-white px-3 text-sm font-bold text-j-ink-soft disabled:opacity-40"><EyeOff size={13} /> Hide</button>
      <button type="button" disabled={busy} onClick={() => void setActiveForSelected(true)} className="flex h-8 items-center gap-1 rounded-lg border border-j-field-border bg-white px-3 text-sm font-bold text-j-ink-soft disabled:opacity-40"><Eye size={13} /> Show</button>
      <button
        type="button"
        disabled={busy || deletableSelected.length === 0}
        onClick={() => { if (!confirmBulkDelete) { setConfirmBulkDelete(true); return; } void deleteSelected(); }}
        className={`flex h-8 items-center gap-1 rounded-lg border px-3 text-sm font-bold disabled:opacity-40 ${confirmBulkDelete ? "border-red-300 bg-red-50 text-red-700" : "border-j-field-border bg-white text-j-ink-soft"}`}
        title={deletableSelected.length < selected.size ? "Built-in rows and rows in use can only be hidden" : undefined}
      ><Trash2 size={13} /> {confirmBulkDelete ? `Confirm deleting ${deletableSelected.length}` : `Delete ${deletableSelected.length}`}</button>
      <button type="button" onClick={() => { setSelected(new Set()); setConfirmBulkDelete(false); }} className="h-8 rounded-lg px-2 text-sm font-medium text-j-ink-muted hover:text-j-ink-strong">Clear</button>
    </div> : null}

    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-j-border bg-white p-2 shadow-sm">
      <label htmlFor="new-large-entry" className="sr-only">Add {meta.itemLabel}</label>
      <input
        id="new-large-entry"
        value={newName}
        maxLength={MAX_LARGE_CATALOG_NAME_LENGTH}
        placeholder={`Add a ${meta.itemLabel}`}
        onChange={event => setNewName(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addEntry(); } }}
        className={`${inputClass} min-w-0 flex-1`}
      />
      <button type="button" disabled={busy || newName.trim().length === 0} onClick={addEntry} className="flex h-8 items-center gap-1 rounded-lg bg-j-ink px-3 text-sm font-bold text-white disabled:opacity-40">
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </div>

    {results.isLoading
      ? <div className="flex min-h-32 items-center justify-center rounded-xl border border-j-border bg-white text-sm text-j-ink-soft"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading {meta.label.toLowerCase()}…</div>
      : results.isError
      ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">This list could not be loaded.</div>
      : <section className="rounded-xl border border-j-border bg-white p-3 shadow-sm">
        {rows.length === 0
          ? <p className="py-6 text-center text-sm text-j-ink-muted">{query ? "Nothing matches that search." : "This list is empty."}</p>
          : rows.map(row => {
            const draft = drafts[row.id] ?? { name: row.name, active: row.active };
            const canDelete = row.usageCount === 0 && row.origin === "admin";
            return <div key={row.id} className={rowClass}>
              <div className="flex min-w-0 items-center gap-1.5">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={selected.has(row.id)}
                  aria-label={`Select ${row.name}`}
                  onChange={event => setSelected(current => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(row.id); else next.delete(row.id);
                    return next;
                  })}
                />
                <label htmlFor={`large-${row.id}`} className="sr-only">{row.name}</label>
                <input
                  id={`large-${row.id}`}
                  value={draft.name}
                  maxLength={MAX_LARGE_CATALOG_NAME_LENGTH}
                  onChange={event => setDrafts(current => ({ ...current, [row.id]: { ...draft, name: event.target.value } }))}
                  className={`${inputClass} ${draft.active ? "" : "text-j-ink-faint line-through"}`}
                />
                {isDirty(row) ? <span className="text-j-accent" aria-label="unsaved">•</span> : null}
              </div>

              <span className="hidden text-2xs font-bold uppercase tracking-wide text-j-ink-faint sm:block" title={`${row.usageCount} record${row.usageCount === 1 ? "" : "s"} use this`}>
                {row.usageCount > 0 ? `${row.usageCount} used` : row.origin === "admin" ? "Added" : "—"}
              </span>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDrafts(current => ({ ...current, [row.id]: { ...draft, active: !draft.active } }))}
                  className={iconButtonClass}
                  aria-label={draft.active ? `Hide ${row.name}` : `Show ${row.name}`}
                  title={draft.active ? "Hide from the forms" : "Show on the forms"}
                >{draft.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-amber-600" />}</button>
                <button
                  type="button"
                  disabled={busy || !canDelete}
                  onClick={() => void run(() => remove.mutateAsync({ catalog, id: row.id }), "The row could not be deleted.")}
                  className={iconButtonClass}
                  aria-label={`Delete ${row.name}`}
                  title={row.usageCount > 0 ? "In use — hide it instead" : row.origin === "seed" ? "A built-in row can be hidden but not deleted" : "Delete"}
                ><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>;
          })}

        {total > LARGE_CATALOG_PAGE_SIZE ? <div className="mt-3 flex items-center justify-between gap-2 border-t border-j-border pt-2">
          <button type="button" disabled={page <= 1 || results.isFetching} onClick={() => setPage(current => Math.max(1, current - 1))} className="flex h-8 items-center gap-1 rounded-lg border border-j-border px-2.5 text-sm font-bold text-j-ink-soft disabled:opacity-30">
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-xs font-bold text-j-ink-muted">Page {page} of {lastPage}</span>
          <button type="button" disabled={page >= lastPage || results.isFetching} onClick={() => setPage(current => Math.min(lastPage, current + 1))} className="flex h-8 items-center gap-1 rounded-lg border border-j-border px-2.5 text-sm font-bold text-j-ink-soft disabled:opacity-30">
            Next <ChevronRight size={14} />
          </button>
        </div> : null}
      </section>}
  </div>;
}
