// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { startListeningForInstallPrompt } from "@/lib/installApp";
import InstallAppButton from "./InstallAppButton";
import { visibleNavigationItems, type DashboardNavigationItem } from "./DashboardLayout";

/** The offer, delivered to the page the way a browser delivers it. */
function browserOffers() {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" }> };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  act(() => { window.dispatchEvent(event); });
  return event;
}

beforeAll(() => { startListeningForInstallPrompt(); });
afterEach(() => cleanup());

describe("InstallAppButton", () => {
  it("renders nothing until the browser offers to install, so Safari on iPhone never sees it", () => {
    const { container } = render(<InstallAppButton />);

    expect(container.innerHTML).toBe("");
  });

  it("appears when the browser offers, and shows the browser's prompt when pressed - then goes away", async () => {
    render(<InstallAppButton className="install-app-link" />);
    const event = browserOffers();

    const button = await screen.findByRole("button", { name: "Install app" });
    expect(button.className).toBe("install-app-link");
    await act(async () => { fireEvent.click(button); });

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });
});

describe("visibleNavigationItems", () => {
  const icon = (() => null) as unknown as DashboardNavigationItem["icon"];
  const items: DashboardNavigationItem[] = [
    { icon, label: "Dashboard", path: "/x" },
    { icon, label: "Install app", path: "/x/install", action: "install" },
    { icon, label: "Sign Out", path: "/x/sign-out", action: "signout" },
  ];

  it("leaves the install row out until the browser has offered, and keeps every other row", () => {
    expect(visibleNavigationItems(items, false).map(item => item.label)).toEqual(["Dashboard", "Sign Out"]);
  });

  it("shows the install row while an offer is open", () => {
    expect(visibleNavigationItems(items, true)).toBe(items);
  });
});
