import React, { type ReactNode, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link as WouterLink, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Facebook, Globe, House, KeyRound, Layers, Loader2, Megaphone, MoreHorizontal, Phone, School, Users } from "lucide-react";
import { formatInstituteName, formatRequestSource, isRequestSource, INSTITUTE_NAME_MAX_LENGTH, INSTITUTE_NAME_PLACEHOLDER, normalizeInstituteName, REQUEST_SOURCE_VALUES, type RequestSource } from "@shared/request-source";
import { jobIdForRequest } from "@shared/job-id";
import { buildGuardianRequestSummary } from "./guardian-request-summary";
import { GuardianRequestSummaryView } from "./GuardianRequestSummaryView";
import { MoneyAmountField } from "@/components/MoneyAmountField";
import { PostAnotherRequestButton } from "@/components/PostAnotherRequestButton";
import { RecordIcon } from "@/components/recordIcons";
import { TutorPreferenceIcon } from "@/components/JobCard";
import { toast } from "sonner";

import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { fieldLabel, filledField, filledArea, primaryButton, ghostButton } from "@/components/journeyField";
import { trpc } from "@/lib/trpc";
import { defaultSiteLimits } from "@shared/site-limits";
import { SALARY_INPUT_PLACEHOLDER, formatSalaryAmount, formatSalaryInput, parseSalaryAmount, salaryValidationMessage, validateSalaryAmount } from "@shared/salary-amount";
import { SiteBlocks, SiteContentProvider, SiteText } from "@/lib/siteContent";
import { SearchableLocationSelect } from "@/pages/JoinTutor";
import { guardianRequestDraftStorageKey, parseGuardianRequestDraft, serializeGuardianRequestDraft } from "./guardian-request-draft";

const LOCAL_PHONE = /^01[3-9]\d{8}$/;
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

const guardianDefaultSubjects = ["Bangla", "English", "Mathematics", "Science", "Physics", "Chemistry", "Biology", "ICT"] as const;
export const guardianEarlyYearsSubjects = ["All", "English", "Bangla", "General Maths", "Handwriting", "Drawing", "Arts", "Religious Studies"] as const;
export const guardianEnglishMediumEarlyYearsSubjects = [...guardianEarlyYearsSubjects, "Others"] as const;
const guardianEarlyYearsLevels = ["Pre-Schooling", "Play", "Nursery", "KG"] as const;
export const guardianEnglishMediumClassOneToFiveSubjects = ["All", "Maths", "English Literature", "English", "Bangla", "Science", "Islamic Studies", "History", "ICT", "Social Science", "Bangladesh & Global Studies", "Geography", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishMediumClassOneToFiveLevels = ["Standard 1", "Standard 2", "Standard 3", "Standard 4", "Standard 5"] as const;
export const guardianEnglishMediumClassSixToSevenSubjects = ["All", "Physics", "Chemistry", "Biology", "Maths", "English Literature", "English", "Bangla", "Science", "Business Studies", "Islamic Studies", "History", "ICT", "Social Science", "Bangladesh & Global Studies", "Economics", "Geography", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishMediumClassSixToSevenLevels = ["Standard 6", "Standard 7"] as const;
export const guardianEnglishMediumStandardEightToNineAndOLevelSubjects = ["All", "Physics", "Chemistry", "Maths", "Maths B", "Maths D", "Additional Maths", "Biology", "English Literature", "English Language", "Bangla", "ICT", "Accounting", "Business Studies", "Economics", "Bangladesh Studies", "Commerce", "Islamic Studies", "Law", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishMediumStandardEightToNineAndOLevelLevels = ["Standard 8", "Standard 9", "O Level"] as const;
export const guardianEnglishMediumALevelSubjects = ["Chemistry", "Maths", "Maths B", "Maths D", "Additional Maths", "Biology", "Physics", "Environmental Systems and Societies", "Psychology", "English", "ICT", "Geography", "Economics", "Sociology", "Law", "Business Studies", "Commerce", "English Literature", "Accounting", "Bangla", "Politics", "Computer Science", "Finance", "Statistics", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishMediumALevels = ["A Level (AS)", "A Level (A2)"] as const;
export const guardianBanglaMediumClassOneToEightSubjects = ["All", "English", "Bangla", "BGS", "General Maths", "General Science", "ICT", "Religious Studies", "Hinduism Religious Studies", "Buddhism Religious Studies", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianBanglaMediumClassOneToEightLevels = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"] as const;
export const guardianEnglishVersionClassOneToEightSubjects = ["All", "English", "Bangla", "BGS", "General Maths", "General Science", "Social Science", "General Knowledge", "ICT", "History", "Geography", "Home Economics", "Agricultural Education", "Religious Studies", "Hinduism Religious Studies", "Buddhism Religious Studies", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishVersionClassOneToEightLevels = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"] as const;
export const guardianEnglishVersionClassNineToTenSubjects = ["Physics", "Chemistry", "Biology", "General Maths", "Higher Maths", "Social Science", "Bangla", "English", "General Science", "Computer Studies", "BGS", "Religious Studies", "Accounting", "Finance & Banking", "Management", "Business Entrepreneurship", "Economics", "Civics", "Home Economics", "Agricultural Education", "History", "Geography", "Psychology", "Physical Education", "Health & Sports", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianEnglishVersionClassNineToTenLevels = ["Class 9", "Class 10"] as const;
export const guardianBanglaMediumClassNineToTenSubjects = ["Physics", "Chemistry", "Biology", "General Maths", "Higher Maths", "Social Science", "Bangla", "English", "General Science", "ICT", "BGS", "Religious Studies", "Accounting", "Finance & Banking", "Management", "Business Entrepreneurship", "Economics", "Civics", "Home Economics", "Agricultural Education", "History", "Geography", "Psychology", "Physical Education", "Health & Sports", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianBanglaMediumClassNineToTenLevels = ["Class 9", "Class 10"] as const;
export const guardianBanglaMediumHscSubjects = ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "Accounting", "Finance", "Management", "Production Management & Marketing", "Statistics", "English", "Bangla", "Religious Studies", "Political Science", "History", "Islamic History and Culture", "Social Work", "Logic", "Agricultural Education", "Economics", "Sociology", "Geography", "Commercial Geography", "Psychology", "Civics", "All", "Others"] as const;
const guardianBanglaMediumHscLevels = ["HSC- 1st Year", "HSC- 2nd Year"] as const;
export const guardianEnglishVersionHscSubjects = ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "Accounting", "Finance", "Management", "Production Management & Marketing", "Statistics", "English", "Bangla", "Religious Studies", "Political Science", "History", "Islamic History and Culture", "Social Work", "Logic", "Agricultural Education", "Economics", "Sociology", "Geography", "Commercial Geography", "Psychology", "Civics", "All", "Others"] as const;
const guardianEnglishVersionHscLevels = ["HSC- 1st Year", "HSC- 2nd Year"] as const;
export const guardianMadrasaPlayToClassEightSubjects = ["All", "English", "Bangla", "BGS", "General Maths", "General Science", "ICT", "Quran Majid and Tajweed", "Akayeed and Fiqh", "Arabic", "Agriculture Education", "Home Economics", "Work and Life Oriented Education", "Hadith Sharif", "Physical Education", "Health & Sport", "Handwriting", "Drawing", "Arts", "Others"] as const;
const guardianMadrasaPlayToClassEightLevels = ["Play", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"] as const;
export const guardianMadrasaClassNineToTenSubjects = ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "Home Economics", "Civics", "Arabic", "Akayeed and Fiqh", "Quran Majid and Tajweed", "Peace and Conflict Studies", "Career Studies", "All", "Physical Education", "Health & Sports", "Islamic studies", "Bangladesh and Global Studies", "Agriculture Education", "General Maths", "English", "Bangla"] as const;
const guardianMadrasaClassNineToTenLevels = ["Class 9", "Class 10"] as const;
export const guardianMadrasaAlimSubjects = ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "Civics", "Farsi", "Urdu", "Economics", "English", "Quran Majid and Tajweed", "Hadith Sharif", "Al Fiqh", "Arabic", "Islamic History", "Balagat and Mantik", "Bangla"] as const;
const guardianMadrasaAlimLevels = ["Alim- 1st Year", "Alim- 2nd Year"] as const;
export const guardianSchoolAdmissionSubjects = ["All", "English", "Bangla", "BGS", "General Maths", "General Science", "General Knowledge", "ICT", "Others"] as const;
const guardianSchoolAdmissionLevels = ["School Admission Test"] as const;
export const guardianPublicUniversityAdmissionSubjects = ["Physics", "Chemistry", "Biology", "Higher Maths", "ICT", "General Knowledge", "Bangla", "English", "Management", "Business Principles", "Marketing", "Business Entrepreneurship", "Economics", "Civics", "Analytical Skills", "Finance & Banking", "Accounting", "All"] as const;
const guardianPublicUniversityAdmissionLevels = ["Public University Admission Test"] as const;
export const guardianPrivateUniversityAdmissionSubjects = ["Physics", "Chemistry", "Biology", "Maths", "English", "Bangla", "General Knowledge", "Accounting", "Management", "Analytical Skill"] as const;
const guardianPrivateUniversityAdmissionLevels = ["Private University Admission Test"] as const;
export const guardianEngineeringUniversityAdmissionSubjects = ["Physics", "Chemistry", "Higher Maths", "ICT", "English", "Bangla", "General Knowledge"] as const;
const guardianEngineeringUniversityAdmissionLevels = ["Engineering University Admission Test"] as const;
export const guardianMedicalCollegeAdmissionSubjects = ["Physics", "Chemistry", "Biology", "ICT", "English", "Bangla", "General Knowledge", "All"] as const;
const guardianMedicalCollegeAdmissionLevels = ["Medical College Admission Test"] as const;
export const guardianIbaAdmissionSubjects = ["Accounting", "Finance", "Management", "Production Management & Marketing", "Statistics", "English", "Bangla", "All"] as const;
const guardianIbaAdmissionLevels = ["IBA Admission"] as const;
export const guardianCurriculumCategories = [
  "Bangla Medium",
  "English Medium",
  "English Version",
  "Religious Studies",
  "Admission Test",
  "Arts",
  "Language Learning",
  "Test Preparation",
  "Professional Skill Development",
  "Special Skill Development",
  "Special Child Education",
  "University Help",
  "Madrasa Medium",
] as const;
const categories = guardianCurriculumCategories;
const fallbackGuardianLevels = ["Class 1–5", "Class 6–8", "Class 9–10", "SSC", "HSC", "University"] as const;
const banglaAndEnglishVersionLevels = [
  "Pre-Schooling",
  "Play",
  "Nursery",
  "KG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "HSC- 1st Year",
  "HSC- 2nd Year",
] as const;

export const guardianLevelsByCurriculum = {
  "Bangla Medium": banglaAndEnglishVersionLevels,
  "English Version": banglaAndEnglishVersionLevels,
  "English Medium": [
    "Pre-Schooling",
    "Nursery",
    "KG",
    "Play",
    "Standard 1",
    "Standard 2",
    "Standard 3",
    "Standard 4",
    "Standard 5",
    "Standard 6",
    "Standard 7",
    "Standard 8",
    "Standard 9",
    "O Level",
    "A Level (AS)",
    "A Level (A2)",
  ],
  "University Help": [
    "BA (English)",
    "BBA",
    "MBBS",
    "BS-Biochemistry",
    "BS-Biotechnology",
    "BS-Microbiology",
    "B.Pharm",
    "B.Sc-EEE",
    "B.Sc-CSE",
    "B.Sc-Civil Engineering",
    "B.Sc-Mathematics",
    "B.Sc-Mechanical Engineering",
    "BSS-Economics",
    "BSS-Anthropology",
    "BSS-Sociology",
    "LLB",
    "BFA-Sculpture",
    "BFA-Graphic Design",
    "B.Arch",
    "MBA",
    "MS-Biochemistry",
    "MS-Biotechnology",
    "MS-Microbiology",
    "M.Pharm",
    "M.Sc-EEE",
    "M.Sc-CSE",
    "M.Sc-Mathematics",
    "M.Sc-Mechanical Engineering",
    "MSS-Economics",
    "MSS-Sociology",
    "MSS-Anthropology",
    "LLM",
    "MFA-Sculpture",
    "MFA-Graphic Design",
    "Diploma-Civil Engineering",
    "Diploma-Computer Technology",
  ],
  "Madrasa Medium": [
    "Play",
    "Nursery",
    "KG",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Alim- 1st Year",
    "Alim- 2nd Year",
  ],
  "Religious Studies": [
    "Islamic Studies",
    "Hinduism Studies",
    "Buddhism Studies",
    "Christianity Studies",
  ],
  "Language Learning": [
    "Spoken English",
    "IELTS Preparation",
    "French",
    "German",
    "Japanese",
    "Korean",
    "Arabic",
  ],
  "Admission Test": [
    "School Admission Test",
    "Public University Admission Test",
    "Private University Admission Test",
    "Medical College Admission Test",
    "Engineering University Admission Test",
    "IBA Admission",
    "University Admission",
    "Medical Admission",
    "Engineering Admission",
    "IBA/MBA Admission",
  ],
  Arts: [
    "Drawing & Painting",
    "Handwriting",
    "Music",
    "Instrumental Music",
    "Dance",
    "Crafting",
    "Recitation",
  ],
  "Test Preparation": [
    "BCS",
    "Bank Job",
    "Government Job",
    "GRE",
    "GMAT",
    "SAT",
    "TOEFL",
  ],
  "Professional Skill Development": [
    "Artificial Intelligence",
    "Web Design",
    "Adobe Illustrator",
    "Adobe Photoshop",
    "Web Development",
    "Microsoft Office",
    "Fashion Design",
    "Fashion Drawing",
    "Sewing & Tailoring",
    "Digital Marketing",
    "Computer Programming",
    "Video Editing",
  ],
  "Special Skill Development": [
    "Mental Math/Abacus",
    "Coding for Kids",
    "Creative Writing",
    "Debate",
    "Photography",
    "Kung Fu",
    "Karate",
    "GYM",
    "Yoga",
    "Cooking",
  ],
  "Special Child Education": [
    "Basic Education",
    "Arts",
    "Religious Studies",
    "Special Skill Development",
  ],
} as const;

export function getGuardianLevelsForCurriculum(curriculum: string): readonly string[] {
  if (!curriculum) return [];
  return guardianLevelsByCurriculum[curriculum as keyof typeof guardianLevelsByCurriculum] ?? fallbackGuardianLevels;
}

export const guardianEnglishMediumCurriculumTypes = ["British", "Cambridge", "Ed-excel"] as const;

export function getGuardianCurriculumTypesForCategory(category: string): readonly string[] {
  return category === "English Medium" ? guardianEnglishMediumCurriculumTypes : [];
}

export function getGuardianCurriculumTypeForCategoryChange(currentCurriculumType: string, nextCategory: string) {
  return nextCategory === "English Medium" ? currentCurriculumType : "";
}

export function getGuardianSubjectsForLearningNeed(category: string, classCourse: string): readonly string[] {
  const usesBanglaMediumClassOneToEightSubjects =
    category === "Bangla Medium" &&
    guardianBanglaMediumClassOneToEightLevels.includes(classCourse as typeof guardianBanglaMediumClassOneToEightLevels[number]);
  const usesEnglishVersionClassOneToEightSubjects =
    category === "English Version" &&
    guardianEnglishVersionClassOneToEightLevels.includes(classCourse as typeof guardianEnglishVersionClassOneToEightLevels[number]);
  const usesEnglishVersionClassNineToTenSubjects =
    category === "English Version" &&
    guardianEnglishVersionClassNineToTenLevels.includes(classCourse as typeof guardianEnglishVersionClassNineToTenLevels[number]);
  const usesBanglaMediumClassNineToTenSubjects =
    category === "Bangla Medium" &&
    guardianBanglaMediumClassNineToTenLevels.includes(classCourse as typeof guardianBanglaMediumClassNineToTenLevels[number]);
  const usesBanglaMediumHscSubjects =
    category === "Bangla Medium" &&
    guardianBanglaMediumHscLevels.includes(classCourse as typeof guardianBanglaMediumHscLevels[number]);
  const usesEnglishVersionHscSubjects =
    category === "English Version" &&
    guardianEnglishVersionHscLevels.includes(classCourse as typeof guardianEnglishVersionHscLevels[number]);
  const usesMadrasaPlayToClassEightSubjects =
    category === "Madrasa Medium" &&
    guardianMadrasaPlayToClassEightLevels.includes(classCourse as typeof guardianMadrasaPlayToClassEightLevels[number]);
  const usesMadrasaClassNineToTenSubjects =
    category === "Madrasa Medium" &&
    guardianMadrasaClassNineToTenLevels.includes(classCourse as typeof guardianMadrasaClassNineToTenLevels[number]);
  const usesMadrasaAlimSubjects =
    category === "Madrasa Medium" &&
    guardianMadrasaAlimLevels.includes(classCourse as typeof guardianMadrasaAlimLevels[number]);
  const usesSchoolAdmissionSubjects =
    category === "Admission Test" &&
    guardianSchoolAdmissionLevels.includes(classCourse as typeof guardianSchoolAdmissionLevels[number]);
  const usesPublicUniversityAdmissionSubjects =
    category === "Admission Test" &&
    guardianPublicUniversityAdmissionLevels.includes(classCourse as typeof guardianPublicUniversityAdmissionLevels[number]);
  const usesPrivateUniversityAdmissionSubjects =
    category === "Admission Test" &&
    guardianPrivateUniversityAdmissionLevels.includes(classCourse as typeof guardianPrivateUniversityAdmissionLevels[number]);
  const usesEngineeringUniversityAdmissionSubjects =
    category === "Admission Test" &&
    guardianEngineeringUniversityAdmissionLevels.includes(classCourse as typeof guardianEngineeringUniversityAdmissionLevels[number]);
  const usesMedicalCollegeAdmissionSubjects =
    category === "Admission Test" &&
    guardianMedicalCollegeAdmissionLevels.includes(classCourse as typeof guardianMedicalCollegeAdmissionLevels[number]);
  const usesIbaAdmissionSubjects =
    category === "Admission Test" &&
    guardianIbaAdmissionLevels.includes(classCourse as typeof guardianIbaAdmissionLevels[number]);
  const usesEnglishMediumEarlyYearsSubjects =
    category === "English Medium" &&
    guardianEarlyYearsLevels.includes(classCourse as typeof guardianEarlyYearsLevels[number]);
  const usesEnglishMediumClassOneToFiveSubjects =
    category === "English Medium" &&
    guardianEnglishMediumClassOneToFiveLevels.includes(classCourse as typeof guardianEnglishMediumClassOneToFiveLevels[number]);
  const usesEnglishMediumClassSixToSevenSubjects =
    category === "English Medium" &&
    guardianEnglishMediumClassSixToSevenLevels.includes(classCourse as typeof guardianEnglishMediumClassSixToSevenLevels[number]);
  const usesEnglishMediumStandardEightToNineAndOLevelSubjects =
    category === "English Medium" &&
    guardianEnglishMediumStandardEightToNineAndOLevelLevels.includes(classCourse as typeof guardianEnglishMediumStandardEightToNineAndOLevelLevels[number]);
  const usesEnglishMediumALevelSubjects =
    category === "English Medium" &&
    guardianEnglishMediumALevels.includes(classCourse as typeof guardianEnglishMediumALevels[number]);
  const usesEarlyYearsSubjects =
    (category === "Bangla Medium" || category === "English Version") &&
    guardianEarlyYearsLevels.includes(classCourse as typeof guardianEarlyYearsLevels[number]);

  if (usesBanglaMediumClassOneToEightSubjects) return guardianBanglaMediumClassOneToEightSubjects;
  if (usesEnglishVersionClassOneToEightSubjects) return guardianEnglishVersionClassOneToEightSubjects;
  if (usesEnglishVersionClassNineToTenSubjects) return guardianEnglishVersionClassNineToTenSubjects;
  if (usesBanglaMediumClassNineToTenSubjects) return guardianBanglaMediumClassNineToTenSubjects;
  if (usesBanglaMediumHscSubjects) return guardianBanglaMediumHscSubjects;
  if (usesEnglishVersionHscSubjects) return guardianEnglishVersionHscSubjects;
  if (usesMadrasaPlayToClassEightSubjects) return guardianMadrasaPlayToClassEightSubjects;
  if (usesMadrasaClassNineToTenSubjects) return guardianMadrasaClassNineToTenSubjects;
  if (usesMadrasaAlimSubjects) return guardianMadrasaAlimSubjects;
  if (usesSchoolAdmissionSubjects) return guardianSchoolAdmissionSubjects;
  if (usesPublicUniversityAdmissionSubjects) return guardianPublicUniversityAdmissionSubjects;
  if (usesPrivateUniversityAdmissionSubjects) return guardianPrivateUniversityAdmissionSubjects;
  if (usesEngineeringUniversityAdmissionSubjects) return guardianEngineeringUniversityAdmissionSubjects;
  if (usesMedicalCollegeAdmissionSubjects) return guardianMedicalCollegeAdmissionSubjects;
  if (usesIbaAdmissionSubjects) return guardianIbaAdmissionSubjects;
  if (usesEnglishMediumEarlyYearsSubjects) return guardianEnglishMediumEarlyYearsSubjects;
  if (usesEnglishMediumClassOneToFiveSubjects) return guardianEnglishMediumClassOneToFiveSubjects;
  if (usesEnglishMediumClassSixToSevenSubjects) return guardianEnglishMediumClassSixToSevenSubjects;
  if (usesEnglishMediumStandardEightToNineAndOLevelSubjects) return guardianEnglishMediumStandardEightToNineAndOLevelSubjects;
  if (usesEnglishMediumALevelSubjects) return guardianEnglishMediumALevelSubjects;
  return usesEarlyYearsSubjects ? guardianEarlyYearsSubjects : guardianDefaultSubjects;
}

export function getGuardianSelectedSubjectsForLearningNeed(selectedSubjects: string[], category: string, classCourse: string) {
  const availableSubjects = new Set(getGuardianSubjectsForLearningNeed(category, classCourse));
  return selectedSubjects.filter((subject) => availableSubjects.has(subject));
}

type TuitionType = "home" | "online" | "both" | "group" | "package";
type BudgetKind = "range" | "discuss" | "";
type PreferredGender = "male" | "female" | "any" | "";
type StudentGender = "male" | "female" | "";

type RequestInput = {
  category: string;
  curriculumType: string;
  classCourse: string;
  selectedSubjects: string[];
  tuitionType: TuitionType;
  groupCapacity: string;
  packageDurationMonths: string;
  studentCount: string;
  studentGender: StudentGender;
  addressDetails: string;
  tuitionCityLocationId: string;
  tuitionLocationId: string;
  daysPerWeek: string;
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
  Record<"name" | "email" | "password" | "confirmPassword" | "cityLocationId" | "locationId" | "terms", string>
>;

const guardianAccountErrorFieldIds: Record<keyof GuardianAccountFieldErrors, string> = {
  name: "guardian-full-name",
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
  values: { name: string; email: string; password: string; confirmPassword: string; accountCityId: string; accountLocationId: string },
  termsAccepted: boolean,
): GuardianAccountFieldErrors {
  const errors: GuardianAccountFieldErrors = {};
  const name = values.name.trim();
  if (name.length < 2) errors.name = "Enter your full name.";
  else if (name.length > 160) errors.name = "Full name must be 160 characters or fewer.";
  const email = values.email.trim();
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

function focusFirstGuardianAccountError(errors: GuardianAccountFieldErrors) {
  const firstKey = (Object.keys(guardianAccountErrorFieldIds) as Array<keyof GuardianAccountFieldErrors>).find((key) => errors[key]);
  if (!firstKey) return;
  window.requestAnimationFrame(() => document.getElementById(guardianAccountErrorFieldIds[firstKey])?.focus());
}

export const guardianRequestSteps = requestSteps;
export const guardianAccountPolicyLinks = [
  { label: "Terms of Use", href: "/terms-conditions" },
  { label: "Privacy Policy", href: "/privacy-policy" },
] as const;

export function normalizeGuardianPublicHref(href: string) {
  if (href === "/terms") return guardianAccountPolicyLinks[0].href;
  if (href === "/privacy") return guardianAccountPolicyLinks[1].href;
  return href;
}

function Link({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return <WouterLink href={normalizeGuardianPublicHref(href)} className={className}>{children}</WouterLink>;
}

export function getGuardianRequestStepValidation(input: RequestInput, step: 1 | 2) {
  if (step >= 1) {
    if (!input.tuitionType) return "Choose a tuition type to continue.";
    if (input.tuitionType !== "online" && (!input.tuitionCityLocationId || !input.tuitionLocationId)) return "Choose a City and a location for Home, Group, or Package Tutoring.";
    if (!input.category) return "Choose a curriculum or category to continue.";
    if (input.category === "English Medium" && !getGuardianCurriculumTypesForCategory(input.category).includes(input.curriculumType)) return "Choose a Curriculum Type for English Medium to continue.";
    if (!input.classCourse) return "Choose a class or level to continue.";
    if (!input.selectedSubjects.length) return "Select at least one subject to continue.";
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
  const [stage, setStage] = useState<"phone" | "register" | "request">(() => embedded ? "request" : "phone");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [journeyError, setJourneyError] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountCityId, setAccountCityId] = useState("");
  const [accountLocationId, setAccountLocationId] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [accountFieldErrors, setAccountFieldErrors] = useState<GuardianAccountFieldErrors>({});
  const [category, setCategory] = useState("");
  const [curriculumType, setCurriculumType] = useState("");
  const [classCourse, setClassCourse] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
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
    setRequestId(null);
    setJourneyError("");
    setCategory("");
    setCurriculumType("");
    setClassCourse("");
    setSelectedSubjects([]);
    setTuitionType("home");
    setGroupCapacity("");
    setPackageDurationMonths("");
    setStudentCount(DEFAULT_STUDENT_COUNT);
    setStudentGender("");
    setAddressDetails("");
    setTuitionCityLocationId("");
    setTuitionLocationId("");
    setDaysPerWeek("");
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

  const intakeMutation = trpc.guardianIntake.capturePhone.useMutation({
    onSuccess: () => { setJourneyError(""); setStage("register"); },
    onError: (error) => { setJourneyError(error.message); toast.error(error.message); },
  });
  const registrationMutation = trpc.guardianAuth.register.useMutation({
    onSuccess: () => {
      setJourneyError("");
      setAccountFieldErrors({});
      void utils.auth.me.invalidate();
      toast.success("Guardian account created.");
      navigate("/guardian/dashboard/hire");
    },
    onError: (error) => {
      const data = error.data as { zodFieldErrors?: Record<string, string[]>; code?: string } | null | undefined;
      const mapped = mapGuardianRegistrationServerErrors(data?.zodFieldErrors);
      if (Object.keys(mapped).length) {
        setAccountFieldErrors((current) => ({ ...current, ...mapped }));
        setJourneyError("Please fix the highlighted field and try again.");
        focusFirstGuardianAccountError(mapped);
        return;
      }
      if (data?.code === "BAD_REQUEST" && error.message) {
        setAccountFieldErrors((current) => ({ ...current, cityLocationId: error.message }));
      }
      const message = guardianAuthErrorMessage(error);
      setJourneyError(message);
      toast.error(message);
    },
  });

  const draftOwnerId = authQuery.data?.role === "guardian" ? authQuery.data.id : null;
  const requestMutation = trpc.tutorRequests.create.useMutation({
    onSuccess: (result) => {
      if (draftOwnerId) window.sessionStorage.removeItem(guardianRequestDraftStorageKey(draftOwnerId));
      submissionStartedRef.current = false;
      setRequestId(result.id);
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
      if (draftOwnerId) window.sessionStorage.removeItem(guardianRequestDraftStorageKey(draftOwnerId));
      submissionStartedRef.current = false;
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
  const localPhone = phone.replace(/\D/g, "").slice(0, 11);
  const requestInput = useMemo<RequestInput>(() => ({ category, curriculumType, classCourse, selectedSubjects, tuitionType, groupCapacity, packageDurationMonths, studentCount, studentGender, addressDetails, tuitionCityLocationId, tuitionLocationId, daysPerWeek, preferredGender, salaryAmount, instituteName, heardAboutUs }), [addressDetails, salaryAmount, instituteName, heardAboutUs, category, classCourse, curriculumType, daysPerWeek, groupCapacity, packageDurationMonths, preferredGender, selectedSubjects, studentCount, studentGender, tuitionCityLocationId, tuitionLocationId, tuitionType]);

  useEffect(() => {
    if (embedded || isEditMode || routePath !== "/request-tutor") return;
    if (authQuery.data?.role === "guardian" && (stage === "phone" || stage === "register")) {
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
    setCategory(request.category ?? "");
    setCurriculumType(request.curriculumType ?? "");
    setClassCourse(request.classCourse ?? "");
    setSelectedSubjects(parseGuardianRequestSubjects(request.subjects));
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
    setPreferredGender(request.preferredGender === "male" || request.preferredGender === "female" || request.preferredGender === "any" ? request.preferredGender : "");
    // Grouped for editing, so reopening a saved request shows "5,000" rather
    // than a bare 5000 the Guardian would have to re-punctuate.
    setSalaryAmount(formatSalaryInput(request.budgetAmount));
    setNotes(request.notes ?? "");
    setLoadedEditRequestId(editRequestId);
  }, [authQuery.data?.role, authQuery.isLoading, editRequestId, guardianRequestsQuery.data, guardianRequestsQuery.isLoading, loadedEditRequestId, navigate]);

  useEffect(() => {
    if (isEditMode) return;
    if (stage !== "request" || !draftOwnerId || draftRestoredFor === draftOwnerId) return;
    const stored = window.sessionStorage.getItem(guardianRequestDraftStorageKey(draftOwnerId));
    const draft = stored ? parseGuardianRequestDraft(stored) : null;
    if (draft) {
      setStep(draft.step);
      setCategory(draft.request.category);
      setCurriculumType(draft.request.curriculumType);
      setClassCourse(draft.request.classCourse);
      setSelectedSubjects(draft.request.selectedSubjects);
      setTuitionType(draft.request.tuitionType);
      setGroupCapacity(draft.request.groupCapacity);
      setPackageDurationMonths(draft.request.packageDurationMonths);
      setStudentCount(draft.request.studentCount);
      setStudentGender(draft.request.studentGender);
      setAddressDetails(draft.request.addressDetails);
      setTuitionCityLocationId(draft.request.tuitionCityLocationId);
      setTuitionLocationId(draft.request.tuitionLocationId);
      setDaysPerWeek(draft.request.daysPerWeek);
      setPreferredGender(draft.request.preferredGender);
      setSalaryAmount(draft.request.salaryAmount);
      setInstituteName(draft.request.instituteName);
      setHeardAboutUs(draft.request.heardAboutUs);
      setNotes(draft.notes);
    }
    setDraftRestoredFor(draftOwnerId);
  }, [draftOwnerId, draftRestoredFor, isEditMode, stage]);

  useEffect(() => {
    if (isEditMode) return;
    if (stage !== "request" || !draftOwnerId || draftRestoredFor !== draftOwnerId || requestId) return;
    window.sessionStorage.setItem(guardianRequestDraftStorageKey(draftOwnerId), serializeGuardianRequestDraft({ version: 1, step, request: requestInput, notes }));
  }, [draftOwnerId, draftRestoredFor, isEditMode, notes, requestId, requestInput, stage, step]);

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
  const subjectLimit = resolvedLimits.data?.["request.subjects"] ?? defaultSiteLimits()["request.subjects"];

  const toggleSubject = (subject: string) => {
    clearJourneyError();
    setSelectedSubjects((current) => {
      if (current.includes(subject)) return current.filter((item) => item !== subject);
      // The cap used to exist only on the server, so the form invited people to
      // "choose every subject you need" and then refused the thirteenth with a
      // validation error. Say no here, with a reason, before the work is lost.
      if (current.length >= subjectLimit) {
        setJourneyError(`You can choose up to ${subjectLimit} subjects. Remove one to add another.`);
        return current;
      }
      return [...current, subject];
    });
  };
  const advance = () => {
    const error = getGuardianRequestStepValidation(requestInput, 1);
    if (error) { setJourneyError(error); return; }
    clearJourneyError();
    setStep(2);
  };
  const submitRequest = (event: FormEvent) => {
    event.preventDefault();
    // Step 2 carries the only submit control. Step 1 shares this form, so an
    // Enter key pressed in one of its fields must not send a request the
    // Guardian has not finished writing, and step 3 is already sent.
    if (step !== 2) return;
    if (!canStartGuardianRequestSubmission({ mutationPending: requestMutation.isPending || updatePendingMutation.isPending, submissionStarted: submissionStartedRef.current })) return;
    const error = getGuardianRequestStepValidation(requestInput, 2);
    if (error) {
      setJourneyError(error);
      setStep(error.toLowerCase().includes("curriculum") || error.includes("class") || error.includes("subject") ? 1 : 2);
      return;
    }
    submissionStartedRef.current = true;
    const common = {
      category,
      curriculumType,
      classCourse,
      subjects: selectedSubjects,
      daysPerWeek: Number(daysPerWeek),
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
  const register = () => {
    const errors = validateGuardianRegistration(
      { name, email, password, confirmPassword, accountCityId, accountLocationId },
      termsAccepted,
    );
    setAccountFieldErrors(errors);
    if (Object.keys(errors).length) {
      setJourneyError("");
      focusFirstGuardianAccountError(errors);
      return;
    }
    clearJourneyError();
    registrationMutation.mutate({ name: name.trim(), gender, email: email.trim(), password, confirmPassword, phone: `+880${localPhone.slice(1)}`, cityLocationId: accountCityId, locationId: accountLocationId, termsAccepted });
  };

  return <div className={presentation.rootClassName}>
    {presentation.showPublicChrome ? <SiteHeader variant="journey" journeyAudience="guardian" /> : null}
    <main className={embedded ? "py-0" : "px-4 py-8 sm:px-6"}><div className={embedded ? "max-w-none" : "mx-auto max-w-4xl"}>
      <section className={embedded ? "" : "rounded-[1.65rem] border border-j-border bg-white p-5 shadow-[0_20px_56px_rgba(27,84,122,0.13)] sm:p-6"}>
        {journeyError ? <p role="alert" className="mb-5 rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{journeyError}</p> : null}
        {stage === "phone" ? <PhoneStage phone={localPhone} pending={intakeMutation.isPending} onPhoneChange={(value) => { clearJourneyError(); setPhone(value); }} onContinue={() => {
          if (!LOCAL_PHONE.test(localPhone)) { setJourneyError("Enter a valid Bangladesh mobile number, for example 01712345678."); return; }
          clearJourneyError();
          intakeMutation.mutate({ phone: `+880${localPhone.slice(1)}` });
        }} /> : null}
        {stage === "register" ? <AccountStage name={name} email={email} phone={localPhone} gender={gender} password={password} confirmPassword={confirmPassword} showPassword={showPassword} cities={cities} accountCityId={accountCityId} accountLocations={accountLocations} accountLocationId={accountLocationId} accountCityLabel={accountCityLabel} termsAccepted={termsAccepted} fieldErrors={accountFieldErrors} pending={registrationMutation.isPending} onName={(value) => { clearAccountFieldError("name"); setName(value); }} onEmail={(value) => { clearAccountFieldError("email"); setEmail(value); }} onGender={setGender} onPassword={(value) => { clearAccountFieldError("password"); setPassword(value); }} onConfirmPassword={(value) => { clearAccountFieldError("confirmPassword"); setConfirmPassword(value); }} onTogglePassword={() => setShowPassword((current) => !current)} onCity={(value) => { clearAccountFieldError("cityLocationId", "locationId"); setAccountCityId(value); setAccountLocationId(""); }} onLocation={(value) => { clearAccountFieldError("locationId"); setAccountLocationId(value); }} onTerms={(value) => { clearAccountFieldError("terms"); setTermsAccepted(value); }} onBack={() => { clearJourneyError(); setAccountFieldErrors({}); setStage("phone"); }} onCreate={register} /> : null}
        {stage === "request" && isEditMode && (authQuery.isLoading || guardianRequestsQuery.isLoading || loadedEditRequestId !== editRequestId) ? <div className="mt-8 rounded-xl border border-j-border bg-j-surface-sunken p-6 text-center text-sm font-semibold text-j-ink-soft"><Loader2 className="mx-auto mb-3 animate-spin text-j-accent" size={22} />Loading your private Pending request securely…</div> : null}
        {stage === "request" && (!isEditMode || loadedEditRequestId === editRequestId) ? <RequestStage
          step={step}
          requestInput={requestInput}
          notes={notes}
          cities={cities}
          tuitionLocations={tuitionLocations}
          tuitionCityLabel={tuitionCityLabel}
          tuitionLocationLabel={tuitionLocationLabel}
          pending={requestMutation.isPending || updatePendingMutation.isPending || submissionStartedRef.current}
          onSetCategory={(value) => { clearJourneyError(); const nextClassCourse = getGuardianLevelsForCurriculum(value).includes(classCourse) ? classCourse : ""; setCategory(value); setCurriculumType((current) => getGuardianCurriculumTypeForCategoryChange(current, value)); setClassCourse(nextClassCourse); setSelectedSubjects((current) => getGuardianSelectedSubjectsForLearningNeed(current, value, nextClassCourse)); }}
          onSetCurriculumType={(value) => { clearJourneyError(); setCurriculumType(value); }}
          onSetClassCourse={(value) => { clearJourneyError(); setClassCourse(value); setSelectedSubjects((current) => getGuardianSelectedSubjectsForLearningNeed(current, category, value)); }}
          onSetStudentGender={(value) => { clearJourneyError(); setStudentGender(value); }}
          onSetAddressDetails={(value) => { clearJourneyError(); setAddressDetails(value); }}
          onToggleSubject={toggleSubject}
          subjectLimit={subjectLimit}
          onSetTuitionType={(value) => { clearJourneyError(); setTuitionType(value); if (value !== "group") setGroupCapacity(""); if (value !== "package") setPackageDurationMonths(""); if (value === "group" || value === "both") setStudentCount(DEFAULT_STUDENT_COUNT); }}
          onSetGroupCapacity={(value) => { clearJourneyError(); setGroupCapacity(value.replace(/\D/g, "")); }}
          onSetPackageDurationMonths={(value) => { clearJourneyError(); setPackageDurationMonths(value.replace(/\D/g, "")); }}
          onSetStudentCount={(value) => { clearJourneyError(); setStudentCount(value.replace(/\D/g, "")); }}
          onSetTuitionCity={(value) => { clearJourneyError(); setTuitionCityLocationId(value); setTuitionLocationId(""); }}
          onSetTuitionLocation={(value) => { clearJourneyError(); setTuitionLocationId(value); }}
          onSetDays={(value) => { clearJourneyError(); setDaysPerWeek(value); }}
          onSetPreferredGender={(value) => { clearJourneyError(); setPreferredGender(value); }}
          onSetSalaryAmount={(value) => { clearJourneyError(); setSalaryAmount(value); }}
          onSetInstituteName={(value) => { clearJourneyError(); setInstituteName(value); }}
          onSetHeardAboutUs={(value) => { clearJourneyError(); setHeardAboutUs(value); }}
          onSetNotes={(value) => { clearJourneyError(); setNotes(value); }}
          onBack={() => { clearJourneyError(); setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3); }}
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

function PhoneStage({ phone, onPhoneChange, pending, onContinue }: { phone: string; onPhoneChange: (value: string) => void; pending: boolean; onContinue: () => void }) {
  const valid = LOCAL_PHONE.test(phone);
  return <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
    <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-j-ink sm:text-3xl"><SiteText slotId="request-tutor.phone.heading" /></h1>
    <label className="mt-6 block max-w-md" htmlFor="guardian-phone">
      <span className={fieldLabel}>Bangladesh mobile number <span className="text-[#d74545]">*</span></span>
      <span className={`mt-2 flex items-stretch overflow-hidden rounded-xl border bg-j-surface-sunken transition focus-within:border-j-accent focus-within:bg-white focus-within:ring-4 focus-within:ring-j-accent/12 ${valid ? "border-j-ok" : "border-j-field-border"}`}>
        <span className="flex items-center gap-1.5 border-r border-j-border px-3.5 font-semibold text-j-ink-soft"><Phone size={14} aria-hidden="true" />+880</span>
        <input id="guardian-phone" className="min-w-0 flex-1 bg-transparent px-3.5 py-3.5 text-base tracking-[0.02em] outline-none placeholder:text-[#9aabbb]" value={phone} onChange={(event) => onPhoneChange(event.target.value)} placeholder="01712345678" inputMode="numeric" autoComplete="tel" />
        {valid ? <span className="flex items-center pr-3.5 text-j-ok" aria-hidden="true"><Check size={18} /></span> : null}
      </span>
      {valid ? <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-j-ok"><span className="h-1.5 w-1.5 rounded-full bg-j-ok" aria-hidden="true" />Valid mobile number</span> : null}
    </label>
    <div className="mt-6 flex max-w-md flex-col gap-3">
      <button type="button" className={`${primaryButton} w-full`} disabled={pending} onClick={onContinue}>{pending && <Loader2 className="animate-spin" size={18} />} Continue securely <ArrowRight size={18} /></button>
      <p className="text-center text-sm text-[#59748b]">Already registered? <Link href="/auth?role=guardian" className="font-extrabold text-[#147fc0] underline underline-offset-2">Sign in with email or mobile</Link></p>
    </div>
  </div>;
}

export type GuardianAccountStageProps = {
  name: string; email: string; phone: string; gender: "male" | "female"; password: string; confirmPassword: string; showPassword: boolean;
  cities: Array<{ id: string; label: string }>; accountCityId: string; accountLocations: Array<{ id: string; label: string }>;
  accountLocationId: string; accountCityLabel: string; termsAccepted: boolean; pending: boolean;
  fieldErrors?: GuardianAccountFieldErrors;
  onName: (value: string) => void; onEmail: (value: string) => void; onGender: (value: "male" | "female") => void;
  onPassword: (value: string) => void; onConfirmPassword: (value: string) => void; onTogglePassword: () => void;
  onCity: (value: string) => void; onLocation: (value: string) => void; onTerms: (value: boolean) => void; onBack: () => void; onCreate: () => void;
};

export function getGuardianPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "Getting started", hint: "Use at least 8 characters.", color: "bg-[#b9cbd8]" };
  const score = [password.length >= 8, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  if (score <= 1) return { score, label: "Weak", hint: "Add mixed case, a number, and a symbol.", color: "bg-[#dc5b5b]" };
  if (score === 2) return { score, label: "Fair", hint: "Add one more character type.", color: "bg-[#df9a1d]" };
  if (score === 3) return { score, label: "Strong", hint: "Longer is even better.", color: "bg-[#188f73]" };
  return { score, label: "Excellent", hint: "", color: "bg-[#167ddd]" };
}

function GuardianPasswordStrength({ password }: { password: string }) {
  const strength = getGuardianPasswordStrength(password);
  return <div className="mt-2.5">
    <div role="progressbar" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.score} className="flex gap-1.5">{[0, 1, 2, 3].map((segment) => <span key={segment} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none ${segment < strength.score ? strength.color : "bg-[#dceaf2]"}`} />)}</div>
    <p id="guardian-password-strength" role="status" aria-live="polite" aria-label={`Password strength: ${strength.label}.${strength.hint ? ` ${strength.hint}` : ""}`} className="mt-2 text-xs font-medium leading-5 text-[#6c8295]"><span className="font-bold text-j-ink-strong">{strength.label}</span>{strength.hint ? ` — ${strength.hint}` : ""}</p>
  </div>;
}

function getGuardianPasswordMatch(password: string, confirmPassword: string) {
  if (!confirmPassword) return null;
  if (password === confirmPassword) return { matches: true, label: "Passwords match", hint: "Your password confirmation is ready.", color: "text-[#188f73]", dotColor: "bg-[#188f73]" };
  return { matches: false, label: "Passwords do not match yet", hint: "Check both password entries and try again.", color: "text-[#b34a4a]", dotColor: "bg-[#dc5b5b]" };
}

function GuardianPasswordMatch({ password, confirmPassword }: { password: string; confirmPassword: string }) {
  const match = getGuardianPasswordMatch(password, confirmPassword);
  if (!match) return null;
  return <p id="guardian-password-match" role="status" aria-live="polite" className={`mt-2 flex items-center gap-2 text-xs font-semibold leading-5 ${match.matches ? "text-j-ok" : match.color}`}><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${match.matches ? "bg-j-ok" : match.dotColor}`} />{match.label}</p>;
}

function GuardianPasswordManagerHint() {
  return <p role="note" aria-label="Password manager guidance" className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium leading-5 text-[#8496a6]"><KeyRound className="shrink-0 text-[#a9bccc]" size={13} aria-hidden="true" />A browser or device password manager can generate and save a strong one.</p>;
}

export function getGuardianLocationSelectionState(cityId: string, locationId: string, cityLabel: string, locationLabel: string) {
  if (!cityId || !locationId || !cityLabel || !locationLabel) return null;
  return { complete: true as const, cityLabel, locationLabel };
}

function GenderSegment({ value, current, onSelect }: { value: "female" | "male"; current: "female" | "male"; onSelect: (value: "female" | "male") => void }) {
  const label = value === "female" ? "Female" : "Male";
  return <label className={`cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-j-accent/50 ${current === value ? "bg-white text-j-accent shadow-[0_2px_6px_rgba(30,74,110,.12)]" : "text-[#6a8398] hover:text-j-ink-soft"}`}>
    <input type="radio" name="guardian-gender" className="sr-only" checked={current === value} onChange={() => onSelect(value)} />{label}
  </label>;
}

function FieldError({ id, message, children }: { id: string; message?: string; children: ReactNode }) {
  return <div>{children}{message ? <p id={id} role="alert" className="mt-1.5 text-xs font-semibold text-[#bd3535]">{message}</p> : null}</div>;
}

export function AccountStage(props: GuardianAccountStageProps) {
  const errors = props.fieldErrors ?? {};
  const passwordMatch = getGuardianPasswordMatch(props.password, props.confirmPassword);
  const star = <span className="text-[#d74545]">*</span>;
  const confirmBorder = errors.confirmPassword
    ? "border-[#dc5b5b] focus:border-[#dc5b5b]"
    : passwordMatch?.matches
      ? "border-j-ok focus:border-j-ok"
      : passwordMatch
        ? "border-[#dc5b5b] focus:border-[#dc5b5b]"
        : "";
  const displayPhone = props.phone.replace(/\D/g, "").replace(/^0/, "");
  return <section className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300" aria-label="Guardian account details">
    <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-j-ink sm:text-3xl"><SiteText slotId="request-tutor.account.heading" /></h1>

    <div className="mt-6 grid gap-x-7 gap-y-4 md:grid-cols-2">
      <FieldError id="guardian-full-name-error" message={errors.name}>
        <label className="block" htmlFor="guardian-full-name"><span className={fieldLabel}>Full name {star}</span><input id="guardian-full-name" maxLength={160} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "guardian-full-name-error" : undefined} className={`${filledField} mt-2`} value={props.name} onChange={(event) => props.onName(event.target.value)} autoComplete="name" placeholder="Your full name" /></label>
      </FieldError>

      <fieldset>
        <legend className={fieldLabel}>Gender {star}</legend>
        <div className="mt-2 inline-flex rounded-xl bg-[#eef3f8] p-1">
          <GenderSegment value="female" current={props.gender} onSelect={props.onGender} />
          <GenderSegment value="male" current={props.gender} onSelect={props.onGender} />
        </div>
      </fieldset>

      <label className="block" htmlFor="guardian-phone">
        <span className={fieldLabel}>Phone number {star}</span>
        <span className="mt-2 flex items-stretch overflow-hidden rounded-xl border border-j-field-border bg-[#eef3f8]">
          <span className="flex items-center border-r border-j-border px-3.5 text-sm font-bold text-j-ink-soft">+880</span>
          <input id="guardian-phone" readOnly aria-readonly="true" tabIndex={-1} value={displayPhone} className="min-w-0 flex-1 cursor-not-allowed bg-transparent px-3.5 py-3 text-sm text-j-ink-soft outline-none" />
        </span>
        <span className="mt-1.5 block text-xs font-medium text-[#8496a6]">Taken from the previous step. Use “Back to phone” to change it.</span>
      </label>

      <FieldError id="guardian-email-error" message={errors.email}>
        <label className="block" htmlFor="guardian-email"><span className={fieldLabel}>Email {star}</span><input id="guardian-email" type="email" maxLength={320} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "guardian-email-error" : undefined} className={`${filledField} mt-2`} value={props.email} onChange={(event) => props.onEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" /></label>
      </FieldError>

      <FieldError id="guardian-password-error" message={errors.password}>
        <label className="block" htmlFor="guardian-password">
          <span className={fieldLabel}>Password {star}</span>
          <span className="relative mt-2 block">
            <input id="guardian-password" minLength={8} maxLength={128} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "guardian-password-error" : "guardian-password-strength"} className={`${filledField} pr-24`} type={props.showPassword ? "text" : "password"} value={props.password} onChange={(event) => props.onPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
            <button type="button" className="absolute inset-y-0 right-0 inline-flex items-center gap-1 rounded-lg px-3 text-xs font-bold text-j-accent focus:outline-none focus:ring-2 focus:ring-j-accent/30" aria-label={props.showPassword ? "Hide password" : "Show password"} onClick={props.onTogglePassword}>{props.showPassword ? <EyeOff size={14} /> : <Eye size={14} />}{props.showPassword ? "Hide" : "Show"}</button>
          </span>
          <GuardianPasswordStrength password={props.password} />
          <GuardianPasswordManagerHint />
        </label>
      </FieldError>

      <FieldError id="guardian-confirm-password-error" message={errors.confirmPassword}>
        <label className="block" htmlFor="guardian-confirm-password"><span className={fieldLabel}>Confirm password {star}</span><input id="guardian-confirm-password" maxLength={128} aria-describedby={errors.confirmPassword ? "guardian-confirm-password-error" : passwordMatch ? "guardian-password-match" : undefined} aria-invalid={errors.confirmPassword ? true : passwordMatch ? !passwordMatch.matches : undefined} className={`${filledField} mt-2 ${confirmBorder}`} type={props.showPassword ? "text" : "password"} value={props.confirmPassword} onChange={(event) => props.onConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Re-enter your password" /><GuardianPasswordMatch password={props.password} confirmPassword={props.confirmPassword} /></label>
      </FieldError>

      <FieldError id="guardian-account-city-error" message={errors.cityLocationId}>
        <SearchableLocationSelect triggerId="guardian-account-city" label="City" value={props.accountCityId} options={props.cities} placeholder="Search a City" searchPlaceholder="Search City" emptyMessage="No City matches your search." required onChange={props.onCity} />
      </FieldError>
      <FieldError id="guardian-account-location-error" message={errors.locationId}>
        <SearchableLocationSelect triggerId="guardian-account-location" label="Location" value={props.accountLocationId} options={props.accountLocations} placeholder="Choose a City first" searchPlaceholder="Search location or Sub-area" emptyMessage="No location matches your search." disabled={!props.accountCityId} required onChange={props.onLocation} />
      </FieldError>
    </div>

    <FieldError id="guardian-terms-error" message={errors.terms}>
      <label className="mt-5 flex items-start gap-2.5 text-sm leading-6 text-[#526f87]" htmlFor="guardian-terms"><input id="guardian-terms" type="checkbox" className="mt-1 h-4 w-4 rounded border-[#9dbbd1] text-j-accent" checked={props.termsAccepted} onChange={(event) => props.onTerms(event.target.checked)} /><span>I agree to the <Link className="font-extrabold text-j-accent underline underline-offset-2" href="/terms">Terms of Use</Link> and <Link className="font-extrabold text-j-accent underline underline-offset-2" href="/privacy">Privacy Policy</Link>.</span></label>
    </FieldError>

    <div className="mt-6 flex flex-col-reverse gap-4 border-t border-[#e5edf3] pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <button type="button" className={ghostButton} onClick={props.onBack}><ArrowLeft size={17} /> Back to phone</button>
        <p className="text-sm text-[#59748b]">Already registered? <Link href="/auth?role=guardian" className="font-extrabold text-[#147fc0] underline underline-offset-2">Sign in with email or mobile</Link></p>
      </div>
      <button type="button" className={`${primaryButton} shrink-0`} disabled={props.pending} onClick={props.onCreate}>{props.pending && <Loader2 className="animate-spin" size={18} />} Create Guardian account <ArrowRight size={18} /></button>
    </div>
  </section>;
}

type RequestStageProps = {
  step: 1 | 2 | 3; requestInput: RequestInput; notes: string;
  cities: Array<{ id: string; label: string }>; tuitionLocations: Array<{ id: string; label: string }>;
  tuitionCityLabel: string; tuitionLocationLabel: string; pending: boolean;
  onSetCategory: (value: string) => void; onSetCurriculumType: (value: string) => void; onSetClassCourse: (value: string) => void; onSetStudentGender: (value: StudentGender) => void; onSetAddressDetails: (value: string) => void; onToggleSubject: (value: string) => void; subjectLimit: number;
  onSetTuitionType: (value: TuitionType) => void; onSetGroupCapacity: (value: string) => void; onSetPackageDurationMonths: (value: string) => void; onSetStudentCount: (value: string) => void; onSetTuitionCity: (value: string) => void; onSetTuitionLocation: (value: string) => void;
  onSetDays: (value: string) => void; onSetPreferredGender: (value: PreferredGender) => void; onSetSalaryAmount: (value: string) => void; onSetInstituteName: (value: string) => void; onSetHeardAboutUs: (value: RequestSource) => void; onSetNotes: (value: string) => void;
  onBack: () => void; onAdvance: () => void; onSubmit: (event: FormEvent) => void;
  /** Step 3 reads the request back once it is sent. */
  isEditMode?: boolean; requestId?: number | null; onPostAnother?: () => void;
};

export function RequestStage(props: RequestStageProps) {
  const { requestInput: input } = props;
  const availableLevels = getGuardianLevelsForCurriculum(input.category);
  const availableSubjects = getGuardianSubjectsForLearningNeed(input.category, input.classCourse);
  const locationSelection = getGuardianLocationSelectionState(input.tuitionCityLocationId, input.tuitionLocationId, props.tuitionCityLabel, props.tuitionLocationLabel);
  // Step 2 sends the request, so its button says so rather than "Continue" -
  // the Guardian has to know the press is the one that posts the job.
  const submitLabel = props.isEditMode
    ? (props.pending ? "Saving changes" : "Save changes")
    : (props.pending ? "Sending request" : "Send request");
  return <form className="mt-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300" onSubmit={props.onSubmit}>
    <ol className="mt-7 grid gap-2 sm:grid-cols-3" aria-label="Tutor request details progress">{requestSteps.map((label, index) => {
      const isActive = props.step === index + 1;
      const isComplete = index + 1 < props.step;
      return <li key={label} aria-current={isActive ? "step" : undefined} className={`flex min-h-14 items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-xs font-extrabold transition sm:justify-center ${isActive ? "border-j-accent/40 bg-j-accent-wash text-[#126ea9] shadow-[0_5px_16px_rgba(22,125,221,.08)]" : isComplete ? "border-j-ok/35 bg-j-ok-wash text-j-ok" : "border-[#e0eaf0] bg-[#f6f9fb] text-[#7890a1]"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-2xs ${isActive ? "bg-j-accent text-white" : isComplete ? "bg-j-ok text-white" : "bg-white text-[#7890a1]"}`}>{isComplete ? <Check size={13} aria-hidden="true" /> : index + 1}</span><span>{label}</span></li>;
    })}</ol>
    {props.step === 1 ? <div className="mt-6 space-y-6">
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2"><SelectField label="Tuition type" icon={<TuitionTypeIcon type={input.tuitionType} />} value={input.tuitionType} onChange={(value) => props.onSetTuitionType(value as TuitionType)} options={["home", "online", "group", "package"]} placeholder="Choose a tuition type" formatOption={(value) => formatTuitionType(value as TuitionType)} /></div>
      {input.tuitionType !== "online" ? <><div className="grid gap-x-6 gap-y-4 sm:grid-cols-2"><SearchableLocationSelect label="Tuition City" value={input.tuitionCityLocationId} options={props.cities} placeholder="Search a City" searchPlaceholder="Search City" emptyMessage="No City matches your search." required onChange={props.onSetTuitionCity} /><SearchableLocationSelect label="Location" value={input.tuitionLocationId} options={props.tuitionLocations} placeholder="Choose a City first" searchPlaceholder="Search location or Sub-area" emptyMessage="No location matches your search." disabled={!input.tuitionCityLocationId} required onChange={props.onSetTuitionLocation} /></div></> : null}
      <fieldset><legend className="sr-only">Learning details</legend><div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2"><SelectField label="Curriculum / category" icon={<RecordIcon name="category" size={17} />} value={input.category} onChange={props.onSetCategory} options={categories} placeholder="Choose a category" />{input.category === "English Medium" ? <SelectField label="Curriculum Type" icon={<RecordIcon name="curriculumType" size={17} />} value={input.curriculumType} onChange={props.onSetCurriculumType} options={getGuardianCurriculumTypesForCategory(input.category)} placeholder="Choose a Curriculum Type" /> : null}<SelectField label="Class / level" icon={<RecordIcon name="classLevel" size={17} />} value={input.classCourse} onChange={props.onSetClassCourse} options={availableLevels} placeholder={input.category ? "Choose a level" : "Choose a curriculum first"} /><SelectField label="Student gender" icon={input.studentGender ? <TutorPreferenceIcon preference={input.studentGender} className="text-j-accent" /> : <RecordIcon name="studentGender" size={17} />} optional value={input.studentGender} onChange={(value) => props.onSetStudentGender(value as StudentGender)} options={["female", "male"]} placeholder="No selection" formatOption={formatStudentGender} /></div><label className="mt-4 block text-sm font-extrabold text-j-ink-soft" htmlFor="address-details"><span className="inline-flex items-center gap-1.5"><RecordIcon name="location" size={15} className="text-j-accent" />Address Details</span> <span className="font-normal text-[#71889b]">(optional)</span><textarea id="address-details" className={`${filledArea} mt-2 min-h-24`} value={input.addressDetails} onChange={(event) => props.onSetAddressDetails(event.target.value)} maxLength={160} /></label></fieldset><fieldset aria-label="Subject selection" className="border-t border-j-border pt-6"><legend className="text-sm font-extrabold text-j-ink-strong"><span className="inline-flex items-center gap-1.5"><RecordIcon name="subjects" size={15} className="text-j-accent" />Subject selection</span> <span className="text-[#d74545]">*</span></legend><div className="mt-1 flex flex-wrap items-start justify-end gap-3"><span role="status" aria-live="polite" aria-label={`${input.selectedSubjects.length} of ${props.subjectLimit} subjects selected`} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${input.selectedSubjects.length ? "bg-j-accent-wash text-[#126ea9]" : "bg-[#f6f9fb] text-[#71889b]"}`}>{input.selectedSubjects.length} of {props.subjectLimit} selected</span></div><div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{availableSubjects.map((subject) => <ChoiceButton key={subject} selected={input.selectedSubjects.includes(subject)} onClick={() => props.onToggleSubject(subject)}>{subject}</ChoiceButton>)}</div></fieldset></div> : null}
    {props.step === 2 ? <div className="mt-7 space-y-6">
      {input.tuitionType === "home" || input.tuitionType === "online" || input.tuitionType === "package" ? <label className="block max-w-sm text-sm font-extrabold text-j-ink-soft" htmlFor="student-count"><span className="inline-flex items-center gap-1.5"><RecordIcon name="students" size={15} className="text-j-accent" />Number of students</span> <span className="text-[#d74545]">*</span><input id="student-count" className={`${filledField} mt-2`}type="number" min={1} max={100} step={1} inputMode="numeric" value={input.studentCount} onChange={(event) => props.onSetStudentCount(event.target.value)} /></label> : null}
      {input.tuitionType === "group" ? <label className="block max-w-sm text-sm font-extrabold text-j-ink-soft" htmlFor="group-capacity"><span className="inline-flex items-center gap-1.5"><RecordIcon name="students" size={15} className="text-j-accent" />Maximum students</span> <span className="text-[#d74545]">*</span><input id="group-capacity" className={`${filledField} mt-2`}type="number" min={2} max={100} step={1} inputMode="numeric" value={input.groupCapacity} onChange={(event) => props.onSetGroupCapacity(event.target.value)} /></label> : null}
      {input.tuitionType === "package" ? <label className="block max-w-sm text-sm font-extrabold text-j-ink-soft" htmlFor="package-duration-months"><span className="inline-flex items-center gap-1.5"><RecordIcon name="packageDuration" size={15} className="text-j-accent" />Package duration (months)</span> <span className="text-[#d74545]">*</span><input id="package-duration-months" className={`${filledField} mt-2`}type="number" min={1} max={24} step={1} inputMode="numeric" value={input.packageDurationMonths} onChange={(event) => props.onSetPackageDurationMonths(event.target.value)} /></label> : null}
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2"><SelectField label="Days per week" icon={<RecordIcon name="daysPerWeek" size={17} />} value={input.daysPerWeek} onChange={props.onSetDays} options={["1", "2", "3", "4", "5", "6", "7"]} placeholder="Choose days" formatOption={(value) => `${value} day${value === "1" ? "" : "s"}`} /><InputField label="Institute Name" optional value={input.instituteName} onChange={props.onSetInstituteName} maxLength={INSTITUTE_NAME_MAX_LENGTH} placeholder={INSTITUTE_NAME_PLACEHOLDER} icon={<School size={17} />} /><SelectField label="Where Did You Hear About Us" value={input.heardAboutUs} onChange={(value) => props.onSetHeardAboutUs(value as RequestSource)} options={REQUEST_SOURCE_VALUES} placeholder="Choose an answer" formatOption={formatRequestSource} icon={input.heardAboutUs ? REQUEST_SOURCE_ICONS[input.heardAboutUs] : <Megaphone size={17} />} /><SelectField label="Preferred Tutor gender" icon={<TutorPreferenceIcon preference={input.preferredGender || "any"} className="text-j-accent" />} value={input.preferredGender} onChange={(value) => props.onSetPreferredGender(value as PreferredGender)} options={["any", "female", "male"]} placeholder="Choose a preference" formatOption={formatPreferredGender} /></div>
      {/* One amount, not a range and not "discuss": a Tutor reading the Job
          Board should learn what the tuition pays. Typed however the Guardian
          writes numbers - 5000, 5,000, even "5,000 Taka" - and shown back as
          "5,000 Taka" wherever it appears. */}
      {/* The currency word lives inside the box now, so the line that used to
          echo "5,000 Taka" underneath is gone - it read as a result rather
          than as the unit it was. */}
      <fieldset><legend className="text-sm font-extrabold text-j-ink-soft"><span className="inline-flex items-center gap-1.5"><RecordIcon name="salary" size={15} className="text-j-accent" />Monthly salary</span> <span className="text-[#d74545]">*</span></legend><div className="mt-3 max-w-xs"><MoneyAmountField ariaLabel="Amount (Taka)" value={input.salaryAmount} onChange={props.onSetSalaryAmount} placeholder={SALARY_INPUT_PLACEHOLDER} inputClassName={filledField} formatOnBlur /></div></fieldset>
      <label className="block text-sm font-extrabold text-j-ink-soft"><span className="inline-flex items-center gap-1.5"><RecordIcon name="notes" size={15} className="text-j-accent" />Additional notes</span> <span className="font-normal text-[#71889b]">(optional)</span><textarea className={`${filledArea} mt-2 min-h-28`} value={props.notes} onChange={(event) => props.onSetNotes(event.target.value)} maxLength={2000} /></label>
    </div> : null}
    {/* Step 3 is the request read back after it is sent, so it carries its own
        two actions and none of the journey's - there is nothing left to go
        Back to and nothing left to send. */}
    {props.step === 3 ? <SuccessState requestId={props.requestId ?? null} input={input} notes={props.notes} tuitionCityLabel={props.tuitionCityLabel} tuitionLocationLabel={props.tuitionLocationLabel} onPostAnother={props.onPostAnother ?? (() => undefined)} /> : null}
    {props.step === 3 ? null : <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-[#e6eef4] pt-6 sm:flex-row sm:items-center">{props.step > 1 ? <button type="button" className={ghostButton} onClick={props.onBack}><ArrowLeft size={17} /> Back</button> : <span className="hidden sm:block" />}{props.step === 1 ? <button type="button" className={`${primaryButton} w-full sm:w-auto`} aria-label="Continue to tuition preferences" onClick={props.onAdvance}>Continue <ArrowRight size={17} /></button> : <button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={props.pending} aria-label={submitLabel}>{props.pending && <Loader2 className="animate-spin" size={18} />}{submitLabel} <ArrowRight size={17} /></button>}</div>}
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
        {requestId === null ? null : <p className="mt-1 text-sm text-[#5e7a90]">Job ID <strong className="text-j-ink tabular-nums">{jobIdForRequest(requestId)}</strong></p>}
      </div>
      {/* A card rather than a filled button: `View my request` at the foot is
          the primary blue, and two competing solids would leave the Guardian
          guessing which one finishes the job. */}
      <PostAnotherRequestButton onClick={onPostAnother} variant="card" />
    </div>

    <div className="mt-6"><GuardianRequestSummaryView groups={groups} /></div>

    <div className="mt-7 flex justify-center border-t border-[#e6eef4] pt-6">
      <Link href="/guardian/dashboard/posted-jobs" className={primaryButton}>View my request <ArrowRight size={18} /></Link>
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

function InputField({ label, labelHidden, value, onChange, type = "text", autoComplete, optional, maxLength, inputMode, placeholder, icon }: { label: string; labelHidden?: boolean; icon?: ReactNode; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; optional?: boolean; maxLength?: number; placeholder?: string; inputMode?: "numeric" | "text" | "email" | "tel" | "url" | "search" | "decimal" | "none" }) { return <label className="block text-sm font-extrabold text-j-ink-soft"><span className={labelHidden ? "sr-only" : undefined}>{label} {optional ? <span className="font-normal text-[#71889b]">(optional)</span> : <span className="text-[#d74545]">*</span>}</span><span className={`relative block ${labelHidden ? "" : "mt-2"}`}>{icon ? <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-j-accent">{icon}</span> : null}<input className={`${filledField} ${icon ? "pl-10" : ""}`}type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} maxLength={maxLength} inputMode={inputMode} /></span></label>; }
function SelectField({ label, value, onChange, options, placeholder, formatOption, optional, icon }: { label: string; icon?: ReactNode; value: string; onChange: (value: string) => void; options: readonly string[]; placeholder: string; formatOption?: (value: string) => string; optional?: boolean }) { return <label className="text-sm font-extrabold text-j-ink-soft">{label} {optional ? <span className="font-normal text-[#71889b]">(optional)</span> : <span className="text-[#d74545]">*</span>}<span className="relative mt-2 block">{icon ? <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-j-accent">{icon}</span> : null}<select className={`${filledField} ${icon ? "pl-10" : ""}`}value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{formatOption?.(option) ?? option}</option>)}</select></span></label>; }
function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" aria-pressed={selected} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2 motion-reduce:transition-none ${selected ? "border-j-accent bg-j-accent-wash text-[#126ea9] ring-1 ring-inset ring-j-accent shadow-[0_4px_12px_rgba(22,125,221,.1)]" : "border-[#dbeaf2] bg-white text-[#58758a] hover:-translate-y-px hover:border-[#9bcdf4] hover:bg-j-surface-sunken"}`} onClick={onClick}>{selected ? <Check size={15} aria-hidden="true" /> : null}<span>{children}</span></button>; }
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
