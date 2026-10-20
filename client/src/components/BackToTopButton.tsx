import React, { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export interface BackToTopButtonProps {
  /** Scroll position in pixels after which the button becomes visible. Default: 400 */
  threshold?: number;
  /** Custom extra classes for positioning or styling */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

const RADIUS = 21;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Floating Action Button (FAB) that provides a smooth return to the top of the page.
 * Features a circular SVG scroll progress ring, our signature 3-pulse halo micro-interaction
 * on initial entrance, and interactive arrow lift motion.
 */
export default function BackToTopButton({
  threshold = 400,
  className = "",
  ariaLabel = "Back to top",
}: BackToTopButtonProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
      const p = scrollTotal > 0 ? Math.min(1, Math.max(0, currentScroll / scrollTotal)) : 0;
      setProgress(p);

      const isOver = currentScroll > threshold;
      setVisible(isOver);
      if (isOver && !hasEntered) {
        setHasEntered(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold, hasEntered]);

  const scrollToTop = useCallback(() => {
    setIsLaunching(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const timer = window.setTimeout(() => setIsLaunching(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div
      data-testid="back-to-top-container"
      className={`fixed bottom-6 right-5 sm:right-8 z-40 transition-all duration-300 ease-out motion-reduce:transition-none ${
        visible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-3 scale-90 pointer-events-none"
      } ${className}`}
    >
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={ariaLabel}
        data-testid="back-to-top-button"
        data-launching={isLaunching ? "true" : undefined}
        className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1677e8] shadow-[0_4px_16px_rgba(16,49,77,0.16)] ring-1 ring-[rgba(16,49,77,0.06)] transition-transform duration-200 hover:scale-105 hover:text-[#1267c8] hover:shadow-[0_8px_24px_rgba(16,49,77,0.22)] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8] focus-visible:ring-offset-2"
      >
        {/* 3-pulse halo upon entrance, adhering to the 3-pulse rule */}
        {visible && hasEntered ? (
          <span
            aria-hidden="true"
            data-testid="back-to-top-halo"
            className="button-ready-halo pointer-events-none absolute -inset-1 rounded-full motion-reduce:hidden"
          />
        ) : null}

        {/* Circular SVG progress ring */}
        <svg
          className="pointer-events-none absolute inset-0 -rotate-90"
          width="48"
          height="48"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          {/* Subtle track background */}
          <circle
            cx="24"
            cy="24"
            r={RADIUS}
            fill="none"
            stroke="#dbe8f2"
            strokeWidth="2.5"
            className="opacity-70"
          />
          {/* Active progress indicator */}
          <circle
            cx="24"
            cy="24"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-150 ease-out"
          />
        </svg>

        {/* Inner arrow icon with launch motion */}
        <ArrowUp
          size={20}
          strokeWidth={2.6}
          aria-hidden="true"
          className={`transition-transform duration-200 ease-out motion-reduce:transition-none ${
            isLaunching
              ? "-translate-y-1 scale-110 motion-reduce:transform-none"
              : "group-hover:-translate-y-0.5 motion-reduce:transform-none"
          }`}
        />
      </button>
    </div>
  );
}
