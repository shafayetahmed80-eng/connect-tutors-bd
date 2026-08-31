import React, { useState } from "react";
import { Check, ChevronDown, GraduationCap, MapPinned, MessageSquareText, PencilLine, User, Users } from "lucide-react";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { TutorProfileReadoutRows } from "./TutorProfileReadoutRows";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";

type TutorProfileReadViewProps = {
  sections: TutorProfileReadoutSection[];
  onEditSection: (sectionId: TutorProfileSectionId) => void;
};

const SECTION_ICON: Record<TutorProfileSectionId, typeof User> = {
  a: User,
  b: Users,
  c: GraduationCap,
  d: MapPinned,
  e: MessageSquareText,
};

/** Filled vs. required count for a section (optional rows don't count). */
function sectionProgress(section: TutorProfileReadoutSection) {
  const required = section.groups.flatMap(group => group.rows).filter(row => !row.optional);
  const filled = required.filter(row => !row.missing).length;
  return { filled, total: required.length, complete: required.length > 0 && filled === required.length };
}

/** First few filled values, joined — the one-line preview shown while collapsed. */
function sectionPreview(section: TutorProfileReadoutSection): string {
  return section.groups
    .flatMap(group => group.rows)
    .filter(row => !row.missing)
    .slice(0, 3)
    .map(row => row.value)
    .join(" · ");
}

/**
 * Read-only overview. One collapsible card per section (Identity open by
 * default); each card header carries a filled/required chip and a pencil that
 * opens the section's popup editor. Empty required values read "Not given" in
 * red, empty optional values read "—".
 */
export function TutorProfileReadView({ sections, onEditSection }: TutorProfileReadViewProps) {
  const [open, setOpen] = useState<Set<TutorProfileSectionId>>(() => new Set<TutorProfileSectionId>(["a"]));
  const toggle = (id: TutorProfileSectionId) =>
    setOpen(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
    {sections.map(section => {
      const isOpen = open.has(section.id);
      const { filled, total, complete } = sectionProgress(section);
      const Icon = SECTION_ICON[section.id];
      const preview = sectionPreview(section);
      return <section
        key={section.id}
        aria-labelledby={`readout-${section.id}`}
        className={`${tp.card} ${isOpen ? "lg:col-span-2" : ""}`}
      >
        <div className="flex items-center gap-2 p-4 sm:px-5">
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => toggle(section.id)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40"
          >
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${complete ? "bg-[#e8f6ef] text-[#1c8a5b]" : "bg-j-accent-wash text-j-accent"}`}>
              <Icon size={17} aria-hidden={true} />
            </span>
            <span className="min-w-0 flex-1">
              <h2 id={`readout-${section.id}`} className={`text-[15px] leading-tight ${tp.heading}`}>{section.title}</h2>
              {!isOpen && preview ? <span className={`mt-0.5 block truncate text-xs ${tp.bodySoft}`}>{preview}</span> : null}
            </span>
            <span className={`${tp.pill} shrink-0 ${complete ? "bg-[#e8f6ef] text-[#1c8a5b]" : "bg-j-surface-sunken text-[#6b8497]"}`}>
              {complete ? <Check size={12} aria-hidden={true} /> : null}
              {total === 0 ? "Optional" : `${filled}/${total}`}
            </span>
            <ChevronDown size={16} className={`shrink-0 text-[#6b8497] transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} aria-hidden={true} />
          </button>
          <button
            type="button"
            aria-label={`Edit ${section.title}`}
            onClick={() => onEditSection(section.id)}
            className={`shrink-0 ${tp.ghostIconButton}`}
          >
            <PencilLine size={16} />
          </button>
        </div>

        {isOpen ? <div className="space-y-4 border-t border-j-border px-4 py-4 sm:px-5">
          {section.groups.map((group, groupIndex) => <div key={groupIndex}>
            {group.heading ? <p className={`mb-2 ${tp.eyebrow}`}>{group.heading}</p> : null}
            <TutorProfileReadoutRows rows={group.rows} />
          </div>)}
        </div> : null}
      </section>;
    })}
  </div>;
}
