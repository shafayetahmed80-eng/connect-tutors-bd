// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import BackLink from "@/components/BackLink";

afterEach(cleanup);

describe("BackLink", () => {
  it("is a link to where it goes, named by its words alone", () => {
    render(<BackLink href="/admin/posted-jobs">Back to Posted jobs</BackLink>);

    const link = screen.getByRole("link", { name: "Back to Posted jobs" });
    expect(link.getAttribute("href")).toBe("/admin/posted-jobs");
  });

  it("stands 40px tall on a phone, and keeps its own line height from sm up", () => {
    render(<BackLink href="/x">Back</BackLink>);

    const link = screen.getByRole("link", { name: "Back" });
    expect(link.className).toContain("max-sm:min-h-10");
    // Only the phone is given a minimum: nothing here pins the desktop height.
    expect(link.className).not.toMatch(/(^|\s)min-h-10/);
  });
});
