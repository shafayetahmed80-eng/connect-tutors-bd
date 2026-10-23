import React, { useRef } from "react";
import { Check, PencilLine, Plus } from "lucide-react";
import { SiteBlocks, SiteText, useSiteContentSpacingClass } from "@/lib/siteContent";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { TutorProfileReadoutRows } from "./TutorProfileReadoutRows";
import { TutorProfileSectionTabs } from "./TutorProfileSectionTabs";
import type { TutorProfileSectionGroupId } from "./TutorProfileSectionDraft";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";
import { ORDERED_PROFILE_SECTION_IDS } from "@/components/TutorProfileBottomNav";

/**
 * The Tutor Profile body: a segmented-control tab bar over one read-out panel
 * at a time. Each section's panel lists its sub-groups as ruled sub-cards;
 * every sub-card's pencil opens that sub-group's edit popup.
 *
 * Supports fluid horizontal touch swipe navigation on mobile between sections,
 * tactile touch-friendly edit buttons, and group completion status badges.
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

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Minimum 50px horizontal swipe with horizontal delta dominating vertical delta
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      const currentIndex = ORDERED_PROFILE_SECTION_IDS.indexOf(activeTab);
      if (currentIndex === -1) return;

      if (deltaX < 0 && currentIndex < ORDERED_PROFILE_SECTION_IDS.length - 1) {
        // Swipe left -> Next tab
        const nextTab = ORDERED_PROFILE_SECTION_IDS[currentIndex + 1];
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          try { navigator.vibrate(10); } catch {}
        }
        onTabChange(nextTab);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe right -> Previous tab
        const prevTab = ORDERED_PROFILE_SECTION_IDS[currentIndex - 1];
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          try { navigator.vibrate(10); } catch {}
        }
        onTabChange(prevTab);
      }
    }
  };

  return <div className={tp.stack}>
    <SiteBlocks anchorId="tutor-profile.top" />
    <TutorProfileSectionTabs sections={sections} activeTab={activeTab} onTabChange={onTabChange} />

    <div
      role="tabpanel"
      aria-label={active.title}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="space-y-4 touch-pan-y"
    >
      {active.groups.map((group, groupIndex) => {
        const heading = group.heading ?? active.title;
        const groupTarget = group.editTarget;
        const missingRequiredCount = group.rows.filter(r => r.missing && !r.optional).length;
        const isGroupComplete = group.rows.length > 0 && missingRequiredCount === 0;

        return <section key={groupIndex} className={`${tp.card} ${sectionPadding}`}>
          <div className="flex items-center justify-between gap-3 border-b border-tp-border pb-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className={tp.heading}>
                {groupTarget ? <SiteText slotId={`tutor-profile.group.${groupTarget}`} fallback={heading} className="text-sm" /> : <span className="text-sm">{heading}</span>}
              </h3>
              {justSaved != null && justSaved === (groupTarget ?? active.id) ? (
                <span role="status" className="inline-flex items-center gap-1 rounded-full bg-j-ok-wash px-2 py-0.5 text-2xs font-semibold text-j-ok-ink motion-safe:animate-in motion-safe:fade-in">
                  <Check size={12} aria-hidden={true} />Saved
                </span>
              ) : isGroupComplete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-semibold text-emerald-700 border border-emerald-200/70">
                  <Check size={10} className="stroke-[3]" aria-hidden={true} />Complete
                </span>
              ) : missingRequiredCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-semibold text-amber-700 border border-amber-200/70">
                  {missingRequiredCount} required left
                </span>
              ) : null}
            </div>
            <button
              type="button"
              aria-label={`Edit ${heading}`}
              onClick={() => onEditSection(active.id, groupTarget)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            >
              <PencilLine size={13} className="stroke-[2.2]" aria-hidden={true} />
              <span>Edit</span>
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
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 px-3.5 text-xs max-sm:min-h-control max-sm:w-full max-sm:justify-center active:scale-[0.98] transition-all ${tp.primaryButton}`}
    ><Plus size={14} aria-hidden={true} />Add</button>
  </div>;
}
