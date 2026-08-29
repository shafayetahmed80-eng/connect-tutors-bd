import { describe, expect, it } from "vitest";
import { getAccountPresentation } from "./Account";

describe("signed-in account navigation", () => {
  it("makes the Guardian Dashboard the primary Guardian destination", () => {
    expect(getAccountPresentation("guardian")).toMatchObject({
      roleLabel: "Guardian",
      primaryAction: {
        href: "/guardian/dashboard",
        label: "Open Guardian Dashboard",
      },
    });
  });

  it("keeps legacy user-role accounts on the Guardian workspace", () => {
    expect(getAccountPresentation("user")?.primaryAction.href).toBe("/guardian/dashboard");
  });
});
