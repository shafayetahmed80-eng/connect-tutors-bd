// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const renderers = vi.hoisted(() => ({
  single: vi.fn(),
  combined: vi.fn(),
  fonts: vi.fn(async () => {}),
}));

const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));
vi.mock("@/lib/facebook-poster", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/facebook-poster")>();
  return { ...actual, renderSingleTuitionPoster: renderers.single, renderCombinedTuitionsPoster: renderers.combined, loadPosterFonts: renderers.fonts };
});

import { FacebookPosterModal, PosterColourRow } from "./FacebookPosterModal";

const PREFS_KEY = "connect_tutors_fb_poster_prefs_v1";
const job = (id: number) => ({ id, jobId: String(6799 + id), classCourse: "Class 8", category: "English Version", subjects: JSON.stringify(["Mathematics"]), tuitionLocationLabel: "Dhanmondi, Dhaka", budgetAmount: 9000, daysPerWeek: 3, preferredGender: "female" });
const jobs = Array.from({ length: 6 }, (_, index) => job(index + 1));

const stored = () => JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
const lastSingle = () => renderers.single.mock.calls.at(-1)![2];
const lastCombined = () => renderers.combined.mock.calls.at(-1)![2];
const group = (name: string) => within(screen.getByRole("radiogroup", { name }));

beforeEach(() => {
  localStorage.clear();
  renderers.single.mockClear();
  renderers.combined.mockClear();
  renderers.fonts.mockClear();
  toasts.success.mockClear();
  toasts.error.mockClear();
  toasts.info.mockClear();
});
afterEach(cleanup);

describe("the poster window's colour row", () => {
  it("offers the design's own colour first, the presets, a custom picker and a colour code", () => {
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} />);
    const colours = group("Colour");

    expect(colours.getByRole("radio", { name: "Design's own colour" }).getAttribute("aria-checked")).toBe("true");
    for (const name of ["Navy", "Emerald", "Crimson", "Plum", "Teal", "Slate", "Mist", "Cream", "Rose", "Sage", "Sand"]) {
      expect(colours.getByRole("radio", { name }).getAttribute("aria-checked"), name).toBe("false");
    }
    expect(screen.getByLabelText("Custom colour")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Colour code" })).toBeTruthy();
  });

  it("draws the poster on a preset, remembers it, and goes back to the design's own colour", () => {
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} />);
    expect(lastSingle().ground).toBeNull();

    fireEvent.click(group("Colour").getByRole("radio", { name: "Rose" }));
    expect(lastSingle().ground).toBe("#f7e3e7");
    expect(group("Colour").getByRole("radio", { name: "Rose" }).getAttribute("aria-checked")).toBe("true");
    expect(stored().ground).toBe("#f7e3e7");
    expect((screen.getByRole("textbox", { name: "Colour code" }) as HTMLInputElement).value).toBe("#f7e3e7");

    fireEvent.click(group("Colour").getByRole("radio", { name: "Design's own colour" }));
    expect(lastSingle().ground).toBeNull();
    expect(stored().ground).toBeNull();
  });

  it("draws on a colour typed as a code, three digits or six, and ignores what is not one", () => {
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} />);
    const code = screen.getByRole("textbox", { name: "Colour code" }) as HTMLInputElement;

    fireEvent.change(code, { target: { value: "#123ABC" } });
    expect(lastSingle().ground).toBe("#123abc");

    fireEvent.change(code, { target: { value: "#f0a" } });
    expect(lastSingle().ground).toBe("#ff00aa");

    renderers.single.mockClear();
    fireEvent.change(code, { target: { value: "#12" } });
    fireEvent.change(code, { target: { value: "blue" } });
    expect(renderers.single).not.toHaveBeenCalled();
    // Leaving the box restores the colour in use rather than half a code.
    fireEvent.blur(code);
    expect(code.value).toBe("#ff00aa");
  });

  it("takes any colour from the picker and shows it as the selected custom swatch", () => {
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} />);

    fireEvent.change(screen.getByLabelText("Custom colour"), { target: { value: "#3366cc" } });

    expect(lastSingle().ground).toBe("#3366cc");
    for (const swatch of group("Colour").getAllByRole("radio")) expect(swatch.getAttribute("aria-checked")).toBe("false");
    expect((screen.getByRole("textbox", { name: "Colour code" }) as HTMLInputElement).value).toBe("#3366cc");
  });

  it("remembers the colour in a later window, and drops a stored one that is not a colour", () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ground: "#2E1A47" }));
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} />);
    expect(lastSingle().ground).toBe("#2e1a47");
    expect(group("Colour").getByRole("radio", { name: "Plum" }).getAttribute("aria-checked")).toBe("true");
    cleanup();

    localStorage.setItem(PREFS_KEY, JSON.stringify({ ground: "nonsense", size: "huge", locale: "fr" }));
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} />);
    expect(lastSingle()).toMatchObject({ ground: null, size: "square", locale: "bn" });
  });

  it("is a row of its own: it reports the colour picked and nothing else", () => {
    const onChange = vi.fn();
    render(<PosterColourRow ground={null} defaultGround="#0E2442" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Sage" }));
    expect(onChange).toHaveBeenCalledWith("#ddebdd");
    fireEvent.click(screen.getByRole("radio", { name: "Design's own colour" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe("the poster window's sizes and themes", () => {
  it("gives one tuition Mist beside Navy and Cream, and no tall list", () => {
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} />);

    expect(group("Theme").getAllByRole("radio").map(radio => radio.textContent)).toEqual(["Navy", "Cream", "Mist"]);
    expect(screen.queryByRole("radio", { name: /Tall list/ })).toBeNull();

    fireEvent.click(group("Theme").getByRole("radio", { name: "Mist" }));
    expect(lastSingle()).toMatchObject({ theme: "mist", size: "square" });
  });

  it("draws one tuition square when a tall list was the saved size", () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ size: "tall" }));
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} />);
    expect(lastSingle().size).toBe("square");
    expect(group("Size").getByRole("radio", { name: /Square/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("gives a run of tuitions Mist and the tall list, which is Mist's alone", () => {
    render(<FacebookPosterModal isOpen onClose={() => {}} jobs={jobs} />);

    expect(group("Theme").getAllByRole("radio").map(radio => radio.textContent)).toEqual(["Navy", "Emerald", "Crimson", "Mist"]);
    fireEvent.click(group("Theme").getByRole("radio", { name: "Crimson" }));
    expect(lastCombined()).toMatchObject({ theme: "crimson", size: "square" });

    fireEvent.click(group("Size").getByRole("radio", { name: "Tall list" }));
    expect(lastCombined()).toMatchObject({ theme: "mist", size: "tall" });
    expect(group("Theme").getAllByRole("radio").map(radio => radio.textContent)).toEqual(["Mist"]);

    // Back to a square: the design that was chosen before comes back.
    fireEvent.click(group("Size").getByRole("radio", { name: /Square/ }));
    expect(lastCombined()).toMatchObject({ theme: "crimson", size: "square" });
  });

  it("counts four tuitions in a square and every one it holds in the tall list", () => {
    const eight = Array.from({ length: 8 }, (_, index) => job(index + 1));
    render(<FacebookPosterModal isOpen onClose={() => {}} jobs={eight} />);
    expect(screen.getByText("4 tuitions")).toBeTruthy();

    fireEvent.click(group("Size").getByRole("radio", { name: "Tall list" }));
    expect(screen.getByText("8 tuitions")).toBeTruthy();
  });

  it("passes the colour to a combined poster too", () => {
    render(<FacebookPosterModal isOpen onClose={() => {}} jobs={jobs} />);
    fireEvent.click(group("Colour").getByRole("radio", { name: "Teal" }));
    expect(lastCombined().ground).toBe("#0e3b43");
  });

  it("asks for the serif only when a Mist poster is drawn", () => {
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} />);
    expect(renderers.fonts).toHaveBeenLastCalledWith(4000, { serif: false });

    fireEvent.click(group("Theme").getByRole("radio", { name: "Mist" }));
    expect(renderers.fonts).toHaveBeenLastCalledWith(4000, { serif: true });
  });
});

describe("the two poster windows on one page", () => {
  /** The page mounts both - one tuition and the bulk poster - and opens one at a time. */
  const page = (open: "single" | "bulk" | "none") => (
    <>
      <FacebookPosterModal isOpen={open === "single"} onClose={() => {}} job={job(113)} />
      <FacebookPosterModal isOpen={open === "bulk"} onClose={() => {}} jobs={jobs} />
    </>
  );

  it("shows in one window the colour picked in the other", () => {
    const view = render(page("single"));
    fireEvent.click(group("Colour").getByRole("radio", { name: "Rose" }));

    view.rerender(page("bulk"));
    expect(lastCombined().ground).toBe("#f7e3e7");
    expect(group("Colour").getByRole("radio", { name: "Rose" }).getAttribute("aria-checked")).toBe("true");
  });

  it("does not write the other window's choices back over its own", () => {
    const view = render(page("single"));
    fireEvent.click(group("Language").getByRole("radio", { name: "English" }));
    view.rerender(page("bulk"));
    fireEvent.click(group("Colour").getByRole("radio", { name: "Teal" }));

    // The language chosen first is still stored, and still the one the single window shows.
    expect(stored()).toMatchObject({ locale: "en", ground: "#0e3b43" });
    view.rerender(page("single"));
    expect(lastSingle()).toMatchObject({ locale: "en", ground: "#0e3b43" });
  });

  it("keeps the choices made in a window whose browser refuses storage", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    try {
      render(page("single"));
      fireEvent.click(group("Colour").getByRole("radio", { name: "Rose" }));
      fireEvent.click(group("Language").getByRole("radio", { name: "English" }));
      expect(lastSingle()).toMatchObject({ locale: "en", ground: "#f7e3e7" });
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});

describe("the caption that goes with a poster", () => {
  const writeText = vi.fn();
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });

  it("has no caption button where the page gives no caption", () => {
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} />);
    expect(screen.queryByRole("button", { name: /Copy caption/ })).toBeNull();
  });

  it("copies the text post of one tuition, asked for one", async () => {
    const caption = vi.fn(() => "Job ID: 6912 | Female Tutor | Class 8");
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} caption={caption} />);

    fireEvent.click(screen.getByRole("button", { name: /Copy caption/ }));

    await vi.waitFor(() => expect(toasts.success).toHaveBeenCalled());
    expect(caption).toHaveBeenCalledWith(1);
    expect(writeText).toHaveBeenCalledWith("Job ID: 6912 | Female Tutor | Class 8");
    expect(toasts.success).toHaveBeenCalledWith("ক্যাপশন কপি হয়েছে। ছবির সাথে পেস্ট করুন।");
  });

  it("asks for the text of as many tuitions as the poster holds: four in a square, all in the tall list", async () => {
    const caption = vi.fn((shown: number) => `post of ${shown}`);
    render(<FacebookPosterModal isOpen onClose={() => {}} jobs={jobs} caption={caption} />);

    fireEvent.click(screen.getByRole("button", { name: /Copy caption/ }));
    await vi.waitFor(() => expect(writeText).toHaveBeenLastCalledWith("post of 4"));

    fireEvent.click(group("Size").getByRole("radio", { name: "Tall list" }));
    fireEvent.click(screen.getByRole("button", { name: /Copy caption/ }));
    await vi.waitFor(() => expect(writeText).toHaveBeenLastCalledWith("post of 6"));
    expect(caption.mock.calls.map(call => call[0])).toEqual([4, 6]);
  });

  it("says so when nothing could be copied", async () => {
    writeText.mockRejectedValue(new Error("blocked"));
    const execCommand = vi.fn(() => false);
    Object.assign(document, { execCommand });
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} caption={() => "text"} />);

    fireEvent.click(screen.getByRole("button", { name: /Copy caption/ }));

    await vi.waitFor(() => expect(toasts.error).toHaveBeenCalledWith("ক্যাপশন কপি করা যায়নি।"));
    expect(toasts.success).not.toHaveBeenCalled();
  });

  it("keeps the caption button beside the image buttons in one row that can wrap", () => {
    render(<FacebookPosterModal isOpen onClose={() => {}} job={job(113)} caption={() => "text"} />);
    const row = screen.getByRole("button", { name: /Copy caption/ }).parentElement!;
    expect(row.className).toContain("flex-wrap");
    expect(within(row).getAllByRole("button").map(button => button.textContent)).toEqual(["Copy caption", "Copy image", "Download PNG"]);
  });
});
