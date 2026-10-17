// @vitest-environment jsdom
import QRCode from "qrcode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { legibleGround } from "./poster/palette";
import {
  COMBINED_POSTER_THEMES,
  combinedPosterInput,
  copyCanvasImageToClipboard,
  downloadCanvasImage,
  autoPosterGround,
  MAX_TALL_TUITIONS,
  posterDimensions,
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

type Drawn = { texts: string[]; fills: string[]; gradients: number };

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
    // Called as a method, so `this` is the context: what colour the fill was set to when it ran.
    fillRect: vi.fn(function (this: { fillStyle: unknown }) { drawn.fills.push(String(this.fillStyle)); }),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn(() => { drawn.gradients += 1; return { addColorStop: vi.fn() }; }),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
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
  drawn = { texts: [], fills: [], gradients: 0 };
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
    const titles = { navy: "আজকের নতুন টিউশন", emerald: "উচ্চ বেতনের টিউশন", crimson: "আজই শিক্ষক প্রয়োজন", mist: "টিউশন বেছে" } as const;
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

describe("the Mist design", () => {
  const need = (category: string) => [{ category, curriculumType: null, classes: [{ classCourse: "Class 8", subjects: ["Mathematics", "Physics", "Chemistry"] }] }];
  const curricula = ["English Medium", "Bangla Medium", "English Version"];
  /** Fourteen tuitions across three curricula: two more than the tall list holds. */
  const mixed = Array.from({ length: 14 }, (_, index) => job(index + 1, {
    learningNeeds: need(curricula[index % 3]),
    preferredGender: [null, "male", "female"][index % 3],
    tuitionLocationLabel: `Area ${index + 1}, Dhaka`,
  }));
  const now = new Date("2026-10-17T06:00:00Z");

  it("draws one tuition square and landscape, in both languages, with the Job ID in Latin digits and the tutor pill", () => {
    for (const size of ["square", "landscape"] as const) {
      for (const locale of ["bn", "en"] as const) {
        drawn.texts = [];
        const canvas = document.createElement("canvas");
        renderSingleTuitionPoster(canvas, job(113), { theme: "mist", size, locale });
        expect([canvas.width, canvas.height]).toEqual(size === "square" ? [1080, 1080] : [1200, 675]);
        const text = allText();
        expect(text).toContain("# JOB ID : 6912");
        expect(text).toContain(locale === "bn" ? "মহিলা শিক্ষক" : "FEMALE TUTOR");
        expect(text).toContain(locale === "bn" ? "৳ ৯,০০০" : "৳ 9,000");
        expect(text).toContain("BTPA");
      }
    }
  });

  it("draws four tuitions square and landscape, never a fifth, each with its kind of tutor", () => {
    for (const size of ["square", "landscape"] as const) {
      drawn.texts = [];
      renderCombinedTuitionsPoster(document.createElement("canvas"), mixed, { theme: "mist", size, locale: "en", now });
      const text = allText();
      for (const id of ["# 6800", "# 6801", "# 6802", "# 6803"]) expect(text, `${size} ${id}`).toContain(id);
      expect(text).not.toContain("# 6804");
      for (const pill of ["MALE / FEMALE", "MALE TUTOR", "FEMALE TUTOR"]) expect(text).toContain(pill);
    }
  });

  it("draws the tall list 1080 wide and as high as its rows, up to twelve, grouped by curriculum", () => {
    const canvas = document.createElement("canvas");
    renderCombinedTuitionsPoster(canvas, mixed, { theme: "mist", size: "tall", locale: "en", now });
    const text = allText();

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(posterDimensions("tall", mixed, "en").height);
    expect(canvas.height).toBeGreaterThan(1080 * 2);
    expect(MAX_TALL_TUITIONS).toBe(12);
    expect(text).toContain("# 6800");
    expect(text).toContain("# 6811");
    expect(text).not.toContain("# 6812");
    // Sections in the order each curriculum first appears, with how many each holds.
    expect(text.indexOf("ENGLISH MEDIUM")).toBeLessThan(text.indexOf("BANGLA MEDIUM"));
    expect(text.indexOf("BANGLA MEDIUM")).toBeLessThan(text.indexOf("ENGLISH VERSION"));
    expect(text).toContain("4 tuitions");
  });

  it("names the sections in Bangla on a Bangla tall list", () => {
    renderCombinedTuitionsPoster(document.createElement("canvas"), mixed, { theme: "mist", size: "tall", locale: "bn", now });
    const text = allText();
    for (const section of ["ইংলিশ মিডিয়াম", "বাংলা মিডিয়াম", "ইংলিশ ভার্সন"]) expect(text).toContain(section);
    expect(text).toContain("৪টি টিউশন");
  });

  it("grows with the number of rows and the number of groups", () => {
    const heightOf = (jobs: typeof mixed) => posterDimensions("tall", jobs, "en").height;
    expect(heightOf(mixed.slice(0, 5))).toBeGreaterThan(heightOf(mixed.slice(0, 2)));
    // Three tuitions in three curricula take more room than three in one: each group has its own bar.
    const oneCurriculum = [0, 3, 6].map(index => mixed[index]);
    const threeCurricula = [0, 1, 2].map(index => mixed[index]);
    expect(heightOf(threeCurricula)).toBeGreaterThan(heightOf(oneCurriculum));
  });

  it("is the only design in the tall list, whatever was asked for", () => {
    const asked = document.createElement("canvas");
    const mist = document.createElement("canvas");
    renderCombinedTuitionsPoster(asked, mixed, { theme: "crimson", size: "tall", locale: "en", now });
    const crimsonText = allText();
    drawn.texts = [];
    renderCombinedTuitionsPoster(mist, mixed, { theme: "mist", size: "tall", locale: "en", now });
    expect(asked.height).toBe(mist.height);
    expect(crimsonText).toBe(allText());
  });

  it("draws one tuition square when a tall poster is asked for", () => {
    const canvas = document.createElement("canvas");
    renderSingleTuitionPoster(canvas, job(113), { theme: "mist", size: "tall", locale: "en" });
    expect([canvas.width, canvas.height]).toEqual([1080, 1080]);
  });

  it("never draws the private address, the institute, an emoji or the old domain", () => {
    renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme: "mist", size: "square", locale: "bn" });
    renderCombinedTuitionsPoster(document.createElement("canvas"), mixed, { theme: "mist", size: "tall", locale: "bn", now });
    const text = allText();
    expect(text).not.toContain("Road 8/A");
    expect(text).not.toContain("BUET");
    expect(text).not.toContain("connect-tutors.com");
    expect(EMOJI.test(text)).toBe(false);
  });

  it("points the QR at this job, or at the whole board", () => {
    const create = vi.spyOn(QRCode, "create");
    renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme: "mist", size: "landscape", locale: "en" });
    expect(create).toHaveBeenCalledWith("https://connecttutorsbd.com/job-board?job=6912", { errorCorrectionLevel: "M" });
    create.mockClear();
    renderCombinedTuitionsPoster(document.createElement("canvas"), mixed, { theme: "mist", size: "tall", locale: "en", now });
    expect(create).toHaveBeenCalledWith("https://connecttutorsbd.com/job-board", { errorCorrectionLevel: "M" });
  });

  it("paints its ground as a gradient", () => {
    renderCombinedTuitionsPoster(document.createElement("canvas"), mixed, { theme: "mist", size: "square", locale: "en", now });
    expect(drawn.gradients).toBeGreaterThan(0);
  });
});

describe("a ground colour picked by the Admin", () => {
  const four = [1, 2, 3, 4].map(id => job(id, { tuitionLocationLabel: `Area ${id}, Dhaka` }));
  const grounds = ["#0e2442", "#f7e3e7", "#808080", "#ff0000", "#ffff00", "#00ff00", "#000000", "#ffffff"];

  it("draws every design in every size on any colour", () => {
    for (const ground of grounds) {
      for (const theme of SINGLE_POSTER_THEMES) {
        for (const size of ["square", "landscape"] as const) {
          renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme, size, locale: "bn", ground });
        }
      }
      for (const theme of COMBINED_POSTER_THEMES) {
        for (const size of ["square", "landscape", "tall"] as const) {
          renderCombinedTuitionsPoster(document.createElement("canvas"), four, { theme, size, locale: "en", ground });
        }
      }
    }
    expect(allText()).toContain("# 6803");
  });

  it("fills a classic design's ground with the colour picked", () => {
    for (const ground of ["#0e2442", "#f7e3e7", "#1a5c3a"]) {
      for (const theme of ["navy", "cream"] as const) {
        drawn.fills = [];
        renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme, size: "square", locale: "bn", ground });
        expect(drawn.fills[0], `${theme} ${ground}`).toBe(ground);
      }
      for (const theme of ["navy", "emerald", "crimson"] as const) {
        drawn.fills = [];
        renderCombinedTuitionsPoster(document.createElement("canvas"), four, { theme, size: "landscape", locale: "bn", ground });
        expect(drawn.fills[0], `${theme} ${ground}`).toBe(ground);
      }
    }
  });

  it("moves a mid-toned colour only as far as legibility needs, and says so by drawing that colour", () => {
    const { ground } = legibleGround("#808080");
    expect(ground).not.toBe("#808080");
    renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme: "navy", size: "square", locale: "bn", ground: "#808080" });
    expect(drawn.fills[0]).toBe(ground);
  });

  it("keeps each design's own colours when no colour is picked, or what is picked is not a colour", () => {
    const own = { navy: "#0E2442", cream: "#FFFEFA" } as const;
    for (const theme of ["navy", "cream"] as const) {
      for (const ground of [undefined, null, "", "not a colour", "#12", "rgb(1,2,3)"]) {
        drawn.fills = [];
        renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme, size: "square", locale: "bn", ground });
        expect(drawn.fills[0], `${theme} ${String(ground)}`).toBe(own[theme]);
      }
    }
    drawn.fills = [];
    renderCombinedTuitionsPoster(document.createElement("canvas"), four, { theme: "emerald", size: "square", locale: "bn" });
    expect(drawn.fills[0]).toBe("#0B3D2E");
  });

  it("reads a three-digit colour too", () => {
    renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme: "navy", size: "square", locale: "bn", ground: "#ABC" });
    expect(drawn.fills[0]).toBe(legibleGround("#aabbcc").ground);
  });

  it("is the same poster as the shipped one when the colour is the design's own ground, up to the text it draws", () => {
    renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme: "navy", size: "square", locale: "bn" });
    const shipped = allText();
    drawn.texts = [];
    renderSingleTuitionPoster(document.createElement("canvas"), job(113), { theme: "navy", size: "square", locale: "bn", ground: "#0e2442" });
    expect(allText()).toBe(shipped);
  });
});

describe("the Auto ground", () => {
  const about = (category: string, over: Partial<FacebookPosterJob> = {}) => job(1, {
    category,
    learningNeeds: [{ category, curriculumType: null, classes: [{ classCourse: "Class 8", subjects: ["Mathematics"] }] }],
    ...over,
  });

  it("is the curriculum's colour when every tuition on the poster is about one curriculum", () => {
    expect(autoPosterGround([about("English Version")])).toBe("#0e3b43");
    expect(autoPosterGround([about("Bangla Medium"), about("Bangla Medium")])).toBe("#0b3d2e");
  });

  it("is the design's own colour (null) when the tuitions are about several curricula", () => {
    expect(autoPosterGround([about("Bangla Medium"), about("English Medium")])).toBeNull();
  });

  it("counts every curriculum of a tuition that asks for two", () => {
    const two = job(1, { learningNeeds: [
      { category: "English Medium", curriculumType: null, classes: [{ classCourse: "Class 3", subjects: ["Maths"] }] },
      { category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 6", subjects: ["Maths"] }] },
    ] });
    expect(autoPosterGround([two])).toBeNull();
  });

  it("reads a tuition kept in the old single-curriculum columns too", () => {
    expect(autoPosterGround([job(1, { learningNeeds: null, category: "Madrasa Medium", classCourse: "Class 5", subjects: JSON.stringify(["Arabic"]) })])).toBe("#2e1a47");
  });

  it("has no ground for no tuitions", () => {
    expect(autoPosterGround([])).toBeNull();
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
