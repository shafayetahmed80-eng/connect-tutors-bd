// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  downloadCanvasImage,
  drawQrCode,
  drawRoundedRect,
  exportCanvasToBlob,
  FacebookPosterJob,
  POSTER_THEMES,
  renderBulkTuitionsPoster,
  renderSingleTuitionPoster,
} from "./facebook-poster";

describe("facebook-poster generator", () => {
  const sampleJob: FacebookPosterJob = {
    id: 101,
    jobId: "CT-101",
    classCourse: "Class 10",
    category: "English Version",
    curriculumType: "National Curriculum",
    subjects: JSON.stringify(["Higher Math", "Physics"]),
    tuitionType: "home",
    tuitionLocationLabel: "Dhanmondi, Dhaka",
    locationText: "Dhanmondi",
    addressDetails: "Road 8/A",
    budgetAmount: 9000,
    daysPerWeek: 3,
    tutoringTime: "6:00 PM",
    studentGender: "male",
    studentCount: 1,
    preferredGender: "female",
    instituteName: "BUET / DU",
    origin: "https://connect-tutors.com",
  };

  const mockCtx = () => {
    return {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "",
      textBaseline: "",
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    } as unknown as CanvasRenderingContext2D;
  };

  it("sets 1080x1080 dimensions for square ratio and renders single tuition poster", () => {
    const canvas = document.createElement("canvas");
    const ctx = mockCtx();
    vi.spyOn(canvas, "getContext").mockReturnValue(ctx);

    renderSingleTuitionPoster(canvas, sampleJob, { ratio: "square", theme: "navy" });

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1080);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith("Connect Tutors", expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith(expect.stringContaining("BTPA - 077"), expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith(expect.stringContaining("connect-tutors.com"), expect.any(Number), expect.any(Number));
  });

  it("sets 1200x675 dimensions for landscape ratio and renders single tuition poster", () => {
    const canvas = document.createElement("canvas");
    const ctx = mockCtx();
    vi.spyOn(canvas, "getContext").mockReturnValue(ctx);

    renderSingleTuitionPoster(canvas, sampleJob, { ratio: "landscape", theme: "emerald" });

    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(675);
    expect(ctx.fillText).toHaveBeenCalledWith("Connect Tutors", expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith(expect.stringContaining("BTPA - 077"), expect.any(Number), expect.any(Number));
  });

  it("renders with crimson theme and custom headline", () => {
    const canvas = document.createElement("canvas");
    const ctx = mockCtx();
    vi.spyOn(canvas, "getContext").mockReturnValue(ctx);

    renderSingleTuitionPoster(canvas, sampleJob, {
      ratio: "square",
      theme: "crimson",
      headline: "HOT TUITION",
    });

    expect(ctx.fillText).toHaveBeenCalledWith("HOT TUITION", expect.any(Number), expect.any(Number));
  });

  it("draws QR code without error", () => {
    const ctx = mockCtx();
    drawQrCode(ctx, "https://connect-tutors.com/jobs?jobId=CT-101", 100, 100, 80);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("draws rounded rectangle with fallback when roundRect is missing", () => {
    const ctx = mockCtx();
    drawRoundedRect(ctx, 10, 10, 100, 50, 8);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arcTo).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
  });

  it("renders bulk tuitions grid poster up to 4 jobs", () => {
    const canvas = document.createElement("canvas");
    const ctx = mockCtx();
    vi.spyOn(canvas, "getContext").mockReturnValue(ctx);

    const jobsList = [
      sampleJob,
      { ...sampleJob, id: 102, jobId: "CT-102" },
      { ...sampleJob, id: 103, jobId: "CT-103" },
    ];

    renderBulkTuitionsPoster(canvas, jobsList, { ratio: "square", theme: "navy" });

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1080);
    expect(ctx.fillText).toHaveBeenCalledWith("Connect Tutors", expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith(expect.stringContaining("AVAILABLE TUITIONS (3)"), expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith(expect.stringContaining("BTPA - 077"), expect.any(Number), expect.any(Number));
  });

  it("exports canvas to blob", async () => {
    const canvas = document.createElement("canvas");
    const fakeBlob = new Blob(["image data"], { type: "image/png" });
    canvas.toBlob = vi.fn().mockImplementation((cb: (b: Blob | null) => void) => cb(fakeBlob));

    const blob = await exportCanvasToBlob(canvas);
    expect(blob).toBe(fakeBlob);
  });

  it("triggers download of canvas image", () => {
    const canvas = document.createElement("canvas");
    canvas.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,12345");

    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");

    downloadCanvasImage(canvas, "connect-tutors-CT-101.png");

    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });
});
