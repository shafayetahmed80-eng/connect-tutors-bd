import { describe, expect, it } from "vitest";
import { guardianActionPresets } from "./AdminGuardianActivity";

describe("Guardian activity action presets", () => {
  it("offers only safe operational filters and routes without a contact-disclosure shortcut", () => {
    expect(guardianActionPresets).toEqual([
      { id: "new", label: "Review new requests", status: "new", contactConsent: "all" },
      { id: "consent", label: "Resolve consent decisions", status: "all", contactConsent: "pending" },
      { id: "matching", label: "Open matching workspace", href: "/admin/matching" },
    ]);
  });
});
