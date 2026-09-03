// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuardianHireSheet } from "./GuardianHireSheet";

afterEach(cleanup);

describe("GuardianHireSheet", () => {
  it("announces itself as a dialog named by its own heading", () => {
    render(<GuardianHireSheet title="Hire a tutor" onClose={vi.fn()}><input aria-label="Category" /></GuardianHireSheet>);

    const dialog = screen.getByRole("dialog", { name: "Hire a tutor" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("opens on the first field rather than the Close button", () => {
    render(<GuardianHireSheet title="Hire a tutor" onClose={vi.fn()}><input aria-label="Category" /></GuardianHireSheet>);

    expect(document.activeElement).toBe(screen.getByLabelText("Category"));
  });

  it("closes on Escape, on the Close button, and on a click that lands on the backdrop", () => {
    const onClose = vi.fn();
    const { container } = render(<GuardianHireSheet title="Hire a tutor" onClose={onClose}><input aria-label="Category" /></GuardianHireSheet>);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(container.firstElementChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("does not close when the click lands inside the panel", () => {
    const onClose = vi.fn();
    render(<GuardianHireSheet title="Hire a tutor" onClose={onClose}><input aria-label="Category" /></GuardianHireSheet>);

    fireEvent.click(screen.getByRole("dialog", { name: "Hire a tutor" }));
    fireEvent.click(screen.getByLabelText("Category"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("carries no actions of its own, leaving Back and Continue to the journey inside it", () => {
    render(<GuardianHireSheet title="Hire a tutor" onClose={vi.fn()}><button type="button">Continue</button></GuardianHireSheet>);

    // Close plus whatever the caller rendered - no Cancel or Submit from the shell.
    const buttons = screen.getAllByRole("button").map(button => button.textContent?.trim() || button.getAttribute("aria-label"));
    expect(buttons).toEqual(["Close", "Continue"]);
  });

  it("locks the page behind while open and gives the scroll back on close", () => {
    const { unmount } = render(<GuardianHireSheet title="Hire a tutor" onClose={vi.fn()}><input aria-label="Category" /></GuardianHireSheet>);

    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
