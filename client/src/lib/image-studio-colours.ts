import { colourContrast, MIN_TEXT_CONTRAST } from "@shared/colour-contrast";

/**
 * The Image Section's colour pairs: a ground, the text set on it and a highlight.
 * Five ship with the site (picked from the Owner's colour specimen page, codes
 * P1 - P15); the Project Owner saves more, which join as O1, O2 ... for every Admin.
 */
export type StudioColour = {
  id: string;
  code: string;
  name: string;
  ground: string;
  text: string;
  accent: string;
  /** Saved by the Owner rather than shipped with the site. */
  own?: boolean;
};

export const studioColours: readonly StudioColour[] = [
  { id: "site-blue", code: "P1", name: "Site Blue", ground: "#0b4b86", text: "#ffffff", accent: "#7cc4ff" },
  { id: "sky-wash", code: "P4", name: "Sky Wash", ground: "#dff2ff", text: "#0b3558", accent: "#1677e8" },
  { id: "deep-teal", code: "P5", name: "Deep Teal", ground: "#0e4f55", text: "#f2fbfa", accent: "#ffc857" },
  { id: "paper", code: "P14", name: "Paper", ground: "#faf7f0", text: "#16202c", accent: "#1677e8" },
  { id: "mint", code: "P15", name: "Mint", ground: "#dff5e8", text: "#0c3b26", accent: "#0f8a5f" },
];

export const DEFAULT_STUDIO_COLOUR = "site-blue";

export type OwnStudioColour = { id: string; name: string; ground: string; text: string; accent: string };

let ownColours: StudioColour[] = [];

/** The Owner's saved pairs join the list as O1, O2 ... in the order they were saved. */
export function setOwnStudioColours(list: readonly OwnStudioColour[]) {
  ownColours = list.map((colour, index) => ({ ...colour, code: `O${index + 1}`, own: true }));
}

export function allStudioColours(): readonly StudioColour[] {
  return ownColours.length ? [...studioColours, ...ownColours] : studioColours;
}

export function findStudioColour(id: string) {
  return allStudioColours().find(colour => colour.id === id);
}

export type StudioColourMarks = Map<string, { starred: boolean; archived: boolean }>;

/** Archived pairs left out unless asked for, starred ones first, the rest in list order. */
export function visibleStudioColours(options: { marks: StudioColourMarks; showArchived?: boolean }) {
  const colours = allStudioColours().filter(colour => (options.marks.get(colour.id)?.archived ?? false) === Boolean(options.showArchived));
  const starred = (colour: StudioColour) => (options.marks.get(colour.id)?.starred ? 0 : 1);
  return colours.map((colour, index) => ({ colour, index })).sort((a, b) => starred(a.colour) - starred(b.colour) || a.index - b.index).map(entry => entry.colour);
}

/** What a new pair must satisfy before it can be saved; the server holds the same rule. */
export function checkColourPair(pair: { ground: string; text: string }) {
  const ratio = colourContrast(pair.ground, pair.text);
  return { ratio, readable: ratio >= MIN_TEXT_CONTRAST };
}
