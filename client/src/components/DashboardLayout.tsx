import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { communityLinkSlotId, DEFAULT_COMMUNITY_LINK, isCommunityPanel } from "@shared/community";
import { SiteContentProvider, useSiteContentColour, useSiteContentHeightStyle, useSiteContentPaddingStyle, useSiteContentResolver, useSiteContentText, useSiteContentTextStyle } from "@/lib/siteContent";
import {
  sidebarColourSlotId,
  sidebarFontSlotId,
  sidebarGroupSlotId,
  sidebarHeightSlotId,
  sidebarPaddingSlotId,
  sidebarSubgroupSlotId,
  sidebarTabsSlotId,
  type SidebarPanelId,
} from "@shared/sidebar-tabs";
import { Bell, ChevronDown, ChevronsLeft, LayoutDashboard, LoaderCircle, LogOut, Settings, Users, type LucideIcon } from "lucide-react";
import React, { CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { BrandMark, brandWordmark, useCradleSwing } from "./BrandMark";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export type DashboardNavigationItem = {
  icon: LucideIcon;
  label: string;
  path: string;
  dividerBefore?: boolean;
  sectionLabel?: string;
  planned?: boolean;
  action?: "signout";
  /**
   * A row that leaves the panel for the Owner's community group, in a new tab.
   * The address is theirs to change from Admin Control, so it is resolved from
   * this panel's community slot rather than written beside the label.
   */
  community?: boolean;
  requiresSignOut?: boolean;
  /** Things waiting on this screen - drawn as a count beside the label, never as 0. */
  badge?: number;
  /**
   * Puts the item under a collapsible row. Consecutive items with the same
   * subgroup label share one row; the row has no page of its own, it opens and
   * closes. Its label is a site-content slot, like a section heading.
   */
  subgroup?: { label: string; icon: LucideIcon };
};

/**
 * A waiting count that gives one small pulse when it goes up, so a new request
 * is noticed without the page moving. It stays still on first paint.
 */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  const previous = useRef(count);
  const [pulses, setPulses] = useState(0);
  useEffect(() => {
    if (count > previous.current) setPulses(total => total + 1);
    previous.current = count;
  }, [count]);
  return <span key={pulses} data-pulse={pulses > 0 ? "" : undefined} aria-label={`${count} waiting`} className={`sb-badge ${className ?? ""}`}>{count > 99 ? "99+" : count}</span>;
}

export type NavigationRow<Item extends { subgroup?: { label: string } }> =
  | { kind: "item"; item: Item; index: number }
  | { kind: "subgroup"; subgroup: NonNullable<Item["subgroup"]>; members: Array<{ item: Item; index: number }> };

/** Folds a run of items that share a subgroup into one row, keeping every other item as it is. */
export function groupNavigationRows<Item extends { subgroup?: { label: string } }>(items: Item[]): NavigationRow<Item>[] {
  const rows: NavigationRow<Item>[] = [];
  items.forEach((item, index) => {
    const last = rows[rows.length - 1];
    if (item.subgroup && last?.kind === "subgroup" && last.subgroup.label === item.subgroup.label) {
      last.members.push({ item, index });
    } else if (item.subgroup) {
      rows.push({ kind: "subgroup", subgroup: item.subgroup as NonNullable<Item["subgroup"]>, members: [{ item, index }] });
    } else {
      rows.push({ kind: "item", item, index });
    }
  });
  return rows;
}

const defaultMenuItems: DashboardNavigationItem[] = [
  { icon: LayoutDashboard, label: "Page 1", path: "/" },
  { icon: Users, label: "Page 2", path: "/some-path" },
];

export function shouldAllowDashboardAccountSignOut(
  onBeforeNavigation?: (item: DashboardNavigationItem) => boolean,
) {
  return onBeforeNavigation?.({
    icon: LogOut,
    label: "Sign Out",
    path: "/sign-out",
    action: "signout",
  }) ?? true;
}

export function shouldRequireDashboardExit(item: DashboardNavigationItem) {
  return item.requiresSignOut === true && item.action !== "signout";
}

export async function completeDashboardSignOut(
  logout: () => Promise<void>,
  navigate: (destination: string) => void,
  loginPath: string,
  onSignedOut?: () => void | Promise<void>,
) {
  await logout();
  await onSignedOut?.();
  navigate(loginPath);
}

/**
 * Who is signed in, for the header every panel now shares.
 *
 * `details` rather than a fixed field per panel: a Tutor is identified by a
 * Tutor ID, a Guardian by a Guardian ID, and an Admin by the User ID they type
 * at the login screen plus whether they are the Owner. One shaped list covers
 * all three without the header needing to know which panel it is in.
 */
export type WorkspaceHeaderIdentity = {
  /** The eyebrow above the page heading: "Tutor Portal", "Guardian Portal", "Admin Panel". */
  portal: string;
  name: string;
  profilePhotoUrl?: string | null;
  details?: Array<{ label: string; value: string }>;
  /** The panel's Settings page, offered in the avatar menu too. */
  settingsPath?: string;
};

export function getDashboardAvatarInitials(name: string, fallback = "?") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || fallback;
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;
export const DASHBOARD_SIDEBAR_MOTION_CLASS = "duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";

/**
 * The brand at the top of every panel's sidebar. Not a link: leaving a panel
 * for the public site goes through the sidebar's own sign-out prompt, and a
 * logo link would skip it. It still swings when pointed at.
 */
export function SidebarBrand() {
  const swing = useCradleSwing();
  return (
    <div className="sb-brand pl-1 group-data-[collapsible=icon]:pl-0" {...swing.host}>
      <BrandMark onAnimationEnd={swing.onAnimationEnd} />
      <span className="brand-wordmark">
        <strong>{brandWordmark.primary}</strong>
        <em>{brandWordmark.secondary}</em>
      </span>
    </div>
  );
}

export function getDashboardSidebarToggleLabel(isCollapsed: boolean) {
  return isCollapsed ? "Expand navigation" : "Collapse navigation";
}

/**
 * How a navigation row reads at rest, under the pointer, and when it is the
 * page you are on.
 *
 * Hover is deliberately *neutral* and active is the only blue. They used to be
 * two shades of the same wash - `#eef8ff` against `#eaf7ff` - so running the
 * pointer down the list made every row look selected in turn, and the real
 * selection was impossible to keep track of. Now hovering warms the ground and
 * darkens the text; only the current page turns blue.
 *
 * The active row is marked by a short accent bar on its leading edge as well
 * as by colour. A bar is legible at a glance in a vertical list, survives being
 * collapsed to icons, and does not depend on telling two pale blues apart. It
 * replaces the blue drop shadow the row used to carry, which made the
 * navigation the loudest thing on a screen whose subject is elsewhere.
 */
/**
 * The sidebar item a location belongs to. An exact match first; otherwise the
 * item whose path the location continues, so a page one level inside a tab
 * (one tuition under Applied Tutors) still names and highlights that tab.
 * An item other items extend - the dashboard home - never claims a deeper
 * page, or every unknown path would read as the home.
 */
export function getActiveNavigationItem<Item extends { path: string; action?: string }>(items: Item[], location: string): Item | undefined {
  const exact = items.find(item => item.path === location);
  if (exact) return exact;
  const isParent = (item: Item) => items.some(other => other !== item && other.path.startsWith(item.path + "/"));
  return items
    .filter(item => !item.action && !isParent(item) && location.startsWith(item.path + "/"))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

/**
 * The colours an Owner chose for one sidebar, as the CSS variables the panel
 * is painted from. A colour left alone is absent here, so the shipped value in
 * `index.css` keeps painting it. The foot of the panel is a darker mix of the
 * chosen colour, which is how the shipped gradient gets its depth.
 */
export function sidebarColourStyle(colours: { panel?: string | null; text?: string | null; pill?: string | null; pillText?: string | null }): CSSProperties {
  const style: Record<string, string> = {};
  if (colours.panel) {
    style["--sb-panel-top"] = colours.panel;
    style["--sb-panel-bottom"] = `color-mix(in srgb, ${colours.panel} 82%, #05213c)`;
  }
  if (colours.text) {
    style["--sb-text"] = colours.text;
    style["--sb-soft"] = `color-mix(in srgb, ${colours.text} 80%, transparent)`;
    style["--sb-icon"] = `color-mix(in srgb, ${colours.text} 68%, transparent)`;
  }
  if (colours.pill) style["--sb-pill"] = colours.pill;
  if (colours.pillText) style["--sb-ink"] = colours.pillText;
  return style as CSSProperties;
}

export function getDashboardNavigationItemClassName(isActive: boolean) {
  // The colours come from the sidebar's tokens (`.sb-*` in index.css), so the
  // three panels share one set of classes and differ only where an Owner has
  // repainted one.
  const shared = "sb-item nav-item relative h-[38px] rounded-lg px-3 transition-[color,background-color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-1 motion-reduce:transition-none";
  return isActive
    ? `${shared} sb-item-active font-semibold before:absolute before:left-0 before:top-1/2 before:h-[18px] before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:content-['']`
    : `${shared} font-medium`;
}

export function closeMobileSidebarAfterNavigation(
  isMobile: boolean,
  setOpenMobile: (open: boolean) => void,
) {
  if (isMobile) setOpenMobile(false);
}

export function getMobileWorkspaceContext(workspace: string, destination?: string) {
  return { workspace, destination: destination ?? "Menu" };
}

export default function DashboardLayout({
  children,
  navigationItems = defaultMenuItems,
  title = "Navigation",
  loginPath = "/login",
  signOutPath = "/",
  onBeforeNavigation,
  sidebarIdentity,
  workspaceHeader,
  onTutorSignOutSuccess,
  sidebarPanel,
}: {
  children: React.ReactNode;
  navigationItems?: DashboardNavigationItem[];
  title?: string;
  loginPath?: string;
  signOutPath?: string;
  onBeforeNavigation?: (item: DashboardNavigationItem) => boolean;
  sidebarIdentity?: React.ReactNode;
  workspaceHeader?: WorkspaceHeaderIdentity;
  onTutorSignOutSuccess?: () => void | Promise<void>;
  sidebarPanel?: SidebarPanelId;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to the secure sign-in page.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = loginPath; }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      className="min-w-0 overflow-x-clip"
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      {/* Merges into whatever the app-wide provider already holds, so the
          sidebar's own overrides load without disturbing the site slots. */}
      <SiteContentProvider page="sidebar-tabs">
      {/* The community row's address is an Admin Control value, not a sidebar one. */}
      <SiteContentProvider page="admin-control">
      <DashboardLayoutContent
        setSidebarWidth={setSidebarWidth}
        navigationItems={navigationItems}
        title={title}
        loginPath={loginPath}
        signOutPath={signOutPath}
        onBeforeNavigation={onBeforeNavigation}
        sidebarIdentity={sidebarIdentity}
        workspaceHeader={workspaceHeader}
        onTutorSignOutSuccess={onTutorSignOutSuccess}
        sidebarPanel={sidebarPanel}
      >
        {children}
      </DashboardLayoutContent>
      </SiteContentProvider>
      </SiteContentProvider>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  navigationItems: DashboardNavigationItem[];
  title: string;
  loginPath: string;
  signOutPath: string;
  onBeforeNavigation?: (item: DashboardNavigationItem) => boolean;
  sidebarIdentity?: React.ReactNode;
  workspaceHeader?: WorkspaceHeaderIdentity;
  onTutorSignOutSuccess?: () => void | Promise<void>;
  /** Which sidebar this is, so its labels and sizes can be Admin-edited. */
  sidebarPanel?: SidebarPanelId;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  navigationItems,
  title,
  loginPath,
  signOutPath,
  onBeforeNavigation,
  sidebarIdentity,
  workspaceHeader,
  onTutorSignOutSuccess,
  sidebarPanel,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const resolveSlot = useSiteContentResolver();
  // Only the Tutor and Guardian panels have a community row; an Admin has none,
  // and the empty slot id resolves to the shipped address either way.
  const communityHref = useSiteContentText(
    isCommunityPanel(sidebarPanel) ? communityLinkSlotId(sidebarPanel) : "",
    DEFAULT_COMMUNITY_LINK,
  );
  const sidebarFontStyle = useSiteContentTextStyle(sidebarPanel ? sidebarFontSlotId(sidebarPanel) : "");
  const sidebarPaddingStyle = useSiteContentPaddingStyle(sidebarPanel ? sidebarPaddingSlotId(sidebarPanel) : "");
  const sidebarHeightStyle = useSiteContentHeightStyle(sidebarPanel ? sidebarHeightSlotId(sidebarPanel) : "");
  const sidebarColours = sidebarColourStyle({
    panel: useSiteContentColour(sidebarPanel ? sidebarColourSlotId(sidebarPanel, "panel") : ""),
    text: useSiteContentColour(sidebarPanel ? sidebarColourSlotId(sidebarPanel, "text") : ""),
    pill: useSiteContentColour(sidebarPanel ? sidebarColourSlotId(sidebarPanel, "pill") : ""),
    pillText: useSiteContentColour(sidebarPanel ? sidebarColourSlotId(sidebarPanel, "pill-text") : ""),
  });
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [pendingPanelExit, setPendingPanelExit] = useState<DashboardNavigationItem | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  // A collapsible row is open while it holds the current page, unless it was
  // closed by hand; a row opened by hand stays open when the page moves on.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = getActiveNavigationItem(navigationItems, location);

  // One pill glides from the page you left to the page you opened. It is
  // measured from the real button, so it follows rows that open and close, and
  // it moves without a transition whenever the layout - not the page - moved.
  // State, not a ref: on a phone the list mounts only when the sheet opens.
  const [menuEl, setMenuEl] = useState<HTMLUListElement | null>(null);
  const lastActivePath = useRef<string | undefined>(undefined);
  const [indicator, setIndicator] = useState<{ top: number; left: number; width: number; height: number; glide: boolean } | null>(null);
  const measureIndicator = useCallback((glide: boolean) => {
    const menu = menuEl;
    const active = menu?.querySelector<HTMLElement>('[data-nav-active="true"]');
    if (!menu || !active || isCollapsed) { setIndicator(null); return; }
    // Layout offsets, not bounding boxes: a page rising into a row that is
    // opening is mid-transform, and its box would be measured off the mark.
    let top = 0;
    let left = 0;
    let cursor: HTMLElement | null = active;
    while (cursor && cursor !== menu) {
      top += cursor.offsetTop;
      left += cursor.offsetLeft;
      cursor = cursor.offsetParent as HTMLElement | null;
    }
    const height = active.offsetHeight;
    // A page inside a shut row has no height to sit on.
    if (!cursor || height < 4) { setIndicator(null); return; }
    setIndicator(current => {
      const next = { top, left, width: active.offsetWidth, height, glide };
      return current && current.top === next.top && current.left === next.left && current.width === next.width && current.height === next.height && current.glide === next.glide ? current : next;
    });
  }, [isCollapsed, menuEl]);
  useLayoutEffect(() => {
    const moved = lastActivePath.current !== undefined && lastActivePath.current !== activeMenuItem?.path;
    lastActivePath.current = activeMenuItem?.path;
    measureIndicator(moved);
  }, [activeMenuItem?.path, expandedGroups, measureIndicator, navigationItems]);
  useEffect(() => {
    const menu = menuEl;
    if (!menu || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measureIndicator(false));
    observer.observe(menu);
    return () => observer.disconnect();
  }, [measureIndicator, menuEl]);
  const isMobile = useIsMobile();
  const mobileContext = getMobileWorkspaceContext(title, activeMenuItem?.label);
  const workspaceHeading = activeMenuItem?.label ?? "Dashboard";

  const handleSignOut = (destination = signOutPath) => {
    setIsSigningOut(true);
    void completeDashboardSignOut(
      logout,
      nextDestination => {
        window.location.href = nextDestination;
      },
      destination,
      onTutorSignOutSuccess,
    ).finally(() => {
      setIsSigningOut(false);
    });
  };

  const confirmPanelExit = () => {
    if (!pendingPanelExit || isSigningOut) return;
    const destination = pendingPanelExit.path;
    setPendingPanelExit(null);
    handleSignOut(destination);
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const handleNavigation = (item: DashboardNavigationItem) => {
    if (onBeforeNavigation && !onBeforeNavigation(item)) return;
    closeMobileSidebarAfterNavigation(isMobile, setOpenMobile);
    if (item.action === "signout") {
      handleSignOut();
      return;
    }
    if (shouldRequireDashboardExit(item)) {
      setPendingPanelExit(item);
      return;
    }
    setLocation(item.path);
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
          <Sidebar
            collapsible="icon"
            className={`sb-root border-r border-[var(--sb-border)] ${DASHBOARD_SIDEBAR_MOTION_CLASS}`}
            style={sidebarColours}
            disableTransition={isResizing}
          >
          {/* Header, identity, and nav all live inside the one scroll region,
              so the sidebar scrolls as a single block rather than pinning the
              header and account card above an independently-scrolling list. */}
          <SidebarContent className="min-h-0 flex-1 gap-0 overflow-y-auto overscroll-contain group-data-[collapsible=icon]:overflow-y-auto">
            {/* A slim row, not a full h-16 header — the portal name and current
                tab live in the workspace header, so this only holds the brand
                and the collapse control. Collapsed to icons, the mark stands
                alone above the toggle. The chevron rotates 180° between states
                so a glance says which way the next click goes. */}
            <SidebarHeader className="shrink-0 flex-row items-center justify-between gap-2 px-2 pb-1 pt-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center">
              <SidebarBrand />
              <button
                onClick={toggleSidebar}
                className="sb-toggle flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label={getDashboardSidebarToggleLabel(isCollapsed)}
                aria-expanded={!isCollapsed}
              >
                <ChevronsLeft aria-hidden="true" className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${isCollapsed ? "rotate-180" : ""}`} />
              </button>
            </SidebarHeader>

            {sidebarIdentity ? <div className="shrink-0 border-b border-[var(--sb-border)] px-3 pb-4 pt-1 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pb-2">{sidebarIdentity}</div> : null}

            <SidebarMenu ref={setMenuEl} className="relative gap-0.5 px-2 py-3">
              {indicator ? <li
                role="presentation"
                aria-hidden="true"
                className="sb-indicator pointer-events-none absolute left-0 top-0"
                style={{ width: indicator.width, height: indicator.height, transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`, ...(indicator.glide ? {} : { transition: "none" }) }}
              /> : null}
              {groupNavigationRows(navigationItems).map(row => {
                const first = row.kind === "item" ? row : row.members[0];
                const previousSection = navigationItems[first.index - 1]?.sectionLabel;
                const showSectionLabel = Boolean(first.item.sectionLabel && first.item.sectionLabel !== previousSection);
                const heading = <>
                  {first.item.dividerBefore ? <div className="mx-2 my-2.5 h-px bg-[#eaf0f5] group-data-[collapsible=icon]:mx-0" /> : null}
                  {showSectionLabel ? <p className="sb-heading px-3 pb-1.5 pt-4 text-2xs font-semibold uppercase tracking-[0.12em] group-data-[collapsible=icon]:sr-only">
                    {sidebarPanel ? resolveSlot(sidebarGroupSlotId(sidebarPanel, first.item.sectionLabel!), first.item.sectionLabel!) : first.item.sectionLabel}
                  </p> : null}
                </>;

                // One menu button. Resolved through one lookup rather than a hook
                // per item, and used as a string so the tooltip renames along
                // with the label.
                const renderLeaf = (item: DashboardNavigationItem) => {
                  const isActive = item.path === activeMenuItem?.path;
                  const label = sidebarPanel ? resolveSlot(sidebarTabsSlotId(sidebarPanel, item.path), item.label) : item.label;
                  // A row that leaves the panel is a real link, so it can be
                  // opened in a new tab or copied like any other.
                  if (item.community) {
                    return <SidebarMenuButton
                      asChild
                      tooltip={label}
                      className={getDashboardNavigationItemClassName(false)}
                      style={{ ...sidebarFontStyle, ...sidebarPaddingStyle, ...sidebarHeightStyle }}
                    >
                      <a
                        href={communityHref}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={() => closeMobileSidebarAfterNavigation(isMobile, setOpenMobile)}
                      >
                        <item.icon className="h-4 w-4 shrink-0 sb-icon" />
                        <span>{label}</span>
                      </a>
                    </SidebarMenuButton>;
                  }
                  return <SidebarMenuButton
                    isActive={item.action ? false : isActive}
                    onClick={() => handleNavigation(item)}
                    tooltip={label}
                    aria-current={isActive && !item.action ? "page" : undefined}
                    data-nav-active={isActive && !item.action ? "true" : undefined}
                    className={getDashboardNavigationItemClassName(isActive && !item.action)}
                    // Height is spread last: it is the more specific ask, so
                    // an Owner who sets both height and padding gets the
                    // literal number they typed for height, not the `auto`
                    // that setting padding alone would otherwise produce.
                    style={{ ...sidebarFontStyle, ...sidebarPaddingStyle, ...sidebarHeightStyle }}
                  >
                    <item.icon
                      className={`h-4 w-4 shrink-0 ${isActive && !item.action ? "sb-icon-active" : "sb-icon"}`}
                    />
                    <span>{label}</span>
                    {item.badge ? <CountBadge count={item.badge} className="ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-2xs font-bold tabular-nums group-data-[collapsible=icon]:hidden" /> : null}
                    {item.planned ? <span className="ml-auto rounded-full bg-[#eef2f6] px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-[#8397a6] group-data-[collapsible=icon]:hidden">Soon</span> : null}
                  </SidebarMenuButton>;
                };

                if (row.kind === "item") {
                  return <SidebarMenuItem key={`${row.item.path}-${row.item.label}`}>{heading}{renderLeaf(row.item)}</SidebarMenuItem>;
                }

                const groupKey = row.subgroup.label;
                const containsActive = row.members.some(member => member.item.path === activeMenuItem?.path);
                const open = expandedGroups[groupKey] ?? containsActive;
                const waiting = row.members.reduce((total, member) => total + (member.item.badge ?? 0), 0);
                const groupLabel = sidebarPanel ? resolveSlot(sidebarSubgroupSlotId(sidebarPanel, groupKey), groupKey) : groupKey;
                const listId = `nav-group-${groupKey.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                return <SidebarMenuItem key={`group-${groupKey}`}>
                  {heading}
                  <SidebarMenuButton
                    isActive={false}
                    aria-expanded={open}
                    aria-controls={listId}
                    tooltip={groupLabel}
                    // A collapsed sidebar has no room for the list, so the row goes to its first page instead.
                    onClick={() => {
                      if (isCollapsed) handleNavigation(row.members[0].item);
                      else setExpandedGroups(current => ({ ...current, [groupKey]: !open }));
                    }}
                    className={getDashboardNavigationItemClassName(false) + (containsActive && !open ? " sb-item-current font-semibold" : "")}
                    style={{ ...sidebarFontStyle, ...sidebarPaddingStyle, ...sidebarHeightStyle }}
                  >
                    <row.subgroup.icon className={`h-4 w-4 shrink-0 ${containsActive ? "sb-icon-active" : "sb-icon"}`} />
                    <span>{groupLabel}</span>
                    {!open && waiting ? <CountBadge count={waiting} className="ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-2xs font-bold tabular-nums group-data-[collapsible=icon]:hidden" /> : null}
                    <ChevronDown aria-hidden="true" className={`${!open && waiting ? "" : "ml-auto"} h-4 w-4 shrink-0 sb-icon transition-transform duration-200 motion-reduce:transition-none group-data-[collapsible=icon]:hidden ${open ? "rotate-180" : ""}`} />
                  </SidebarMenuButton>
                  {/* Always drawn, so it can open and close smoothly; a shut list is out of reach of the keyboard and of a screen reader. */}
                  <div className="sb-sub" data-open={open} aria-hidden={!open} inert={!open}>
                    <div>
                      <SidebarMenuSub id={listId} aria-label={groupLabel} className="mt-0.5">
                        {row.members.map((member, position) => <SidebarMenuSubItem key={member.item.path} style={{ "--i": position } as CSSProperties}>{renderLeaf(member.item)}</SidebarMenuSubItem>)}
                      </SidebarMenuSub>
                    </div>
                  </div>
                </SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarContent>

        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="min-w-0 overflow-x-clip">
        {workspaceHeader ? (
          <WorkspaceHeader
            heading={workspaceHeading}
            identity={workspaceHeader}
            isSigningOut={isSigningOut}
            onSignOut={() => {
              if (!shouldAllowDashboardAccountSignOut(onBeforeNavigation)) return;
              handleSignOut();
            }}
            // Through the sidebar's own handler, so an unsaved-changes guard applies here too.
            onOpenSettings={workspaceHeader.settingsPath ? () => {
              const settingsPath = workspaceHeader.settingsPath!;
              const settingsItem = navigationItems.find(item => item.path === settingsPath) ?? { icon: Settings, label: "Settings", path: settingsPath };
              handleNavigation(settingsItem);
            } : undefined}
            // Tutor and Guardian take the sidebar's own colours across their header too; Admin's stays the plain light bar.
            themed={isCommunityPanel(sidebarPanel)}
            colours={sidebarColours}
          />
        ) : isMobile ? (
          <div className="flex h-16 items-center justify-between border-b border-[#d9e5ed] bg-white/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-2xs font-bold uppercase tracking-[0.14em] text-[#6d8799]">
                  {mobileContext.workspace}
                </span>
                <span className="truncate text-sm font-semibold tracking-tight text-j-ink">
                  {mobileContext.destination}
                </span>
                </div>
            </div>
          </div>
        ) : null}
        <main className="min-w-0 flex-1 overflow-x-clip p-4">{children}</main>
      </SidebarInset>
      <AlertDialog
        open={Boolean(pendingPanelExit)}
        onOpenChange={open => {
          if (!open && !isSigningOut) setPendingPanelExit(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out to continue?</AlertDialogTitle>
            <AlertDialogDescription>
              You are leaving the secure {title} panel for {pendingPanelExit?.label ?? "a public page"}. Sign out first to protect your account on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut}>Stay in panel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPanelExit} disabled={isSigningOut}>
              {isSigningOut ? "Signing out…" : "Sign out and continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function WorkspaceHeader({
  heading,
  identity,
  isSigningOut,
  onSignOut,
  onOpenSettings,
  themed,
  colours,
}: {
  heading: string;
  identity: WorkspaceHeaderIdentity;
  isSigningOut: boolean;
  onSignOut: () => void;
  onOpenSettings?: () => void;
  /** Tutor and Guardian take the sidebar's own colours here too; Admin keeps the plain light bar. */
  themed: boolean;
  colours: CSSProperties;
}) {
  const initials = getDashboardAvatarInitials(identity.name);
  const iconButton = themed
    ? "text-[var(--sb-icon)] hover:bg-[var(--sb-hover-bg)] hover:text-[var(--sb-text)] focus-visible:ring-[var(--sb-text)]"
    : "text-[#527086] hover:bg-[#eef8ff] hover:text-j-accent focus-visible:ring-j-accent";

  return (
    <header
      aria-label={`${identity.portal} workspace header`}
      style={themed ? colours : undefined}
      className={`sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:px-6 ${themed ? "sb-header border-[var(--sb-border)]" : "border-[#d9e5ed] bg-white/95"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger aria-label={`Open ${identity.portal} navigation`} title={`Open ${identity.portal} navigation`} className={`size-10 shrink-0 rounded-xl md:hidden ${iconButton}`} />
        <div className="min-w-0">
          <p className={`text-2xs font-bold uppercase tracking-[0.14em] ${themed ? "text-[var(--sb-soft)]" : "text-[#6d8799]"}`}>{identity.portal}</p>
          <h1 className={`truncate text-base font-semibold tracking-tight sm:text-lg ${themed ? "text-[var(--sb-text)]" : "text-j-ink"}`}>{heading}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Open notifications" className={`grid size-10 place-items-center rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${iconButton}`}>
              <Bell className="size-[19px]" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 rounded-xl p-3">
            <p className="text-sm font-semibold text-j-ink">Notifications</p>
            <p className="mt-1 text-sm leading-6 text-[#587489]">No notifications yet.</p>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Open ${identity.portal} account menu`} className={`rounded-full p-0.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${themed ? "hover:bg-[var(--sb-hover-bg)] focus-visible:ring-[var(--sb-text)]" : "hover:bg-[#eef8ff] focus-visible:ring-j-accent"}`}>
              <Avatar className={`size-9 border sm:size-10 ${themed ? "border-[var(--sb-border)]" : "border-[#d6e5ee]"}`}>
                {identity.profilePhotoUrl ? <AvatarImage src={identity.profilePhotoUrl} alt={`${identity.name}'s profile`} /> : null}
                <AvatarFallback className={`text-xs font-bold ${themed ? "bg-[var(--sb-avatar-bg)] text-[var(--sb-text)]" : "bg-[#dff3ff] text-[#126fb5]"}`}>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
            <div className="px-2 py-2">
              <p className="truncate text-sm font-bold text-j-ink">{identity.name}</p>
              {/* Label and value on one line, a pixel under the shared sizes (10px / 13px). */}
              {(identity.details ?? []).map(detail => <div key={detail.label} className="mt-1.5 flex items-baseline justify-between gap-3">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6d8799]">{detail.label}</span>
                <span className="min-w-0 truncate text-[13px] font-medium text-[#527086]">{detail.value}</span>
              </div>)}
            </div>
            <DropdownMenuSeparator />
            {onOpenSettings ? <DropdownMenuItem
              onSelect={() => onOpenSettings()}
              className="cursor-pointer text-j-ink-strong transition-colors hover:bg-[#eef8ff] focus:bg-[#eef8ff] data-[highlighted]:bg-[#eef8ff]"
            >
              <Settings className="mr-2 size-4" aria-hidden="true" />
              <span>Settings</span>
            </DropdownMenuItem> : null}
            <DropdownMenuItem
              disabled={isSigningOut}
              onSelect={event => {
                event.preventDefault();
                onSignOut();
              }}
              className="cursor-pointer text-destructive transition-colors hover:bg-[#fff1f1] hover:text-destructive focus:bg-[#fff1f1] focus:text-destructive data-[highlighted]:bg-[#fff1f1] data-[highlighted]:text-destructive"
            >
              {isSigningOut ? <LoaderCircle className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-label="Signing out" /> : <LogOut className="mr-2 size-4" aria-hidden="true" />}
              <span>{isSigningOut ? "Signing out…" : "Sign out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
