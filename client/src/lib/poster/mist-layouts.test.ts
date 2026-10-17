import { describe, expect, it } from "vitest";
import { groupTuitions, MIST_DEFAULT_GROUND, mistTallHeight, mistTokens } from "./mist-layouts";
import { contrastRatio, luminance } from "./palette";
import type { CombinedPosterInput, PosterTuition } from "./types";

const tuition = (jobId: string, group: string): PosterTuition => ({
  jobId, classes: "Class 8", curricula: group, subjects: "Maths", rowTitle: "Class 8 · Maths", rowMeta: "Area", area: "Area", week: "3 days", time: null,
  tutor: "Any", salary: "৳ 5,000", tutorKind: "any", tutorPill: "MALE / FEMALE", subjectChips: ["Maths"], group: { key: group, label: group }, areaLine: "Area", weekPhrase: "3 days a week",
});

const input = (tuitions: PosterTuition[]): CombinedPosterInput => ({
  locale: "en", tuitions, url: "https://connecttutorsbd.com/job-board", boardAddress: "connecttutorsbd.com/job-board", host: "connecttutorsbd.com", date: "17 October 2026", sub: "Dhaka", subShort: "Dhaka",
});

describe("grouping a tall list", () => {
  it("files each tuition under its curriculum, in the order each first appears", () => {
    const groups = groupTuitions([tuition("1", "B"), tuition("2", "A"), tuition("3", "B"), tuition("4", "C"), tuition("5", "A")]);
    expect(groups.map(group => group.key)).toEqual(["B", "A", "C"]);
    expect(groups.map(group => group.items.map(item => item.jobId))).toEqual([["1", "3"], ["2", "5"], ["4"]]);
  });

  it("makes no group for nothing", () => {
    expect(groupTuitions([])).toEqual([]);
  });
});

describe("how tall the tall list is", () => {
  it("is the header, a bar and count for each group, a card for each tuition, and the footer", () => {
    const one = mistTallHeight(input([tuition("1", "A")]));
    const two = mistTallHeight(input([tuition("1", "A"), tuition("2", "A")]));
    const twoGroups = mistTallHeight(input([tuition("1", "A"), tuition("2", "B")]));
    // A second card in the same group costs one card and its gap; a second group costs a card, a gap and a bar.
    const card = two - one;
    expect(card).toBeGreaterThan(100);
    expect(twoGroups - two).toBeGreaterThan(0);
    expect(twoGroups - one).toBe(card + (twoGroups - two));
  });

  it("is a whole number of pixels, whatever the rows", () => {
    for (let count = 0; count <= 12; count += 1) {
      const height = mistTallHeight(input(Array.from({ length: count }, (_, index) => tuition(String(index), index % 2 ? "A" : "B"))));
      expect(Number.isInteger(height)).toBe(true);
    }
  });
});

describe("Mist's colours", () => {
  it("ships on a pale ground with dark ink, as the sample is", () => {
    const t = mistTokens();
    expect(t.dark).toBe(false);
    expect(t.ground[1]).toBe(MIST_DEFAULT_GROUND);
    expect(luminance(t.ink)).toBeLessThan(0.05);
    expect(contrastRatio(t.ink, t.ground[1])).toBeGreaterThanOrEqual(7);
  });

  it("follows the ground picked: the three stops, the ink and the price tag", () => {
    const night = mistTokens("#14283f");
    expect(night.dark).toBe(true);
    expect(night.ink).toBe("#ffffff");
    expect(night.ground[1]).toBe("#14283f");
    // The tag carries white text on any ground.
    for (const ground of ["#14283f", "#e2eef3", "#f7e3e7", "#ffff00", "#ff0000", "#808080"]) {
      expect(contrastRatio("#ffffff", mistTokens(ground).tagFrom), ground).toBeGreaterThanOrEqual(4.49);
    }
  });

  it("reads its text on the ground at the same contrast as every other design", () => {
    for (const ground of ["#0e2442", "#e2eef3", "#f7e3e7", "#ffff00", "#ff0000", "#808080", "#00ff00"]) {
      const t = mistTokens(ground);
      expect(contrastRatio(t.ink, t.ground[1]), `${ground} ink`).toBeGreaterThanOrEqual(6.99);
      expect(contrastRatio(t.soft, t.ground[1]), `${ground} soft`).toBeGreaterThanOrEqual(4.49);
      expect(contrastRatio(t.accent, t.ground[1]), `${ground} accent`).toBeGreaterThanOrEqual(4.49);
    }
  });
});
