import { describe, expect, it } from "vitest";
import { adminProfileCompletion, isAdminProfileImageKind, type AdminProfileCompletionSource } from "./admin-profile";

const empty: AdminProfileCompletionSource = {
  phone: null, additionalPhone: null, gender: null, religion: null, nationality: null, cityLocationId: null, locationId: null,
  addressDetails: null, designation: null, emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelation: null,
  emergencyContactAddress: null, emergencyContactProfession: null, nidFrontUploaded: false, nidBackUploaded: false,
};

describe("the Admin profile", () => {
  it("counts every field an Admin fills, and both NID sides, toward completion", () => {
    expect(adminProfileCompletion(empty)).toBe(0);
    expect(adminProfileCompletion({ ...empty, phone: "01711111111", nidFrontUploaded: true })).toBe(13);
    // Whitespace is not an answer.
    expect(adminProfileCompletion({ ...empty, phone: "   " })).toBe(0);
    const full = Object.fromEntries(Object.entries(empty).map(([key, value]) => [key, typeof value === "boolean" ? true : "x"])) as unknown as AdminProfileCompletionSource;
    expect(adminProfileCompletion(full)).toBe(100);
  });

  it("knows its three image kinds and nothing else", () => {
    for (const kind of ["photo", "nid-front", "nid-back"]) expect(isAdminProfileImageKind(kind)).toBe(true);
    for (const kind of ["passport", "", null, 1]) expect(isAdminProfileImageKind(kind)).toBe(false);
  });
});
