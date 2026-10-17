// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FacebookPosterJob } from "@/lib/facebook-poster";

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  withMotion: vi.fn(),
  record: vi.fn(),
  run: vi.fn(),
  download: vi.fn(),
  canRecord: vi.fn(() => true),
  copy: vi.fn(async () => true),
}));

vi.mock("@/lib/facebook-video", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/facebook-video")>();
  return {
    ...actual,
    prepareReel: mocks.prepare,
    withMotion: mocks.withMotion,
    recordReel: mocks.record,
    runReel: mocks.run,
    downloadVideo: mocks.download,
    canRecordVideo: mocks.canRecord,
    drawReelFrame: vi.fn(),
    releaseReel: vi.fn(),
    pickVideoMimeType: () => "video/mp4;codecs=avc1.640028",
  };
});
vi.mock("@/lib/facebook-poster", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/facebook-poster")>();
  return { ...actual, loadPosterFonts: () => Promise.resolve() };
});
vi.mock("@/lib/siteContent", () => ({ useSiteContact: () => ({ number: "8801516131411", display: "+8801516131411" }) }));
vi.mock("@/lib/copyToClipboard", () => ({ copyToClipboard: mocks.copy }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { toast } from "sonner";
import FacebookVideoModal from "./FacebookVideoModal";

const job = (id: number): FacebookPosterJob => ({
  id,
  jobId: String(6799 + id),
  learningNeeds: [{ category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["Bangla"] }] }],
  tuitionType: "home",
  tuitionLocationLabel: "Mirpur 10, Dhaka",
  budgetAmount: 9000,
  daysPerWeek: 3,
  preferredGender: "female",
});
const jobs = [job(1), job(2), job(3)];

/** A painted reel as the window sees it: its size and how long it runs. */
const reel = (total: number) => ({ width: 1080, height: 1920, timeline: { total }, layout: {}, strips: [], background: {}, fades: {} });

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.canRecord.mockReturnValue(true);
  mocks.prepare.mockImplementation(() => reel(21.1));
  mocks.withMotion.mockImplementation((current: { timeline: { total: number } }, motion: { speed: string; opening?: boolean }) => ({ ...current, timeline: { total: (motion.speed === "fast" ? 12 : 21.1) - (motion.opening === false ? 0.5 : 0) } }));
  mocks.run.mockResolvedValue(true);
  mocks.record.mockResolvedValue({ blob: new Blob(["video"], { type: "video/mp4" }), mimeType: "video/mp4;codecs=avc1.640028" });
});

afterEach(cleanup);

function open(caption?: (shown: number) => string) {
  render(<FacebookVideoModal onClose={vi.fn()} jobs={jobs} caption={caption} />);
}

describe("the Facebook video window", () => {
  it("names how many tuitions it holds and how long it runs, with the language, size, speed and colour to choose", async () => {
    open(() => "caption");

    expect(screen.getByRole("heading", { name: "Facebook Video" })).toBeDefined();
    await waitFor(() => expect(screen.getByText("3 tuitions · 0:21")).toBeDefined());
    for (const name of ["Language", "Size", "Style", "Speed", "Opening", "Closing", "Colour"]) expect(screen.getByRole("radiogroup", { name })).toBeDefined();
    const sizes = within(screen.getByRole("radiogroup", { name: "Size" }));
    for (const name of [/Reels 1080×1920/, /Feed 1080×1350/, /Square 1080×1080/]) expect(sizes.getByRole("radio", { name })).toBeDefined();
    expect(screen.getByRole("button", { name: /Copy caption/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Play/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Download MP4/ })).toBeDefined();
  });

  it("starts as a slow Reels video on the poster's language and colour", async () => {
    localStorage.setItem("connect_tutors_fb_poster_prefs_v1", JSON.stringify({ locale: "en", size: "square", singleTheme: "navy", combinedTheme: "navy", ground: "#0e2442" }));
    open();

    await waitFor(() => expect(mocks.prepare).toHaveBeenCalled());
    const [input, options] = mocks.prepare.mock.calls.at(-1)!;
    expect(input.locale).toBe("en");
    expect(input.tuitions).toHaveLength(3);
    expect(input.whatsapp).toBe("+8801516131411");
    expect(options).toEqual({ size: "reels", style: "scroll", speed: "slow", opening: true, closing: true, ground: "#0e2442" });
  });

  it("paints again for another size, and only re-times for another speed, remembering both apart from the poster's choices", async () => {
    open();
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("radio", { name: /Feed 1080×1350/ }));
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(2));
    expect(mocks.prepare.mock.calls.at(-1)![1]).toMatchObject({ size: "feed" });

    fireEvent.click(screen.getByRole("radio", { name: "Fast" }));
    await waitFor(() => expect(mocks.withMotion).toHaveBeenLastCalledWith(expect.anything(), { speed: "fast", opening: true, closing: true }));
    expect(mocks.prepare).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByText("3 tuitions · 0:12")).toBeDefined());

    expect(JSON.parse(localStorage.getItem("connect_tutors_fb_video_prefs_v1") ?? "{}")).toEqual({ size: "feed", style: "scroll", speed: "fast", opening: true, closing: true });
    expect(JSON.parse(localStorage.getItem("connect_tutors_fb_poster_prefs_v1") ?? "null")).toBeNull();
  });

  it("turns the opening and the closing page turn on and off apart, re-timing the video without painting it again, and remembers both", async () => {
    open();
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(1));
    const opening = within(screen.getByRole("radiogroup", { name: "Opening" }));
    const closing = within(screen.getByRole("radiogroup", { name: "Closing" }));
    expect(opening.getByRole("radio", { name: "On" }).getAttribute("aria-checked")).toBe("true");
    expect(closing.getByRole("radio", { name: "On" }).getAttribute("aria-checked")).toBe("true");

    fireEvent.click(opening.getByRole("radio", { name: "Off" }));
    await waitFor(() => expect(mocks.withMotion).toHaveBeenLastCalledWith(expect.anything(), { speed: "slow", opening: false, closing: true }));
    fireEvent.click(closing.getByRole("radio", { name: "Off" }));
    await waitFor(() => expect(mocks.withMotion).toHaveBeenLastCalledWith(expect.anything(), { speed: "slow", opening: false, closing: false }));

    expect(mocks.prepare).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem("connect_tutors_fb_video_prefs_v1") ?? "{}")).toEqual({ size: "reels", style: "scroll", speed: "slow", opening: false, closing: false });
  });

  it("starts with both page turns off when they were left off", async () => {
    localStorage.setItem("connect_tutors_fb_video_prefs_v1", JSON.stringify({ size: "reels", speed: "slow", opening: false, closing: true }));
    open();

    await waitFor(() => expect(mocks.prepare).toHaveBeenCalled());
    expect(mocks.prepare.mock.calls.at(-1)![1]).toMatchObject({ opening: false, closing: true });
    expect(within(screen.getByRole("radiogroup", { name: "Opening" })).getByRole("radio", { name: "Off" }).getAttribute("aria-checked")).toBe("true");
  });

  it("paints the tuitions in pages when Slides is chosen, and again as a scroll when Scroll is, remembering the choice apart from the poster's", async () => {
    open();
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(1));
    expect(mocks.prepare.mock.calls.at(-1)![1]).toMatchObject({ style: "scroll" });
    const style = within(screen.getByRole("radiogroup", { name: "Style" }));

    fireEvent.click(style.getByRole("radio", { name: "Slides" }));
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(2));
    expect(mocks.prepare.mock.calls.at(-1)![1]).toMatchObject({ style: "slides" });
    expect(JSON.parse(localStorage.getItem("connect_tutors_fb_video_prefs_v1") ?? "{}")).toMatchObject({ style: "slides" });
    expect(JSON.parse(localStorage.getItem("connect_tutors_fb_poster_prefs_v1") ?? "null")).toBeNull();

    // The speed and the page turns still only re-time it.
    fireEvent.click(screen.getByRole("radio", { name: "Fast" }));
    await waitFor(() => expect(mocks.withMotion).toHaveBeenLastCalledWith(expect.anything(), { speed: "fast", opening: true, closing: true }));
    expect(mocks.prepare).toHaveBeenCalledTimes(2);

    fireEvent.click(style.getByRole("radio", { name: "Scroll" }));
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(3));
    expect(mocks.prepare.mock.calls.at(-1)![1]).toMatchObject({ style: "scroll" });
  });

  it("starts on Slides when it was left there, and says so in the file's name", async () => {
    localStorage.setItem("connect_tutors_fb_video_prefs_v1", JSON.stringify({ size: "reels", style: "slides", speed: "slow", opening: true, closing: true }));
    open();
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalled());
    expect(mocks.prepare.mock.calls.at(-1)![1]).toMatchObject({ style: "slides" });
    expect(within(screen.getByRole("radiogroup", { name: "Style" })).getByRole("radio", { name: "Slides" }).getAttribute("aria-checked")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /Download MP4/ }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalled());
    expect(mocks.download.mock.calls[0]![1]).toBe("connect-tutors-3-tuitions-reels-slides-bn.mp4");
  });

  it("shares the language and the colour with the poster window", async () => {
    open();
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    fireEvent.click(screen.getByRole("radio", { name: "Emerald" }));

    await waitFor(() => expect(mocks.prepare.mock.calls.at(-1)![1]).toMatchObject({ ground: "#0b3d2e" }));
    expect(mocks.prepare.mock.calls.at(-1)![0].locale).toBe("en");
    expect(JSON.parse(localStorage.getItem("connect_tutors_fb_poster_prefs_v1") ?? "{}")).toMatchObject({ locale: "en", ground: "#0b3d2e" });
  });

  it("records the video and saves it under a name that says what is in it", async () => {
    open();
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Download MP4/ }));

    await waitFor(() => expect(mocks.download).toHaveBeenCalled());
    expect(mocks.record).toHaveBeenCalledTimes(1);
    expect(mocks.download.mock.calls[0]![1]).toBe("connect-tutors-3-tuitions-reels-bn.mp4");
    expect(toast.success).toHaveBeenCalledWith("ভিডিও ডাউনলোড হয়েছে।");
  });

  it("says so, and records nothing, in a browser that cannot record", async () => {
    mocks.canRecord.mockReturnValue(false);
    open();
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Download MP4/ }));

    expect(toast.error).toHaveBeenCalledWith("এই ব্রাউজারে ভিডিও বানানো যায় না। কম্পিউটারের Chrome বা Edge-এ চেষ্টা করুন।");
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("plays the video in the window, and copies the caption for as many tuitions as it shows", async () => {
    const caption = vi.fn(() => "Area Grouped caption");
    open(caption);
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Play/ }));
    await waitFor(() => expect(mocks.run).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /Copy caption/ }));
    await waitFor(() => expect(mocks.copy).toHaveBeenCalledWith("Area Grouped caption"));
    expect(caption).toHaveBeenCalledWith(3);
  });
});
