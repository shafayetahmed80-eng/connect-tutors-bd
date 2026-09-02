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
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { SiteContentProvider, useSiteContentPaddingStyle, useSiteContentResolver, useSiteContentTextStyle } from "@/lib/siteContent";
import {
  sidebarFontSlotId,
  sidebarGroupSlotId,
  sidebarPaddingSlotId,
  sidebarTabsSlotId,
  type SidebarPanelId,
} from "@shared/sidebar-tabs";
import { Bell, LayoutDashboard, LoaderCircle, LogOut, PanelLeft, Users, type LucideIcon } from "lucide-react";
import React, { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
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
  requiresSignOut?: boolean;
};

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

export function getDashboardSidebarToggleLabel(isCollapsed: boolean) {
  return isCollapsed ? "Expand navigation" : "Collapse navigation";
}

export function getDashboardNavigationItemClassName(isActive: boolean) {
  const shared = "h-10 rounded-xl px-3 font-medium transition-[transform,colors,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#116fc4] focus-visible:ring-offset-2 motion-reduce:transition-none";
  return isActive
    ? `${shared} bg-[#eaf7ff] text-[#116fc4] shadow-[0_8px_18px_rgba(17,111,196,0.12)]`
    : `${shared} text-[#527086] hover:bg-[#eef8ff] hover:text-[#116fc4]`;
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
  const sidebarFontStyle = useSiteContentTextStyle(sidebarPanel ? sidebarFontSlotId(sidebarPanel) : "");
  const sidebarPaddingStyle = useSiteContentPaddingStyle(sidebarPanel ? sidebarPaddingSlotId(sidebarPanel) : "");
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [pendingPanelExit, setPendingPanelExit] = useState<DashboardNavigationItem | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = navigationItems.find(item => item.path === location);
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
            className={`border-r border-[#d9e5ed] bg-white ${DASHBOARD_SIDEBAR_MOTION_CLASS}`}
            disableTransition={isResizing}
          >
          <SidebarHeader className="h-16 justify-center border-b border-[#edf2f6]">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label={getDashboardSidebarToggleLabel(isCollapsed)}
                aria-expanded={!isCollapsed}
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    {title}
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          {sidebarIdentity ? <div className="border-b border-[#edf2f6] px-3 py-3 group-data-[collapsible=icon]:px-2">{sidebarIdentity}</div> : null}

          <SidebarContent className="min-h-0 flex-1 gap-0 overflow-y-auto overscroll-contain">
            <SidebarMenu className="px-2 py-3">
              {navigationItems.map((item, index) => {
                const isActive = location === item.path;
                const previousSection = navigationItems[index - 1]?.sectionLabel;
                const showSectionLabel = Boolean(item.sectionLabel && item.sectionLabel !== previousSection);
                // Resolved through one lookup rather than a hook per item, and
                // used as a string so the tooltip renames along with the label.
                const label = sidebarPanel ? resolveSlot(sidebarTabsSlotId(sidebarPanel, item.path), item.label) : item.label;
                return (
                  <SidebarMenuItem key={`${item.path}-${item.label}`}>
                    {item.dividerBefore ? <div className="mx-2 my-3 h-px bg-[#e7eef3] group-data-[collapsible=icon]:mx-0" /> : null}
                    {showSectionLabel ? <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a91a4] group-data-[collapsible=icon]:sr-only">
                      {sidebarPanel ? resolveSlot(sidebarGroupSlotId(sidebarPanel, item.sectionLabel!), item.sectionLabel!) : item.sectionLabel}
                    </p> : null}
                    <SidebarMenuButton
                      isActive={item.action ? false : isActive}
                      onClick={() => handleNavigation(item)}
                      tooltip={label}
                      aria-current={isActive && !item.action ? "page" : undefined}
                      className={getDashboardNavigationItemClassName(isActive && !item.action)}
                      style={{ ...sidebarFontStyle, ...sidebarPaddingStyle }}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive && !item.action ? "text-[#116fc4]" : "text-[#6d8799]"}`}
                      />
                      <span>{label}</span>
                      {item.planned ? <span className="ml-auto rounded-full bg-[#fff4dc] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#9a6611] group-data-[collapsible=icon]:hidden">Soon</span> : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
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
          />
        ) : isMobile ? (
          <div className="flex h-16 items-center justify-between border-b border-[#d9e5ed] bg-white/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#6d8799]">
                  {mobileContext.workspace}
                </span>
                <span className="truncate text-sm font-semibold tracking-tight text-[#173b60]">
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
}: {
  heading: string;
  identity: WorkspaceHeaderIdentity;
  isSigningOut: boolean;
  onSignOut: () => void;
}) {
  const initials = getDashboardAvatarInitials(identity.name);

  return (
    <header aria-label={`${identity.portal} workspace header`} className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-[#d9e5ed] bg-white/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger aria-label={`Open ${identity.portal} navigation`} title={`Open ${identity.portal} navigation`} className="size-10 shrink-0 rounded-xl text-[#527086] hover:bg-[#eef8ff] hover:text-[#116fc4] focus-visible:ring-[#116fc4] md:hidden" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6d8799]">{identity.portal}</p>
          <h1 className="truncate text-base font-semibold tracking-tight text-[#173b60] sm:text-lg">{heading}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Open notifications" className="grid size-10 place-items-center rounded-xl text-[#527086] transition hover:bg-[#eef8ff] hover:text-[#116fc4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#116fc4] focus-visible:ring-offset-2">
              <Bell className="size-[19px]" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 rounded-xl p-3">
            <p className="text-sm font-semibold text-[#173b60]">Notifications</p>
            <p className="mt-1 text-sm leading-6 text-[#587489]">No notifications yet.</p>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Open ${identity.portal} account menu`} className="rounded-full p-0.5 transition hover:bg-[#eef8ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#116fc4] focus-visible:ring-offset-2">
              <Avatar className="size-9 border border-[#d6e5ee] sm:size-10">
                {identity.profilePhotoUrl ? <AvatarImage src={identity.profilePhotoUrl} alt={`${identity.name}'s profile`} /> : null}
                <AvatarFallback className="bg-[#dff3ff] text-xs font-bold text-[#126fb5]">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
            <div className="px-2 py-2">
              <p className="truncate text-sm font-bold text-[#173b60]">{identity.name}</p>
              {(identity.details ?? []).map(detail => <div key={detail.label}>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d8799]">{detail.label}</p>
                <p className="mt-0.5 truncate text-sm font-medium text-[#527086]">{detail.value}</p>
              </div>)}
            </div>
            <DropdownMenuSeparator />
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
