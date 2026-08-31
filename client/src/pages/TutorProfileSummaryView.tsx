import React from "react";
import { Check, Minus, X } from "lucide-react";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import type { TutorProfileReadoutRow, TutorProfileReadoutSection } from "./TutorProfileSectionReadout";

/** Filled vs. required totals; optional rows never count against a section. */
function countRequired(rows: TutorProfileReadoutRow[]) {
  const required = rows.filter(row => !row.optional);
  return { filled: required.filter(row => !row.missing).length, total: required.length };
}

function RowMark({ row }: { row: TutorProfileReadoutRow }) {
  if (!row.missing) return <Check size={12} className="mt-0.5 shrink-0 text-[#1c8a5b]" aria-label="Filled" />;
  if (row.optional) return <Minus size={12} className="mt-0.5 shrink-0 text-[#9aabbb]" aria-label="Not provided" />;
  return <X size={12} className="mt-0.5 shrink-0 text-j-err" aria-label="Missing" />;
}

/**
 * Read-only preview of the whole profile — every field, filled or not, at a
 * density that fits on one screen. Reached from the identity rail's "View
 * Profile"; "Edit Information" switches back to the tabbed editor.
 */
export function TutorProfileSummaryView({ sections }: { sections: TutorProfileReadoutSection[] }) {
  const allRows = sections.flatMap(section => section.groups.flatMap(group => group.rows));
  const overall = countRequired(allRows);

  return <section aria-label="Profile preview" className={`${tp.card} p-4 sm:p-5`}>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-j-border pb-3">
      <div className="min-w-0">
        <h2 className={`text-sm ${tp.heading}`}>Profile preview</h2>
        <p className="mt-0.5 text-[11px] text-[#8496a6]">Every detail on your profile, filled or still missing.</p>
      </div>
      <p className="shrink-0 text-[11px] font-bold text-j-ink">
        {overall.filled}<span className="text-[#8496a6]">/{overall.total} required filled</span>
      </p>
    </div>

    <div className="mt-4 space-y-5">
      {sections.map(section => {
        const sectionCount = countRequired(section.groups.flatMap(group => group.rows));
        return <div key={section.id}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className={`text-[13px] ${tp.heading}`}>{section.title}</h3>
            <span className="shrink-0 text-[11px] font-bold text-[#8496a6] tabular-nums">
              {sectionCount.total === 0 ? "Optional" : `${sectionCount.filled}/${sectionCount.total}`}
            </span>
          </div>

          {section.groups.map((group, groupIndex) => <div key={groupIndex} className="mt-2">
            {group.heading ? <p className={`mb-1.5 ${tp.eyebrow}`}>{group.heading}</p> : null}
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
              {group.rows.map(row => <div key={row.label} className="flex items-start gap-1.5 border-b border-j-border/50 py-1">
                <RowMark row={row} />
                <span className="min-w-0 flex-1">
                  <dt className="text-[11px] leading-4 text-[#8496a6]">{row.label}</dt>
                  <dd className={`break-words text-[12px] leading-4 ${row.missing && !row.optional ? "font-medium text-j-err" : row.missing ? "text-[#9aabbb]" : "font-medium text-[#243b52]"}`}>{row.value}</dd>
                </span>
              </div>)}
            </dl>
          </div>)}
        </div>;
      })}
    </div>
  </section>;
}
