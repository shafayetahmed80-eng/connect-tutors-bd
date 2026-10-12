import { cn } from "@/lib/utils";
import { RecordIcon } from "@/components/recordIcons";

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
 */
export function JobIdTag({ jobId, bare = false, colon = true, iconSize = 12, className }: {
  jobId: string;
  bare?: boolean;
  colon?: boolean;
  iconSize?: number;
  className?: string;
}) {
  return <span data-job-id="" className={cn("inline-flex items-center gap-1.5 font-bold uppercase tracking-[.16em] text-[#1680c2]", className)}>
    <RecordIcon name="jobId" size={iconSize} className="shrink-0 text-[#8fb4d0]" />
    {bare ? jobId : <>Job ID{colon ? " :" : ""} {jobId}</>}
  </span>;
}
