import { trpc } from "@/lib/trpc";
import {
  MAX_SITE_CONTENT_TEXT_LENGTH,
  getSiteContentSlots,
  getSiteContentSpacingSlots,
  getSiteContentSurfaces,
  siteContentSpacings,
  siteContentTextSizes,
  type SiteContentPageId,
  type SiteContentSpacing,
  type SiteContentTextSize,
} from "@shared/site-content";
import { Loader2, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const sizeLabels: Record<SiteContentTextSize, string> = {
  smaller: "S−",
  default: "Default",
  larger: "L+",
  largest: "XL+",
};

const spacingLabels: Record<SiteContentSpacing, string> = {
  compact: "Compact",
  default: "Default",
  roomy: "Roomy",
};

const inputClass = "h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100";
/**
 * Four columns once there is room for them; below `sm` the label takes its own
 * line, because squeezing it alongside the controls leaves the text box too
 * narrow to read what you are editing.
 */
const rowClass = "grid grid-cols-[minmax(0,1fr)_5.5rem_1.75rem] items-center gap-2 py-1 sm:grid-cols-[minmax(6rem,10rem)_minmax(0,1fr)_5.5rem_1.75rem]";
const rowLabelClass = "col-span-3 truncate text-[13px] font-medium text-slate-700 sm:col-span-1";

type Draft = { text: string; textSize: SiteContentTextSize; spacing: SiteContentSpacing };
type Stored = { text: string | null; textSize: string | null; spacing: string | null };

/**
 * Dense list of a page's editable copy, grouped by the surface it appears on.
 *
 * Every row is an override on top of the text in code, so Reset always restores
 * the original and an untouched page is byte-identical to what ships. The
 * editor cannot add, delete or reorder page sections by design.
 */
export default function SiteContentEditor({ page }: { page: SiteContentPageId }) {
  const utils = trpc.useUtils();
  const overrides = trpc.siteContent.list.useQuery({ page });
  const textSlots = useMemo(() => getSiteContentSlots(page), [page]);
  const spacingSlots = useMemo(() => getSiteContentSpacingSlots(page), [page]);
  const surfaces = useMemo(() => getSiteContentSurfaces(page), [page]);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const stored = useMemo(() => {
    const map = new Map<string, Stored>();
    for (const row of overrides.data ?? []) map.set(row.slotId, row);
    return map;
  }, [overrides.data]);

  /** What a slot's draft looks like when it matches what is saved. */
  const savedDraft = useMemo(() => {
    const map = new Map<string, Draft>();
    for (const slot of textSlots) {
      const row = stored.get(slot.id);
      map.set(slot.id, {
        text: row?.text ?? slot.defaultText,
        textSize: (row?.textSize as SiteContentTextSize | null) ?? "default",
        spacing: "default",
      });
    }
    for (const slot of spacingSlots) {
      const row = stored.get(slot.id);
      map.set(slot.id, { text: "", textSize: "default", spacing: (row?.spacing as SiteContentSpacing | null) ?? "default" });
    }
    return map;
  }, [stored, textSlots, spacingSlots]);

  // Re-seed whenever the saved overrides change, so a save or reset is
  // reflected. Keyed on contents rather than array identity: seeding on
  // identity loops forever against a client that returns a fresh array.
  const savedKey = JSON.stringify(Array.from(savedDraft.entries()));
  useEffect(() => {
    setDrafts(Object.fromEntries(savedDraft));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents, see above
  }, [savedKey]);

  const isDirty = (slotId: string) => {
    const draft = drafts[slotId];
    const saved = savedDraft.get(slotId);
    if (!draft || !saved) return false;
    return draft.text.trim() !== saved.text.trim() || draft.textSize !== saved.textSize || draft.spacing !== saved.spacing;
  };
  const dirtyIds = [...textSlots, ...spacingSlots].map(slot => slot.id).filter(isDirty);

  const update = (slotId: string, change: Partial<Draft>) =>
    setDrafts(current => ({ ...current, [slotId]: { ...current[slotId], ...change } }));

  const save = trpc.siteContent.save.useMutation();
  const reset = trpc.siteContent.reset.useMutation();

  const saveAll = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      for (const slotId of dirtyIds) {
        const draft = drafts[slotId];
        const slot = textSlots.find(candidate => candidate.id === slotId);
        if (slot) {
          const trimmed = draft.text.trim();
          // Matching the shipped copy at the default size means "no override".
          await save.mutateAsync({
            slotId,
            text: trimmed === slot.defaultText ? null : trimmed,
            textSize: draft.textSize === "default" ? null : draft.textSize,
          });
        } else {
          await save.mutateAsync({ slotId, spacing: draft.spacing === "default" ? null : draft.spacing });
        }
      }
      await utils.siteContent.list.invalidate({ page });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Changes could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const resetSlot = async (slotId: string) => {
    setSaving(true);
    setSaveError(null);
    try {
      await reset.mutateAsync({ slotId });
      await utils.siteContent.list.invalidate({ page });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The slot could not be reset.");
    } finally {
      setSaving(false);
    }
  };

  if (overrides.isLoading) {
    return <div className="flex min-h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading page content…</div>;
  }
  if (overrides.isError) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Page content could not be loaded.</div>;
  }

  const needle = query.trim().toLowerCase();
  const matches = (label: string, text: string) => !needle || label.toLowerCase().includes(needle) || text.toLowerCase().includes(needle);

  return <div className="space-y-3">
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Filter content</span>
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter by label or text" className={`${inputClass} pl-7`} />
      </label>
      <span className="text-xs font-bold text-slate-500">{stored.size} overridden</span>
      <button type="button" disabled={saving || dirtyIds.length === 0} onClick={() => void saveAll()} className="h-8 rounded-md bg-[#116fc4] px-3 text-[13px] font-bold text-white disabled:opacity-40">
        {saving ? "Saving…" : dirtyIds.length > 0 ? `Save ${dirtyIds.length} change${dirtyIds.length === 1 ? "" : "s"}` : "Saved"}
      </button>
    </div>

    {saveError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{saveError}</p> : null}

    {surfaces.map(surface => {
      const surfaceTextSlots = textSlots.filter(slot => slot.surface === surface && matches(slot.label, drafts[slot.id]?.text ?? slot.defaultText));
      const surfaceSpacingSlots = spacingSlots.filter(slot => slot.surface === surface && matches(slot.label, ""));
      if (surfaceTextSlots.length === 0 && surfaceSpacingSlots.length === 0) return null;

      const groups = surfaceTextSlots.map(slot => slot.group).filter((group, index, all) => all.indexOf(group) === index);
      const overriddenHere = [...surfaceTextSlots, ...surfaceSpacingSlots].filter(slot => stored.has(slot.id)).length;

      return <section key={surface} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-1.5">
          <h2 className="text-[13px] font-bold text-slate-900">{surface}</h2>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{overriddenHere} edited</span>
        </div>

        {groups.map(group => <div key={group} className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{group}</p>
          {surfaceTextSlots.filter(slot => slot.group === group).map(slot => <div key={slot.id} className={rowClass}>
            <label htmlFor={`slot-${slot.id}`} className={rowLabelClass} title={slot.label}>
              {slot.label}
              {isDirty(slot.id) ? <span className="ml-1 text-[#116fc4]" aria-label="unsaved">•</span> : null}
            </label>
            <input
              id={`slot-${slot.id}`}
              value={drafts[slot.id]?.text ?? ""}
              maxLength={MAX_SITE_CONTENT_TEXT_LENGTH}
              onChange={event => update(slot.id, { text: event.target.value })}
              className={inputClass}
            />
            <select
              aria-label={`${surface} ${slot.label} text size`}
              value={drafts[slot.id]?.textSize ?? "default"}
              onChange={event => update(slot.id, { textSize: event.target.value as SiteContentTextSize })}
              className={inputClass}
            >
              {siteContentTextSizes.map(size => <option key={size} value={size}>{sizeLabels[size]}</option>)}
            </select>
            <button type="button" disabled={saving || !stored.has(slot.id)} aria-label={`Reset ${surface} ${slot.label}`} title="Reset to the original" onClick={() => void resetSlot(slot.id)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-30">
              <RotateCcw size={13} />
            </button>
          </div>)}
        </div>)}

        {surfaceSpacingSlots.map(slot => <div key={slot.id} className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Spacing</p>
          <div className={rowClass}>
            <span className={rowLabelClass} title={slot.label}>
              {slot.label}
              {isDirty(slot.id) ? <span className="ml-1 text-[#116fc4]" aria-label="unsaved">•</span> : null}
            </span>
            <span className="hidden sm:block" />
            <select
              aria-label={`${surface} ${slot.label} padding`}
              value={drafts[slot.id]?.spacing ?? "default"}
              onChange={event => update(slot.id, { spacing: event.target.value as SiteContentSpacing })}
              className={inputClass}
            >
              {siteContentSpacings.map(spacing => <option key={spacing} value={spacing}>{spacingLabels[spacing]}</option>)}
            </select>
            <button type="button" disabled={saving || !stored.has(slot.id)} aria-label={`Reset ${surface} ${slot.label}`} title="Reset to the original" onClick={() => void resetSlot(slot.id)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-30">
              <RotateCcw size={13} />
            </button>
          </div>
        </div>)}
      </section>;
    })}
  </div>;
}
