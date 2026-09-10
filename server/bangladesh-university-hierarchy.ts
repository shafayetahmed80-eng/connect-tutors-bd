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
  /** Neither UGC-public nor UGC-private: IUT (OIC) and AUW (own charter). */
  international_universities: SuppliedUniversity[];
  /** BUTEX-affiliated colleges plus the DU-affiliated NITER. */
  textile_engineering_colleges: SuppliedUniversity[];
  alternative_medicine_colleges: SuppliedUniversity[];
  other: SuppliedUniversity[];
  /** One flat, global field-of-study vocabulary: Honours and Master's alike. */
  departments: string[];
};

/**
 * User-supplied, website-ready Bangladesh institute directory. It stays in a
 * standalone JSON file so the Institute list and the Department/Subject
 * vocabulary can be refreshed without editing code.
 *
 * There is no Faculty layer: the "Institute" selector spans universities,
 * medical/dental colleges, the former Dhaka-University "seven colleges",
 * textile-engineering and alternative-medicine colleges, and an
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
  ...bangladeshUniversityDirectory.international_universities,
  ...bangladeshUniversityDirectory.textile_engineering_colleges,
  ...bangladeshUniversityDirectory.alternative_medicine_colleges,
] as const;

export const suppliedInstituteDepartments = bangladeshUniversityDirectory.departments;
