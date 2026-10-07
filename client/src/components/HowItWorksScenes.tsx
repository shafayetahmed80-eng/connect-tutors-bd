import type { HowItWorksSceneId } from "@shared/how-it-works";
import { BadgeCheck, Bell, BriefcaseBusiness, FileCheck2, MessageCircle, Phone, ShieldCheck, Star, UserRound } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/**
 * The little drawings the "How it works" guides play, one per step.
 *
 * Each is a few mock panel pieces that appear in a set order (the `d()` delays),
 * so a step reads as "this, then this, then this" without any words beyond a
 * label or two. They restart whenever the player re-mounts them, and under
 * reduced motion the global rule collapses every animation to its last frame.
 */

const d = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

function Window({ title, children }: { title: string; children: ReactNode }) {
  return <div className="w-full max-w-[20rem] rounded-xl border border-j-border bg-white shadow-[0_18px_40px_-18px_rgba(16,49,77,.35)]">
    <div className="flex items-center gap-1.5 border-b border-j-border px-3 py-2">
      <span className="size-2 rounded-full bg-[#ff9d8f]" />
      <span className="size-2 rounded-full bg-[#ffd36b]" />
      <span className="size-2 rounded-full bg-[#7fd99a]" />
      <span className="ml-2 text-[10px] font-bold text-j-ink-muted">{title}</span>
    </div>
    <div className="space-y-2.5 p-3.5">{children}</div>
  </div>;
}

/** A line that draws itself from the left, like text being filled in. */
function Line({ w, delay, tone = "soft", ms }: { w: string; delay: number; tone?: "soft" | "ink" | "accent"; ms?: number }) {
  const colour = tone === "ink" ? "bg-[#9db6ca]" : tone === "accent" ? "bg-j-accent" : "bg-[#dbe7f1]";
  return <span className={`hiw-grow block h-2 rounded-full ${colour}`} style={{ width: w, ...d(delay), ...(ms ? { animationDuration: `${ms}ms` } : {}) }} />;
}

function Field({ label, w, delay }: { label: string; w: string; delay: number }) {
  return <div>
    <p className="hiw-rise text-[9px] font-bold uppercase tracking-wide text-j-ink-muted" style={d(delay)}>{label}</p>
    <div className="hiw-rise mt-1 rounded-md border border-j-field-border bg-j-surface-sunken px-2 py-1.5" style={d(delay + 60)}>
      <Line w={w} delay={delay + 260} tone="ink" />
    </div>
  </div>;
}

const chipTones = {
  accent: "bg-[#dff2ff] text-[#0e4f85]",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  slate: "bg-[#e9eff5] text-[#496a85]",
} as const;

function Chip({ children, delay, tone = "accent", className = "" }: { children: ReactNode; delay: number; tone?: keyof typeof chipTones; className?: string }) {
  return <span className={`hiw-pop inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${chipTones[tone]} ${className}`} style={d(delay)}>{children}</span>;
}

function Tick({ delay, size = 14, className = "text-emerald-600" }: { delay: number; size?: number; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path className="hiw-tick" pathLength={1} d="M3 8.5l3.2 3.2L13 4.8" style={d(delay)} />
  </svg>;
}

function Button({ children, delay, pressAt }: { children: ReactNode; delay: number; pressAt?: number }) {
  return <span className="hiw-pop inline-flex" style={d(delay)}>
    <span className={`inline-flex items-center rounded-lg bg-j-accent px-3 py-1.5 text-[11px] font-extrabold text-white ${pressAt === undefined ? "" : "hiw-press"}`} style={pressAt === undefined ? undefined : d(pressAt)}>{children}</span>
  </span>;
}

function Avatar({ delay, tone = "bg-[#cfe3f5]" }: { delay: number; tone?: string }) {
  return <span className={`hiw-pop grid size-7 shrink-0 place-items-center rounded-full ${tone} text-[#0e4f85]`} style={d(delay)}><UserRound size={14} aria-hidden="true" /></span>;
}

function Toast({ icon, children, delay }: { icon: ReactNode; children: ReactNode; delay: number }) {
  return <div className="hiw-slide flex items-center gap-2 rounded-lg border border-j-border bg-white px-2.5 py-2 shadow-[0_10px_24px_-12px_rgba(16,49,77,.4)]" style={d(delay)}>
    <span className="grid size-6 place-items-center rounded-full bg-[#dff2ff] text-j-accent">{icon}</span>
    <span className="text-[10px] font-extrabold text-j-ink">{children}</span>
  </div>;
}

const scenes: Record<HowItWorksSceneId, () => ReactNode> = {
  "guardian-request": () => <Window title="Hire a tutor">
    <Field label="Subject and class" w="62%" delay={150} />
    <Field label="Schedule" w="48%" delay={750} />
    <Field label="Budget and area" w="70%" delay={1350} />
    <div className="flex items-center justify-between pt-1">
      <Button delay={2000} pressAt={2700}>Send request</Button>
      <Chip delay={3100} tone="green"><Tick delay={3200} size={11} className="text-emerald-700" />Sent</Chip>
    </div>
  </Window>,

  "guardian-review": () => <Window title="Your request">
    <div className="flex items-center justify-between">
      <Chip delay={200} tone="amber">Under review</Chip>
      <span className="hiw-pop text-j-accent" style={d(1900)}><span className="hiw-ring inline-block" style={d(2000)}><Phone size={18} aria-hidden="true" /></span></span>
    </div>
    {[400, 1000, 1600].map(delay => <div key={delay} className="flex items-center gap-2">
      <Tick delay={delay + 300} size={16} />
      <Line w={delay === 1000 ? "58%" : delay === 400 ? "74%" : "50%"} delay={delay} />
    </div>)}
    <Chip delay={2800} tone="green"><ShieldCheck size={11} aria-hidden="true" />Confirmed</Chip>
  </Window>,

  "guardian-board": () => <Window title="Job Board">
    {[300, 800, 1300].map((delay, i) => <div key={delay} className={`hiw-rise flex items-center gap-2.5 rounded-lg border p-2.5 ${i === 1 ? "hiw-glow border-j-accent bg-[#f2f9ff]" : "border-j-border bg-white"}`} style={d(delay)}>
      <span className="grid size-7 place-items-center rounded-lg bg-[#e8f1f9] text-j-accent"><BriefcaseBusiness size={14} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1 space-y-1.5"><Line w="70%" delay={delay + 200} tone="ink" /><Line w="45%" delay={delay + 350} /></div>
    </div>)}
    <Chip delay={2200} tone="green" className="w-fit"><ShieldCheck size={11} aria-hidden="true" />Private details hidden</Chip>
  </Window>,

  "guardian-applicants": () => <Window title="Applied Tutors">
    {[300, 800, 1300].map((delay, i) => <div key={delay} className={i === 2 ? "hiw-dim" : undefined} style={i === 2 ? d(2600) : undefined}>
      <div className="hiw-rise flex items-center gap-2.5 rounded-lg border border-j-border p-2" style={d(delay)}>
        <Avatar delay={delay + 100} />
        <div className="min-w-0 flex-1 space-y-1.5"><Line w="55%" delay={delay + 250} tone="ink" /><Line w="35%" delay={delay + 400} /></div>
        {i < 2 ? <Chip delay={2100 + i * 450} tone="amber"><Star size={10} aria-hidden="true" />Shortlisted</Chip> : null}
      </div>
    </div>)}
  </Window>,

  "guardian-appoint": () => <Window title="Applied Tutors">
    <div className="flex items-center gap-2.5 rounded-lg border border-j-border p-2.5">
      <Avatar delay={200} />
      <div className="min-w-0 flex-1 space-y-1.5"><Line w="60%" delay={350} tone="ink" /><Line w="40%" delay={500} /></div>
      <Chip delay={2100} tone="green"><Tick delay={2200} size={11} className="text-emerald-700" />Appointed</Chip>
    </div>
    <div className="flex items-center justify-between">
      <Button delay={700} pressAt={1600}>Appoint</Button>
    </div>
    <Toast icon={<Bell size={12} aria-hidden="true" />} delay={2900}>Tutor informed</Toast>
  </Window>,

  "guardian-confirmed": () => <div className="relative flex w-full max-w-[20rem] flex-col items-center gap-4">
    <span className="hiw-pop grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600" style={d(200)}>
      <svg aria-hidden="true" viewBox="0 0 28 28" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle className="hiw-tick" pathLength={1} cx="14" cy="14" r="11.5" style={d(300)} />
        <path className="hiw-tick" pathLength={1} d="M8.5 14.5l3.8 3.8 7.2-7.6" style={d(750)} />
      </svg>
    </span>
    <div className="hiw-slide w-full rounded-xl border border-j-border bg-white p-3.5 shadow-[0_18px_40px_-18px_rgba(16,49,77,.35)]" style={d(1500)}>
      <div className="flex items-center gap-2"><FileCheck2 size={16} className="text-j-accent" aria-hidden="true" /><span className="text-[11px] font-extrabold text-j-ink">Confirmation Letter</span></div>
      <div className="mt-2.5 space-y-1.5"><Line w="90%" delay={1900} /><Line w="75%" delay={2050} /><Line w="55%" delay={2200} /></div>
      <span className="hiw-pop absolute -bottom-3 right-3 grid size-9 place-items-center rounded-full bg-j-accent text-white shadow-lg" style={d(2700)}><BadgeCheck size={18} aria-hidden="true" /></span>
    </div>
  </div>,

  "tutor-profile": () => <Window title="My profile">
    <div className="flex gap-1.5">
      {["Basic", "Education", "Tuition"].map((label, i) => <Chip key={label} delay={200 + i * 150} tone={i === 0 ? "accent" : "slate"}>{label}</Chip>)}
    </div>
    {[500, 1100, 1700].map((delay, i) => <div key={delay} className="flex items-center gap-2"><Tick delay={delay + 500} size={15} /><Line w={i === 1 ? "60%" : "78%"} delay={delay} /></div>)}
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e3edf5]"><span className="hiw-grow block h-full rounded-full bg-j-accent" style={{ ...d(400), animationDuration: "2600ms" }} /></div>
    <div className="flex justify-end pt-0.5"><Button delay={3000} pressAt={3700}>Submit</Button></div>
  </Window>,

  "tutor-moderation": () => <Window title="Profile status">
    <div className="relative h-7">
      <span className="hiw-fade-out absolute left-0 top-0" style={d(1900)}><Chip delay={200} tone="amber">Pending review</Chip></span>
      <Chip delay={2100} tone="green" className="absolute left-0 top-0"><Tick delay={2200} size={11} className="text-emerald-700" />Approved</Chip>
    </div>
    <div className="space-y-1.5"><Line w="82%" delay={500} /><Line w="64%" delay={750} /><Line w="40%" delay={1000} /></div>
    <Toast icon={<Bell size={12} aria-hidden="true" />} delay={2900}>You are notified</Toast>
  </Window>,

  "tutor-jobs": () => <Window title="Job Board">
    <div className="flex flex-wrap gap-1.5">
      {["Class", "Subject", "Area"].map((label, i) => <Chip key={label} delay={200 + i * 250} tone="slate">{label}</Chip>)}
    </div>
    {[1300, 1750, 2200].map((delay, i) => <div key={delay} className={`hiw-rise flex items-center gap-2.5 rounded-lg border p-2.5 ${i === 0 ? "hiw-glow border-j-accent bg-[#f2f9ff]" : "border-j-border"}`} style={d(delay)}>
      <span className="grid size-7 place-items-center rounded-lg bg-[#e8f1f9] text-j-accent"><BriefcaseBusiness size={14} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1 space-y-1.5"><Line w="68%" delay={delay + 200} tone="ink" /><Line w="42%" delay={delay + 350} /></div>
      <Chip delay={delay + 450} tone="green">৳</Chip>
    </div>)}
  </Window>,

  "tutor-apply": () => <Window title="Tuition job">
    <div className="flex items-center gap-2.5 rounded-lg border border-j-border p-2.5">
      <span className="grid size-7 place-items-center rounded-lg bg-[#e8f1f9] text-j-accent"><BriefcaseBusiness size={14} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1 space-y-1.5"><Line w="66%" delay={250} tone="ink" /><Line w="44%" delay={400} /></div>
    </div>
    <div className="relative h-8">
      <span className="absolute left-0 top-0"><span className="hiw-fade-out inline-block" style={d(1700)}><Button delay={600} pressAt={1300}>Apply</Button></span></span>
      <Chip delay={1900} tone="green" className="absolute left-0 top-0.5"><Tick delay={2000} size={11} className="text-emerald-700" />Applied</Chip>
      <Chip delay={3000} tone="amber" className="absolute left-20 top-0.5"><Star size={10} aria-hidden="true" />Shortlisted</Chip>
    </div>
  </Window>,

  "tutor-appointed": () => <div className="flex w-full max-w-[20rem] flex-col gap-3">
    <div className="hiw-slide flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-white p-3 shadow-[0_18px_40px_-18px_rgba(16,49,77,.35)]" style={d(300)}>
      <span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-emerald-600"><BadgeCheck size={20} aria-hidden="true" /></span>
      <div className="space-y-1.5"><p className="text-[11px] font-extrabold text-j-ink">You are appointed</p><Line w="7rem" delay={700} /></div>
    </div>
    <div className="hiw-rise ml-6 flex items-start gap-2" style={d(1500)}><MessageCircle size={14} className="mt-1 text-j-accent" aria-hidden="true" /><div className="rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow"><Line w="6.5rem" delay={1700} tone="ink" /></div></div>
    <div className="hiw-rise mr-6 flex justify-end" style={d(2300)}><div className="rounded-xl rounded-tr-sm bg-j-accent px-3 py-2"><span className="hiw-grow block h-2 w-20 rounded-full bg-white/80" style={d(2500)} /></div></div>
  </div>,

  "tutor-confirmed": () => <div className="flex w-full max-w-[20rem] flex-col gap-3">
    <div className="hiw-slide flex items-center gap-2 rounded-xl border border-j-border bg-white p-3 shadow-[0_18px_40px_-18px_rgba(16,49,77,.35)]" style={d(250)}>
      <FileCheck2 size={18} className="text-j-accent" aria-hidden="true" />
      <span className="text-[11px] font-extrabold text-j-ink">Confirmation Letter</span>
      <Chip delay={900} tone="green" className="ml-auto"><Tick delay={1000} size={11} className="text-emerald-700" />Issued</Chip>
    </div>
    <Window title="Payment">
      {[{ label: "1st instalment", at: 1400 }, { label: "2nd instalment", at: 2700 }].map(item => <div key={item.label}>
        <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-wide text-j-ink-muted">{item.label}</span><Tick delay={item.at + 700} size={14} /></div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e3edf5]"><span className="hiw-grow block h-full rounded-full bg-j-accent" style={{ ...d(item.at), animationDuration: "900ms" }} /></div>
      </div>)}
    </Window>
  </div>,
};

export function HowItWorksScene({ scene }: { scene: HowItWorksSceneId }) {
  return <div aria-hidden="true" className="flex size-full items-center justify-center p-4 sm:p-6">{scenes[scene]()}</div>;
}
