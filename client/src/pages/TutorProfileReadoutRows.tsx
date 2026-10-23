import React, { useRef, useState } from "react";
import { Check, Loader2, PencilLine, Plus, X } from "lucide-react";
import { useSiteContentTextStyle } from "@/lib/siteContent";
import { LabelIcon } from "@/components/recordIcons";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import type { TutorProfileReadoutRow } from "./TutorProfileSectionReadout";

export type InlineEditFieldType = "text" | "number" | "date" | "textarea";

export function getInlineEditableType(fieldId?: string): InlineEditFieldType | null {
  if (!fieldId) return null;
  // Non-editable/locked fields
  if (fieldId === "name" || fieldId === "phone") return null;

  // Textarea fields
  if (
    [
      "aboutMe",
      "teachingApproach",
      "whyChooseMe",
      "additionalNotes",
      "priorTeachingExperience",
      "specialExpertise",
      "academicAchievement",
    ].includes(fieldId)
  ) {
    return "textarea";
  }

  // Date fields
  if (fieldId === "dateOfBirth") return "date";

  // Numeric fields
  if (
    [
      "feeMin",
      "feeMax",
      "travelDistanceKm",
      "teachingExperienceYears",
      "graduationYear",
    ].includes(fieldId)
  ) {
    return "number";
  }

  // Single text inputs
  if (
    [
      "headline",
      "contactEmail",
      "deptId",
      "resultGpa",
      "degreeExamTitle",
      "privateDetails.nationality",
      "privateDetails.religion",
      "privateDetails.permanentAddress",
      "privateDetails.additionalPhone",
      "privateDetails.socialProfileLinks",
      "privateDetails.fatherName",
      "privateDetails.fatherPhone",
      "privateDetails.motherName",
      "privateDetails.motherPhone",
      "privateDetails.emergencyContactName",
      "privateDetails.emergencyContactRelation",
      "privateDetails.emergencyContactPhone",
      "privateDetails.emergencyContactAddress",
    ].includes(fieldId)
  ) {
    return "text";
  }

  return null;
}

/**
 * One group of read-out rows as a ruled record list, shared by the tab editor
 * panels. Label above value on phones; `label | value` on a hairline-divided
 * row from `sm` up; two columns from `lg` up. Every empty field reads "Not
 * given"; the colour is what separates a required blank (red) from an optional
 * one (muted), and a required blank carries an Add that opens its editor.
 *
 * Enhanced with Package 3 inline editing: quick text/number/textarea fields
 * can be edited directly inline with instant blur/Enter auto-save.
 */
export function TutorProfileReadoutRows({
  rows,
  onAdd,
  onInlineSave,
}: {
  rows: TutorProfileReadoutRow[];
  onAdd?: () => void;
  onInlineSave?: (fieldId: string, value: string) => Promise<boolean>;
}) {
  const sizeStyle = useSiteContentTextStyle("tutor-profile.size.record-row");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);
  const [justSavedFieldId, setJustSavedFieldId] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const startEditing = (row: TutorProfileReadoutRow) => {
    if (!row.fieldId || !onInlineSave) return;
    setEditingFieldId(row.fieldId);
    setDraftValue(row.value === "Not given" ? "" : row.value);
    setInlineError(null);
  };

  const cancelEditing = () => {
    setEditingFieldId(null);
    setDraftValue("");
    setInlineError(null);
  };

  const handleSave = async (fieldId: string) => {
    if (!onInlineSave) return;
    setSavingFieldId(fieldId);
    setInlineError(null);
    try {
      const success = await onInlineSave(fieldId, draftValue.trim());
      if (success) {
        setJustSavedFieldId(fieldId);
        setEditingFieldId(null);
        setTimeout(() => {
          setJustSavedFieldId(current => (current === fieldId ? null : current));
        }, 2000);
      } else {
        setInlineError("Could not save field. Please try again.");
      }
    } catch {
      setInlineError("Save failed. Please try again.");
    } finally {
      setSavingFieldId(null);
    }
  };

  return (
    <dl className="grid lg:grid-cols-2 lg:gap-x-10">
      {rows.map(row => {
        const requiredBlank = row.missing && !row.optional;
        const inlineType = getInlineEditableType(row.fieldId);
        const canInline = Boolean(inlineType && onInlineSave);
        const isEditing = editingFieldId === row.fieldId;
        const isSaving = savingFieldId === row.fieldId;
        const isSaved = justSavedFieldId === row.fieldId;

        return (
          <div
            key={row.label}
            className="flex flex-col gap-px border-b border-tp-border/60 py-1.5 last:border-b-0 sm:flex-row sm:items-start sm:gap-3 sm:py-2 lg:[&:nth-last-child(2)]:border-b-0 group"
          >
            <dt
              className={`flex items-start gap-1.5 text-[11px] leading-[1.6] sm:w-40 sm:shrink-0 sm:text-[12px] ${tp.rowLabelTone}`}
              style={sizeStyle}
            >
              <span aria-hidden="true" className="flex h-[1.6em] w-[13px] shrink-0 items-center text-tp-accent-soft">
                <LabelIcon label={row.label} />
              </span>
              {row.label}
            </dt>

            {isEditing ? (
              <dd className="flex-1 min-w-0 py-0.5">
                <div className="flex flex-col gap-1 w-full max-w-md">
                  <div className="flex items-center gap-1.5">
                    {inlineType === "textarea" ? (
                      <textarea
                        autoFocus
                        value={draftValue}
                        onChange={e => setDraftValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Escape") cancelEditing();
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            void handleSave(row.fieldId!);
                          }
                        }}
                        onBlur={() => {
                          const original = row.value === "Not given" ? "" : row.value;
                          if (draftValue.trim() !== original.trim()) {
                            void handleSave(row.fieldId!);
                          } else {
                            cancelEditing();
                          }
                        }}
                        disabled={isSaving}
                        rows={3}
                        className="w-full rounded-lg border border-blue-400 bg-white p-2 text-xs leading-relaxed text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder={`Enter ${row.label.toLowerCase()}...`}
                      />
                    ) : (
                      <input
                        autoFocus
                        type={inlineType === "number" ? "number" : inlineType === "date" ? "date" : "text"}
                        value={draftValue}
                        onChange={e => setDraftValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Escape") cancelEditing();
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleSave(row.fieldId!);
                          }
                        }}
                        onBlur={() => {
                          const original = row.value === "Not given" ? "" : row.value;
                          if (draftValue.trim() !== original.trim()) {
                            void handleSave(row.fieldId!);
                          } else {
                            cancelEditing();
                          }
                        }}
                        disabled={isSaving}
                        className="flex-1 rounded-lg border border-blue-400 bg-white px-2.5 py-1 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder={`Enter ${row.label.toLowerCase()}...`}
                      />
                    )}
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => void handleSave(row.fieldId!)}
                      disabled={isSaving}
                      aria-label={`Save ${row.label}`}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} className="stroke-[2.5]" />}
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={cancelEditing}
                      disabled={isSaving}
                      aria-label={`Cancel editing ${row.label}`}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 active:scale-95"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  {inlineError && <p className="text-2xs text-rose-600">{inlineError}</p>}
                </div>
              </dd>
            ) : requiredBlank && onAdd ? (
              <dd className="flex min-w-0 flex-wrap items-center gap-x-2 text-[13px] leading-[1.6] sm:text-[12px]" style={sizeStyle}>
                <span className={tp.rowValueMissingTone}>{row.value}</span>
                {canInline ? (
                  <button
                    type="button"
                    onClick={() => startEditing(row)}
                    aria-label={`Quick edit ${row.label}`}
                    className="inline-flex items-center gap-0.5 rounded font-semibold text-blue-600 hover:underline max-sm:-my-3 max-sm:-mr-2 max-sm:px-2 max-sm:py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  >
                    <PencilLine size={11} aria-hidden={true} />
                    Quick Add
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onAdd}
                  aria-label={`Add ${row.label}`}
                  className="inline-flex items-center gap-0.5 rounded font-semibold text-tp-accent hover:underline max-sm:-my-3 max-sm:-mr-2 max-sm:px-2 max-sm:py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-accent/40"
                >
                  <Plus size={12} aria-hidden={true} />Add
                </button>
              </dd>
            ) : (
              <dd
                className={`min-w-0 break-words text-[13px] leading-[1.6] sm:text-[12px] inline-flex items-center gap-1.5 ${
                  requiredBlank ? tp.rowValueMissingTone : row.missing ? tp.rowValueMutedTone : tp.rowValueTone
                }`}
                style={sizeStyle}
              >
                {row.value}
                {isSaved ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-2xs font-semibold text-emerald-700 border border-emerald-200 animate-in fade-in">
                    <Check size={10} className="stroke-[3]" />
                    Saved
                  </span>
                ) : canInline ? (
                  <button
                    type="button"
                    onClick={() => startEditing(row)}
                    aria-label={`Edit ${row.label} inline`}
                    className="opacity-0 group-hover:opacity-100 max-sm:opacity-80 inline-flex items-center justify-center size-5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 transition-all focus-visible:opacity-100 focus-visible:outline-none"
                  >
                    <PencilLine size={11} aria-hidden={true} />
                  </button>
                ) : null}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}
