// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const letterFile = vi.hoisted(() => ({
  state: {} as { data?: { letterId: number; letterNumber: string; fileName: string; pdfBase64: string }; isLoading: boolean; error: { message: string } | null },
  refetch: vi.fn(),
  previewTerms: undefined as unknown,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    confirmationLetters: { file: { useQuery: () => ({ ...letterFile.state, refetch: letterFile.refetch }) } },
    admin: {
      previewConfirmationLetter: { useQuery: (terms: unknown) => { letterFile.previewTerms = terms; return { ...letterFile.state, refetch: letterFile.refetch }; } },
      // The Admin's own viewer, for a letter opened from Confirmed Jobs rather than a Tutor or Guardian dashboard.
      confirmationLetterFile: { useQuery: () => ({ ...letterFile.state, refetch: letterFile.refetch }) },
    },
  },
}));

const pdf = vi.hoisted(() => ({ renderPdfPages: vi.fn(), saveFile: vi.fn() }));
vi.mock("@/lib/pdfPreview", async importOriginal => ({ ...(await importOriginal<typeof import("@/lib/pdfPreview")>()), ...pdf }));

import { AdminConfirmationLetterViewButton, ConfirmationLetterDraftPreview, ConfirmationLetterViewButton } from "./ConfirmationLetterPreview";

const issued = {
  letterId: 31,
  letterNumber: "CTB-2026-000019-V1",
  fileName: "Connect-Tutors-Confirmation-Letter-CTB-2026-000019-V1.pdf",
  pdfBase64: btoa("%PDF-1.7"),
};

function openLetter() {
  render(<ConfirmationLetterViewButton letterId={31} letterNumber="CTB-2026-000019-V1" />);
  fireEvent.click(screen.getByRole("button", { name: "View letter" }));
  return screen.getByRole("dialog", { name: "Confirmation Letter" });
}

beforeEach(() => {
  letterFile.state = { isLoading: false, error: null, data: issued };
  letterFile.refetch.mockReset();
  pdf.renderPdfPages.mockReset().mockResolvedValue(undefined);
  pdf.saveFile.mockReset();
});

afterEach(() => cleanup());

describe("viewing a Confirmation Letter", () => {
  it("opens inside the site with the cradle while the letter is fetched", () => {
    letterFile.state = { isLoading: true, error: null };
    const dialog = openLetter();
    expect(dialog.textContent).toContain("CTB-2026-000019-V1");
    expect(screen.getByText("Preparing your letter…")).toBeTruthy();
    expect(dialog.querySelector(".loading-cradle")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Download PDF" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("draws the letter from the file the server handed over", async () => {
    openLetter();
    await waitFor(() => expect(pdf.renderPdfPages).toHaveBeenCalledTimes(1));
    const [bytes, container] = pdf.renderPdfPages.mock.calls[0];
    expect(new TextDecoder().decode(bytes)).toBe("%PDF-1.7");
    expect(container.getAttribute("aria-label")).toBe("Confirmation Letter CTB-2026-000019-V1");
    await waitFor(() => expect(screen.queryByText("Preparing your letter…")).toBeNull());
  });

  it("downloads the same file under a name that says what it is", async () => {
    openLetter();
    await waitFor(() => expect(screen.queryByText("Preparing your letter…")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(pdf.saveFile).toHaveBeenCalledTimes(1);
    const [bytes, fileName] = pdf.saveFile.mock.calls[0];
    expect(new TextDecoder().decode(bytes)).toBe("%PDF-1.7");
    expect(fileName).toBe("Connect-Tutors-Confirmation-Letter-CTB-2026-000019-V1.pdf");
  });

  it("still offers the download when this device cannot draw the letter", async () => {
    pdf.renderPdfPages.mockRejectedValue(new Error("no canvas"));
    openLetter();
    expect(await screen.findByText("This device could not show the letter here. Download the PDF to open it.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Download PDF" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("says why when the letter cannot be fetched, and can try again", () => {
    letterFile.state = { isLoading: false, error: { message: "This confirmation letter is unavailable." } };
    openLetter();
    expect(screen.getByRole("alert").textContent).toContain("This confirmation letter is unavailable.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(letterFile.refetch).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Download PDF" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("closes from the footer without downloading anything", () => {
    openLetter();
    const [, footerClose] = screen.getAllByRole("button", { name: "Close" });
    fireEvent.click(footerClose);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(pdf.saveFile).not.toHaveBeenCalled();
  });
});

describe("the Admin viewing a letter already issued", () => {
  it("opens the same window through the Admin's own endpoint, and can download it", async () => {
    render(<AdminConfirmationLetterViewButton letterId={31} letterNumber="CTB-2026-000019-V1" />);
    fireEvent.click(screen.getByRole("button", { name: "View letter" }));
    const dialog = screen.getByRole("dialog", { name: "Confirmation Letter" });
    expect(dialog.textContent).toContain("CTB-2026-000019-V1");
    await waitFor(() => expect(screen.queryByText("Preparing your letter…")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(pdf.saveFile).toHaveBeenCalledWith(expect.any(Uint8Array), issued.fileName);
  });
});

describe("the Admin previewing a draft", () => {
  const terms = { letterId: 31, agreedStartDate: "2026-09-01", agreedFeeMinimum: 5000, agreedFeeMaximum: 7000 };

  it("draws the draft with the terms typed so far and issues it from under the letter", async () => {
    const onIssue = vi.fn();
    render(<ConfirmationLetterDraftPreview terms={terms} onClose={vi.fn()} onIssue={onIssue} issuing={false} />);
    expect(letterFile.previewTerms).toEqual(terms);
    expect(screen.getByRole("dialog", { name: "Confirmation Letter preview" }).textContent).toContain("Draft · not issued yet");
    await waitFor(() => expect(pdf.renderPdfPages).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("Preparing your letter…")).toBeNull());
    expect(screen.queryByRole("button", { name: "Download PDF" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    expect(onIssue).toHaveBeenCalledTimes(1);
  });

  it("holds the window open while issuing and shows why an issue failed", () => {
    render(<ConfirmationLetterDraftPreview terms={terms} onClose={vi.fn()} onIssue={vi.fn()} issuing issueError="This confirmation-letter draft is no longer available for issue." />);
    expect((screen.getByRole("button", { name: "Issuing letter…" }) as HTMLButtonElement).disabled).toBe(true);
    const [, footerClose] = screen.getAllByRole("button", { name: "Close" });
    expect((footerClose as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("no longer available for issue");
  });
});
