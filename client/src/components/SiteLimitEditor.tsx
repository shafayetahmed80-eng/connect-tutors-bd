import { trpc } from "@/lib/trpc";
import { siteLimits, type SiteLimitGroup, type SiteLimitId } from "@shared/site-limits";
import { Loader2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const allGroups: SiteLimitGroup[] = ["Selection", "Job board", "Uploads", "Text length", "Modals", "Input Field Text", "Button Section"];

/**
 * Owner-facing editor for the numbers that used to be literals in the code.
 *
 * Each row shows the bounds it may move between, because those bounds are not
 * arbitrary - a text length is capped by the column that stores it, and a
 * selection cap of zero would make a required field unfillable. Showing the
 * range turns a refusal into something the Owner can avoid.
 */
export default function SiteLimitEditor({ groups = allGroups.filter(group => group !== "Modals" && group !== "Input Field Text" && group !== "Button Section") }: { groups?: SiteLimitGroup[] } = {}) {
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

  return <div className="space-y-3">
    <p className="text-xs leading-5 text-j-ink-soft">
      These numbers used to live in the code. Each one shows the range it may move between — a text length cannot go past the column that stores it, and a selection cap cannot reach zero without making a required field unfillable. A limit left at its shipped value stores nothing.
    </p>

    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

    {overrides.isLoading
      ? <div className="flex min-h-32 items-center justify-center rounded-xl border border-j-border bg-white text-sm text-j-ink-soft"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading the limits…</div>
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
}
