import React from "react";
import { PencilLine } from "lucide-react";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { TutorProfileReadoutRows } from "./TutorProfileReadoutRows";
import { TutorProfileSectionTabs } from "./TutorProfileSectionTabs";
import { getTutorProfileSectionGroups, type TutorProfileSectionGroupId } from "./TutorProfileSectionDraft";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";

/**
 * The Tutor Profile body: a segmented-control tab bar over one read-out panel
 * at a time. Each section's panel lists its sub-groups as ruled sub-cards;
 * every sub-card's pencil opens that sub-group's edit popup.
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
        const groupTarget = activeGroupTargets?.[groupIndex];
        return <section key={groupIndex} className={`${tp.card} p-4 sm:p-5`}>
          <div className="flex items-center justify-between gap-3 border-b border-j-border pb-3">
            <h3 className={`text-sm ${tp.heading}`}>{heading}</h3>
            <button
              type="button"
              aria-label={`Edit ${groupTarget?.label ?? heading}`}
              onClick={() => onEditSection(active.id, groupTarget?.id)}
              className={`-my-1 shrink-0 ${tp.ghostIconButton}`}
            >
              <PencilLine size={15} />
            </button>
          </div>
          <div className="mt-3">
            <TutorProfileReadoutRows rows={group.rows} />
          </div>
        </section>;
      })}
    </div>
  </div>;
}
