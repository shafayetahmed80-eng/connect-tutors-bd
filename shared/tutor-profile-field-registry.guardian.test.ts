import { describe, expect, it } from "vitest";
import {
  defaultTutorProfileFieldConfig,
  findTutorProfileFieldMeta,
  guardianPrivateFieldIds,
  guardianVisibleByDefault,
  isGuardianPrivateField,
  resolveTutorProfileFieldConfig,
} from "./tutor-profile-field-registry";

const row = (fieldId: string, guardianVisible: number | null) => ({
  fieldId, section: null, subGroup: null, sortOrder: null, enabled: null, required: null, label: null, guardianVisible,
});

describe("what a Guardian may be shown", () => {
  it("keeps the floor private whatever is stored", () => {
    const config = resolveTutorProfileFieldConfig(Array.from(guardianPrivateFieldIds).map(fieldId => row(fieldId, 1)));
    for (const fieldId of Array.from(guardianPrivateFieldIds)) {
      expect(config.byId.get(fieldId)?.guardianVisible, fieldId).toBe(false);
      expect(config.byId.get(fieldId)?.guardianConfigurable, fieldId).toBe(false);
    }
  });

  it("names only fields the registry declares", () => {
    // A typo on the floor would leave the real field open.
    for (const fieldId of Array.from(guardianPrivateFieldIds)) {
      expect(findTutorProfileFieldMeta(fieldId), fieldId).toBeDefined();
    }
  });

  it("puts contact, family and emergency contact, documents and review notes on the floor", () => {
    for (const fieldId of [
      "phone", "contactEmail", "privateDetails.additionalPhone",
      "privateDetails.fatherName", "privateDetails.motherPhone", "privateDetails.emergencyContactPhone",
      "universityIdDocumentStatus", "supportingDocument.nid_card", "supportingDocument.hons_ms_certificate",
      "additionalNotes",
    ]) {
      expect(isGuardianPrivateField(fieldId), fieldId).toBe(true);
    }
  });

  it("starts personal details and the fee range hidden, and the teaching profile shown", () => {
    const config = defaultTutorProfileFieldConfig();
    for (const fieldId of ["dateOfBirth", "privateDetails.religion", "privateDetails.nationality", "feeMin", "feeMax", "educationRecords.rollNumber"]) {
      expect(config.byId.get(fieldId)?.guardianVisible, fieldId).toBe(false);
      expect(config.byId.get(fieldId)?.guardianConfigurable, fieldId).toBe(true);
    }
    for (const fieldId of ["name", "headline", "universityId", "primarySubjectIds", "teachingAreaIds", "aboutMe", "secondaryRecord"]) {
      expect(config.byId.get(fieldId)?.guardianVisible, fieldId).toBe(true);
    }
    expect(guardianVisibleByDefault("phone")).toBe(false);
  });

  it("follows a stored choice on a configurable field, and ignores a value that is not 0 or 1", () => {
    const config = resolveTutorProfileFieldConfig([row("aboutMe", 0), row("privateDetails.religion", 1), row("headline", 5)]);
    expect(config.byId.get("aboutMe")?.guardianVisible).toBe(false);
    expect(config.byId.get("privateDetails.religion")?.guardianVisible).toBe(true);
    expect(config.byId.get("headline")?.guardianVisible).toBe(true);
  });
});
