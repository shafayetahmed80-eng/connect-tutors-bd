// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ subscribe: vi.fn(), publicKey: "public-key" as string | null, toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    pushNotifications: {
      getPublicKey: { useQuery: () => ({ data: { publicKey: mocks.publicKey } }) },
      subscribe: { useMutation: () => ({ mutateAsync: mocks.subscribe }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));

import { PUSH_PROMPT_SNOOZE_KEY, PUSH_PROMPT_SNOOZE_MS, PushPermissionPrompt } from "./PushPermissionPrompt";

function stubBrowser(permission: NotificationPermission, requestResult: NotificationPermission = "granted") {
  Object.defineProperty(window, "Notification", { configurable: true, value: { permission, requestPermission: vi.fn().mockResolvedValue(requestResult) } });
  Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager: { subscribe: vi.fn().mockResolvedValue({ toJSON: () => ({ endpoint: "https://push.example/e", keys: { p256dh: "p", auth: "a" } }) }) } }) },
  });
}

const title = "নোটিফিকেশন চালু করবেন?";
const wait = () => act(async () => { await vi.advanceTimersByTimeAsync(2000); });

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  mocks.publicKey = "public-key";
  mocks.subscribe.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("the notification prompt", () => {
  it("opens a moment after the dashboard, for a browser that was never asked", async () => {
    stubBrowser("default");
    render(<PushPermissionPrompt />);
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
    await wait();
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
  });

  it("turns notifications on from its button, which is what makes the browser's Allow box appear", async () => {
    stubBrowser("default");
    render(<PushPermissionPrompt />);
    await wait();
    expect((window.Notification as unknown as { requestPermission: () => void }).requestPermission).not.toHaveBeenCalled();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "চালু করুন" })); });
    expect(mocks.subscribe).toHaveBeenCalledWith({ endpoint: "https://push.example/e", p256dh: "p", auth: "a" });
    expect(mocks.toast.success).toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
  });

  it("stays away for a week after Not now", async () => {
    stubBrowser("default");
    const first = render(<PushPermissionPrompt />);
    await wait();
    fireEvent.click(screen.getByRole("button", { name: "এখন না" }));
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
    expect(Number(window.localStorage.getItem(PUSH_PROMPT_SNOOZE_KEY))).toBeGreaterThan(Date.now() + PUSH_PROMPT_SNOOZE_MS - 5000);
    first.unmount();

    const second = render(<PushPermissionPrompt />);
    await wait();
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
    second.unmount();

    window.localStorage.setItem(PUSH_PROMPT_SNOOZE_KEY, String(Date.now() - 1));
    render(<PushPermissionPrompt />);
    await wait();
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
  });

  it("never asks a browser that has already said yes or no", async () => {
    for (const permission of ["granted", "denied"] as const) {
      stubBrowser(permission);
      const view = render(<PushPermissionPrompt />);
      await wait();
      expect(screen.queryByRole("heading", { name: title })).toBeNull();
      view.unmount();
    }
  });

  it("says nothing where the server has no push keys, or the browser cannot do push", async () => {
    stubBrowser("default");
    mocks.publicKey = null;
    const noKeys = render(<PushPermissionPrompt />);
    await wait();
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
    noKeys.unmount();

    mocks.publicKey = "public-key";
    delete (window as unknown as { PushManager?: unknown }).PushManager;
    render(<PushPermissionPrompt />);
    await wait();
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
  });

  it("closes quietly when the person blocks it in the browser's own box", async () => {
    stubBrowser("default", "denied");
    render(<PushPermissionPrompt />);
    await wait();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "চালু করুন" })); });
    expect(mocks.subscribe).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
  });
});
