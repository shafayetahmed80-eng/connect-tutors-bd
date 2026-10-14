import React, { useEffect, useState } from "react";
import { isReducedMotionPreferred } from "@/lib/ripple";

export interface CelebrationConfettiProps {
  /** Total number of confetti particles to emit (default: 32) */
  count?: number;
  /** Whether the confetti animation is currently active (default: true) */
  active?: boolean;
  /** Duration in milliseconds before particles auto-unmount (default: 2400) */
  durationMs?: number;
  /** Additional container classes */
  className?: string;
}

interface ParticleConfig {
  id: number;
  x: number;
  y: number;
  gravity: number;
  rotation: number;
  delay: number;
  duration: number;
  color: string;
  shape: "rect" | "circle" | "diamond";
  size: { w: number; h: number };
}

const CONFETTI_COLORS = [
  "#10b981", // Emerald green
  "#1677e8", // Brand sky blue
  "#f59e0b", // Amber gold
  "#f43f5e", // Coral rose
  "#8b5cf6", // Royal purple
  "#06b6d4", // Vibrant cyan
  "#14b8a6", // Teal
  "#fbbf24", // Sun yellow
];

/**
 * Deterministically generates particle trajectory parameters for smooth radial burst.
 */
function generateParticles(count: number): ParticleConfig[] {
  const particles: ParticleConfig[] = [];
  const shapes: Array<"rect" | "circle" | "diamond"> = ["rect", "circle", "diamond", "rect"];

  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * 2 * Math.PI;
    // Controlled jitter so particles spread naturally around the circle
    const angleJitter = ((((i * 13) % 25) - 12) * Math.PI) / 180;
    const angle = baseAngle + angleJitter;

    // Radius between 48px and 125px
    const distance = 48 + ((i * 19) % 52) + ((i * 7) % 28);
    const x = Math.round(Math.cos(angle) * distance);
    const y = Math.round(Math.sin(angle) * distance);

    const gravity = 18 + ((i * 11) % 26);
    const rotation = ((i * 67) % 720) - 360;
    const delay = (i % 7) * 25;
    const duration = 1000 + ((i * 29) % 450);

    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const shape = shapes[i % shapes.length];
    const isCircle = shape === "circle";
    const isDiamond = shape === "diamond";

    const size = isCircle
      ? { w: 6, h: 6 }
      : isDiamond
        ? { w: 6, h: 6 }
        : { w: 8 + ((i * 3) % 4), h: 4 + ((i * 2) % 3) };

    particles.push({
      id: i,
      x,
      y,
      gravity,
      rotation,
      delay,
      duration,
      color,
      shape,
      size,
    });
  }

  return particles;
}

/**
 * Celebration Confetti component that bursts outward from its center point.
 * Used in success confirmations, application modals, and celebration states.
 *
 * Fully accessible: hides from screen readers (`aria-hidden="true"`), never intercepts pointer events,
 * and honors `prefers-reduced-motion`.
 */
export function CelebrationConfetti({
  count = 32,
  active = true,
  durationMs = 2400,
  className = "",
}: CelebrationConfettiProps) {
  const [reducedMotion, setReducedMotion] = useState(isReducedMotionPreferred);
  const [mounted, setMounted] = useState(() => active && !isReducedMotionPreferred());

  useEffect(() => {
    const isReduced = isReducedMotionPreferred();
    setReducedMotion(isReduced);
    if (!active || isReduced) {
      setMounted(false);
      return;
    }

    setMounted(true);
    const timer = setTimeout(() => {
      setMounted(false);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [active, durationMs]);

  if (!mounted || reducedMotion) return null;

  const particles = generateParticles(count);

  return (
    <div
      aria-hidden="true"
      data-testid="celebration-confetti"
      className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-visible ${className}`}
    >
      <div className="relative h-0 w-0">
        {particles.map(p => (
          <span
            key={p.id}
            className={`confetti-particle ${p.shape === "circle" ? "rounded-full" : p.shape === "diamond" ? "rotate-45" : "rounded-xs"}`}
            style={
              {
                backgroundColor: p.color,
                width: `${p.size.w}px`,
                height: `${p.size.h}px`,
                "--particle-x": `${p.x}px`,
                "--particle-y": `${p.y}px`,
                "--particle-gravity": `${p.gravity}px`,
                "--particle-rot": `${p.rotation}deg`,
                "--particle-delay": `${p.delay}ms`,
                "--particle-duration": `${p.duration}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
export default CelebrationConfetti;
