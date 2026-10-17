// @vitest-environment jsdom
import QRCode from "qrcode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMBINED_POSTER_THEMES,
  combinedPosterInput,
  copyCanvasImageToClipboard,
  downloadCanvasImage,
  posterFileName,
  renderCombinedTuitionsPoster,
  renderSingleTuitionPoster,
  SINGLE_POSTER_THEMES,
  toPosterTuition,
  type FacebookPosterJob,
} from "./facebook-poster";

/** A real-shaped Admin row, private fields included, to prove they never reach the canvas. */
const job = (id: number, overrides: Partial<FacebookPosterJob> = {}): FacebookPosterJob & { addressDetails: string; instituteName: string } => ({
  id,
  jobId: String(6799 + id),
  category: "English Version",
  classCourse: "Class 8",
  curriculumType: null,
  subjects: JSON.stringify(["Mathematics", "Physics", "Chemistry"]),
  learningNeeds: [{ category: "English Version", curriculumType: null, classes: [{ classCourse: "Class 8", subjects: ["Mathematics", "Physics", "Chemistry"] }] }],
  tuitionType: "home",
  tuitionLocationLabel: "Dhanmondi, Dhaka",
  budgetAmount: 9000,
  daysPerWeek: 3,
  tutoringTime: "16:30",
  preferredGender: "female",
  addressDetails: "Road 8/A",
  instituteName: "BUET / DU",
  ...overrides,
});

type Drawn = { texts: string[] };

function mockContext(drawn: Drawn) {
  const ctx = {
    font: "",
    letterSpacing: "0px",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    textAlign: "left",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn((text: string) => drawn.texts.push(text)),
    measureText: vi.fn((text: string) => ({ width: text.length * 12 })),
    createPattern: vi.fn(() => ({})),
    createImageData: vi.fn((w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) })),
    putImageData: vi.fn(),
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

let drawn: Drawn;

beforeEach(() => {
  drawn = { texts: [] };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => mockContext(drawn) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const allText = () => drawn.texts.join("\n");
const EMOJI = /\p{Extended_Pictographic}/u;

describe("one-tuition poster", () => {
  it("draws every theme in both sizes and both languages at the right canvas size", () => {
    for (const theme of SINGLE_POSTER_THEMES) {
      for (const size of ["square", "landscape"] as const) {
        for (const locale of ["bn", "en"] as const) {
          const canvas = document.createElement("canvas");
          renderSingleTuitionPoster(canvas, job(113), { theme, size, locale });
          expect([canvas.width, canvas.height]).toEqual(size === "square" ? [1080, 1080] : [1200, 675]);
        }
      }
    }
  });

  it("prints the job in Bangla with the Job ID kept in Latin digits", () => {
    renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme: "navy", size: "square", locale: "bn" });
    const text = allText();
    expect(text).toContain("# JOB ID : 6912");
    expect(text).toContain("ক্লাস ৮");
    expect(text).toContain("ইংলিশ ভার্সন");
    expect(text).toContain("গণিত · পদার্থবিজ্ঞান · রসায়ন");
    expect(text).toContain("বিকাল ৪:৩০");
    expect(text).toContain("৳ ৯,০০০");
    expect(text).toContain("connecttutorsbd.com");
    expect(text).toContain("BTPA");
  });

  it("prints English words on the English poster", () => {
    renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme: "cream", size: "landscape", locale: "en" });
    const text = allText();
    for (const word of ["Class 8", "English Version", "4:30 PM", "Female", "৳ 9,000", "Scan to apply"]) expect(text).toContain(word);
  });

  it("never draws the private address, the institute, an emoji or the old domain", () => {
    for (const theme of SINGLE_POSTER_THEMES) {
      renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme, size: "square", locale: "bn" });
    }
    const text = allText();
    expect(text).not.toContain("Road 8/A");
    expect(text).not.toContain("BUET");
    expect(text).not.toContain("connect-tutors.com");
    expect(EMOJI.test(text)).toBe(false);
  });

  it("points the QR at this job on the live Job Board", () => {
    const create = vi.spyOn(QRCode, "create");
    renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme: "navy", size: "square", locale: "en" });
    expect(create).toHaveBeenCalledWith("https://connecttutorsbd.com/job-board?job=6912", { errorCorrectionLevel: "M" });
  });

  it("leaves the time out when the Guardian gave none, and the salary when there is none", () => {
    renderSingleTuitionPoster(document.createElement("canvas"), job(113, { tutoringTime: null, budgetAmount: null }), { theme: "navy", size: "square", locale: "bn" });
    const text = allText();
    expect(text).not.toContain("সময়");
    expect(text).not.toContain("মাসিক বেতন");
  });
});

describe("combined poster", () => {
  const six = [1, 2, 3, 4, 5, 6].map(id => job(id, { tuitionLocationLabel: `Area ${id}, Dhaka` }));

  it("draws every theme in both sizes, never more than four tuitions", () => {
    for (const theme of COMBINED_POSTER_THEMES) {
      for (const size of ["square", "landscape"] as const) {
        drawn.texts = [];
        const canvas = document.createElement("canvas");
        renderCombinedTuitionsPoster(canvas, six, { theme, size, locale: "en", now: new Date("2026-10-17T06:00:00Z") });
        expect([canvas.width, canvas.height]).toEqual(size === "square" ? [1080, 1080] : [1200, 675]);
        const text = allText();
        expect(text).toContain("# 6803");
        expect(text).not.toContain("# 6804");
        expect(text).not.toContain("Road 8/A");
        expect(EMOJI.test(text)).toBe(false);
      }
    }
  });

  it("titles each theme its own way", () => {
    const titles = { navy: "আজকের নতুন টিউশন", emerald: "উচ্চ বেতনের টিউশন", crimson: "আজই শিক্ষক প্রয়োজন" } as const;
    for (const theme of COMBINED_POSTER_THEMES) {
      drawn.texts = [];
      renderCombinedTuitionsPoster(document.createElement("canvas"), six, { theme, size: "square", locale: "bn" });
      expect(allText()).toContain(titles[theme]);
    }
  });

  it("points the QR at the whole Job Board", () => {
    const create = vi.spyOn(QRCode, "create");
    renderCombinedTuitionsPoster(document.createElement("canvas"), six, { theme: "crimson", size: "landscape", locale: "bn" });
    expect(create).toHaveBeenCalledWith("https://connecttutorsbd.com/job-board", { errorCorrectionLevel: "M" });
  });

  it("names the shared city once and drops it from each row", () => {
    const input = combinedPosterInput(six, "bn", new Date("2026-10-17T06:00:00Z"));
    expect(input.tuitions).toHaveLength(4);
    expect(input.sub).toBe("Dhaka · ৪টি টিউশন · শিক্ষক প্রয়োজন");
    expect(input.tuitions[0].rowMeta).toBe("Area 1 · সপ্তাহে ৩ দিন");
    expect(input.date).toBe("১৭ অক্টোবর ২০২৬");
    const mixed = combinedPosterInput([job(1), job(2, { tuitionLocationLabel: "Nasirabad, Chattogram" })], "en");
    expect(mixed.subShort).toBe("2 tuitions");
    expect(mixed.tuitions[0].rowMeta).toBe("Dhanmondi, Dhaka · 3 days a week");
  });
});

describe("poster helpers", () => {
  it("words a row title from the learning needs", () => {
    expect(toPosterTuition(job(113), "bn").rowTitle).toBe("ক্লাস ৮ · গণিত, পদার্থবিজ্ঞান +১টি");
  });

  it("names files by job or count, theme, language and size", () => {
    expect(posterFileName({ jobId: "6912" }, "navy", "bn", "square")).toBe("connect-tutors-6912-navy-bn-square.png");
    expect(posterFileName({ count: 4 }, "crimson", "en", "landscape")).toBe("connect-tutors-4-tuitions-crimson-en-landscape.png");
  });

  it("reports a browser that cannot copy images as unsupported", async () => {
    vi.stubGlobal("ClipboardItem", undefined);
    expect(await copyCanvasImageToClipboard(document.createElement("canvas"))).toBe("unsupported");
    vi.unstubAllGlobals();
  });

  it("downloads through a temporary link", async () => {
    const canvas = document.createElement("canvas");
    canvas.toBlob = (callback: BlobCallback) => callback(new Blob(["png"], { type: "image/png" }));
    const createObjectURL = vi.fn(() => "blob:poster");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    expect(await downloadCanvasImage(canvas, "poster")).toBe(true);
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
