import { trpc } from "@/lib/trpc";
import {
  MAX_SITE_CONTENT_TEXT_LENGTH,
  getSiteContentSlots,
  getSiteContentSpacingSlots,
  siteContentSpacings,
  siteContentTextSizes,
  type SiteContentPageId,
  type SiteContentSpacing,
  type SiteContentTextSize,
} from "@shared/site-content";
import { Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

const sizeLabels: Record<SiteContentTextSize, string> = {
  smaller: "Smaller",
  default: "Default",
  larger: "Larger",
  largest: "Largest",
};

const spacingLabels: Record<SiteContentSpacing, string> = {
  compact: "Compact",
  default: "Default",
  roomy: "Roomy",
};

const fieldClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100";

type Draft = { text: string; textSize: SiteContentTextSize; spacing: SiteContentSpacing };

/**
 * Lists a page's editable copy and lets the Owner change the wording and size.
 *
 * Every row is an override on top of the text in code, so "Reset" always
 * restores the original and an untouched page is byte-identical to what ships.
 * The editor cannot add or remove page sections by design.
 */
export default function SiteContentEditor({ page }: { page: SiteContentPageId }) {
  const utils = trpc.useUtils();
  const overrides = trpc.siteContent.list.useQuery({ page });
  const textSlots = getSiteContentSlots(page);
  const spacingSlots = getSiteContentSpacingSlots(page);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savedSlotId, setSavedSlotId] = useState<string | null>(null);

  // Re-seed from the server whenever the saved overrides change, so a reset or
  // a save from elsewhere is reflected instead of leaving a stale draft. Keyed
  // on the contents rather than the array identity: seeding on identity would
  // loop forever against any client that returns a fresh array each render.
  const overridesKey = JSON.stringify(overrides.data ?? []);
  useEffect(() => {
    if (!overrides.data) return;
    const bySlot = new Map(overrides.data.map(row => [row.slotId, row]));
    const next: Record<string, Draft> = {};
    for (const slot of textSlots) {
      const row = bySlot.get(slot.id);
      next[slot.id] = {
        text: row?.text ?? slot.defaultText,
        textSize: (row?.textSize as SiteContentTextSize | null) ?? "default",
        spacing: "default",
      };
    }
    for (const slot of spacingSlots) {
      const row = bySlot.get(slot.id);
      next[slot.id] = { text: "", textSize: "default", spacing: (row?.spacing as SiteContentSpacing | null) ?? "default" };
    }
    setDrafts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents, see above
  }, [overridesKey, page]);

  const refresh = async () => {
    await utils.siteContent.list.invalidate({ page });
  };
  const save = trpc.siteContent.save.useMutation({ onSuccess: refresh });
  const reset = trpc.siteContent.reset.useMutation({ onSuccess: refresh });
  const busy = save.isPending || reset.isPending;

  const update = (slotId: string, change: Partial<Draft>) =>
    setDrafts(current => ({ ...current, [slotId]: { ...current[slotId], ...change } }));

  const saveText = (slotId: string, defaultText: string) => {
    const draft = drafts[slotId];
    if (!draft) return;
    const trimmed = draft.text.trim();
    setSavedSlotId(slotId);
    // Matching the shipped copy at the default size means "no override".
    save.mutate({
      slotId,
      text: trimmed === defaultText ? null : trimmed,
      textSize: draft.textSize === "default" ? null : draft.textSize,
    });
  };

  const saveSpacing = (slotId: string) => {
    const draft = drafts[slotId];
    if (!draft) return;
    setSavedSlotId(slotId);
    save.mutate({ slotId, spacing: draft.spacing === "default" ? null : draft.spacing });
  };

  const resetSlot = (slotId: string) => {
    setSavedSlotId(slotId);
    reset.mutate({ slotId });
  };

  if (overrides.isLoading) {
    return <div className="flex min-h-40 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading page content…</div>;
  }
  if (overrides.isError) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Page content could not be loaded.</div>;
  }

  const groups = textSlots.map(slot => slot.group).filter((group, index, all) => all.indexOf(group) === index);

  return <div className="space-y-5">
    {save.isError || reset.isError ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{(save.error ?? reset.error)?.message}</p> : null}

    {groups.map(group => <section key={group} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{group}</h2>
      <div className="mt-3 divide-y divide-slate-100">
        {textSlots.filter(slot => slot.group === group).map(slot => {
          const draft = drafts[slot.id];
          const changed = Boolean(draft) && (draft.text.trim() !== slot.defaultText || draft.textSize !== "default");
          return <div key={slot.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
            <label className="block text-sm font-bold text-slate-800">
              {slot.label}
              <input
                value={draft?.text ?? ""}
                maxLength={MAX_SITE_CONTENT_TEXT_LENGTH}
                onChange={event => update(slot.id, { text: event.target.value })}
                className={`mt-1.5 font-normal ${fieldClass}`}
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
              Text size
              <select
                aria-label={`${slot.label} text size`}
                value={draft?.textSize ?? "default"}
                onChange={event => update(slot.id, { textSize: event.target.value as SiteContentTextSize })}
                className={`mt-1.5 font-normal normal-case tracking-normal text-slate-800 ${fieldClass}`}
              >
                {siteContentTextSizes.map(size => <option key={size} value={size}>{sizeLabels[size]}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => saveText(slot.id, slot.defaultText)} className="h-10 rounded-lg bg-[#116fc4] px-4 text-sm font-bold text-white disabled:opacity-50">
                {busy && savedSlotId === slot.id ? "Saving…" : "Save"}
              </button>
              <button type="button" disabled={busy || !changed} aria-label={`Reset ${slot.label}`} onClick={() => resetSlot(slot.id)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40">
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>;
        })}
      </div>
    </section>)}

    {spacingSlots.length > 0 ? <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Spacing</h2>
      <div className="mt-3 divide-y divide-slate-100">
        {spacingSlots.map(slot => <div key={slot.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
          <p className="text-sm font-bold text-slate-800">{slot.label}</p>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Padding
            <select
              aria-label={`${slot.label} padding`}
              value={drafts[slot.id]?.spacing ?? "default"}
              onChange={event => update(slot.id, { spacing: event.target.value as SiteContentSpacing })}
              className={`mt-1.5 font-normal normal-case tracking-normal text-slate-800 ${fieldClass}`}
            >
              {siteContentSpacings.map(spacing => <option key={spacing} value={spacing}>{spacingLabels[spacing]}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => saveSpacing(slot.id)} className="h-10 rounded-lg bg-[#116fc4] px-4 text-sm font-bold text-white disabled:opacity-50">
              {busy && savedSlotId === slot.id ? "Saving…" : "Save"}
            </button>
            <button type="button" disabled={busy || (drafts[slot.id]?.spacing ?? "default") === "default"} aria-label={`Reset ${slot.label}`} onClick={() => resetSlot(slot.id)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40">
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>)}
      </div>
    </section> : null}
  </div>;
}
