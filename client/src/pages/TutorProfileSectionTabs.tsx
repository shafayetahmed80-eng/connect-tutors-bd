import React from "react";
import { Check } from "lucide-react";
import { SiteText } from "@/lib/siteContent";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";

/** Short chip labels; the full section name stays as the panel heading. */
const TAB_LABELS: Record<TutorProfileSectionId, string> = {
  a: "Personal",
  c: "Education",
  d: "Tuition & location",
  e: "Introduction",
};

function requiredCount(rows: { optional?: boolean; missing: boolean }[]) {
  const required = rows.filter(row => !row.optional);
  const filled = required.filter(row => !row.missing).length;
  return { filled, total: required.length, complete: required.length > 0 && filled === required.length };
}

/**
 * Segmented-control tab bar for the Tutor Profile sections. Text-first (no
 * per-tab icon): a short label plus a quiet filled/required count, or a check
 * once the section is complete. Sticky under the dashboard header.
 */
export function TutorProfileSectionTabs({ sections, activeTab, onTabChange }: {
  sections: TutorProfileReadoutSection[];
  activeTab: TutorProfileSectionId;
  onTabChange: (id: TutorProfileSectionId) => void;
}) {
  return <div
    role="tablist"
    aria-label="Profile sections"
    className="sticky top-16 z-20 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-j-border bg-j-surface-sunken/80 p-1 shadow-sm backdrop-blur"
  >
    {sections.map(section => {
      const { filled, total, complete } = requiredCount(section.groups.flatMap(group => group.rows));
      const isActive = section.id === activeTab;
      return <button
        key={section.id}
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => onTabChange(section.id)}
        className={`flex min-h-11 min-w-max flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 ${
          isActive ? "bg-white font-semibold text-j-ink shadow-[0_1px_3px_rgba(23,59,96,0.14),0_1px_1px_rgba(23,59,96,0.06)]" : "font-medium text-j-ink-soft hover:text-j-ink"
        }`}
      >
        <SiteText slotId={`tutor-profile.tab.${section.id}`} fallback={TAB_LABELS[section.id]} className="truncate" />
        {total === 0 ? null : <span className={`shrink-0 text-[11px] font-bold tabular-nums ${
          complete ? "text-[#1c8a5b]" : isActive ? "text-j-accent" : "text-[#94a6b4]"
        }`}>
          {complete ? <Check size={12} aria-hidden={true} /> : `${filled}/${total}`}
        </span>}
      </button>;
    })}
  </div>;
}
