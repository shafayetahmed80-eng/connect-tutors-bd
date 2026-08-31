import React from "react";
import { Check, ChevronLeft, GraduationCap, MapPinned, MessageSquareText, PencilLine, User, Users } from "lucide-react";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { TutorProfileReadoutRows } from "./TutorProfileReadoutRows";
import { getTutorProfileSectionGroups, type TutorProfileSectionGroupId } from "./TutorProfileSectionDraft";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";

const TAB_LABELS: Record<TutorProfileSectionId, string> = {
  a: "Identity",
  b: "Family & emergency",
  c: "Education & expertise",
  d: "Tuition, location & communication",
  e: "Introduction",
};

const SECTION_ICON: Record<TutorProfileSectionId, typeof User> = {
  a: User,
  b: Users,
  c: GraduationCap,
  d: MapPinned,
  e: MessageSquareText,
};

function requiredCount(rows: { optional?: boolean; missing: boolean }[]) {
  const required = rows.filter(row => !row.optional);
  const filled = required.filter(row => !row.missing).length;
  return { filled, total: required.length, complete: required.length > 0 && filled === required.length };
}

/** Tabbed editor: one tab per section, each showing that section's read-out
 *  grouped into sub-cards; every sub-card's pencil opens the section's popup. */
export function TutorProfileTabEditor({ sections, activeTab, onTabChange, onEditSection, onBackToOverview }: {
  sections: TutorProfileReadoutSection[];
  activeTab: TutorProfileSectionId;
  onTabChange: (id: TutorProfileSectionId) => void;
  onEditSection: (id: TutorProfileSectionId, groupId?: TutorProfileSectionGroupId) => void;
  onBackToOverview: () => void;
}) {
  const active = sections.find(section => section.id === activeTab) ?? sections[0];
  const activeGroupTargets = getTutorProfileSectionGroups(active.id);

  return <div className={tp.stack}>
    <button
      type="button"
      onClick={onBackToOverview}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-j-accent transition hover:bg-j-accent-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40"
    >
      <ChevronLeft size={16} /> Back to overview
    </button>

    <div role="tablist" aria-label="Profile sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-j-border bg-white p-1.5 shadow-sm">
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
          className={`flex min-w-max flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 ${isActive ? "bg-j-accent text-white" : "text-j-ink-soft hover:bg-j-accent-wash"}`}
        >
          <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${isActive ? "bg-white/20" : "bg-j-accent-wash text-j-accent"}`}>
            <Icon size={15} aria-hidden={true} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-tight">{TAB_LABELS[section.id]}</span>
            <span className={`flex items-center gap-1 text-[11px] font-semibold ${isActive ? "text-white/85" : "text-[#8496a6]"}`}>
              {complete ? <Check size={11} aria-hidden={true} /> : null}{total === 0 ? "Optional" : `${filled}/${total} filled`}
            </span>
          </span>
        </button>;
      })}
    </div>

    <div role="tabpanel" aria-label={active.title} className="space-y-4">
      {active.groups.map((group, groupIndex) => {
        const heading = group.heading ?? active.title;
        const { filled, total, complete } = requiredCount(group.rows);
        const Icon = SECTION_ICON[active.id];
        const groupTarget = activeGroupTargets?.[groupIndex];
        return <section key={groupIndex} className={`${tp.card} ${tp.cardPad}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${complete ? "bg-[#e8f6ef] text-[#1c8a5b]" : "bg-j-accent-wash text-j-accent"}`}>
                <Icon size={16} aria-hidden={true} />
              </span>
              <h3 className={`text-[15px] leading-tight ${tp.heading}`}>{heading}</h3>
              <span className={`${tp.pill} shrink-0 ${complete ? "bg-[#e8f6ef] text-[#1c8a5b]" : "bg-j-surface-sunken text-[#6b8497]"}`}>
                {complete ? <Check size={12} aria-hidden={true} /> : null}{total === 0 ? "Optional" : `${filled}/${total}`}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Edit ${groupTarget?.label ?? heading}`}
              onClick={() => onEditSection(active.id, groupTarget?.id)}
              className={`shrink-0 ${tp.ghostIconButton}`}
            >
              <PencilLine size={16} />
            </button>
          </div>
          <div className="mt-4">
            <TutorProfileReadoutRows rows={group.rows} />
          </div>
        </section>;
      })}
    </div>
  </div>;
}
