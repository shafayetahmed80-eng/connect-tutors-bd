import source from "./data/bangladesh-universities.json";

export type SuppliedUniversity = {
  name: string;
  location: string;
  status: "Active" | "Non-functional" | "Programs not started";
};

type SuppliedUniversityDirectory = {
  public_universities: SuppliedUniversity[];
  private_universities: SuppliedUniversity[];
  government_medical_colleges: SuppliedUniversity[];
  army_medical_colleges: SuppliedUniversity[];
  private_medical_colleges: SuppliedUniversity[];
  dental_colleges: SuppliedUniversity[];
  affiliated_colleges: SuppliedUniversity[];
  other: SuppliedUniversity[];
  /** One flat, global Honours/Bachelor/Undergraduate field-of-study vocabulary. */
  departments: string[];
};

/**
 * User-supplied, website-ready Bangladesh institute directory. It stays in a
 * standalone JSON file so the Institute list and the Department/Subject
 * vocabulary can be refreshed without editing code.
 *
 * There is no Faculty layer: the "Institute" selector spans universities,
 * medical/dental colleges, the former Dhaka-University "seven colleges", and an
 * "Others" catch-all, and "Department / Subject" is one global list applied to
 * every institute. "Others" is spread first in each list so it always sorts to
 * the top of the search results.
 */
export const bangladeshUniversityDirectory = source as SuppliedUniversityDirectory;

export const suppliedBangladeshUniversities = [
  ...bangladeshUniversityDirectory.other,
  ...bangladeshUniversityDirectory.public_universities,
  ...bangladeshUniversityDirectory.private_universities,
  ...bangladeshUniversityDirectory.government_medical_colleges,
  ...bangladeshUniversityDirectory.army_medical_colleges,
  ...bangladeshUniversityDirectory.private_medical_colleges,
  ...bangladeshUniversityDirectory.dental_colleges,
  ...bangladeshUniversityDirectory.affiliated_colleges,
] as const;

export const suppliedInstituteDepartments = bangladeshUniversityDirectory.departments;
