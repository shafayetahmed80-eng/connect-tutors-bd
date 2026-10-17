// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { subscribePush, unsubscribePush, updatePushPreferences, sendTestPush, invalidate, isPushSubscribed } = vi.hoisted(() => ({
  isPushSubscribed: vi.fn(),
  subscribePush: vi.fn(),
  unsubscribePush: vi.fn(),
  updatePushPreferences: vi.fn(),
  sendTestPush: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        getPushPreferences: { invalidate },
        isPushSubscribed: { fetch: isPushSubscribed },
      },
    }),
    admin: {
      getPushPublicKey: { useQuery: () => ({ data: { publicKey: "public-key" } }) },
      subscribePush: { useMutation: () => ({ mutateAsync: subscribePush }) },
      unsubscribePush: { useMutation: () => ({ mutateAsync: unsubscribePush }) },
      getPushPreferences: {
        useQuery: () => ({
          data: {
            notifyTuitions: true,
            notifyApplications: true,
            notifyPayments: true,
            notifyRegistrations: true,
            notifyChat: true,
          },
        }),
      },
      updatePushPreferences: { useMutation: () => ({ mutateAsync: updatePushPreferences, isPending: false }) },
      sendTestPush: { useMutation: () => ({ mutateAsync: sendTestPush }) },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import { AdminPushNotificationSettings } from "./AdminPushNotificationSettings";

function stubServiceWorker(subscription: unknown) {
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(subscription),
        },
      }),
      ready: Promise.resolve({
        pushManager: {
          subscribe: vi.fn().mockResolvedValue(subscription),
        },
      }),
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

describe("AdminPushNotificationSettings", () => {
  beforeEach(() => {
    subscribePush.mockResolvedValue(undefined);
    unsubscribePush.mockResolvedValue(undefined);
    sendTestPush.mockResolvedValue({ sent: 1, reason: "ok" });
    isPushSubscribed.mockResolvedValue({ subscribed: true });
    stubNotification("default");
    stubServiceWorker(null);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the master toggle and category preferences in Bengali", async () => {
    render(<AdminPushNotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText("এই ডিভাইসে নোটিফিকেশন")).toBeTruthy();
      expect(screen.getByText("নোটিফিকেশন ক্যাটাগরি")).toBeTruthy();
      expect(screen.getByText("নতুন টিউশন রিকোয়েস্ট")).toBeTruthy();
      expect(screen.getByText("টিউটর আবেদন")).toBeTruthy();
      expect(screen.getByText("পেমেন্ট রিপোর্ট (TrxID)")).toBeTruthy();
      expect(screen.getByText("নতুন টিউটর রেজিস্ট্রেশন")).toBeTruthy();
      expect(screen.getByText("টিউটর চ্যাট মেসেজ")).toBeTruthy();
    });
  });

  it("subscribes the browser when the master toggle is turned on", async () => {
    const dummySub = {
      endpoint: "https://push.example/admin-sub",
      keys: { p256dh: "p256", auth: "authkey" },
      toJSON: () => ({ endpoint: "https://push.example/admin-sub", keys: { p256dh: "p256", auth: "authkey" } }),
    };
    stubServiceWorker(dummySub);
    // The browser holds a subscription (made elsewhere), but the server has no Admin record of it.
    isPushSubscribed.mockResolvedValue({ subscribed: false });

    render(<AdminPushNotificationSettings />);
    const switches = screen.getAllByRole("switch");
    const masterSwitch = switches[0];

    fireEvent.click(masterSwitch);

    await waitFor(() => {
      expect(subscribePush).toHaveBeenCalledWith({
        endpoint: "https://push.example/admin-sub",
        p256dh: "p256",
        auth: "authkey",
      });
    });
  });

  it("sends a test notification when Test button is clicked while subscribed", async () => {
    const dummySub = {
      endpoint: "https://push.example/admin-sub",
      keys: { p256dh: "p256", auth: "authkey" },
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    stubServiceWorker(dummySub);

    render(<AdminPushNotificationSettings />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "টেস্ট নোটিফিকেশন পাঠান" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "টেস্ট নোটিফিকেশন পাঠান" }));

    await waitFor(() => {
      expect(sendTestPush).toHaveBeenCalledTimes(1);
    });
  });

  it("does not call this browser subscribed just because it holds some push subscription", async () => {
    stubServiceWorker({ endpoint: "https://push.example/made-elsewhere", keys: { p256dh: "p256", auth: "authkey" } });
    isPushSubscribed.mockResolvedValue({ subscribed: false });

    render(<AdminPushNotificationSettings />);

    await waitFor(() => {
      expect(isPushSubscribed).toHaveBeenCalledWith({ endpoint: "https://push.example/made-elsewhere" });
    });
    // The only button on the card is the test button, which shows only for a registered browser.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByRole("switch")[0].getAttribute("aria-checked")).toBe("false");
  });

  it("says why a test notification did not go out", async () => {
    stubServiceWorker({ endpoint: "https://push.example/admin-sub", keys: { p256dh: "p256", auth: "authkey" } });
    sendTestPush.mockResolvedValue({ sent: 0, reason: "rejected", statusCode: 403 });

    render(<AdminPushNotificationSettings />);
    const testButton = await screen.findByRole("button");
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("403"));
    });
  });
});
