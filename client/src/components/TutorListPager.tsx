import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * Previous and Next under a paged list of Tutors; absent while one page holds
 * them all. Passing `pageSize` turns on the "advanced" controls a long ranked
 * list needs on top of that - jump to the first or last page, and choose how
 * many rows a page holds - which stay hidden for every plain paged list that
 * does not ask for them.
 */
export function TutorListPager({ page, totalPages, onPage, label, pageSize, pageSizeOptions, onPageSize }: {
  page: number;
  totalPages: number;
  onPage: (next: number) => void;
  label: string;
  /** The rows-per-page control; omitted, this stays the plain Previous/Next pager. */
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onPageSize?: (next: number) => void;
}) {
  if (totalPages <= 1 && pageSize === undefined) return null;
  const advanced = pageSize !== undefined && pageSizeOptions !== undefined && onPageSize !== undefined;
  return <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-j-border bg-white p-3 shadow-sm">
    <p className="text-sm text-j-ink-soft">Page {page} of {totalPages}</p>
    <div className="flex flex-wrap items-center gap-2">
      {advanced ? <label className="flex items-center gap-1.5 text-sm text-j-ink-soft">
        Rows per page
        <select
          aria-label={`${label} - rows per page`}
          value={pageSize}
          onChange={event => onPageSize(Number(event.target.value))}
          className="h-9 rounded-lg border border-j-border bg-white px-2 text-sm font-bold outline-none focus:border-j-accent"
        >{pageSizeOptions.map(option => <option key={option} value={option}>{option}</option>)}</select>
      </label> : null}
      {advanced ? <button type="button" disabled={page <= 1} onClick={() => onPage(1)} aria-label={`${label} - first page`} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-j-border disabled:opacity-40"><ChevronsLeft size={15} /></button> : null}
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-3 text-sm font-bold disabled:opacity-40"><ChevronLeft size={15} /> Previous</button>
      <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-3 text-sm font-bold disabled:opacity-40">Next <ChevronRight size={15} /></button>
      {advanced ? <button type="button" disabled={page >= totalPages} onClick={() => onPage(totalPages)} aria-label={`${label} - last page`} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-j-border disabled:opacity-40"><ChevronsRight size={15} /></button> : null}
    </div>
  </nav>;
}
