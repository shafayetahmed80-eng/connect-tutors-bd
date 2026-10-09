import { describe, expect, it } from "vitest";
import {
  ADMIN_REQUEST_PUBLICATION_ACTIONS,
  buildSafeTutorRequestPublicationSnapshot,
  resolvePublishedJobNote,
  validateAdminRequestPublicationAction,
} from "./admin-request-publication";

describe("Admin request publication workflow", () => {
  it("requires review before approval, Guardian confirmation before approval, and approval before publication", () => {
    expect(validateAdminRequestPublicationAction({ from: "submitted", action: "approve", guardianConfirmed: true })).toMatchObject({ valid: false });
    expect(validateAdminRequestPublicationAction({ from: "reviewing", action: "approve", guardianConfirmed: false })).toMatchObject({ valid: false, reason: "GUARDIAN_CONFIRMATION_REQUIRED" });
    expect(validateAdminRequestPublicationAction({ from: "reviewing", action: "approve", guardianConfirmed: true })).toMatchObject({ valid: true, nextState: "approved" });
    expect(validateAdminRequestPublicationAction({ from: "approved", action: "publish", guardianConfirmed: true })).toMatchObject({ valid: true, nextState: "published" });
  });

  it("lets the Posted jobs board go straight Live from anywhere before it", () => {
    // One click from the board, from wherever the request had got to.
    for (const from of ["submitted", "reviewing", "changes_requested", "approved", "unpublished"] as const) {
      expect(validateAdminRequestPublicationAction({ from, action: "go_live", guardianConfirmed: false }))
        .toMatchObject({ valid: true, nextState: "published" });
    }
  });

  it("does not hold go_live behind the Guardian call that gates approve and publish", () => {
    // The gate stays exactly where it was for the Matching workspace...
    expect(validateAdminRequestPublicationAction({ from: "approved", action: "publish", guardianConfirmed: false }))
      .toMatchObject({ valid: false, reason: "GUARDIAN_CONFIRMATION_REQUIRED" });
    // ...and the board button is deliberately outside it.
    expect(validateAdminRequestPublicationAction({ from: "approved", action: "go_live", guardianConfirmed: false }))
      .toMatchObject({ valid: true, nextState: "published" });
  });

  it("has nowhere left to go once a job is already live or closed", () => {
    expect(validateAdminRequestPublicationAction({ from: "published", action: "go_live", guardianConfirmed: true })).toMatchObject({ valid: false, reason: "INVALID_TRANSITION" });
    expect(validateAdminRequestPublicationAction({ from: "closed", action: "go_live", guardianConfirmed: true })).toMatchObject({ valid: false, reason: "INVALID_TRANSITION" });
  });

  it("keeps close explicit and takes a Live job nowhere but to its end, while rejecting invalid transitions", () => {
    // Only a tuition that left the board some other way can be published again; there is no Unpublish to take one off.
    expect(validateAdminRequestPublicationAction({ from: "unpublished", action: "publish", guardianConfirmed: true })).toMatchObject({ valid: true, nextState: "published" });
    expect(validateAdminRequestPublicationAction({ from: "published", action: "publish", guardianConfirmed: true })).toMatchObject({ valid: false, reason: "INVALID_TRANSITION" });
    expect(validateAdminRequestPublicationAction({ from: "published", action: "verify", guardianConfirmed: false })).toMatchObject({ valid: false });
    expect(validateAdminRequestPublicationAction({ from: "approved", action: "close", guardianConfirmed: true })).toMatchObject({ valid: true, nextState: "closed" });
  });

  it("has no extension, reconfirmation call or unpublish: a job on the board has no end date to move", () => {
    expect(ADMIN_REQUEST_PUBLICATION_ACTIONS).not.toContain("extend_expiry");
    expect(ADMIN_REQUEST_PUBLICATION_ACTIONS).not.toContain("guardian_reconfirmed");
    expect(ADMIN_REQUEST_PUBLICATION_ACTIONS).not.toContain("unpublish");
    // A retired action asked for anyway is no transition at all.
    expect(validateAdminRequestPublicationAction({ from: "published", action: "unpublish" as never, guardianConfirmed: true })).toMatchObject({ valid: false });
    expect(validateAdminRequestPublicationAction({ from: "published", action: "extend_expiry" as never, guardianConfirmed: true })).toMatchObject({ valid: false });
  });

  it("closes a Live job from the Matching workspace, the one way a Live job leaves the board before it is appointed", () => {
    expect(validateAdminRequestPublicationAction({ from: "published", action: "close", guardianConfirmed: false })).toMatchObject({ valid: true, nextState: "closed" });
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

describe("the note the Job Board publishes", () => {
  it("publishes the Guardian's own note when an Admin does not touch it", () => {
    expect(resolvePublishedJobNote("Please start after Eid", undefined)).toBe("Please start after Eid");
  });

  it("publishes the Admin's wording once they have edited it", () => {
    // The Guardian's note is the one free-text field a stranger reads, and it
    // arrives carrying phone numbers and house numbers often enough to matter.
    expect(resolvePublishedJobNote("Call me on 01712345678", "Weekday evenings preferred")).toBe("Weekday evenings preferred");
  });

  it("publishes no note when an Admin clears the box", () => {
    // The case worth naming: clearing means "publish nothing", not "fall back
    // to the Guardian". A `??` here would republish the text just deleted.
    expect(resolvePublishedJobNote("Call me on 01712345678", "")).toBeNull();
    expect(resolvePublishedJobNote("Call me on 01712345678", "   ")).toBeNull();
  });

  it("treats a Guardian who wrote nothing as no note either way", () => {
    expect(resolvePublishedJobNote(null, undefined)).toBeNull();
    expect(resolvePublishedJobNote("   ", undefined)).toBeNull();
  });

  it("trims what it publishes, whoever wrote it", () => {
    expect(resolvePublishedJobNote("  spaced out  ", undefined)).toBe("spaced out");
    expect(resolvePublishedJobNote(null, "  admin note  ")).toBe("admin note");
  });
});
