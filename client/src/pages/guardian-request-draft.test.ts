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
    learningNeeds: [{ category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Class 1–5", subjects: ["English", "Mathematics"] }] }],
    tuitionType: "home" as const,
    groupCapacity: "",
    packageDurationMonths: "",
    studentCount: "2",
    studentGender: "female" as const,
    addressDetails: "Opposite the community library",
    tuitionCityLocationId: "dhaka",
    tuitionLocationId: "mirpur-10",
    daysPerWeek: "4",
    tutoringTime: "16:30",
    preferredGender: "female" as const,
    salaryAmount: "8000",
    instituteName: "Dhaka College",
    heardAboutUs: "facebook" as const,
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

  it("restores a version-one draft - one curriculum, one class, one list of subjects - as a list of one", () => {
    const { learningNeeds: _needs, ...rest } = validDraft.request;
    const legacy = { ...validDraft, version: 1, request: { ...rest, category: "English Medium", curriculumType: "Cambridge", classCourse: "Class 1–5", selectedSubjects: ["English", "Mathematics"] } };

    expect(parseGuardianRequestDraft(JSON.stringify(legacy))?.request.learningNeeds).toEqual(validDraft.request.learningNeeds);
  });

  it("restores a version-one draft without a Curriculum Type as a curriculum with none", () => {
    const { learningNeeds: _needs, ...rest } = validDraft.request;
    const legacy = { ...validDraft, version: 1, request: { ...rest, category: "Bangla Medium", classCourse: "Class 5", selectedSubjects: ["Mathematics"] } };

    expect(parseGuardianRequestDraft(JSON.stringify(legacy))?.request.learningNeeds).toEqual([
      { category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["Mathematics"] }] },
    ]);
  });

  it("keeps a half-made choice: a curriculum chosen, its classes not yet", () => {
    const half = { ...validDraft, request: { ...validDraft.request, learningNeeds: [{ category: "Madrasa Medium", curriculumType: null, classes: [] }] } };

    expect(parseGuardianRequestDraft(serializeGuardianRequestDraft(half))?.request.learningNeeds).toEqual(half.request.learningNeeds);
  });

  it("restores a version-one draft saved before anything was chosen as an empty list", () => {
    const { learningNeeds: _needs, ...rest } = validDraft.request;
    const legacy = { ...validDraft, version: 1, request: { ...rest, category: "", curriculumType: "", classCourse: "", selectedSubjects: [] } };

    expect(parseGuardianRequestDraft(JSON.stringify(legacy))?.request.learningNeeds).toEqual([]);
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
    expect(parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: { ...validDraft.request, learningNeeds: "English" } }))).toBeNull();
    expect(parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: { ...validDraft.request, learningNeeds: [{ category: "A", curriculumType: 123, classes: [] }] } }))).toBeNull();
    expect(parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: { ...validDraft.request, learningNeeds: [{ category: "A", classes: [{ classCourse: "Class 5", subjects: "English" }] }] } }))).toBeNull();
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
  it("restores a draft written before Institute Name and the referral answer existed", () => {
    // A Guardian mid-request when this shipped must not lose the draft; both
    // read back empty so the form asks the two new questions and keeps the rest.
    const { instituteName: _instituteName, heardAboutUs: _heardAboutUs, ...legacyRequest } = validDraft.request;
    const restored = parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: legacyRequest }));

    expect(restored).not.toBeNull();
    expect(restored?.request.instituteName).toBe("");
    expect(restored?.request.heardAboutUs).toBe("");
    expect(restored?.request.learningNeeds).toEqual(validDraft.request.learningNeeds);
  });

  describe("Tutoring Time", () => {
    it("writes the chosen time to the stored draft and reads it back unchanged", () => {
      // Checked in the stored text as well as the restored object, so a
      // serializer that dropped the key would fail here and not only on reload.
      const stored = serializeGuardianRequestDraft(validDraft);
      expect(JSON.parse(stored).request.tutoringTime).toBe("16:30");
      expect(parseGuardianRequestDraft(stored)?.request.tutoringTime).toBe("16:30");
    });

    it("keeps a box left empty as empty rather than inventing a time", () => {
      const blank = { ...validDraft, request: { ...validDraft.request, tutoringTime: "" } };

      expect(parseGuardianRequestDraft(serializeGuardianRequestDraft(blank))?.request.tutoringTime).toBe("");
    });

    it("restores a draft written before Tutoring Time existed as an empty box and keeps the rest", () => {
      // A Guardian mid-request when this shipped must not lose the draft.
      const { tutoringTime: _tutoringTime, ...legacyRequest } = validDraft.request;
      const restored = parseGuardianRequestDraft(JSON.stringify({ ...validDraft, request: legacyRequest }));

      expect(restored).not.toBeNull();
      expect(restored?.request.tutoringTime).toBe("");
      expect(restored).toEqual({ ...validDraft, request: { ...validDraft.request, tutoringTime: "" } });
    });

    it("rejects a draft whose Tutoring Time is not text instead of trusting session storage", () => {
      for (const tutoringTime of [1630, null, true, ["16:30"], { time: "16:30" }]) {
        const tampered = { ...validDraft, request: { ...validDraft.request, tutoringTime } };

        expect(parseGuardianRequestDraft(JSON.stringify(tampered)), JSON.stringify(tutoringTime)).toBeNull();
      }
    });

    it("clears text that is not a 24-hour time to an empty box rather than keeping it", () => {
      // Valid shape, wrong content: the draft survives, but the bad time must
      // not reach the form (and from there the server, which would refuse it).
      for (const tutoringTime of ["4:30 PM", "24:00", "25:99", "16:60", "16.30", "soon"]) {
        const odd = { ...validDraft, request: { ...validDraft.request, tutoringTime } };

        expect(parseGuardianRequestDraft(JSON.stringify(odd))?.request.tutoringTime, tutoringTime).toBe("");
        // Writing is held to the same rule, so a bad value is never stored.
        expect(JSON.parse(serializeGuardianRequestDraft(odd)).request.tutoringTime, tutoringTime).toBe("");
      }
    });
  });
});
