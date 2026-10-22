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
import { useIsMobile } from "@/hooks/useMobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function ShareOptionsList({
  copiedLink,
  copiedDetails,
  onWhatsApp,
  onFacebook,
  onCopyLink,
  onCopyDetails,
  onDeviceShare,
  isMobile,
}: {
  copiedLink: boolean;
  copiedDetails: boolean;
  onWhatsApp: () => void;
  onFacebook: () => void;
  onCopyLink: () => void;
  onCopyDetails: () => void;
  onDeviceShare: () => void;
  isMobile?: boolean;
}) {
  const iconSize = isMobile ? 18 : 16;
  const itemClass = isMobile
    ? "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#173d60] transition-colors active:bg-[#f1f6fa]"
    : "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#173d60] transition-colors hover:bg-[#f1f6fa]";

  return (
    <div className={`flex flex-col ${isMobile ? "gap-1" : "gap-0.5"}`}>
      {/* WhatsApp */}
      <button
        type="button"
        onClick={onWhatsApp}
        className={
          isMobile
            ? "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#173d60] transition-colors active:bg-[#eef8f1] hover:text-[#128c7e]"
            : "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#173d60] transition-colors hover:bg-[#eef8f1] hover:text-[#128c7e]"
        }
      >
        <WhatsAppIcon size={iconSize} className="text-[#25d366] shrink-0" />
        <span>Share to WhatsApp</span>
      </button>

      {/* Facebook */}
      <button
        type="button"
        onClick={onFacebook}
        className={
          isMobile
            ? "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#173d60] transition-colors active:bg-[#edf4fc] hover:text-[#1877f2]"
            : "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#173d60] transition-colors hover:bg-[#edf4fc] hover:text-[#1877f2]"
        }
      >
        <FacebookIcon size={iconSize} className="text-[#1877f2] shrink-0" />
        <span>Share on Facebook</span>
      </button>

      {/* Copy Link */}
      <button
        type="button"
        onClick={onCopyLink}
        className={`${itemClass} justify-between`}
      >
        <span className={`inline-flex items-center ${isMobile ? "gap-3" : "gap-2.5"}`}>
          {copiedLink ? (
            <Check size={iconSize} className="text-emerald-600 animate-in zoom-in-75 shrink-0" />
          ) : (
            <Link2 size={iconSize} className="text-[#8fb4d0] shrink-0" />
          )}
          <span className={copiedLink ? "font-bold text-emerald-700" : ""}>
            {copiedLink ? "Link Copied!" : "Copy Link"}
          </span>
        </span>
        {copiedLink ? (
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
            Done
          </span>
        ) : null}
      </button>

      {/* Copy Full Details */}
      <button
        type="button"
        onClick={onCopyDetails}
        className={`${itemClass} justify-between`}
      >
        <span className={`inline-flex items-center ${isMobile ? "gap-3" : "gap-2.5"}`}>
          {copiedDetails ? (
            <Check size={iconSize} className="text-emerald-600 animate-in zoom-in-75 shrink-0" />
          ) : (
            <Copy size={iconSize} className="text-[#8fb4d0] shrink-0" />
          )}
          <span className={copiedDetails ? "font-bold text-emerald-700" : ""}>
            {copiedDetails ? "Details Copied!" : "Copy Full Details"}
          </span>
        </span>
        {copiedDetails ? (
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
            Done
          </span>
        ) : null}
      </button>

      {/* Native share on devices */}
      {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
        <button
          type="button"
          onClick={onDeviceShare}
          className={`mt-1 flex w-full items-center gap-2.5 border-t border-[#eef4f9] ${
            isMobile ? "px-3.5 pt-3 pb-2 text-sm" : "px-2.5 pt-2 pb-1.5 text-xs"
          } font-semibold text-[#55738a] transition-colors hover:bg-[#f1f6fa] hover:text-j-ink`}
        >
          <Share2 size={iconSize} className="text-[#8fb4d0] shrink-0" />
          <span>More options...</span>
        </button>
      ) : null}
    </div>
  );
}

/**
 * Sends one Job Board tuition to someone:
 * - On the primary Job Card (!labelled): a compact icon button that directly
 *   copies or opens the share sheet.
 * - In the Details Dialog (labelled):
 *   - On mobile screens (Option 3): opens a native-like bottom drawer sheet
 *     (Sheet side="bottom") with safe area padding, drag handle, and clear touch targets.
 *   - On desktop/laptop screens: opens an accessible popover positioned above the button.
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
  const isMobile = useIsMobile();
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
    if (!isOpen || isMobile) return;
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
  }, [isOpen, isMobile]);

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

  const triggerButton = (
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
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {triggerButton}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          aria-label="Share options"
          className="max-h-[85dvh] w-full gap-0 rounded-t-3xl border-t border-j-border bg-white p-0 shadow-2xl sm:max-w-none"
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
          <SheetHeader className="border-b border-[#eef4f9] px-5 pb-3 pt-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-j-ink">Share Tuition</span>
              <span className="rounded bg-[#f0f5fa] px-2 py-0.5 text-xs font-bold text-[#55738a]">
                ID: {job.jobId}
              </span>
            </div>
            <SheetTitle className="sr-only">Share options</SheetTitle>
            <SheetDescription className="sr-only">Choose how to share this tuition opportunity</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-1 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <ShareOptionsList
              copiedLink={copiedLink}
              copiedDetails={copiedDetails}
              onWhatsApp={onWhatsApp}
              onFacebook={onFacebook}
              onCopyLink={onCopyLink}
              onCopyDetails={onCopyDetails}
              onDeviceShare={onDeviceShare}
              isMobile={true}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {triggerButton}

      {isOpen && (
        <div
          role="dialog"
          aria-label="Share options"
          onClick={event => event.stopPropagation()}
          className="absolute bottom-full left-0 max-sm:right-0 max-sm:left-auto mb-2 z-50 w-64 rounded-xl border border-[#dce8f0] bg-white p-2 shadow-[0_12px_28px_rgba(23,61,96,0.18)] animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="mb-1 flex items-center justify-between border-b border-[#eef4f9] px-2.5 py-1.5">
            <span className="text-xs font-bold text-j-ink">Share Tuition</span>
            <span className="rounded bg-[#f0f5fa] px-1.5 py-0.5 text-[10px] font-bold text-[#55738a]">
              ID: {job.jobId}
            </span>
          </div>

          <ShareOptionsList
            copiedLink={copiedLink}
            copiedDetails={copiedDetails}
            onWhatsApp={onWhatsApp}
            onFacebook={onFacebook}
            onCopyLink={onCopyLink}
            onCopyDetails={onCopyDetails}
            onDeviceShare={onDeviceShare}
            isMobile={false}
          />
        </div>
      )}
    </div>
  );
}
