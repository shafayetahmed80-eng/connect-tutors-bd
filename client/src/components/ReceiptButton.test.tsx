// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ saveFile: vi.fn(), toastError: vi.fn() }));

vi.mock("@/lib/pdfPreview", () => ({
  saveFile: mocks.saveFile,
  base64ToBytes: (base64: string) => new Uint8Array(Buffer.from(base64, "base64")),
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: mocks.toastError }) }));

import ReceiptButton from "./ReceiptButton";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("the receipt button", () => {
  it("asks for the PDF only when it is pressed, then saves it under the name the server gave", async () => {
    const load = vi.fn().mockResolvedValue({ fileName: "Connect-Tutors-Receipt-RCT-2026-000123.pdf", pdfBase64: Buffer.from("%PDF-1.7").toString("base64") });
    render(<ReceiptButton label="Receipt" ariaLabel="Receipt for the 2,400 Taka payment" load={load} />);

    expect(load).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Receipt for the 2,400 Taka payment" }));

    await waitFor(() => expect(mocks.saveFile).toHaveBeenCalledTimes(1));
    expect(load).toHaveBeenCalledTimes(1);
    const [bytes, fileName] = mocks.saveFile.mock.calls[0]!;
    expect(fileName).toBe("Connect-Tutors-Receipt-RCT-2026-000123.pdf");
    expect(Buffer.from(bytes as Uint8Array).toString("latin1")).toBe("%PDF-1.7");
  });

  it("is held while the receipt is being prepared, so one press is one download", async () => {
    let finish: (file: { fileName: string; pdfBase64: string }) => void = () => {};
    const load = vi.fn(() => new Promise<{ fileName: string; pdfBase64: string }>(resolve => { finish = resolve; }));
    render(<ReceiptButton label="Receipt" ariaLabel="Receipt" load={load} />);

    fireEvent.click(screen.getByRole("button", { name: "Receipt" }));
    const button = await screen.findByRole("button", { name: "Receipt" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.textContent).toContain("Preparing");
    fireEvent.click(button);
    expect(load).toHaveBeenCalledTimes(1);

    finish({ fileName: "r.pdf", pdfBase64: "" });
    await waitFor(() => expect((screen.getByRole("button", { name: "Receipt" }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("says why when the receipt cannot be had, and saves nothing", async () => {
    const load = vi.fn().mockRejectedValue(new Error("This receipt is unavailable."));
    render(<ReceiptButton label="Final receipt" ariaLabel="Final receipt" load={load} />);

    fireEvent.click(screen.getByRole("button", { name: "Final receipt" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("This receipt is unavailable."));
    expect(mocks.saveFile).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Final receipt" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
