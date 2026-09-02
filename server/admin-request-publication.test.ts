import { describe, expect, it } from "vitest";
import {
  buildSafeTutorRequestPublicationSnapshot,
  validateAdminRequestPublicationAction,
} from "./admin-request-publication";

describe("Admin request publication workflow", () => {
  it("requires review before approval, Guardian confirmation before approval, and approval before publication", () => {
    expect(validateAdminRequestPublicationAction({ from: "submitted", action: "approve", guardianConfirmed: true })).toMatchObject({ valid: false });
    expect(validateAdminRequestPublicationAction({ from: "reviewing", action: "approve", guardianConfirmed: false })).toMatchObject({ valid: false, reason: "GUARDIAN_CONFIRMATION_REQUIRED" });
    expect(validateAdminRequestPublicationAction({ from: "reviewing", action: "approve", guardianConfirmed: true })).toMatchObject({ valid: true, nextState: "approved" });
    expect(validateAdminRequestPublicationAction({ from: "approved", action: "publish", guardianConfirmed: true })).toMatchObject({ valid: true, nextState: "published" });
  });

  it("keeps unpublish and close controls explicit while rejecting invalid transitions", () => {
    expect(validateAdminRequestPublicationAction({ from: "published", action: "unpublish", guardianConfirmed: true })).toMatchObject({ valid: true, nextState: "unpublished" });
    expect(validateAdminRequestPublicationAction({ from: "unpublished", action: "publish", guardianConfirmed: true })).toMatchObject({ valid: true, nextState: "published" });
    expect(validateAdminRequestPublicationAction({ from: "published", action: "verify", guardianConfirmed: false })).toMatchObject({ valid: false });
    expect(validateAdminRequestPublicationAction({ from: "approved", action: "close", guardianConfirmed: true })).toMatchObject({ valid: true, nextState: "closed" });
  });

  it("allows an Admin to extend a published job only after recording a new Guardian confirmation", () => {
    expect(validateAdminRequestPublicationAction({ from: "published", action: "guardian_reconfirmed", guardianConfirmed: false }))
      .toMatchObject({ valid: true, nextState: "published" });
    expect(validateAdminRequestPublicationAction({ from: "published", action: "extend_expiry", guardianConfirmed: false }))
      .toMatchObject({ valid: false, reason: "GUARDIAN_CONFIRMATION_REQUIRED" });
    expect(validateAdminRequestPublicationAction({ from: "published", action: "extend_expiry", guardianConfirmed: true, guardianReconfirmed: true }))
      .toMatchObject({ valid: true, nextState: "published" });
  });

  it("creates a deliberately safe before/after snapshot without contacts, student identity, notes, or raw address", () => {
    const snapshot = buildSafeTutorRequestPublicationSnapshot({
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: "[\"English\",\"Mathematics\"]",
      daysPerWeek: 4,
      preferredGender: "female",
      budgetAmount: 8000,
      tuitionLocationLabel: "Mirpur 10",
      studentFirstName: "Private Student",
      notes: "Private health and access details",
      locationText: "Exact home address",
    });

    expect(snapshot).toEqual({
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: ["English", "Mathematics"],
      daysPerWeek: 4,
      tutorGenderPreference: "female",
      budgetAmount: 8000,
      location: "Mirpur 10",
    });
    expect(JSON.stringify(snapshot)).not.toContain("Private");
    expect(JSON.stringify(snapshot)).not.toContain("Exact home address");
  });
});
