// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveBlob: vi.fn(),
  canvasToImageBlob: vi.fn(async () => new Blob(["x"])),
  drawTestPlate: vi.fn(),
  setMark: vi.fn(),
  marks: { marks: [] as { kind: "font"; itemId: string; starred: boolean; archived: boolean }[], canEdit: false },
}));

vi.mock("@/lib/poster/canvas-kit", () => ({ POSTER_FONT_STACK: "sans-serif", loadPosterFonts: () => Promise.resolve() }));
vi.mock("@/lib/image-studio", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/image-studio")>();
  return { ...actual, saveBlob: mocks.saveBlob, canvasToImageBlob: mocks.canvasToImageBlob, drawTestPlate: mocks.drawTestPlate };
});
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ imageStudio: { marks: { invalidate: vi.fn() } } }),
    imageStudio: {
      marks: { useQuery: () => ({ data: mocks.marks }) },
      setMark: { useMutation: () => ({ mutate: mocks.setMark, isPending: false }) },
    },
  },
}));
vi.mock("@/components/AdminWorkspaceLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ImageStudioContent } from "./AdminImageStudio";

beforeEach(() => {
  window.localStorage.clear();
  mocks.marks = { marks: [], canEdit: false };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const pressed = (name: RegExp | string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");
const lastPlateText = () => mocks.drawTestPlate.mock.calls.at(-1)?.[4];

describe("the Image Section studio", () => {
  it("offers the section's own sizes and starts on the first", () => {
    render(<ImageStudioContent section="banner" />);

    expect(screen.getByRole("button", { name: /Facebook cover/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /YouTube banner/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Story/ })).toBeNull();
    expect(pressed(/Facebook cover/)).toBe("true");
  });

  it("downloads the picked size, file type and sharpness under a name that says so", async () => {
    render(<ImageStudioContent section="poster" />);

    fireEvent.click(screen.getByRole("button", { name: /Portrait post/ }));
    fireEvent.click(screen.getByRole("button", { name: "JPG" }));
    fireEvent.click(screen.getByRole("button", { name: "3×" }));
    fireEvent.click(screen.getByRole("button", { name: /Download JPG · 3240×4050/ }));

    await waitFor(() => expect(mocks.saveBlob).toHaveBeenCalledWith(expect.any(Blob), "connect-tutors-poster-portrait-post-3240x4050.jpg"));
    expect(mocks.canvasToImageBlob).toHaveBeenCalledWith(expect.anything(), "jpg");
    // The export draws its own canvas at full size, in the chosen faces; the preview keeps drawing at 1×.
    expect(mocks.drawTestPlate).toHaveBeenCalledWith(expect.anything(), "poster", expect.objectContaining({ id: "portrait-post" }), 3, expect.objectContaining({ mode: "bn" }));
  });

  it("will not offer a sharpness too large for a phone to make, and falls back to the largest allowed", () => {
    render(<ImageStudioContent section="banner" />);

    fireEvent.click(screen.getByRole("button", { name: "3×" }));
    fireEvent.click(screen.getByRole("button", { name: /YouTube banner/ }));

    expect((screen.getByRole("button", { name: "3×" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Download PNG · 5120×2880/ })).toBeTruthy();
  });
});

describe("the text and its fonts", () => {
  it("shows the Bangla picker for Bangla, the English one for English, and both with the ready pairs for mixed", async () => {
    render(<ImageStudioContent section="poster" />);
    expect(screen.getByRole("button", { name: /B1 · Noto Sans Bengali/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /E1 · DM Sans/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.queryByRole("button", { name: /B1 · Noto Sans Bengali/ })).toBeNull();
    expect(screen.getByRole("button", { name: /E1 · DM Sans/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "মিশ্র" }));
    fireEvent.click(screen.getByRole("button", { name: /C9 · Galada \+ Righteous/ }));

    await waitFor(() => expect(lastPlateText()).toMatchObject({ mode: "mixed", bnFamily: "studio-galada", enFamily: "studio-righteous" }));
    expect(JSON.parse(window.localStorage.getItem("connect-image-studio-text-v1")!)).toEqual({ mode: "mixed", bn: "galada", en: "righteous" });
  });

  it("picks a font from the list, searched by name", async () => {
    render(<ImageStudioContent section="poster" />);
    fireEvent.click(screen.getByRole("button", { name: /B1 · Noto Sans Bengali/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Search বাংলা fonts/ }), { target: { value: "siyam" } });

    const list = screen.getByRole("list", { name: "বাংলা fonts" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(within(list).getByRole("button", { name: /Siyam Rupali/ }));

    await waitFor(() => expect(lastPlateText()).toMatchObject({ bnFamily: "studio-siyam-rupali" }));
  });

  it("lets the Owner star and archive for everyone, and leaves archived fonts out of the list", () => {
    mocks.marks = { marks: [{ kind: "font", itemId: "galada", starred: false, archived: true }], canEdit: true };
    render(<ImageStudioContent section="poster" />);
    fireEvent.click(screen.getByRole("button", { name: /B1 · Noto Sans Bengali/ }));
    const list = screen.getByRole("list", { name: "বাংলা fonts" });

    expect(within(list).queryByRole("button", { name: /Galada/ })).toBeNull();
    fireEvent.click(within(list).getByRole("button", { name: "Star Mina" }));
    expect(mocks.setMark).toHaveBeenCalledWith({ kind: "font", itemId: "mina", starred: true });

    fireEvent.click(screen.getByRole("button", { name: "Archived (1)" }));
    fireEvent.click(within(screen.getByRole("list", { name: "বাংলা fonts" })).getByRole("button", { name: "Restore Galada" }));
    expect(mocks.setMark).toHaveBeenCalledWith({ kind: "font", itemId: "galada", archived: false });
  });

  it("gives other Admins no star or archive controls", () => {
    render(<ImageStudioContent section="poster" />);
    fireEvent.click(screen.getByRole("button", { name: /B1 · Noto Sans Bengali/ }));

    expect(screen.queryByRole("button", { name: /^Star / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Archive / })).toBeNull();
  });
});
