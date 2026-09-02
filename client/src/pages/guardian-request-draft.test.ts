import { describe, expect, it } from "vitest";

import {
  GUARDIAN_REQUEST_DRAFT_VERSION,
  guardianRequestDraftStorageKey,
  parseGuardianRequestDraft,
  serializeGuardianRequestDraft,
} from "./guardian-request-draft";

const validDraft = {
  version: GUARDIAN_REQUEST_DRAFT_VERSION,
  step: 2 as const,
  request: {
    category: "English Medium",
    curriculumType: "Cambridge",
    classCourse: "Class 1–5",
    selectedSubjects: ["English", "Mathematics"],
    tuitionType: "home" as const,
    groupCapacity: "",
    packageDurationMonths: "",
    studentCount: "2",
    studentGender: "female" as const,
    addressDetails: "Opposite the community library",
    tuitionCityLocationId: "dhaka",
    tuitionLocationId: "mirpur-10",
    daysPerWeek: "4",
    preferredGender: "female" as const,
    salaryAmount: "8000",
  },
  notes: "Evening preferred",
};

describe("Guardian private request draft contract", () => {
  it("uses a Guardian-scoped storage key rather than a shared public key", () => {
    expect(guardianRequestDraftStorageKey(42)).toBe("connect-tutors:guardian-request-draft:42");
    expect(guardianRequestDraftStorageKey(43)).not.toBe(guardianRequestDraftStorageKey(42));
  });

  it("round-trips only the supported draft fields and preserves the current request step", () => {
    const restored = parseGuardianRequestDraft(serializeGuardianRequestDraft(validDraft));
    expect(restored).toEqual(validDraft);
  });

  it("restores legacy version-one drafts without a Curriculum Type as an empty value", () => {
    const { curriculumType: _curriculumType, ...legacyRequest } = validDraft.request;
    const restored = parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: legacyRequest }));

    expect(restored?.request.curriculumType).toBe("");
  });

  it("preserves Group capacity and treats its absence in legacy drafts as empty", () => {
    const groupDraft = { ...validDraft, request: { ...validDraft.request, tuitionType: "group" as const, groupCapacity: "8" } };
    expect(parseGuardianRequestDraft(serializeGuardianRequestDraft(groupDraft))?.request.groupCapacity).toBe("8");

    const { groupCapacity: _groupCapacity, ...legacyRequest } = validDraft.request;
    expect(parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: legacyRequest }))?.request.groupCapacity).toBe("");
  });

  it("preserves Package duration and treats its absence in legacy drafts as empty", () => {
    const packageDraft = { ...validDraft, request: { ...validDraft.request, tuitionType: "package" as const, packageDurationMonths: "6" } };
    expect(parseGuardianRequestDraft(serializeGuardianRequestDraft(packageDraft))?.request.packageDurationMonths).toBe("6");

    const { packageDurationMonths: _packageDurationMonths, ...legacyRequest } = validDraft.request;
    expect(parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: legacyRequest }))?.request.packageDurationMonths).toBe("");
  });

  it("preserves the approved Student Gender, private Address Details, and Number of Students while defaulting absent legacy values safely", () => {
    const restored = parseGuardianRequestDraft(serializeGuardianRequestDraft(validDraft));
    expect(restored?.request.studentCount).toBe("2");
    expect(restored?.request.studentGender).toBe("female");
    expect(restored?.request.addressDetails).toBe("Opposite the community library");

    const { studentCount: _studentCount, studentGender: _studentGender, addressDetails: _addressDetails, ...legacyRequest } = validDraft.request;
    const legacyRestored = parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: legacyRequest }));
    expect(legacyRestored?.request.studentCount).toBe("");
    expect(legacyRestored?.request.studentGender).toBe("");
    expect(legacyRestored?.request.addressDetails).toBe("");
  });

  it("rejects malformed, stale-version, or unsafe draft payloads instead of trusting session storage", () => {
    expect(parseGuardianRequestDraft("not-json")).toBeNull();
    expect(parseGuardianRequestDraft(JSON.stringify({ ...validDraft, version: 999 }))).toBeNull();
    expect(parseGuardianRequestDraft(JSON.stringify({ ...validDraft, step: 4 }))).toBeNull();
    expect(parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: { ...validDraft.request, selectedSubjects: "English" } }))).toBeNull();
    expect(parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: { ...validDraft.request, curriculumType: 123 } }))).toBeNull();
    expect(parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: { ...validDraft.request, studentGender: "other" } }))).toBeNull();
  });

  it("does not persist passwords, email, phone, terms, or account-location fields in a request draft", () => {
    const serialized = serializeGuardianRequestDraft({
      ...validDraft,
      password: "never-store-this",
      email: "guardian@example.com",
      phone: "01700000000",
      termsAccepted: true,
      accountLocationId: "dhaka-uttara",
    });

    expect(serialized).not.toContain("never-store-this");
    expect(serialized).not.toContain("guardian@example.com");
    expect(serialized).not.toContain("01700000000");
    expect(serialized).not.toContain("dhaka-uttara");
  });
});
