import { Download, FileText, ShieldCheck } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { LoadingCradle } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { base64ToBytes, renderPdfPages, saveFile } from "@/lib/pdfPreview";
import { trpc } from "@/lib/trpc";

type LetterFileQuery = {
  data?: { fileName: string; pdfBase64: string };
  isLoading: boolean;
  error: { message: string } | null;
  refetch: () => unknown;
};

type ReadyLetter = { bytes: Uint8Array; fileName: string };

/**
 * A letter's PDF drawn inside a window, the same on every device, with the
 * caller's own actions beneath it: Download for the Guardian and Tutor,
 * Issue for the Admin reviewing a draft.
 */
function LetterPdfModal({ title, meta, label, file, onClose, busy, notice, actions }: {
  title: string;
  meta: React.ReactNode;
  label: string;
  file: LetterFileQuery;
  onClose: () => void;
  busy?: boolean;
  /** A message above the letter, e.g. why issuing failed. */
  notice?: React.ReactNode;
  actions: (ready: ReadyLetter | null) => React.ReactNode;
}) {
  const bytes = useMemo(() => (file.data ? base64ToBytes(file.data.pdfBase64) : null), [file.data]);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState<"waiting" | "drawn" | "failed">("waiting");

  useEffect(() => {
    const container = pagesRef.current;
    if (!bytes || !container) return;
    let current = true;
    setDrawing("waiting");
    renderPdfPages(bytes, container).then(
      () => { if (current) setDrawing("drawn"); },
      () => { if (current) setDrawing("failed"); },
    );
    return () => { current = false; };
  }, [bytes]);

  const loading = file.isLoading || (bytes !== null && drawing === "waiting");
  const ready = bytes && file.data ? { bytes, fileName: file.data.fileName } : null;

  return <Modal size="lg" onClose={onClose} busy={busy}>
    <ModalHeader title={title} meta={meta} />
    <ModalBody className="bg-j-surface-sunken">
      {notice}
      {loading ? <div className="flex min-h-72 items-center justify-center text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Preparing your letter…</div> : null}
      {file.error ? <div role="alert" className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-sm text-sm font-semibold text-j-err">{file.error.message}</p>
        <Button type="button" variant="outline" onClick={() => { void file.refetch(); }}>Try again</Button>
      </div> : null}
      {drawing === "failed" ? <p role="alert" className="rounded-xl border border-j-border bg-white p-4 text-sm text-j-ink-soft">
        This device could not show the letter here. Download the PDF to open it.
      </p> : null}
      <div
        ref={pagesRef}
        role="img"
        aria-label={label}
        className="mx-auto grid w-full max-w-[42rem] gap-4 [&>canvas]:rounded-sm [&>canvas]:bg-white [&>canvas]:shadow-[0_10px_28px_rgba(16,40,73,0.14)]"
      />
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft disabled:opacity-50">Close</button>
      {actions(ready)}
    </ModalFooter>
  </Modal>;
}

/**
 * "View letter": the Confirmation Letter opens in a window inside the site,
 * and "Download PDF" saves it under a name that says what it is. Shared by
 * the Tutor and Guardian letter lists.
 */
export function ConfirmationLetterViewButton({ letterId, letterNumber, className }: { letterId: number; letterNumber: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" variant="outline" className={className} onClick={() => setOpen(true)}>
      <FileText className="size-4" aria-hidden="true" /> View letter
    </Button>
    {open ? <ConfirmationLetterPreview letterId={letterId} letterNumber={letterNumber} onClose={() => setOpen(false)} /> : null}
  </>;
}

export function ConfirmationLetterPreview({ letterId, letterNumber, onClose }: { letterId: number; letterNumber: string; onClose: () => void }) {
  const fileQuery = trpc.confirmationLetters.file.useQuery({ letterId }, { retry: false, staleTime: 5 * 60_000 });
  return <LetterPdfModal
    title="Confirmation Letter"
    meta={letterNumber}
    label={`Confirmation Letter ${letterNumber}`}
    file={fileQuery}
    onClose={onClose}
    actions={ready => <button
      type="button"
      onClick={() => { if (ready) saveFile(ready.bytes, ready.fileName); }}
      disabled={!ready}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-j-accent px-4 text-sm font-bold text-white transition hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Download className="size-4" aria-hidden="true" /> Download PDF
    </button>}
  />;
}

export type ConfirmationLetterTerms = { letterId: number; agreedStartDate: string; agreedFeeMinimum: number; agreedFeeMaximum: number };

/**
 * The Admin's look at a draft before it is issued: the letter exactly as it
 * would go out with these terms, marked "DRAFT · NOT ISSUED" across the page,
 * and the Issue button right under it. Nothing is saved by previewing.
 */
export function ConfirmationLetterDraftPreview({ terms, onClose, onIssue, issuing, issueError }: {
  terms: ConfirmationLetterTerms;
  onClose: () => void;
  onIssue: () => void;
  issuing: boolean;
  issueError?: string | null;
}) {
  const previewQuery = trpc.admin.previewConfirmationLetter.useQuery(terms, { retry: false });
  return <LetterPdfModal
    title="Confirmation Letter preview"
    meta="Draft · not issued yet"
    label="Confirmation Letter draft preview"
    file={previewQuery}
    onClose={onClose}
    busy={issuing}
    notice={issueError ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{issueError}</p> : null}
    actions={ready => <button
      type="button"
      onClick={onIssue}
      disabled={!ready || issuing}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ShieldCheck className="size-4" aria-hidden="true" /> {issuing ? "Issuing letter…" : "Issue letter"}
    </button>}
  />;
}
