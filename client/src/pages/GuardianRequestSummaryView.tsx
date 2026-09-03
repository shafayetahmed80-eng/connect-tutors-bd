import React, { type ReactNode } from "react";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import type { GuardianSummaryGroup } from "./guardian-request-summary";

/**
 * A request as a read-only record, laid out the way the Tutor profile's
 * "View Profile" preview lays a profile out: one card per group, a heading, and
 * ruled `label | value` rows. Colour is what separates a blank from an answer.
 *
 * It renders inside a page today and inside a dialog once the journey moves
 * into one, so it owns no shell of its own - the caller supplies the header
 * action, the footer, and the surrounding box.
 */
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
        <h3 id={`request-group-${group.step}`} className={`text-[13px] ${tp.heading}`}>{group.title}</h3>
        {renderGroupAction?.(group)}
      </div>

      <dl className="mt-3 grid lg:grid-cols-2 lg:gap-x-10">
        {group.rows.map(row => <div
          key={row.label}
          className="flex flex-col gap-0.5 border-b border-j-border/60 py-2 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-3 lg:[&:nth-last-child(2)]:border-b-0"
        >
          <dt className={`sm:w-44 sm:shrink-0 ${tp.rowLabel}`}>{row.label}</dt>
          <dd className={`min-w-0 break-words ${row.empty ? tp.rowValueMuted : tp.rowValue}`}>{row.value}</dd>
        </div>)}
      </dl>
    </section>)}
  </div>;
}
