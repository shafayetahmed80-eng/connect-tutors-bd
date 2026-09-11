import React from "react";
import { useSiteContentTextStyle } from "@/lib/siteContent";
import { LabelIcon } from "@/components/recordIcons";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import type { TutorProfileReadoutRow } from "./TutorProfileSectionReadout";

/**
 * One group of read-out rows as a ruled record list, shared by the tab editor
 * panels. Label above value on phones; `label | value` on a hairline-divided
 * row from `sm` up; two columns from `lg` up. Every empty field reads "Not
 * given"; the colour is what separates a required blank (red) from an optional
 * one (muted).
 *
 * On a phone the two lines are 11px over 13px. Stacked at one size they read
 * as twenty near-identical lines down a ten-field card, and the size
 * difference does the work that bolding the value would otherwise be asked to
 * do. From `sm` up they sit side by side and match again, which is where a
 * matched pair is the right answer.
 *
 * Label and value still share one Admin-editable size. They are read as a
 * pair, so splitting them into two controls would only invite a mismatched
 * pair - an Owner who sets a size gets it on both, as before.
 */
export function TutorProfileReadoutRows({ rows }: { rows: TutorProfileReadoutRow[] }) {
  // Undefined unless an Admin has set a size, so the 12px in the theme tokens
  // stays the shipped default.
  const sizeStyle = useSiteContentTextStyle("tutor-profile.size.record-row");

  return <dl className="grid lg:grid-cols-2 lg:gap-x-10">
    {rows.map(row => <div
      key={row.label}
      className="flex flex-col gap-px border-b border-j-border/60 py-1.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-3 sm:py-2 lg:[&:nth-last-child(2)]:border-b-0"
    >
      <dt className={`flex items-center gap-1.5 text-[11px] sm:w-40 sm:shrink-0 sm:text-[12px] ${tp.rowLabelTone}`} style={sizeStyle}>
        <span aria-hidden="true" className="shrink-0 text-[#8fb4d0]"><LabelIcon label={row.label} /></span>{row.label}
      </dt>
      <dd className={`min-w-0 break-words text-[13px] sm:text-[12px] ${row.missing && !row.optional ? tp.rowValueMissingTone : row.missing ? tp.rowValueMutedTone : tp.rowValueTone}`} style={sizeStyle}>{row.value}</dd>
    </div>)}
  </dl>;
}
