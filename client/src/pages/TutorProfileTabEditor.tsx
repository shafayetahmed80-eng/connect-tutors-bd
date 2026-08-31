import React from "react";
import { Check, GraduationCap, MapPinned, MessageSquareText, PencilLine, User } from "lucide-react";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { TutorProfileReadoutRows } from "./TutorProfileReadoutRows";
import { TutorProfileSectionTabs } from "./TutorProfileSectionTabs";
import { getTutorProfileSectionGroups, type TutorProfileSectionGroupId } from "./TutorProfileSectionDraft";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";

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
 * The Tutor Profile body: a segmented-control tab bar over one read-out panel
 * at a time. Each section's panel shows its sub-groups as sub-cards; every
 * sub-card's pencil opens that sub-group's edit popup.
 */
export function TutorProfileTabEditor({ sections, activeTab, onTabChange, onEditSection }: {
  sections: TutorProfileReadoutSection[];
  activeTab: TutorProfileSectionId;
  onTabChange: (id: TutorProfileSectionId) => void;
  onEditSection: (id: TutorProfileSectionId, groupId?: TutorProfileSectionGroupId) => void;
}) {
  const active = sections.find(section => section.id === activeTab) ?? sections[0];
  const activeGroupTargets = getTutorProfileSectionGroups(active.id);

  return <div className={tp.stack}>
    <TutorProfileSectionTabs sections={sections} activeTab={activeTab} onTabChange={onTabChange} />

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
