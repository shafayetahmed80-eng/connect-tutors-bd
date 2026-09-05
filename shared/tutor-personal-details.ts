/**
 * Fixed option lists for the Tutor Profile's personal-detail fields.
 *
 * Kept in code, not a catalog: these lists change about never, and both the
 * form control and the server validation have to agree on the same set.
 */

export const tutorNationalityOptions = ["Bangladeshi", "Others"] as const;
export type TutorNationality = (typeof tutorNationalityOptions)[number];
export const DEFAULT_TUTOR_NATIONALITY: TutorNationality = "Bangladeshi";

export const tutorReligionOptions = ["Islam", "Hinduism", "Christianity", "Buddhism", "Others"] as const;
export type TutorReligion = (typeof tutorReligionOptions)[number];
