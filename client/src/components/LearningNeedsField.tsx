import { Check } from "lucide-react";
import ChipMultiSelect from "@/components/ChipMultiSelect";
import { RecordIcon } from "@/components/recordIcons";
import {
  getGuardianCurriculumTypesForCategory,
  getGuardianLevelsForCurriculum,
  getGuardianSubjectsForLearningNeed,
  guardianCurriculumCategories,
} from "@/lib/guardianLearningCatalog";
import type { LearningNeed } from "@shared/learning-needs";
import { defaultSiteLimits, type SiteLimitValues } from "@shared/site-limits";

export type LearningNeedsLimits = { maxCurricula: number; maxClasses: number; maxSubjectsPerClass: number };

/** The three numbers the field is bounded by, from the Owner's limits (or the shipped ones while those load). */
export function learningNeedsLimitsFrom(limits: Partial<SiteLimitValues> | undefined): LearningNeedsLimits {
  const shipped = defaultSiteLimits();
  return {
    maxCurricula: limits?.["request.curricula"] ?? shipped["request.curricula"],
    maxClasses: limits?.["request.levels"] ?? shipped["request.levels"],
    maxSubjectsPerClass: limits?.["request.subjects"] ?? shipped["request.subjects"],
  };
}

/** The field's own words, which the Guardian journey lets the Owner rename. */
export type LearningNeedsLabels = { category: string; curriculumType: string; classCourse: string; subjects: string };
const defaultLabels: LearningNeedsLabels = { category: "Curriculum / category", curriculumType: "Curriculum Type", classCourse: "Class / level", subjects: "Subjects" };

const roomy = {
  legend: "text-sm font-extrabold text-j-ink-strong",
  block: "rounded-xl border border-j-border bg-j-surface-sunken/50 p-4",
  stack: "space-y-5",
  label: "block text-[13px] font-semibold text-j-ink-soft",
  select: "mt-1.5 h-11 w-full rounded-xl border border-j-field-border bg-white px-3 text-sm text-j-ink outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100",
  count: "rounded-full px-3 py-1 text-xs font-extrabold",
  chip: "relative inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition duration-150",
  icon: 15,
} as const;

const dense = {
  legend: "text-[11px] font-semibold text-j-ink-soft",
  block: "rounded-lg border border-j-border bg-j-surface-sunken/50 p-2.5",
  stack: "space-y-2.5",
  label: "block text-[11px] font-semibold leading-tight text-j-ink-soft",
  select: "mt-1 h-8 w-full rounded-lg border border-j-field-border bg-white px-2 text-[11px] text-j-ink outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100",
  count: "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
  chip: "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition",
  icon: 12,
} as const;

const star = <span className="text-[#d74545]"> *</span>;

/**
 * What a request asks to have taught, chosen in place: one or more curricula,
 * the classes wanted in each, and the subjects wanted in each class.
 *
 * One list on screen: pick the curricula, and each one opens a block for its
 * own classes; pick a class and its own subjects appear under it, because the
 * choices differ from class to class. The three numbers that bound it - how
 * many curricula, how many classes in all, how many subjects in a class - are
 * the Owner's, handed in by the form that hosts it.
 *
 * Shared by the Guardian journey and the Admin's Add Tuition form, which differ
 * only in scale (`dense`) and in how they say no (`onNotice`).
 */
export default function LearningNeedsField({
  value,
  onChange,
  limits,
  dense: tight = false,
  onNotice,
  labels: given,
}: {
  value: LearningNeed[];
  onChange: (next: LearningNeed[]) => void;
  limits: LearningNeedsLimits;
  dense?: boolean;
  /** Told why a choice was refused - a subject over the limit - so the host can show it its own way. */
  onNotice?: (message: string) => void;
  labels?: Partial<LearningNeedsLabels>;
}) {
  const labels = { ...defaultLabels, ...given };
  const look = tight ? dense : roomy;
  const totalClasses = value.reduce((total, need) => total + need.classes.length, 0);

  const setCurricula = (ids: string[]) => {
    onChange(ids.map(id => value.find(need => need.category === id) ?? { category: id, curriculumType: null, classes: [] }));
  };
  const updateNeed = (category: string, patch: (need: LearningNeed) => LearningNeed) => {
    onChange(value.map(need => need.category === category ? patch(need) : need));
  };
  const setClasses = (category: string, ids: string[]) => updateNeed(category, need => ({
    ...need,
    classes: ids.map(id => need.classes.find(item => item.classCourse === id) ?? { classCourse: id, subjects: [] }),
  }));
  const toggleSubject = (category: string, classCourse: string, subject: string) => {
    const current = value.find(need => need.category === category)?.classes.find(item => item.classCourse === classCourse);
    if (!current) return;
    // A subject over the class's limit changes nothing and says why.
    if (!current.subjects.includes(subject) && current.subjects.length >= limits.maxSubjectsPerClass) {
      onNotice?.(`You can choose up to ${limits.maxSubjectsPerClass} subjects for each class. Remove one to add another.`);
      return;
    }
    updateNeed(category, need => ({
      ...need,
      classes: need.classes.map(item => item.classCourse !== classCourse ? item : {
        ...item,
        subjects: item.subjects.includes(subject) ? item.subjects.filter(name => name !== subject) : [...item.subjects, subject],
      }),
    }));
  };

  return <div className={look.stack}>
    <div>
      <ChipMultiSelect
        label={labels.category}
        options={guardianCurriculumCategories.map(category => ({ id: category, label: category }))}
        selectedIds={value.map(need => need.category)}
        onChange={setCurricula}
        maxSelections={limits.maxCurricula}
        required
      />
    </div>
    {value.map(need => {
      const otherClasses = totalClasses - need.classes.length;
      const types = getGuardianCurriculumTypesForCategory(need.category);
      return <fieldset key={need.category} aria-label={need.category} className={look.block}>
        <legend className={`${look.legend} px-1`}>
          <span className="inline-flex items-center gap-1.5"><RecordIcon name="category" size={look.icon} className="text-j-accent" />{need.category}</span>
        </legend>
        <div className={look.stack}>
          {types.length ? <label className="block">
            <span className={look.label}>{labels.curriculumType}{star}</span>
            <select
              value={need.curriculumType ?? ""}
              onChange={event => updateNeed(need.category, current => ({ ...current, curriculumType: event.target.value || null }))}
              className={look.select}
            >
              <option value="">Choose a Curriculum Type</option>
              {types.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label> : null}
          <ChipMultiSelect
            label={labels.classCourse}
            options={getGuardianLevelsForCurriculum(need.category).map(level => ({ id: level, label: level }))}
            selectedIds={need.classes.map(item => item.classCourse)}
            onChange={ids => setClasses(need.category, ids)}
            maxSelections={Math.max(need.classes.length, limits.maxClasses - otherClasses)}
            required
          />
          {need.classes.map(item => {
            const subjects = getGuardianSubjectsForLearningNeed(need.category, item.classCourse);
            return <fieldset key={item.classCourse} aria-label={`Subjects for ${item.classCourse}`}>
              <legend className={look.legend}>
                <span className="inline-flex items-center gap-1.5"><RecordIcon name="subjects" size={look.icon} className="text-j-accent" />{labels.subjects} — {item.classCourse}{star}</span>
              </legend>
              <div className="mt-1 flex justify-end">
                <span
                  role="status"
                  aria-live="polite"
                  aria-label={`${item.subjects.length} of ${limits.maxSubjectsPerClass} subjects selected for ${item.classCourse}`}
                  className={`${look.count} ${item.subjects.length ? "bg-j-accent-wash text-[#126ea9]" : "bg-[#f6f9fb] text-[#71889b]"}`}
                >{item.subjects.length} of {limits.maxSubjectsPerClass} selected</span>
              </div>
              <div className={`mt-2 flex flex-wrap ${tight ? "gap-1.5" : "gap-2"}`}>
                {subjects.map(subject => {
                  const selected = item.subjects.includes(subject);
                  return <button
                    key={subject}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSubject(need.category, item.classCourse, subject)}
                    className={`${look.chip} ${selected ? "border-j-accent bg-j-accent-wash text-[#126ea9]" : "border-[#dbe7ef] bg-white text-j-ink hover:bg-[#f2f8fd]"}`}
                  >{selected ? <Check size={tight ? 11 : 13} aria-hidden={true} /> : null}{subject}</button>;
                })}
              </div>
            </fieldset>;
          })}
        </div>
      </fieldset>;
    })}
  </div>;
}

/**
 * The first thing missing from a list of needs, in the words the forms use, or
 * null when it is complete. Mirrors `checkLearningNeeds` in the shared module,
 * but says it to a person.
 */
export function describeLearningNeedsGap(needs: LearningNeed[], limits: LearningNeedsLimits): string | null {
  if (needs.length === 0) return "Choose a curriculum or category to continue.";
  if (needs.length > limits.maxCurricula) return `Choose at most ${limits.maxCurricula} curricula.`;
  const classCount = needs.reduce((total, need) => total + need.classes.length, 0);
  for (const need of needs) {
    if (getGuardianCurriculumTypesForCategory(need.category).length && !getGuardianCurriculumTypesForCategory(need.category).includes(need.curriculumType ?? "")) {
      return `Choose a Curriculum Type for ${need.category} to continue.`;
    }
    if (need.classes.length === 0) return `Choose a class or level for ${need.category} to continue.`;
  }
  if (classCount > limits.maxClasses) return `Choose at most ${limits.maxClasses} classes.`;
  for (const need of needs) {
    for (const item of need.classes) {
      if (item.subjects.length === 0) return `Select at least one subject for ${item.classCourse} to continue.`;
      if (item.subjects.length > limits.maxSubjectsPerClass) return `You can choose up to ${limits.maxSubjectsPerClass} subjects for each class.`;
    }
  }
  return null;
}
