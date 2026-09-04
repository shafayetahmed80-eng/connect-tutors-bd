import React, { type ReactNode } from "react";
import { LabelIcon } from "@/components/recordIcons";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import type { GuardianSummaryGroup } from "./guardian-request-summary";

export function GuardianRequestSummaryView({
  groups,
  renderGroupAction,
}: {
  groups: GuardianSummaryGroup[];
  /** Optional per-group control, e.g. the review's "Edit learning needs". */
  renderGroupAction?: (group: GuardianSummaryGroup) => ReactNode;
}) {
  return <div className={tp.stack}>
    {groups.map(group => <section key={group.title} className={`${tp.card} ${tp.cardPad}`} aria-labelledby={`request-group-${group.step}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 id={`request-group-${group.step}`} className={`text-sm ${tp.heading}`}>{group.title}</h3>
        {renderGroupAction?.(group)}
      </div>

      <dl className="mt-3 grid lg:grid-cols-2 lg:gap-x-10">
        {group.rows.map(row => <div
          key={row.label}
          className="flex flex-col gap-0.5 border-b border-j-border/60 py-2 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-3 lg:[&:nth-last-child(2)]:border-b-0"
        >
          <dt className={`flex items-center gap-1.5 sm:w-44 sm:shrink-0 ${tp.rowLabel}`}>
            <span aria-hidden="true" className="shrink-0 text-[#8fb4d0]"><LabelIcon label={row.label} /></span>{row.label}
          </dt>
          {/* A blank optional answer is a choice and stays grey; a blank
              required one is a gap in the record and reads red, the same way
              the Tutor profile separates the two. */}
          <dd className={`min-w-0 break-words ${row.empty ? (row.optional ? tp.rowValueMuted : tp.rowValueMissing) : tp.rowValue}`}>{row.value}</dd>
        </div>)}
      </dl>
    </section>)}
  </div>;
}
