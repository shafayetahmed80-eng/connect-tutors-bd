// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentLightboxModal, type LightboxDocumentItem } from "./DocumentLightboxModal";

afterEach(() => cleanup());

const mockItems: LightboxDocumentItem[] = [
  { id: "universityId", label: "University ID", url: "https://example.com/uni.png", status: "uploaded" },
  { id: "nid_card", label: "NID Card Image", url: "https://example.com/nid.png", status: "approved" },
  { id: "ssc_certificate", label: "SSC Certificate", url: null, status: "not_uploaded" },
];

describe("DocumentLightboxModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DocumentLightboxModal isOpen={false} onClose={vi.fn()} items={mockItems} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when isOpen is true and displays the active document and counter", () => {
    render(
      <DocumentLightboxModal
        isOpen={true}
        onClose={vi.fn()}
        items={mockItems}
        tutorName="Rahim Ahmed"
      />
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "University ID" })).toBeTruthy();
    expect(screen.getByText("Rahim Ahmed")).toBeTruthy();
    // Only 2 valid uploaded items
    expect(screen.getByText("1 of 2")).toBeTruthy();
    expect(screen.getByAltText("University ID").getAttribute("src")).toBe("https://example.com/uni.png");
  });

  it("navigates between documents using next and previous buttons", () => {
    render(
      <DocumentLightboxModal
        isOpen={true}
        onClose={vi.fn()}
        items={mockItems}
        initialIndex={0}
      />
    );

    expect(screen.getByRole("heading", { name: "University ID" })).toBeTruthy();

    // Click Next
    fireEvent.click(screen.getByRole("button", { name: "Next document" }));
    expect(screen.getByRole("heading", { name: "NID Card Image" })).toBeTruthy();
    expect(screen.getByText("2 of 2")).toBeTruthy();
    expect(screen.getByAltText("NID Card Image").getAttribute("src")).toBe("https://example.com/nid.png");

    // Click Prev
    fireEvent.click(screen.getByRole("button", { name: "Previous document" }));
    expect(screen.getByRole("heading", { name: "University ID" })).toBeTruthy();
  });

  it("supports rotating the document 90 degrees clockwise and counter-clockwise", () => {
    render(
      <DocumentLightboxModal
        isOpen={true}
        onClose={vi.fn()}
        items={mockItems}
      />
    );

    const rotateCwBtn = screen.getByRole("button", { name: "Rotate 90 degrees clockwise" });
    const rotateCcwBtn = screen.getByRole("button", { name: "Rotate 90 degrees counter-clockwise" });

    // Initial rotation: 0deg
    fireEvent.click(rotateCwBtn);
    expect(screen.getByText("90°")).toBeTruthy();

    fireEvent.click(rotateCwBtn);
    expect(screen.getByText("180°")).toBeTruthy();

    fireEvent.click(rotateCcwBtn);
    expect(screen.getByText("90°")).toBeTruthy();
  });

  it("supports zooming in, zooming out, and resetting zoom", () => {
    render(
      <DocumentLightboxModal
        isOpen={true}
        onClose={vi.fn()}
        items={mockItems}
      />
    );

    const zoomInBtn = screen.getByRole("button", { name: "Zoom in" });
    const zoomOutBtn = screen.getByRole("button", { name: "Zoom out" });
    const fitBtn = screen.getByRole("button", { name: "Reset zoom and rotation" });

    expect(screen.getByText("100%")).toBeTruthy();

    fireEvent.click(zoomInBtn);
    expect(screen.getByText("125%")).toBeTruthy();

    fireEvent.click(zoomOutBtn);
    expect(screen.getByText("100%")).toBeTruthy();

    // Zoom in twice then reset
    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomInBtn);
    expect(screen.getByText("150%")).toBeTruthy();

    fireEvent.click(fitBtn);
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("answers keyboard shortcuts (Escape, Arrows, +, -, R)", () => {
    const handleClose = vi.fn();
    render(
      <DocumentLightboxModal
        isOpen={true}
        onClose={handleClose}
        items={mockItems}
      />
    );

    // ArrowRight to next document
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "NID Card Image" })).toBeTruthy();

    // ArrowLeft to previous document
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "University ID" })).toBeTruthy();

    // Zoom in with '+'
    fireEvent.keyDown(window, { key: "+" });
    expect(screen.getByText("125%")).toBeTruthy();

    // Rotate with 'r'
    fireEvent.keyDown(window, { key: "r" });
    expect(screen.getByText("90°")).toBeTruthy();

    // Escape to close
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onApprove and onRequestReupload when action buttons are provided", () => {
    const handleApprove = vi.fn();
    const handleReupload = vi.fn();

    render(
      <DocumentLightboxModal
        isOpen={true}
        onClose={vi.fn()}
        items={mockItems}
        onApprove={handleApprove}
        onRequestReupload={handleReupload}
      />
    );

    const approveBtn = screen.getByRole("button", { name: "Approve document" });
    const reuploadBtn = screen.getByRole("button", { name: "Request re-upload for this document" });

    fireEvent.click(approveBtn);
    expect(handleApprove).toHaveBeenCalledWith(mockItems[0]);

    fireEvent.click(reuploadBtn);
    expect(handleReupload).toHaveBeenCalledWith(mockItems[0]);
  });
});
