// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultSiteLimits } from "@shared/site-limits";
import ModalSizePreview from "./ModalSizePreview";

const setWindowHeight = (height: number) => Object.defineProperty(window, "innerHeight", { configurable: true, value: height });

beforeEach(() => setWindowHeight(768));
afterEach(cleanup);

/** The drawn dialog at its real size, before the shrink. */
const drawn = (testId: string) => within(screen.getByTestId(testId)).getByText((_, element) => element?.getAttribute("aria-hidden") === "true" && element.className.includes("bg-background")).closest("[aria-hidden=true]") as HTMLElement;

describe("the Modals preview", () => {
  it("names the panel at the size it would stand on this screen, and the dialog by its width", () => {
    render(<ModalSizePreview limits={defaultSiteLimits()} />);

    // 86% of a 768px window is 660; the shipped cap of 720 does not bite.
    expect(screen.getByText("Panel · 680 × 660 px on this screen")).toBeTruthy();
    expect(screen.getByText("Dialog · 440 px wide")).toBeTruthy();
  });

  it("stops the panel at the Owner's number on a tall window", () => {
    setWindowHeight(1200);
    render(<ModalSizePreview limits={defaultSiteLimits()} />);

    expect(screen.getByText("Panel · 680 × 720 px on this screen")).toBeTruthy();
  });

  it("follows the numbers it is given", () => {
    render(<ModalSizePreview limits={{ ...defaultSiteLimits(), "modal.width.panel": 800, "modal.width.dialog": 400, "modal.height.panel": 500 }} />);

    expect(screen.getByText("Panel · 800 × 500 px on this screen")).toBeTruthy();
    expect(screen.getByText("Dialog · 400 px wide")).toBeTruthy();
  });

  it("draws both at one scale, so the dialog is narrower than the panel in the same proportion as the numbers", () => {
    render(<ModalSizePreview limits={defaultSiteLimits()} />);
    const panel = drawn("preview-panel");
    const dialog = drawn("preview-dialog");

    expect(panel.style.width).toBe("680px");
    expect(dialog.style.width).toBe("440px");
    // Shrunk by the same factor: the widest of the two fills the stage.
    expect(panel.style.transform).toBe(dialog.style.transform);
    const scale = Number(/scale\(([\d.]+)\)/.exec(panel.style.transform)![1]);
    expect(680 * scale).toBeCloseTo(336 - 28, 5);
  });

  it("draws the corner rounding and the shadow the stylesheet would give a real dialog", () => {
    render(<ModalSizePreview limits={{ ...defaultSiteLimits(), "modal.radius": 8 }} />);
    const panel = drawn("preview-panel");

    expect(panel.style.borderRadius).toBe("8px");
    expect(panel.style.boxShadow).toContain("0 24px 48px -24px");
  });

  it("is a picture only: nothing in it is read out or can be tabbed to", () => {
    render(<ModalSizePreview limits={defaultSiteLimits()} />);

    expect(screen.getByTestId("preview-panel").querySelectorAll("button, a, input, [tabindex]")).toHaveLength(0);
    expect(drawn("preview-panel").getAttribute("aria-hidden")).toBe("true");
  });
});
