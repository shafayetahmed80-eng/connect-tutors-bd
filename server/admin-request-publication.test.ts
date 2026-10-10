import { describe, expect, it } from "vitest";
import {
  ADMIN_REQUEST_PUBLICATION_ACTIONS,
  buildSafeTutorRequestPublicationSnapshot,
  resolvePublishedJobNote,
  validateAdminRequestPublicationAction,
} from "./admin-request-publication";

describe("Admin request publication workflow", () => {
  it("lets the Posted jobs board go straight Live from anywhere before it", () => {
    // One click from the board, from wherever the request had got to.
    for (const from of ["submitted", "reviewing", "changes_requested", "approved", "unpublished"] as const) {
      expect(validateAdminRequestPublicationAction({ from, action: "go_live" }))
        .toMatchObject({ valid: true, nextState: "published" });
    }
  });

  it("has nowhere left to go once a job is already live or closed", () => {
    expect(validateAdminRequestPublicationAction({ from: "published", action: "go_live" })).toMatchObject({ valid: false, reason: "INVALID_TRANSITION" });
    expect(validateAdminRequestPublicationAction({ from: "closed", action: "go_live" })).toMatchObject({ valid: false, reason: "INVALID_TRANSITION" });
  });

  it("has only the one move: no review chain, no Guardian-call gate, no extension, no unpublish", () => {
    expect(ADMIN_REQUEST_PUBLICATION_ACTIONS).toEqual(["go_live"]);
    // A retired action asked for anyway - from a page opened before the update - is no transition at all.
    for (const action of ["verify", "edit", "guardian_confirmed", "request_changes", "approve", "publish", "close", "unpublish", "extend_expiry"]) {
      expect(validateAdminRequestPublicationAction({ from: "reviewing", action: action as never })).toMatchObject({ valid: false, reason: "INVALID_TRANSITION" });
    }
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
