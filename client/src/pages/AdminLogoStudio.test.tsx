// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveBlob: vi.fn(),
  logoPngBlob: vi.fn(async () => new Blob(["png"])),
  renderLogoSvg: vi.fn(async (input: { form: string; name: string; colourway: { id: string } }) => ({ svg: `<svg data-form="${input.form}" data-name="${input.name}" data-way="${input.colourway.id}"/>`, width: 600, height: 200 })),
  setMark: vi.fn(),
}));

vi.mock("@/lib/image-studio", async importOriginal => ({ ...(await importOriginal<typeof import("@/lib/image-studio")>()), saveBlob: mocks.saveBlob }));
vi.mock("@/lib/logo-export", () => ({ logoPngBlob: mocks.logoPngBlob, renderLogoSvg: mocks.renderLogoSvg }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ imageStudio: { marks: { invalidate: vi.fn() }, uploadedFonts: { invalidate: vi.fn() } } }),
    imageStudio: {
      marks: { useQuery: () => ({ data: { marks: [], canEdit: false } }) },
      uploadedFonts: { useQuery: () => ({ data: [] }) },
      setMark: { useMutation: () => ({ mutate: mocks.setMark, isPending: false }) },
      deleteFont: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { LogoStudioContent } from "./AdminLogoStudio";

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:logo", revokeObjectURL: () => undefined }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const lastBuild = () => mocks.renderLogoSvg.mock.calls.at(-1)![0];

describe("the logo studio", () => {
  it("starts on the horizontal logo, site blue, English and Bangla", async () => {
    render(<LogoStudioContent />);

    await waitFor(() => expect(screen.getByTestId("logo-preview")).toBeTruthy());
    expect(lastBuild()).toMatchObject({ form: "horizontal", name: "mixed", colourway: { id: "site-blue" } });
    expect(screen.getByRole("button", { name: "Horizontal" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("redraws for the form, colour way and language picked, and remembers them", async () => {
    render(<LogoStudioContent />);
    fireEvent.click(screen.getByRole("button", { name: "Vertical" }));
    fireEvent.click(screen.getByRole("button", { name: "All white" }));
    fireEvent.click(screen.getByRole("button", { name: "English" }));

    await waitFor(() => expect(lastBuild()).toMatchObject({ form: "vertical", name: "en", colourway: { id: "white" } }));
    expect(JSON.parse(window.localStorage.getItem("connect-logo-studio-v1")!)).toMatchObject({ form: "vertical", colourway: "white", name: "en" });
  });

  it("offers a font picker only for the language shown, and none for the icon", async () => {
    render(<LogoStudioContent />);
    expect(screen.getByRole("button", { name: /B1 · Noto Sans Bengali/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /E1 · DM Sans/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.queryByRole("button", { name: /B1 · Noto Sans Bengali/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Icon" }));
    expect(screen.queryByRole("button", { name: /E1 · DM Sans/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "English" })).toBeNull();
  });

  it("downloads the PNG at the chosen scale and the SVG, each named for what it is", async () => {
    render(<LogoStudioContent />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Download PNG · 1200×400/ })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /Download PNG/ }));
    await waitFor(() => expect(mocks.saveBlob).toHaveBeenCalledWith(expect.any(Blob), "connect-tutors-logo-horizontal-en-bn-site-blue@2x.png"));
    expect(mocks.logoPngBlob).toHaveBeenCalledWith(expect.objectContaining({ width: 600 }), 2);

    fireEvent.click(screen.getByRole("button", { name: "Download SVG" }));
    await waitFor(() => expect(mocks.saveBlob).toHaveBeenCalledWith(expect.any(Blob), "connect-tutors-logo-horizontal-en-bn-site-blue.svg"));
  });

  it("packs every form in every colour way, as SVG and PNG, into one zip", async () => {
    render(<LogoStudioContent />);
    fireEvent.click(screen.getByRole("button", { name: /Download all/ }));

    await waitFor(() => expect(mocks.saveBlob).toHaveBeenCalledWith(expect.any(Blob), "connect-tutors-logo.zip"));
    // 4 forms x 5 colour ways = 20 pictures, each drawn once for both files.
    expect(mocks.logoPngBlob).toHaveBeenCalledTimes(20);
    const zip = mocks.saveBlob.mock.calls.at(-1)![0] as Blob;
    const text = new TextDecoder().decode(new Uint8Array(await zip.arrayBuffer()));
    expect(text).toContain("connect-tutors-logo/icon/connect-tutors-logo-icon-site-blue.svg");
    expect(text).toContain("connect-tutors-logo/wordmark/connect-tutors-logo-wordmark-en-bn-black@2x.png");
  });
});
