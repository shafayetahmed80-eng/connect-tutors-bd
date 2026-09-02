// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TutorProfileSectionModal } from "./TutorProfileSectionModal";

afterEach(cleanup);

function renderModal(overrides: Partial<React.ComponentProps<typeof TutorProfileSectionModal>> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(
    <TutorProfileSectionModal title="Identity and contact" onClose={onClose} onSubmit={onSubmit} {...overrides}>
      <label>
        Full name
        <input aria-label="Full name" defaultValue="Test Tutor" />
      </label>
      <label>
        Headline
        <input aria-label="Headline" defaultValue="Maths Tutor" />
      </label>
    </TutorProfileSectionModal>,
  );
  return { onClose, onSubmit };
}

describe("TutorProfileSectionModal", () => {
  it("puts initial focus on the first real field, not the header Close button", () => {
    renderModal();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Full name" }));
  });

  it("keeps Tab focus cycling inside the dialog", async () => {
    const user = userEvent.setup({ document: window.document });
    renderModal();

    const dialog = screen.getByRole("dialog");
    const closeButton = within(dialog).getByRole("button", { name: "Close" });
    const submit = within(dialog).getByRole("button", { name: /Submit/ });

    // Tab past the last control wraps to the first, instead of leaving for document.body.
    submit.focus();
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(closeButton);

    // Shift+Tab from the first control wraps to the last.
    closeButton.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(submit);
  });

  it("closes on a click that lands on the backdrop, but not on one inside the panel", () => {
    const { onClose } = renderModal();
    const dialog = screen.getByRole("dialog");

    // A click that starts inside the dialog bubbles to the backdrop; only a
    // click on the backdrop itself should dismiss.
    fireEvent.click(dialog);
    fireEvent.click(screen.getByRole("textbox", { name: "Full name" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialog.parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores a backdrop click while submitting, or while the photo cropper is open", () => {
    const { onClose } = renderModal({ submitting: true });
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).not.toHaveBeenCalled();

    cleanup();
    const second = renderModal();
    const cropper = document.createElement("div");
    cropper.setAttribute("data-testid", "tutor-profile-photo-editor-panel");
    document.body.appendChild(cropper);

    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(second.onClose).not.toHaveBeenCalled();
    cropper.remove();
  });

  it("ignores Escape while the photo cropper overlay is open", () => {
    const { onClose } = renderModal();

    const cropper = document.createElement("div");
    cropper.setAttribute("data-testid", "tutor-profile-photo-editor-panel");
    document.body.appendChild(cropper);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    cropper.remove();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
