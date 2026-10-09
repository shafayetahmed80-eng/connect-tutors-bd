import { useMemo, useState } from "react";

/**
 * The state behind a filter panel that holds a draft until Apply.
 *
 * What the panel shows is the draft; what the list reads - and what a button
 * beside it, such as Notify, sends to - is what was applied. Nothing changes
 * until Apply, as on the Job Board, because there are many boxes and a reload
 * for each one chosen would be a nuisance. `build` turns the state into what the
 * server takes, and the badge counts that, so a box holding words that read as
 * nothing is not a filter.
 */
export function useAppliedFilters<State, Input extends object>({ defaults, build, alertsFor = () => [], onChange }: {
  defaults: State;
  build: (state: State) => Input;
  /** Reasons Apply has to wait, each shown in red under the fields. */
  alertsFor?: (draft: State) => string[];
  /** Called after Apply or Clear: the list goes back to its first page. */
  onChange?: () => void;
}) {
  const [applied, setApplied] = useState<State>(defaults);
  const [draft, setDraft] = useState<State>(defaults);
  const [open, setOpen] = useState(false);

  const input = useMemo(() => build(applied), [applied, build]);
  const alerts = alertsFor(draft);

  return {
    open,
    toggle: () => setOpen(current => !current),
    close: () => setOpen(false),
    draft,
    setDraft,
    applied,
    /** What the list asks the server with. */
    input,
    activeCount: Object.keys(input).length,
    alerts,
    canApply: alerts.length === 0,
    apply: () => { setApplied(draft); onChange?.(); },
    clear: () => { setDraft(defaults); setApplied(defaults); onChange?.(); },
    /** Takes one choice out of the draft and of what is applied, for a choice that stopped meaning anything. */
    drop: (change: Partial<State>) => {
      setApplied(current => ({ ...current, ...change }));
      setDraft(current => ({ ...current, ...change }));
    },
  };
}

export type AppliedFilters<State, Input extends object> = ReturnType<typeof useAppliedFilters<State, Input>>;
