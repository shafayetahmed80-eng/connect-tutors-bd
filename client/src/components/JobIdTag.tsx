import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecordIcon } from "@/components/recordIcons";
import { copyToClipboard } from "@/lib/copyToClipboard";

/**
 * A Job ID, the one way it is drawn wherever it is shown as a mark of its own:
 * deep blue, bold, upper case with a wide letter-space, behind a `#` that is a
 * paler blue than the lettering so it reads as a badge rather than a word.
 * It is the look the Tutor's Status cards gave it.
 *
 * It sets no size: it takes the size of the line it sits in, so the Owner's
 * text sizes for a job card and for its dialog still decide how large it is
 * (the Status card passes `text-xs`).
 *
 *  - Default: "# JOB ID : 6800", for a card or a header with nothing else saying what the number is.
 *  - `bare`: "# 6800", for a table column whose heading already says Job ID.
 *  - `colon={false}`: "# JOB ID 6800", for a Job ID inside a sentence - a dialog's title or its
 *    subtitle - where a colon would read as punctuation. The text underneath is unchanged
 *    ("Job ID 6800"): the upper case is the style's, not the words', so a screen reader and a
 *    dialog's name still read it as it always did.
 *  - `copyable`: true by default. Tapping or clicking it copies the clean numeric ID
 *    to clipboard with a tactile spring-bounce motion, checkmark transition, and a floating
 *    "কপি হয়েছে!" tooltip.
 */
export function JobIdTag({
  jobId,
  bare = false,
  colon = true,
  iconSize = 12,
  copyable = true,
  className,
}: {
  jobId: string;
  bare?: boolean;
  colon?: boolean;
  iconSize?: number;
  copyable?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const numericId = jobId.replace(/\D/g, "") || jobId.trim();

  const handleCopy = (e: React.MouseEvent) => {
    if (!copyable) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();

    void copyToClipboard(numericId);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!copyable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();

      void copyToClipboard(numericId);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <span
      data-job-id=""
      data-copied={copied ? "true" : undefined}
      role={copyable ? "button" : undefined}
      tabIndex={copyable ? 0 : undefined}
      onClick={copyable ? handleCopy : undefined}
      onKeyDown={copyable ? handleKeyDown : undefined}
      title={copyable ? "Job ID কপি করতে ক্লিক করুন" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 font-bold uppercase tracking-[.16em] text-[#1680c2]",
        copyable &&
          "group/jobid relative cursor-pointer select-none rounded px-1 -mx-1 py-0.5 transition-all duration-200 hover:bg-[#eef6fc] hover:text-[#1267c8] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1680c2]",
        copied && "jobid-copied text-emerald-600 bg-emerald-50 hover:bg-emerald-50",
        className,
      )}
    >
      <RecordIcon
        name="jobId"
        size={iconSize}
        className={cn("shrink-0 transition-colors", copied ? "text-emerald-500" : "text-[#8fb4d0]")}
      />
      {bare ? jobId : <>Job ID{colon ? " :" : ""} {jobId}</>}
      {copyable ? (
        copied ? (
          <Check
            size={Math.max(10, iconSize - 1)}
            aria-hidden="true"
            className="shrink-0 text-emerald-600 animate-in zoom-in-75 duration-200"
          />
        ) : (
          <Copy
            size={Math.max(10, iconSize - 1)}
            aria-hidden="true"
            className="shrink-0 text-[#8fb4d0] opacity-70 transition-all duration-200 group-hover/jobid:opacity-100 group-hover/jobid:text-[#1680c2]"
          />
        )
      ) : null}
      {copied ? (
        <span
          aria-hidden="true"
          className="jobid-copy-tooltip absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#173d60] px-2 py-0.5 text-[10px] font-semibold tracking-normal normal-case text-white shadow-md z-30"
        >
          কপি হয়েছে!
        </span>
      ) : null}
    </span>
  );
}
