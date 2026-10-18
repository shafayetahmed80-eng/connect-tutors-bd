// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveBlob: vi.fn(),
  canvasToImageBlob: vi.fn(async () => new Blob(["x"])),
  drawTestPlate: vi.fn(),
  setMark: vi.fn(),
  deleteFont: vi.fn(),
  addColour: vi.fn(),
  deleteColour: vi.fn(),
  invalidateColours: vi.fn(),
  ownColours: [] as { id: string; name: string; ground: string; text: string; accent: string }[],
  invalidateUploads: vi.fn(),
  uploaded: [] as { id: string; name: string; script: "bn" | "en"; category: "sans"; url: string }[],
  marks: { marks: [] as { kind: "font" | "colour"; itemId: string; starred: boolean; archived: boolean }[], canEdit: false },
}));

vi.mock("@/lib/poster/canvas-kit", () => ({ POSTER_FONT_STACK: "sans-serif", loadPosterFonts: () => Promise.resolve() }));
vi.mock("@/lib/image-studio", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/image-studio")>();
  return { ...actual, saveBlob: mocks.saveBlob, canvasToImageBlob: mocks.canvasToImageBlob, drawTestPlate: mocks.drawTestPlate };
});
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ imageStudio: { marks: { invalidate: vi.fn() }, uploadedFonts: { invalidate: mocks.invalidateUploads }, ownColours: { invalidate: mocks.invalidateColours } } }),
    imageStudio: {
      marks: { useQuery: () => ({ data: mocks.marks }) },
      uploadedFonts: { useQuery: () => ({ data: mocks.uploaded }) },
      deleteFont: { useMutation: () => ({ mutate: mocks.deleteFont, isPending: false }) },
      ownColours: { useQuery: () => ({ data: mocks.ownColours }) },
      addColour: { useMutation: () => ({ mutate: mocks.addColour, isPending: false }) },
      deleteColour: { useMutation: () => ({ mutate: mocks.deleteColour, isPending: false }) },
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
  mocks.uploaded = [];
  mocks.ownColours = [];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const pressed = (name: RegExp | string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");
const lastPlateText = () => mocks.drawTestPlate.mock.calls.at(-1)?.[4];
const lastPlateColours = () => mocks.drawTestPlate.mock.calls.at(-1)?.[5];

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
    expect(mocks.drawTestPlate).toHaveBeenCalledWith(expect.anything(), "poster", expect.objectContaining({ id: "portrait-post" }), 3, expect.objectContaining({ mode: "bn" }), expect.objectContaining({ ground: "#0b4b86" }));
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
    expect(JSON.parse(window.localStorage.getItem("connect-image-studio-text-v1")!)).toEqual({ mode: "mixed", bn: "galada", en: "righteous", colour: "site-blue" });
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

describe("fonts the Owner uploads", () => {
  it("joins the list as U1, which the Owner can delete after confirming", async () => {
    mocks.uploaded = [{ id: "upload-0123456789ab", name: "Li Ador Noirrit", script: "bn", category: "sans", url: "/api/files/image-studio/fonts/upload-0123456789ab.ttf" }];
    mocks.marks = { marks: [], canEdit: true };
    render(<ImageStudioContent section="poster" />);
    fireEvent.click(screen.getByRole("button", { name: /B1 · Noto Sans Bengali/ }));
    const list = screen.getByRole("list", { name: "বাংলা fonts" });

    expect(within(list).getByRole("button", { name: /^U1.*Li Ador Noirrit$/ })).toBeTruthy();

    fireEvent.click(within(list).getByRole("button", { name: "Delete Li Ador Noirrit" }));
    expect(mocks.deleteFont).not.toHaveBeenCalled();
    fireEvent.click(within(list).getByRole("button", { name: "Delete" }));
    expect(mocks.deleteFont).toHaveBeenCalledWith({ id: "upload-0123456789ab" });
  });

  it("sends the file with its name, the list's language and the chosen type, then refreshes the list", async () => {
    mocks.marks = { marks: [], canEdit: true };
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ id: "upload-0123456789ab", name: "My Font" }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ImageStudioContent section="poster" />);
    fireEvent.click(screen.getByRole("button", { name: /B1 · Noto Sans Bengali/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add font/ }));

    const file = new File(["font-bytes"], "My-Font_Bold.ttf", { type: "font/ttf" });
    fireEvent.change(screen.getByLabelText(/Font file/), { target: { files: [file] } });
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("My Font Bold");
    fireEvent.click(within(screen.getByRole("group", { name: "Type of the new font" })).getByRole("button", { name: "Display" }));
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => expect(mocks.invalidateUploads).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: FormData }];
    expect(url).toBe("/api/admin/image-studio/fonts");
    expect(Object.fromEntries(["name", "script", "category"].map(key => [key, init.body.get(key)]))).toEqual({ name: "My Font Bold", script: "bn", category: "display" });
    vi.unstubAllGlobals();
  });

  it("offers no upload to other Admins", () => {
    render(<ImageStudioContent section="poster" />);
    fireEvent.click(screen.getByRole("button", { name: /B1 · Noto Sans Bengali/ }));
    expect(screen.queryByRole("button", { name: /Add font/ })).toBeNull();
  });
});

describe("the colour pairs", () => {
  it("starts on Site Blue and draws the plate in the pair the Admin picks", async () => {
    render(<ImageStudioContent section="poster" />);
    expect(lastPlateColours()).toMatchObject({ ground: "#0b4b86", text: "#ffffff" });

    fireEvent.click(screen.getByRole("button", { name: /P1 · Site Blue/ }));
    fireEvent.click(within(screen.getByRole("list", { name: "Colours" })).getByRole("button", { name: /Deep Teal/ }));

    await waitFor(() => expect(lastPlateColours()).toMatchObject({ ground: "#0e4f55", accent: "#ffc857" }));
    expect(JSON.parse(window.localStorage.getItem("connect-image-studio-text-v1")!).colour).toBe("deep-teal");
  });

  it("lists the five chosen pairs and the Owner's own as O1, with star, archive and delete for the Owner", () => {
    mocks.ownColours = [{ id: "own-0123456789ab", name: "Eid Gold", ground: "#6d1230", text: "#fff4e6", accent: "#f5c35a" }];
    mocks.marks = { marks: [{ kind: "colour", itemId: "mint", starred: false, archived: true }], canEdit: true };
    render(<ImageStudioContent section="poster" />);
    fireEvent.click(screen.getByRole("button", { name: /P1 · Site Blue/ }));
    const list = screen.getByRole("list", { name: "Colours" });

    expect(within(list).getByRole("button", { name: /^P4/ })).toBeTruthy();
    expect(within(list).getByRole("button", { name: /^O1.*Eid Gold/ })).toBeTruthy();
    expect(within(list).queryByRole("button", { name: /Mint/ })).toBeNull();

    fireEvent.click(within(list).getByRole("button", { name: "Star Paper" }));
    expect(mocks.setMark).toHaveBeenCalledWith({ kind: "colour", itemId: "paper", starred: true });
    fireEvent.click(within(list).getByRole("button", { name: "Delete Eid Gold" }));
    fireEvent.click(within(list).getByRole("button", { name: "Delete" }));
    expect(mocks.deleteColour).toHaveBeenCalledWith({ id: "own-0123456789ab" });
  });

  it("saves a new pair only while its text reads on its background", () => {
    mocks.marks = { marks: [], canEdit: true };
    render(<ImageStudioContent section="poster" />);
    fireEvent.click(screen.getByRole("button", { name: /P1 · Site Blue/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add colour/ }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "My Pair" } });

    // The form starts on white text over the site blue: readable.
    expect(screen.getByRole("status").textContent).toMatch(/readable/);
    const save = screen.getByRole("button", { name: "Save colour" }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);

    fireEvent.change(screen.getByLabelText("Background"), { target: { value: "#ffffff" } });
    expect(screen.getByRole("status").textContent).toMatch(/too low/);
    expect(save.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "#10202e" } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(mocks.addColour).toHaveBeenCalledWith({ name: "My Pair", ground: "#ffffff", text: "#10202e", accent: "#7cc4ff" });
  });

  it("gives other Admins no add, star, archive or delete for colours", () => {
    render(<ImageStudioContent section="poster" />);
    fireEvent.click(screen.getByRole("button", { name: /P1 · Site Blue/ }));

    expect(screen.queryByRole("button", { name: /Add colour/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Star / })).toBeNull();
  });
});
