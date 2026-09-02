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
  /** Font size the sidebar ships at, in pixels. */
  fontPx: number;
  /** Vertical padding each row ships with, in pixels. */
  paddingPx: number;
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

export function sidebarFontSlotId(panel: SidebarPanelId): string {
  return `sidebar-tabs.${panel}.size.font`;
}

export function sidebarPaddingSlotId(panel: SidebarPanelId): string {
  return `sidebar-tabs.${panel}.size.padding`;
}

/**
 * `h-10` on a sidebar row works out to roughly 10px of padding around a 20px
 * line box; that is the number an Owner starts from, and setting it swaps the
 * fixed height for the padding they choose.
 */
const SHIPPED_ROW_PADDING_PX = 10;
const SHIPPED_ROW_FONT_PX = 14;

export const sidebarPanels: SidebarPanelMeta[] = [
  {
    id: "admin",
    surface: "Admin panel",
    fontPx: SHIPPED_ROW_FONT_PX,
    paddingPx: SHIPPED_ROW_PADDING_PX,
    groups: ["Operations", "Dynamic Section", "Public reference", "Owner controls"],
    items: [
      ["/admin/dashboard", "Overview"],
      ["/admin/tutors", "Tutor management"],
      ["/admin/guardians", "Guardian activity"],
      ["/admin/matching", "Matching workspace"],
      ["/admin/dynamic/tutor-profile", "Tutor Profile"],
      ["/admin/dynamic/guardian-profile", "Guardian Profile"],
      ["/admin/dynamic/form-options", "Form options"],
      ["/admin/dynamic/sidebar-tabs", "Sidebar Tabs"],
      ["/admin/dynamic/home", "Home page"],
      ["/admin/dynamic/public-pages", "Public pages"],
      ["/admin/dynamic/institutes", "Institutes & departments"],
      ["/admin/dynamic/locations", "Cities & locations"],
      ["/admin/dynamic/legal-pages", "Legal pages"],
      ["/tutors", "Public Tutor directory"],
      ["/admin/reports", "Admin activity report"],
      ["/admin/security", "Admin security"],
    ],
  },
  {
    id: "tutor",
    surface: "Tutor dashboard",
    fontPx: SHIPPED_ROW_FONT_PX,
    paddingPx: SHIPPED_ROW_PADDING_PX,
    groups: ["Active workspace", "Coming later", "Account"],
    items: [
      ["/tutor/dashboard", "Dashboard"],
      ["/tutor/dashboard/profile", "Profile"],
      ["/tutor/dashboard/status", "Status"],
      ["/tutor/dashboard/preferences", "Tuition preferences"],
      ["/tutor/dashboard/requests", "Tutor requests"],
      ["/tutor/dashboard/settings", "Settings"],
      ["/tutor/dashboard/jobs", "Job Board"],
      ["/tutor/dashboard/confirmation-letter", "Confirmation Letter"],
      ["/tutor/dashboard/payment", "Payment"],
      ["/tutor/dashboard/certificate", "Certificate"],
      ["/tutor/dashboard/refer-earn", "Refer & Earn"],
      ["/tutor/dashboard/exclusively-yours", "Exclusively Yours"],
      ["/tutor/dashboard/how-it-works", "How It Works"],
      ["/tutor/dashboard/community", "Join our Community"],
      ["/tutor/dashboard/sign-out", "Sign Out"],
    ],
  },
  {
    id: "guardian",
    surface: "Guardian dashboard",
    fontPx: SHIPPED_ROW_FONT_PX,
    paddingPx: SHIPPED_ROW_PADDING_PX,
    groups: ["Workspace", "Account"],
    items: [
      ["/guardian/dashboard", "Dashboard"],
      ["/guardian/dashboard/hire", "Hire a tutor"],
      ["/guardian/dashboard/profile", "Profile"],
      ["/guardian/dashboard/attendance", "Attendance"],
      ["/guardian/dashboard/posted-jobs", "Posted jobs"],
      ["/guardian/dashboard/notifications", "Notifications"],
      ["/guardian/dashboard/confirmation-letter", "Confirmation Letter"],
      ["/guardian/dashboard/settings", "Settings"],
      ["/guardian/dashboard/exclusive", "Exclusively yours"],
      ["/guardian/dashboard/how-it-works", "How it works"],
      ["/guardian/dashboard/community", "Join Guardian Community"],
    ],
  },
];

export function findSidebarPanel(id: string): SidebarPanelMeta | undefined {
  return sidebarPanels.find(panel => panel.id === id);
}
