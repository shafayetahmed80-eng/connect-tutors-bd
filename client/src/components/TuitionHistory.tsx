import { useState } from "react";
import { History } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { humanizeFieldName, tuitionHistoryActionLabel } from "@shared/tuition-history";

function formatWhen(value: Date | string) {
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * A tuition's history for an Admin: what was done to it, by whom and when.
 * Closed until opened, and only then fetched, so a board of cards never asks
 * for one history per row.
 */
export default function TuitionHistory({ requestId }: { requestId: number }) {
  const [open, setOpen] = useState(false);
  const history = trpc.admin.tuitionHistory.useQuery({ requestId }, { enabled: open });
  return <details className="rounded-xl border border-j-border bg-white p-3" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-j-ink-soft"><History className="h-4 w-4 text-j-accent" aria-hidden="true" /> History</summary>
    {!open ? null : history.isLoading ? <p className="mt-3 text-xs text-j-ink-muted">Loading…</p>
      : history.isError ? <p role="alert" className="mt-3 text-xs text-red-700">The history could not be loaded.</p>
      : history.data?.length ? <ol className="mt-3 space-y-2 border-l border-j-border pl-3">
        {history.data.map((entry, index) => <li key={`${entry.source}-${index}`} className="text-xs leading-5 text-j-ink-soft">
          <strong className="text-j-ink-strong">{tuitionHistoryActionLabel(entry.action)}</strong>
          {entry.from && entry.to ? <span> · {entry.from.replaceAll("_", " ")} → {entry.to.replaceAll("_", " ")}</span> : null}
          <span className="block text-j-ink-muted">{formatWhen(entry.at)}{entry.actorName ? ` · ${entry.actorName}` : ""}</span>
          {entry.changedFields?.length ? <span className="block text-j-ink-muted">Changed: {entry.changedFields.map(humanizeFieldName).join(", ")}</span> : null}
          {entry.reason ? <span className="block text-j-ink-muted">{entry.reason}</span> : null}
        </li>)}
      </ol> : <p className="mt-3 text-xs text-j-ink-muted">Nothing has been recorded for this tuition yet.</p>}
  </details>;
}
