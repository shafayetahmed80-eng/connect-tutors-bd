import source from "./data/bangladesh-universities.json";

export type SuppliedUniversityFaculty = {
  name: string;
  departments: string[];
};

export type SuppliedUniversity = {
  name: string;
  location: string;
  status: "Active" | "Non-functional" | "Programs not started";
  faculties: SuppliedUniversityFaculty[];
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
};

/**
 * User-supplied, website-ready Bangladesh institute directory.  This stays in
 * a standalone JSON file so Faculty and Department/Subject records can be
 * regenerated without maintaining a second hard-coded hierarchy in the UI.
 *
 * The "Institute" selector spans universities, medical/dental colleges, the
 * former Dhaka-University "seven colleges", and an "Others" catch-all — every
 * group is flattened into one list. "Others" is spread first so it always sorts
 * to the top of the search results.
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
