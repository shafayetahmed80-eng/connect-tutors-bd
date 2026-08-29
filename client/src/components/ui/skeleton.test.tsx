// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton accessibility contract", () => {
  it("exposes a polite status while content is loading and identifies the region", () => {
    render(<Skeleton aria-label="Loading dashboard" />);
    const skeleton = screen.getByRole("status", { name: "Loading dashboard" });
    expect(skeleton.getAttribute("aria-live")).toBe("polite");
    expect(skeleton.getAttribute("data-motion")).toBe("shimmer");
  });
});
