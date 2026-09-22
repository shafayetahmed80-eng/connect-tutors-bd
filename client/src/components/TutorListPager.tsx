import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useMobile";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

/**
 * Which page numbers a pager shows, ellipsis and all.
 *
 * Five pages or fewer: every one of them. More than that: the first, the
 * last, and a short run around the current page, so the strip never grows
 * past seven buttons no matter how many pages there are behind it.
 */
export function buildPageNumbers({ page, totalPages }: { page: number; totalPages: number }): Array<number | "ellipsis"> {
  const lastPage = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), lastPage);
  if (lastPage <= 5) return Array.from({ length: lastPage }, (_, index) => index + 1);
  if (currentPage <= 2) return [1, 2, 3, "ellipsis", lastPage];
  if (currentPage >= lastPage - 1) return [1, "ellipsis", lastPage - 2, lastPage - 1, lastPage];
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", lastPage];
}

const pillClass = (active: boolean) =>
  `motion-interactive grid min-h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-bold disabled:cursor-progress ${active ? "bg-j-accent text-white" : "text-j-ink-soft hover:bg-j-surface-sunken"}`;

/**
 * The one pager every paged list in the app shares.
 *
 * A laptop reads the numbered strip at a glance and jumps straight to page
 * 12; a thumb cannot land on a button that size, so a phone gets one wide
 * "Page X of Y" button instead, opening a sheet to scroll through every page
 * and confirm with Done - the same split a mouse and a thumb get everywhere
 * else in this app that offers many choices in a small space.
 *
 * `pageSize`/`pageSizeOptions`/`onPageSize` turn on the rows-per-page control,
 * for the lists long enough that "20 rows" is itself a choice worth offering;
 * a short, one-tuition-scoped list omits them and stays exactly as small as
 * the numbered strip alone.
 */
export function TutorListPager({ page, totalPages, onPage, label, pageSize, pageSizeOptions, onPageSize, totalItems }: {
  page: number;
  totalPages: number;
  onPage: (next: number) => void;
  label: string;
  /** The rows-per-page control; omitted, the pager offers no page-size choice. */
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onPageSize?: (next: number) => void;
  /** Powers the "X-Y of Z" count; omitted, the pager shows no count. */
  totalItems?: number;
}) {
  const isMobile = useIsMobile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftPage, setDraftPage] = useState(page);
  const advanced = pageSize !== undefined && pageSizeOptions !== undefined && onPageSize !== undefined;

  if (totalPages <= 1 && !advanced) return null;

  const lastPage = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const goPrevious = () => onPage(Math.max(1, currentPage - 1));
  const goNext = () => onPage(Math.min(lastPage, currentPage + 1));
  const openPicker = () => { setDraftPage(currentPage); setPickerOpen(true); };
  const confirmPicker = () => { onPage(draftPage); setPickerOpen(false); };

  const rangeLabel = totalItems !== undefined && totalItems > 0
    ? `${(currentPage - 1) * (pageSize ?? 1) + 1}–${Math.min(currentPage * (pageSize ?? totalItems), totalItems)} of ${totalItems}`
    : null;

  return <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-j-border bg-white p-3 shadow-sm">
    <div className="flex flex-wrap items-center gap-3">
      {advanced ? <select
        aria-label={`${label} - rows per page`}
        value={pageSize}
        onChange={event => onPageSize(Number(event.target.value))}
        className="h-9 rounded-lg border border-j-border bg-white px-2 text-sm font-bold outline-none focus:border-j-accent"
      >{pageSizeOptions.map(option => <option key={option} value={option}>{option}</option>)}</select> : null}
      {rangeLabel ? <span className="text-sm font-semibold text-j-ink-muted">{rangeLabel}</span> : null}
    </div>

    <div className="flex items-center gap-1">
      <button type="button" disabled={currentPage <= 1} onClick={goPrevious} aria-label="Previous page" className="motion-interactive inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-2.5 text-sm font-bold text-j-ink-soft disabled:opacity-40"><ChevronLeft size={15} /> <span className="hidden sm:inline">Previous</span></button>

      {isMobile
        ? <button type="button" onClick={openPicker} className="motion-interactive inline-flex h-9 items-center rounded-lg border border-j-border px-3 text-sm font-bold text-j-ink-strong">Page {currentPage} of {lastPage}</button>
        : <ol className="flex items-center gap-1" aria-label={`Page ${currentPage} of ${lastPage}`}>
            {buildPageNumbers({ page: currentPage, totalPages: lastPage }).map((entry, index) => entry === "ellipsis"
              ? <li key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-sm font-bold text-j-ink-faint">…</li>
              : <li key={entry}><button type="button" onClick={() => onPage(entry)} aria-current={entry === currentPage ? "page" : undefined} aria-label={`Go to page ${entry}`} className={pillClass(entry === currentPage)}>{entry}</button></li>)}
          </ol>}

      <button type="button" disabled={currentPage >= lastPage} onClick={goNext} aria-label="Next page" className="motion-interactive inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-2.5 text-sm font-bold text-j-ink-soft disabled:opacity-40"><span className="hidden sm:inline">Next</span> <ChevronRight size={15} /></button>
    </div>

    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
      <SheetContent side="bottom" aria-label={`${label} - select page`} className="max-h-[70dvh] w-full gap-0 rounded-t-3xl border-j-border bg-white p-0 sm:max-w-none">
        <SheetHeader className="border-b border-[#eef4f9] px-5 pb-3 pt-5"><SheetTitle>Select page</SheetTitle></SheetHeader>
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 py-6" role="listbox" aria-label="Page numbers">
          {Array.from({ length: lastPage }, (_, index) => index + 1).map(number => <button
            key={number}
            type="button"
            role="option"
            aria-selected={draftPage === number}
            onClick={() => setDraftPage(number)}
            className={`grid h-11 w-11 shrink-0 snap-center place-items-center rounded-xl text-base font-bold ${draftPage === number ? "bg-j-accent text-white" : "bg-j-surface-sunken text-j-ink-soft"}`}
          >{number}</button>)}
        </div>
        <SheetFooter className="border-t border-[#eef4f9] px-5 py-4">
          <button type="button" onClick={confirmPicker} className="h-11 w-full rounded-xl bg-j-accent text-sm font-bold text-white">Done</button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </nav>;
}
