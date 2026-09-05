import React from "react";
import { PencilLine } from "lucide-react";
import { SiteBlocks, SiteText, useSiteContentSpacingClass } from "@/lib/siteContent";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { TutorProfileReadoutRows } from "./TutorProfileReadoutRows";
import { TutorProfileSectionTabs } from "./TutorProfileSectionTabs";
import type { TutorProfileSectionGroupId } from "./TutorProfileSectionDraft";
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
  const sectionPadding = useSiteContentSpacingClass("tutor-profile.spacing.section-card");

  return <div className={tp.stack}>
    <SiteBlocks anchorId="tutor-profile.top" />
    <TutorProfileSectionTabs sections={sections} activeTab={activeTab} onTabChange={onTabChange} />

    <div role="tabpanel" aria-label={active.title} className="space-y-4">
      {active.groups.map((group, groupIndex) => {
        const heading = group.heading ?? active.title;
        const groupTarget = group.editTarget;
        return <section key={groupIndex} className={`${tp.card} ${sectionPadding}`}>
          <div className="flex items-center justify-between gap-3 border-b border-j-border pb-3">
            <h3 className={tp.heading}>
              {groupTarget ? <SiteText slotId={`tutor-profile.group.${groupTarget}`} fallback={heading} className="text-sm" /> : <span className="text-sm">{heading}</span>}
            </h3>
            <button
              type="button"
              aria-label={`Edit ${heading}`}
              onClick={() => onEditSection(active.id, groupTarget)}
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
      <SiteBlocks anchorId="tutor-profile.bottom" />
    </div>
  </div>;
}
