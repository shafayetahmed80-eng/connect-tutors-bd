import { trpc } from "@/lib/trpc";
import {
  MAX_OPTION_NAME_LENGTH,
  optionCatalogs,
  type OptionCatalogId,
} from "@shared/option-catalogs";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const inputClass = "h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100";
const iconButtonClass = "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 disabled:opacity-30";
/**
 * Below `sm` the name takes the full width and the controls sit under it; the
 * three-column form squeezes the input too narrow to read on a phone.
 */
const rowClass = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-50 py-1 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_4.5rem_auto]";

type Entry = { id: number; name: string; active: boolean; sortOrder: number; origin: string; usageCount: number };

/**
 * Owner-facing editor for the option lists the Tutor and Request-a-tutor forms
 * are built from.
 *
 * Renames and hides are saved in a batch like the copy editor next door.
 * Ordering and deletion apply straight away instead: both are structural, and a
 * half-applied order is worse than an immediate one.
 */
export default function OptionCatalogManager() {
  const [catalog, setCatalog] = useState<OptionCatalogId>("subjects");
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<number, { name: string; active: boolean }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const entries = trpc.optionCatalogs.list.useQuery({ catalog });
  const meta = optionCatalogs.find(item => item.id === catalog)!;

  const rows = useMemo<Entry[]>(() => (entries.data ?? []) as Entry[], [entries.data]);

  // Re-seed the drafts whenever the saved rows change. Keyed on contents, not
  // array identity, which would re-run on every refetch and wipe what is typed.
  const savedKey = JSON.stringify(rows.map(row => [row.id, row.name, row.active]));
  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map(row => [row.id, { name: row.name, active: row.active }])));
    setPendingDelete(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents, see above
  }, [savedKey]);

  const isDirty = (row: Entry) => {
    const draft = drafts[row.id];
    return Boolean(draft) && (draft.name.trim() !== row.name || draft.active !== row.active);
  };
  const dirtyRows = rows.filter(isDirty);

  const create = trpc.optionCatalogs.create.useMutation();
  const update = trpc.optionCatalogs.update.useMutation();
  const remove = trpc.optionCatalogs.remove.useMutation();
  const reorder = trpc.optionCatalogs.reorder.useMutation();

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await utils.optionCatalogs.list.invalidate({ catalog });
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

  const addOption = () => {
    const name = newName.trim();
    if (!name) return;
    void run(async () => {
      await create.mutateAsync({ catalog, name });
      setNewName("");
    }, "The option could not be added.");
  };

  const move = (row: Entry, direction: -1 | 1) => {
    const order = rows.map(entry => entry.id);
    const from = order.indexOf(row.id);
    const to = from + direction;
    if (to < 0 || to >= order.length) return;
    const swapped = order[from];
    order[from] = order[to];
    order[to] = swapped;
    void run(() => reorder.mutateAsync({ catalog, orderedIds: order }), "The order could not be saved.");
  };

  const needle = query.trim().toLowerCase();
  const visible = rows.filter(row => !needle || row.name.toLowerCase().includes(needle));
  const hiddenCount = rows.filter(row => !row.active).length;

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Option catalogs">
      {optionCatalogs.map(item => <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={item.id === catalog}
        onClick={() => { setCatalog(item.id); setQuery(""); setError(null); }}
        className={`h-8 rounded-md px-3 text-[13px] font-bold ${item.id === catalog ? "bg-[#116fc4] text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
      >{item.label}</button>)}
    </div>

    <p className="text-[12px] leading-5 text-slate-600">
      Used by <span className="font-bold text-slate-800">{meta.usedFor}</span>. Hiding an option keeps every existing selection intact but stops it being offered on new forms.
    </p>

    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Filter {meta.label}</span>
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Filter ${meta.label.toLowerCase()}`} className={`${inputClass} pl-7`} />
      </label>
      <span className="text-xs font-bold text-slate-500">{rows.length} total{hiddenCount > 0 ? `, ${hiddenCount} hidden` : ""}</span>
      <button type="button" disabled={busy || dirtyRows.length === 0} onClick={() => void saveAll()} className="h-8 rounded-md bg-[#116fc4] px-3 text-[13px] font-bold text-white disabled:opacity-40">
        {busy ? "Saving…" : dirtyRows.length > 0 ? `Save ${dirtyRows.length} change${dirtyRows.length === 1 ? "" : "s"}` : "Saved"}
      </button>
    </div>

    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <label htmlFor="new-option" className="sr-only">Add a {meta.itemLabel}</label>
      <input
        id="new-option"
        value={newName}
        maxLength={MAX_OPTION_NAME_LENGTH}
        placeholder={`Add a ${meta.itemLabel}`}
        onChange={event => setNewName(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addOption(); } }}
        className={`${inputClass} min-w-0 flex-1`}
      />
      <button type="button" disabled={busy || newName.trim().length === 0} onClick={addOption} className="flex h-8 items-center gap-1 rounded-md bg-slate-900 px-3 text-[13px] font-bold text-white disabled:opacity-40">
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </div>

    {entries.isLoading
      ? <div className="flex min-h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading {meta.label.toLowerCase()}…</div>
      : entries.isError
      ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">This list could not be loaded.</div>
      : <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {visible.length === 0
          ? <p className="py-6 text-center text-sm text-slate-500">{needle ? "Nothing matches that filter." : "This list is empty."}</p>
          : visible.map((row, index) => {
            const draft = drafts[row.id] ?? { name: row.name, active: row.active };
            // A built-in option can be hidden but never deleted: the next deploy
            // would recreate it, and an option in use belongs to real profiles.
            const canDelete = row.usageCount === 0 && row.origin === "admin";
            return <div key={row.id} className={rowClass}>
              <div className="flex min-w-0 items-center gap-1.5">
                <label htmlFor={`option-${row.id}`} className="sr-only">{row.name}</label>
                <input
                  id={`option-${row.id}`}
                  value={draft.name}
                  maxLength={MAX_OPTION_NAME_LENGTH}
                  onChange={event => setDrafts(current => ({ ...current, [row.id]: { ...draft, name: event.target.value } }))}
                  className={`${inputClass} ${draft.active ? "" : "text-slate-400 line-through"}`}
                />
                {isDirty(row) ? <span className="text-[#116fc4]" aria-label="unsaved">•</span> : null}
              </div>

              <span className="hidden text-[11px] font-bold uppercase tracking-wide text-slate-400 sm:block" title={`${row.usageCount} tutor${row.usageCount === 1 ? "" : "s"} use this`}>
                {row.usageCount > 0 ? `${row.usageCount} used` : row.origin === "admin" ? "Added" : "—"}
              </span>

              <div className="flex shrink-0 items-center gap-1">
                <button type="button" disabled={busy || Boolean(needle) || index === 0} onClick={() => move(row, -1)} className={iconButtonClass} aria-label={`Move ${row.name} up`} title={needle ? "Clear the filter to reorder" : "Move up"}><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={busy || Boolean(needle) || index === visible.length - 1} onClick={() => move(row, 1)} className={iconButtonClass} aria-label={`Move ${row.name} down`} title={needle ? "Clear the filter to reorder" : "Move down"}><ArrowDown className="h-3.5 w-3.5" /></button>
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
                  onClick={() => {
                    if (pendingDelete !== row.id) { setPendingDelete(row.id); return; }
                    void run(() => remove.mutateAsync({ catalog, id: row.id }), "The option could not be deleted.");
                  }}
                  className={`${iconButtonClass} ${pendingDelete === row.id ? "border-red-300 bg-red-50 text-red-700" : ""}`}
                  aria-label={pendingDelete === row.id ? `Confirm deleting ${row.name}` : `Delete ${row.name}`}
                  title={row.usageCount > 0 ? "In use — hide it instead" : row.origin === "seed" ? "A built-in option can be hidden but not deleted" : pendingDelete === row.id ? "Click again to delete" : "Delete"}
                ><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>;
          })}
      </section>}
  </div>;
}
