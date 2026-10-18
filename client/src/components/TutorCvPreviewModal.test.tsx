// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { trpc } from "@/lib/trpc";
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
    admin: {
      getTutorCvPdf: {
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
  it("renders when open and displays modal header and action buttons in tutor mode", () => {
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

  it("renders when open in admin mode with tutorId", () => {
    render(
      <TutorCvPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        tutorId="tutor-175"
        tutorName="Md. Rashedul Islam"
        tutorNumber={84210}
      />
    );

    expect(screen.getByText("Official Tutor CV & Biodata")).toBeTruthy();
    expect(screen.getByText("Tutor ID: 84210")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Download PDF/i })).toBeTruthy();
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

describe("TutorCvPreviewModal for a draft profile", () => {
  const draftData = { fileName: "Connect-Tutors-CV-792-Draft.pdf", pdfBase64: "JVBERi0xLjQK", downloadable: false };
  const query = (data: unknown) => ({ data, isLoading: false, error: null, refetch: vi.fn() }) as never;

  afterEach(() => {
    vi.mocked(trpc.tutor.getMyCvPdf.useQuery).mockReset();
    vi.mocked(trpc.admin.getTutorCvPdf.useQuery).mockReset();
  });

  it("shows the CV to the Tutor but offers neither Download nor Print", () => {
    vi.mocked(trpc.tutor.getMyCvPdf.useQuery).mockReturnValue(query(draftData));
    render(<TutorCvPreviewModal isOpen={true} onClose={vi.fn()} tutorName="Md. Samiul Haque Ratul" tutorNumber={792} />);

    expect(screen.getByText("Official Tutor CV & Biodata")).toBeTruthy();
    expect(screen.getByRole("img", { name: /Official Tutor CV & Biodata for Md. Samiul Haque Ratul/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Download PDF/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Print/i })).toBeNull();
    expect(screen.getAllByRole("button", { name: /Close/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("shows the CV to an Admin the same way", () => {
    vi.mocked(trpc.admin.getTutorCvPdf.useQuery).mockReturnValue(query(draftData));
    render(<TutorCvPreviewModal isOpen={true} onClose={vi.fn()} tutorId="tutor-792" tutorName="Md. Samiul Haque Ratul" tutorNumber={792} />);

    expect(screen.getByRole("img", { name: /Official Tutor CV & Biodata/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Download PDF/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Print/i })).toBeNull();
  });

  it("keeps Download and Print for a CV the server marks downloadable", () => {
    vi.mocked(trpc.tutor.getMyCvPdf.useQuery).mockReturnValue(query({ ...draftData, downloadable: true }));
    render(<TutorCvPreviewModal isOpen={true} onClose={vi.fn()} tutorName="Md. Samiul Haque Ratul" tutorNumber={792} />);

    expect(screen.getByRole("button", { name: /Download PDF/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Print/i })).toBeTruthy();
  });
});
