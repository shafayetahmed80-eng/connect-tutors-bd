import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";

function formatBroadcastDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

/**
 * What the Tutor or Guardian directory's own "Notify" button has sent, most
 * recent first - the summary an Admin reads (who, what, how many), not the
 * per-recipient rows those already live in each account's own inbox. The
 * search box matches the title or the message, so a long history stays
 * findable without paging through it by eye.
 */
export function NotificationHistoryModal({ audience, onClose }: { audience: "tutor" | "guardian"; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const history = trpc.admin.listNotificationBroadcasts.useQuery({ audience, query, page: 1, pageSize: 20 });
  const items = history.data?.items ?? [];

  return <Modal size="md" onClose={onClose}>
    <ModalHeader title="Sent notifications" meta={audience === "tutor" ? "Broadcasts sent to the Tutor directory" : "Broadcasts sent to the Guardian directory"} />
    <ModalBody className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Search sent notifications</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by title or message"
          className="h-10 w-full rounded-xl border border-j-border bg-white pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
      </label>
      {history.isLoading ? <div className="flex min-h-32 items-center justify-center text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div> : null}
      {history.isError ? <p className="text-sm text-red-800">History could not be loaded.</p> : null}
      {!history.isLoading && !history.isError && items.length === 0
        ? <p className="text-sm text-j-ink-soft">{query.trim() ? "Nothing sent matches that search." : "Nothing sent yet."}</p>
        : null}
      {items.map(item => <div key={item.id} className="rounded-xl border border-j-border bg-white p-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 break-words font-bold text-j-ink">{item.title}</p>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-j-accent-wash px-2.5 py-1 text-2xs font-bold text-j-accent">{item.recipientCount} sent</span>
        </div>
        <p className="mt-1 break-words text-sm leading-6 text-j-ink-soft">{item.message}</p>
        <p className="mt-2 text-2xs text-j-ink-muted">{item.sentByName ?? item.sentByEmail ?? "An Admin"} · {formatBroadcastDate(item.createdAt)}</p>
      </div>)}
    </ModalBody>
  </Modal>;
}
