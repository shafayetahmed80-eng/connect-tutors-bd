// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { subscribe, unsubscribe, isSubscribed } = vi.hoisted(() => ({ subscribe: vi.fn(), unsubscribe: vi.fn(), isSubscribed: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ pushNotifications: { isSubscribed: { fetch: isSubscribed } } }),
    pushNotifications: {
      getPublicKey: { useQuery: () => ({ data: { publicKey: "public-key" } }) },
      subscribe: { useMutation: () => ({ mutateAsync: subscribe }) },
      unsubscribe: { useMutation: () => ({ mutateAsync: unsubscribe }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { PushNotificationToggle } from "./PushNotificationToggle";

function stubServiceWorker(subscription: unknown) {
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(null) } }),
      ready: Promise.resolve({ pushManager: { subscribe: vi.fn().mockResolvedValue(subscription) } }),
    },
  });
}

function stubNotification(permission: NotificationPermission) {
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission, requestPermission: vi.fn().mockResolvedValue("granted") },
  });
  Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
}

beforeEach(() => {
  subscribe.mockResolvedValue(undefined);
  stubServiceWorker({ toJSON: () => ({ endpoint: "https://push.example/e", keys: { p256dh: "p", auth: "a" } }) });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PushNotificationToggle", () => {
  it("explains why, in Bangla, before asking a browser that has never been asked", async () => {
    stubNotification("default");
    render(<PushNotificationToggle />);
    await waitFor(() => screen.getByRole("switch"));

    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("heading", { name: "নোটিফিকেশন চালু করবেন?" })).toBeTruthy();
    expect((window.Notification as unknown as { requestPermission: () => void }).requestPermission).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "চালিয়ে যান" }));
    await waitFor(() => expect(subscribe).toHaveBeenCalledWith({ endpoint: "https://push.example/e", p256dh: "p", auth: "a" }));
    expect(screen.queryByRole("heading", { name: "নোটিফিকেশন চালু করবেন?" })).toBeNull();
  });

  it("closes without asking permission when the explainer is cancelled", async () => {
    stubNotification("default");
    render(<PushNotificationToggle />);
    await waitFor(() => screen.getByRole("switch"));

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "বাতিল" }));

    expect(screen.queryByRole("heading", { name: "নোটিফিকেশন চালু করবেন?" })).toBeNull();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("skips the explainer once this browser has already been asked", async () => {
    stubNotification("granted");
    render(<PushNotificationToggle />);
    await waitFor(() => screen.getByRole("switch"));

    fireEvent.click(screen.getByRole("switch"));
    expect(screen.queryByRole("heading", { name: "নোটিফিকেশন চালু করবেন?" })).toBeNull();
    await waitFor(() => expect(subscribe).toHaveBeenCalled());
  });

  it("reads off for a browser that holds a subscription the server has no row for under this account, and on once the server knows it", async () => {
    stubNotification("granted");
    const held = { endpoint: "https://push.example/made-elsewhere", keys: { p256dh: "p", auth: "a" } };
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(held) } }), ready: Promise.resolve({ pushManager: { subscribe: vi.fn() } }) },
    });
    isSubscribed.mockResolvedValue({ subscribed: false });

    const { unmount } = render(<PushNotificationToggle />);
    await waitFor(() => expect(isSubscribed).toHaveBeenCalledWith({ endpoint: "https://push.example/made-elsewhere" }, { staleTime: 0 }));
    expect(screen.getByText("Off for this browser")).toBeTruthy();
    unmount();

    isSubscribed.mockResolvedValue({ subscribed: true });
    render(<PushNotificationToggle />);
    await waitFor(() => expect(screen.getByText("On for this browser")).toBeTruthy());
  });
});
