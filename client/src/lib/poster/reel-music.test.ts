import { afterEach, describe, expect, it, vi } from "vitest";
import { musicPlan, renderMusic } from "./reel-music";

const BAR = (60 / 84) * 4;

afterEach(() => vi.unstubAllGlobals());

describe("what the music plays", () => {
  it("lays a four-note chord a bar, each held a little into the next so they blend, with a root under it", () => {
    const plan = musicPlan(20);

    const bars = Math.ceil(20 / BAR);
    expect(plan.pads).toHaveLength(bars * 4);
    expect(plan.roots).toHaveLength(bars);
    const first = plan.pads.slice(0, 4);
    for (const pad of first) {
      expect(pad.start).toBe(0);
      expect(pad.end).toBeGreaterThan(BAR);
    }
    // D major 7 to start: D4 is about 293.7 Hz.
    expect(first[0]!.frequency).toBeCloseTo(293.66, 1);
    for (const pad of plan.pads) expect(pad.end).toBeLessThanOrEqual(20);
  });

  it("rings a bell on each beat from the second bar, swaying left and right, and none in the last second", () => {
    const plan = musicPlan(20);

    expect(plan.bells.length).toBeGreaterThan(10);
    expect(Math.min(...plan.bells.map(bell => bell.time))).toBeCloseTo(BAR);
    expect(Math.max(...plan.bells.map(bell => bell.time))).toBeLessThan(19);
    expect(new Set(plan.bells.map(bell => bell.pan))).toEqual(new Set([-0.3, 0.3]));
  });

  it("fades in and out over a share of the length, and keeps only the page sounds inside it", () => {
    expect(musicPlan(20)).toMatchObject({ fadeIn: 1.2, fadeOut: 2 });
    const short = musicPlan(3);
    expect(short.fadeIn).toBeCloseTo(0.75);
    expect(short.fadeOut).toBeCloseTo(1);
    expect(musicPlan(20, [-1, 2.5, 9, 25]).turns).toEqual([2.5, 9]);
  });

  it("is the same every time", () => {
    expect(musicPlan(33, [4, 12])).toEqual(musicPlan(33, [4, 12]));
  });
});

describe("playing it", () => {
  it("makes nothing where the browser has no offline audio engine", async () => {
    vi.stubGlobal("OfflineAudioContext", undefined);
    expect(await renderMusic(musicPlan(10))).toBeNull();
  });

  it("plays every note and page sound once, through one fade, into a stereo buffer the length of the video", async () => {
    const started: string[] = [];
    const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
    const node = () => ({ connect: vi.fn((next: unknown) => next) });
    const rendered = { numberOfChannels: 2 };
    let created: { channels: number; frames: number; rate: number } | null = null;
    class FakeOfflineAudioContext {
      destination = {};
      sampleRate: number;
      constructor(channels: number, frames: number, rate: number) {
        created = { channels, frames, rate };
        this.sampleRate = rate;
      }
      createGain() { return { ...node(), gain: param() }; }
      createDynamicsCompressor() { return { ...node(), threshold: param(), ratio: param() }; }
      createBiquadFilter() { return { ...node(), type: "", frequency: param(), Q: param() }; }
      createStereoPanner() { return { ...node(), pan: param() }; }
      createOscillator() { return { ...node(), type: "", frequency: param(), detune: param(), start: () => started.push("tone"), stop: vi.fn() }; }
      createBufferSource() { return { ...node(), buffer: null, start: () => started.push("swish"), stop: vi.fn() }; }
      createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
      startRendering() { return Promise.resolve(rendered); }
    }
    vi.stubGlobal("OfflineAudioContext", FakeOfflineAudioContext);
    const plan = musicPlan(12, [3, 7]);

    expect(await renderMusic(plan)).toBe(rendered);
    expect(created).toEqual({ channels: 2, frames: 12 * 48_000, rate: 48_000 });
    // Two voices a pad note, one a root, two a bell; one swish a page.
    expect(started.filter(kind => kind === "tone")).toHaveLength(plan.pads.length * 2 + plan.roots.length + plan.bells.length * 2);
    expect(started.filter(kind => kind === "swish")).toHaveLength(2);
  });
});
