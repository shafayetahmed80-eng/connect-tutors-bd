// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { subscribePush, unsubscribePush, sendTestPush, isPushSubscribed } = vi.hoisted(() => ({
  isPushSubscribed: vi.fn(),
  subscribePush: vi.fn(),
  unsubscribePush: vi.fn(),
  sendTestPush: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { isPushSubscribed: { fetch: isPushSubscribed } } }),
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
            notifyGuardianRequests: true,
            notifyAccountChanges: true,
          },
        }),
      },
      sendTestPush: { useMutation: () => ({ mutateAsync: sendTestPush }) },
    },
  },
}));

vi.mock("wouter", () => ({
  Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AdminPushHeaderPopover } from "./AdminPushHeaderPopover";

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

describe("AdminPushHeaderPopover", () => {
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

  it("renders header popover with active/inactive status and settings link", async () => {
    render(<AdminPushHeaderPopover />);

    await waitFor(() => {
      expect(screen.getByText("ব্রাউজার অ্যালার্ট")).toBeTruthy();
      expect(screen.getByText("এই ডিভাইসে নোটিফিকেশন")).toBeTruthy();
      expect(screen.getByText("ক্যাটাগরি ও সেটিংস")).toBeTruthy();
    });
  });

  it("shows the test button only for a browser the server has registered", async () => {
    stubServiceWorker({ endpoint: "https://push.example/made-elsewhere", keys: { p256dh: "p256", auth: "authkey" } });
    isPushSubscribed.mockResolvedValue({ subscribed: false });

    render(<AdminPushHeaderPopover />);

    await waitFor(() => {
      expect(isPushSubscribed).toHaveBeenCalledWith({ endpoint: "https://push.example/made-elsewhere" }, { staleTime: 0 });
    });
    expect(screen.getAllByRole("switch")[0].getAttribute("aria-checked")).toBe("false");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("shows the test button once the server confirms this browser", async () => {
    stubServiceWorker({ endpoint: "https://push.example/admin-sub", keys: { p256dh: "p256", auth: "authkey" } });

    render(<AdminPushHeaderPopover />);

    expect(await screen.findByRole("button")).toBeTruthy();
    expect(screen.getAllByRole("switch")[0].getAttribute("aria-checked")).toBe("true");
  });
});
