import React, { type ReactNode, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import CharacterRemaining from "@/components/CharacterRemaining";
import { Link as WouterLink, useLocation } from "wouter";
import { ArrowLeft, Check, Edit3, Eye, Facebook, Globe, House, Layers, Loader2, Megaphone, MoreHorizontal, Phone, School, Users } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { formatInstituteName, formatRequestSource, isRequestSource, INSTITUTE_NAME_MAX_LENGTH, INSTITUTE_NAME_PLACEHOLDER, normalizeInstituteName, REQUEST_SOURCE_VALUES, type RequestSource } from "@shared/request-source";
import { normalizeTutoringTime } from "@shared/tutoring-time";
import { jobIdForRequest } from "@shared/job-id";
import { buildJobTitle } from "@shared/job-title";
import { buildGuardianRequestSummary } from "./guardian-request-summary";
import { GuardianRequestSummaryView } from "./GuardianRequestSummaryView";
import { MoneyAmountField } from "@/components/MoneyAmountField";
import { PostAnotherRequestButton } from "@/components/PostAnotherRequestButton";
import { RecordIcon } from "@/components/recordIcons";
import SharedJobCard, { type JobCardData, TutorPreferenceIcon } from "@/components/JobCard";
import { toast } from "sonner";

import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { guardianRegistrationConflictField, guardianRegistrationConflictOf } from "@shared/guardian-registration-conflicts";
import { fieldGrid, fieldGridWide, fieldLabel, filledField, filledArea, primaryButton, ghostButton, requiredMark } from "@/components/journeyField";
import { trpc } from "@/lib/trpc";
import { rememberSignInRole } from "@/lib/signInRoleMemory";
import { defaultSiteLimits } from "@shared/site-limits";
import { normalizeNumericDigits, toEnglishDigits } from "@shared/digits";
import { cleanBangladeshLocalPhoneDigits, formatBangladeshLocalPhoneDisplay, isValidBangladeshLocalPhone } from "@shared/phone";
import { SALARY_INPUT_PLACEHOLDER, formatSalaryAmount, formatSalaryInput, parseSalaryAmount, salaryValidationMessage, validateSalaryAmount } from "@shared/salary-amount";
import { SiteBlocks, SiteContentProvider, SiteText, useSiteContentResolver } from "@/lib/siteContent";
import { SearchableLocationSelect } from "@/pages/JoinTutor";
import { confirmPasswordBorder, GenderField, getPasswordMatch, PasswordField, PasswordMatch, PasswordStrength, PhoneCodeField, PhoneField, PolicyConsent, RegistrationFieldError, registrationFooter, registrationPolicyLinks, RequiredMark, SignInPrompt, useSecondsUntil } from "@/components/registrationFields";
import { GUARDIAN_REQUEST_DRAFT_VERSION, guardianRequestDraftStorageKey, parseGuardianRequestDraft, serializeGuardianRequestDraft } from "./guardian-request-draft";
import { DRAFT_STORAGE_KEYS, readStorageDraft, removeStorageDraft, saveStorageDraft } from "@/lib/formDraftStorage";
import { DraftRestoredAlert } from "@/components/DraftRestoredAlert";
import LearningNeedsField, { describeLearningNeedsGap, learningNeedsLimitsFrom, type LearningNeedsLimits } from "@/components/LearningNeedsField";
import { learningNeedsFromLegacy, type LearningNeed } from "@shared/learning-needs";
import { JobIdTag } from "@/components/JobIdTag";

const LOCAL_PHONE = /^1[3-9]\d{8}$/;
/** A little under the server's 20-minute intake handoff, so a reused number never outlives its cookie. */
const VERIFIED_PHONE_REUSE_MS = 18 * 60 * 1000;
export function getGuardianPendingEditId(search: string) {
  const value = new URLSearchParams(search).get("edit");
  const requestId = value ? Number(value) : Number.NaN;
  return Number.isInteger(requestId) && requestId > 0 ? requestId : null;
}

export function isGuardianPendingEditEligible(request: { status?: string | null; publicationState?: string | null } | null | undefined) {
  return request?.status === "new" && request.publicationState === "submitted";
}

export function parseGuardianRequestSubjects(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function buildPreviewJobData(
  input: RequestInput,
  tuitionCityLabel: string,
  tuitionLocationLabel: string,
  requestId: number | null,
  isEditMode: boolean
): JobCardData {
  const primaryCategory = input.learningNeeds[0]?.category || "Tuition";
  const primaryClass = input.learningNeeds[0]?.classes?.[0]?.classCourse || "Classes";
  const studentCountNum = Number(input.studentCount) || 1;
  const daysPerWeekNum = Number(input.daysPerWeek) || 0;

  const title = (primaryCategory && primaryClass && daysPerWeekNum > 0)
    ? buildJobTitle({
        category: primaryCategory,
        classCourse: primaryClass,
        studentCount: studentCountNum,
        daysPerWeek: daysPerWeekNum,
      })
    : `Need ${primaryCategory} Tutor for ${primaryClass} - ${daysPerWeekNum || 3} Days / Week`;

  const allSubjects = input.learningNeeds.flatMap(n => n.classes.flatMap(c => c.subjects));
  const locationLabel = input.tuitionType === "online"
    ? null
    : tuitionLocationLabel
      ? (tuitionCityLabel ? `${tuitionLocationLabel}, ${tuitionCityLabel}` : tuitionLocationLabel)
      : null;

  return {
    jobId: isEditMode && requestId ? jobIdForRequest(requestId) : "CT-PREVIEW",
    title,
    postedAt: "Just now",
    statusLabel: "Live Preview",
    statusTone: "live",
    tuitionType: input.tuitionType,
    budgetAmount: parseSalaryAmount(input.salaryAmount),
    subjects: allSubjects,
    locationLabel,
    preferredTutorGender: input.preferredGender || "any",
  };
}

export * from "@/lib/guardianLearningCatalog";
import {
  getGuardianCurriculumTypesForCategory,
  getGuardianCurriculumTypeForCategoryChange,
  getGuardianLevelsForCurriculum,
  getGuardianSelectedSubjectsForLearningNeed,
  getGuardianSubjectsForLearningNeed,
  guardianCurriculumCategories,
} from "@/lib/guardianLearningCatalog";

const categories = guardianCurriculumCategories;

type TuitionType = "home" | "online" | "both" | "group" | "package";
type BudgetKind = "range" | "discuss" | "";
type PreferredGender = "male" | "female" | "any" | "";
type StudentGender = "male" | "female" | "";

type RequestInput = {
  /** What is asked to be taught: curricula, each with its classes, each class with its subjects. */
  learningNeeds: LearningNeed[];
  tuitionType: TuitionType;
  groupCapacity: string;
  packageDurationMonths: string;
  studentCount: string;
  studentGender: StudentGender;
  addressDetails: string;
  tuitionCityLocationId: string;
  tuitionLocationId: string;
  daysPerWeek: string;
  /** Optional start time, 24-hour `HH:mm`; "" while the box is empty. */
  tutoringTime: string;
  preferredGender: PreferredGender;
  salaryAmount: string;
  instituteName: string;
  heardAboutUs: RequestSource | "";
};

const requestSteps = ["Learning needs", "Tuition preferences", "Confirmation"] as const;

/** Most tuitions are for one student, so the count starts there. */
export const DEFAULT_STUDENT_COUNT = "1";

/**
 * Prefers the server's per-field Zod messages (now on `data.zodFieldErrors`) over
 * the raw stringified error, so a rejected registration reads as guidance rather
 * than a JSON blob when the client checks were looser.
 */
export function guardianAuthErrorMessage(error: { message: string; data?: unknown }): string {
  const fieldErrors = (error.data as { zodFieldErrors?: Record<string, string[]> } | null | undefined)?.zodFieldErrors;
  if (fieldErrors) {
    const parts = Object.values(fieldErrors).map(messages => messages[0]).filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return error.message;
}

export type GuardianAccountFieldErrors = Partial<
  Record<"name" | "gender" | "phone" | "email" | "password" | "confirmPassword" | "cityLocationId" | "locationId" | "terms", string>
>;

const guardianAccountErrorFieldIds: Record<keyof GuardianAccountFieldErrors, string> = {
  name: "guardian-full-name",
  gender: "guardian-gender",
  phone: "guardian-phone",
  email: "guardian-email",
  password: "guardian-password",
  confirmPassword: "guardian-confirm-password",
  cityLocationId: "guardian-account-city",
  locationId: "guardian-account-location",
  terms: "guardian-terms",
};

/**
 * Mirrors `guardianRegistrationSchema` so a value that passes here is not bounced
 * back with a stringified server error. Same shape as `validateTutorRegistration`.
 */
export function validateGuardianRegistration(
  values: { name: string; gender: string; email: string; password: string; confirmPassword: string; accountCityId: string; accountLocationId: string },
  termsAccepted: boolean,
): GuardianAccountFieldErrors {
  const errors: GuardianAccountFieldErrors = {};
  const name = values.name.trim();
  if (name.length < 2) errors.name = "Enter your full name.";
  else if (name.length > 160) errors.name = "Full name must be 160 characters or fewer.";
  const email = values.email.trim();
  if (!values.gender) errors.gender = "Choose your gender to continue.";
  if (!email) errors.email = "Enter your email address.";
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Enter a valid email address.";
  else if (email.length > 320) errors.email = "Email address must be 320 characters or fewer.";
  if (!values.password) errors.password = "Create a password with at least 8 characters.";
  else if (values.password.length < 8) errors.password = "Password must be at least 8 characters.";
  else if (values.password.length > 128) errors.password = "Password must be 128 characters or fewer.";
  if (!values.confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (values.password !== values.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (!values.accountCityId) errors.cityLocationId = "Choose your City to continue.";
  if (!values.accountLocationId) errors.locationId = "Choose your Location to continue.";
  if (!termsAccepted) errors.terms = "Accept the Terms of Use and Privacy Policy to create your account.";
  return errors;
}

/** Maps the server's per-field `zodFieldErrors` keys onto the account form's field-error keys. */
export function mapGuardianRegistrationServerErrors(zodFieldErrors: Record<string, string[]> | undefined): GuardianAccountFieldErrors {
  if (!zodFieldErrors) return {};
  const byServerField: Record<string, keyof GuardianAccountFieldErrors> = {
    name: "name", email: "email", password: "password", confirmPassword: "confirmPassword",
    cityLocationId: "cityLocationId", locationId: "locationId", termsAccepted: "terms",
  };
  const mapped: GuardianAccountFieldErrors = {};
  for (const [field, messages] of Object.entries(zodFieldErrors)) {
    const key = byServerField[field];
    if (key && messages[0]) mapped[key] = messages[0];
  }
  return mapped;
}

/** Signing in is offered under a refusal it would settle, and nowhere else. */
function guardianConflictSignIn(message?: string) {
  const conflict = message ? guardianRegistrationConflictOf(message) : null;
  return conflict && guardianRegistrationConflictField(conflict).offerSignIn ? { href: "/auth?role=guardian", label: "সাইন ইন করুন" } : undefined;
}

function focusFirstGuardianAccountError(errors: GuardianAccountFieldErrors) {
  const firstKey = (Object.keys(guardianAccountErrorFieldIds) as Array<keyof GuardianAccountFieldErrors>).find((key) => errors[key]);
  if (!firstKey) return;
  window.requestAnimationFrame(() => document.getElementById(guardianAccountErrorFieldIds[firstKey])?.focus());
}

export const guardianRequestSteps = requestSteps;
export const guardianAccountPolicyLinks = registrationPolicyLinks;

export function normalizeGuardianPublicHref(href: string) {
  if (href === "/terms") return guardianAccountPolicyLinks[0].href;
  if (href === "/privacy") return guardianAccountPolicyLinks[1].href;
  return href;
}

function Link({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return <WouterLink href={normalizeGuardianPublicHref(href)} className={className}>{children}</WouterLink>;
}

export function getGuardianRequestStepValidation(input: RequestInput, step: 1 | 2, limits: LearningNeedsLimits = learningNeedsLimitsFrom(undefined)) {
  if (step >= 1) {
    if (!input.tuitionType) return "Choose a tuition type to continue.";
    if (input.tuitionType !== "online" && (!input.tuitionCityLocationId || !input.tuitionLocationId)) return "Choose a City and a location for Home, Group, or Package Tutoring.";
    const learningGap = describeLearningNeedsGap(input.learningNeeds, limits);
    if (learningGap) return learningGap;
  }
  if (step >= 2) {
    if (!input.daysPerWeek) return "Choose how many days per week you need tuition.";
    if (!input.preferredGender) return "Choose your preferred Tutor gender.";
    const salary = parseSalaryAmount(input.salaryAmount);
    const salaryError = validateSalaryAmount(salary);
    if (salaryError) return salaryValidationMessage(salaryError);
    if (!input.heardAboutUs) return "Tell us where you heard about us.";
    if (input.tuitionType === "home" || input.tuitionType === "online" || input.tuitionType === "package") {
      const studentCount = Number(input.studentCount);
      if (!Number.isInteger(studentCount) || studentCount < 1 || studentCount > 100) return "Enter the number of students from 1 to 100.";
    }
    if (input.tuitionType === "group") {
      const groupCapacity = Number(input.groupCapacity);
      if (!Number.isInteger(groupCapacity) || groupCapacity < 2 || groupCapacity > 100) return "Enter a maximum student capacity from 2 to 100 for Group Tutoring.";
    }
    if (input.tuitionType === "package") {
      const packageDurationMonths = Number(input.packageDurationMonths);
      if (!Number.isInteger(packageDurationMonths) || packageDurationMonths < 1 || packageDurationMonths > 24) return "Enter a Package Tutoring duration from 1 to 24 whole months.";
    }
  }
  return null;
}

export function canStartGuardianRequestSubmission({ mutationPending, submissionStarted }: { mutationPending: boolean; submissionStarted: boolean }) {
  return !mutationPending && !submissionStarted;
}

export function getGuardianRequestJourneyPresentation({ embedded }: { embedded: boolean }) {
  return embedded
    ? { showPublicChrome: false, rootClassName: "bg-transparent text-j-ink" }
    : { showPublicChrome: true, rootClassName: "site-page min-h-screen bg-j-page text-j-ink" };
}

function GuardianRequestJourneyBody({ embedded = false }: { embedded?: boolean }) {
  const [routePath, navigate] = useLocation();
  const editRequestId = getGuardianPendingEditId(window.location.search);
  const isEditMode = editRequestId !== null;
  const presentation = getGuardianRequestJourneyPresentation({ embedded });
  const [stage, setStage] = useState<"phone" | "register" | "code" | "request">(() => embedded ? "request" : "phone");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [journeyError, setJourneyError] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  // No default, for the same reason the Tutor form has none.
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountCityId, setAccountCityId] = useState("");
  const [accountLocationId, setAccountLocationId] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [accountFieldErrors, setAccountFieldErrors] = useState<GuardianAccountFieldErrors>({});
  const [learningNeeds, setLearningNeeds] = useState<LearningNeed[]>([]);
  const [tuitionType, setTuitionType] = useState<TuitionType>("home");
  const [groupCapacity, setGroupCapacity] = useState("");
  const [packageDurationMonths, setPackageDurationMonths] = useState("");
  // One student is the ordinary case, so the field starts answered instead of
  // making every Guardian type the same "1".
  const [studentCount, setStudentCount] = useState(DEFAULT_STUDENT_COUNT);
  const [studentGender, setStudentGender] = useState<StudentGender>("");
  const [addressDetails, setAddressDetails] = useState("");
  const [tuitionCityLocationId, setTuitionCityLocationId] = useState("");
  const [tuitionLocationId, setTuitionLocationId] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [tutoringTime, setTutoringTime] = useState("");
  const [preferredGender, setPreferredGender] = useState<PreferredGender>("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [heardAboutUs, setHeardAboutUs] = useState<RequestSource | "">("");
  const [notes, setNotes] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [draftRestoredFor, setDraftRestoredFor] = useState<number | null>(null);
  const [loadedEditRequestId, setLoadedEditRequestId] = useState<number | null>(null);

  /**
   * Back to an empty step 1 without leaving the route.
   *
   * Inside the sheet the confirmation and the form share one URL, so
   * "Post another request" cannot navigate its way to a fresh form - it
   * clears the answers instead. Tuition type returns to its own default
   * rather than blank, matching how the journey first mounts.
   */
  const startAnotherRequest = () => {
    setStage("request");
    setStep(1);
    setIsPreviewMode(false);
    setRequestId(null);
    setJourneyError("");
    setLearningNeeds([]);
    setTuitionType("home");
    setGroupCapacity("");
    setPackageDurationMonths("");
    setStudentCount(DEFAULT_STUDENT_COUNT);
    setStudentGender("");
    setAddressDetails("");
    setTuitionCityLocationId("");
    setTuitionLocationId("");
    setDaysPerWeek("");
    setTutoringTime("");
    setPreferredGender("");
    setSalaryAmount("");
    setInstituteName("");
    setHeardAboutUs("");
    setNotes("");
  };
  const submissionStartedRef = useRef(false);

  const authQuery = trpc.auth.me.useQuery();
  const guardianRequestsQuery = trpc.tutorRequests.mine.useQuery(undefined, { enabled: Boolean(editRequestId && authQuery.data?.role === "guardian") });
  const utils = trpc.useUtils();
  const citiesQuery = trpc.catalog.searchGuardianLocations.useQuery({ query: "", limit: 50, types: ["city"] });
  const accountLocationsQuery = trpc.catalog.searchRegistrationLocations.useQuery({ cityId: accountCityId, query: "", limit: 300 }, { enabled: Boolean(accountCityId) });
  const tuitionLocationsQuery = trpc.catalog.searchRegistrationLocations.useQuery({ cityId: tuitionCityLocationId, query: "", limit: 300 }, { enabled: Boolean(tuitionCityLocationId) });

  // The phone step is two presses: send the SMS code, then check it.
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeError, setPhoneCodeError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const resendInSeconds = useSecondsUntil(resendAt);
  const intakeMutation = trpc.guardianIntake.capturePhone.useMutation({
    onSuccess: (result, variables) => {
      setJourneyError("");
      setPhoneCodeError("");
      setCodeSentTo(variables.phone);
      setStage("code");
      setResendAt(Date.now() + result.resendAfterSeconds * 1000);
      window.requestAnimationFrame(() => document.getElementById("guardian-phone-code")?.focus());
    },
    onError: (error) => {
      if (codeSentTo) { setPhoneCodeError(error.message); return; }
      setJourneyError(error.message);
      toast.error(error.message);
    },
  });
  // Nothing is sent from the first screen; it only asks whether the number already has an account.
  const phoneStatusMutation = trpc.guardianIntake.phoneStatus.useMutation({
    onSuccess: (result) => {
      setJourneyError("");
      if (result.registered) {
        toast.info("This number already has an account. Please sign in.");
        navigate("/auth?role=guardian");
        return;
      }
      setStage("register");
    },
    onError: (error) => {
      setJourneyError(error.message);
      toast.error(error.message);
    },
  });
  // The number this visit already proved, so "Back to phone" and on again does
  // not cost a second SMS while the server's intake cookie is still good.
  const [verifiedPhone, setVerifiedPhone] = useState<{ phone: string; at: number } | null>(null);
  const verifyPhoneMutation = trpc.guardianIntake.verifyPhone.useMutation({
    onSuccess: (_result, variables) => {
      setJourneyError("");
      setCodeSentTo(null);
      setPhoneCode("");
      setVerifiedPhone({ phone: variables.phone, at: Date.now() });
      submitRegistration(variables.phone);
    },
    onError: (error) => {
      const fieldMessage = (error.data as { zodFieldErrors?: Record<string, string[]> } | null | undefined)?.zodFieldErrors?.phoneCode?.[0];
      setPhoneCodeError(fieldMessage ?? error.message);
      setPhoneCode("");
    },
  });
  const forgetPhoneCode = () => { setCodeSentTo(null); setPhoneCode(""); setPhoneCodeError(""); };
  const registrationMutation = trpc.guardianAuth.register.useMutation({
    onSuccess: () => {
      removeStorageDraft(DRAFT_STORAGE_KEYS.GUARDIAN_JOURNEY_GUEST);
      setJourneyError("");
      setAccountFieldErrors({});
      void utils.auth.me.invalidate();
      rememberSignInRole("guardian");
      toast.success("Guardian account created.");
      navigate("/guardian/dashboard/hire");
    },
    onError: (error) => {
      const data = error.data as { zodFieldErrors?: Record<string, string[]>; code?: string } | null | undefined;
      // The intake cookie has lapsed; the number has to be proved again.
      if (data?.code === "UNAUTHORIZED") { setVerifiedPhone(null); setStage("register"); }
      const mapped = mapGuardianRegistrationServerErrors(data?.zodFieldErrors);
      const conflict = guardianRegistrationConflictOf(error.message);
      if (data?.code === "CONFLICT" && conflict) {
        const { field } = guardianRegistrationConflictField(conflict);
        setStage("register");
        setAccountFieldErrors((current) => ({ ...current, [field]: error.message }));
        setJourneyError("Please fix the highlighted field and try again.");
        focusFirstGuardianAccountError({ [field]: error.message });
        return;
      }
      if (Object.keys(mapped).length) {
        // The fields that need fixing are on the account form, not here.
        setStage("register");
        setAccountFieldErrors((current) => ({ ...current, ...mapped }));
        setJourneyError("Please fix the highlighted field and try again.");
        focusFirstGuardianAccountError(mapped);
        return;
      }
      if (data?.code === "BAD_REQUEST" && error.message) {
        setStage("register");
        setAccountFieldErrors((current) => ({ ...current, cityLocationId: error.message }));
      }
      // Whatever else went wrong, the code screen has nothing left to offer (its code is spent): back to the form, where Continue tries again without a new SMS.
      setStage("register");
      const message = guardianAuthErrorMessage(error);
      setJourneyError(message);
      toast.error(message);
    },
  });
  const submitRegistration = (phoneValue: string) => {
    registrationMutation.mutate({ name: name.trim(), gender: gender as "male" | "female", email: email.trim(), password, confirmPassword, phone: phoneValue, cityLocationId: accountCityId, locationId: accountLocationId, termsAccepted });
  };

  const draftOwnerId = authQuery.data?.role === "guardian" ? authQuery.data.id : null;
  const requestMutation = trpc.tutorRequests.create.useMutation({
    onSuccess: (result) => {
      if (draftOwnerId) {
        window.sessionStorage.removeItem(guardianRequestDraftStorageKey(draftOwnerId));
        try { window.localStorage.removeItem(guardianRequestDraftStorageKey(draftOwnerId)); } catch {}
      }
      removeStorageDraft(DRAFT_STORAGE_KEYS.GUARDIAN_JOURNEY_GUEST);
      submissionStartedRef.current = false;
      setRequestId(result.id);
      setIsPreviewMode(false);
      setJourneyError("");
      // Step 3 is the confirmation, so a sent request stays in the journey
      // instead of navigating out of it. The Posted jobs list behind the sheet
      // still needs to hear about the new request.
      void utils.tutorRequests.mine.invalidate();
      setStep(3);
    },
    onError: (error) => {
      submissionStartedRef.current = false;
      setJourneyError(error.message);
      toast.error(error.message);
    },
  });
  const updatePendingMutation = trpc.tutorRequests.updatePending.useMutation({
    onSuccess: () => {
      if (draftOwnerId) {
        window.sessionStorage.removeItem(guardianRequestDraftStorageKey(draftOwnerId));
        try { window.localStorage.removeItem(guardianRequestDraftStorageKey(draftOwnerId)); } catch {}
      }
      removeStorageDraft(DRAFT_STORAGE_KEYS.GUARDIAN_JOURNEY_GUEST);
      submissionStartedRef.current = false;
      setIsPreviewMode(false);
      setJourneyError("");
      toast.success("Your Pending request has been updated.");
      void utils.tutorRequests.mine.invalidate();
      navigate("/guardian/dashboard/posted-jobs");
    },
    onError: (error) => {
      submissionStartedRef.current = false;
      setJourneyError(error.message);
      toast.error(error.message);
      if (error.data?.code === "CONFLICT") {
        void utils.tutorRequests.mine.invalidate();
        navigate("/guardian/dashboard/posted-jobs");
      }
    },
  });

  const cities = citiesQuery.data ?? [];
  const accountLocations = accountLocationsQuery.data ?? [];
  const tuitionLocations = tuitionLocationsQuery.data ?? [];
  const accountCityLabel = cities.find((city) => city.id === accountCityId)?.label ?? "";
  const tuitionCityLabel = cities.find((city) => city.id === tuitionCityLocationId)?.label ?? "";
  const tuitionLocationLabel = tuitionLocations.find((location) => location.id === tuitionLocationId)?.label ?? "";
  const localPhone = normalizeNumericDigits(phone, 11);
  const requestInput = useMemo<RequestInput>(() => ({ learningNeeds, tuitionType, groupCapacity, packageDurationMonths, studentCount, studentGender, addressDetails, tuitionCityLocationId, tuitionLocationId, daysPerWeek, tutoringTime, preferredGender, salaryAmount, instituteName, heardAboutUs }), [addressDetails, salaryAmount, instituteName, heardAboutUs, learningNeeds, daysPerWeek, tutoringTime, groupCapacity, packageDurationMonths, preferredGender, studentCount, studentGender, tuitionCityLocationId, tuitionLocationId, tuitionType]);

  useEffect(() => {
    if (embedded || isEditMode || routePath !== "/request-tutor") return;
    if (authQuery.data?.role === "guardian" && (stage === "phone" || stage === "register" || stage === "code")) {
      navigate("/guardian/dashboard/hire");
    }
  }, [authQuery.data?.role, embedded, isEditMode, navigate, routePath, stage]);

  useEffect(() => {
    if (!editRequestId || authQuery.isLoading) return;
    if (authQuery.data?.role !== "guardian") {
      setJourneyError("Only the Guardian who created a Pending request can edit it.");
      navigate("/guardian/dashboard/posted-jobs");
      return;
    }
    if (guardianRequestsQuery.isLoading) return;
    const request = guardianRequestsQuery.data?.find((item) => item.id === editRequestId);
    if (!request || !isGuardianPendingEditEligible(request)) {
      toast.error("This request is no longer Pending and cannot be edited.");
      navigate("/guardian/dashboard/posted-jobs");
      return;
    }
    if (loadedEditRequestId === editRequestId) return;
    setStage("request");
    setStep(1);
    setLearningNeeds(request.learningNeeds?.length ? request.learningNeeds : learningNeedsFromLegacy({ category: request.category ?? "", curriculumType: request.curriculumType, classCourse: request.classCourse ?? "", subjects: parseGuardianRequestSubjects(request.subjects) }));
    setTuitionType(request.tuitionType as TuitionType);
    setGroupCapacity(request.groupCapacity?.toString() ?? "");
    setPackageDurationMonths(request.packageDurationMonths?.toString() ?? "");
    setStudentCount(request.studentCount?.toString() ?? "");
    setStudentGender(request.studentGender === "male" || request.studentGender === "female" ? request.studentGender : "");
    setAddressDetails(request.addressDetails ?? "");
    setTuitionCityLocationId(request.tuitionCityLocationId ?? "");
    setTuitionLocationId(request.tuitionLocationId ?? "");
    setInstituteName(request.instituteName ?? "");
    setHeardAboutUs(isRequestSource(request.heardAboutUs) ? request.heardAboutUs : "");
    setDaysPerWeek(request.daysPerWeek?.toString() ?? "");
    setTutoringTime(normalizeTutoringTime(request.tutoringTime));
    setPreferredGender(request.preferredGender === "male" || request.preferredGender === "female" || request.preferredGender === "any" ? request.preferredGender : "");
    // Grouped for editing, so reopening a saved request shows "5,000" rather
    // than a bare 5000 the Guardian would have to re-punctuate.
    setSalaryAmount(formatSalaryInput(request.budgetAmount));
    setNotes(request.notes ?? "");
    setLoadedEditRequestId(editRequestId);
  }, [authQuery.data?.role, authQuery.isLoading, editRequestId, guardianRequestsQuery.data, guardianRequestsQuery.isLoading, loadedEditRequestId, navigate]);

  const [isSignedDraftRestored, setIsSignedDraftRestored] = useState(false);
  const [isGuestDraftRestored, setIsGuestDraftRestored] = useState(false);

  useEffect(() => {
    if (isEditMode) return;
    if (stage !== "request" || !draftOwnerId || draftRestoredFor === draftOwnerId) return;
    const stored = window.sessionStorage.getItem(guardianRequestDraftStorageKey(draftOwnerId))
      || window.localStorage.getItem(guardianRequestDraftStorageKey(draftOwnerId));
    const draft = stored ? parseGuardianRequestDraft(stored) : null;
    if (draft) {
      setStep(draft.step);
      setLearningNeeds(draft.request.learningNeeds);
      setTuitionType(draft.request.tuitionType);
      setGroupCapacity(draft.request.groupCapacity);
      setPackageDurationMonths(draft.request.packageDurationMonths);
      setStudentCount(draft.request.studentCount);
      setStudentGender(draft.request.studentGender);
      setAddressDetails(draft.request.addressDetails);
      setTuitionCityLocationId(draft.request.tuitionCityLocationId);
      setTuitionLocationId(draft.request.tuitionLocationId);
      setDaysPerWeek(draft.request.daysPerWeek);
      setTutoringTime(draft.request.tutoringTime);
      setPreferredGender(draft.request.preferredGender);
      setSalaryAmount(draft.request.salaryAmount);
      setInstituteName(draft.request.instituteName);
      setHeardAboutUs(draft.request.heardAboutUs);
      setNotes(draft.notes);
      setIsSignedDraftRestored(true);
    }
    setDraftRestoredFor(draftOwnerId);
  }, [draftOwnerId, draftRestoredFor, isEditMode, stage]);

  useEffect(() => {
    if (isEditMode) return;
    if (stage !== "request" || !draftOwnerId || draftRestoredFor !== draftOwnerId || requestId) return;
    const serialized = serializeGuardianRequestDraft({ version: GUARDIAN_REQUEST_DRAFT_VERSION, step, request: requestInput, notes });
    window.sessionStorage.setItem(guardianRequestDraftStorageKey(draftOwnerId), serialized);
    try {
      window.localStorage.setItem(guardianRequestDraftStorageKey(draftOwnerId), serialized);
    } catch {}
  }, [draftOwnerId, draftRestoredFor, isEditMode, notes, requestId, requestInput, stage, step]);

  const handleClearSignedDraft = () => {
    if (draftOwnerId) {
      window.sessionStorage.removeItem(guardianRequestDraftStorageKey(draftOwnerId));
      try { window.localStorage.removeItem(guardianRequestDraftStorageKey(draftOwnerId)); } catch {}
    }
    setStep(1);
    setLearningNeeds([]);
    setTuitionType("home");
    setGroupCapacity("");
    setPackageDurationMonths("");
    setStudentCount("1");
    setStudentGender("");
    setAddressDetails("");
    setTuitionCityLocationId("");
    setTuitionLocationId("");
    setDaysPerWeek("");
    setTutoringTime("");
    setPreferredGender("any");
    setSalaryAmount("");
    setInstituteName("");
    setHeardAboutUs("");
    setNotes("");
    setIsSignedDraftRestored(false);
  };

  useEffect(() => {
    if (embedded || isEditMode || draftOwnerId) return;
    const guest = readStorageDraft<{
      phone?: string;
      name?: string;
      email?: string;
      gender?: "" | "male" | "female";
      accountCityId?: string;
      accountLocationId?: string;
      termsAccepted?: boolean;
    }>(DRAFT_STORAGE_KEYS.GUARDIAN_JOURNEY_GUEST);

    if (guest && (guest.phone || guest.name || guest.email || guest.accountCityId)) {
      if (guest.phone) setPhone(guest.phone);
      if (guest.name) setName(guest.name);
      if (guest.email) setEmail(guest.email);
      if (guest.gender) setGender(guest.gender);
      if (guest.accountCityId) setAccountCityId(guest.accountCityId);
      if (guest.accountLocationId) setAccountLocationId(guest.accountLocationId);
      if (guest.termsAccepted) setTermsAccepted(guest.termsAccepted);
      setIsGuestDraftRestored(true);
    }
  }, [draftOwnerId, embedded, isEditMode]);

  useEffect(() => {
    if (embedded || isEditMode || draftOwnerId) return;
    if (stage !== "phone" && stage !== "register") return;
    const hasContent = Boolean(
      phone.trim() ||
      name.trim() ||
      email.trim() ||
      gender ||
      accountCityId ||
      accountLocationId
    );
    if (hasContent) {
      saveStorageDraft(DRAFT_STORAGE_KEYS.GUARDIAN_JOURNEY_GUEST, {
        phone,
        name,
        email,
        gender,
        accountCityId,
        accountLocationId,
        termsAccepted,
      });
    }
  }, [accountCityId, accountLocationId, draftOwnerId, email, embedded, gender, isEditMode, name, phone, stage, termsAccepted]);

  const handleClearGuestDraft = () => {
    removeStorageDraft(DRAFT_STORAGE_KEYS.GUARDIAN_JOURNEY_GUEST);
    setPhone("");
    setName("");
    setEmail("");
    setGender("");
    setPassword("");
    setConfirmPassword("");
    setAccountCityId("");
    setAccountLocationId("");
    setTermsAccepted(false);
    setStage("phone");
    setIsGuestDraftRestored(false);
  };

  const clearJourneyError = () => setJourneyError("");
  const clearAccountFieldError = (...keys: Array<keyof GuardianAccountFieldErrors>) => {
    setJourneyError("");
    setAccountFieldErrors((current) => {
      if (!keys.some((key) => current[key])) return current;
      const next = { ...current };
      for (const key of keys) delete next[key];
      return next;
    });
  };
  // The Owner's cap, falling back to the shipped one while the query is in
  // flight or if it fails. The server checks it again either way; this is only
  // so the form can say no before the work is lost.
  const resolvedLimits = trpc.siteLimits.resolved.useQuery();
  const needsLimits = learningNeedsLimitsFrom(resolvedLimits.data);
  const advance = () => {
    const error = getGuardianRequestStepValidation(requestInput, 1, needsLimits);
    if (error) { setJourneyError(error); return; }
    clearJourneyError();
    setIsPreviewMode(false);
    setStep(2);
  };
  const handleShowPreview = () => {
    const error = getGuardianRequestStepValidation(requestInput, 2, needsLimits);
    if (error) {
      setJourneyError(error);
      if (error.toLowerCase().includes("curriculum") || error.includes("class") || error.includes("subject")) {
        setStep(1);
      }
      return;
    }
    clearJourneyError();
    setIsPreviewMode(true);
  };
  const submitRequest = (event: FormEvent) => {
    event.preventDefault();
    // Step 2 carries the only submit control. Step 1 shares this form, so an
    // Enter key pressed in one of its fields must not send a request the
    // Guardian has not finished writing, and step 3 is already sent.
    if (step !== 2) return;
    if (!canStartGuardianRequestSubmission({ mutationPending: requestMutation.isPending || updatePendingMutation.isPending, submissionStarted: submissionStartedRef.current })) return;
    const error = getGuardianRequestStepValidation(requestInput, 2, needsLimits);
    if (error) {
      setJourneyError(error);
      setStep(error.toLowerCase().includes("curriculum") || error.includes("class") || error.includes("subject") ? 1 : 2);
      return;
    }
    submissionStartedRef.current = true;
    const common = {
      learningNeeds: learningNeeds.map(need => ({
        category: need.category,
        ...(need.curriculumType ? { curriculumType: need.curriculumType } : {}),
        classes: need.classes,
      })),
      daysPerWeek: Number(daysPerWeek),
      // An empty box is sent as null, never "": that is how an edit clears a time the request already had.
      tutoringTime: normalizeTutoringTime(tutoringTime) || null,
      preferredGender: preferredGender as Exclude<PreferredGender, "">,
      studentGender: studentGender || undefined,
      addressDetails: addressDetails.trim() || undefined,
      budgetAmount: parseSalaryAmount(salaryAmount) ?? 0,
      instituteName: normalizeInstituteName(instituteName) || undefined,
      heardAboutUs: heardAboutUs as RequestSource,
      notes: notes.trim() || undefined,
    };
    const submit = (input: Parameters<typeof requestMutation.mutate>[0]) => {
      if (editRequestId) updatePendingMutation.mutate({ requestId: editRequestId, ...input });
      else requestMutation.mutate(input);
    };
    if (tuitionType === "online") submit({ ...common, tuitionType: "online", studentCount: Number(studentCount) });
    else if (tuitionType === "group") submit({ ...common, tuitionType: "group", groupCapacity: Number(groupCapacity), tuitionCityLocationId, tuitionLocationId });
    else if (tuitionType === "package") submit({ ...common, tuitionType: "package", packageDurationMonths: Number(packageDurationMonths), studentCount: Number(studentCount), tuitionCityLocationId, tuitionLocationId });
    else if (tuitionType === "home") submit({ ...common, tuitionType: "home", studentCount: Number(studentCount), tuitionCityLocationId, tuitionLocationId });
    else submit({ ...common, tuitionType: "both", tuitionCityLocationId, tuitionLocationId });
  };
  // The number came first and the account form second; submitting the form sends the SMS code,
  // and only once that code is verified is the account made.
  const continueToVerify = () => {
    const errors = validateGuardianRegistration(
      { name, gender, email, password, confirmPassword, accountCityId, accountLocationId },
      termsAccepted,
    );
    setAccountFieldErrors(errors);
    if (Object.keys(errors).length) {
      setJourneyError("");
      focusFirstGuardianAccountError(errors);
      return;
    }
    clearJourneyError();
    const digits = cleanBangladeshLocalPhoneDigits(localPhone);
    const fullPhone = `+880${digits}`;
    if (verifiedPhone?.phone === fullPhone && Date.now() - verifiedPhone.at < VERIFIED_PHONE_REUSE_MS) { submitRegistration(fullPhone); return; }
    intakeMutation.mutate({ phone: fullPhone });
  };

  return <div className={presentation.rootClassName}>
    {presentation.showPublicChrome ? <SiteHeader /> : null}
    <main className={embedded ? "py-0" : "px-4 py-8 sm:px-6"}><div className={embedded ? "max-w-none" : "mx-auto max-w-4xl"}>
      <section className={embedded ? "" : "relative overflow-hidden rounded-[1.65rem] border border-j-border bg-white p-5 shadow-[0_1px_2px_rgba(16,49,77,.05),0_20px_54px_-14px_rgba(16,49,77,.20)] ring-1 ring-[rgba(16,49,77,.035)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-[2px] hover:shadow-[0_24px_64px_-16px_rgba(16,49,77,.25)] sm:p-6"}>
        {!embedded ? <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,var(--j-accent),transparent)]" /> : null}
        {journeyError ? <p role="alert" className="mb-5 rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{journeyError}</p> : null}
        {isGuestDraftRestored && (stage === "phone" || stage === "register") ? (
          <DraftRestoredAlert
            onClear={handleClearGuestDraft}
            onDismiss={() => setIsGuestDraftRestored(false)}
            className="mb-4"
          />
        ) : null}
        {isSignedDraftRestored && stage === "request" && step !== 3 ? (
          <DraftRestoredAlert
            onClear={handleClearSignedDraft}
            onDismiss={() => setIsSignedDraftRestored(false)}
            className="mb-4"
          />
        ) : null}
        {stage === "phone" ? <PhoneStage phone={localPhone} pending={phoneStatusMutation.isPending} onPhoneChange={(value) => { clearJourneyError(); setPhone(value); }} onContinue={() => {
          const digits = cleanBangladeshLocalPhoneDigits(localPhone);
          if (!isValidBangladeshLocalPhone(digits)) { setJourneyError("Enter a valid Bangladesh mobile number (10 digits after +880, e.g. 1712 345 678)."); return; }
          clearJourneyError();
          phoneStatusMutation.mutate({ phone: `+880${digits}` });
        }} /> : null}
        {stage === "register" ? <AccountStage name={name} email={email} gender={gender} password={password} confirmPassword={confirmPassword} cities={cities} accountCityId={accountCityId} accountLocations={accountLocations} accountLocationId={accountLocationId} accountCityLabel={accountCityLabel} termsAccepted={termsAccepted} fieldErrors={accountFieldErrors} phone={localPhone} pending={intakeMutation.isPending} onBack={() => { clearJourneyError(); setStage("phone"); }} onName={(value) => { clearAccountFieldError("name"); setName(value); }} onEmail={(value) => { clearAccountFieldError("email"); setEmail(value); }} onGender={setGender} onPassword={(value) => { clearAccountFieldError("password"); setPassword(value); }} onConfirmPassword={(value) => { clearAccountFieldError("confirmPassword"); setConfirmPassword(value); }} onCity={(value) => { clearAccountFieldError("cityLocationId", "locationId"); setAccountCityId(value); setAccountLocationId(""); }} onLocation={(value) => { clearAccountFieldError("locationId"); setAccountLocationId(value); }} onTerms={(value) => { clearAccountFieldError("terms"); setTermsAccepted(value); }} onCreate={continueToVerify} /> : null}
        {stage === "code" && codeSentTo ? <CodeStage
          sentTo={codeSentTo}
          value={phoneCode}
          error={phoneCodeError}
          onChange={(value) => { setPhoneCode(value); setPhoneCodeError(""); }}
          verifying={verifyPhoneMutation.isPending || registrationMutation.isPending}
          onVerify={(code) => {
            if (!/^\d{4}$/.test(code)) { setPhoneCodeError("৪ অঙ্কের কোডটি লিখুন।"); return; }
            if (verifyPhoneMutation.isPending || registrationMutation.isPending) return;
            verifyPhoneMutation.mutate({ phone: codeSentTo, code });
          }}
          resendInSeconds={resendInSeconds}
          resending={intakeMutation.isPending}
          onResend={() => { setPhoneCodeError(""); intakeMutation.mutate({ phone: codeSentTo }); }}
          onBack={() => { clearJourneyError(); forgetPhoneCode(); setStage("register"); }}
        /> : null}
        {stage === "request" && isEditMode && (authQuery.isLoading || guardianRequestsQuery.isLoading || loadedEditRequestId !== editRequestId) ? <div className="mt-8 rounded-xl border border-j-border bg-j-surface-sunken p-6 text-center text-sm font-semibold text-j-ink-soft"><span className="mb-3 block"><LoadingCradle /></span>Loading your private Pending request securely…</div> : null}
        {stage === "request" && (!isEditMode || loadedEditRequestId === editRequestId) ? <RequestStage
          step={step}
          requestInput={requestInput}
          notes={notes}
          cities={cities}
          tuitionLocations={tuitionLocations}
          tuitionCityLabel={tuitionCityLabel}
          tuitionLocationLabel={tuitionLocationLabel}
          pending={requestMutation.isPending || updatePendingMutation.isPending || submissionStartedRef.current}
          needsLimits={needsLimits}
          onSetLearningNeeds={(next) => { clearJourneyError(); setLearningNeeds(next); }}
          onNeedsNotice={setJourneyError}
          onSetStudentGender={(value) => { clearJourneyError(); setStudentGender(value); }}
          onSetAddressDetails={(value) => { clearJourneyError(); setAddressDetails(value); }}
          onSetTuitionType={(value) => { clearJourneyError(); setTuitionType(value); if (value !== "group") setGroupCapacity(""); if (value !== "package") setPackageDurationMonths(""); if (value === "group" || value === "both") setStudentCount(DEFAULT_STUDENT_COUNT); }}
          onSetGroupCapacity={(value) => { clearJourneyError(); setGroupCapacity(normalizeNumericDigits(value)); }}
          onSetPackageDurationMonths={(value) => { clearJourneyError(); setPackageDurationMonths(normalizeNumericDigits(value)); }}
          onSetStudentCount={(value) => { clearJourneyError(); setStudentCount(normalizeNumericDigits(value)); }}
          onSetTuitionCity={(value) => { clearJourneyError(); setTuitionCityLocationId(value); setTuitionLocationId(""); }}
          onSetTuitionLocation={(value) => { clearJourneyError(); setTuitionLocationId(value); }}
          onSetDays={(value) => { clearJourneyError(); setDaysPerWeek(value); }}
          onSetTutoringTime={(value) => { clearJourneyError(); setTutoringTime(value); }}
          onSetPreferredGender={(value) => { clearJourneyError(); setPreferredGender(value); }}
          onSetSalaryAmount={(value) => { clearJourneyError(); setSalaryAmount(value); }}
          onSetInstituteName={(value) => { clearJourneyError(); setInstituteName(value); }}
          onSetHeardAboutUs={(value) => { clearJourneyError(); setHeardAboutUs(value); }}
          onSetNotes={(value) => { clearJourneyError(); setNotes(value); }}
          isPreviewMode={isPreviewMode}
          onPreview={handleShowPreview}
          onClosePreview={() => setIsPreviewMode(false)}
          onJumpToStep={(targetStep) => { clearJourneyError(); setIsPreviewMode(false); setStep(targetStep); }}
          onBack={() => { clearJourneyError(); if (isPreviewMode) { setIsPreviewMode(false); } else { setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3); } }}
          onAdvance={advance}
          onSubmit={submitRequest}
          isEditMode={isEditMode}
          requestId={requestId}
          onPostAnother={startAnotherRequest}
        /> : null}
      </section>
    </div></main>
    {presentation.showPublicChrome ? <SiteFooter /> : null}
  </div>;
}

/** The first screen: the mobile number and nothing else. The code is asked for last, on its own screen (CodeStage). */
export function PhoneStage({ phone, onPhoneChange, pending, onContinue }: { phone: string; onPhoneChange: (value: string) => void; pending: boolean; onContinue: () => void }) {
  const digits = cleanBangladeshLocalPhoneDigits(phone);
  const valid = isValidBangladeshLocalPhone(digits);
  const resolveSlot = useSiteContentResolver();
  return <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
    <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-j-ink sm:text-3xl"><SiteText slotId="request-tutor.phone.heading" /></h1>
    <label className="mt-6 block max-w-md" htmlFor="guardian-phone">
      <span className={fieldLabel}>{resolveSlot("request-tutor.field.phone", "Bangladesh mobile number")} <span className={requiredMark}>*</span></span>
      <span className={`modal-field-journey mt-2 flex items-stretch overflow-hidden rounded-xl border bg-j-surface-sunken transition focus-within:border-j-accent focus-within:bg-white focus-within:ring-4 focus-within:ring-j-accent/12 ${valid ? "border-j-ok" : "border-j-field-border"}`}>
        <span className="flex items-center gap-1.5 border-r border-j-border px-3.5 font-semibold text-j-ink-soft select-none"><Phone size={14} aria-hidden="true" />+880</span>
        <input
          id="guardian-phone"
          className="min-w-0 flex-1 bg-transparent px-3.5 text-base tracking-[0.02em] outline-none placeholder:text-[#9aabbb] tabular-nums"
          value={formatBangladeshLocalPhoneDisplay(phone)}
          onChange={(event) => onPhoneChange(cleanBangladeshLocalPhoneDigits(event.target.value))}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            if (pasted) {
              event.preventDefault();
              onPhoneChange(cleanBangladeshLocalPhoneDigits(pasted));
            }
          }}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (valid && !pending) onContinue(); } }}
          placeholder="1XXX XXX XXX"
          inputMode="numeric"
          maxLength={14}
          autoComplete="tel-national"
        />
        {valid ? <span className="flex items-center pr-3.5 text-j-ok" aria-hidden="true"><Check size={18} /></span> : null}
      </span>
      {valid ? <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-j-ok"><span className="h-1.5 w-1.5 rounded-full bg-j-ok" aria-hidden="true" />Valid mobile number</span> : null}
    </label>
    <div className="mt-6 flex max-w-md flex-col gap-3">
      <button type="button" className={`${primaryButton} w-full`} disabled={pending} onClick={onContinue}>{pending && <Loader2 className="animate-spin" size={18} />} <SiteText slotId="button-section.journey.phoneContinue" fallback="Continue" /></button>
      <div className="text-center"><SignInPrompt href="/auth?role=guardian" /></div>
    </div>
  </div>;
}

/** The last screen: the 4-digit code sent to the number from the first screen, checked before the account is made. */
export function CodeStage({ sentTo, value, error, onChange, verifying, onVerify, resendInSeconds, resending, onResend, onBack }: {
  sentTo: string; value: string; error: string; onChange: (value: string) => void; verifying: boolean; onVerify: (code: string) => void;
  resendInSeconds: number; resending: boolean; onResend: () => void; onBack: () => void;
}) {
  const resolveSlot = useSiteContentResolver();
  return <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
    <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-j-ink sm:text-3xl"><SiteText slotId="request-tutor.code.heading" /></h1>
    <div className="mt-6 max-w-md rounded-xl border border-j-border bg-j-surface-sunken p-4">
      <PhoneCodeField
        id="guardian-phone-code"
        label={resolveSlot("request-tutor.field.phoneCode", "Verification code")}
        sentTo={`Sent to ${sentTo}`}
        value={value}
        onChange={onChange}
        onComplete={onVerify}
        error={error || undefined}
        resendInSeconds={resendInSeconds}
        resending={resending}
        onResend={onResend}
        resendLabel="Send a new code"
      />
    </div>
    <div className="mt-6 flex max-w-md flex-col gap-3">
      <button type="button" className={`${primaryButton} w-full`} disabled={verifying} onClick={() => onVerify(value)}>{verifying && <Loader2 className="animate-spin" size={18} />} <SiteText slotId="button-section.journey.phoneVerify" fallback="Verify code" /></button>
      <button type="button" className={ghostButton} onClick={onBack}><SiteText slotId="button-section.journey.phoneBack" fallback="Back to your details" /></button>
    </div>
  </div>;
}

export type GuardianAccountStageProps = {
  name: string; email: string; phone: string; gender: "" | "male" | "female"; password: string; confirmPassword: string;
  cities: Array<{ id: string; label: string }>; accountCityId: string; accountLocations: Array<{ id: string; label: string }>;
  accountLocationId: string; accountCityLabel: string; termsAccepted: boolean; pending: boolean;
  fieldErrors?: GuardianAccountFieldErrors;
  onName: (value: string) => void; onEmail: (value: string) => void; onGender: (value: "male" | "female") => void;
  onPassword: (value: string) => void; onConfirmPassword: (value: string) => void;
  onCity: (value: string) => void; onLocation: (value: string) => void; onTerms: (value: boolean) => void; onBack: () => void; onCreate: () => void;
};

export function getGuardianLocationSelectionState(cityId: string, locationId: string, cityLabel: string, locationLabel: string) {
  if (!cityId || !locationId || !cityLabel || !locationLabel) return null;
  return { complete: true as const, cityLabel, locationLabel };
}

export function AccountStage(props: GuardianAccountStageProps) {
  const errors = props.fieldErrors ?? {};
  const resolveSlot = useSiteContentResolver();
  const passwordMatch = getPasswordMatch(props.password, props.confirmPassword);
  const displayPhone = cleanBangladeshLocalPhoneDigits(props.phone);
  return <section className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300" aria-label="Guardian account details">
    <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-j-ink sm:text-3xl"><SiteText slotId="request-tutor.account.heading" /></h1>

    <div className={`mt-6 ${fieldGrid}`}>
      <RegistrationFieldError id="guardian-full-name-error" message={errors.name}>
        <label className="block" htmlFor="guardian-full-name"><span className={fieldLabel}>{resolveSlot("request-tutor.field.fullName", "Full name")}<RequiredMark /></span><input id="guardian-full-name" maxLength={160} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "guardian-full-name-error" : undefined} className={`${filledField} mt-2`} value={props.name} onChange={(event) => props.onName(event.target.value)} autoComplete="name" placeholder="Your full name" /></label>
      </RegistrationFieldError>

      <RegistrationFieldError id="guardian-gender-error" message={errors.gender}>
        <GenderField id="guardian-gender" name="guardian-gender" label={resolveSlot("request-tutor.field.gender", "Gender")} value={props.gender} onSelect={props.onGender} invalid={Boolean(errors.gender)} describedBy={errors.gender ? "guardian-gender-error" : undefined} />
      </RegistrationFieldError>

      <RegistrationFieldError id="guardian-phone-error" message={errors.phone} action={guardianConflictSignIn(errors.phone)}>
        <PhoneField id="guardian-phone" label={resolveSlot("request-tutor.field.accountPhone", "Phone number")} value={displayPhone} readOnly invalid={Boolean(errors.phone)} describedBy={errors.phone ? "guardian-phone-error" : undefined} />
      </RegistrationFieldError>

      <RegistrationFieldError id="guardian-email-error" message={errors.email} action={guardianConflictSignIn(errors.email)}>
        <label className="block" htmlFor="guardian-email"><span className={fieldLabel}>{resolveSlot("request-tutor.field.email", "Email")}<RequiredMark /></span><input id="guardian-email" type="email" maxLength={320} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "guardian-email-error" : undefined} className={`${filledField} mt-2`} value={props.email} onChange={(event) => props.onEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" /></label>
      </RegistrationFieldError>

      <RegistrationFieldError id="guardian-password-error" message={errors.password}>
        <PasswordField id="guardian-password" label={resolveSlot("request-tutor.field.password", "Password")} value={props.password} onChange={props.onPassword} placeholder="At least 8 characters" invalid={Boolean(errors.password)} describedBy={errors.password ? "guardian-password-error" : "guardian-password-strength"}>
          <PasswordStrength id="guardian-password-strength" password={props.password} />
        </PasswordField>
      </RegistrationFieldError>

      <RegistrationFieldError id="guardian-confirm-password-error" message={errors.confirmPassword}>
        <PasswordField id="guardian-confirm-password" label={resolveSlot("request-tutor.field.confirmPassword", "Confirm password")} value={props.confirmPassword} onChange={props.onConfirmPassword} placeholder="Re-enter your password" invalid={errors.confirmPassword ? true : passwordMatch ? !passwordMatch.matches : undefined} describedBy={errors.confirmPassword ? "guardian-confirm-password-error" : passwordMatch ? "guardian-password-match" : undefined} inputClassName={confirmPasswordBorder(props.password, props.confirmPassword, errors.confirmPassword)}>
          <PasswordMatch id="guardian-password-match" password={props.password} confirmPassword={props.confirmPassword} />
        </PasswordField>
      </RegistrationFieldError>

      <RegistrationFieldError id="guardian-account-city-error" message={errors.cityLocationId}>
        <SearchableLocationSelect triggerId="guardian-account-city" label="City" slotId="request-tutor.field.accountCity" value={props.accountCityId} options={props.cities} placeholder="Search a City" searchPlaceholder="Search City" emptyMessage="No City matches your search." required onChange={props.onCity} invalid={Boolean(errors.cityLocationId)} describedBy={errors.cityLocationId ? "guardian-account-city-error" : undefined} />
      </RegistrationFieldError>
      <RegistrationFieldError id="guardian-account-location-error" message={errors.locationId}>
        <SearchableLocationSelect triggerId="guardian-account-location" label="Location" slotId="request-tutor.field.accountLocation" value={props.accountLocationId} options={props.accountLocations} placeholder="Choose a City first" searchPlaceholder="Search location or Sub-area" emptyMessage="No location matches your search." disabled={!props.accountCityId} required onChange={props.onLocation} invalid={Boolean(errors.locationId)} describedBy={errors.locationId ? "guardian-account-location-error" : undefined} />
      </RegistrationFieldError>
    </div>

    <RegistrationFieldError id="guardian-terms-error" message={errors.terms}>
      <PolicyConsent id="guardian-terms" checked={props.termsAccepted} onChange={props.onTerms} invalid={Boolean(errors.terms)} describedBy={errors.terms ? "guardian-terms-error" : undefined} />
    </RegistrationFieldError>

    <div className={registrationFooter}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <button type="button" className={ghostButton} onClick={props.onBack}><SiteText slotId="button-section.journey.accountBack" fallback="Back to phone" /></button>
        <SignInPrompt href="/auth?role=guardian" />
      </div>
      <button type="button" className={`${primaryButton} shrink-0`} disabled={props.pending} onClick={props.onCreate}>{props.pending && <Loader2 className="animate-spin" size={18} />} <SiteText slotId="button-section.journey.accountCreate" fallback="Continue" /></button>
    </div>
  </section>;
}

type RequestStageProps = {
  step: 1 | 2 | 3; requestInput: RequestInput; notes: string;
  cities: Array<{ id: string; label: string }>; tuitionLocations: Array<{ id: string; label: string }>;
  tuitionCityLabel: string; tuitionLocationLabel: string; pending: boolean;
  needsLimits: LearningNeedsLimits; onSetLearningNeeds: (next: LearningNeed[]) => void; onNeedsNotice: (message: string) => void; onSetStudentGender: (value: StudentGender) => void; onSetAddressDetails: (value: string) => void;
  onSetTuitionType: (value: TuitionType) => void; onSetGroupCapacity: (value: string) => void; onSetPackageDurationMonths: (value: string) => void; onSetStudentCount: (value: string) => void; onSetTuitionCity: (value: string) => void; onSetTuitionLocation: (value: string) => void;
  onSetDays: (value: string) => void; onSetTutoringTime: (value: string) => void; onSetPreferredGender: (value: PreferredGender) => void; onSetSalaryAmount: (value: string) => void; onSetInstituteName: (value: string) => void; onSetHeardAboutUs: (value: RequestSource) => void; onSetNotes: (value: string) => void;
  onBack: () => void; onAdvance: () => void; onSubmit: (event: FormEvent) => void;
  /** Step 3 reads the request back once it is sent. */
  isEditMode?: boolean; requestId?: number | null; onPostAnother?: () => void;
  isPreviewMode?: boolean;
  onPreview?: () => void;
  onClosePreview?: () => void;
  onJumpToStep?: (step: 1 | 2) => void;
};

export function RequestStage(props: RequestStageProps) {
  const { requestInput: input } = props;
  const resolveSlot = useSiteContentResolver();
  const locationSelection = getGuardianLocationSelectionState(input.tuitionCityLocationId, input.tuitionLocationId, props.tuitionCityLabel, props.tuitionLocationLabel);
  // Step 2 sends the request, so its button says so rather than "Continue" -
  // the Guardian has to know the press is the one that posts the job.
  const submitLabel = props.isEditMode
    ? (props.pending ? "Saving changes" : "Save changes")
    : (props.pending ? "Sending request" : "Send request");
  return <form className="mt-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300" onSubmit={props.onSubmit}>
    {/* One line, every width: three marks joined by a rail that fills as the
        Guardian moves. The step names are read out but not drawn - the step's
        own heading says where you are, and on a phone three named cards took
        the screen the form needed. The rail and the steps still ahead are
        drawn in translucent deep blue rather than a pale grey, so they hold
        on a white page and on a tinted one alike. */}
    <ol className="mt-7 flex items-center gap-2.5" aria-label="Tutor request details progress">{requestSteps.map((label, index) => {
      const number = index + 1;
      const isActive = props.step === number;
      const isComplete = number < props.step;
      const isLast = number === requestSteps.length;
      return <li key={label} aria-current={isActive ? "step" : undefined} className={`flex items-center gap-2.5 ${isLast ? "" : "flex-1"}`}>
        <span className={`relative grid size-8 shrink-0 place-items-center rounded-full text-xs font-extrabold transition-all duration-500 ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none ${isActive ? "bg-j-accent text-white ring-4 ring-j-accent/15" : isComplete ? "bg-j-ok text-white" : "bg-white text-[#0f4c81] ring-1 ring-[#0f4c81]/30"}`}>
          {/* Only the step you are on ripples; reduced motion keeps it still. */}
          {isActive ? <span aria-hidden="true" className="journey-step-halo absolute inset-0 rounded-full bg-j-accent motion-reduce:hidden" /> : null}
          <span className="relative">{isComplete ? <Check size={14} aria-hidden="true" /> : number}</span>
        </span>
        <span className="sr-only">{label}</span>
        {isLast ? null : <span aria-hidden="true" className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#0f4c81]/25">
          <span className={`block h-full rounded-full bg-j-ok transition-[width] duration-700 ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none ${isComplete ? "w-full" : "w-0"}`} />
        </span>}
      </li>;
    })}</ol>
    {props.step === 1 ? <div className="mt-6 space-y-6">
      <fieldset>
        <legend className="sr-only">Learning details</legend>
        {/* One grid for the whole step, so every box is exactly one column
            wide, and the boxes are ordered so that no row is left half empty:
            Tuition type beside Student gender, Tuition City beside Location, then
            the two full-width blocks. Online has no City or Location, and its two
            rows still fill. */}
        <div className={fieldGrid}>
          <SelectField label="Tuition type" slotId="request-tutor.field.tuitionType" icon={<TuitionTypeIcon type={input.tuitionType} />} value={input.tuitionType} onChange={(value) => props.onSetTuitionType(value as TuitionType)} options={["home", "online", "group", "package"]} placeholder="Choose a tuition type" formatOption={(value) => formatTuitionType(value as TuitionType)} />
          <SelectField label="Student gender" slotId="request-tutor.field.studentGender" icon={input.studentGender ? <TutorPreferenceIcon preference={input.studentGender} className="text-j-accent" /> : <RecordIcon name="studentGender" size={17} />} optional value={input.studentGender} onChange={(value) => props.onSetStudentGender(value as StudentGender)} options={["female", "male"]} placeholder="No selection" formatOption={formatStudentGender} />
          {input.tuitionType !== "online" ? <SearchableLocationSelect label="Tuition City" slotId="request-tutor.field.tuitionCity" value={input.tuitionCityLocationId} options={props.cities} placeholder="Search a City" searchPlaceholder="Search City" emptyMessage="No City matches your search." required onChange={props.onSetTuitionCity} /> : null}
          {input.tuitionType !== "online" ? <SearchableLocationSelect label="Location" slotId="request-tutor.field.tuitionLocation" value={input.tuitionLocationId} options={props.tuitionLocations} placeholder="Choose a City first" searchPlaceholder="Search location or Sub-area" emptyMessage="No location matches your search." disabled={!input.tuitionCityLocationId} required onChange={props.onSetTuitionLocation} /> : null}
          <div className={fieldGridWide}>
            <LearningNeedsField
              value={input.learningNeeds}
              onChange={props.onSetLearningNeeds}
              limits={props.needsLimits}
              onNotice={props.onNeedsNotice}
              labels={{
                category: resolveSlot("request-tutor.field.category", "Curriculum / category"),
                curriculumType: resolveSlot("request-tutor.field.curriculumType", "Curriculum Type"),
                classCourse: resolveSlot("request-tutor.field.classCourse", "Class / level"),
                subjects: resolveSlot("request-tutor.field.subjects", "Subjects"),
              }}
            />
          </div>
          <div className={fieldGridWide}>
            <TextAreaField label="Address Details" slotId="request-tutor.field.addressDetails" labelIcon={<RecordIcon name="location" size={15} />} id="address-details" name="street-address" autoComplete="street-address" optional value={input.addressDetails} onChange={props.onSetAddressDetails} maxLength={160} />
          </div>
        </div>
      </fieldset>
    </div> : null}
    {props.step === 2 && props.isPreviewMode ? (
      <div className="mt-7 space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
        <div className="rounded-2xl border border-[#bce0fd] bg-gradient-to-r from-[#f0f8ff] via-[#f7fbff] to-[#e8f4fd] p-4.5 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-j-accent text-white shadow-sm">
                <Eye size={20} aria-hidden="true" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-j-accent/10 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-j-accent">
                  Live Job Post Preview
                </span>
                <h2 className="mt-0.5 text-lg font-extrabold text-[#173d60] sm:text-xl">
                  Review your tuition job post
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={props.onClosePreview}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#9bcdf4] bg-white px-3.5 py-2 text-xs font-bold text-[#126ea9] shadow-sm hover:bg-j-accent-wash"
            >
              <Edit3 size={14} aria-hidden="true" /> Back to Edit
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#58758a]">
            This authentic card demonstrates exactly how your tuition request will appear to qualified tutors on the public Job Board.
          </p>
        </div>

        {/* Authentic Job Card */}
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#71889b]">Public Job Card</span>
            <span className="text-2xs font-semibold text-[#126ea9]">Interactive Preview</span>
          </div>
          <SharedJobCard
            job={buildPreviewJobData(input, props.tuitionCityLabel, props.tuitionLocationLabel, props.requestId ?? null, Boolean(props.isEditMode))}
            onOpen={() => {}}
            action={
              <span className="inline-flex h-control items-center rounded-lg bg-j-accent px-4 text-xs font-bold text-white shadow-sm">
                Apply Now
              </span>
            }
            showMapLink={false}
            isNew={true}
          />
        </div>

        {/* Detailed Summary Breakdown with individual edit buttons */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#71889b]">Full Details Breakdown</span>
            <span className="text-xs text-[#71889b]">Verify all requirements</span>
          </div>
          <GuardianRequestSummaryView
            groups={buildGuardianRequestSummary(input, props.notes, props.tuitionCityLabel, props.tuitionLocationLabel)}
            renderGroupAction={(group) => (
              <button
                type="button"
                onClick={() => props.onJumpToStep?.(group.step)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#cbe4f7] bg-white px-2.5 py-1 text-xs font-bold text-j-accent hover:bg-j-accent-wash"
                aria-label={`Edit ${group.title}`}
              >
                <Edit3 size={13} aria-hidden="true" /> Edit
              </button>
            )}
          />
        </div>
      </div>
    ) : null}
    {props.step === 2 && !props.isPreviewMode ? <div className="mt-7 space-y-6">
      {/* One grid, so the salary box is not 320px wide under a 384px student
          count under a half-width dropdown. Every field is one column.
          The salary is one amount, not a range and not "discuss": a Tutor
          reading the Job Board should learn what the tuition pays. Typed
          however the Guardian writes numbers - 5000, 5,000, even "5,000 Taka"
          - and shown back as "5,000 Taka" wherever it appears, with the
          currency word inside the box rather than echoed underneath. */}
      <div className={fieldGrid}>
        {input.tuitionType === "home" || input.tuitionType === "online" || input.tuitionType === "package" ? <NumberField label="Number of students" slotId="request-tutor.field.studentCount" labelIcon={<RecordIcon name="students" size={15} />} id="student-count" min={1} max={100} value={input.studentCount} onChange={props.onSetStudentCount} /> : null}
        {input.tuitionType === "group" ? <NumberField label="Maximum students" slotId="request-tutor.field.groupCapacity" labelIcon={<RecordIcon name="students" size={15} />} id="group-capacity" min={2} max={100} value={input.groupCapacity} onChange={props.onSetGroupCapacity} /> : null}
        {input.tuitionType === "package" ? <NumberField label="Package duration (months)" slotId="request-tutor.field.packageDuration" labelIcon={<RecordIcon name="packageDuration" size={15} />} id="package-duration-months" min={1} max={24} value={input.packageDurationMonths} onChange={props.onSetPackageDurationMonths} /> : null}
        <SelectField label="Days per week" slotId="request-tutor.field.daysPerWeek" icon={<RecordIcon name="daysPerWeek" size={17} />} value={input.daysPerWeek} onChange={props.onSetDays} options={["1", "2", "3", "4", "5", "6", "7"]} placeholder="Choose days" formatOption={(value) => `${value} day${value === "1" ? "" : "s"}`} />
        <InputField label="Institute Name" slotId="request-tutor.field.instituteName" optional value={input.instituteName} onChange={props.onSetInstituteName} maxLength={INSTITUTE_NAME_MAX_LENGTH} placeholder={INSTITUTE_NAME_PLACEHOLDER} icon={<School size={17} />} />
        <SelectField label="Where Did You Hear About Us" slotId="request-tutor.field.heardAboutUs" value={input.heardAboutUs} onChange={(value) => props.onSetHeardAboutUs(value as RequestSource)} options={REQUEST_SOURCE_VALUES} placeholder="Choose an answer" formatOption={formatRequestSource} icon={input.heardAboutUs ? REQUEST_SOURCE_ICONS[input.heardAboutUs] : <Megaphone size={17} />} />
        <SelectField label="Preferred Tutor gender" slotId="request-tutor.field.preferredGender" icon={<TutorPreferenceIcon preference={input.preferredGender || "any"} className="text-j-accent" />} value={input.preferredGender} onChange={(value) => props.onSetPreferredGender(value as PreferredGender)} options={["any", "female", "male"]} placeholder="Choose a preference" formatOption={formatPreferredGender} />
        <MoneyField label="Monthly salary" slotId="request-tutor.field.salary" labelIcon={<RecordIcon name="salary" size={15} />} value={input.salaryAmount} onChange={props.onSetSalaryAmount} placeholder={SALARY_INPUT_PLACEHOLDER} />
        <InputField label="Tutoring Time" slotId="request-tutor.field.tutoringTime" optional type="time" value={input.tutoringTime} onChange={props.onSetTutoringTime} />
        <div className={fieldGridWide}>
          <TextAreaField label="Additional notes" slotId="request-tutor.field.notes" labelIcon={<RecordIcon name="notes" size={15} />} optional value={props.notes} onChange={props.onSetNotes} maxLength={2000} minHeight="min-h-28" />
        </div>
      </div>
    </div> : null}
    {/* Step 3 is the request read back after it is sent, so it carries its own
        two actions and none of the journey's - there is nothing left to go
        Back to and nothing left to send. */}
    {props.step === 3 ? <SuccessState requestId={props.requestId ?? null} input={input} notes={props.notes} tuitionCityLabel={props.tuitionCityLabel} tuitionLocationLabel={props.tuitionLocationLabel} onPostAnother={props.onPostAnother ?? (() => undefined)} /> : null}
    {props.step === 3 ? null : <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-[#e6eef4] pt-6 sm:flex-row sm:items-center">
      {props.step === 2 && props.isPreviewMode ? (
        <button type="button" className={ghostButton} onClick={props.onClosePreview}>
          <span className="inline-flex items-center gap-1.5"><ArrowLeft size={16} aria-hidden="true" /> Back to edit form</span>
        </button>
      ) : props.step > 1 ? (
        <button type="button" className={ghostButton} onClick={props.onBack}>
          <SiteText slotId="button-section.journey.stepBack" fallback="Back" />
        </button>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {props.step === 2 && !props.isPreviewMode ? (
          <button
            type="button"
            className={`${ghostButton} border-[#9bcdf4] text-[#126ea9] hover:bg-j-accent-wash w-full sm:w-auto inline-flex items-center justify-center gap-1.5`}
            onClick={props.onPreview}
            aria-label="Preview and confirm job post"
          >
            <Eye size={16} aria-hidden="true" /> Preview & Confirm
          </button>
        ) : null}
        {props.step === 1 ? (
          <button
            key="advance"
            type="button"
            className={`${primaryButton} w-full sm:w-auto`}
            aria-label="Continue to tuition preferences"
            onClick={props.onAdvance}
          >
            <SiteText slotId="button-section.journey.stepContinue" fallback="Continue" />
          </button>
        ) : (
          <button
            key={props.isPreviewMode ? "submit-preview" : "submit-direct"}
            type="submit"
            className={`${primaryButton} w-full sm:w-auto`}
            disabled={props.pending}
            aria-label={props.isPreviewMode ? (props.isEditMode ? "Confirm & Save changes" : "Confirm & Send request") : submitLabel}
          >
            {props.pending && <Loader2 className="animate-spin" size={18} />}
            {props.isPreviewMode
              ? (props.isEditMode ? "Confirm & Save changes" : "Confirm & Send request")
              : submitLabel}
          </button>
        )}
      </div>
    </div>}
  </form>;
}

/**
 * What a Guardian sees the moment a request is sent: the whole request read
 * back in the same record layout the review used, so the confirmation is the
 * request rather than a receipt that talks about it.
 *
 * The two actions sit where the field list puts them - carry on posting from
 * the top right, go and watch this one from the foot.
 */
export function SuccessState({ requestId, input, notes, tuitionCityLabel, tuitionLocationLabel, onPostAnother }: { requestId: number | null; input: RequestInput; notes: string; tuitionCityLabel: string; tuitionLocationLabel: string; onPostAnother: () => void }) {
  const groups = buildGuardianRequestSummary(input, notes, tuitionCityLabel, tuitionLocationLabel);

  return <div className="mt-7 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-j-ok"><Check size={15} strokeWidth={3} /> Request received securely</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-.03em] text-j-ink"><SiteText slotId="request-tutor.done.heading" /></h2>
        {requestId === null ? null : <p className="mt-1"><JobIdTag className="text-xs" jobId={jobIdForRequest(requestId)} /></p>}
      </div>
      {/* A card rather than a filled button: `View my request` at the foot is
          the primary blue, and two competing solids would leave the Guardian
          guessing which one finishes the job. */}
      <PostAnotherRequestButton onClick={onPostAnother} variant="card" />
    </div>

    <div className="mt-6"><GuardianRequestSummaryView groups={groups} /></div>

    <div className="mt-7 flex flex-wrap justify-center gap-3 border-t border-[#e6eef4] pt-6">
      {requestId ? (
        <Link
          href={`/request-tutor?edit=${requestId}`}
          className={`${ghostButton} border-[#9bcdf4] text-[#126ea9] hover:bg-j-accent-wash inline-flex items-center gap-1.5`}
        >
          <Edit3 size={15} aria-hidden="true" /> Edit this request
        </Link>
      ) : null}
      <Link href="/guardian/dashboard/posted-jobs" className={primaryButton}><SiteText slotId="button-section.journey.viewRequest" fallback="View my request" /></Link>
    </div>
  </div>;
}

/** Home, Online, Group or Package - the field wears the chosen shape. */
function TuitionTypeIcon({ type }: { type: string }) {
  if (type === "online") return <Globe aria-hidden="true" size={17} />;
  if (type === "group") return <Users aria-hidden="true" size={17} />;
  if (type === "package") return <Layers aria-hidden="true" size={17} />;
  return <House aria-hidden="true" size={17} />;
}

/**
 * A field's label, its icon, and its required asterisk - in one voice. An
 * optional field says nothing about it: the Owner's rule is that optional
 * stays optional without the word.
 *
 * Every field in the journey renders its label through here. They used to be
 * written by hand at each call site, which is how the form ended up with three
 * label sizes, two reds on the asterisk, and both "(optional)" and
 * "(if applicable)" for the same idea.
 */
function FieldLabelText({ label, slotId, labelIcon, labelHidden, optional }: { label: string; slotId?: string; labelIcon?: ReactNode; labelHidden?: boolean; optional?: boolean }) {
  // An Owner can reword any field from Admin > Guardian Profile content; an
  // untouched slot resolves to the shipped `label`.
  const resolveSlot = useSiteContentResolver();
  const text = resolveSlot(slotId ?? "", label);
  return <span className={labelHidden ? "sr-only" : fieldLabel}>
    <span className="inline-flex items-center gap-1.5">{labelIcon ? <span aria-hidden="true" className="text-j-accent">{labelIcon}</span> : null}{text}</span>
    {optional ? null : <span className={requiredMark}> *</span>}
  </span>;
}

function InputField({ label, slotId, labelIcon, labelHidden, value, onChange, type = "text", autoComplete, optional, maxLength, inputMode, placeholder, icon, id }: { label: string; slotId?: string; labelIcon?: ReactNode; labelHidden?: boolean; icon?: ReactNode; id?: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; optional?: boolean; maxLength?: number; placeholder?: string; inputMode?: "numeric" | "text" | "email" | "tel" | "url" | "search" | "decimal" | "none" }) {
  return <label className="block">
    <FieldLabelText label={label} slotId={slotId} labelIcon={labelIcon} labelHidden={labelHidden} optional={optional} />
    <span className={`relative block ${labelHidden ? "" : "mt-2"}`}>
      {icon ? <span aria-hidden="true" className="input-text-journey pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-j-accent">{icon}</span> : null}
      <input id={id} className={`${filledField} ${icon ? "pl-10" : ""}`} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} maxLength={maxLength} inputMode={inputMode} />
    </span>
  </label>;
}

function SelectField({ label, slotId, labelIcon, value, onChange, options, placeholder, formatOption, optional, icon }: { label: string; slotId?: string; labelIcon?: ReactNode; icon?: ReactNode; value: string; onChange: (value: string) => void; options: readonly string[]; placeholder: string; formatOption?: (value: string) => string; optional?: boolean }) {
  return <label className="block">
    <FieldLabelText label={label} slotId={slotId} labelIcon={labelIcon} optional={optional} />
    <span className="relative mt-2 block">
      {icon ? <span aria-hidden="true" className="input-text-journey pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-j-accent">{icon}</span> : null}
      <select className={`${filledField} ${icon ? "pl-10" : ""}`} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{formatOption?.(option) ?? option}</option>)}
      </select>
    </span>
  </label>;
}

/** A whole-number field. One grid cell wide, like every other field. */
function NumberField({ label, slotId, labelIcon, id, value, onChange, min, max }: { label: string; slotId?: string; labelIcon?: ReactNode; id: string; value: string; onChange: (value: string) => void; min: number; max: number }) {
  return <label className="block">
    <FieldLabelText label={label} slotId={slotId} labelIcon={labelIcon} />
    <input id={id} className={`${filledField} mt-2`} type="number" min={min} max={max} step={1} inputMode="numeric" value={value} onChange={(event) => onChange(toEnglishDigits(event.target.value))} />
  </label>;
}

function TextAreaField({ label, slotId, labelIcon, id, value, onChange, maxLength, optional, minHeight = "min-h-24", name, autoComplete }: { label: string; slotId?: string; labelIcon?: ReactNode; id?: string; value: string; onChange: (value: string) => void; maxLength?: number; optional?: boolean; minHeight?: string; name?: string; autoComplete?: string }) {
  return <label className="block">
    <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <FieldLabelText label={label} slotId={slotId} labelIcon={labelIcon} optional={optional} />
      {maxLength ? <CharacterRemaining value={value} maxLength={maxLength} /> : null}
    </span>
    <textarea id={id} name={name} autoComplete={autoComplete} className={`${filledArea} mt-2 ${minHeight}`} value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} />
  </label>;
}

/** An amount of money, with the currency word inside the box. */
function MoneyField({ label, slotId, labelIcon, value, onChange, placeholder }: { label: string; slotId?: string; labelIcon?: ReactNode; value: string; onChange: (value: string) => void; placeholder?: string }) {
  const resolveSlot = useSiteContentResolver();
  const labelText = resolveSlot(slotId ?? "", label);
  return <label className="block">
    <FieldLabelText label={label} slotId={slotId} labelIcon={labelIcon} />
    <span className="mt-2 block">
      <MoneyAmountField ariaLabel={`${labelText} (Taka)`} value={value} onChange={onChange} placeholder={placeholder} inputClassName={filledField} formatOnBlur />
    </span>
  </label>;
}
// A chosen subject ripples softly, as the step you are on does, so the picks stand out while the list is still open.
function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" aria-pressed={selected} className={`relative inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2 motion-reduce:transition-none ${selected ? "border-j-accent bg-j-accent-wash text-[#126ea9] ring-1 ring-inset ring-j-accent shadow-[0_4px_12px_rgba(22,125,221,.1)]" : "border-[#dbeaf2] bg-white text-[#58758a] hover:-translate-y-px hover:border-[#9bcdf4] hover:bg-j-surface-sunken"}`} onClick={onClick}>{selected ? <span aria-hidden="true" className="journey-chip-halo pointer-events-none absolute -inset-px rounded-xl motion-reduce:hidden" /> : null}{selected ? <Check size={13} aria-hidden="true" /> : null}<span>{children}</span></button>; }
function ReviewItem({ label, value }: { label: string; value: string }) { return <div><dt className="text-[#71889b]">{label}</dt><dd className="font-bold text-[#274d6d]">{value}</dd></div>; }
function formatTuitionType(value: TuitionType) { return value === "home" ? "Home Tutoring" : value === "online" ? "Online Tutoring" : value === "group" ? "Group Tutoring" : value === "package" ? "Package Tutoring" : "Home and Online Tutoring"; }
const REQUEST_SOURCE_ICONS: Record<RequestSource, ReactNode> = {
  friends_family: <Users size={17} />,
  facebook: <Facebook size={17} />,
  websites: <Globe size={17} />,
  others: <MoreHorizontal size={17} />,
};

function formatPreferredGender(value: string) { return value === "any" ? "Any" : value === "female" ? "Female" : value === "male" ? "Male" : value; }
function formatStudentGender(value: string) { return value === "female" ? "Female" : value === "male" ? "Male" : value; }
function formatBudget(input: RequestInput) { return formatSalaryAmount(parseSalaryAmount(input.salaryAmount)); }

/** Journey copy is Admin-editable; slots fall back to the code defaults. */
export default function GuardianRequestJourney(props: { embedded?: boolean }) {
  return <SiteContentProvider page="guardian-profile">
    <SiteBlocks anchorId="request-tutor.top" className="mx-auto max-w-2xl px-4 pt-4" />
    <GuardianRequestJourneyBody {...props} />
  </SiteContentProvider>;
}
