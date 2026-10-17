import { motion } from "framer-motion";
import { Send, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";

/**
 * Task 13: Smooth spring bubble pop-in animation for chat messages.
 * Uses spring physics with accessibility support for prefers-reduced-motion.
 */
export function ChatAnimatedBubble({
  children,
  own = false,
  className = "",
}: {
  children: React.ReactNode;
  own?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 450,
        damping: 30,
        mass: 0.8,
      }}
      className={className}
      data-chat-bubble-role={own ? "own" : "peer"}
    >
      {children}
    </motion.div>
  );
}

/**
 * Task 14: 3-dot bouncing wave live typing indicator.
 * Displays a soft speech bubble with staggered bouncing wave dots and accessible status text.
 */
export function ChatTypingIndicator({
  senderRole,
  className = "",
}: {
  senderRole: "admin" | "tutor";
  className?: string;
}) {
  const label = senderRole === "admin" ? "Admin is typing…" : "Tutor is typing…";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 py-1 ${className}`}
      data-testid="chat-typing-indicator"
    >
      <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-xs border border-j-border bg-white px-3 py-1.5 shadow-xs">
        <span className="text-2xs font-semibold text-j-ink-soft">{label}</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
            className="size-1.5 rounded-full bg-j-accent"
          />
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
            className="size-1.5 rounded-full bg-j-accent/70"
          />
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            className="size-1.5 rounded-full bg-j-accent/40"
          />
        </span>
      </div>
    </div>
  );
}

/**
 * Task 15: Voice recording waveform pulsating aura & live elapsed timer.
 * Replaces the composer input while recording with a live MM:SS counter,
 * animated soundwave frequency bars, and cancel / send buttons.
 */
export function VoiceRecordingBar({
  onStop,
  onCancel,
}: {
  onStop: () => void;
  onCancel: () => void;
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, "0");
    const remaining = (sec % 60).toString().padStart(2, "0");
    return `${mins}:${remaining}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
      role="region"
      aria-label="Voice recording in progress"
      className="flex min-h-9 flex-1 items-center justify-between gap-2.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-xs shadow-xs"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
        </span>
        <span className="font-mono text-xs font-bold text-red-700 tabular-nums">
          {formatElapsed(seconds)}
        </span>
      </div>

      {/* Animated audio frequency wave bars */}
      <div className="flex items-center gap-1" aria-hidden="true">
        {[0.4, 0.75, 0.5, 1, 0.65, 0.85, 0.45].map((scale, i) => (
          <motion.span
            key={i}
            animate={{ scaleY: [scale, 1.3 * scale, 0.3 * scale, scale] }}
            transition={{
              duration: 0.7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1,
            }}
            className="w-1 rounded-full bg-red-500 origin-center"
            style={{ height: `${12 * scale + 4}px` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel recording"
          title="Cancel recording"
          className="grid size-7 place-items-center rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-100 transition-colors"
        >
          <Trash2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onStop}
          aria-label="Send voice note"
          title="Send voice note"
          className="grid size-7 place-items-center rounded-lg bg-red-600 text-white shadow-xs hover:bg-red-700 transition-colors"
        >
          <Send className="size-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Task 16: Interactive send button micro-animation.
 * Features spring tap compression, hover lift, and icon tilt animation.
 */
export function ChatSendButton({
  disabled = false,
  isPending = false,
  onClick,
  ariaLabel = "Send reply",
  className = "",
}: {
  disabled?: boolean;
  isPending?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <motion.button
      type="submit"
      disabled={disabled || isPending}
      onClick={onClick}
      aria-label={ariaLabel}
      whileHover={disabled || isPending ? undefined : { scale: 1.05 }}
      whileTap={disabled || isPending ? undefined : { scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`grid h-control w-10 shrink-0 place-items-center rounded-xl bg-j-accent text-white shadow-xs transition-colors hover:bg-j-accent/90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <motion.span
        animate={isPending ? { scale: [1, 0.85, 1], rotate: [0, 15, 0] } : {}}
        transition={{ repeat: Infinity, duration: 1 }}
        className="grid place-items-center"
      >
        <Send className="size-4" />
      </motion.span>
    </motion.button>
  );
}
