import React from "react";
import { SiteText, useSiteContentSpacingClass } from "@/lib/siteContent";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { TutorProfileReadoutRows } from "./TutorProfileReadoutRows";
import type { TutorProfileReadoutRow, TutorProfileReadoutSection } from "./TutorProfileSectionReadout";

/** Filled vs. required totals; optional rows never count against a section. */
function countRequired(rows: TutorProfileReadoutRow[]) {
  const required = rows.filter(row => !row.optional);
  return { filled: required.filter(row => !row.missing).length, total: required.length };
}

/**
 * Read-only preview of the whole profile, reached from the identity rail's
 * "View Profile"; "Edit Information" switches back to the tabbed editor.
 *
 * Laid out exactly as the tab panels lay a section out - the same cards, group
 * headings and ruled rows - only with every section listed at once instead of
 * one tab at a time, and with no edit pencils. Reading the preview and reading
 * a tab should feel like the same page, so the earlier condensed grid with its
 * own row marks and columns is gone.
 */
export function TutorProfileSummaryView({ sections }: { sections: TutorProfileReadoutSection[] }) {
  const allRows = sections.flatMap(section => section.groups.flatMap(group => group.rows));
  const overall = countRequired(allRows);
  const sectionPadding = useSiteContentSpacingClass("tutor-profile.spacing.section-card");

  return <section aria-label="Profile preview" className={tp.stack}>
    <div className={`${tp.card} ${sectionPadding}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className={`text-sm ${tp.heading}`}>Profile preview</h2>
          <p className="mt-0.5 text-2xs text-[#8496a6]">Every detail on your profile, filled or still missing.</p>
        </div>
        <p className="shrink-0 text-2xs font-bold text-j-ink tabular-nums">
          {overall.filled}<span className="text-[#8496a6]">/{overall.total} required filled</span>
        </p>
      </div>
    </div>

    {sections.map(section => {
      const sectionCount = countRequired(section.groups.flatMap(group => group.rows));

      return <div key={section.id} className={tp.stack}>
        {/* The tab bar names the section in the editor; in one long list each
            section has to name itself. */}
        <div className="flex items-baseline justify-between gap-3 px-1 pt-1">
          <h3 className={`text-sm ${tp.heading}`}>{section.title}</h3>
          <span className="shrink-0 text-2xs font-bold text-[#8496a6] tabular-nums">
            {sectionCount.total === 0 ? "Optional" : `${sectionCount.filled}/${sectionCount.total}`}
          </span>
        </div>

        {section.groups.map((group, groupIndex) => {
          const groupTarget = group.editTarget;
          // A group with no heading of its own would fall back to the section
          // title, which the header above already shows - so the card just
          // carries its rows rather than saying the same thing twice.
          return <section key={groupIndex} className={`${tp.card} ${sectionPadding}`}>
            {group.heading ? <div className="mb-3 border-b border-j-border pb-3">
              <h4 className={tp.heading}>
                {groupTarget
                  ? <SiteText slotId={`tutor-profile.group.${groupTarget}`} fallback={group.heading} className="text-sm" />
                  : <span className="text-sm">{group.heading}</span>}
              </h4>
            </div> : null}
            <TutorProfileReadoutRows rows={group.rows} />
          </section>;
        })}
      </div>;
    })}
  </section>;
}
