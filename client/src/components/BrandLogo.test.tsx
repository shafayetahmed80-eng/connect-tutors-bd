// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrandLogo } from "./SiteHeader";

// jsdom has no AnimationEvent, so React would listen for the prefixed
// `webkitAnimationEnd` instead of `animationend`. Give it one before React loads.
vi.hoisted(() => {
  if (!("AnimationEvent" in window)) Object.assign(window, { AnimationEvent: class extends Event {} });
});

afterEach(() => cleanup());

describe("BrandLogo", () => {
  it("draws a Newton's cradle of five balls with only the last one lifted", () => {
    const { container } = render(<BrandLogo />);
    const mark = container.querySelector("svg.brand-mark");
    expect(mark?.querySelectorAll("circle")).toHaveLength(5);
    expect(mark?.querySelectorAll(".brand-mark-lifted circle")).toHaveLength(1);
    expect(mark?.getAttribute("aria-hidden")).toBe("true");
  });

  it("links home under one name, with or without the wordmark", () => {
    const { rerender } = render(<BrandLogo />);
    expect(screen.getByRole("link", { name: "Connect Tutors home" }).textContent).toBe("ConnectTutors");
    rerender(<BrandLogo compact />);
    expect(screen.getByRole("link", { name: "Connect Tutors home" }).textContent).toBe("");
  });

  it("swings once when pointed at or focused, then comes back to rest", () => {
    const { container } = render(<BrandLogo />);
    const link = screen.getByRole("link", { name: "Connect Tutors home" });
    expect(link.hasAttribute("data-swinging")).toBe(false);

    fireEvent.pointerEnter(link);
    expect(link.hasAttribute("data-swinging")).toBe(true);
    fireEvent.animationEnd(container.querySelector("svg.brand-mark")!);
    expect(link.hasAttribute("data-swinging")).toBe(false);

    fireEvent.focus(link);
    expect(link.hasAttribute("data-swinging")).toBe(true);
  });
});
