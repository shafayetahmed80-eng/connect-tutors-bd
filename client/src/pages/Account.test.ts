import { describe, expect, it } from "vitest";
import { getAccountPresentation } from "./Account";

describe("account presentation", () => {
  it("keeps each established role on a factual and role-safe primary path", () => {
    expect(getAccountPresentation("guardian")).toMatchObject({
      roleLabel: "Guardian",
      primaryAction: { href: "/guardian/dashboard", label: "Open Guardian Dashboard" },
      secondaryAction: { href: "/request-tutor", label: "Create a tutor request" },
    });
    expect(getAccountPresentation("tutor")).toMatchObject({
      roleLabel: "Tutor",
      primaryAction: { href: "/tutor/dashboard", label: "Open Tutor Dashboard" },
    });
    expect(getAccountPresentation("admin")).toMatchObject({
      roleLabel: "Admin",
      primaryAction: { href: "/admin/matching", label: "Open Admin Matching" },
    });
  });

  it("does not provide an internal destination for unknown roles", () => {
    expect(getAccountPresentation("unknown")).toBeNull();
  });
});
