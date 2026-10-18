/**
 * The video's music: made in the browser, note by note, so there is nothing to
 * license. A calm, warm loop - soft pads under a slow bell, a low root under
 * each chord - fading in at the start and out at the end; and, in slides, the
 * soft swish of a page at every turn.
 *
 * `musicPlan` says what plays when (plain numbers, so it can be checked);
 * `renderMusic` plays it into an AudioBuffer with the browser's own audio
 * engine, faster than real time.
 */

export const MUSIC_SAMPLE_RATE = 48_000;

/** 84 beats a minute, four to a bar: unhurried. */
const BEAT = 60 / 84;
const BAR = BEAT * 4;

/** Note frequencies by MIDI number (69 is A4, 440 Hz). */
function hz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * A four-bar loop in D major: Dmaj7, Bm7, Gmaj7, A6 - warm, with no pull to an
 * end, so it can loop for any length. Each chord as its pad notes (around the
 * middle of the keyboard), its bell notes (an octave up) and its root.
 */
const CHORDS: Array<{ pad: number[]; bell: number[]; root: number }> = [
  { pad: [62, 66, 69, 73], bell: [74, 78, 81, 85], root: 38 },
  { pad: [59, 62, 66, 69], bell: [71, 74, 78, 81], root: 35 },
  { pad: [55, 59, 62, 66], bell: [67, 71, 74, 78], root: 31 },
  { pad: [57, 61, 64, 66], bell: [69, 73, 76, 78], root: 33 },
];

export type MusicPlan = {
  /** Seconds. */
  length: number;
  pads: Array<{ start: number; end: number; frequency: number }>;
  bells: Array<{ time: number; frequency: number; pan: number }>;
  roots: Array<{ start: number; end: number; frequency: number }>;
  /** When a page swishes over, in slides. */
  turns: number[];
  fadeIn: number;
  fadeOut: number;
};

/**
 * What plays when, for a video `length` seconds long: a chord a bar, each held
 * a little into the next so they blend; a bell on every beat from the second
 * bar, stepping through the chord and swaying left and right; the root under
 * every chord; and a page sound at each of `turns`.
 */
export function musicPlan(length: number, turns: number[] = []): MusicPlan {
  const pads: MusicPlan["pads"] = [];
  const bells: MusicPlan["bells"] = [];
  const roots: MusicPlan["roots"] = [];
  for (let bar = 0; bar * BAR < length; bar += 1) {
    const chord = CHORDS[bar % CHORDS.length]!;
    const start = bar * BAR;
    const end = Math.min(length, start + BAR + 0.6);
    for (const note of chord.pad) pads.push({ start, end, frequency: hz(note) });
    roots.push({ start, end: Math.min(length, start + BAR), frequency: hz(chord.root) });
    if (bar === 0) continue;
    for (let beat = 0; beat < 4; beat += 1) {
      const time = start + beat * BEAT;
      if (time >= length - 1) break;
      bells.push({ time, frequency: hz(chord.bell[(bar + beat) % chord.bell.length]!), pan: beat % 2 === 0 ? -0.3 : 0.3 });
    }
  }
  return { length, pads, bells, roots, turns: turns.filter(time => time >= 0 && time < length), fadeIn: Math.min(1.2, length / 4), fadeOut: Math.min(2, length / 3) };
}

/** A fixed run of noise, the same every time, for the page sound. */
function noise(context: BaseAudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(seconds * context.sampleRate), context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 22_222;
  for (let index = 0; index < data.length; index += 1) {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    data[index] = (seed / 1_073_741_824) - 1;
  }
  return buffer;
}

/**
 * Plays `plan` into a stereo AudioBuffer, or null where the browser has no
 * offline audio engine (a test, an old browser).
 */
export async function renderMusic(plan: MusicPlan, sampleRate = MUSIC_SAMPLE_RATE): Promise<AudioBuffer | null> {
  if (typeof OfflineAudioContext === "undefined" || plan.length <= 0) return null;
  const context = new OfflineAudioContext(2, Math.ceil(plan.length * sampleRate), sampleRate);

  // Everything through one gentle compressor and the fade in and out.
  const master = context.createGain();
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(1, plan.fadeIn);
  master.gain.setValueAtTime(1, Math.max(plan.fadeIn, plan.length - plan.fadeOut));
  master.gain.linearRampToValueAtTime(0, plan.length);
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;
  master.connect(compressor).connect(context.destination);

  // Pads: two softly detuned voices a note, rounded off by a low-pass filter, swelling in and out.
  const padBus = context.createBiquadFilter();
  padBus.type = "lowpass";
  padBus.frequency.value = 1600;
  const padLevel = context.createGain();
  padLevel.gain.value = 0.055;
  padBus.connect(padLevel).connect(master);
  for (const pad of plan.pads) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, pad.start);
    envelope.gain.linearRampToValueAtTime(1, pad.start + 0.9);
    envelope.gain.setValueAtTime(1, Math.max(pad.start + 0.9, pad.end - 1));
    envelope.gain.linearRampToValueAtTime(0, pad.end);
    envelope.connect(padBus);
    for (const [type, cents] of [["sine", -6], ["triangle", 6]] as const) {
      const voice = context.createOscillator();
      voice.type = type;
      voice.frequency.value = pad.frequency;
      voice.detune.value = cents;
      voice.connect(envelope);
      voice.start(pad.start);
      voice.stop(pad.end);
    }
  }

  // Roots: a quiet low sine under each chord.
  for (const root of plan.roots) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, root.start);
    envelope.gain.linearRampToValueAtTime(0.07, root.start + 0.08);
    envelope.gain.exponentialRampToValueAtTime(0.0005, Math.max(root.start + 0.1, root.end));
    const voice = context.createOscillator();
    voice.type = "sine";
    voice.frequency.value = root.frequency;
    voice.connect(envelope).connect(master);
    voice.start(root.start);
    voice.stop(root.end);
  }

  // Bells: a pure tone with a touch of its octave, struck and left to ring away.
  for (const bell of plan.bells) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, bell.time);
    envelope.gain.linearRampToValueAtTime(0.045, bell.time + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0003, bell.time + 1.4);
    const pan = context.createStereoPanner();
    pan.pan.value = bell.pan;
    envelope.connect(pan).connect(master);
    for (const [multiple, level] of [[1, 1], [2, 0.18]] as const) {
      const voice = context.createOscillator();
      voice.type = "sine";
      voice.frequency.value = bell.frequency * multiple;
      const partial = context.createGain();
      partial.gain.value = level;
      voice.connect(partial).connect(envelope);
      voice.start(bell.time);
      voice.stop(bell.time + 1.5);
    }
  }

  // A page: a short swish of noise, its pitch falling as it lands.
  if (plan.turns.length > 0) {
    const swish = noise(context, 0.5);
    for (const time of plan.turns) {
      const source = context.createBufferSource();
      source.buffer = swish;
      const band = context.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = 0.9;
      band.frequency.setValueAtTime(3200, time);
      band.frequency.exponentialRampToValueAtTime(900, time + 0.35);
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(0.14, time + 0.03);
      envelope.gain.exponentialRampToValueAtTime(0.0005, time + 0.42);
      source.connect(band).connect(envelope).connect(master);
      source.start(time);
      source.stop(time + 0.5);
    }
  }

  return context.startRendering();
}
