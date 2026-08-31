import React from "react";
import { Check, GraduationCap, MapPinned, MessageSquareText, User } from "lucide-react";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";

const TAB_LABELS: Record<TutorProfileSectionId, string> = {
  a: "Personal Information",
  c: "Education & expertise",
  d: "Tuition, location & communication",
  e: "Introduction",
};

const SECTION_ICON: Record<TutorProfileSectionId, typeof User> = {
  a: User,
  c: GraduationCap,
  d: MapPinned,
  e: MessageSquareText,
};

function requiredCount(rows: { optional?: boolean; missing: boolean }[]) {
  const required = rows.filter(row => !row.optional);
  const filled = required.filter(row => !row.missing).length;
  return { filled, total: required.length, complete: required.length > 0 && filled === required.length };
}

/**
 * Segmented-control tab bar for the Tutor Profile sections. Sticky under the
 * dashboard header; each tab shows the section name, an accent icon and a
 * filled/required badge (a check once the section is complete).
 */
export function TutorProfileSectionTabs({ sections, activeTab, onTabChange }: {
  sections: TutorProfileReadoutSection[];
  activeTab: TutorProfileSectionId;
  onTabChange: (id: TutorProfileSectionId) => void;
}) {
  return <div
    role="tablist"
    aria-label="Profile sections"
    className="sticky top-16 z-20 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-j-border bg-j-surface-sunken/80 p-1 shadow-sm backdrop-blur"
  >
    {sections.map(section => {
      const { filled, total, complete } = requiredCount(section.groups.flatMap(group => group.rows));
      const isActive = section.id === activeTab;
      const Icon = SECTION_ICON[section.id];
      return <button
        key={section.id}
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => onTabChange(section.id)}
        className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 ${
          isActive ? "bg-white text-j-ink shadow-[0_1px_3px_rgba(23,59,96,0.14),0_1px_1px_rgba(23,59,96,0.06)]" : "text-j-ink-soft hover:text-j-ink"
        }`}
      >
        <Icon size={15} className={`shrink-0 ${isActive ? "text-j-accent" : "text-[#94a6b4]"}`} aria-hidden={true} />
        <span className="truncate">{TAB_LABELS[section.id]}</span>
        <span className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
          complete ? "bg-[#e8f6ef] text-[#1c8a5b]" : isActive ? "bg-j-accent-wash text-j-accent" : "bg-white text-[#8496a6]"
        }`}>
          {complete ? <Check size={11} aria-hidden={true} /> : total === 0 ? "Optional" : `${filled}/${total}`}
        </span>
      </button>;
    })}
  </div>;
}
