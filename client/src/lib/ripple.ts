/**
 * Lightweight, zero-dependency, coordinate-based button ripple wave.
 * Generates a radial expanding wave originating at the exact click/touch coordinates.
 *
 * Honors `prefers-reduced-motion: reduce` for accessibility.
 */

export interface RippleOptions {
  /** Force specific color theme for the wave */
  variant?: "light" | "dark" | "accent";
}

export function isReducedMotionPreferred(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Creates an expanding ripple wave at the pointer coordinates on the target element.
 */
export function createRipple(
  event: React.MouseEvent<HTMLElement> | MouseEvent | React.PointerEvent<HTMLElement> | PointerEvent,
  options?: RippleOptions
): HTMLSpanElement | null {
  if (isReducedMotionPreferred()) return null;

  const target = (event.currentTarget || event.target) as HTMLElement | null;
  const button = target?.closest?.<HTMLElement>("button, [data-ripple], .btn-ripple, .button-primary");
  if (!button) return null;

  // Don't ripple disabled buttons
  if (
    (button as HTMLButtonElement).disabled ||
    button.getAttribute("aria-disabled") === "true" ||
    button.dataset.ripple === "false"
  ) {
    return null;
  }

  // Ensure button creates a local positioning context and clips overflowing wave
  const computedStyle = window.getComputedStyle(button);
  if (computedStyle.position === "static") {
    button.style.position = "relative";
  }
  if (computedStyle.overflow !== "hidden") {
    button.style.overflow = "hidden";
  }

  const rect = button.getBoundingClientRect();
  const hasCoords = typeof event.clientX === "number" && event.clientX > 0;
  const clickX = hasCoords ? event.clientX - rect.left : rect.width / 2;
  const clickY = hasCoords ? event.clientY - rect.top : rect.height / 2;

  // Compute radius to cover all corners
  const maxX = Math.max(clickX, rect.width - clickX);
  const maxY = Math.max(clickY, rect.height - clickY);
  const radius = Math.hypot(maxX, maxY);

  const wave = document.createElement("span");
  wave.setAttribute("aria-hidden", "true");

  // Determine wave tone based on button visual background
  let variant = options?.variant;
  if (!variant) {
    const isDarkBackground =
      button.classList.contains("text-white") ||
      button.classList.contains("bg-primary") ||
      button.classList.contains("bg-j-accent") ||
      button.className.includes("bg-[#1677e8]") ||
      button.className.includes("bg-[#0f7048]");
    variant = isDarkBackground ? "light" : "dark";
  }

  wave.className = `ripple-wave ${variant === "dark" ? "ripple-wave-dark" : "ripple-wave-light"}`;
  wave.style.left = `${clickX - radius}px`;
  wave.style.top = `${clickY - radius}px`;
  wave.style.width = `${radius * 2}px`;
  wave.style.height = `${radius * 2}px`;

  button.appendChild(wave);

  const cleanup = () => {
    if (wave.parentNode) {
      wave.parentNode.removeChild(wave);
    }
  };

  wave.addEventListener("animationend", cleanup, { once: true });
  setTimeout(cleanup, 700);

  return wave;
}

let listenerAttached = false;

/**
 * Initializes global pointerdown listener so any primary button or element with
 * data-ripple automatically receives smooth ripple motion.
 */
export function initButtonRippleListener(): () => void {
  if (typeof window === "undefined" || listenerAttached) {
    return () => {};
  }

  const handlePointerDown = (event: PointerEvent) => {
    // Only primary mouse button or touch
    if (event.button !== 0 && event.pointerType === "mouse") return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    try {
      const btn = target.closest<HTMLElement>("button, [data-ripple], .btn-ripple, .button-primary");
      if (!btn) return;

      const isPrimaryButton =
        btn.dataset.ripple === "true" ||
        btn.classList.contains("btn-ripple") ||
        btn.classList.contains("button-primary") ||
        btn.classList.contains("bg-j-accent") ||
        btn.classList.contains("bg-primary") ||
        btn.className.includes("bg-[#1677e8]") ||
        btn.className.includes("bg-[#0f7048]");

      if (isPrimaryButton) {
        createRipple(event);
      }
    } catch {
      // Gracefully handle DOM lookup issues
    }
  };

  document.addEventListener("pointerdown", handlePointerDown, { passive: true });
  listenerAttached = true;

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown);
    listenerAttached = false;
  };
}

// Auto-attach on client import
if (typeof window !== "undefined") {
  initButtonRippleListener();
}
