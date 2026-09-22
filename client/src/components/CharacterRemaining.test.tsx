// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import CharacterRemaining from "./CharacterRemaining";

afterEach(cleanup);

describe("the remaining-character counter", () => {
  it("counts down from the limit as blue while there is room", () => {
    render(<CharacterRemaining value="Hello" maxLength={2000} />);
    const counter = screen.getByText("1995 remaining");
    expect(counter.className).toContain("text-j-accent");
    expect(counter.className).not.toContain("#bd3535");
  });

  it("stays blue at exactly zero remaining", () => {
    render(<CharacterRemaining value={"a".repeat(2000)} maxLength={2000} />);
    const counter = screen.getByText("0 remaining");
    expect(counter.className).toContain("text-j-accent");
  });

  it("turns warning red and keeps counting past the limit", () => {
    render(<CharacterRemaining value={"a".repeat(2010)} maxLength={2000} />);
    const counter = screen.getByText("-10 remaining");
    expect(counter.className).toContain("text-[#bd3535]");
  });

  it("starts at the full count for an empty field", () => {
    render(<CharacterRemaining value="" maxLength={160} />);
    expect(screen.getByText("160 remaining").className).toContain("text-j-accent");
  });
});
