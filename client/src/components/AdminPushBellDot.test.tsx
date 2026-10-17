// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ isPushSubscribed: vi.fn(), publicKey: "public-key" as string | null }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { isPushSubscribed: { fetch: mocks.isPushSubscribed } } }),
    admin: { getPushPublicKey: { useQuery: () => ({ data: { publicKey: mocks.publicKey } }) } },
  },
}));

import { announcePushRegistrationChange } from "@/hooks/useBrowserPushRegistered";
import { AdminPushBellDot } from "./AdminPushBellDot";

function stubBrowser(permission: NotificationPermission, held: { endpoint: string } | null = null) {
  Object.defineProperty(window, "Notification", { configurable: true, value: { permission } });
  Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(held) } }) },
  });
}

const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const dot = () => screen.queryByTestId("admin-alerts-off-dot");

beforeEach(() => {
  mocks.publicKey = "public-key";
  mocks.isPushSubscribed.mockResolvedValue({ subscribed: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("the Admin bell's alerts-off dot", () => {
  it("shows while this browser is not set up for Admin alerts", async () => {
    stubBrowser("default");
    render(<AdminPushBellDot />);
    await settle();
    expect(dot()).toBeTruthy();
  });

  it("shows for a browser holding a subscription the server does not know as an Admin device", async () => {
    stubBrowser("granted", { endpoint: "https://push.example/made-elsewhere" });
    render(<AdminPushBellDot />);
    await settle();
    expect(dot()).toBeTruthy();
  });

  it("is gone once the server knows this browser, and leaves when another screen turns alerts on", async () => {
    stubBrowser("granted", { endpoint: "https://push.example/mine" });
    render(<AdminPushBellDot />);
    await settle();
    expect(dot()).toBeTruthy();

    mocks.isPushSubscribed.mockResolvedValue({ subscribed: true });
    announcePushRegistrationChange();
    await settle();
    expect(dot()).toBeNull();
  });

  it("stays away for a browser that said Block, a server with no push keys, and a browser that cannot do push", async () => {
    stubBrowser("denied");
    const { unmount } = render(<AdminPushBellDot />);
    await settle();
    expect(dot()).toBeNull();
    unmount();

    stubBrowser("default");
    mocks.publicKey = null;
    const second = render(<AdminPushBellDot />);
    await settle();
    expect(dot()).toBeNull();
    second.unmount();

    mocks.publicKey = "public-key";
    stubBrowser("default");
    Reflect.deleteProperty(window, "PushManager");
    render(<AdminPushBellDot />);
    await settle();
    expect(dot()).toBeNull();
  });

  it("says nothing before the server has answered", async () => {
    stubBrowser("default");
    mocks.isPushSubscribed.mockReturnValue(new Promise(() => {}));
    stubBrowser("granted", { endpoint: "https://push.example/slow" });
    render(<AdminPushBellDot />);
    await settle();
    expect(dot()).toBeNull();
  });
});
