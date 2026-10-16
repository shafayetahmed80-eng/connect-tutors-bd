import { Download, FileText, Printer } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { LoadingCradle } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { base64ToBytes, renderPdfPages, saveFile } from "@/lib/pdfPreview";
import { trpc } from "@/lib/trpc";

export type TutorCvPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tutorName?: string;
  tutorNumber?: number | string | null;
};

export function TutorCvPreviewModal({ isOpen, onClose, tutorName, tutorNumber }: TutorCvPreviewModalProps) {
  if (!isOpen) return null;

  const cvQuery = trpc.tutor.getMyCvPdf.useQuery(undefined, {
    enabled: isOpen,
    staleTime: 60_000,
  });

  const bytes = useMemo(() => (cvQuery.data?.pdfBase64 ? base64ToBytes(cvQuery.data.pdfBase64) : null), [cvQuery.data?.pdfBase64]);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState<"waiting" | "drawn" | "failed">("waiting");

  useEffect(() => {
    const container = pagesRef.current;
    if (!bytes || !container) return;
    let active = true;
    setDrawing("waiting");
    renderPdfPages(bytes, container).then(
      () => {
        if (active) setDrawing("drawn");
      },
      () => {
        if (active) setDrawing("failed");
      },
    );
    return () => {
      active = false;
    };
  }, [bytes]);

  const loading = cvQuery.isLoading || (bytes !== null && drawing === "waiting");
  const ready = bytes && cvQuery.data ? { bytes, fileName: cvQuery.data.fileName } : null;

  const handlePrint = () => {
    if (!ready) return;
    const blob = new Blob([ready.bytes], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
    };
  };

  const titleMeta = tutorNumber ? `Tutor ID: ${tutorNumber}` : tutorName || undefined;

  return (
    <Modal size="panel" onClose={onClose}>
      <ModalHeader
        title="Official Tutor CV & Biodata"
        meta={titleMeta}
      />
      <ModalBody className="bg-j-surface-sunken">
        {loading ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-j-ink-soft">
            <LoadingCradle />
            <p className="font-medium">Generating your official 1-page CV & Biodata…</p>
          </div>
        ) : null}

        {cvQuery.error ? (
          <div role="alert" className="flex min-h-56 flex-col items-center justify-center gap-4 text-center p-6">
            <p className="max-w-md text-sm font-semibold text-j-err">{cvQuery.error.message}</p>
            <Button type="button" variant="outline" onClick={() => void cvQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}

        {drawing === "failed" ? (
          <div role="alert" className="m-4 rounded-xl border border-j-border bg-white p-6 text-center text-sm text-j-ink-soft">
            <p className="font-semibold text-j-ink">Preview could not be displayed on this browser directly.</p>
            <p className="mt-1 text-xs text-j-ink-muted">Please click Download PDF below to view your official document.</p>
          </div>
        ) : null}

        <div
          ref={pagesRef}
          role="img"
          aria-label={`Official Tutor CV & Biodata for ${tutorName || "Tutor"}`}
          className="mx-auto grid w-full max-w-[42rem] gap-4 p-2 [&>canvas]:rounded-md [&>canvas]:bg-white [&>canvas]:shadow-[0_12px_32px_rgba(16,40,73,0.18)]"
        />
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="h-control rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft transition hover:bg-j-surface-muted"
        >
          Close
        </button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            disabled={!ready}
            className="inline-flex h-control items-center gap-1.5 rounded-xl border-j-border text-sm font-bold text-j-ink transition hover:bg-j-surface-muted disabled:opacity-50"
          >
            <Printer className="size-4" aria-hidden="true" /> Print
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (ready) saveFile(ready.bytes, ready.fileName);
            }}
            disabled={!ready}
            className="inline-flex h-control items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="size-4" aria-hidden="true" /> Download PDF
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
