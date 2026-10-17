// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscribePush: vi.fn(),
  isPushSubscribed: vi.fn(),
  publicKey: "public-key" as string | null,
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { isPushSubscribed: { fetch: mocks.isPushSubscribed } } }),
    admin: {
      getPushPublicKey: { useQuery: () => ({ data: { publicKey: mocks.publicKey } }) },
      subscribePush: { useMutation: () => ({ mutateAsync: mocks.subscribePush }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));

import { ADMIN_PUSH_PROMPT_SNOOZE_KEY, AdminPushPermissionPrompt } from "./AdminPushPermissionPrompt";

const newSubscription = { toJSON: () => ({ endpoint: "https://push.example/new", keys: { p256dh: "p", auth: "a" } }) };

/** `held` is the push subscription this browser already has (made for some other switch), if any. */
function stubBrowser(permission: NotificationPermission, held: { endpoint: string } | null = null) {
  Object.defineProperty(window, "Notification", { configurable: true, value: { permission, requestPermission: vi.fn().mockResolvedValue("granted") } });
  Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(held) } }),
      ready: Promise.resolve({ pushManager: { subscribe: vi.fn().mockResolvedValue(newSubscription) } }),
    },
  });
}

const title = "নোটিফিকেশন চালু করবেন?";
// The server is asked first, so let that answer land before the prompt's own delay starts counting.
const wait = async () => {
  await act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
};

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  mocks.publicKey = "public-key";
  mocks.subscribePush.mockResolvedValue(undefined);
  mocks.isPushSubscribed.mockResolvedValue({ subscribed: false });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("the Admin notification prompt", () => {
  it("opens a moment after the workspace, for a browser that was never asked", async () => {
    stubBrowser("default");
    render(<AdminPushPermissionPrompt />);
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
    await wait();
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
  });

  it("also opens for a browser that is already allowed and holds a subscription the server does not know as an Admin device", async () => {
    stubBrowser("granted", { endpoint: "https://push.example/made-elsewhere" });
    render(<AdminPushPermissionPrompt />);
    await wait();

    expect(mocks.isPushSubscribed).toHaveBeenCalledWith({ endpoint: "https://push.example/made-elsewhere" }, { staleTime: 0 });
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
  });

  it("stays shut once the server knows this browser", async () => {
    stubBrowser("granted", { endpoint: "https://push.example/mine" });
    mocks.isPushSubscribed.mockResolvedValue({ subscribed: true });
    render(<AdminPushPermissionPrompt />);
    await wait();

    expect(screen.queryByRole("heading", { name: title })).toBeNull();
  });

  it("leaves a browser that said Block alone, and a server with no push keys", async () => {
    stubBrowser("denied");
    const { unmount } = render(<AdminPushPermissionPrompt />);
    await wait();
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
    unmount();

    stubBrowser("default");
    mocks.publicKey = null;
    render(<AdminPushPermissionPrompt />);
    await wait();
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
  });

  it("stays away for a week after Not now, on its own snooze rather than the Tutor one", async () => {
    stubBrowser("default");
    render(<AdminPushPermissionPrompt />);
    await wait();
    fireEvent.click(screen.getByRole("button", { name: "এখন না" }));

    expect(screen.queryByRole("heading", { name: title })).toBeNull();
    expect(Number(window.localStorage.getItem(ADMIN_PUSH_PROMPT_SNOOZE_KEY))).toBeGreaterThan(Date.now());
    expect(window.localStorage.getItem("connect-push-prompt-until")).toBeNull();

    cleanup();
    render(<AdminPushPermissionPrompt />);
    await wait();
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
  });

  it("registers this browser as an Admin device from its button", async () => {
    stubBrowser("default");
    render(<AdminPushPermissionPrompt />);
    await wait();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "চালু করুন" })); });

    expect(mocks.subscribePush).toHaveBeenCalledWith({ endpoint: "https://push.example/new", p256dh: "p", auth: "a" });
    expect(mocks.toast.success).toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
  });
});
