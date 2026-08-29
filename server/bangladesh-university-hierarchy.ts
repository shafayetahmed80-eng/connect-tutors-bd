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
};

/**
 * User-supplied, website-ready Bangladesh university directory.  This stays in
 * a standalone JSON file so Faculty and Department/Subject records can be
 * regenerated without maintaining a second hard-coded hierarchy in the UI.
 */
export const bangladeshUniversityDirectory = source as SuppliedUniversityDirectory;

export const suppliedBangladeshUniversities = [
  ...bangladeshUniversityDirectory.public_universities,
  ...bangladeshUniversityDirectory.private_universities,
] as const;
