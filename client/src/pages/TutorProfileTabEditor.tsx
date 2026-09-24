import React from "react";
import { Check, PencilLine, Plus } from "lucide-react";
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
export function TutorProfileTabEditor({ sections, activeTab, onTabChange, onEditSection, justSaved = null }: {
  sections: TutorProfileReadoutSection[];
  activeTab: TutorProfileSectionId;
  onTabChange: (id: TutorProfileSectionId) => void;
  onEditSection: (id: TutorProfileSectionId, groupId?: TutorProfileSectionGroupId) => void;
  /** The section or card saved a moment ago, marked Saved for a few seconds. */
  justSaved?: TutorProfileSectionId | TutorProfileSectionGroupId | null;
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
          <div className="flex items-center justify-between gap-3 border-b border-tp-border pb-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className={tp.heading}>
                {groupTarget ? <SiteText slotId={`tutor-profile.group.${groupTarget}`} fallback={heading} className="text-sm" /> : <span className="text-sm">{heading}</span>}
              </h3>
              {justSaved != null && justSaved === (groupTarget ?? active.id)
                ? <span role="status" className="inline-flex items-center gap-1 rounded-full bg-j-ok-wash px-2 py-0.5 text-2xs font-semibold text-j-ok-ink motion-safe:animate-in motion-safe:fade-in"><Check size={12} aria-hidden={true} />Saved</span>
                : null}
            </div>
            <button
              type="button"
              aria-label={`Edit ${heading}`}
              onClick={() => onEditSection(active.id, groupTarget)}
              className={`-my-1 shrink-0 gap-1.5 sm:inline-flex sm:items-center sm:border sm:border-tp-border sm:px-2.5 sm:text-xs sm:font-semibold ${tp.ghostIconButton}`}
            >
              <PencilLine size={15} aria-hidden={true} /><span className="max-sm:hidden">Edit</span>
            </button>
          </div>
          <div className="mt-3">
            {group.rows.length > 0 && group.rows.every(row => row.missing)
              ? <EmptyCard heading={heading} fields={group.rows.map(row => row.label)} onAdd={() => onEditSection(active.id, groupTarget)} />
              : <TutorProfileReadoutRows rows={group.rows} onAdd={() => onEditSection(active.id, groupTarget)} />}
          </div>
        </section>;
      })}
      <SiteBlocks anchorId="tutor-profile.bottom" />
    </div>
  </div>;
}

/**
 * A card with nothing in it yet. A column of "Not given" says the same thing
 * once per field; this says it once, names what the card asks for, and puts
 * the way in where the eye already is.
 */
function EmptyCard({ heading, fields, onAdd }: { heading: string; fields: string[]; onAdd: () => void }) {
  return <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-tp-border bg-j-surface-sunken px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-tp-value">Nothing added here yet</p>
      <p className="mt-0.5 text-xs leading-5 text-tp-label">{fields.join(" · ")}</p>
    </div>
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add ${heading}`}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 px-3.5 text-xs max-sm:min-h-11 max-sm:w-full max-sm:justify-center ${tp.primaryButton}`}
    ><Plus size={14} aria-hidden={true} />Add</button>
  </div>;
}
