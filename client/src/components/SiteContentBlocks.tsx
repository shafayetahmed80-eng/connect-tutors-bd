import { trpc } from "@/lib/trpc";
import {
  MAX_SITE_CONTENT_BLOCK_BODY,
  MAX_SITE_CONTENT_BLOCK_HEADING,
  getSiteContentAnchors,
  siteContentBlockTones,
  type SiteContentBlockTone,
  type SiteContentPageId,
} from "@shared/site-content";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const inputClass = "w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] text-slate-800 outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100";
const toneLabels: Record<SiteContentBlockTone, string> = { info: "Info", warning: "Warning", success: "Success" };

type BlockRow = {
  id: number;
  anchorId: string;
  heading: string | null;
  body: string | null;
  tone: string;
  sortOrder: number;
  active: number;
};

type BlockDraft = { heading: string; body: string; tone: SiteContentBlockTone; active: boolean };

/**
 * Add, edit, reorder and delete the notice blocks an Admin can place at the
 * anchors a page declares.
 *
 * This is the only part of the Dynamic Section that creates content rather than
 * overriding it, and it is confined to anchors on purpose: the page's own
 * sections stay in code because they carry validation and database writes.
 */
export default function SiteContentBlocks({ page }: { page: SiteContentPageId }) {
  const utils = trpc.useUtils();
  const anchors = getSiteContentAnchors(page);
  const blocks = trpc.siteContent.listAllBlocks.useQuery({ page });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, BlockDraft>>({});

  const create = trpc.siteContent.createBlock.useMutation();
  const update = trpc.siteContent.updateBlock.useMutation();
  const remove = trpc.siteContent.deleteBlock.useMutation();
  const reorder = trpc.siteContent.reorderBlocks.useMutation();

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      // Refresh both lists: the editor sees hidden blocks, the pages do not.
      await utils.siteContent.listAllBlocks.invalidate({ page });
      await utils.siteContent.listBlocks.invalidate({ page });
      setDrafts({});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The block could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const rowsFor = (anchorId: string) => ((blocks.data ?? []) as BlockRow[]).filter(block => block.anchorId === anchorId);

  const draftFor = (block: BlockRow): BlockDraft => drafts[block.id] ?? {
    heading: block.heading ?? "",
    body: block.body ?? "",
    tone: (block.tone as SiteContentBlockTone) ?? "info",
    active: block.active === 1,
  };

  const editDraft = (block: BlockRow, change: Partial<BlockDraft>) =>
    setDrafts(current => ({ ...current, [block.id]: { ...draftFor(block), ...change } }));

  const move = (anchorId: string, index: number, direction: -1 | 1) => {
    const ids = rowsFor(anchorId).map(block => block.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const swapped = ids.slice();
    swapped[index] = ids[target];
    swapped[target] = ids[index];
    void run(() => reorder.mutateAsync({ anchorId, orderedIds: swapped }));
  };

  if (blocks.isLoading) {
    return <div className="flex min-h-24 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading blocks…</div>;
  }

  return <div className="space-y-3">
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

    {anchors.map(anchor => {
      const rows = rowsFor(anchor.id);
      return <section key={anchor.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-1.5">
          <h3 className="text-[13px] font-bold text-slate-900">{anchor.label}</h3>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{anchor.surface} · {rows.length} block{rows.length === 1 ? "" : "s"}</span>
        </div>

        {rows.map((block, index) => {
          const value = draftFor(block);
          const dirty = value.heading !== (block.heading ?? "")
            || value.body !== (block.body ?? "")
            || value.tone !== block.tone
            || value.active !== (block.active === 1);

          return <div key={block.id} className="grid gap-2 border-b border-slate-50 py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_6rem_auto]">
            <div className="space-y-1.5">
              <input
                aria-label={`Block ${index + 1} heading`}
                value={value.heading}
                maxLength={MAX_SITE_CONTENT_BLOCK_HEADING}
                placeholder="Heading (optional)"
                onChange={event => editDraft(block, { heading: event.target.value })}
                className={inputClass}
              />
              <textarea
                aria-label={`Block ${index + 1} body`}
                value={value.body}
                maxLength={MAX_SITE_CONTENT_BLOCK_BODY}
                rows={2}
                placeholder="Body text"
                onChange={event => editDraft(block, { body: event.target.value })}
                className={`${inputClass} resize-y`}
              />
            </div>
            <div className="space-y-1.5">
              <select
                aria-label={`Block ${index + 1} tone`}
                value={value.tone}
                onChange={event => editDraft(block, { tone: event.target.value as SiteContentBlockTone })}
                className={inputClass}
              >
                {siteContentBlockTones.map(tone => <option key={tone} value={tone}>{toneLabels[tone]}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
                <input type="checkbox" checked={value.active} onChange={event => editDraft(block, { active: event.target.checked })} />
                Visible
              </label>
            </div>
            <div className="flex items-start gap-1">
              <button type="button" disabled={busy || index === 0} aria-label={`Move block ${index + 1} up`} onClick={() => move(anchor.id, index, -1)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-30"><ChevronUp size={13} /></button>
              <button type="button" disabled={busy || index === rows.length - 1} aria-label={`Move block ${index + 1} down`} onClick={() => move(anchor.id, index, 1)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-30"><ChevronDown size={13} /></button>
              <button type="button" disabled={busy || !dirty} onClick={() => void run(() => update.mutateAsync({ id: block.id, anchorId: block.anchorId, heading: value.heading, body: value.body, tone: value.tone, active: value.active }))} className="h-7 rounded-md bg-[#116fc4] px-2 text-[12px] font-bold text-white disabled:opacity-30">Save</button>
              <button type="button" disabled={busy} aria-label={`Delete block ${index + 1}`} onClick={() => void run(() => remove.mutateAsync({ id: block.id }))} className="grid h-7 w-7 place-items-center rounded-md border border-red-200 text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
            </div>
          </div>;
        })}

        {/* New blocks start hidden, so nothing reaches visitors until it is ready. */}
        <button type="button" disabled={busy} onClick={() => void run(() => create.mutateAsync({ anchorId: anchor.id, heading: "New notice", body: "", tone: "info", active: false }))} className="mt-2 inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[12px] font-bold text-[#116fc4] disabled:opacity-40">
          <Plus size={13} /> Add block
        </button>
      </section>;
    })}
  </div>;
}
