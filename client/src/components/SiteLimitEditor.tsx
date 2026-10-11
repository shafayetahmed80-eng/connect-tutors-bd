import { trpc } from "@/lib/trpc";
import { resolveSiteLimits, siteLimits, type SiteLimitGroup, type SiteLimitId, type SiteLimitValues } from "@shared/site-limits";
import { RotateCcw } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const allGroups: SiteLimitGroup[] = ["Selection", "Uploads", "Text length", "Modals", "Input Field Text", "Button Section", "Platform charge", "Matching", "Navigation"];

/**
 * Owner-facing editor for the numbers that used to be literals in the code.
 *
 * Each row shows the bounds it may move between, because those bounds are not
 * arbitrary - a text length is capped by the column that stores it, and a
 * selection cap of zero would make a required field unfillable. Showing the
 * range turns a refusal into something the Owner can avoid.
 *
 * `aside` draws something beside the rows from the numbers as they are typed,
 * before they are saved - a number only counts once it is a whole number inside
 * its range, so half a keystroke never reaches the drawing. It is for a laptop
 * screen; below it the rows have the width to themselves.
 */
export default function SiteLimitEditor({
  groups = allGroups.filter(group => group !== "Modals" && group !== "Input Field Text" && group !== "Button Section" && group !== "Platform charge" && group !== "Navigation"),
  aside,
}: { groups?: SiteLimitGroup[]; aside?: (limits: SiteLimitValues) => ReactNode } = {}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<SiteLimitId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const overrides = trpc.siteLimits.listOverrides.useQuery();
  const save = trpc.siteLimits.save.useMutation();
  const reset = trpc.siteLimits.reset.useMutation();

  const stored = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of overrides.data ?? []) map.set(row.limitId, Number(row.value));
    return map;
  }, [overrides.data]);

  // Keyed on contents, so a refetch that changes nothing cannot wipe typing.
  const savedKey = JSON.stringify(Array.from(stored.entries()).sort());
  useEffect(() => {
    setDrafts(Object.fromEntries(siteLimits.map(limit => [limit.id, String(stored.get(limit.id) ?? limit.value)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents
  }, [savedKey]);

  // What is saved, with whatever is typed and valid laid over it.
  const live = useMemo(() => {
    const rows: Array<{ limitId: string; value: number }> = [];
    stored.forEach((value, limitId) => rows.push({ limitId, value }));
    // What is typed lands after what is saved, and `resolveSiteLimits` drops a
    // number that is not whole or not inside its range, leaving the saved one.
    for (const [limitId, text] of Object.entries(drafts)) if (text.trim() !== "") rows.push({ limitId, value: Number(text) });
    return resolveSiteLimits(rows);
  }, [stored, drafts]);

  const run = async (id: SiteLimitId, action: () => Promise<unknown>, fallback: string) => {
    setBusy(id);
    setError(null);
    try {
      await action();
      await utils.siteLimits.listOverrides.invalidate();
      await utils.siteLimits.resolved.invalidate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      setBusy(null);
    }
  };

  const rows = <div className="space-y-3">
    <p className="text-xs leading-5 text-j-ink-soft">
      These numbers used to live in the code. Each one shows the range it may move between — a text length cannot go past the column that stores it, and a selection cap cannot reach zero without making a required field unfillable. A limit left at its shipped value stores nothing.
    </p>

    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

    {overrides.isLoading
      ? <div className="flex min-h-32 items-center justify-center rounded-xl border border-j-border bg-white text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading the limits…</div>
      : groups.map(group => {
        const rows = siteLimits.filter(limit => limit.group === group);
        if (rows.length === 0) return null;
        return <section key={group} className="rounded-xl border border-j-border bg-white p-3 shadow-sm">
          <h2 className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">{group}</h2>
          <div className="mt-2 space-y-1">
            {rows.map(limit => {
              const draft = drafts[limit.id] ?? String(limit.value);
              const parsed = Number(draft);
              const changed = Number.isInteger(parsed) && parsed !== (stored.get(limit.id) ?? limit.value);
              const outOfRange = !Number.isInteger(parsed) || parsed < limit.min || parsed > limit.max;
              const edited = stored.has(limit.id);
              return <div key={limit.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-j-border py-1.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <div className="min-w-0">
                  <label htmlFor={`limit-${limit.id}`} className="text-sm font-bold text-j-ink-strong">{limit.label}</label>
                  <p className="text-2xs leading-4 text-j-ink-muted">{limit.help}</p>
                  <p className="text-2xs text-j-ink-faint">
                    {limit.min}–{limit.max} {limit.unit}
                    {edited ? <span className="ml-1 font-bold text-j-accent">· edited, ships as {limit.value}</span> : null}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    id={`limit-${limit.id}`}
                    type="number"
                    inputMode="numeric"
                    min={limit.min}
                    max={limit.max}
                    value={draft}
                    onChange={event => setDrafts(current => ({ ...current, [limit.id]: event.target.value }))}
                    className={`h-8 w-20 rounded-lg border bg-white px-2 text-sm text-j-ink-strong outline-none focus:ring-2 focus:ring-sky-100 ${outOfRange ? "border-red-300" : "border-j-border focus:border-j-accent"}`}
                  />
                  <button
                    type="button"
                    disabled={busy !== null || !changed || outOfRange}
                    onClick={() => void run(limit.id, () => save.mutateAsync({ limitId: limit.id, value: parsed }), "The limit could not be saved.")}
                    className="h-8 rounded-lg bg-j-accent px-2.5 text-xs font-bold text-white disabled:opacity-40"
                  >{busy === limit.id ? "…" : "Save"}</button>
                  <button
                    type="button"
                    disabled={busy !== null || !edited}
                    onClick={() => void run(limit.id, () => reset.mutateAsync({ limitId: limit.id }), "The limit could not be reset.")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-j-border text-j-ink-muted hover:border-j-field-border hover:text-j-ink-strong disabled:opacity-30"
                    aria-label={`Reset ${limit.label}`}
                    title={edited ? `Go back to ${limit.value}` : "Already at the shipped value"}
                  ><RotateCcw className="h-3.5 w-3.5" /></button>
                </div>
              </div>;
            })}
          </div>
        </section>;
      })}
  </div>;

  if (!aside) return rows;
  return <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start xl:gap-4">
    {rows}
    <aside className="hidden xl:sticky xl:top-4 xl:block">{aside(live)}</aside>
  </div>;
}
