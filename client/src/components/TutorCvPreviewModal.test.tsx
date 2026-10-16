// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { TutorCvPreviewModal } from "./TutorCvPreviewModal";

afterEach(() => cleanup());

vi.mock("@/lib/trpc", () => ({
  trpc: {
    tutor: {
      getMyCvPdf: {
        useQuery: vi.fn().mockReturnValue({
          data: {
            fileName: "Connect-Tutors-CV-84210-Test.pdf",
            pdfBase64: "JVBERi0xLjQK",
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
  },
}));

vi.mock("@/lib/pdfPreview", () => ({
  base64ToBytes: vi.fn().mockReturnValue(new Uint8Array([37, 80, 68, 70])),
  renderPdfPages: vi.fn().mockResolvedValue(undefined),
  saveFile: vi.fn(),
}));

describe("TutorCvPreviewModal", () => {
  it("renders when open and displays modal header and action buttons", () => {
    render(
      <TutorCvPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        tutorName="Md. Rashedul Islam"
        tutorNumber={84210}
      />
    );

    expect(screen.getByText("Official Tutor CV & Biodata")).toBeTruthy();
    expect(screen.getByText("Tutor ID: 84210")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Download PDF/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Print/i })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Close/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <TutorCvPreviewModal
        isOpen={false}
        onClose={vi.fn()}
        tutorName="Md. Rashedul Islam"
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
