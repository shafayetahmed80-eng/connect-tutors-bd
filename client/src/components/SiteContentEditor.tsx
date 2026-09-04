import { trpc } from "@/lib/trpc";
import {
  MAX_SITE_CONTENT_TEXT_LENGTH,
  MAX_SITE_CONTENT_TEXT_PX,
  MIN_SITE_CONTENT_TEXT_PX,
  getSiteContentSizeSlots,
  getSiteContentSlots,
  getSiteContentSpacingSlots,
  getSiteContentSurfaces,
  siteContentSizeSlotMetric,
  siteContentSlotDefaultPx,
  siteContentSpacings,
  type SiteContentPageId,
  type SiteContentSpacing,
} from "@shared/site-content";
import { Loader2, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const spacingLabels: Record<SiteContentSpacing, string> = {
  compact: "Compact",
  default: "Default",
  roomy: "Roomy",
};

const inputClass = "h-8 w-full min-w-0 rounded-md border border-j-border bg-white px-2 text-[13px] text-j-ink-strong outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100";
/**
 * Four columns once there is room for them; below `sm` the label takes its own
 * line, because squeezing it alongside the controls leaves the text box too
 * narrow to read what you are editing.
 */
const rowClass = "grid grid-cols-[minmax(0,1fr)_5.5rem_1.75rem] items-center gap-2 py-1 sm:grid-cols-[minmax(6rem,10rem)_minmax(0,1fr)_5.5rem_1.75rem]";
const rowLabelClass = "col-span-3 truncate text-[13px] font-medium text-j-ink-soft sm:col-span-1";

/** `textPx` is the number in the box, kept as a string so it can be emptied. */
type Draft = { text: string; textPx: string; spacing: SiteContentSpacing };
type Stored = { text: string | null; textSizePx: number | null; paddingPx: number | null; spacing: string | null };

const sizeInputClass = "h-8 w-full min-w-0 rounded-md border border-j-border bg-white px-2 text-[13px] tabular-nums text-j-ink-strong outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100";
const checkboxClass = "h-3.5 w-3.5 shrink-0 accent-j-accent";

/**
 * The pixel value to store, or `null` when the box is empty, unreadable, or
 * still on the shipped size - all three mean "no override", which keeps a row
 * out of the table rather than storing a value that changes nothing.
 */
function overriddenPx(typed: string, shippedPx: number): number | null {
  const parsed = Number.parseInt(typed.trim(), 10);
  if (!Number.isFinite(parsed) || parsed === shippedPx) return null;
  return Math.min(MAX_SITE_CONTENT_TEXT_PX, Math.max(MIN_SITE_CONTENT_TEXT_PX, parsed));
}

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
  const sizeSlots = useMemo(() => getSiteContentSizeSlots(page), [page]);
  const surfaces = useMemo(() => getSiteContentSurfaces(page), [page]);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPx, setBulkPx] = useState("");

  const stored = useMemo(() => {
    const map = new Map<string, Stored>();
    for (const row of overrides.data ?? []) map.set(row.slotId, row);
    return map;
  }, [overrides.data]);

  /**
   * What a slot's draft looks like when it matches what is saved.
   *
   * An untouched size shows the number the slot ships at rather than a blank
   * box, so the Admin can see where they are starting from - but it still saves
   * as "no override" while it equals that number.
   */
  const savedDraft = useMemo(() => {
    const map = new Map<string, Draft>();
    for (const slot of textSlots) {
      const row = stored.get(slot.id);
      map.set(slot.id, {
        text: row?.text ?? slot.defaultText,
        textPx: String(row?.textSizePx ?? siteContentSlotDefaultPx(slot)),
        spacing: "default",
      });
    }
    for (const slot of spacingSlots) {
      const row = stored.get(slot.id);
      map.set(slot.id, { text: "", textPx: "", spacing: (row?.spacing as SiteContentSpacing | null) ?? "default" });
    }
    for (const slot of sizeSlots) {
      const row = stored.get(slot.id);
      // A padding slot stores its number in its own column.
      const saved = siteContentSizeSlotMetric(slot) === "padding" ? row?.paddingPx : row?.textSizePx;
      map.set(slot.id, { text: "", textPx: String(saved ?? slot.defaultPx), spacing: "default" });
    }
    return map;
  }, [stored, textSlots, spacingSlots, sizeSlots]);

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
    return draft.text.trim() !== saved.text.trim() || draft.textPx.trim() !== saved.textPx.trim() || draft.spacing !== saved.spacing;
  };
  const dirtyIds = [...textSlots, ...spacingSlots, ...sizeSlots].map(slot => slot.id).filter(isDirty);

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
        const sizeSlot = sizeSlots.find(candidate => candidate.id === slotId);
        if (slot) {
          const trimmed = draft.text.trim();
          // Matching the shipped copy at the shipped size means "no override".
          await save.mutateAsync({
            slotId,
            text: trimmed === slot.defaultText ? null : trimmed,
            textSizePx: overriddenPx(draft.textPx, siteContentSlotDefaultPx(slot)),
          });
        } else if (sizeSlot) {
          // Font size and padding live in separate columns, so a stored number
          // never has to be read against the registry to know what it meant.
          const px = overriddenPx(draft.textPx, sizeSlot.defaultPx);
          await save.mutateAsync(siteContentSizeSlotMetric(sizeSlot) === "padding"
            ? { slotId, paddingPx: px }
            : { slotId, textSizePx: px });
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

  const toggleSelected = (slotId: string, on: boolean) =>
    setSelected(current => {
      const next = new Set(current);
      if (on) next.add(slotId); else next.delete(slotId);
      return next;
    });

  /** Ticks or clears a whole surface at once, respecting the active filter. */
  const toggleMany = (slotIds: string[], on: boolean) =>
    setSelected(current => {
      const next = new Set(current);
      for (const id of slotIds) {
        if (on) next.add(id); else next.delete(id);
      }
      return next;
    });

  /**
   * Only slots that actually carry a size can take a bulk size. Spacing slots
   * and the phone slot are selectable - so they can be reset in bulk - but a
   * size applied to them would be stored and never read.
   */
  const sizableSelected = () => Array.from(selected).filter(slotId => {
    const slot = textSlots.find(candidate => candidate.id === slotId);
    if (slot) return slot.kind !== "phone";
    return sizeSlots.some(candidate => candidate.id === slotId);
  });

  const applyBulkSize = async () => {
    const px = Number.parseInt(bulkPx.trim(), 10);
    if (!Number.isFinite(px)) return;
    const clamped = Math.min(MAX_SITE_CONTENT_TEXT_PX, Math.max(MIN_SITE_CONTENT_TEXT_PX, px));

    setSaving(true);
    setSaveError(null);
    try {
      for (const slotId of sizableSelected()) {
        const slot = textSlots.find(candidate => candidate.id === slotId);
        const sizeSlot = sizeSlots.find(candidate => candidate.id === slotId);
        // Matching the shipped size still means "no override", in bulk too.
        const shipped = slot ? siteContentSlotDefaultPx(slot) : sizeSlot!.defaultPx;
        const value = clamped === shipped ? null : clamped;
        if (sizeSlot && siteContentSizeSlotMetric(sizeSlot) === "padding") {
          await save.mutateAsync({ slotId, paddingPx: value });
        } else if (slot) {
          const trimmed = drafts[slotId]?.text.trim() ?? "";
          await save.mutateAsync({ slotId, text: trimmed === slot.defaultText ? null : trimmed, textSizePx: value });
        } else {
          await save.mutateAsync({ slotId, textSizePx: value });
        }
      }
      await utils.siteContent.list.invalidate({ page });
      setBulkPx("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The size could not be applied.");
    } finally {
      setSaving(false);
    }
  };

  const resetSelected = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Only rows that actually have a stored override need a call.
      for (const slotId of Array.from(selected).filter(id => stored.has(id))) {
        await reset.mutateAsync({ slotId });
      }
      await utils.siteContent.list.invalidate({ page });
      setSelected(new Set());
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The rows could not be reset.");
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
    return <div className="flex min-h-32 items-center justify-center rounded-2xl border border-j-border bg-white text-sm text-j-ink-soft"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading page content…</div>;
  }
  if (overrides.isError) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Page content could not be loaded.</div>;
  }

  const needle = query.trim().toLowerCase();
  const matches = (label: string, text: string) => !needle || label.toLowerCase().includes(needle) || text.toLowerCase().includes(needle);

  return <div className="space-y-3">
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-j-border bg-white/95 p-2 shadow-sm backdrop-blur">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Filter content</span>
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-j-ink-faint" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter by label or text" className={`${inputClass} pl-7`} />
      </label>
      <span className="text-xs font-bold text-j-ink-muted">{stored.size} overridden</span>
      <button type="button" disabled={saving || dirtyIds.length === 0} onClick={() => void saveAll()} className="h-8 rounded-md bg-j-accent px-3 text-[13px] font-bold text-white disabled:opacity-40">
        {saving ? "Saving…" : dirtyIds.length > 0 ? `Save ${dirtyIds.length} change${dirtyIds.length === 1 ? "" : "s"}` : "Saved"}
      </button>
    </div>

    {selected.size > 0 ? <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-j-accent/30 bg-[#f2f9ff] p-2">
      <span className="text-[13px] font-bold text-[#0f4666]">{selected.size} selected</span>
      <label className="flex items-center gap-1.5 text-[12px] text-j-ink-soft">
        Set size
        <input
          type="number"
          inputMode="numeric"
          min={MIN_SITE_CONTENT_TEXT_PX}
          max={MAX_SITE_CONTENT_TEXT_PX}
          aria-label="Size in pixels for the selected rows"
          value={bulkPx}
          onChange={event => setBulkPx(event.target.value)}
          className={`${sizeInputClass} w-16`}
        />
        px
      </label>
      <button type="button" disabled={saving || bulkPx.trim() === "" || sizableSelected().length === 0} onClick={() => void applyBulkSize()} className="h-8 rounded-md bg-j-accent px-3 text-[13px] font-bold text-white disabled:opacity-40">
        Apply to {sizableSelected().length}
      </button>
      <button type="button" disabled={saving || !Array.from(selected).some(id => stored.has(id))} onClick={() => void resetSelected()} className="flex h-8 items-center gap-1 rounded-md border border-j-field-border bg-white px-3 text-[13px] font-bold text-j-ink-soft disabled:opacity-40">
        <RotateCcw size={13} /> Reset selected
      </button>
      <button type="button" onClick={() => setSelected(new Set())} className="h-8 rounded-md px-2 text-[13px] font-medium text-j-ink-muted hover:text-j-ink-strong">
        Clear
      </button>
    </div> : null}

    {saveError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{saveError}</p> : null}

    {surfaces.map(surface => {
      const surfaceTextSlots = textSlots.filter(slot => slot.surface === surface && matches(slot.label, drafts[slot.id]?.text ?? slot.defaultText));
      const surfaceSpacingSlots = spacingSlots.filter(slot => slot.surface === surface && matches(slot.label, ""));
      const surfaceSizeSlots = sizeSlots.filter(slot => slot.surface === surface && matches(slot.label, slot.help));
      if (surfaceTextSlots.length === 0 && surfaceSpacingSlots.length === 0 && surfaceSizeSlots.length === 0) return null;

      const groups = surfaceTextSlots.map(slot => slot.group).filter((group, index, all) => all.indexOf(group) === index);
      const overriddenHere = [...surfaceTextSlots, ...surfaceSpacingSlots, ...surfaceSizeSlots].filter(slot => stored.has(slot.id)).length;

      // Only what the filter leaves visible, so "select all" never picks up a
      // row the Owner cannot see.
      const surfaceIds = [...surfaceTextSlots, ...surfaceSpacingSlots, ...surfaceSizeSlots].map(slot => slot.id);
      const allSelected = surfaceIds.length > 0 && surfaceIds.every(id => selected.has(id));

      return <section key={surface} className="rounded-2xl border border-j-border bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-j-border pb-1.5">
          <label className="flex min-w-0 items-center gap-2">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={allSelected}
              aria-label={`Select every row under ${surface}`}
              onChange={event => toggleMany(surfaceIds, event.target.checked)}
            />
            <h2 className="truncate text-[13px] font-bold text-j-ink">{surface}</h2>
          </label>
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-j-ink-faint">{overriddenHere} edited</span>
        </div>

        {groups.map(group => <div key={group} className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-j-ink-faint">{group}</p>
          {surfaceTextSlots.filter(slot => slot.group === group).map(slot => <div key={slot.id} className={rowClass}>
            {/* The checkbox lives inside the label cell rather than taking a
                grid column of its own, which would squeeze the text box on a
                phone where the label already wraps to its own line. */}
            <span className={`${rowLabelClass} flex items-center gap-2`}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={selected.has(slot.id)}
                aria-label={`Select ${surface} ${slot.label}`}
                onChange={event => toggleSelected(slot.id, event.target.checked)}
              />
              <label htmlFor={`slot-${slot.id}`} className="min-w-0 truncate" title={slot.label}>
                {slot.label}
                {isDirty(slot.id) ? <span className="ml-1 text-j-accent" aria-label="unsaved">•</span> : null}
              </label>
            </span>
            <input
              id={`slot-${slot.id}`}
              value={drafts[slot.id]?.text ?? ""}
              maxLength={MAX_SITE_CONTENT_TEXT_LENGTH}
              onChange={event => update(slot.id, { text: event.target.value })}
              className={inputClass}
            />
            {/* A phone number is a value other code builds links from. A
                "text-only" slot renders as a plain string on a page whose
                stylesheet selects by element, where a sized wrapper would
                recolour the whole heading. Neither can carry a size, so neither
                offers a box that would quietly do nothing. */}
            {slot.kind === "phone" || slot.kind === "text-only" ? <span /> : <input
              type="number"
              inputMode="numeric"
              min={MIN_SITE_CONTENT_TEXT_PX}
              max={MAX_SITE_CONTENT_TEXT_PX}
              aria-label={`${surface} ${slot.label} text size in pixels`}
              value={drafts[slot.id]?.textPx ?? ""}
              onChange={event => update(slot.id, { textPx: event.target.value })}
              className={sizeInputClass}
            />}
            <button type="button" disabled={saving || !stored.has(slot.id)} aria-label={`Reset ${surface} ${slot.label}`} title="Reset to the original" onClick={() => void resetSlot(slot.id)} className="grid h-7 w-7 place-items-center rounded-md border border-j-border text-j-ink-soft disabled:opacity-30">
              <RotateCcw size={13} />
            </button>
          </div>)}
        </div>)}

        {surfaceSizeSlots.map(slot => <div key={slot.id} className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-j-ink-faint">Text size</p>
          <div className={rowClass}>
            <span className={`${rowLabelClass} flex items-center gap-2`}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={selected.has(slot.id)}
                aria-label={`Select ${surface} ${slot.label}`}
                onChange={event => toggleSelected(slot.id, event.target.checked)}
              />
              <span className="min-w-0 truncate" title={slot.label}>
                {slot.label}
                {isDirty(slot.id) ? <span className="ml-1 text-j-accent" aria-label="unsaved">•</span> : null}
              </span>
            </span>
            <span className="hidden text-[11px] leading-4 text-j-ink-muted sm:block">{slot.help}</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_SITE_CONTENT_TEXT_PX}
              max={MAX_SITE_CONTENT_TEXT_PX}
              aria-label={`${surface} ${slot.label} text size in pixels`}
              value={drafts[slot.id]?.textPx ?? ""}
              onChange={event => update(slot.id, { textPx: event.target.value })}
              className={sizeInputClass}
            />
            <button type="button" disabled={saving || !stored.has(slot.id)} aria-label={`Reset ${surface} ${slot.label}`} title="Reset to the original" onClick={() => void resetSlot(slot.id)} className="grid h-7 w-7 place-items-center rounded-md border border-j-border text-j-ink-soft disabled:opacity-30">
              <RotateCcw size={13} />
            </button>
          </div>
        </div>)}

        {surfaceSpacingSlots.map(slot => <div key={slot.id} className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-j-ink-faint">Spacing</p>
          <div className={rowClass}>
            <span className={`${rowLabelClass} flex items-center gap-2`}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={selected.has(slot.id)}
                aria-label={`Select ${surface} ${slot.label}`}
                onChange={event => toggleSelected(slot.id, event.target.checked)}
              />
              <span className="min-w-0 truncate" title={slot.label}>
                {slot.label}
                {isDirty(slot.id) ? <span className="ml-1 text-j-accent" aria-label="unsaved">•</span> : null}
              </span>
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
            <button type="button" disabled={saving || !stored.has(slot.id)} aria-label={`Reset ${surface} ${slot.label}`} title="Reset to the original" onClick={() => void resetSlot(slot.id)} className="grid h-7 w-7 place-items-center rounded-md border border-j-border text-j-ink-soft disabled:opacity-30">
              <RotateCcw size={13} />
            </button>
          </div>
        </div>)}
      </section>;
    })}
  </div>;
}
