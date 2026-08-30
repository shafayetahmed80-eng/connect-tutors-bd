import React from "react";
import { PencilLine, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";
import type { TutorProfileSectionId } from "./TutorProfileSectionDraft";

type TutorProfileReadViewProps = {
  sections: TutorProfileReadoutSection[];
  photoUrl: string | null;
  onEditSection: (sectionId: TutorProfileSectionId) => void;
  onEditAll: () => void;
};

/** Read-only overview of the whole profile. Empty required values read "Not given". */
export function TutorProfileReadView({ sections, photoUrl, onEditSection, onEditAll }: TutorProfileReadViewProps) {
  return <div className="space-y-5">
    <div className="flex flex-col gap-4 rounded-3xl border border-[#dce8f0] bg-white p-5 shadow-[0_12px_30px_rgba(38,83,117,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#eef5fa] text-[#8fb0c4]">
          {photoUrl ? <img src={photoUrl} alt="Your Tutor profile photo" className="h-full w-full object-cover" /> : <UserRound size={26} aria-hidden="true" />}
        </div>
        <div>
          <p className="text-sm font-bold text-[#173b60]">Your Tutor profile</p>
          <p className="mt-0.5 text-sm text-[#647f93]">Review your information, then edit any section.</p>
        </div>
      </div>
      <Button type="button" onClick={onEditAll} className="shrink-0 rounded-xl bg-[#167ddd] font-bold hover:bg-[#0e6dc2]">
        <PencilLine size={16} /> Edit Information
      </Button>
    </div>

    {sections.map(section => <section key={section.id} aria-labelledby={`readout-${section.id}`} className="rounded-3xl border border-[#dce8f0] bg-white p-5 shadow-[0_12px_30px_rgba(38,83,117,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1680c2]">Section {section.id.toUpperCase()}</p>
          <h2 id={`readout-${section.id}`} className="mt-1.5 text-lg font-bold tracking-[-0.02em] text-[#173b60]">{section.title}</h2>
        </div>
        <button
          type="button"
          aria-label={`Edit ${section.title}`}
          onClick={() => onEditSection(section.id)}
          className="shrink-0 rounded-lg border border-[#cfe2ee] p-2 text-[#167ddd] transition hover:bg-[#f0faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167ddd]"
        >
          <PencilLine size={16} />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {section.groups.map((group, groupIndex) => <div key={groupIndex}>
          {group.heading ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#8496a6]">{group.heading}</p> : null}
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {group.rows.map(rowItem => <div key={rowItem.label} className="flex flex-wrap gap-x-2 text-sm leading-6">
              <dt className="text-[#6b8497]">{rowItem.label}</dt>
              <dd className={`font-semibold ${rowItem.missing ? "text-[#d0493f]" : "text-[#274d6d]"}`}>: {rowItem.value}</dd>
            </div>)}
          </dl>
        </div>)}
      </div>
    </section>)}
  </div>;
}
