// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TutorDocumentLightboxModal } from "./TutorDocumentLightboxModal";

afterEach(cleanup);

describe("TutorDocumentLightboxModal", () => {
  it("renders the modal with image, title, and status when open", () => {
    render(
      <TutorDocumentLightboxModal
        isOpen={true}
        onClose={vi.fn()}
        title="University ID card"
        imageUrl="/api/files/test-id.jpg"
        status="approved"
      />,
    );

    expect(screen.getByRole("dialog", { name: "Preview University ID card" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "University ID card" })).toBeTruthy();
    expect(screen.getByAltText("University ID card").getAttribute("src")).toBe("/api/files/test-id.jpg");
    expect(screen.getByText("Verified")).toBeTruthy();
  });

  it("does not render anything when isOpen is false", () => {
    const { container } = render(
      <TutorDocumentLightboxModal
        isOpen={false}
        onClose={vi.fn()}
        title="University ID card"
        imageUrl="/api/files/test-id.jpg"
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("calls onClose on Close button click and on Escape key", () => {
    const onClose = vi.fn();
    render(
      <TutorDocumentLightboxModal
        isOpen={true}
        onClose={onClose}
        title="National ID (NID)"
        imageUrl="/api/files/test-nid.jpg"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close document preview" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("provides interactive zoom in, zoom out, rotate, and reset controls", () => {
    render(
      <TutorDocumentLightboxModal
        isOpen={true}
        onClose={vi.fn()}
        title="SSC Certificate"
        imageUrl="/api/files/test-ssc.jpg"
      />,
    );

    expect(screen.getByText("100%")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("125%")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByText("100%")).toBeTruthy();

    const rotateBtn = screen.getByRole("button", { name: "Rotate 90 degrees" });
    fireEvent.click(rotateBtn);

    const resetBtn = screen.getByRole("button", { name: "Reset zoom and rotation" });
    expect(resetBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(resetBtn);

    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("triggers upload replacement and closes modal when button is clicked", () => {
    const onClose = vi.fn();
    const onTriggerUpload = vi.fn();
    render(
      <TutorDocumentLightboxModal
        isOpen={true}
        onClose={onClose}
        title="University ID card"
        imageUrl="/api/files/test-id.jpg"
        status="changes_requested"
        onTriggerUpload={onTriggerUpload}
      />,
    );

    expect(screen.getByText("Re-upload Requested")).toBeTruthy();
    const replaceBtn = screen.getByRole("button", { name: /upload replacement/i });
    fireEvent.click(replaceBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onTriggerUpload).toHaveBeenCalledTimes(1);
  });
});
