/**
 * The dashboard sidebars, declared so an Owner can rename their menu items and
 * group headings and resize them without a deploy.
 *
 * The navigation arrays themselves live in the client (they carry icons and
 * click behaviour), so the labels are repeated here as the shipped defaults.
 * `sidebarTabsSlotId` derives a slot id from an item's path rather than asking
 * every item to carry one, which keeps the three navigation files untouched -
 * and a test asserts the two sides still agree.
 */

export const sidebarPanelIds = ["admin", "tutor", "guardian"] as const;
export type SidebarPanelId = (typeof sidebarPanelIds)[number];

export type SidebarPanelMeta = {
  id: SidebarPanelId;
  /** Surface heading in the admin editor. */
  surface: string;
  /** Menu items as `[path, shipped label]`, in sidebar order. */
  items: ReadonlyArray<readonly [string, string]>;
  /** Group headings shown above a run of items. */
  groups: readonly string[];
  /**
   * Collapsible rows that hold a run of items beneath them, in the order they
   * appear. A subgroup has no page of its own: it opens and closes.
   */
  subgroups: readonly string[];
  /** Font size the sidebar ships at, in pixels. */
  fontPx: number;
  /** Vertical padding each row ships with, in pixels. */
  paddingPx: number;
  /** Height each row ships at, in pixels - independent of the padding above. */
  heightPx: number;
  /** The colours this sidebar ships with; an Owner may change each one. */
  colours: { panel: string; text: string; pill: string; pillText: string };
};

/** Turns a path into the stable key half of a slot id. */
function pathKey(path: string): string {
  return path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

/** Turns a group heading into the stable key half of a slot id. */
function labelKey(label: string): string {
  return label.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

export function sidebarTabsSlotId(panel: SidebarPanelId, path: string): string {
  return `sidebar-tabs.${panel}.item.${pathKey(path)}`;
}

export function sidebarGroupSlotId(panel: SidebarPanelId, sectionLabel: string): string {
  return `sidebar-tabs.${panel}.group.${labelKey(sectionLabel)}`;
}

export function sidebarSubgroupSlotId(panel: SidebarPanelId, subgroup: string): string {
  return `sidebar-tabs.${panel}.subgroup.${labelKey(subgroup)}`;
}

export const sidebarColourParts = ["panel", "text", "pill", "pill-text"] as const;
export type SidebarColourPart = (typeof sidebarColourParts)[number];

export function sidebarColourSlotId(panel: SidebarPanelId, part: SidebarColourPart): string {
  return `sidebar-tabs.${panel}.colour.${part}`;
}

export function sidebarFontSlotId(panel: SidebarPanelId): string {
  return `sidebar-tabs.${panel}.size.font`;
}

export function sidebarPaddingSlotId(panel: SidebarPanelId): string {
  return `sidebar-tabs.${panel}.size.padding`;
}

export function sidebarHeightSlotId(panel: SidebarPanelId): string {
  return `sidebar-tabs.${panel}.size.height`;
}

/**
 * A row ships at a fixed `h-[38px]`, which works out to roughly 10px of
 * padding around a 20px line box; that is the number an Owner starts from in
 * the padding control, and setting it swaps the fixed height for the padding
 * they choose. The height control below is the direct route to the same
 * number, for an Owner who wants the row taller or shorter without touching
 * how much air sits around the label.
 */
const SHIPPED_ROW_PADDING_PX = 10;
const SHIPPED_ROW_FONT_PX = 14;
const SHIPPED_ROW_HEIGHT_PX = 38;

export const sidebarPanels: SidebarPanelMeta[] = [
  {
    id: "admin",
    colours: { panel: "#0d5fae", text: "#ffffff", pill: "#ffffff", pillText: "#0b4b86" },
    surface: "Admin panel",
    fontPx: SHIPPED_ROW_FONT_PX,
    paddingPx: SHIPPED_ROW_PADDING_PX,
    heightPx: SHIPPED_ROW_HEIGHT_PX,
    groups: ["Operations", "Dynamic Section", "Public reference", "Owner controls", "Account"],
    subgroups: ["Guardian Requests", "Profile forms", "Site content", "Option lists", "Appearance", "Controls"],
    items: [
      ["/admin/dashboard", "Overview"],
      ["/admin/profile", "Admin Profile"],
      ["/admin/tutor-profiles", "Tutor Profiles"],
      ["/admin/guardians", "Guardian Profiles"],
      ["/admin/change-requests", "Change requests"],
      ["/admin/posted-jobs", "Posted jobs"],
      ["/admin/appointed-jobs", "Appointed Jobs"],
      ["/admin/confirmed-jobs", "Confirmed Jobs"],
      ["/admin/admin-posted-jobs", "Admin Posted Jobs"],
      ["/admin/applied-tutors", "Applied Tutors"],
      ["/admin/guardian-requests/shortlist", "Shortlist Requests"],
      ["/admin/guardian-requests/appoint", "Appoint Requests"],
      ["/admin/guardian-requests/confirm", "Confirm Requests"],
      ["/admin/guardian-requests/cancel", "Cancel Requests"],
      ["/admin/matching", "Matching workspace"],
      ["/admin/dynamic", "Section guide"],
      ["/admin/dynamic/tutor-profile", "Tutor Profile"],
      ["/admin/dynamic/guardian-profile", "Guardian Profile"],
      ["/admin/dynamic/home", "Home page"],
      ["/admin/dynamic/public-pages", "Public pages"],
      ["/admin/dynamic/legal-pages", "Legal pages"],
      ["/admin/dynamic/form-options", "Form options"],
      ["/admin/dynamic/institutes", "Institutes & departments"],
      ["/admin/dynamic/schools", "Schools & colleges"],
      ["/admin/dynamic/locations", "Cities & locations"],
      ["/admin/dynamic/sidebar-tabs", "Sidebar Tabs"],
      ["/admin/dynamic/modals", "Modals"],
      ["/admin/dynamic/input-field-text", "Input Field Text"],
      ["/admin/dynamic/button-section", "Button Section"],
      ["/admin/dynamic/limits", "Limits"],
      ["/admin/dynamic/admin-control", "Admin Control"],
      ["/tutors", "Public Tutor directory"],
      ["/admin/admin-profiles", "Admin Profiles"],
      ["/admin/reports", "Admin activity report"],
      ["/admin/security", "Admin security"],
      ["/admin/settings", "Settings"],
      ["/admin/sign-out", "Sign Out"],
    ],
  },
  {
    id: "tutor",
    colours: { panel: "#0a6f61", text: "#ffffff", pill: "#ffffff", pillText: "#075247" },
    surface: "Tutor dashboard",
    fontPx: SHIPPED_ROW_FONT_PX,
    paddingPx: SHIPPED_ROW_PADDING_PX,
    heightPx: SHIPPED_ROW_HEIGHT_PX,
    groups: ["Active workspace", "Coming later", "Account"],
    subgroups: [],
    items: [
      ["/tutor/dashboard", "Dashboard"],
      ["/tutor/dashboard/profile", "Profile"],
      ["/tutor/dashboard/status", "Status"],
      ["/tutor/dashboard/notifications", "Notifications"],
      ["/tutor/dashboard/preferences", "Tuition preferences"],
      ["/tutor/dashboard/requests", "Tutor requests"],
      ["/tutor/dashboard/settings", "Settings"],
      ["/tutor/dashboard/jobs", "Job Board"],
      ["/tutor/dashboard/confirmation-letter", "Confirmation Letter"],
      ["/tutor/dashboard/community", "Join our Community"],
      ["/tutor/dashboard/payment", "Payment"],
      ["/tutor/dashboard/certificate", "Certificate"],
      ["/tutor/dashboard/refer-earn", "Refer & Earn"],
      ["/tutor/dashboard/exclusively-yours", "Exclusively Yours"],
      ["/tutor/dashboard/how-it-works", "How It Works"],
      ["/tutor/dashboard/sign-out", "Sign Out"],
    ],
  },
  {
    id: "guardian",
    colours: { panel: "#3a47c4", text: "#ffffff", pill: "#ffffff", pillText: "#2c3795" },
    surface: "Guardian dashboard",
    fontPx: SHIPPED_ROW_FONT_PX,
    paddingPx: SHIPPED_ROW_PADDING_PX,
    heightPx: SHIPPED_ROW_HEIGHT_PX,
    groups: ["Workspace", "Account"],
    subgroups: [],
    items: [
      ["/guardian/dashboard", "Dashboard"],
      ["/guardian/dashboard/hire", "Hire a tutor"],
      ["/guardian/dashboard/profile", "Profile"],
      ["/guardian/dashboard/attendance", "Attendance"],
      ["/guardian/dashboard/posted-jobs", "Posted jobs"],
      ["/guardian/dashboard/applied-tutors", "Applied Tutors"],
      ["/guardian/dashboard/notifications", "Notifications"],
      ["/guardian/dashboard/confirmation-letter", "Confirmation Letter"],
      ["/guardian/dashboard/settings", "Settings"],
      ["/guardian/dashboard/exclusive", "Exclusively yours"],
      ["/guardian/dashboard/how-it-works", "How it works"],
      ["/guardian/dashboard/community", "Join Guardian Community"],
      ["/guardian/dashboard/sign-out", "Sign Out"],
    ],
  },
];

export function findSidebarPanel(id: string): SidebarPanelMeta | undefined {
  return sidebarPanels.find(panel => panel.id === id);
}
