import { useSiteContentColour } from "@/lib/siteContent";
import { tutorProfileColourParts, tutorProfileColours, tutorProfileColourSlotId, type TutorProfileColourPart } from "@shared/tutor-profile-colours";
import { useEffect } from "react";

/** The CSS variables for the colours an Owner changed; a colour left alone is absent. */
export function tutorProfileColourVariables(chosen: Partial<Record<TutorProfileColourPart, string | null>>): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const part of tutorProfileColourParts) {
    const hex = chosen[part];
    if (hex) variables[tutorProfileColours[part].cssVar] = hex;
  }
  return variables;
}

/**
 * Paints the Tutor Profile in the Owner's colours while it is on screen. They
 * are set on <html> rather than on the page: the mixed shades in index.css
 * resolve where they are declared, and the profile's dropdowns and sheets
 * render outside the page. Leaving the profile puts the shipped colours back.
 */
export function useTutorProfileColours() {
  const chosen: Partial<Record<TutorProfileColourPart, string | null>> = {};
  // A fixed list, so the hooks run in the same order on every render.
  for (const part of tutorProfileColourParts) chosen[part] = useSiteContentColour(tutorProfileColourSlotId(part));
  const variables = tutorProfileColourVariables(chosen);
  const key = JSON.stringify(variables);

  useEffect(() => {
    const root = document.documentElement;
    const entries = Object.entries(JSON.parse(key) as Record<string, string>);
    for (const [name, value] of entries) root.style.setProperty(name, value);
    return () => { for (const [name] of entries) root.style.removeProperty(name); };
  }, [key]);
}
