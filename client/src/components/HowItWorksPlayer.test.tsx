// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { howItWorksGuides, HOW_IT_WORKS_STEP_MS } from "@shared/how-it-works";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/siteContent", () => ({
  useSiteContentResolver: () => (_slotId: string, fallback: string) => fallback,
}));

import HowItWorksPlayer from "./HowItWorksPlayer";

function reduceMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
}

const guardianSteps = howItWorksGuides.guardian.steps;
const currentStep = () => screen.getAllByRole("button").find(button => button.getAttribute("aria-current") === "step")!;

beforeEach(() => {
  vi.useFakeTimers();
  reduceMotion(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the How it works player", () => {
  it("starts on the first step and moves to the next one by itself", () => {
    render(<HowItWorksPlayer panel="guardian" />);
    expect(currentStep().textContent).toContain(guardianSteps[0]!.title);

    act(() => { vi.advanceTimersByTime(HOW_IT_WORKS_STEP_MS + 50); });
    expect(currentStep().textContent).toContain(guardianSteps[1]!.title);
  });

  it("starts over after the last step", () => {
    render(<HowItWorksPlayer panel="guardian" />);
    for (let i = 0; i < guardianSteps.length; i += 1) act(() => { vi.advanceTimersByTime(HOW_IT_WORKS_STEP_MS + 50); });
    expect(currentStep().textContent).toContain(guardianSteps[0]!.title);
  });

  it("stops on the pause button and carries on when played again", () => {
    render(<HowItWorksPlayer panel="guardian" />);
    fireEvent.click(screen.getByRole("button", { name: "Pause the guide" }));
    act(() => { vi.advanceTimersByTime(HOW_IT_WORKS_STEP_MS * 3); });
    expect(currentStep().textContent).toContain(guardianSteps[0]!.title);

    fireEvent.click(screen.getByRole("button", { name: "Play the guide" }));
    act(() => { vi.advanceTimersByTime(HOW_IT_WORKS_STEP_MS + 50); });
    expect(currentStep().textContent).toContain(guardianSteps[1]!.title);
  });

  it("jumps to a chosen step and carries on from there", () => {
    render(<HowItWorksPlayer panel="guardian" />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(guardianSteps[3]!.title) }));
    expect(currentStep().textContent).toContain(guardianSteps[3]!.title);

    act(() => { vi.advanceTimersByTime(HOW_IT_WORKS_STEP_MS + 50); });
    expect(currentStep().textContent).toContain(guardianSteps[4]!.title);
  });

  it("never moves by itself, and has no pause button to offer, when the person asks for less motion", () => {
    reduceMotion(true);
    render(<HowItWorksPlayer panel="tutor" />);
    act(() => { vi.advanceTimersByTime(HOW_IT_WORKS_STEP_MS * 3); });

    expect(currentStep().textContent).toContain(howItWorksGuides.tutor.steps[0]!.title);
    expect(screen.queryByRole("button", { name: /guide$/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(howItWorksGuides.tutor.steps[2]!.title) }));
    expect(currentStep().textContent).toContain(howItWorksGuides.tutor.steps[2]!.title);
  });

  it("keeps every step's words on the page, so a screen reader reads the whole guide", () => {
    render(<HowItWorksPlayer panel="tutor" />);
    for (const step of howItWorksGuides.tutor.steps) {
      expect(screen.getByText(step.title)).toBeTruthy();
      expect(screen.getByText(step.copy)).toBeTruthy();
    }
  });
});
