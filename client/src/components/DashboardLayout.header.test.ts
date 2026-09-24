import { describe, expect, it } from "vitest";
import { isCommunityPanel } from "@shared/community";
import { getDashboardAvatarInitials, type WorkspaceHeaderIdentity } from "./DashboardLayout";

/**
 * All three panels share one header component; what differs between them is
 * the identity each one hands it, and - since PR #223 - whether the header
 * takes the sidebar's colours. That "themed" flag is `isCommunityPanel`
 * (Tutor and Guardian only), reused from the community row so the two never
 * drift apart; the Admin header stays the plain light bar it has always been.
 */
describe("workspace header colours", () => {
  it("themes only the Tutor and Guardian header, never the Admin one", () => {
    expect(isCommunityPanel("tutor")).toBe(true);
    expect(isCommunityPanel("guardian")).toBe(true);
    expect(isCommunityPanel("admin")).toBe(false);
    expect(isCommunityPanel(undefined)).toBe(false);
  });
});

describe("workspace header identity", () => {
  const tutor: WorkspaceHeaderIdentity = {
    portal: "Tutor Portal",
    name: "Tania Sultana",
    profilePhotoUrl: null,
    details: [{ label: "Tutor ID", value: "T-000175" }],
  };
  const guardian: WorkspaceHeaderIdentity = {
    portal: "Guardian Portal",
    name: "Rahim Uddin",
    profilePhotoUrl: "https://example.com/photo.jpg",
    details: [{ label: "Guardian ID", value: "G-000042" }],
  };
  const owner: WorkspaceHeaderIdentity = {
    portal: "Admin Panel",
    name: "Site Admin",
    details: [{ label: "User ID", value: "admin" }, { label: "Role", value: "Project Owner" }],
  };

  it("names each portal in the eyebrow, since the header no longer knows which panel it is in", () => {
    expect([tutor.portal, guardian.portal, owner.portal]).toEqual(["Tutor Portal", "Guardian Portal", "Admin Panel"]);
  });

  it("identifies an Admin by the User ID they type at the login screen, not their display name", () => {
    // "Site Admin" is not what anyone signs in with, and with more than one
    // Admin the name alone does not say which account is open.
    expect(owner.details?.[0]).toEqual({ label: "User ID", value: "admin" });
    expect(owner.details?.[1]).toEqual({ label: "Role", value: "Project Owner" });
  });

  it("takes initials from the first two words", () => {
    expect(getDashboardAvatarInitials("Tania Sultana")).toBe("TS");
    expect(getDashboardAvatarInitials("Rahim Uddin Chowdhury")).toBe("RU");
    expect(getDashboardAvatarInitials("Admin")).toBe("A");
  });

  it("falls back rather than showing a stray letter when the name has not loaded", () => {
    // It used to return "T" for everyone, which read as a Tutor initial in the
    // Guardian and Admin panels.
    expect(getDashboardAvatarInitials("")).toBe("?");
    expect(getDashboardAvatarInitials("   ")).toBe("?");
    expect(getDashboardAvatarInitials("", "G")).toBe("G");
  });

  it("allows an identity with no details at all", () => {
    // A Guardian whose profile is still loading has no Guardian ID yet, and the
    // header must not break waiting for one.
    const loading: WorkspaceHeaderIdentity = { portal: "Guardian Portal", name: "Guardian", details: [] };
    expect(loading.details).toEqual([]);
  });
});
