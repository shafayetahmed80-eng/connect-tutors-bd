/**
 * The Tutor Profile colours an Owner may change. Each is one CSS variable the
 * profile is painted from (`--tp-*` in client/src/index.css); the softer and
 * darker shades around it are mixed from it there, so one colour repaints
 * every place it belongs.
 */
export const tutorProfileColourParts = ["accent", "heading", "value", "label", "danger", "card", "border"] as const;
export type TutorProfileColourPart = (typeof tutorProfileColourParts)[number];

export const tutorProfileColours: Record<TutorProfileColourPart, { cssVar: string; defaultHex: string; label: string; help: string }> = {
  accent: { cssVar: "--tp-accent", defaultHex: "#167ddd", label: "Accent colour", help: "Buttons, links, the open tab, focus rings and chosen options. Hover and pale tints are mixed from it." },
  heading: { cssVar: "--tp-heading", defaultHex: "#173b60", label: "Heading colour", help: "Section and card headings, and the text typed into a field." },
  value: { cssVar: "--tp-value", defaultHex: "#243b52", label: "Value colour", help: "The answers on the profile, and the name above each field." },
  label: { cssVar: "--tp-label", defaultHex: "#5e7485", label: "Label colour", help: "Field names beside their answers, hints and captions. Placeholders use a paler shade of it." },
  danger: { cssVar: "--tp-danger", defaultHex: "#d84a4a", label: "Required & error colour", help: "The required asterisk, a missing answer and error messages." },
  card: { cssVar: "--tp-card", defaultHex: "#ffffff", label: "Card background", help: "The cards each part of the profile sits on." },
  border: { cssVar: "--tp-border", defaultHex: "#dbe7ef", label: "Border colour", help: "Card edges, field outlines and the lines between rows." },
};

export function tutorProfileColourSlotId(part: TutorProfileColourPart): string {
  return `tutor-profile.colour.${part}`;
}
