/**
 * The community group each panel's "Join our Community" row opens.
 *
 * A group can move, and the Tutors' and the Guardians' need not be the same
 * one, so the address is the Owner's to set per panel from Admin Control
 * rather than written into the menu. It is stored as an ordinary site-content
 * override, which is what gives it Save and Reset for free.
 */

export const communityPanels = ["tutor", "guardian"] as const;

export type CommunityPanel = (typeof communityPanels)[number];

/** Where both panels point until the Owner changes one. */
export const DEFAULT_COMMUNITY_LINK = "https://www.facebook.com/groups/connecttutors";

export function communityLinkSlotId(panel: CommunityPanel): string {
  return `community.link.${panel}`;
}

export function isCommunityPanel(value: unknown): value is CommunityPanel {
  return communityPanels.some(panel => panel === value);
}

/** An address a browser can open: http or https, nothing else. */
export function isCommunityLink(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
