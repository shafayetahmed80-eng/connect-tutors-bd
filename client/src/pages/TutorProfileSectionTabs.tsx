import React from "react";
import { Check } from "lucide-react";
import { useSiteContentText, useSiteContentTextStyle } from "@/lib/siteContent";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";

/** Short chip labels; the full section name stays as the panel heading. */
const TAB_LABELS: Record<TutorProfileSectionId, string> = {
  a: "Personal",
  c: "Education",
  d: "Tuition Related",
  f: "Credential",
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
    {sections.map(section => <SectionTab
      key={section.id}
      section={section}
      isActive={section.id === activeTab}
      onSelect={() => onTabChange(section.id)}
    />)}
  </div>;
}

/**
 * One tab, sized by its own text.
 *
 * The Owner sets the tab label's size, and the chip has to follow it: with a
 * fixed 44px height and 12px padding, shrinking the text only grew the empty
 * space around it. So the chosen size goes on the button rather than on an
 * inner span, and every measurement below is in `em` - halve the text and the
 * chip halves with it, raise it and the chip grows.
 */
function SectionTab({ section, isActive, onSelect }: {
  section: TutorProfileReadoutSection;
  isActive: boolean;
  onSelect: () => void;
}) {
  const slotId = `tutor-profile.tab.${section.id}`;
  const label = useSiteContentText(slotId, TAB_LABELS[section.id]);
  const textStyle = useSiteContentTextStyle(slotId);
  const { filled, total, complete } = requiredCount(section.groups.flatMap(group => group.rows));

  return <button
    type="button"
    role="tab"
    aria-selected={isActive}
    onClick={onSelect}
    style={textStyle}
    className={`flex min-w-max flex-1 items-center justify-center gap-[0.4em] rounded-lg px-[0.85em] py-[0.5em] text-sm leading-[1.4] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 ${
      isActive ? "bg-white font-semibold text-j-ink shadow-[0_1px_3px_rgba(23,59,96,0.14),0_1px_1px_rgba(23,59,96,0.06)]" : "font-medium text-j-ink-soft hover:text-j-ink"
    }`}
  >
    <span className="truncate">{label}</span>
    {total === 0 ? null : <span className={`shrink-0 text-[0.8em] font-bold tabular-nums ${
      complete ? "text-[#1c8a5b]" : isActive ? "text-j-accent" : "text-[#94a6b4]"
    }`}>
      {complete ? <Check size="1em" aria-hidden={true} /> : `${filled}/${total}`}
    </span>}
  </button>;
}
