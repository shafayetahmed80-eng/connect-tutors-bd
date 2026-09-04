import { SearchableMultiSelect, type SelectorOption } from "@/components/TutorProfileSelectors";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { clearTutorOnboardingDraft } from "@/lib/tutorOnboarding";
import { SiteContentProvider, SiteText } from "@/lib/siteContent";
import { CATALOG_SEARCH_LIMIT } from "@shared/catalog-search";
import { academicEducationLevels, qualificationCurricula, qualificationEducationLevels } from "@shared/tutor-education";
import {
  MAX_TUTOR_DOCUMENT_BYTES,
  TUTOR_DOCUMENT_ACCEPT_ATTRIBUTE,
  tutorSupportingDocumentLabels,
  tutorSupportingDocumentTypes,
  type TutorSupportingDocumentType,
} from "@shared/tutor-documents";
import { Check, ChevronDown, ImagePlus, LockKeyhole, PencilLine, Plus, Trash2, X } from "lucide-react";
import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { TutorOnboardingDraft } from "@/lib/tutorOnboarding";
import { TutorProfileIdentityRail } from "./TutorProfileIdentityRail";
import { TutorProfileSummaryView } from "./TutorProfileSummaryView";
import { createProfileDraftPayload, getProfileDraftFeedback, hydrateTutorProfileForm, type PersistedTutorProfileForForm, type TutorProfileFormState } from "./TutorProfileFormData";
import { getTutorProfileCompletionSummary, getTutorProfileSubmissionErrors, tutorProfileCopy, type TutorProfileSubmissionErrorKey, type TutorProfileSubmissionErrors } from "./TutorProfileUx";
import { getTutorProfileServerValidationErrors } from "./TutorProfileServerValidation";
import { getTutorProfileMutationFailureFeedback } from "./TutorProfileMutationFeedback";
import { getTutorProfileWizardStepForErrors, tutorProfileWizardSteps } from "./TutorProfileWizard";
import { resolveTutorProfileHistoryNavigation } from "./TutorProfileNavigationGuard";
import { getTutorProfileStatusCard } from "./TutorProfileStatusCard";
import { TutorProfilePhotoEditor } from "@/components/TutorProfilePhotoEditor";
import { tutorProfileResponsiveClasses } from "./TutorProfileResponsive";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { createTutorProfileSectionDraftPayload, getTutorProfileSectionGroups, tutorProfileSectionDefinitions, type TutorProfileEditTarget, type TutorProfileSectionGroupId, type TutorProfileSectionId } from "./TutorProfileSectionDraft";
import { expandGroupedClassLevelIds, getGroupedClassLevelSelector } from "./TutorProfileClassLevels";
import { getTutorProfileReadoutSections, type TutorProfileReadoutResolvers } from "./TutorProfileSectionReadout";
import { TutorProfileSectionModal } from "@/components/TutorProfileSectionModal";
import { TutorProfileTabEditor } from "./TutorProfileTabEditor";

const fieldClassName = "mt-1 w-full rounded-lg border border-[#dbe7ef] bg-white px-2.5 py-1.5 text-[12px] text-[#173b60] outline-none transition placeholder:text-[#99aabb] focus:border-[#167ddd] focus:ring-2 focus:ring-[#dceffe] disabled:cursor-not-allowed disabled:bg-[#f4f8fb]";

/**
 * Two columns of controls that are all one line tall.
 *
 * Long-form fields are deliberately kept out and given `md:col-span-2` instead:
 * a textarea beside a one-line select stretches its row to the taller of the
 * two, which is what made these panels look ragged.
 */
const compactFieldGridClassName = "grid gap-x-5 gap-y-4 md:grid-cols-2";
/** Full-width row inside `compactFieldGridClassName`. */
const wideFieldClassName = "md:col-span-2";

/**
 * A titled block of related fields.
 *
 * The three long panels used to be one undifferentiated grid, so a tutor had no
 * way to see where one topic ended and the next began. Every panel now reads as
 * a short list of named groups.
 */
function FormSection({ title, description, children }: { title?: React.ReactNode; description?: string; children: React.ReactNode }) {
  // A raised panel rather than a rule between blocks. The dialog body is
  // tinted, so each white group lifts off it the way the reference's floating
  // cards lift off their backdrop - the same layering, in the site's own blues.
  return <section className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(23,59,96,0.04),0_8px_20px_-12px_rgba(22,119,232,0.18)] ring-1 ring-[#dbe9f4]">
    {title ? <div className="flex items-baseline gap-2 border-b border-[#e9f2f8] bg-gradient-to-b from-[#f8fcff] to-[#f1f8fd] px-4 py-2.5">
      {/* A short accent spine, the one place the panel is coloured. */}
      <span aria-hidden="true" className="h-3.5 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#4aa6f0] to-[#1677e8]" />
      <h3 className="text-[13px] font-bold text-[#244a6a]">{title}</h3>
      {description ? <p className="text-[11px] leading-4 text-[#72889a]">{description}</p> : null}
    </div> : null}
    <div className="p-4">{children}</div>
  </section>;
}

/**
 * A small set of mutually exclusive choices, laid out as a labelled row of
 * buttons rather than a bordered fieldset.
 *
 * The fieldsets these replace carried their own heavy border and a third label
 * style, so they read as a different kind of thing from the fields beside them.
 */
function ChoiceGroup({ label, name, value, options, onChange, required = false, error }: {
  label: string;
  name: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}) {
  return <div role="radiogroup" aria-label={label} className={tutorProfileResponsiveClasses.fieldRoot}>
    <span className={tp.fieldLabel}>{label}{required ? <span aria-hidden="true" className={tp.requiredMark}> *</span> : null}</span>
    <div className="mt-1 grid gap-1.5 sm:grid-cols-3">
      {options.map(([optionValue, optionLabel]) => <label
        key={optionValue}
        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#dceffe] ${value === optionValue ? "border-[#167ddd] bg-[#f0faff] font-semibold text-[#15557f]" : "border-[#dbe7ef] text-[#315b78] hover:border-[#b9d5e6]"}`}
      >
        <input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} className="h-4 w-4 border-[#9fc7de] text-[#167ddd]" />
        {optionLabel}
      </label>)}
    </div>
    <InlineError message={error} />
  </div>;
}

const sectionTitles: Record<TutorProfileSectionId, string> = {
  a: "Personal Information",
  c: "Education and teaching expertise",
  d: "Tuition, location and communication",
  e: "Introduction and review",
};

const editTargetTitles: Record<TutorProfileSectionGroupId, string> = {
  "a-identity": "Identity and contact",
  "a-family": "Family and emergency contact",
  "c-education": "Education",
  "c-teaching": "Teaching expertise",
};

function editTargetTitle(target: TutorProfileEditTarget): string {
  return editTargetTitles[target as TutorProfileSectionGroupId] ?? sectionTitles[target as TutorProfileSectionId];
}

type CatalogOption = { id: number | string; name: string };

export type TeachingProfileState = TutorProfileFormState & {
  primarySubjectIds: string[];
  additionalSubjectIds: string[];
  classLevelIds: string[];
  curriculumIds: string[];
  teachingExperienceYears: string;
  priorTeachingExperience: string;
  specialExpertise: string;
  studentTypeIds: string[];
  academicAchievement: string;
};

function hydrateTeachingProfile(
  profile: (PersistedTutorProfileForForm & Record<string, unknown>) | null | undefined,
  onboardingFallback: TutorOnboardingDraft | null,
): TeachingProfileState {
  const base = hydrateTutorProfileForm(profile, onboardingFallback);
  return {
    ...base,
    primarySubjectIds: Array.isArray(profile?.primarySubjectIds) ? profile.primarySubjectIds.map(String) : [],
    additionalSubjectIds: Array.isArray(profile?.additionalSubjectIds) ? profile.additionalSubjectIds.map(String) : [],
    classLevelIds: Array.isArray(profile?.classLevelIds) ? profile.classLevelIds.map(String) : [],
    curriculumIds: Array.isArray(profile?.curriculumIds) ? profile.curriculumIds.map(String) : [],
    teachingExperienceYears: typeof profile?.teachingExperienceYears === "number" ? String(profile.teachingExperienceYears) : "",
    priorTeachingExperience: typeof profile?.priorTeachingExperience === "string" ? profile.priorTeachingExperience : "",
    specialExpertise: typeof profile?.specialExpertise === "string" ? profile.specialExpertise : "",
    studentTypeIds: Array.isArray(profile?.studentTypeIds) ? profile.studentTypeIds.map(String) : [],
    academicAchievement: typeof profile?.academicAchievement === "string" ? profile.academicAchievement : "",
  };
}

function toSelectorOptions(options: CatalogOption[] | undefined): SelectorOption[] {
  return (options ?? []).map(option => ({ id: String(option.id), label: option.name }));
}

function getProfileDraftFingerprint(state: TeachingProfileState) {
  const { profilePhotoUrl: _profilePhotoUrl, ...editableFields } = state;
  return JSON.stringify(editableFields);
}

function CatalogSearchField({
  label,
  query,
  onQueryChange,
  options,
  selectedId,
  onSelectedIdChange,
  limit,
  disabled = false,
  required = false,
  hint,
  error,
}: {
  label: string;
  query: string;
  onQueryChange: (query: string) => void;
  options: CatalogOption[] | undefined;
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  /** Page size the options came from; used to warn when results were cut off. */
  limit?: number;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
}) {
  const listId = `catalog-${label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const selectedOption = options?.find(option => String(option.id) === selectedId);

  // A saved profile arrives as an id with no text, so seed the box from the
  // selection. The input is otherwise driven only by `query`: deriving it as
  // `query || selectedName` made an empty box impossible, so backspacing to
  // clear silently snapped the old name back.
  useEffect(() => {
    if (selectedId && !query && selectedOption) onQueryChange(selectedOption.name);
  }, [selectedId, selectedOption?.name]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    onQueryChange(nextValue);
    const selection = options?.find(option => option.name === nextValue);
    if (selection) onSelectedIdChange(String(selection.id));
    // Text that no longer names the selection must drop it, or the form keeps
    // submitting an option the Tutor can no longer see in the box.
    else if (selectedId) onSelectedIdChange("");
  };

  const clearSelection = () => {
    onQueryChange("");
    onSelectedIdChange("");
  };

  // A full page of results means the catalog had more to give.
  const truncated = limit !== undefined && (options?.length ?? 0) >= limit;

  return <label className={`${tp.fieldRow} ${tutorProfileResponsiveClasses.fieldRoot}`}>
    <span className={tp.fieldLabel}>{label}{required ? <span aria-hidden="true" className={tp.requiredMark}> *</span> : null}</span>
    <span className="relative mt-1 block">
      <input
        className={`${fieldClassName} mt-0 ${query ? "pr-9" : ""} ${error ? "border-[#d84a4a]" : ""}`}
        type="text"
        role="combobox"
        aria-expanded={false}
        aria-autocomplete="list"
        aria-controls={listId}
        list={listId}
        value={query}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        onChange={onChange}
        placeholder={disabled ? `Select the previous field first` : `Search ${label.toLocaleLowerCase()}`}
      />
      {/* Own button rather than the browser's search ✕, whose clear event left
          the selected id behind while the text snapped back. */}
      {query && !disabled ? <button
        type="button"
        onClick={clearSelection}
        aria-label={`Clear ${label}`}
        className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-[#6b8497] hover:bg-[#eef5fb] hover:text-[#244a6a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40"
      >
        <X size={14} />
      </button> : null}
    </span>
    <datalist id={listId}>{(options ?? []).map(option => <option key={option.id} value={option.name} />)}</datalist>
    {hint ? <span className="mt-1 block text-[11px] font-normal leading-4 text-[#72889a]">{hint}</span> : null}
    {truncated ? <span className="mt-1 block text-[11px] font-normal leading-4 text-[#72889a]">Showing the first {limit} matches — type more to narrow the list.</span> : null}
    {error ? <span role="alert" className="mt-1 block text-[11px] font-medium leading-4 text-[#b43e3e]">{error}</span> : null}
  </label>;
}

function FormInput({ label, hint, error, required = false, showRequiredMarker = required, ...props }: { label: string; hint?: string; error?: string; required?: boolean; showRequiredMarker?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className={`${tp.fieldRow} ${tutorProfileResponsiveClasses.fieldRoot}`}><span className={tp.fieldLabel}>{label}{showRequiredMarker ? <span aria-hidden="true" className={tp.requiredMark}> *</span> : null}</span><input {...props} required={required} aria-invalid={Boolean(error)} aria-required={showRequiredMarker || undefined} className={`${fieldClassName} ${error ? "border-[#d84a4a]" : ""}`} />{hint ? <span className="mt-1 block text-[11px] font-normal leading-4 text-[#72889a]">{hint}</span> : null}{error ? <span role="alert" className="mt-1 block text-[11px] font-medium leading-4 text-[#b43e3e]">{error}</span> : null}</label>;
}

/** Single-select for the Education section's curated vocabularies. */
function FormSelect({ label, options, placeholder, error, showRequiredMarker = false, ...props }: {
  label: string;
  options: readonly string[];
  placeholder: string;
  error?: string;
  showRequiredMarker?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <label className={`${tp.fieldRow} ${tutorProfileResponsiveClasses.fieldRoot}`}>
    <span className={tp.fieldLabel}>{label}{showRequiredMarker ? <span aria-hidden="true" className={tp.requiredMark}> *</span> : null}</span>
    <select {...props} aria-label={label} aria-invalid={Boolean(error)} aria-required={showRequiredMarker || undefined} className={`${fieldClassName} ${error ? "border-[#d84a4a]" : ""}`}>
      <option value="">{placeholder}</option>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
    {error ? <span role="alert" className="mt-1 block text-[11px] font-medium leading-4 text-[#b43e3e]">{error}</span> : null}
  </label>;
}

function FormTextArea({ label, hint, error, required = false, showRequiredMarker = required, rows = 3, ...props }: { label: string; hint?: string; error?: string; required?: boolean; showRequiredMarker?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <label className={`${tp.fieldRow} ${tutorProfileResponsiveClasses.fieldRoot}`}><span className={tp.fieldLabel}>{label}{showRequiredMarker ? <span aria-hidden="true" className={tp.requiredMark}> *</span> : null}</span><textarea {...props} rows={rows} required={required} aria-required={showRequiredMarker || undefined} aria-invalid={Boolean(error)} className={`${fieldClassName} resize-y ${error ? "border-[#d84a4a]" : ""}`} />{hint ? <span className="mt-1 block text-[11px] font-normal leading-4 text-[#72889a]">{hint}</span> : null}{error ? <span role="alert" className="mt-1 block text-[11px] font-medium leading-4 text-[#b43e3e]">{error}</span> : null}</label>;
}

/**
 * One ruled row in the private verification list: label on the left, upload
 * status and button on the right. Owns its own hidden file input so every
 * document can be picked independently.
 */
function DocumentUploadRow({ inputId, label, uploadLabel, required = false, uploaded, uploading, onSelectFile }: {
  inputId: string;
  label: string;
  uploadLabel: string;
  required?: boolean;
  uploaded: boolean;
  uploading: boolean;
  onSelectFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-j-border py-3 first:pt-0">
    <input
      ref={inputRef}
      id={inputId}
      className="sr-only"
      type="file"
      accept={TUTOR_DOCUMENT_ACCEPT_ATTRIBUTE}
      aria-label={`Upload ${label}`}
      aria-required={required || undefined}
      onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onSelectFile(file); }}
    />
    <p className="flex items-center gap-2 text-sm font-bold text-[#244a6a]">
      {required ? <LockKeyhole className="shrink-0 text-[#167ddd]" size={16} aria-hidden="true" /> : null}
      {label}
      {required ? <span aria-hidden="true" className="text-[#d84a4a]">*</span> : <span className="font-normal text-[#72889a]">(Optional)</span>}
    </p>
    <div className="flex items-center gap-2">
      {uploaded ? <span className="flex items-center gap-1 text-xs font-bold text-[#20734c]"><Check size={14} aria-hidden="true" />Uploaded</span> : null}
      <Button type="button" variant="outline" disabled={uploading} aria-busy={uploading} onClick={() => inputRef.current?.click()} className="rounded-lg border-[#9dcde7] text-[#167ddd]"><ImagePlus size={15} /> {uploading ? "Uploading…" : uploadLabel}</Button>
    </div>
  </div>;
}

/** Years are typed by hand, so keep the field to digits instead of a spinner. */
function digitsOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function InlineError({ message }: { message?: string }) {
  return message ? <p role="alert" className="mt-1.5 text-xs font-medium leading-5 text-[#b43e3e]">{message}</p> : null;
}

function TutorProfileWorkspaceBody({
  profile,
  onboardingFallback,
  onDirtyChange,
  tutorApplyReturnTo,
  onReturnToSelectedJob,
}: {
  profile: (PersistedTutorProfileForForm & Record<string, unknown>) | null | undefined;
  onboardingFallback: TutorOnboardingDraft | null;
  onDirtyChange?: (hasUnsavedChanges: boolean) => void;
  tutorApplyReturnTo?: string | null;
  onReturnToSelectedJob?: () => void;
}) {
  const [form, setForm] = useState(() => hydrateTeachingProfile(profile, onboardingFallback));
  const [universityQuery, setUniversityQuery] = useState("");
  const [departmentQuery, setDepartmentQuery] = useState("");
  const [currentLocationQuery, setCurrentLocationQuery] = useState("");
  const [teachingAreaQuery, setTeachingAreaQuery] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingUniversityId, setUploadingUniversityId] = useState(false);
  const [uploadingDocumentType, setUploadingDocumentType] = useState<TutorSupportingDocumentType | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [photoPreviewFailed, setPhotoPreviewFailed] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<TutorProfileSubmissionErrors>({});
  const [savedDraftFingerprint, setSavedDraftFingerprint] = useState(() => getProfileDraftFingerprint(hydrateTeachingProfile(profile, onboardingFallback)));
  const photoInputRef = useRef<HTMLInputElement>(null);
  // Snapshot of `form` taken when a section popup opens, restored if it is
  // closed without saving so Cancel/Escape/X discard the in-popup edits.
  const formBeforeSectionEditRef = useRef<TeachingProfileState | null>(null);
  const utils = trpc.useUtils();
  const saveDraftMutation = trpc.tutor.saveProfileDraft.useMutation();
  const submitProfileMutation = trpc.tutor.submitProfile.useMutation();
  const isTutorProfileApproved = profile?.profileStatus === "approved";

  useEffect(() => {
    if (!profile) return;
    const nextForm = hydrateTeachingProfile(profile, onboardingFallback);
    setForm(nextForm);
    setSavedDraftFingerprint(getProfileDraftFingerprint(nextForm));
  }, [profile, onboardingFallback]);

  useEffect(() => {
    setPhotoPreviewFailed(false);
  }, [form.profilePhotoUrl]);

  const universityId = Number(form.universityId);
  const universities = trpc.catalog.searchUniversities.useQuery({ query: universityQuery, limit: CATALOG_SEARCH_LIMIT });
  const facultyDepartments = trpc.catalog.searchFacultyDepartments.useQuery({ query: departmentQuery, limit: CATALOG_SEARCH_LIMIT });
  const subjects = trpc.catalog.searchSubjects.useQuery({ query: "", limit: 50 });
  const classLevels = trpc.catalog.searchClassLevels.useQuery({ query: "", limit: 50 });
  const curricula = trpc.catalog.searchCurricula.useQuery({ query: "", limit: 50 });
  const studentTypes = trpc.catalog.searchStudentTypes.useQuery({ query: "", limit: 50 });
  const languages = trpc.catalog.searchLanguages.useQuery({ query: "", limit: 50 });
  const bangladeshLocationTypes = useMemo<Array<"city" | "division" | "district" | "thana" | "upazila" | "subdivision" | "area">>(
    () => ["city", "division", "district", "thana", "upazila", "subdivision", "area"],
    [],
  );
  const currentLocationHydrationIds = useMemo(
    () => currentLocationQuery.trim() === "" && form.currentLocationId ? [form.currentLocationId] : undefined,
    [currentLocationQuery, form.currentLocationId],
  );
  const teachingAreaHydrationIds = useMemo(
    () => teachingAreaQuery.trim() === "" && form.teachingAreaIds.length > 0 ? form.teachingAreaIds : undefined,
    [teachingAreaQuery, form.teachingAreaIds],
  );
  const currentLocationSearchInput = useMemo(() => ({
    query: currentLocationQuery,
    limit: 50,
    types: bangladeshLocationTypes,
    ids: currentLocationHydrationIds,
  }), [bangladeshLocationTypes, currentLocationHydrationIds, currentLocationQuery]);
  const currentBangladeshLocations = trpc.catalog.searchBangladeshLocations.useQuery(currentLocationSearchInput);
  const selectedCurrentLocation = useMemo(
    () => currentBangladeshLocations.data?.find(location => location.id === form.currentLocationId),
    [currentBangladeshLocations.data, form.currentLocationId],
  );
  const teachingAreaParentId = selectedCurrentLocation?.type === "city" ? selectedCurrentLocation.id : undefined;
  const teachingAreaSearchInput = useMemo(() => ({
    query: teachingAreaQuery,
    limit: 50,
    types: bangladeshLocationTypes,
    ids: teachingAreaHydrationIds,
    parentId: teachingAreaParentId,
  }), [bangladeshLocationTypes, teachingAreaHydrationIds, teachingAreaParentId, teachingAreaQuery]);
  const teachingAreaLocations = trpc.catalog.searchBangladeshLocations.useQuery(teachingAreaSearchInput);

  const toLocationCatalogOptions = (locations: typeof currentBangladeshLocations.data): CatalogOption[] =>
    (locations ?? []).map(location => ({ id: location.id, name: `${location.label} · ${location.type}` }));
  const toTeachingAreaOptions = (locations: typeof teachingAreaLocations.data): SelectorOption[] =>
    (locations ?? []).map(location => ({ id: String(location.id), label: `${location.label} · ${location.type}` }));
  const currentLocationOptions = useMemo(() => toLocationCatalogOptions(currentBangladeshLocations.data), [currentBangladeshLocations.data]);
  const teachingAreaOptions = useMemo(() => toTeachingAreaOptions(teachingAreaLocations.data), [teachingAreaLocations.data]);
  const update = <Key extends keyof TeachingProfileState>(key: Key, value: TeachingProfileState[Key]) => {
    setForm(current => ({ ...current, [key]: value }));
    setFieldErrors(current => {
      const next = { ...current };
      delete next[key as TutorProfileSubmissionErrorKey];
      return next;
    });
  };
  const updatePrivateDetail = (key: keyof TeachingProfileState["privateDetails"], value: string) => {
    setForm(current => ({ ...current, privateDetails: { ...current.privateDetails, [key]: value } }));
    setFieldErrors(current => {
      const next = { ...current };
      delete next.privateDetails;
      return next;
    });
  };
  const updateEducationRecord = (index: number, key: keyof TeachingProfileState["educationRecords"][number], value: string | boolean) => {
    setForm(current => ({ ...current, educationRecords: current.educationRecords.map((record, recordIndex) => recordIndex === index ? { ...record, [key]: value } : record) }));
  };
  // Which Qualification history cards are expanded. Filled records collapse to a
  // one-line summary so a tutor with several qualifications keeps a short form.
  const [openQualificationIndices, setOpenQualificationIndices] = useState<Set<number>>(() => new Set([0]));
  const toggleQualification = (index: number) => setOpenQualificationIndices(current => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return next;
  });
  const addEducationRecord = () => {
    const newIndex = form.educationRecords.length;
    setForm(current => ({ ...current, educationRecords: [...current.educationRecords, { qualificationLevel: "", instituteName: "", degreeExamTitle: "", majorGroup: "", resultGpa: "", curriculum: "", studyStartYear: "", studyEndYear: "", currentlyStudying: false, instituteIdCardNumber: "" }] }));
    setOpenQualificationIndices(current => {
      const next = new Set(current);
      next.add(newIndex);
      return next;
    });
  };
  const removeEducationRecord = (index: number) => {
    setForm(current => ({ ...current, educationRecords: current.educationRecords.length === 1 ? current.educationRecords : current.educationRecords.filter((_, recordIndex) => recordIndex !== index) }));
    setOpenQualificationIndices(current => {
      const next = new Set<number>();
      current.forEach(openIndex => {
        if (openIndex < index) next.add(openIndex);
        else if (openIndex > index) next.add(openIndex - 1);
      });
      return next;
    });
  };

  const previewPayload = createProfileDraftPayload(form);
  const groupedClassLevels = useMemo(() => getGroupedClassLevelSelector(classLevels.data ?? [], form.classLevelIds), [classLevels.data, form.classLevelIds]);
  const completionSummary = getTutorProfileCompletionSummary(form);
  const completionPercentage = completionSummary.completionPercentage;
  const isSavingProfile = saveDraftMutation.isPending || submitProfileMutation.isPending || uploadingPhoto || uploadingUniversityId || uploadingDocumentType !== null;
  const [activeTab, setActiveTab] = useState<TutorProfileSectionId>("a");
  // "View Profile" swaps the tabbed editor for the read-only whole-profile
  // preview; the rail's button becomes "Edit Information" to come back.
  const [previewMode, setPreviewMode] = useState(false);
  const [editingSection, setEditingSection] = useState<TutorProfileSectionId | null>(null);
  // When set, the section popup shows only this sub-group (Section C is split so
  // its editor opens Education or Teaching expertise, not the whole thing).
  const [editingGroupId, setEditingGroupId] = useState<TutorProfileSectionGroupId | null>(null);

  // When the Education editor opens, expand only the qualifications that still
  // need work (and always at least the first), so gaps and errors stay visible
  // while completed entries stay collapsed.
  useEffect(() => {
    if (editingSection !== "c") return;
    const isComplete = (record: TeachingProfileState["educationRecords"][number]) =>
      Boolean(record.qualificationLevel && record.instituteName && record.degreeExamTitle && record.majorGroup && record.curriculum && record.studyStartYear
        && (record.currentlyStudying || record.studyEndYear));
    setOpenQualificationIndices(() => {
      const next = new Set<number>();
      form.educationRecords.forEach((record, index) => {
        if (!isComplete(record)) next.add(index);
      });
      if (next.size === 0) next.add(0);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot on open only
  }, [editingSection]);

  const readoutResolvers = useMemo<TutorProfileReadoutResolvers>(() => {
    // An id with no catalog match (page still loading, or the value sits past the
    // 50-row search cap) resolves to "" so the read view shows "Not given"
    // rather than leaking a raw numeric id.
    const byName = (rows?: ReadonlyArray<{ id: number | string; name: string }>) => {
      const map = new Map((rows ?? []).map(entry => [String(entry.id), entry.name] as const));
      return (id: string) => map.get(id) ?? "";
    };
    const byLabel = (rows?: ReadonlyArray<{ id: number | string; label: string }>) => {
      const map = new Map((rows ?? []).map(entry => [String(entry.id), entry.label] as const));
      return (id: string) => map.get(id) ?? "";
    };
    return {
      subject: byName(subjects.data),
      classLevel: byName(classLevels.data),
      curriculum: byName(curricula.data),
      studentType: byName(studentTypes.data),
      language: byName(languages.data),
      university: byName(universities.data),
      department: byName(facultyDepartments.data),
      location: byLabel(currentBangladeshLocations.data),
      area: byLabel(teachingAreaLocations.data),
    };
  }, [subjects.data, classLevels.data, curricula.data, studentTypes.data, languages.data, universities.data, facultyDepartments.data, currentBangladeshLocations.data, teachingAreaLocations.data]);
  const readoutSections = useMemo(() => getTutorProfileReadoutSections(form, readoutResolvers), [form, readoutResolvers]);
  const isDraftDirty = getProfileDraftFingerprint(form) !== savedDraftFingerprint;
  const firstErroredSection = (errors: TutorProfileSubmissionErrors): TutorProfileSectionId | null => {
    const step = getTutorProfileWizardStepForErrors(errors);
    if (step === null) return null;
    const raw = tutorProfileWizardSteps[step]?.sectionIds[0]?.replace("profile-section-", "");
    return raw ? (raw as TutorProfileSectionId) : null;
  };
  const statusCard = getTutorProfileStatusCard({
    profileStatus: profile?.profileStatus,
    completionPercentage,
    completed: completionSummary.completed,
    missingCount: completionSummary.missingCount,
    firstMissingLabel: completionSummary.firstMissingLabel,
    isDraftDirty,
    hasSelectedTuitionReturn: Boolean(tutorApplyReturnTo && onReturnToSelectedJob),
  });

  useEffect(() => {
    if (feedback?.type !== "success") return;
    const timeout = window.setTimeout(() => setFeedback(current => current === feedback ? null : current), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!isDraftDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDraftDirty]);

  useEffect(() => {
    if (!isDraftDirty) return;

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const guardState = { ...(window.history.state ?? {}), tutorProfileDirtyGuard: true };
    let restoringProfileRoute = false;
    window.history.pushState(guardState, "", currentUrl);

    const guardBrowserHistory = () => {
      if (restoringProfileRoute) {
        restoringProfileRoute = false;
        return;
      }

      const decision = resolveTutorProfileHistoryNavigation(true, () => window.confirm("You have unsaved profile changes. Leave this page and discard them?"));
      if (decision === "leave") return;

      restoringProfileRoute = true;
      window.history.go(1);
    };

    window.addEventListener("popstate", guardBrowserHistory);
    return () => window.removeEventListener("popstate", guardBrowserHistory);
  }, [isDraftDirty]);

  useEffect(() => {
    onDirtyChange?.(isDraftDirty);
    return () => onDirtyChange?.(false);
  }, [isDraftDirty, onDirtyChange]);

  const buildDraftInput = () => {
    const experience = form.teachingExperienceYears ? Number(form.teachingExperienceYears) : undefined;
    const selectedIds = (values: string[]) => values.map(Number).filter(Number.isInteger);
    const primarySubjectIds = selectedIds(form.primarySubjectIds);
    const additionalSubjectIds = selectedIds(form.additionalSubjectIds);
    const classLevelIds = selectedIds(form.classLevelIds);
    const curriculumIds = selectedIds(form.curriculumIds);
    const studentTypeIds = selectedIds(form.studentTypeIds);
    return {
      ...previewPayload,
      ...(primarySubjectIds.length > 0 ? { primarySubjectIds } : {}),
      ...(additionalSubjectIds.length > 0 ? { additionalSubjectIds } : {}),
      ...(classLevelIds.length > 0 ? { classLevelIds } : {}),
      ...(curriculumIds.length > 0 ? { curriculumIds } : {}),
      teachingExperienceYears: Number.isInteger(experience) ? experience : undefined,
      priorTeachingExperience: form.priorTeachingExperience.trim() || undefined,
      specialExpertise: form.specialExpertise.trim() || undefined,
      ...(studentTypeIds.length > 0 ? { studentTypeIds } : {}),
      academicAchievement: form.academicAchievement.trim() || undefined,
    };
  };

  const recoverServerValidationErrors = (error: unknown) => {
    const serverErrors = getTutorProfileServerValidationErrors(error);
    if (Object.keys(serverErrors).length === 0) return false;

    setFieldErrors(serverErrors);
    setFeedback({ type: "error", message: "Review the highlighted details and try again." });
    window.requestAnimationFrame(() => {
      const firstInvalidField = document.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalidField?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      firstInvalidField?.focus({ preventScroll: true });
    });
    return true;
  };

  const saveSectionDraft = async (target: TutorProfileEditTarget): Promise<boolean> => {
    setFeedback(null);
    try {
      await saveDraftMutation.mutateAsync(createTutorProfileSectionDraftPayload(target, form));
      clearTutorOnboardingDraft();
      setSavedDraftFingerprint(getProfileDraftFingerprint(form));
      await Promise.all([utils.tutor.getMyProfile.invalidate(), utils.tutor.getDashboardStats.invalidate()]);
      setFeedback({ type: "success", message: `${editTargetTitle(target)} saved. Continue with the next section when ready.` });
      return true;
    } catch (error) {
      if (!recoverServerValidationErrors(error)) {
        setFeedback({ type: "error", message: getTutorProfileMutationFailureFeedback(error).message });
      }
      return false;
    }
  };

  // The section popup edits the shared `form` directly. Reset any catalog search
  // typed inside it on close, otherwise `*.data` stays narrowed to the last
  // search and the read view shows raw ids for names that fell out of it.
  const resetSectionEditorSearch = () => {
    setUniversityQuery("");
    setDepartmentQuery("");
    setCurrentLocationQuery("");
    setTeachingAreaQuery("");
  };

  const openSectionEditor = (sectionId: TutorProfileSectionId, groupId?: TutorProfileSectionGroupId) => {
    formBeforeSectionEditRef.current = form;
    setFeedback(null);
    // An editor always belongs with the tabbed panel, never over the preview.
    setPreviewMode(false);
    setEditingGroupId(groupId ?? null);
    setEditingSection(sectionId);
  };

  // Close without saving: put the pre-edit values back.
  const closeSectionEditor = () => {
    if (formBeforeSectionEditRef.current) setForm(formBeforeSectionEditRef.current);
    formBeforeSectionEditRef.current = null;
    setEditingSection(null);
    setEditingGroupId(null);
    setFeedback(null);
    resetSectionEditorSearch();
  };

  // Close after a successful save (or a recovery flow): keep the edits.
  const finishSectionEditor = () => {
    formBeforeSectionEditRef.current = null;
    setEditingSection(null);
    setEditingGroupId(null);
    resetSectionEditorSearch();
  };

  const submitSectionModal = async () => {
    if (!editingSection) return;
    const saved = await saveSectionDraft(editingGroupId ?? editingSection);
    if (saved) finishSectionEditor();
  };

  const submitForReview = async () => {
    const submissionErrors = getTutorProfileSubmissionErrors(form);
    if (Object.keys(submissionErrors).length > 0) {
      setFieldErrors(submissionErrors);
      const target = firstErroredSection(submissionErrors);
      if (target) {
        setActiveTab(target);
        openSectionEditor(target);
      }
      setFeedback({ type: "error", message: "Complete the highlighted details before submitting for review." });
      window.requestAnimationFrame(() => {
        const firstInvalidField = document.querySelector<HTMLElement>("[aria-invalid='true']");
        firstInvalidField?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        firstInvalidField?.focus({ preventScroll: true });
      });
      return;
    }
    const validationMessage = getProfileDraftFeedback(form);
    if (validationMessage) {
      setFeedback({ type: "error", message: validationMessage });
      return;
    }

    setFeedback(null);
    try {
      await saveDraftMutation.mutateAsync(buildDraftInput());
      await submitProfileMutation.mutateAsync();
      clearTutorOnboardingDraft();
      setSavedDraftFingerprint(getProfileDraftFingerprint(form));
      await Promise.all([utils.tutor.getMyProfile.invalidate(), utils.tutor.getDashboardStats.invalidate()]);
      setFeedback({ type: "success", message: "Profile submitted." });
    } catch (error) {
      if (!recoverServerValidationErrors(error)) {
        setFeedback({ type: "error", message: getTutorProfileMutationFailureFeedback(error).message });
      }
    }
  };

  const closePhotoEditor = () => {
    setSelectedPhotoPreview(current => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0];
    if (!photo) return;
    const acceptedTypes = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(photo.type.toLowerCase())) {
      setFeedback({ type: "error", message: "Choose a JPEG, PNG, or WebP image. HEIC is not supported yet." });
      event.target.value = "";
      return;
    }
    closePhotoEditor();
    setSelectedPhotoPreview(URL.createObjectURL(photo));
    event.target.value = "";
  };

  const uploadPhoto = async (photo: File) => {
    setFeedback(null);
    setUploadingPhoto(true);
    try {
      const data = new FormData();
      data.append("photo", photo);
      const response = await fetch("/api/tutor/profile-photo", { method: "POST", body: data, credentials: "same-origin" });
      const result = await response.json().catch(() => ({})) as { error?: string; profilePhotoUrl?: string };
      if (!response.ok || !result.profilePhotoUrl) throw new Error(result.error || "Unable to upload the profile photo.");
      setForm(current => ({ ...current, profilePhotoUrl: result.profilePhotoUrl ?? null }));
      setFieldErrors(current => {
        const next = { ...current };
        delete next.profilePhotoUrl;
        return next;
      });
      await utils.tutor.getMyProfile.invalidate();
      setFeedback({ type: "success", message: "Photo uploaded." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to upload the profile photo." });
    } finally {
      setUploadingPhoto(false);
      closePhotoEditor();
    }
  };

  const removePhoto = async () => {
    if (!form.profilePhotoUrl || !window.confirm("Remove this profile photo? Add a new photo before submitting for review.")) return;
    setFeedback(null);
    setUploadingPhoto(true);
    try {
      const response = await fetch("/api/tutor/profile-photo", { method: "DELETE", credentials: "same-origin" });
      const result = await response.json().catch(() => ({})) as { error?: string; profilePhotoUrl?: null };
      if (!response.ok || result.profilePhotoUrl !== null) throw new Error(result.error || "Unable to remove the profile photo.");
      setForm(current => ({ ...current, profilePhotoUrl: null }));
      setFieldErrors(current => ({ ...current, profilePhotoUrl: "Photo removed. Add a new profile photo before submitting for review." }));
      await utils.tutor.getMyProfile.invalidate();
      setFeedback({ type: "success", message: "Photo removed." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to remove the profile photo." });
    } finally {
      setUploadingPhoto(false);
    }
  };

  /** Shared pre-flight so an obviously wrong file never reaches the server. */
  const rejectInvalidDocument = (file: File, label: string) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) return `${label} must be a JPEG, PNG, or WebP file.`;
    if (file.size > MAX_TUTOR_DOCUMENT_BYTES) return `${label} must be 5 MB or smaller.`;
    return null;
  };

  const uploadUniversityIdDocument = async (file: File) => {
    const invalid = rejectInvalidDocument(file, "University ID image");
    if (invalid) {
      setFeedback({ type: "error", message: invalid });
      return;
    }
    setUploadingUniversityId(true);
    setFeedback(null);
    try {
      const payload = new FormData();
      payload.append("document", file);
      const response = await fetch("/api/tutor/university-id-document", { method: "POST", credentials: "same-origin", body: payload });
      const result = await response.json().catch(() => ({})) as { error?: string; universityIdDocumentStatus?: "uploaded" };
      if (!response.ok || result.universityIdDocumentStatus !== "uploaded") throw new Error(result.error || "Unable to upload the University ID image.");
      setForm(current => ({ ...current, universityIdDocumentStatus: "uploaded" }));
      await utils.tutor.getMyProfile.invalidate();
      setFeedback({ type: "success", message: "University ID image uploaded for private verification." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to upload the University ID image." });
    } finally {
      setUploadingUniversityId(false);
    }
  };

  const uploadSupportingDocument = async (documentType: TutorSupportingDocumentType, file: File) => {
    const label = tutorSupportingDocumentLabels[documentType];
    const invalid = rejectInvalidDocument(file, label);
    if (invalid) {
      setFeedback({ type: "error", message: invalid });
      return;
    }
    setUploadingDocumentType(documentType);
    setFeedback(null);
    try {
      const payload = new FormData();
      payload.append("document", file);
      const response = await fetch(`/api/tutor/supporting-document/${documentType}`, { method: "POST", credentials: "same-origin", body: payload });
      const result = await response.json().catch(() => ({})) as { error?: string; status?: "uploaded" };
      if (!response.ok || result.status !== "uploaded") throw new Error(result.error || `Unable to upload the ${label}.`);
      setForm(current => current.uploadedSupportingDocuments.includes(documentType)
        ? current
        : { ...current, uploadedSupportingDocuments: [...current.uploadedSupportingDocuments, documentType] });
      await utils.tutor.getMyProfile.invalidate();
      setFeedback({ type: "success", message: `${label} uploaded for private verification.` });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : `Unable to upload the ${label}.` });
    } finally {
      setUploadingDocumentType(null);
    }
  };

  // Sections "Personal Information" (a) and "Education and teaching expertise" (c)
  // are split into sub-groups so their popups open one part at a time — see
  // getTutorProfileSectionGroups.
  // The profile photo is managed from the identity rail, not from this popup.
  const renderIdentityFields = (title?: string): React.ReactNode => <FormSection title={title}>
    <div className="grid gap-5 md:grid-cols-2">
      <FormInput label={tutorProfileCopy.fields.fullName} required value={form.name} onChange={event => update("name", event.target.value)} error={fieldErrors.name} />
      <label className={tp.fieldRow}><span className={tp.fieldLabel}>{tutorProfileCopy.fields.gender}</span><select aria-label={tutorProfileCopy.fields.gender} aria-invalid={Boolean(fieldErrors.gender)} value={form.gender} onChange={event => update("gender", event.target.value as TeachingProfileState["gender"])} className={`${fieldClassName} ${fieldErrors.gender ? "border-[#d84a4a]" : ""}`}><option value="female">Female</option><option value="male">Male</option></select><InlineError message={fieldErrors.gender} /></label>
      <FormInput label={tutorProfileCopy.fields.dateOfBirth} showRequiredMarker type="date" value={form.dateOfBirth} onChange={event => update("dateOfBirth", event.target.value)} error={fieldErrors.dateOfBirth} />
      <FormInput label={tutorProfileCopy.fields.headline} showRequiredMarker value={form.headline} onChange={event => update("headline", event.target.value)} placeholder="Experienced Mathematics Tutor for SSC Students" error={fieldErrors.headline} />
      <FormInput label={tutorProfileCopy.fields.phone} required type="tel" value={form.phone} onChange={event => update("phone", event.target.value)} error={fieldErrors.phone} />
      <FormInput label={tutorProfileCopy.fields.email} required type="email" value={form.contactEmail} onChange={event => update("contactEmail", event.target.value)} error={fieldErrors.contactEmail} />
      <FormTextArea label="Present Address" rows={2} required value={form.privateDetails.presentAddress} onChange={event => updatePrivateDetail("presentAddress", event.target.value)} />
      <FormTextArea label="Permanent Address" rows={2} required value={form.privateDetails.permanentAddress} onChange={event => updatePrivateDetail("permanentAddress", event.target.value)} />
      <FormInput label="Nationality" placeholder="Ex- Bangladeshi" required value={form.privateDetails.nationality} onChange={event => updatePrivateDetail("nationality", event.target.value)} />
      <FormInput label="Religion" placeholder="Ex- Islam" required value={form.privateDetails.religion} onChange={event => updatePrivateDetail("religion", event.target.value)} />
      <FormInput label="Additional Phone (Optional)" placeholder="Ex- 01712345678" type="tel" value={form.privateDetails.additionalPhone} onChange={event => updatePrivateDetail("additionalPhone", event.target.value)} />
      <FormInput label="Social Profile Links (Optional)" placeholder="Ex- https://facebook.com/username" value={form.privateDetails.socialProfileLinks} onChange={event => updatePrivateDetail("socialProfileLinks", event.target.value)} />
    </div>
  </FormSection>;

  const renderFamilyContactFields = (title?: string): React.ReactNode => <FormSection title={title}><div className={compactFieldGridClassName}>
    <FormInput label="Father’s Name" placeholder="Ex- Abdul Karim" required value={form.privateDetails.fatherName} onChange={event => updatePrivateDetail("fatherName", event.target.value)} />
    <FormInput label="Father’s Phone Number" placeholder="Ex- 01712345678" required type="tel" value={form.privateDetails.fatherPhone} onChange={event => updatePrivateDetail("fatherPhone", event.target.value)} />
    <FormInput label="Mother’s Name (Optional)" placeholder="Ex- Abdul Karim" value={form.privateDetails.motherName} onChange={event => updatePrivateDetail("motherName", event.target.value)} />
    <FormInput label="Mother’s Phone Number (Optional)" placeholder="Ex- 01712345678" type="tel" value={form.privateDetails.motherPhone} onChange={event => updatePrivateDetail("motherPhone", event.target.value)} />
    <FormInput label="Emergency Contact Name (Optional)" placeholder="Ex- Rahima Begum" value={form.privateDetails.emergencyContactName} onChange={event => updatePrivateDetail("emergencyContactName", event.target.value)} />
    <FormInput label="Emergency Contact Relation (Optional)" placeholder="Ex- Uncle" value={form.privateDetails.emergencyContactRelation} onChange={event => updatePrivateDetail("emergencyContactRelation", event.target.value)} />
    <FormInput label="Emergency Contact Phone (Optional)" placeholder="Ex- 01712345678" type="tel" value={form.privateDetails.emergencyContactPhone} onChange={event => updatePrivateDetail("emergencyContactPhone", event.target.value)} />
    <FormTextArea label="Emergency Contact Address (Optional)" rows={2} value={form.privateDetails.emergencyContactAddress} onChange={event => updatePrivateDetail("emergencyContactAddress", event.target.value)} />
    </div>
  </FormSection>;

  const renderEducationFields = (): React.ReactNode => <>
    <div className="grid gap-5 md:grid-cols-2">
      <FormSelect label={tutorProfileCopy.fields.educationLevel} options={academicEducationLevels} placeholder="Select a level" value={form.highestEducation} onChange={event => update("highestEducation", event.target.value as TeachingProfileState["highestEducation"])} />
      <label className={tp.fieldRow}><span className={tp.fieldLabel}>{tutorProfileCopy.fields.studyStatus}<span aria-hidden="true" className={tp.requiredMark}> *</span></span><select aria-label={tutorProfileCopy.fields.studyStatus} value={form.studyStatus} onChange={event => update("studyStatus", event.target.value as TeachingProfileState["studyStatus"])} aria-invalid={Boolean(fieldErrors.studyStatus)} aria-required="true" className={`${fieldClassName} ${fieldErrors.studyStatus ? "border-[#d84a4a]" : ""}`}><option value="">Select a status</option><option value="studying">Studying</option><option value="graduated">Graduated</option><option value="professional">Professional</option></select><InlineError message={fieldErrors.studyStatus} /></label>
      <CatalogSearchField label="Institute" query={universityQuery} onQueryChange={setUniversityQuery} options={universities.data} selectedId={form.universityId} onSelectedIdChange={id => update("universityId", id)} limit={CATALOG_SEARCH_LIMIT} required error={fieldErrors.universityId} />
      <CatalogSearchField label="Department / Subject" query={departmentQuery} onQueryChange={setDepartmentQuery} options={facultyDepartments.data} selectedId={form.facultyDepartmentId} onSelectedIdChange={id => update("facultyDepartmentId", id)} limit={CATALOG_SEARCH_LIMIT} required error={fieldErrors.facultyDepartmentId} />
      <FormInput label={tutorProfileCopy.fields.degreeExamTitle} showRequiredMarker value={form.degreeExamTitle} onChange={event => update("degreeExamTitle", event.target.value)} placeholder="Ex- BSc/BA" error={fieldErrors.degreeExamTitle} />
      <FormInput label={`${tutorProfileCopy.fields.resultGpa} (Optional)`} value={form.resultGpa} onChange={event => update("resultGpa", event.target.value)} placeholder="Ex-4.00" />
      <FormInput label={`${tutorProfileCopy.fields.deptId} (Optional)`} value={form.deptId} onChange={event => update("deptId", event.target.value)} placeholder="Ex-13104096" />
      {/* Study status decides which half of the study timeline the Tutor fills in. */}
      {form.studyStatus === "studying"
        ? <FormInput label={tutorProfileCopy.fields.yearSemester} showRequiredMarker value={form.yearSemester} onChange={event => update("yearSemester", event.target.value)} placeholder="Ex- 2nd Year/Semester" error={fieldErrors.yearSemester} />
        : <FormInput label={tutorProfileCopy.fields.graduationYear} showRequiredMarker inputMode="numeric" maxLength={4} value={form.graduationYear} onChange={event => update("graduationYear", digitsOnly(event.target.value, 4))} placeholder="Ex-2022" error={fieldErrors.graduationYear} />}
    </div>
    <div className="mt-6 space-y-3">
      <h3 className="font-bold text-[#244a6a]"><SiteText slotId="tutor-profile.form.qualification-history" className="text-sm" /> <span aria-hidden="true" className="text-[#d84a4a]">*</span></h3>
      {form.educationRecords.map((record, index) => {
        const isOpen = openQualificationIndices.has(index);
        const summary = [record.degreeExamTitle || record.qualificationLevel, record.instituteName, record.currentlyStudying ? "Ongoing" : record.studyEndYear].filter(Boolean).join(" · ");
        return <div key={index} className={`overflow-hidden rounded-xl border bg-white transition-shadow motion-reduce:transition-none ${isOpen ? "border-[#bcdcf3] shadow-[0_6px_20px_-12px_rgba(22,125,221,0.45)]" : "border-j-border"}`}>
          <div className="flex items-center gap-2 p-3 sm:px-4">
            <button type="button" aria-expanded={isOpen} onClick={() => toggleQualification(index)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40">
              <span aria-hidden="true" className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${isOpen ? "bg-[#167ddd] text-white" : "bg-[#eef5fb] text-[#4a708f]"}`}>{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-bold ${tp.heading}`}>{record.qualificationLevel || `Qualification ${index + 1}`}</span>
                {!isOpen && summary ? <span className={`mt-0.5 block truncate text-xs ${tp.bodySoft}`}>{summary}</span> : null}
              </span>
              <ChevronDown size={16} className={`shrink-0 text-[#6b8497] transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} aria-hidden={true} />
            </button>
            {form.educationRecords.length > 1 ? <Button type="button" variant="ghost" onClick={() => removeEducationRecord(index)} className="shrink-0 text-[#b23f3f] hover:bg-[#fff4f4] hover:text-[#9e3030]"><Trash2 size={15} /> Remove</Button> : null}
          </div>
          {isOpen ? <div className="border-t border-j-border bg-[#fbfdfe] p-4">
            <div className="grid gap-5 md:grid-cols-2">
              <FormSelect label={tutorProfileCopy.fields.educationLevel} showRequiredMarker options={qualificationEducationLevels} placeholder="Select a level" value={record.qualificationLevel} onChange={event => updateEducationRecord(index, "qualificationLevel", event.target.value)} />
              <FormInput label="Institute Name" required value={record.instituteName} onChange={event => updateEducationRecord(index, "instituteName", event.target.value)} placeholder="Ex- Dhaka College" />
              <FormInput label={tutorProfileCopy.fields.degreeExamTitle} required value={record.degreeExamTitle} onChange={event => updateEducationRecord(index, "degreeExamTitle", event.target.value)} placeholder="Ex- SSC/HSC" />
              <FormInput label="Subject / Group" required value={record.majorGroup} onChange={event => updateEducationRecord(index, "majorGroup", event.target.value)} placeholder="Ex- Science" />
              <FormSelect label="Curriculum" showRequiredMarker options={qualificationCurricula} placeholder="Select a curriculum" value={record.curriculum} onChange={event => updateEducationRecord(index, "curriculum", event.target.value)} />
              <FormInput label={`${tutorProfileCopy.fields.resultGpa} (Optional)`} value={record.resultGpa} onChange={event => updateEducationRecord(index, "resultGpa", event.target.value)} placeholder="Ex-5.00" />
              <FormInput label="Study Start Year" required inputMode="numeric" maxLength={4} value={record.studyStartYear} onChange={event => updateEducationRecord(index, "studyStartYear", digitsOnly(event.target.value, 4))} placeholder="Ex- 2018" />
              {record.currentlyStudying ? null : <FormInput label="Study End Year" required inputMode="numeric" maxLength={4} value={record.studyEndYear} onChange={event => updateEducationRecord(index, "studyEndYear", digitsOnly(event.target.value, 4))} placeholder="Ex- 2018" />}
              <label className="flex items-center gap-2 self-end rounded-lg border border-[#dce8f0] px-3 py-2 text-sm font-medium text-[#244a6a]"><input type="checkbox" checked={record.currentlyStudying} onChange={event => updateEducationRecord(index, "currentlyStudying", event.target.checked)} />Currently studying</label>
              <FormInput label="Institute ID Card Number (Optional)" placeholder="Ex- 20211234" value={record.instituteIdCardNumber} onChange={event => updateEducationRecord(index, "instituteIdCardNumber", event.target.value)} />
            </div>
          </div> : null}
        </div>;
      })}
      <Button type="button" variant="outline" onClick={addEducationRecord} className="rounded-xl border-[#9dcde7] text-[#167ddd]"><Plus size={16} /> Add another qualification</Button>
    </div>
    <div className="mt-6">
      <DocumentUploadRow
        inputId="tutor-university-id-document"
        label="University ID card"
        uploadLabel="Upload Both Side"
        required
        uploaded={form.universityIdDocumentStatus === "uploaded"}
        uploading={uploadingUniversityId}
        onSelectFile={file => void uploadUniversityIdDocument(file)}
      />
      {tutorSupportingDocumentTypes.map(documentType => <DocumentUploadRow
        key={documentType}
        inputId={`tutor-document-${documentType}`}
        label={tutorSupportingDocumentLabels[documentType]}
        uploadLabel="Upload"
        uploaded={form.uploadedSupportingDocuments.includes(documentType)}
        uploading={uploadingDocumentType === documentType}
        onSelectFile={file => void uploadSupportingDocument(documentType, file)}
      />)}
    </div>
  </>;

  const renderTeachingExpertiseFields = (): React.ReactNode => <div className="space-y-3.5">
    <FormSection title="What you teach">
      <div className={compactFieldGridClassName}>
        <SearchableMultiSelect label={tutorProfileCopy.fields.primarySubjects} required options={toSelectorOptions(subjects.data)} selectedIds={form.primarySubjectIds} onChange={value => update("primarySubjectIds", value)} emptyMessage="No subjects found." error={fieldErrors.primarySubjectIds} />
        <SearchableMultiSelect label={tutorProfileCopy.fields.additionalSubjects} options={toSelectorOptions(subjects.data)} selectedIds={form.additionalSubjectIds} onChange={value => update("additionalSubjectIds", value)} emptyMessage="No subjects found." />
        <SearchableMultiSelect label={tutorProfileCopy.fields.classLevels} required options={groupedClassLevels.options} selectedIds={groupedClassLevels.selectedIds} onChange={value => update("classLevelIds", expandGroupedClassLevelIds(value, groupedClassLevels.groupedIds))} emptyMessage="No classes or levels found." error={fieldErrors.classLevelIds} />
        <SearchableMultiSelect label={tutorProfileCopy.fields.curricula} required options={toSelectorOptions(curricula.data)} selectedIds={form.curriculumIds} onChange={value => update("curriculumIds", value)} emptyMessage="No curricula found." error={fieldErrors.curriculumIds} />
      </div>
    </FormSection>

    <FormSection title="Who you teach">
      <div className={compactFieldGridClassName}>
        <FormInput label={tutorProfileCopy.fields.teachingExperience} showRequiredMarker type="number" min="0" max="60" value={form.teachingExperienceYears} onChange={event => update("teachingExperienceYears", event.target.value)} error={fieldErrors.teachingExperienceYears} />
        <SearchableMultiSelect label={tutorProfileCopy.fields.studentTypes} required options={toSelectorOptions(studentTypes.data)} selectedIds={form.studentTypeIds} onChange={value => update("studentTypeIds", value)} emptyMessage="No student types found." error={fieldErrors.studentTypeIds} />
      </div>
    </FormSection>

    <FormSection title="In your own words">
      <div className="space-y-4">
        <FormTextArea label="Prior Teaching Experience" value={form.priorTeachingExperience} onChange={event => update("priorTeachingExperience", event.target.value)} placeholder="Briefly describe previous tutoring, coaching, or classroom experience." />
        <FormTextArea label="Special Expertise" value={form.specialExpertise} onChange={event => update("specialExpertise", event.target.value)} placeholder="e.g. SSC board exam preparation, Olympiad coaching" />
        <FormTextArea label="Academic Achievement" value={form.academicAchievement} onChange={event => update("academicAchievement", event.target.value)} placeholder="Optional scholarships, honours, or relevant achievements" />
      </div>
    </FormSection>
  </div>;

  const renderGroupFields = (groupId: TutorProfileSectionGroupId): React.ReactNode => {
    if (groupId === "a-identity") return renderIdentityFields();
    if (groupId === "a-family") return renderFamilyContactFields();
    if (groupId === "c-education") return renderEducationFields();
    return renderTeachingExpertiseFields();
  };

  // The editable fields for a whole section, used only when the submit-for-review
  // error path opens a section that is otherwise edited one sub-group at a time.
  const renderSectionFields = (sectionId: TutorProfileSectionId): React.ReactNode => {
    if (sectionId === "a") return <div className="space-y-3.5">{renderIdentityFields("Identity and contact")}{renderFamilyContactFields("Family and emergency contact")}</div>;

    if (sectionId === "c") return <div className="space-y-3.5">{renderEducationFields()}{renderTeachingExpertiseFields()}</div>;

    if (sectionId === "d") return <div className="space-y-3.5">
      <FormSection title="How you teach">
        <div className={compactFieldGridClassName}>
          <ChoiceGroup label={tutorProfileCopy.fields.tuitionType} name="tuition-type" required value={form.tuitionType} onChange={value => update("tuitionType", value as TeachingProfileState["tuitionType"])} error={fieldErrors.tuitionType} options={[["home", "Home tuition"], ["online", "Online tuition"], ["both", "Both"]]} />
          <ChoiceGroup label={tutorProfileCopy.fields.preferredStudentGender} name="student-gender" required value={form.preferredStudentGender} onChange={value => update("preferredStudentGender", value as TeachingProfileState["preferredStudentGender"])} error={fieldErrors.preferredStudentGender} options={[["male", "Male"], ["female", "Female"], ["both", "Both"]]} />
          <SearchableMultiSelect label={tutorProfileCopy.fields.classSizes} required options={[{ id: "one_to_one", label: "One-to-one" }, { id: "small_group", label: "Small group" }, { id: "group", label: "Group" }]} selectedIds={form.preferredClassSizes} onChange={value => update("preferredClassSizes", value)} emptyMessage="No class-size options found." error={fieldErrors.preferredClassSizes} />
          <SearchableMultiSelect label={tutorProfileCopy.fields.teachingDays} required options={[{ id: "monday", label: "Monday" }, { id: "tuesday", label: "Tuesday" }, { id: "wednesday", label: "Wednesday" }, { id: "thursday", label: "Thursday" }, { id: "friday", label: "Friday" }, { id: "saturday", label: "Saturday" }, { id: "sunday", label: "Sunday" }]} selectedIds={form.preferredTeachingDays} onChange={value => update("preferredTeachingDays", value)} emptyMessage="No days found." error={fieldErrors.preferredTeachingDays} />
          <SearchableMultiSelect label={tutorProfileCopy.fields.timeSlots} required options={[{ id: "morning", label: "Morning" }, { id: "afternoon", label: "Afternoon" }, { id: "evening", label: "Evening" }, { id: "flexible", label: "Flexible" }]} selectedIds={form.preferredTimeSlots} onChange={value => update("preferredTimeSlots", value)} emptyMessage="No time slots found." error={fieldErrors.preferredTimeSlots} />
          <label
            className={`${wideFieldClassName} flex cursor-pointer items-start gap-3 rounded-lg border bg-[#f7fbfd] p-3.5 text-sm text-[#315b78] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#dceffe] ${fieldErrors.availableNationwide ? "border-[#d84a4a]" : "border-[#d5e7f0]"}`}
          >
            <input type="checkbox" checked={form.availableNationwide} aria-required={form.tuitionType === "online" || form.tuitionType === "both" || undefined} onChange={event => update("availableNationwide", event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[#9fc7de] text-[#167ddd]" />
            <span><strong className="block text-[13px] font-semibold text-[#244a6a]">Available nationwide for online tuition{form.tuitionType === "online" || form.tuitionType === "both" ? <span aria-hidden="true" className={tp.requiredMark}> *</span> : null}</strong><span className="mt-0.5 block text-xs leading-5 text-[#72889a]">Required for Online or Both.</span><InlineError message={fieldErrors.availableNationwide} /></span>
          </label>
        </div>
      </FormSection>

      <FormSection title={<SiteText slotId="tutor-profile.form.location-fee-travel" className="text-sm" />}>
        <div className={compactFieldGridClassName}>
          <CatalogSearchField label={tutorProfileCopy.fields.currentLocation} query={currentLocationQuery} onQueryChange={setCurrentLocationQuery} options={currentLocationOptions} selectedId={form.currentLocationId} onSelectedIdChange={value => update("currentLocationId", value)} required error={fieldErrors.currentLocationId} />
          <SearchableMultiSelect label={tutorProfileCopy.fields.teachingAreas} required options={teachingAreaOptions} selectedIds={form.teachingAreaIds} onChange={value => update("teachingAreaIds", value)} onSearchQueryChange={setTeachingAreaQuery} emptyMessage="No areas found." error={fieldErrors.teachingAreaIds} />
          {/* The fee pair and the distance read as one line of numbers. */}
          <div className={`${wideFieldClassName} grid gap-x-5 gap-y-4 sm:grid-cols-3`}>
            <FormInput label={tutorProfileCopy.fields.feeMin} showRequiredMarker type="number" min="0" max="500000" inputMode="numeric" value={form.feeMin} onChange={event => update("feeMin", event.target.value)} error={fieldErrors.feeMin} />
            <FormInput label={tutorProfileCopy.fields.feeMax} showRequiredMarker type="number" min="0" max="500000" inputMode="numeric" value={form.feeMax} onChange={event => update("feeMax", event.target.value)} error={fieldErrors.feeMax} />
            <FormInput label="Travel Distance (km) (Optional)" placeholder="Ex- 5" type="number" min="1" max="100" inputMode="numeric" value={form.travelDistanceKm} onChange={event => update("travelDistanceKm", event.target.value)} />
          </div>
        </div>
      </FormSection>

      <FormSection title={<SiteText slotId="tutor-profile.form.language-communication" className="text-sm" />}>
        <div className={compactFieldGridClassName}>
          <SearchableMultiSelect label={tutorProfileCopy.fields.teachingLanguages} required options={toSelectorOptions(languages.data)} selectedIds={form.teachingLanguageIds} onChange={value => update("teachingLanguageIds", value)} emptyMessage="No languages found." error={fieldErrors.teachingLanguageIds} />
          <SearchableMultiSelect label={tutorProfileCopy.fields.communicationPreferences} required options={[{ id: "phone", label: "Phone" }, { id: "whatsapp", label: "WhatsApp" }, { id: "platform_message", label: "Platform message" }]} selectedIds={form.communicationPreferences} onChange={value => update("communicationPreferences", value)} emptyMessage="No communication options found." error={fieldErrors.communicationPreferences} />
        </div>
      </FormSection>
    </div>;

    return <div className="space-y-3.5">
      <FormSection title="Your introduction">
        <div className="space-y-4">
          <FormTextArea label="About Me" rows={5} maxLength={2000} value={form.aboutMe} onChange={event => update("aboutMe", event.target.value)} placeholder="Describe your strengths, experience, and the learners you teach." hint={`${form.aboutMe.length}/2000 characters`} />
          <FormTextArea label="Teaching Approach" rows={5} maxLength={2000} value={form.teachingApproach} onChange={event => update("teachingApproach", event.target.value)} placeholder="Explain how you plan lessons and support learning." hint={`${form.teachingApproach.length}/2000 characters`} />
          <FormTextArea label="Why Choose Me" rows={5} maxLength={2000} value={form.whyChooseMe} onChange={event => update("whyChooseMe", event.target.value)} placeholder="Explain the value a Guardian can expect from your tuition." hint={`${form.whyChooseMe.length}/2000 characters`} />
        </div>
      </FormSection>

      <FormSection title="For the review team">
        <FormTextArea label="Additional Notes (Optional)" rows={4} maxLength={2000} value={form.additionalNotes} onChange={event => update("additionalNotes", event.target.value)} placeholder="Non-sensitive information for the review team." hint={`${form.additionalNotes.length}/2000 characters`} />
      </FormSection>
    </div>;
  };

  return <form onSubmit={event => event.preventDefault()} className={tutorProfileResponsiveClasses.workspace}>
    {selectedPhotoPreview ? <TutorProfilePhotoEditor imageUrl={selectedPhotoPreview} isSubmitting={uploadingPhoto} onCancel={closePhotoEditor} onConfirm={photo => void uploadPhoto(photo)} /> : null}
    {editingSection ? <TutorProfileSectionModal
      title={editTargetTitle(editingGroupId ?? editingSection)}
      submitting={saveDraftMutation.isPending}
      notice={feedback ? { tone: feedback.type, text: feedback.message } : null}
      onClose={closeSectionEditor}
      onSubmit={() => void submitSectionModal()}
    >{editingGroupId ? renderGroupFields(editingGroupId) : renderSectionFields(editingSection)}</TutorProfileSectionModal> : null}
    <div className={tutorProfileResponsiveClasses.workspaceShell}>
      <TutorProfileIdentityRail
        name={form.name}
        tutorNumber={profile?.tutorNumber}
        photoUrl={form.profilePhotoUrl}
        photoPreviewFailed={photoPreviewFailed}
        photoError={fieldErrors.profilePhotoUrl}
        uploadingPhoto={uploadingPhoto}
        photoInputRef={photoInputRef}
        onSelectPhoto={selectPhoto}
        onRemovePhoto={() => void removePhoto()}
        onPhotoPreviewError={() => setPhotoPreviewFailed(true)}
        completionPercentage={completionPercentage}
        email={form.contactEmail}
        phone={form.phone}
        address={form.privateDetails.presentAddress ?? ""}
        universityName={form.universityId ? readoutResolvers.university(form.universityId) : ""}
        subjectName={form.facultyDepartmentId ? readoutResolvers.department(form.facultyDepartmentId) : ""}
        onReturnToSelectedJob={statusCard.action === "return" ? onReturnToSelectedJob : undefined}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode(current => !current)}
      />

      <div className={`min-w-0 ${tp.stack}`}>

        {feedback && !editingSection ? <p role={feedback.type === "success" ? "status" : "alert"} aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm font-medium ${feedback.type === "success" ? "border-[#bde6d1] bg-[#f1fbf5] text-[#17714c]" : "border-j-err-border bg-j-err-wash text-j-err"}`}>{feedback.message}</p> : null}

        {previewMode ? <TutorProfileSummaryView sections={readoutSections} /> : <TutorProfileTabEditor
          sections={readoutSections}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onEditSection={openSectionEditor}
        />}

        {statusCard.action === "submit" || statusCard.action === "complete" || statusCard.action === "save" ? <div id="profile-section-review" className="flex justify-end border-t border-j-border pt-4">
          <Button type="button" disabled={isSavingProfile} onClick={() => void submitForReview()} className={`${tp.primaryButton} ${tutorProfileResponsiveClasses.completionActionButton} sm:w-auto`}><LockKeyhole size={16} />{submitProfileMutation.isPending ? "Submitting…" : "Submit profile for review"}</Button>
        </div> : null}
      </div>
    </div>
    <output className="sr-only" aria-live="polite">Draft fields ready: {Object.keys(previewPayload).length} editable values.</output>
  </form>;
}

/**
 * Wraps the workspace so every heading below can read its admin override. The
 * provider fetches once per page; slots fall back to the copy in code, so the
 * page renders unchanged when nothing has been overridden.
 */
export function TutorProfileWorkspace(props: React.ComponentProps<typeof TutorProfileWorkspaceBody>) {
  return <SiteContentProvider page="tutor-profile"><TutorProfileWorkspaceBody {...props} /></SiteContentProvider>;
}
