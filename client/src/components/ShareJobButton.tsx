import { Share2 } from "lucide-react";
import { toast } from "sonner";
import type { JobShareInput } from "@shared/job-share";
import { shareJob } from "@/lib/shareJob";

/**
 * Sends one Job Board tuition to someone: the phone's share sheet, or the same
 * message copied on a laptop. The card it sits on opens the details when
 * pressed, so the button keeps its press and its keys to itself.
 */
export default function ShareJobButton({ job, labelled = false }: { job: JobShareInput; labelled?: boolean }) {
  const onShare = async () => {
    const outcome = await shareJob(job);
    if (outcome === "copied") toast.success("Job details copied");
    else if (outcome === "failed") toast.error("Could not copy. Please copy the link from the address bar.");
  };
  return <button
    type="button"
    onClick={event => { event.stopPropagation(); void onShare(); }}
    onKeyDown={event => event.stopPropagation()}
    aria-label="Share this tuition"
    title="Share"
    className={`inline-flex items-center justify-center rounded-lg border border-[#dce9f1] bg-white text-[#173d60] transition-colors hover:bg-[#f1f6fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8] ${labelled ? "h-8 gap-1.5 px-3.5 text-xs font-bold" : "h-8 w-8 max-md:h-10 max-md:w-10"}`}
  ><Share2 size={labelled ? 13 : 14} aria-hidden="true" />{labelled ? "Share" : null}</button>;
}
