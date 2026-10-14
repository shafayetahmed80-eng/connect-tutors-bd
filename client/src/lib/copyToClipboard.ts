/**
 * Copies text to the system clipboard.
 * Supports modern Clipboard API with graceful fallback to document.execCommand
 * for environments without HTTPS, tests, or legacy browsers.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to fallback textarea method
  }
  try {
    if (typeof document !== "undefined") {
      const box = document.createElement("textarea");
      box.value = text;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.opacity = "0";
      box.style.pointerEvents = "none";
      document.body.appendChild(box);
      box.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(box);
      return copied;
    }
  } catch {
    return false;
  }
  return false;
}
