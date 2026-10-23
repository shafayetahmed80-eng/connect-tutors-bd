import { motion } from "framer-motion";
import { Check, CheckCheck, ChevronDown, Clock, Pause, Play, Volume2, VolumeX } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

/**
 * Task 17: Message Delivery & Read Status Ticks.
 * Renders single tick (sent), double tick (delivered), or double sky-blue tick (seen).
 */
export function MessageStatusTicks({
  status,
  className = "",
}: {
  status: "sending" | "sent" | "delivered" | "seen";
  className?: string;
}) {
  if (status === "sending") {
    return (
      <span className={`inline-flex items-center gap-1 text-2xs font-medium opacity-80 ${className}`} title="Sending…">
        <Clock className="size-2.5 animate-spin" />
        <span className="sr-only">Sending…</span>
      </span>
    );
  }

  if (status === "sent") {
    return (
      <span className={`inline-flex items-center text-2xs font-medium opacity-75 ${className}`} title="Sent">
        <Check className="size-3" />
        <span className="sr-only">Sent</span>
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className={`inline-flex items-center text-2xs font-medium opacity-85 ${className}`} title="Delivered">
        <CheckCheck className="size-3.5" />
        <span className="sr-only">Delivered</span>
      </span>
    );
  }

  // Seen
  return (
    <span className={`inline-flex items-center gap-1 text-2xs font-semibold text-sky-200 ${className}`} title="Seen">
      <CheckCheck className="size-3.5 text-sky-300" />
      <span>Seen</span>
    </span>
  );
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const PLAYBACK_SPEEDS = [1, 1.5, 2] as const;

/**
 * Task 18: Custom waveform audio player with 1x / 1.5x / 2x speed control.
 * Sleek, interactive player for chat voice notes.
 */
export function ChatVoiceNotePlayer({
  url,
  dark = false,
  className = "",
}: {
  url: string;
  dark?: boolean;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  const speed = PLAYBACK_SPEEDS[speedIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSpeedToggle = () => {
    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    if (audioRef.current) {
      audioRef.current.playbackRate = PLAYBACK_SPEEDS[nextIndex];
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(e.target.value);
    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      role="region"
      aria-label="Voice note player"
      className={`mt-1.5 flex items-center gap-2.5 rounded-xl p-2 transition-colors ${
        dark
          ? "bg-white/10 text-white backdrop-blur-xs"
          : "border border-j-border bg-slate-50/90 text-j-ink"
      } ${className}`}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        className={`grid size-8 shrink-0 place-items-center rounded-full transition-transform active:scale-95 ${
          dark
            ? "bg-white text-j-accent hover:bg-slate-100"
            : "bg-j-accent text-white hover:bg-j-accent/90"
        } shadow-xs`}
      >
        {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
      </button>

      {/* Scrubber & Waveform track */}
      <div className="flex flex-1 flex-col justify-center gap-1 min-w-0 sm:min-w-[120px]">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 1}
            disabled={duration <= 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Audio progress slider"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-black/20 accent-j-accent outline-hidden"
          />
        </div>
        <div className="flex items-center justify-between text-2xs font-medium tabular-nums opacity-80">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration || 0)}</span>
        </div>
      </div>

      {/* Playback Speed Controller */}
      <button
        type="button"
        onClick={handleSpeedToggle}
        title={`Playback speed: ${speed}x`}
        aria-label={`Playback speed: ${speed}x`}
        className={`shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-2xs font-bold transition-colors ${
          dark
            ? "border border-white/30 hover:bg-white/20 text-white"
            : "border border-j-border bg-white text-j-ink-soft hover:bg-j-surface-sunken"
        }`}
      >
        {speed}x
      </button>
    </div>
  );
}

/**
 * Task 19: Floating "Scroll to Bottom" button with Unread Counter Badge.
 * Emerges smoothly when scrolled away from bottom, with 1-click snap down.
 */
export function ScrollToBottomFloatingButton({
  containerRef,
  unreadCount = 0,
  onClick,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  unreadCount?: number;
  onClick: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const threshold = Math.min(180, el.clientHeight * 0.25);
      setVisible(distance > threshold);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      className="absolute bottom-16 right-3 sm:bottom-18 sm:right-4 z-20 flex flex-col items-center"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label="Scroll to newest messages"
        className="relative grid size-9 place-items-center rounded-full border border-[#b2d3eb] bg-white text-j-ink shadow-md transition-transform hover:bg-[#f0f6fa] active:scale-95 focus:outline-hidden"
      >
        <ChevronDown className="size-5 text-j-accent" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-j-accent px-1 text-2xs font-bold text-white shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
    </motion.div>
  );
}

const CHAT_SOUND_MUTED_KEY = "connect_chat_sound_muted";

/**
 * Task 20: Synthesized Web Audio API sound chime and header mute toggle.
 * Generates an instantaneous 2-tone melodic bubble pop chime with zero external audio assets.
 */
export function playMessageChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Gentle melodic bell chime: D5 (587Hz) sliding to A5 (880Hz)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // Ignore autoplay restrictions or audio context errors
  }
}

/** Hook for listening to new incoming messages and triggering sound */
export function useChatSoundAlert({
  messageCount,
  isLatestFromPeer,
}: {
  messageCount: number;
  isLatestFromPeer: boolean;
}) {
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CHAT_SOUND_MUTED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const prevCount = useRef(messageCount);

  useEffect(() => {
    if (messageCount > prevCount.current && isLatestFromPeer && !muted) {
      playMessageChime();
    }
    prevCount.current = messageCount;
  }, [messageCount, isLatestFromPeer, muted]);

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem(CHAT_SOUND_MUTED_KEY, String(next));
      } catch {}
      return next;
    });
  };

  return { muted, toggleMute };
}

/** Header toggle button for muting/unmuting chat sound notifications */
export function ChatSoundToggle({
  muted,
  onToggle,
}: {
  muted: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={muted ? "Unmute chat sound alerts" : "Mute chat sound alerts"}
      aria-label={muted ? "Unmute chat sound alerts" : "Mute chat sound alerts"}
      className="flex size-7 items-center justify-center rounded-lg border border-j-border text-j-ink-soft hover:bg-j-surface-sunken hover:text-j-ink transition-colors"
    >
      {muted ? <VolumeX className="size-3.5 text-j-ink-faint" /> : <Volume2 className="size-3.5 text-j-accent" />}
    </button>
  );
}
