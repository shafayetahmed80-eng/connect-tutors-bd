// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  extractFilename,
  parseImageUrls,
  ChatDropzoneOverlay,
  ChatDocumentCard,
  ChatMediaGallery,
  ClipboardImagePreviewChip,
} from "./ChatAttachments";

afterEach(cleanup);

// Mock URL.createObjectURL for jsdom
if (typeof window.URL.createObjectURL === "undefined") {
  window.URL.createObjectURL = () => "blob:mock-url";
}

describe("ChatAttachments helpers and components", () => {
  it("extractFilename correctly extracts filename and decodes URL encoding", () => {
    expect(extractFilename("https://connecttutorsbd.com/uploads/tutor_cv_2026.pdf")).toBe(
      "tutor_cv_2026.pdf"
    );
    expect(
      extractFilename("https://connecttutorsbd.com/uploads/NID%20Copy%20Front.pdf?token=123")
    ).toBe("NID Copy Front.pdf");
  });

  it("parseImageUrls parses single, comma-separated, and JSON array strings", () => {
    expect(parseImageUrls("https://example.com/1.jpg")).toEqual(["https://example.com/1.jpg"]);
    expect(parseImageUrls("https://example.com/1.jpg, https://example.com/2.jpg")).toEqual([
      "https://example.com/1.jpg",
      "https://example.com/2.jpg",
    ]);
    expect(
      parseImageUrls('["https://example.com/a.jpg", "https://example.com/b.jpg"]')
    ).toEqual(["https://example.com/a.jpg", "https://example.com/b.jpg"]);
    expect(parseImageUrls(null)).toEqual([]);
  });

  it("renders ChatDropzoneOverlay when isDragging is true", () => {
    const { rerender } = render(<ChatDropzoneOverlay isDragging={false} />);
    expect(screen.queryByTestId("chat-dropzone-overlay")).toBeNull();

    rerender(<ChatDropzoneOverlay isDragging={true} />);
    expect(screen.getByTestId("chat-dropzone-overlay")).toBeTruthy();
    expect(screen.getByText("এখানে ফাইল বা ছবি ড্রপ করুন")).toBeTruthy();
  });

  it("renders ChatDocumentCard with PDF icon, download link, and filename", () => {
    render(
      <ChatDocumentCard
        url="https://connecttutorsbd.com/docs/Academic_Transcript.pdf"
        fileSizeText="2.4 MB"
      />
    );

    expect(screen.getByText("Academic_Transcript.pdf")).toBeTruthy();
    expect(screen.getByText("PDF Document")).toBeTruthy();
    expect(screen.getByText("• 2.4 MB")).toBeTruthy();

    const openLink = screen.getByRole("link", { name: /Open Academic_Transcript\.pdf/ });
    expect(openLink.getAttribute("href")).toBe(
      "https://connecttutorsbd.com/docs/Academic_Transcript.pdf"
    );

    const downloadLink = screen.getByRole("link", { name: /Download Academic_Transcript\.pdf/ });
    expect(downloadLink.getAttribute("download")).toBe("Academic_Transcript.pdf");
  });

  it("renders ChatMediaGallery for single and multiple images", () => {
    const onImageClick = vi.fn();
    const { rerender } = render(
      <ChatMediaGallery
        urls={["https://example.com/1.jpg"]}
        onImageClick={onImageClick}
      />
    );

    expect(screen.getByRole("button", { name: "View attachment image in full screen" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "View attachment image in full screen" }));
    expect(onImageClick).toHaveBeenCalledWith("https://example.com/1.jpg");

    rerender(
      <ChatMediaGallery
        urls={[
          "https://example.com/1.jpg",
          "https://example.com/2.jpg",
          "https://example.com/3.jpg",
          "https://example.com/4.jpg",
          "https://example.com/5.jpg",
        ]}
        onImageClick={onImageClick}
      />
    );

    expect(screen.getByTestId("chat-media-gallery")).toBeTruthy();
    expect(screen.getByText("+2")).toBeTruthy(); // 5 images total: 4th tile shows +2
  });

  it("renders ClipboardImagePreviewChip and triggers onRemove", () => {
    const onRemove = vi.fn();
    const file = new File(["dummy content"], "screenshot.png", { type: "image/png" });

    render(<ClipboardImagePreviewChip file={file} onRemove={onRemove} />);

    expect(screen.getByText("screenshot.png")).toBeTruthy();
    expect(screen.getByText("ক্লিপবোর্ড থেকে যুক্ত হয়েছে")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove pasted image" }));
    expect(onRemove).toHaveBeenCalled();
  });
});
