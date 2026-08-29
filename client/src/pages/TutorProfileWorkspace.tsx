import { SearchableMultiSelect, type SelectorOption, resetAcademicSelection } from "@/components/TutorProfileSelectors";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { clearTutorOnboardingDraft } from "@/lib/tutorOnboarding";
import { ChevronDown, ChevronLeft, ChevronRight, ImagePlus, Info, LockKeyhole, PencilLine, Plus, Save, Trash2, UserRound } from "lucide-react";
import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { TutorOnboardingDraft } from "@/lib/tutorOnboarding";
import { TutorProfileSystemInfo } from "@/components/TutorProfileSystemInfo";
import { createProfileDraftPayload, getProfileDraftFeedback, hydrateTutorProfileForm, type PersistedTutorProfileForForm, type TutorProfileFormState } from "./TutorProfileFormData";
import { getTutorProfileCompletionSummary, getTutorProfileSubmissionErrors, tutorProfileCopy, type TutorProfileSubmissionErrorKey, type TutorProfileSubmissionErrors } from "./TutorProfileUx";
import { getTutorProfileServerValidationErrors } from "./TutorProfileServerValidation";
import { getTutorProfileMutationFailureFeedback } from "./TutorProfileMutationFeedback";
import { getTutorProfileWizardStepForErrors, scrollToTutorProfileSection, tutorProfileWizardSteps } from "./TutorProfileWizard";
import { resolveTutorProfileHistoryNavigation } from "./TutorProfileNavigationGuard";
import { getTutorProfileStatusCard } from "./TutorProfileStatusCard";
import { tutorProfileSectionCopy } from "./TutorProfileSectionCopy";
import { TutorProfilePhotoEditor } from "@/components/TutorProfilePhotoEditor";
import { tutorProfileResponsiveClasses } from "./TutorProfileResponsive";
import { createTutorProfileSectionDraftPayload, tutorProfileSectionDefinitions, type TutorProfileSectionId } from "./TutorProfileSectionDraft";
import { expandGroupedClassLevelIds, getGroupedClassLevelSelector } from "./TutorProfileClassLevels";

const fieldClassName = "mt-2 w-full rounded-xl border border-[#dbe7ef] bg-white px-3 py-2.5 text-sm text-[#173b60] outline-none transition placeholder:text-[#99aabb] focus:border-[#167ddd] focus:ring-4 focus:ring-[#dceffe] disabled:cursor-not-allowed disabled:bg-[#f4f8fb]";

type CatalogOption = { id: number | string; name: string };

type TeachingProfileState = TutorProfileFormState & {
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
  disabled?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
}) {
  const listId = `catalog-${label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const selectedOption = options?.find(option => String(option.id) === selectedId);
  const inputValue = query || selectedOption?.name || "";
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    onQueryChange(nextValue);
    const selection = options?.find(option => option.name === nextValue);
    if (selection) onSelectedIdChange(String(selection.id));
  };
  return <label className={`block text-sm font-semibold text-[#244a6a] ${tutorProfileResponsiveClasses.fieldRoot}`}>
    <span>{label}{required ? <span aria-hidden="true" className="text-[#d84a4a]"> *</span> : null}</span>
    <input
      className={`${fieldClassName} ${error ? "border-[#d84a4a]" : ""}`}
      type="search"
      role="combobox"
      aria-autocomplete="list"
      aria-controls={listId}
      list={listId}
      value={inputValue}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-required={required || undefined}
      onChange={onChange}
      placeholder={disabled ? `Select the previous field first` : `Search ${label.toLocaleLowerCase()}`}
    />
    <datalist id={listId}>{(options ?? []).map(option => <option key={option.id} value={option.name} />)}</datalist>
    {hint ? <span className="mt-1.5 block text-xs font-normal leading-5 text-[#72889a]">{hint}</span> : null}
    {error ? <span role="alert" className="mt-1.5 block text-xs font-medium leading-5 text-[#b43e3e]">{error}</span> : null}
  </label>;
}

function FormInput({ label, hint, error, required = false, showRequiredMarker = required, ...props }: { label: string; hint?: string; error?: string; required?: boolean; showRequiredMarker?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className={`block text-sm font-semibold text-[#244a6a] ${tutorProfileResponsiveClasses.fieldRoot}`}>{label}{showRequiredMarker ? <span aria-hidden="true" className="text-[#d84a4a]"> *</span> : null}<input {...props} required={required} aria-invalid={Boolean(error)} aria-required={showRequiredMarker || undefined} className={`${fieldClassName} ${error ? "border-[#d84a4a]" : ""}`} />{hint ? <span className="mt-1.5 block text-xs font-normal leading-5 text-[#72889a]">{hint}</span> : null}{error ? <span role="alert" className="mt-1.5 block text-xs font-medium leading-5 text-[#b43e3e]">{error}</span> : null}</label>;
}

function FormTextArea({ label, hint, error, required = false, showRequiredMarker = required, ...props }: { label: string; hint?: string; error?: string; required?: boolean; showRequiredMarker?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <label className={`block text-sm font-semibold text-[#244a6a] ${tutorProfileResponsiveClasses.fieldRoot}`}>{label}{showRequiredMarker ? <span aria-hidden="true" className="text-[#d84a4a]"> *</span> : null}<textarea {...props} required={required} aria-required={showRequiredMarker || undefined} aria-invalid={Boolean(error)} className={`${fieldClassName} min-h-28 resize-y ${error ? "border-[#d84a4a]" : ""}`} />{hint ? <span className="mt-1.5 block text-xs font-normal leading-5 text-[#72889a]">{hint}</span> : null}{error ? <span role="alert" className="mt-1.5 block text-xs font-medium leading-5 text-[#b43e3e]">{error}</span> : null}</label>;
}

function InlineError({ message }: { message?: string }) {
  return message ? <p role="alert" className="mt-1.5 text-xs font-medium leading-5 text-[#b43e3e]">{message}</p> : null;
}

export function TutorProfileWorkspace({
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
  const [academicMessage, setAcademicMessage] = useState("");
  const [universityQuery, setUniversityQuery] = useState("");
  const [facultyQuery, setFacultyQuery] = useState("");
  const [departmentQuery, setDepartmentQuery] = useState("");
  const [currentLocationQuery, setCurrentLocationQuery] = useState("");
  const [teachingAreaQuery, setTeachingAreaQuery] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingUniversityId, setUploadingUniversityId] = useState(false);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [photoPreviewFailed, setPhotoPreviewFailed] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<TutorProfileSubmissionErrors>({});
  const [activeMobileStep, setActiveMobileStep] = useState(0);
  const [savedDraftFingerprint, setSavedDraftFingerprint] = useState(() => getProfileDraftFingerprint(hydrateTeachingProfile(profile, onboardingFallback)));
  const photoInputRef = useRef<HTMLInputElement>(null);
  const universityIdInputRef = useRef<HTMLInputElement>(null);
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
  const facultyId = Number(form.facultyId);
  const universities = trpc.catalog.searchUniversities.useQuery({ query: universityQuery, limit: 50 });
  const academicFaculties = trpc.catalog.searchAcademicFaculties.useQuery(
    { universityId: Number.isInteger(universityId) && universityId > 0 ? universityId : 1, query: facultyQuery, limit: 50 },
    { enabled: Number.isInteger(universityId) && universityId > 0 },
  );
  const facultyDepartments = trpc.catalog.searchFacultyDepartments.useQuery(
    { facultyId: Number.isInteger(facultyId) && facultyId > 0 ? facultyId : 1, query: departmentQuery, limit: 50 },
    { enabled: Number.isInteger(facultyId) && facultyId > 0 },
  );
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
  const addEducationRecord = () => setForm(current => ({ ...current, educationRecords: [...current.educationRecords, { qualificationLevel: "", instituteName: "", degreeExamTitle: "", majorGroup: "", resultGpa: "", curriculum: "", studyStartDate: "", studyEndDate: "", passingYear: "", currentlyStudying: false, instituteIdCardNumber: "" }] }));
  const removeEducationRecord = (index: number) => setForm(current => ({ ...current, educationRecords: current.educationRecords.length === 1 ? current.educationRecords : current.educationRecords.filter((_, recordIndex) => recordIndex !== index) }));
  const updateUniversity = (id: string) => {
    const reset = resetAcademicSelection("university", form, id);
    setForm(current => ({ ...current, ...reset }));
    setFacultyQuery("");
    setDepartmentQuery("");
    setAcademicMessage(reset.message);
  };
  const updateFaculty = (id: string) => {
    const reset = resetAcademicSelection("faculty", form, id);
    setForm(current => ({ ...current, ...reset }));
    setDepartmentQuery("");
    setAcademicMessage(reset.message);
  };

  const previewPayload = createProfileDraftPayload(form);
  const groupedClassLevels = useMemo(() => getGroupedClassLevelSelector(classLevels.data ?? [], form.classLevelIds), [classLevels.data, form.classLevelIds]);
  const completionSummary = getTutorProfileCompletionSummary(form);
  const completionPercentage = completionSummary.completionPercentage;
  const isSavingProfile = saveDraftMutation.isPending || submitProfileMutation.isPending || uploadingPhoto || uploadingUniversityId;
  const [editingSections, setEditingSections] = useState<Set<TutorProfileSectionId>>(() => new Set());
  const [expandedSections, setExpandedSections] = useState<Set<TutorProfileSectionId>>(() => new Set());
  const isDraftDirty = getProfileDraftFingerprint(form) !== savedDraftFingerprint;
  const currentWizardStep = tutorProfileWizardSteps[activeMobileStep];
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

  const goToWizardStep = (stepIndex: number) => {
    const nextStep = tutorProfileWizardSteps[stepIndex];
    if (!nextStep) return;
    setActiveMobileStep(stepIndex);
    window.requestAnimationFrame(() => {
      document.getElementById(nextStep.sectionIds[0])?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
  };

  const revealSections = (sectionIds: TutorProfileSectionId[]) => {
    setExpandedSections(current => {
      const next = new Set(current);
      sectionIds.forEach(sectionId => next.add(sectionId));
      return next;
    });
  };

  const revealWizardStep = (stepIndex: number | null) => {
    if (stepIndex === null) return;
    const sectionIds = tutorProfileWizardSteps[stepIndex]?.sectionIds ?? [];
    revealSections(sectionIds.map(sectionId => sectionId === "profile-section-review" ? "h" : sectionId.replace("profile-section-", "") as TutorProfileSectionId));
  };

  const toggleSection = (sectionId: TutorProfileSectionId) => {
    setExpandedSections(current => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const scrollToDesktopSection = (sectionId: TutorProfileSectionId) => {
    revealSections([sectionId]);
    window.requestAnimationFrame(() => {
      scrollToTutorProfileSection(`profile-section-${sectionId === "h" ? "review" : sectionId}`);
    });
  };
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
    const firstInvalidStep = getTutorProfileWizardStepForErrors(serverErrors);
    if (firstInvalidStep !== null) setActiveMobileStep(firstInvalidStep);
    revealWizardStep(firstInvalidStep);
    setFeedback({ type: "error", message: "Review the highlighted details and try again." });
    window.requestAnimationFrame(() => {
      const firstInvalidField = document.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalidField?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      firstInvalidField?.focus({ preventScroll: true });
    });
    return true;
  };

  const saveProfileDraft = async () => {
    const feedback = getProfileDraftFeedback(form);
    if (feedback) {
      setFeedback({ type: "error", message: feedback });
      return;
    }

    setFeedback(null);
    try {
      await saveDraftMutation.mutateAsync(buildDraftInput());
      clearTutorOnboardingDraft();
      setSavedDraftFingerprint(getProfileDraftFingerprint(form));
      await Promise.all([utils.tutor.getMyProfile.invalidate(), utils.tutor.getDashboardStats.invalidate()]);
      setFeedback({ type: "success", message: "Your private Tutor Profile draft has been saved." });
    } catch (error) {
      if (!recoverServerValidationErrors(error)) {
        setFeedback({ type: "error", message: getTutorProfileMutationFailureFeedback(error).message });
      }
    }
  };

  const editSection = (sectionId: TutorProfileSectionId) => {
    revealSections([sectionId]);
    setEditingSections(current => new Set(current).add(sectionId));
    setFeedback(null);
  };

  const saveSectionDraft = async (sectionId: TutorProfileSectionId) => {
    if (sectionId === "h") return;
    setFeedback(null);
    try {
      await saveDraftMutation.mutateAsync(createTutorProfileSectionDraftPayload(sectionId, form));
      clearTutorOnboardingDraft();
      setSavedDraftFingerprint(getProfileDraftFingerprint(form));
      setEditingSections(current => {
        const next = new Set(current);
        next.delete(sectionId);
        return next;
      });
      await Promise.all([utils.tutor.getMyProfile.invalidate(), utils.tutor.getDashboardStats.invalidate()]);
      setFeedback({ type: "success", message: `Section ${sectionId.toUpperCase()} draft saved. Continue with the next section when ready.` });
    } catch (error) {
      if (!recoverServerValidationErrors(error)) {
        setFeedback({ type: "error", message: getTutorProfileMutationFailureFeedback(error).message });
      }
    }
  };

  const submitForReview = async () => {
    const submissionErrors = getTutorProfileSubmissionErrors(form);
    if (Object.keys(submissionErrors).length > 0) {
      setFieldErrors(submissionErrors);
      const firstInvalidStep = getTutorProfileWizardStepForErrors(submissionErrors);
      if (firstInvalidStep !== null) setActiveMobileStep(firstInvalidStep);
      revealWizardStep(firstInvalidStep);
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

  const completeProfile = () => {
    const submissionErrors = getTutorProfileSubmissionErrors(form);
    setFieldErrors(submissionErrors);
    const firstInvalidStep = getTutorProfileWizardStepForErrors(submissionErrors);
    if (firstInvalidStep !== null) setActiveMobileStep(firstInvalidStep);
    revealWizardStep(firstInvalidStep);
    setFeedback({ type: "error", message: "Complete the highlighted details before submitting for review." });
    window.requestAnimationFrame(() => {
      const firstInvalidField = document.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalidField?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      firstInvalidField?.focus({ preventScroll: true });
    });
  };

  const runStatusCardAction = () => {
    if (statusCard.action === "complete") {
      completeProfile();
      return;
    }
    if (statusCard.action === "save") {
      void saveProfileDraft();
      return;
    }
    if (statusCard.action === "return") {
      onReturnToSelectedJob?.();
      return;
    }
    if (statusCard.action === "submit") void submitForReview();
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

  const uploadUniversityIdDocument = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setFeedback({ type: "error", message: "University ID image must be a JPEG, PNG, or WebP file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", message: "University ID image must be 5 MB or smaller." });
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

  return <form onSubmit={event => { event.preventDefault(); void saveProfileDraft(); }} className={tutorProfileResponsiveClasses.workspace}>
    {selectedPhotoPreview ? <TutorProfilePhotoEditor imageUrl={selectedPhotoPreview} isSubmitting={uploadingPhoto} onCancel={closePhotoEditor} onConfirm={photo => void uploadPhoto(photo)} /> : null}
    <div className="flex items-start gap-3 rounded-2xl border border-[#bfe4f6] bg-[#f0faff] p-4 text-sm leading-6 text-[#46728e]">
      <LockKeyhole className="mt-0.5 shrink-0 text-[#167ddd]" size={18} />
      <p><strong className="text-[#1b4c6d]">Private registration continuity:</strong> {profile ? "Your name, phone, email, gender, and Bangladesh location were loaded from your secure Tutor registration." : "For this historical Tutor account, review the available account details and add any missing required identity or Bangladesh location information."} Phone and email are used for review and are never shown in the public directory.</p>
    </div>

    <section aria-label="Profile status" className={`${tutorProfileResponsiveClasses.completionCard} ${statusCard.tone === "success" ? "border-[#c7e7d7] bg-[#f3fbf6]" : statusCard.tone === "review" ? "border-[#bfe4f6] bg-[#f0faff]" : "border-[#f1dbaa] bg-[#fff9ed]"} sm:flex sm:items-center sm:justify-between sm:gap-5`}>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-bold text-[#244a6a]">{statusCard.title}</p>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusCard.tone === "success" ? "bg-[#e5f8ed] text-[#16714a]" : statusCard.tone === "review" ? "bg-[#e4f4fd] text-[#1670a8]" : "bg-[#fff0cf] text-[#9b6411]"}`}>{statusCard.tone === "success" ? "Approved" : statusCard.tone === "review" ? "Review" : "Action needed"}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-[#5e7a90]">{statusCard.description}</p>
        {statusCard.showProgress ? <div className="mt-3">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-[#5e7a90]"><span>Profile completion</span><span>{completionPercentage}%</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e9f1f5]" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercentage}>
            <div className="h-full rounded-full bg-[#167ddd] transition-[width] duration-200" style={{ width: `${completionPercentage}%` }} />
          </div>
        </div> : null}
      </div>
      {statusCard.action !== "none" ? <Button type="button" disabled={isSavingProfile} onClick={runStatusCardAction} className="mt-4 shrink-0 rounded-xl bg-[#167ddd] font-bold hover:bg-[#0e6dc2] sm:mt-0">
        {statusCard.action === "save" && saveDraftMutation.isPending ? "Saving…" : statusCard.action === "submit" && submitProfileMutation.isPending ? "Submitting…" : statusCard.actionLabel}
      </Button> : null}
    </section>

    <nav aria-label="Tutor Profile desktop sections" className="sticky top-[8.5rem] z-10 hidden rounded-2xl border border-[#dce8f0] bg-white/95 p-2 shadow-sm backdrop-blur lg:flex lg:items-center lg:justify-between lg:gap-2">
      {tutorProfileSectionDefinitions.map((section, index) => <button key={section.id} type="button" onClick={() => scrollToDesktopSection(section.id)} className="flex-1 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#4d6d84] transition hover:bg-[#f0faff] hover:text-[#167ddd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167ddd]">
        <span className="mr-1.5 text-[#167ddd]">{String.fromCharCode(65 + index)}.</span>{section.label}
      </button>)}
    </nav>

    <nav aria-label="Tutor Profile mobile sections" className="rounded-2xl border border-[#dce8f0] bg-white p-3 shadow-sm lg:hidden">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1680c2]">All profile sections</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {tutorProfileSectionDefinitions.map((section, index) => <button key={section.id} type="button" onClick={() => scrollToDesktopSection(section.id)} className="shrink-0 rounded-lg border border-[#dce8f0] px-3 py-2 text-xs font-bold text-[#4d6d84] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167ddd]">{String.fromCharCode(65 + index)}</button>)}
      </div>
    </nav>

    {feedback ? <p role={feedback.type === "success" ? "status" : "alert"} aria-live="polite" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${feedback.type === "success" ? "border-[#bde6d1] bg-[#f1fbf5] text-[#17714c]" : "border-[#f2c3c3] bg-[#fff6f6] text-[#a83b3b]"}`}>{feedback.message}</p> : null}

    <ProfileSection id="profile-section-a" sectionId="a" eyebrow="Section A" title="Identity and contact" description={tutorProfileSectionCopy.identity} isExpanded={expandedSections.has("a")} isEditing={editingSections.has("a")} isSaving={saveDraftMutation.isPending} onToggle={toggleSection} onEdit={editSection} onSave={saveSectionDraft}>
      <div className="grid gap-5 lg:grid-cols-[176px_1fr]">
        <div className={`${tutorProfileResponsiveClasses.photoPanel} rounded-2xl border border-dashed border-[#b7d8e9] bg-[#f6fbfe] p-4 text-center`}>
          <div className={tutorProfileResponsiveClasses.photoPreview}>
            {form.profilePhotoUrl && !photoPreviewFailed ? <img src={form.profilePhotoUrl} alt="Current Tutor profile photo" className="h-full w-full object-cover" onError={() => setPhotoPreviewFailed(true)} /> : <UserRound size={38} aria-hidden="true" />}
          </div>
          <p className="mt-3 text-sm font-bold text-[#244a6a]">{tutorProfileCopy.fields.photo} <span className="text-[#d84a4a]">*</span></p>
          <p id="tutor-profile-photo-help" className="mt-1 text-xs leading-5 text-[#72889a]">Recent clear face photo · JPEG, PNG, or WebP.</p>
          <input ref={photoInputRef} className="sr-only" id="tutor-profile-photo" type="file" aria-label="Upload Tutor profile photo" aria-describedby="tutor-profile-photo-help" aria-invalid={Boolean(fieldErrors.profilePhotoUrl)} aria-required="true" accept="image/jpeg,image/jpg,image/pjpeg,image/png,image/webp" onChange={selectPhoto} />
          <Button type="button" variant="outline" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()} className={`mt-3 ${tutorProfileResponsiveClasses.photoActionButton} rounded-xl border-[#9dcde7] text-[#167ddd]`}><ImagePlus size={15} /> {uploadingPhoto ? "Uploading…" : form.profilePhotoUrl ? "Replace photo" : "Upload photo"}</Button>
          {form.profilePhotoUrl ? <Button type="button" variant="ghost" disabled={uploadingPhoto} onClick={() => void removePhoto()} className={`mt-1 ${tutorProfileResponsiveClasses.photoActionButton} text-[#bf3b3b] hover:bg-[#fff2f2] hover:text-[#a72f2f]`}><Trash2 size={15} /> Remove photo</Button> : null}
          <InlineError message={fieldErrors.profilePhotoUrl} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <FormInput label={tutorProfileCopy.fields.fullName} required value={form.name} onChange={event => update("name", event.target.value)} error={fieldErrors.name} />
          <label className="block text-sm font-semibold text-[#244a6a]">{tutorProfileCopy.fields.gender}<select aria-label={tutorProfileCopy.fields.gender} aria-invalid={Boolean(fieldErrors.gender)} value={form.gender} onChange={event => update("gender", event.target.value as TeachingProfileState["gender"])} className={`${fieldClassName} ${fieldErrors.gender ? "border-[#d84a4a]" : ""}`}><option value="female">Female</option><option value="male">Male</option></select><InlineError message={fieldErrors.gender} /></label>
          <FormInput label={tutorProfileCopy.fields.dateOfBirth} showRequiredMarker type="date" value={form.dateOfBirth} onChange={event => update("dateOfBirth", event.target.value)} error={fieldErrors.dateOfBirth} />
          <FormInput label={tutorProfileCopy.fields.headline} showRequiredMarker value={form.headline} onChange={event => update("headline", event.target.value)} placeholder="Experienced Mathematics Tutor for SSC Students" error={fieldErrors.headline} />
          <FormInput label={tutorProfileCopy.fields.phone} required type="tel" value={form.phone} onChange={event => update("phone", event.target.value)} hint="Private — never public." error={fieldErrors.phone} />
          <FormInput label={tutorProfileCopy.fields.email} required type="email" value={form.contactEmail} onChange={event => update("contactEmail", event.target.value)} hint="Private — never public." error={fieldErrors.contactEmail} />
          <FormTextArea label="Present Address" required value={form.privateDetails.presentAddress} onChange={event => updatePrivateDetail("presentAddress", event.target.value)} hint="Private — visible only to you and authorized review staff." />
          <FormTextArea label="Permanent Address" required value={form.privateDetails.permanentAddress} onChange={event => updatePrivateDetail("permanentAddress", event.target.value)} hint="Private — never shown to Guardians." />
          <FormInput label="Nationality" required value={form.privateDetails.nationality} onChange={event => updatePrivateDetail("nationality", event.target.value)} />
          <FormInput label="Religion" required value={form.privateDetails.religion} onChange={event => updatePrivateDetail("religion", event.target.value)} />
          <div className="rounded-2xl border border-[#f0d594] bg-[#fffaf0] p-4 text-sm text-[#765417] md:col-span-2">
            <p className="font-bold text-[#614711]">National ID (NID) <span aria-hidden="true" className="text-[#d84a4a]">*</span></p>
            <p className="mt-1 leading-5">Secure collection is pending activation. Do not enter or upload NID information yet; this field will open only after encrypted storage and access controls are activated.</p>
          </div>
          <FormInput label="Additional Phone (Optional)" type="tel" value={form.privateDetails.additionalPhone} onChange={event => updatePrivateDetail("additionalPhone", event.target.value)} hint="Private — never public." />
          <FormInput label="Social Profile Links (Optional)" value={form.privateDetails.socialProfileLinks} onChange={event => updatePrivateDetail("socialProfileLinks", event.target.value)} hint="Private — not included in Guardian CV." />
        </div>
      </div>
    </ProfileSection>

    <ProfileSection id="profile-section-b" sectionId="b" eyebrow="Section B" title="Family and emergency contact" description="Private verification details. These are not shown to Guardians or on your public profile." isExpanded={expandedSections.has("b")} isEditing={editingSections.has("b")} isSaving={saveDraftMutation.isPending} onToggle={toggleSection} onEdit={editSection} onSave={saveSectionDraft}>
      <div className="grid gap-5 md:grid-cols-2">
        <FormInput label="Father’s Name" required value={form.privateDetails.fatherName} onChange={event => updatePrivateDetail("fatherName", event.target.value)} />
        <FormInput label="Father’s Phone Number" required type="tel" value={form.privateDetails.fatherPhone} onChange={event => updatePrivateDetail("fatherPhone", event.target.value)} hint="Private — used only for profile verification." />
        <FormInput label="Mother’s Name (Optional)" value={form.privateDetails.motherName} onChange={event => updatePrivateDetail("motherName", event.target.value)} />
        <FormInput label="Mother’s Phone Number (Optional)" type="tel" value={form.privateDetails.motherPhone} onChange={event => updatePrivateDetail("motherPhone", event.target.value)} />
        <FormInput label="Emergency Contact Name (Optional)" value={form.privateDetails.emergencyContactName} onChange={event => updatePrivateDetail("emergencyContactName", event.target.value)} />
        <FormInput label="Emergency Contact Relation (Optional)" value={form.privateDetails.emergencyContactRelation} onChange={event => updatePrivateDetail("emergencyContactRelation", event.target.value)} />
        <FormInput label="Emergency Contact Phone (Optional)" type="tel" value={form.privateDetails.emergencyContactPhone} onChange={event => updatePrivateDetail("emergencyContactPhone", event.target.value)} />
        <FormTextArea label="Emergency Contact Address (Optional)" value={form.privateDetails.emergencyContactAddress} onChange={event => updatePrivateDetail("emergencyContactAddress", event.target.value)} />
      </div>
    </ProfileSection>

    <ProfileSection id="profile-section-c" sectionId="c" eyebrow="Section C" title="Education and teaching expertise" description={tutorProfileSectionCopy.expertise} isExpanded={expandedSections.has("c")} isEditing={editingSections.has("c")} isSaving={saveDraftMutation.isPending} onToggle={toggleSection} onEdit={editSection} onSave={saveSectionDraft}>
      <div className="grid gap-5 md:grid-cols-2">
        <FormInput label="Highest Education" value={form.highestEducation} onChange={event => update("highestEducation", event.target.value)} placeholder="e.g. Bachelor of Science" />
        <label className="block text-sm font-semibold text-[#244a6a]">{tutorProfileCopy.fields.studyStatus}<span aria-hidden="true" className="text-[#d84a4a]"> *</span><select aria-label={tutorProfileCopy.fields.studyStatus} value={form.studyStatus} onChange={event => update("studyStatus", event.target.value as TeachingProfileState["studyStatus"])} aria-invalid={Boolean(fieldErrors.studyStatus)} aria-required="true" className={`${fieldClassName} ${fieldErrors.studyStatus ? "border-[#d84a4a]" : ""}`}><option value="">Select a status</option><option value="studying">Studying</option><option value="graduated">Graduated</option><option value="professional">Professional</option></select><InlineError message={fieldErrors.studyStatus} /></label>
        <CatalogSearchField label="Institute" query={universityQuery} onQueryChange={setUniversityQuery} options={universities.data} selectedId={form.universityId} onSelectedIdChange={updateUniversity} required error={fieldErrors.universityId} />
        <CatalogSearchField label="Related Faculty" query={facultyQuery} onQueryChange={setFacultyQuery} options={academicFaculties.data} selectedId={form.facultyId} onSelectedIdChange={updateFaculty} disabled={!form.universityId} required error={fieldErrors.facultyId} />
        <CatalogSearchField label="Related Department / Subject" query={departmentQuery} onQueryChange={setDepartmentQuery} options={facultyDepartments.data} selectedId={form.facultyDepartmentId} onSelectedIdChange={id => update("facultyDepartmentId", id)} disabled={!form.facultyId} required error={fieldErrors.facultyDepartmentId} />
        <FormInput label="Graduation Year" type="number" min="1950" max="2100" value={form.graduationYear} onChange={event => update("graduationYear", event.target.value)} />
      </div>
      {academicMessage ? <p role="status" aria-live="polite" className="mt-4 flex items-start gap-2 rounded-xl bg-[#eef9ff] px-3 py-2 text-xs leading-5 text-[#17668f]"><Info size={15} className="mt-0.5 shrink-0" />{academicMessage}</p> : null}
      <div className="mt-5 space-y-4">
        <div><h3 className="text-sm font-bold text-[#244a6a]">Qualification history <span aria-hidden="true" className="text-[#d84a4a]">*</span></h3><p className="mt-1 text-xs leading-5 text-[#72889a]">Private review details. Add your current or most relevant qualification first.</p></div>
        {form.educationRecords.map((record, index) => <div key={index} className="rounded-2xl border border-[#dce8f0] bg-[#fbfdff] p-4"><div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm font-bold text-[#244a6a]">Qualification {index + 1}</p>{form.educationRecords.length > 1 ? <Button type="button" variant="ghost" onClick={() => removeEducationRecord(index)} className="text-[#b23f3f] hover:bg-[#fff4f4] hover:text-[#9e3030]"><Trash2 size={15} /> Remove</Button> : null}</div><div className="grid gap-5 md:grid-cols-2"><FormInput label="Qualification Level" required value={record.qualificationLevel} onChange={event => updateEducationRecord(index, "qualificationLevel", event.target.value)} placeholder="e.g. Bachelor’s" /><FormInput label="Institute Name" required value={record.instituteName} onChange={event => updateEducationRecord(index, "instituteName", event.target.value)} /><FormInput label="Degree / Exam Title" required value={record.degreeExamTitle} onChange={event => updateEducationRecord(index, "degreeExamTitle", event.target.value)} /><FormInput label="Subject / Group" required value={record.majorGroup} onChange={event => updateEducationRecord(index, "majorGroup", event.target.value)} /><FormInput label="Study Start Date" required type="date" value={record.studyStartDate} onChange={event => updateEducationRecord(index, "studyStartDate", event.target.value)} /><FormInput label="Result / GPA (Optional)" value={record.resultGpa} onChange={event => updateEducationRecord(index, "resultGpa", event.target.value)} /><FormInput label="Curriculum (Optional)" value={record.curriculum} onChange={event => updateEducationRecord(index, "curriculum", event.target.value)} /><label className="flex items-center gap-2 self-end rounded-xl border border-[#dce8f0] px-3 py-3 text-sm font-semibold text-[#244a6a]"><input type="checkbox" checked={record.currentlyStudying} onChange={event => updateEducationRecord(index, "currentlyStudying", event.target.checked)} />Currently studying</label>{!record.currentlyStudying ? <><FormInput label="Study End Date" required type="date" value={record.studyEndDate} onChange={event => updateEducationRecord(index, "studyEndDate", event.target.value)} /><FormInput label="Passing Year" required type="number" min="1950" max="2100" value={record.passingYear} onChange={event => updateEducationRecord(index, "passingYear", event.target.value)} /></> : null}<FormInput label="Institute ID Card Number (Optional)" value={record.instituteIdCardNumber} onChange={event => updateEducationRecord(index, "instituteIdCardNumber", event.target.value)} hint="Private — verification only." /></div></div>)}
        <Button type="button" variant="outline" onClick={addEducationRecord} className="rounded-xl border-[#9dcde7] text-[#167ddd]"><Plus size={16} /> Add another qualification</Button>
      </div>
      <div className="mt-5 rounded-2xl border border-[#dce8f0] bg-[#f7fbfd] p-4">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 shrink-0 text-[#167ddd]" size={18} />
          <div className="min-w-0"><p className="text-sm font-bold text-[#244a6a]">University ID card <span aria-hidden="true" className="text-[#d84a4a]">*</span></p><p id="university-id-upload-help" className="mt-1 text-xs leading-5 text-[#72889a]">Private verification only. This image is never displayed to Guardians or on public Tutor profiles. JPEG, PNG, or WebP; up to 5 MB.</p></div>
        </div>
        <input ref={universityIdInputRef} id="tutor-university-id-document" className="sr-only" type="file" accept="image/jpeg,image/jpg,image/pjpeg,image/png,image/webp" aria-label="Upload University ID card" aria-describedby="university-id-upload-help" aria-required="true" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadUniversityIdDocument(file); }} />
        <div className="mt-3 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" disabled={uploadingUniversityId} aria-busy={uploadingUniversityId} onClick={() => universityIdInputRef.current?.click()} className="rounded-xl border-[#9dcde7] text-[#167ddd]"><ImagePlus size={15} /> {uploadingUniversityId ? "Uploading…" : form.universityIdDocumentStatus === "uploaded" ? "Replace University ID image" : "Upload University ID image"}</Button>{form.universityIdDocumentStatus === "uploaded" ? <span className="rounded-full bg-[#e7f7ed] px-2.5 py-1 text-xs font-bold text-[#20734c]">Uploaded for private review</span> : <span className="rounded-full bg-[#fff1d5] px-2.5 py-1 text-xs font-bold text-[#926112]">Upload required before final review</span>}</div>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <SearchableMultiSelect label={tutorProfileCopy.fields.primarySubjects} required options={toSelectorOptions(subjects.data)} selectedIds={form.primarySubjectIds} onChange={value => update("primarySubjectIds", value)} emptyMessage="No subjects found." error={fieldErrors.primarySubjectIds} />
        <SearchableMultiSelect label={tutorProfileCopy.fields.additionalSubjects} options={toSelectorOptions(subjects.data)} selectedIds={form.additionalSubjectIds} onChange={value => update("additionalSubjectIds", value)} emptyMessage="No subjects found." />
        <SearchableMultiSelect label={tutorProfileCopy.fields.classLevels} required options={groupedClassLevels.options} selectedIds={groupedClassLevels.selectedIds} onChange={value => update("classLevelIds", expandGroupedClassLevelIds(value, groupedClassLevels.groupedIds))} emptyMessage="No classes or levels found." error={fieldErrors.classLevelIds} />
        <SearchableMultiSelect label={tutorProfileCopy.fields.curricula} required options={toSelectorOptions(curricula.data)} selectedIds={form.curriculumIds} onChange={value => update("curriculumIds", value)} emptyMessage="No curricula found." error={fieldErrors.curriculumIds} />
        <FormInput label={tutorProfileCopy.fields.teachingExperience} showRequiredMarker type="number" min="0" max="60" value={form.teachingExperienceYears} onChange={event => update("teachingExperienceYears", event.target.value)} error={fieldErrors.teachingExperienceYears} />
        <SearchableMultiSelect label={tutorProfileCopy.fields.studentTypes} required options={toSelectorOptions(studentTypes.data)} selectedIds={form.studentTypeIds} onChange={value => update("studentTypeIds", value)} emptyMessage="No student types found." error={fieldErrors.studentTypeIds} />
        <FormTextArea label="Prior Teaching Experience" value={form.priorTeachingExperience} onChange={event => update("priorTeachingExperience", event.target.value)} placeholder="Briefly describe previous tutoring, coaching, or classroom experience." />
        <FormTextArea label="Special Expertise" value={form.specialExpertise} onChange={event => update("specialExpertise", event.target.value)} placeholder="e.g. SSC board exam preparation, Olympiad coaching" />
        <FormTextArea label="Academic Achievement" value={form.academicAchievement} onChange={event => update("academicAchievement", event.target.value)} placeholder="Optional scholarships, honours, or relevant achievements" />
      </div>
    </ProfileSection>

    <ProfileSection id="profile-section-d" sectionId="d" eyebrow="Section D" title="Tuition format and learner preferences" description={tutorProfileSectionCopy.tuition} isExpanded={expandedSections.has("d")} isEditing={editingSections.has("d")} isSaving={saveDraftMutation.isPending} onToggle={toggleSection} onEdit={editSection} onSave={saveSectionDraft}>
      <div className="grid gap-5 lg:grid-cols-2">
        <fieldset className="rounded-2xl border border-[#dce8f0] p-4">
          <legend className="px-1 text-sm font-bold text-[#244a6a]">{tutorProfileCopy.fields.tuitionType} <span className="text-[#d84a4a]">*</span></legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">{([['home', 'Home tuition'], ['online', 'Online tuition'], ['both', 'Both']] as const).map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8f0] px-3 py-2.5 text-sm text-[#315b78] has-[:checked]:border-[#167ddd] has-[:checked]:bg-[#f0faff]"><input type="radio" name="tuition-type" value={value} checked={form.tuitionType === value} onChange={() => update("tuitionType", value)} className="h-4 w-4 border-[#9fc7de] text-[#167ddd]" />{label}</label>)}</div>
          <InlineError message={fieldErrors.tuitionType} />
        </fieldset>
        <fieldset className="rounded-2xl border border-[#dce8f0] p-4">
          <legend className="px-1 text-sm font-bold text-[#244a6a]">{tutorProfileCopy.fields.preferredStudentGender}<span aria-hidden="true" className="text-[#d84a4a]"> *</span></legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">{([['male', 'Male'], ['female', 'Female'], ['both', 'Both']] as const).map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8f0] px-3 py-2.5 text-sm text-[#315b78] has-[:checked]:border-[#167ddd] has-[:checked]:bg-[#f0faff]"><input type="radio" name="student-gender" value={value} checked={form.preferredStudentGender === value} onChange={() => update("preferredStudentGender", value)} className="h-4 w-4 border-[#9fc7de] text-[#167ddd]" />{label}</label>)}</div>
          <InlineError message={fieldErrors.preferredStudentGender} />
        </fieldset>
        <SearchableMultiSelect label={tutorProfileCopy.fields.classSizes} required options={[{ id: "one_to_one", label: "One-to-one" }, { id: "small_group", label: "Small group" }, { id: "group", label: "Group" }]} selectedIds={form.preferredClassSizes} onChange={value => update("preferredClassSizes", value)} emptyMessage="No class-size options found." error={fieldErrors.preferredClassSizes} />
        <SearchableMultiSelect label={tutorProfileCopy.fields.teachingDays} required options={[{ id: "monday", label: "Monday" }, { id: "tuesday", label: "Tuesday" }, { id: "wednesday", label: "Wednesday" }, { id: "thursday", label: "Thursday" }, { id: "friday", label: "Friday" }, { id: "saturday", label: "Saturday" }, { id: "sunday", label: "Sunday" }]} selectedIds={form.preferredTeachingDays} onChange={value => update("preferredTeachingDays", value)} emptyMessage="No days found." error={fieldErrors.preferredTeachingDays} />
        <SearchableMultiSelect label={tutorProfileCopy.fields.timeSlots} required options={[{ id: "morning", label: "Morning" }, { id: "afternoon", label: "Afternoon" }, { id: "evening", label: "Evening" }, { id: "flexible", label: "Flexible" }]} selectedIds={form.preferredTimeSlots} onChange={value => update("preferredTimeSlots", value)} emptyMessage="No time slots found." error={fieldErrors.preferredTimeSlots} />
      </div>
      <label
        className={`mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border bg-[#f7fbfd] p-4 text-sm text-[#315b78] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#167ddd] ${fieldErrors.availableNationwide ? "border-[#d84a4a]" : "border-[#d5e7f0]"}`}
      >
        <input type="checkbox" checked={form.availableNationwide} aria-required={form.tuitionType === "online" || form.tuitionType === "both" || undefined} onChange={event => update("availableNationwide", event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[#9fc7de] text-[#167ddd]" />
        <span><strong className="block text-[#244a6a]">Available nationwide for online tuition{form.tuitionType === "online" || form.tuitionType === "both" ? <span aria-hidden="true" className="text-[#d84a4a]"> *</span> : null}</strong><span className="mt-1 block leading-5">Required for Online or Both.</span><InlineError message={fieldErrors.availableNationwide} /></span>
      </label>
    </ProfileSection>

    <ProfileSection id="profile-section-e" sectionId="e" eyebrow="Section E" title="Location, fee and travel preferences" description="Your teaching coverage, expected fee range, and travel distance." isExpanded={expandedSections.has("e")} isEditing={editingSections.has("e")} isSaving={saveDraftMutation.isPending} onToggle={toggleSection} onEdit={editSection} onSave={saveSectionDraft}>
      <div className="grid gap-5 md:grid-cols-3">
        <CatalogSearchField label={tutorProfileCopy.fields.currentLocation} query={currentLocationQuery} onQueryChange={setCurrentLocationQuery} options={currentLocationOptions} selectedId={form.currentLocationId} onSelectedIdChange={value => update("currentLocationId", value)} required error={fieldErrors.currentLocationId} />
        <SearchableMultiSelect label={tutorProfileCopy.fields.teachingAreas} required options={teachingAreaOptions} selectedIds={form.teachingAreaIds} onChange={value => update("teachingAreaIds", value)} onSearchQueryChange={setTeachingAreaQuery} emptyMessage="No areas found." error={fieldErrors.teachingAreaIds} />
        <FormInput label={tutorProfileCopy.fields.feeMin} showRequiredMarker type="number" min="0" max="500000" inputMode="numeric" value={form.feeMin} onChange={event => update("feeMin", event.target.value)} error={fieldErrors.feeMin} />
        <FormInput label={tutorProfileCopy.fields.feeMax} showRequiredMarker type="number" min="0" max="500000" inputMode="numeric" value={form.feeMax} onChange={event => update("feeMax", event.target.value)} error={fieldErrors.feeMax} />
        <FormInput label="Travel Distance (km) (Optional)" type="number" min="1" max="100" inputMode="numeric" value={form.travelDistanceKm} onChange={event => update("travelDistanceKm", event.target.value)} />
      </div>
    </ProfileSection>

    <ProfileSection id="profile-section-f" sectionId="f" eyebrow="Section F" title="Teaching language and communication" description={tutorProfileSectionCopy.communication} isExpanded={expandedSections.has("f")} isEditing={editingSections.has("f")} isSaving={saveDraftMutation.isPending} onToggle={toggleSection} onEdit={editSection} onSave={saveSectionDraft}>
      <div className="grid gap-5 md:grid-cols-2">
        <SearchableMultiSelect label={tutorProfileCopy.fields.teachingLanguages} required options={toSelectorOptions(languages.data)} selectedIds={form.teachingLanguageIds} onChange={value => update("teachingLanguageIds", value)} emptyMessage="No languages found." error={fieldErrors.teachingLanguageIds} />
        <SearchableMultiSelect label={tutorProfileCopy.fields.communicationPreferences} required options={[{ id: "phone", label: "Phone" }, { id: "whatsapp", label: "WhatsApp" }, { id: "platform_message", label: "Platform message" }]} selectedIds={form.communicationPreferences} onChange={value => update("communicationPreferences", value)} emptyMessage="No communication options found." error={fieldErrors.communicationPreferences} />
      </div>
    </ProfileSection>

    <ProfileSection id="profile-section-g" sectionId="g" eyebrow="Section G" title="About your teaching" description={tutorProfileSectionCopy.about} isExpanded={expandedSections.has("g")} isEditing={editingSections.has("g")} isSaving={saveDraftMutation.isPending} onToggle={toggleSection} onEdit={editSection} onSave={saveSectionDraft}>
      <div className="grid gap-5 md:grid-cols-2">
        <FormTextArea label="About Me" maxLength={2000} value={form.aboutMe} onChange={event => update("aboutMe", event.target.value)} placeholder="Describe your strengths, experience, and the learners you teach." hint={`${form.aboutMe.length}/2000 characters`} />
        <FormTextArea label="Teaching Approach" maxLength={2000} value={form.teachingApproach} onChange={event => update("teachingApproach", event.target.value)} placeholder="Explain how you plan lessons and support learning." hint={`${form.teachingApproach.length}/2000 characters`} />
        <FormTextArea label="Why Choose Me" maxLength={2000} value={form.whyChooseMe} onChange={event => update("whyChooseMe", event.target.value)} placeholder="Explain the value a Guardian can expect from your tuition." hint={`${form.whyChooseMe.length}/2000 characters`} />
        <FormTextArea label="Additional Notes (Optional)" maxLength={2000} value={form.additionalNotes} onChange={event => update("additionalNotes", event.target.value)} placeholder="Non-sensitive information for the review team." hint={`${form.additionalNotes.length}/2000 characters`} />
      </div>
    </ProfileSection>

    <ProfileSection id="profile-section-review" sectionId="h" eyebrow="Section H" title="Profile review" description="Review the saved sections, then submit the complete profile once for moderation." isExpanded={expandedSections.has("h")} isEditing={false} isSaving={submitProfileMutation.isPending} onToggle={toggleSection} onEdit={() => void submitForReview()} onSave={() => undefined} reviewAction>
      {profile ? <TutorProfileSystemInfo profile={profile} /> : <p className="rounded-xl bg-[#f6fbfe] p-4 text-sm text-[#5e7a90]">Save your profile sections first. The final review status will appear here.</p>}
    </ProfileSection>
    <output className="sr-only" aria-live="polite">Draft fields ready: {Object.keys(previewPayload).length} editable values.</output>
  </form>;
}

function ProfileSection({ id, sectionId, eyebrow, title, description, children, isExpanded, isEditing, isSaving, onToggle, onEdit, onSave, reviewAction = false }: { id: string; sectionId: TutorProfileSectionId; eyebrow: string; title: string; description: string; children: React.ReactNode; isExpanded: boolean; isEditing: boolean; isSaving: boolean; onToggle: (sectionId: TutorProfileSectionId) => void; onEdit: (sectionId: TutorProfileSectionId) => void; onSave: (sectionId: TutorProfileSectionId) => void; reviewAction?: boolean }) {
  const actionLabel = reviewAction ? "Submit profile for review" : isEditing ? "Save section" : "Edit Information";
  const detailsId = `${id}-details`;
  return <section id={id} className={`scroll-mt-40 rounded-3xl border border-[#dce8f0] bg-white p-5 shadow-[0_12px_30px_rgba(38,83,117,0.06)] sm:p-7 ${tutorProfileResponsiveClasses.section}`}><button type="button" aria-expanded={isExpanded} aria-controls={detailsId} aria-label={`${isExpanded ? "Hide" : "Show"} details for ${title}`} onClick={() => onToggle(sectionId)} className="flex w-full items-start justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167ddd] focus-visible:ring-offset-2"><span><span className="block text-xs font-bold uppercase tracking-[0.18em] text-[#1680c2]">{eyebrow}</span><span className="mt-2 block text-xl font-bold tracking-[-0.025em] text-[#173b60]">{title}</span><span className="mt-2 block max-w-3xl text-sm leading-6 text-[#647f93]">{description}</span></span><ChevronDown aria-hidden="true" className={`mt-1 shrink-0 text-[#167ddd] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} size={22} /></button>{isExpanded ? <div id={detailsId} className="mt-6 border-t border-[#e6eff4] pt-5"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-end"><Button type="button" disabled={isSaving} onClick={() => reviewAction ? onEdit(sectionId) : isEditing ? onSave(sectionId) : onEdit(sectionId)} className="shrink-0 rounded-xl bg-[#167ddd] font-bold hover:bg-[#0e6dc2]">{reviewAction ? <LockKeyhole size={16} /> : isEditing ? <Save size={16} /> : <PencilLine size={16} />}{isSaving ? reviewAction ? "Submitting…" : "Saving…" : actionLabel}</Button></div><fieldset disabled={!isEditing && !reviewAction} aria-label={`${title} fields`} className={isEditing || reviewAction ? "" : "pointer-events-none opacity-70"}>{children}</fieldset></div> : null}</section>;
}
