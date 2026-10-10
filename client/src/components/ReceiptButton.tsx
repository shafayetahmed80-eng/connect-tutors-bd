import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { base64ToBytes, saveFile } from "@/lib/pdfPreview";

export type ReceiptFile = { fileName: string; pdfBase64: string };

/**
 * Downloads a receipt as a PDF. The file is asked for only when the button is
 * pressed, so a list of payments does not draw one receipt per row.
 */
export default function ReceiptButton({ label, ariaLabel, load, className = "" }: {
  label: string;
  ariaLabel: string;
  load: () => Promise<ReceiptFile>;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const file = await load();
      saveFile(base64ToBytes(file.pdfBase64), file.fileName);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The receipt could not be downloaded.");
    } finally {
      setBusy(false);
    }
  };
  return <button
    type="button"
    disabled={busy}
    aria-label={ariaLabel}
    onClick={() => void download()}
    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-j-border bg-white px-3 text-2xs font-bold text-j-accent hover:bg-sky-50 disabled:opacity-50 ${className}`}
  >
    <Download size={13} aria-hidden={true} /> {busy ? "Preparing…" : label}
  </button>;
}
