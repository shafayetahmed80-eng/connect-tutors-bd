import { buildJobShareText, buildJobShareUrl, type JobShareInput } from "@shared/job-share";

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/** What the device can do, pulled out so the choice between them can be tested. */
export type ShareEnvironment = {
  origin: string;
  /** A phone or tablet: the share sheet is the natural way out there, a laptop's is not. */
  prefersShareSheet: boolean;
  share?: (data: { title: string; text: string }) => Promise<void>;
  copy: (text: string) => Promise<boolean>;
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the older route below.
  }
  // A page served without HTTPS has no clipboard API; a hidden box and the old copy command still work.
  try {
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(box);
    return copied;
  } catch {
    return false;
  }
}

export function currentShareEnvironment(): ShareEnvironment {
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const coarsePointer = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return {
    origin: window.location.origin,
    prefersShareSheet: canShare && coarsePointer,
    share: canShare ? data => navigator.share(data) : undefined,
    copy: copyToClipboard,
  };
}

/**
 * A phone opens its share sheet (WhatsApp, Messenger and the rest); a laptop
 * copies the same message. Backing out of the sheet is not an error, and a
 * sheet that fails for any other reason falls back to copying.
 */
export async function shareJob(job: JobShareInput, environment: ShareEnvironment = currentShareEnvironment()): Promise<ShareOutcome> {
  const url = buildJobShareUrl(environment.origin, job.jobId);
  const text = buildJobShareText(job, url);
  if (environment.prefersShareSheet && environment.share) {
    try {
      await environment.share({ title: job.title, text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  return (await environment.copy(text)) ? "copied" : "failed";
}
