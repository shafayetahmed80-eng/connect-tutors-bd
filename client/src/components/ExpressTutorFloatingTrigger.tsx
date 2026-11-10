import React, { useState } from "react";
import { Zap } from "lucide-react";
import { ExpressTutorRequestModal } from "./ExpressTutorRequestModal";
import type { ExpressRequestSource } from "@shared/express-tutor-request";

export function ExpressTutorFloatingTrigger({
  source = "floating_action",
  label = "১৫ সেকেন্ডে টিউটর খুঁজুন",
}: {
  source?: ExpressRequestSource;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-5 right-4 z-40 sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-xl shadow-orange-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
          aria-label="Express Tutor Request"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-white/20">
            <Zap size={14} className="fill-white text-white" />
          </span>
          <span className="tracking-tight">{label}</span>
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-white" />
          </span>
        </button>
      </div>

      <ExpressTutorRequestModal
        open={open}
        onClose={() => setOpen(false)}
        source={source}
      />
    </>
  );
}
