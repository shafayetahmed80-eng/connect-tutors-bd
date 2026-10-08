// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/SiteHeader", () => ({ default: () => <header />, BrandLogo: () => <span>Connect Tutors</span> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));

import AdminHelp, { adminHelpSafetyPoints } from "./AdminHelp";

afterEach(() => cleanup());

describe("Admin Help describes the sign-in as it is now", () => {
  it("says an Admin signs in with the User ID the Owner gave, not an invitation and an email", () => {
    const text = render(<AdminHelp />).container.textContent ?? "";

    expect(text).toContain("the User ID, the correct password");
    expect(text).not.toMatch(/invit/i);
    expect(text).not.toContain("correct email address");
  });

  it("says who to ask when the password is forgotten, since the sign-in page has no Forgot password link", () => {
    const text = render(<AdminHelp />).container.textContent ?? "";

    expect(text).toContain("If you forget your password");
    expect(text).toContain("Only the Owner can reset an Admin password");
  });

  it("points a lost phone or laptop at Sign out everywhere", () => {
    expect(adminHelpSafetyPoints).toContainEqual(expect.stringContaining("Sign out everywhere"));
  });
});
