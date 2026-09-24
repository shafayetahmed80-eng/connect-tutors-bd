import React from "react";
import { Plus } from "lucide-react";
import { useSiteContentTextStyle } from "@/lib/siteContent";
import { LabelIcon } from "@/components/recordIcons";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import type { TutorProfileReadoutRow } from "./TutorProfileSectionReadout";

/**
 * One group of read-out rows as a ruled record list, shared by the tab editor
 * panels. Label above value on phones; `label | value` on a hairline-divided
 * row from `sm` up; two columns from `lg` up. Every empty field reads "Not
 * given"; the colour is what separates a required blank (red) from an optional
 * one (muted), and a required blank carries an Add that opens its editor.
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
 *
 * Label and value share one line height and sit on the row's top edge, so a
 * value lines up with the first line of a label that wraps. The icon keeps
 * its slot even for a label with no icon, or a label the Owner renamed, so
 * every label starts at the same edge.
 */
export function TutorProfileReadoutRows({ rows, onAdd }: { rows: TutorProfileReadoutRow[]; onAdd?: () => void }) {
  // Undefined unless an Admin has set a size, so the 12px in the theme tokens
  // stays the shipped default.
  const sizeStyle = useSiteContentTextStyle("tutor-profile.size.record-row");

  return <dl className="grid lg:grid-cols-2 lg:gap-x-10">
    {rows.map(row => {
      const requiredBlank = row.missing && !row.optional;
      return <div
        key={row.label}
        className="flex flex-col gap-px border-b border-tp-border/60 py-1.5 last:border-b-0 sm:flex-row sm:items-start sm:gap-3 sm:py-2 lg:[&:nth-last-child(2)]:border-b-0"
      >
        <dt className={`flex items-start gap-1.5 text-[11px] leading-[1.6] sm:w-40 sm:shrink-0 sm:text-[12px] ${tp.rowLabelTone}`} style={sizeStyle}>
          <span aria-hidden="true" className="flex h-[1.6em] w-[13px] shrink-0 items-center text-tp-accent-soft"><LabelIcon label={row.label} /></span>{row.label}
        </dt>
        {requiredBlank && onAdd
          ? <dd className="flex min-w-0 flex-wrap items-center gap-x-2 text-[13px] leading-[1.6] sm:text-[12px]" style={sizeStyle}>
            <span className={tp.rowValueMissingTone}>{row.value}</span>
            <button
              type="button"
              onClick={onAdd}
              aria-label={`Add ${row.label}`}
              className="inline-flex items-center gap-0.5 rounded font-semibold text-tp-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-accent/40"
            ><Plus size={12} aria-hidden={true} />Add</button>
          </dd>
          : <dd className={`min-w-0 break-words text-[13px] leading-[1.6] sm:text-[12px] ${requiredBlank ? tp.rowValueMissingTone : row.missing ? tp.rowValueMutedTone : tp.rowValueTone}`} style={sizeStyle}>{row.value}</dd>}
      </div>;
    })}
  </dl>;
}
