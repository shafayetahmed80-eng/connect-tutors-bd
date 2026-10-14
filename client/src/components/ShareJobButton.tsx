import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  buildFacebookShareUrl,
  buildJobShareText,
  buildJobShareUrl,
  buildWhatsAppShareUrl,
  type JobShareInput,
} from "@shared/job-share";
import { shareJob } from "@/lib/shareJob";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { FacebookIcon } from "@/components/FacebookIcon";

/**
 * Sends one Job Board tuition to someone:
 * - On the primary Job Card (!labelled): a compact icon button that directly
 *   copies or opens the share sheet.
 * - In the Details Dialog (labelled): displays a labelled "Share" button that
 *   opens an accessible, modern popover menu with one-click direct options:
 *   WhatsApp, Facebook, Copy Link, Copy Full Details, and Device Share.
 */
export default function ShareJobButton({
  job,
  labelled = false,
}: {
  job: JobShareInput;
  labelled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDetails, setCopiedDetails] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const copyLinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyDetailsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyLinkTimer.current) clearTimeout(copyLinkTimer.current);
      if (copyDetailsTimer.current) clearTimeout(copyDetailsTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = buildJobShareUrl(origin, job.jobId);
  const shareText = buildJobShareText(job, shareUrl);

  const onQuickShare = async () => {
    const outcome = await shareJob(job);
    if (outcome === "copied") toast.success("Job details copied");
    else if (outcome === "failed") toast.error("Could not copy. Please copy the link from the address bar.");
  };

  const onCopyLink = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopiedLink(true);
      toast.success("Tuition link copied to clipboard");
      if (copyLinkTimer.current) clearTimeout(copyLinkTimer.current);
      copyLinkTimer.current = setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast.error("Could not copy link");
    }
  };

  const onCopyDetails = async () => {
    const ok = await copyToClipboard(shareText);
    if (ok) {
      setCopiedDetails(true);
      toast.success("Full tuition details copied");
      if (copyDetailsTimer.current) clearTimeout(copyDetailsTimer.current);
      copyDetailsTimer.current = setTimeout(() => setCopiedDetails(false), 2000);
    } else {
      toast.error("Could not copy details");
    }
  };

  const onWhatsApp = () => {
    const waUrl = buildWhatsAppShareUrl(shareText);
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const onFacebook = () => {
    const fbUrl = buildFacebookShareUrl(shareUrl);
    window.open(fbUrl, "_blank", "noopener,noreferrer,width=600,height=480");
    setIsOpen(false);
  };

  const onDeviceShare = async () => {
    setIsOpen(false);
    await onQuickShare();
  };

  if (!labelled) {
    return (
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          void onQuickShare();
        }}
        onKeyDown={event => event.stopPropagation()}
        aria-label="Share this tuition"
        title="Share"
        className="inline-flex h-8 w-8 max-md:h-10 max-md:w-10 items-center justify-center rounded-lg border border-[#dce9f1] bg-white text-[#173d60] transition-colors hover:bg-[#f1f6fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8]"
      >
        <Share2 size={14} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          setIsOpen(open => !open);
        }}
        onKeyDown={event => event.stopPropagation()}
        aria-label="Share this tuition"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="Share this tuition"
        className="inline-flex h-8 min-h-control items-center justify-center gap-1.5 rounded-lg border border-[#dce9f1] bg-white px-3.5 text-xs font-bold text-[#173d60] transition-colors hover:bg-[#f1f6fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8]"
      >
        <Share2 size={13} aria-hidden="true" />
        <span>Share</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Share options"
          onClick={event => event.stopPropagation()}
          className="absolute bottom-full left-0 mb-2 z-50 w-64 rounded-xl border border-[#dce8f0] bg-white p-2 shadow-[0_12px_28px_rgba(23,61,96,0.18)] animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="mb-1 flex items-center justify-between border-b border-[#eef4f9] px-2.5 py-1.5">
            <span className="text-xs font-bold text-j-ink">Share Tuition</span>
            <span className="rounded bg-[#f0f5fa] px-1.5 py-0.5 text-[10px] font-bold text-[#55738a]">
              ID: {job.jobId}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={onWhatsApp}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#173d60] transition-colors hover:bg-[#eef8f1] hover:text-[#128c7e]"
            >
              <WhatsAppIcon size={16} className="text-[#25d366] shrink-0" />
              <span>Share to WhatsApp</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={onFacebook}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#173d60] transition-colors hover:bg-[#edf4fc] hover:text-[#1877f2]"
            >
              <FacebookIcon size={16} className="text-[#1877f2] shrink-0" />
              <span>Share on Facebook</span>
            </button>

            {/* Copy Link */}
            <button
              type="button"
              onClick={onCopyLink}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-[#173d60] transition-colors hover:bg-[#f1f6fa]"
            >
              <span className="inline-flex items-center gap-2.5">
                {copiedLink ? (
                  <Check size={15} className="text-emerald-600 animate-in zoom-in-75 shrink-0" />
                ) : (
                  <Link2 size={15} className="text-[#8fb4d0] shrink-0" />
                )}
                <span className={copiedLink ? "font-bold text-emerald-700" : ""}>
                  {copiedLink ? "Link Copied!" : "Copy Link"}
                </span>
              </span>
              {copiedLink ? (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  Done
                </span>
              ) : null}
            </button>

            {/* Copy Full Details */}
            <button
              type="button"
              onClick={onCopyDetails}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-[#173d60] transition-colors hover:bg-[#f1f6fa]"
            >
              <span className="inline-flex items-center gap-2.5">
                {copiedDetails ? (
                  <Check size={15} className="text-emerald-600 animate-in zoom-in-75 shrink-0" />
                ) : (
                  <Copy size={15} className="text-[#8fb4d0] shrink-0" />
                )}
                <span className={copiedDetails ? "font-bold text-emerald-700" : ""}>
                  {copiedDetails ? "Details Copied!" : "Copy Full Details"}
                </span>
              </span>
              {copiedDetails ? (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  Done
                </span>
              ) : null}
            </button>

            {/* Native share on devices */}
            {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
              <button
                type="button"
                onClick={onDeviceShare}
                className="mt-1 flex w-full items-center gap-2.5 border-t border-[#eef4f9] px-2.5 pt-2 pb-1.5 text-xs font-semibold text-[#55738a] transition-colors hover:bg-[#f1f6fa] hover:text-j-ink"
              >
                <Share2 size={14} className="text-[#8fb4d0] shrink-0" />
                <span>More options...</span>
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
