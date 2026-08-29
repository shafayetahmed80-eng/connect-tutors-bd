import { Check } from "lucide-react";

export type JourneyProgressStep = {
  label: string;
  description: string;
};

export function JourneyProgress({
  activeStep,
  ariaLabel,
  steps,
}: {
  activeStep: number;
  ariaLabel: string;
  steps: readonly JourneyProgressStep[];
}) {
  const fill = steps.length > 0 ? Math.min(Math.max(activeStep / steps.length, 0), 1) : 0;

  return (
    <div>
      <div aria-hidden="true" className="mb-3 h-1 overflow-hidden rounded-full bg-[#e8f1f7]">
        <div
          className="h-full rounded-full bg-j-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${fill * 100}%` }}
        />
      </div>
      <ol className={`grid gap-2 ${steps.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`} aria-label={ariaLabel}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const completed = stepNumber < activeStep;
          const active = stepNumber === activeStep;

          return (
            <li
              key={step.label}
              className={`relative flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                active
                  ? "border-j-accent/40 bg-j-accent-wash shadow-[0_8px_20px_rgba(26,119,193,0.08)]"
                  : completed
                    ? "border-j-ok/35 bg-j-ok-wash"
                    : "border-[#e1eaf1] bg-white"
              }`}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold transition ${
                  completed
                    ? "bg-j-ok text-white"
                    : active
                      ? "bg-j-accent text-white ring-4 ring-j-accent/15"
                      : "bg-[#e8f1f7] text-[#66809a]"
                }`}
              >
                {completed ? <Check size={15} aria-hidden="true" /> : stepNumber}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-j-ink">{step.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-[#66809a]">{step.description}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
