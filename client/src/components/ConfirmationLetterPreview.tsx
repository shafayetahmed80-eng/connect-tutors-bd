import { Download, FileText } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { LoadingCradle } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { base64ToBytes, renderPdfPages, saveFile } from "@/lib/pdfPreview";
import { trpc } from "@/lib/trpc";

/**
 * "View letter": the Confirmation Letter opens in a window inside the site,
 * the same on every device, and "Download PDF" saves it under a name that
 * says what it is. Shared by the Tutor and Guardian letter lists.
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
  const bytes = useMemo(() => (fileQuery.data ? base64ToBytes(fileQuery.data.pdfBase64) : null), [fileQuery.data]);
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

  const loading = fileQuery.isLoading || (bytes !== null && drawing === "waiting");
  const download = () => {
    if (bytes && fileQuery.data) saveFile(bytes, fileQuery.data.fileName);
  };

  return <Modal size="lg" onClose={onClose}>
    <ModalHeader title="Confirmation Letter" meta={letterNumber} />
    <ModalBody className="bg-j-surface-sunken">
      {loading ? <div className="flex min-h-72 items-center justify-center text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Preparing your letter…</div> : null}
      {fileQuery.error ? <div role="alert" className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-sm text-sm font-semibold text-j-err">{fileQuery.error.message}</p>
        <Button type="button" variant="outline" onClick={() => { void fileQuery.refetch(); }}>Try again</Button>
      </div> : null}
      {drawing === "failed" ? <p role="alert" className="rounded-xl border border-j-border bg-white p-4 text-sm text-j-ink-soft">
        This device could not show the letter here. Download the PDF to open it.
      </p> : null}
      <div
        ref={pagesRef}
        role="img"
        aria-label={`Confirmation Letter ${letterNumber}`}
        className="mx-auto grid w-full max-w-[42rem] gap-4 [&>canvas]:rounded-sm [&>canvas]:bg-white [&>canvas]:shadow-[0_10px_28px_rgba(16,40,73,0.14)]"
      />
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Close</button>
      <button
        type="button"
        onClick={download}
        disabled={!bytes}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-j-accent px-4 text-sm font-bold text-white transition hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="size-4" aria-hidden="true" /> Download PDF
      </button>
    </ModalFooter>
  </Modal>;
}
