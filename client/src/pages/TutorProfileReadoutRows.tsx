import React from "react";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import type { TutorProfileReadoutRow } from "./TutorProfileSectionReadout";

/**
 * One group of read-out rows as a `<dl>`, shared by the read view and the tab
 * editor so both render values identically: label above value on phones,
 * `label | value` side by side from `sm` up, two pairs per row from `lg` up.
 * Empty required values are red "Not given"; empty optional values are "—".
 */
export function TutorProfileReadoutRows({ rows }: { rows: TutorProfileReadoutRow[] }) {
  return <dl className="grid gap-x-6 gap-y-2.5 lg:grid-cols-2">
    {rows.map(row => <div key={row.label} className="grid grid-cols-1 gap-y-0.5 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-x-3 sm:gap-y-0">
      <dt className={tp.rowLabel}>{row.label}</dt>
      <dd className={`min-w-0 break-words ${row.missing && !row.optional ? tp.rowValueMissing : row.missing ? tp.rowValueMuted : tp.rowValue}`}>{row.value}</dd>
    </div>)}
  </dl>;
}
