import { useEffect } from "react";

/**
 * Holds the page still behind an open overlay.
 *
 * Without this the document keeps its own scroll while a dialog is up, so a
 * finger drag inside the dialog carries on into the page underneath once the
 * dialog's own content runs out - on a phone the two scroll areas read as one
 * broken one, and closing the dialog leaves the reader somewhere they never
 * meant to go.
 *
 * The count is module-level on purpose. Overlays nest here (a location picker
 * opens over a profile section modal), and a per-component lock would have the
 * inner one hand the scroll back the moment it closes while the outer is still
 * covering the page. Only the first lock writes the style and only the last
 * release restores it, so whatever `body.overflow` the page had - usually
 * nothing - is what it gets back.
 */
let lockCount = 0;
let restoreOverflow = "";

export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) {
      restoreOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = restoreOverflow;
    };
  }, [active]);
}
