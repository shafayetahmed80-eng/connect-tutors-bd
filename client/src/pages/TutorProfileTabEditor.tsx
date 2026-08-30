import React from "react";
import { ChevronLeft, PencilLine } from "lucide-react";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";

const TAB_LABELS: Record<TutorProfileSectionId, string> = {
  a: "Identity",
  b: "Family & emergency",
  c: "Education & expertise",
  d: "Tuition, location & communication",
  e: "Introduction",
};

type TutorProfileTabEditorProps = {
  sections: TutorProfileReadoutSection[];
  activeTab: TutorProfileSectionId;
  onTabChange: (id: TutorProfileSectionId) => void;
  onEditSection: (id: TutorProfileSectionId) => void;
  onBackToOverview: () => void;
};

/** Tabbed editor: one tab per section, each showing that section's read-out
 *  grouped into sub-cards; every sub-card's pencil opens the section's popup. */
export function TutorProfileTabEditor({ sections, activeTab, onTabChange, onEditSection, onBackToOverview }: TutorProfileTabEditorProps) {
  const active = sections.find(section => section.id === activeTab) ?? sections[0];

  return <div className="space-y-5">
    <button
      type="button"
      onClick={onBackToOverview}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-[#167ddd] transition hover:bg-[#f0faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167ddd]"
    >
      <ChevronLeft size={16} /> Back to overview
    </button>

    <div role="tablist" aria-label="Profile sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-[#dce8f0] bg-white p-1.5 shadow-sm">
      {sections.map(section => {
        const rows = section.groups.flatMap(group => group.rows);
        const filled = rows.filter(row => !row.missing).length;
        const isActive = section.id === activeTab;
        return <button
          key={section.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onTabChange(section.id)}
          className={`flex min-w-max flex-1 flex-col items-start gap-0.5 rounded-xl px-3.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167ddd] ${isActive ? "bg-[#167ddd] text-white" : "text-[#4d6d84] hover:bg-[#f0faff]"}`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">Section {section.id.toUpperCase()}</span>
          <span className="text-sm font-bold leading-tight">{TAB_LABELS[section.id]}</span>
          <span className={`text-[11px] font-semibold ${isActive ? "text-white/85" : "text-[#8496a6]"}`}>{filled}/{rows.length} filled</span>
        </button>;
      })}
    </div>

    <div role="tabpanel" aria-label={active.title} className="space-y-4">
      {active.groups.map((group, groupIndex) => {
        const heading = group.heading ?? active.title;
        const filled = group.rows.filter(row => !row.missing).length;
        return <section key={groupIndex} className="rounded-3xl border border-[#dce8f0] bg-white p-5 shadow-[0_12px_30px_rgba(38,83,117,0.06)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-[-0.02em] text-[#173b60]">{heading}</h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1" aria-hidden="true">
                  {group.rows.map((row, rowIndex) => <span key={rowIndex} className={`h-1.5 w-6 rounded-full ${row.missing ? "bg-[#e6eef4]" : "bg-[#22a06b]"}`} />)}
                </div>
                <span className="text-xs font-semibold text-[#8496a6]">{filled}/{group.rows.length}</span>
              </div>
            </div>
            <button
              type="button"
              aria-label={`Edit ${heading}`}
              onClick={() => onEditSection(active.id)}
              className="shrink-0 rounded-lg border border-[#cfe2ee] p-2 text-[#167ddd] transition hover:bg-[#f0faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167ddd]"
            >
              <PencilLine size={16} />
            </button>
          </div>
          <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {group.rows.map(row => <div key={row.label} className="flex flex-wrap gap-x-2 text-sm leading-6">
              <dt className="text-[#6b8497]">{row.label}</dt>
              <dd className={`font-semibold ${row.missing ? "text-[#d0493f]" : "text-[#274d6d]"}`}>: {row.value}</dd>
            </div>)}
          </dl>
        </section>;
      })}
    </div>
  </div>;
}
