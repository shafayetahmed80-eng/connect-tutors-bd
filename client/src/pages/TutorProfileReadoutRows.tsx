import React from "react";
import { useSiteContentTextStyle } from "@/lib/siteContent";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import type { TutorProfileReadoutRow } from "./TutorProfileSectionReadout";

/**
 * One group of read-out rows as a ruled record list, shared by the tab editor
 * panels. Label above value on phones; `label | value` on a hairline-divided
 * row from `sm` up; two columns from `lg` up. Every empty field reads "Not
 * given"; the colour is what separates a required blank (red) from an optional
 * one (muted).
 *
 * Label and value share one Admin-editable size. They are read as a pair, so
 * splitting them into two controls would only invite a mismatched pair.
 */
export function TutorProfileReadoutRows({ rows }: { rows: TutorProfileReadoutRow[] }) {
  // Undefined unless an Admin has set a size, so the 12px in the theme tokens
  // stays the shipped default.
  const sizeStyle = useSiteContentTextStyle("tutor-profile.size.record-row");

  return <dl className="grid lg:grid-cols-2 lg:gap-x-10">
    {rows.map(row => <div
      key={row.label}
      className="flex flex-col gap-0.5 border-b border-j-border/60 py-2 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-3 lg:[&:nth-last-child(2)]:border-b-0"
    >
      <dt className={`sm:w-40 sm:shrink-0 ${tp.rowLabel}`} style={sizeStyle}>{row.label}</dt>
      <dd className={`min-w-0 break-words ${row.missing && !row.optional ? tp.rowValueMissing : row.missing ? tp.rowValueMuted : tp.rowValue}`} style={sizeStyle}>{row.value}</dd>
    </div>)}
  </dl>;
}
