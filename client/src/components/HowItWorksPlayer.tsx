import { HOW_IT_WORKS_STEP_MS, howItWorksGuides, howItWorksSlotId, type HowItWorksPanel } from "@shared/how-it-works";
import { useSiteContentResolver } from "@/lib/siteContent";
import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { HowItWorksScene } from "./HowItWorksScenes";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/**
 * A panel's "How it works" guide: the steps play one after another as a small
 * animated scene, then start over. The pause button stops it, choosing a step
 * jumps there and carries on from it, and with reduced motion on it never moves
 * by itself - the person steps through it by choosing a step.
 *
 * The words come from the Owner's editable slots; the scene each step plays is
 * fixed in the code.
 */
export default function HowItWorksPlayer({ panel }: { panel: HowItWorksPanel }) {
  const guide = howItWorksGuides[panel];
  const resolve = useSiteContentResolver();
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Bumped whenever playback (re)starts, so the scene and the timer bar begin again from the top.
  const [round, setRound] = useState(0);
  const running = !paused && !reducedMotion;
  const stepCount = guide.steps.length;

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      setIndex(current => (current + 1) % stepCount);
      setRound(current => current + 1);
    }, HOW_IT_WORKS_STEP_MS);
    return () => clearTimeout(timer);
  }, [running, index, round, stepCount]);

  const choose = (next: number) => {
    setIndex(next);
    setRound(current => current + 1);
  };
  // Pausing keeps the scene as it is; resuming plays the step again from its start.
  const toggle = () => {
    if (paused) setRound(current => current + 1);
    setPaused(current => !current);
  };

  const active = guide.steps[index]!;

  return <section aria-label={resolve(howItWorksSlotId(panel, "heading"), guide.heading)} className="rounded-xl border border-j-border bg-white p-5 shadow-sm sm:p-7">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl font-black tracking-tight text-j-ink">{resolve(howItWorksSlotId(panel, "heading"), guide.heading)}</h2>
        <p className="mt-1.5 text-sm leading-6 text-j-ink-soft">{resolve(howItWorksSlotId(panel, "intro"), guide.intro)}</p>
      </div>
      {reducedMotion ? null : <button type="button" onClick={toggle} aria-pressed={paused} aria-label={paused ? "Play the guide" : "Pause the guide"} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-j-border text-j-accent transition hover:bg-j-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent">
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>}
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
      <div className="order-1 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#e6f2fc,#f7fbff_60%,#eaf6ef)] ring-1 ring-[rgba(16,49,77,.06)] lg:order-2">
        <HowItWorksScene key={`${active.id}-${round}`} scene={active.scene} />
      </div>

      <ol className="order-2 space-y-1 lg:order-1">
        {guide.steps.map((step, position) => {
          const isActive = position === index;
          return <li key={step.id}>
            <button type="button" onClick={() => choose(position)} aria-current={isActive ? "step" : undefined} className={`flex w-full gap-3.5 rounded-xl p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent ${isActive ? "bg-[#f1f8fe]" : "hover:bg-j-surface-sunken"}`}>
              <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black transition-colors ${isActive ? "bg-j-accent text-white" : position < index ? "bg-[#cfe6f8] text-[#0e4f85]" : "bg-[#e9eff5] text-[#5c7a92]"}`}>{position + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-extrabold ${isActive ? "text-j-ink" : "text-j-ink-soft"}`}>{resolve(howItWorksSlotId(panel, "title", step.id), step.title)}</span>
                <span className={`grid transition-[grid-template-rows,opacity] duration-300 ${isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <span className="overflow-hidden">
                    <span className="mt-1 block text-sm leading-6 text-j-ink-soft">{resolve(howItWorksSlotId(panel, "copy", step.id), step.copy)}</span>
                    {isActive && !reducedMotion ? <span aria-hidden="true" className="mt-2.5 block h-1 w-full overflow-hidden rounded-full bg-[#dbe9f5]"><span key={round} data-paused={!running} className="hiw-progress block h-full rounded-full bg-j-accent" style={{ "--hiw-ms": `${HOW_IT_WORKS_STEP_MS}ms` } as React.CSSProperties} /></span> : null}
                  </span>
                </span>
              </span>
            </button>
          </li>;
        })}
      </ol>
    </div>
  </section>;
}
