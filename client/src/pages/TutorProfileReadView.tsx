import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, GraduationCap, MapPinned, MessageSquareText, PencilLine, User } from "lucide-react";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { TutorProfileReadoutRows } from "./TutorProfileReadoutRows";
import { getTutorProfileSectionGroups, type TutorProfileSectionGroupId } from "./TutorProfileSectionDraft";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";

type TutorProfileReadViewProps = {
  sections: TutorProfileReadoutSection[];
  onEditSection: (sectionId: TutorProfileSectionId, groupId?: TutorProfileSectionGroupId) => void;
};

const SECTION_ICON: Record<TutorProfileSectionId, typeof User> = {
  a: User,
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
 * Read-only overview. A sticky section-nav row jumps to (and opens) any
 * section; below it, one collapsible card per section (Identity open by
 * default). Sections split into sub-groups ("Personal Information",
 * "Education and teaching expertise") show a pencil per group heading; the
 * others show one on the card header. Empty required values read "Not given"
 * in red, empty optional values read "—".
 */
export function TutorProfileReadView({ sections, onEditSection }: TutorProfileReadViewProps) {
  const [open, setOpen] = useState<Set<TutorProfileSectionId>>(() => new Set<TutorProfileSectionId>(["a"]));
  const [activeId, setActiveId] = useState<TutorProfileSectionId>(sections[0]?.id ?? "a");
  const sectionRefs = useRef<Partial<Record<TutorProfileSectionId, HTMLElement | null>>>({});

  const toggle = (id: TutorProfileSectionId) =>
    setOpen(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const goToSection = (id: TutorProfileSectionId) => {
    setOpen(current => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
    setActiveId(id);
    sectionRefs.current[id]?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  // Highlight the nav item for whichever section sits near the top of the viewport.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      entries => {
        const nearest = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = nearest?.target.getAttribute("data-section-id") as TutorProfileSectionId | null;
        if (id) setActiveId(id);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    Object.values(sectionRefs.current).forEach(element => element && observer.observe(element));
    return () => observer.disconnect();
  }, [sections.length]);

  return <div className="space-y-3">
    <nav aria-label="Profile sections" className="sticky top-16 z-20 -mx-1 overflow-x-auto rounded-2xl border border-j-border bg-white/95 p-1.5 shadow-sm backdrop-blur">
      <div className="flex gap-1">
        {sections.map(section => {
          const { filled, total, complete } = sectionProgress(section);
          const isActive = section.id === activeId;
          return <button
            key={section.id}
            type="button"
            aria-current={isActive ? "true" : undefined}
            onClick={() => goToSection(section.id)}
            className={`flex min-w-max shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 ${isActive ? "bg-j-accent text-white" : "text-j-ink-soft hover:bg-j-accent-wash"}`}
          >
            <span>{section.title}</span>
            <span className={`rounded-full px-1.5 text-[11px] font-bold ${isActive ? "bg-white/20 text-white" : complete ? "text-[#1c8a5b]" : "text-[#8496a6]"}`}>
              {complete ? <Check size={11} aria-hidden={true} /> : total === 0 ? "—" : `${filled}/${total}`}
            </span>
          </button>;
        })}
      </div>
    </nav>

    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
      {sections.map(section => {
        const isOpen = open.has(section.id);
        const { filled, total, complete } = sectionProgress(section);
        const Icon = SECTION_ICON[section.id];
        const preview = sectionPreview(section);
        const groupTargets = getTutorProfileSectionGroups(section.id);
        return <section
          key={section.id}
          ref={element => { sectionRefs.current[section.id] = element; }}
          data-section-id={section.id}
          aria-labelledby={`readout-${section.id}`}
          className={`scroll-mt-32 ${tp.card} ${isOpen ? "lg:col-span-2" : ""}`}
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
            {groupTargets ? null : <button
              type="button"
              aria-label={`Edit ${section.title}`}
              onClick={() => onEditSection(section.id)}
              className={`shrink-0 ${tp.ghostIconButton}`}
            >
              <PencilLine size={16} />
            </button>}
          </div>

          {isOpen ? <div className="space-y-4 border-t border-j-border px-4 py-4 sm:px-5">
            {section.groups.map((group, groupIndex) => {
              const groupTarget = groupTargets?.[groupIndex];
              return <div key={groupIndex}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  {group.heading ? <p className={tp.eyebrow}>{group.heading}</p> : <span />}
                  {groupTarget ? <button
                    type="button"
                    aria-label={`Edit ${groupTarget.label}`}
                    onClick={() => onEditSection(section.id, groupTarget.id)}
                    className={`shrink-0 ${tp.ghostIconButton}`}
                  >
                    <PencilLine size={15} />
                  </button> : null}
                </div>
                <TutorProfileReadoutRows rows={group.rows} />
              </div>;
            })}
          </div> : null}
        </section>;
      })}
    </div>
  </div>;
}
