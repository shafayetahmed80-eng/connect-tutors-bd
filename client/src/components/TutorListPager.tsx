import { ChevronLeft, ChevronRight } from "lucide-react";

/** Previous and Next under a paged list of Tutors; absent while one page holds them all. */
export function TutorListPager({ page, totalPages, onPage, label }: { page: number; totalPages: number; onPage: (next: number) => void; label: string }) {
  if (totalPages <= 1) return null;
  return <nav aria-label={label} className="flex items-center justify-between rounded-xl border border-j-border bg-white p-3 shadow-sm">
    <p className="text-sm text-j-ink-soft">Page {page} of {totalPages}</p>
    <div className="flex gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-3 text-sm font-bold disabled:opacity-40"><ChevronLeft size={15} /> Previous</button>
      <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-3 text-sm font-bold disabled:opacity-40">Next <ChevronRight size={15} /></button>
    </div>
  </nav>;
}
