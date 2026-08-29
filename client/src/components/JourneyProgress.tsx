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
  return (
    <ol className={`grid gap-3 ${steps.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`} aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const completed = stepNumber < activeStep;
        const active = stepNumber === activeStep;

        return (
          <li
            key={step.label}
            className={`relative flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
              active
                ? "border-[#9acdf7] bg-[#eef8ff] shadow-[0_8px_20px_rgba(26,119,193,0.08)]"
                : completed
                  ? "border-[#cee6d8] bg-[#f3fbf6]"
                  : "border-[#e1eaf1] bg-white"
            }`}
            aria-current={active ? "step" : undefined}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
              completed
                ? "bg-[#3b9f68] text-white"
                : active
                  ? "bg-[#1677e8] text-white"
                  : "bg-[#e8f1f7] text-[#66809a]"
            }`}>
              {completed ? <Check size={15} aria-hidden="true" /> : stepNumber}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-[#173d60]">{step.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-[#66809a]">{step.description}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
