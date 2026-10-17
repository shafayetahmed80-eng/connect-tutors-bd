import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeThisBrowser, testPushFailureMessage } from "./webPush";

const goodSubscription = {
  toJSON: () => ({ endpoint: "https://push.example/new", keys: { p256dh: "p256", auth: "authkey" } }),
};

function stubBrowser(pushManager: { subscribe: ReturnType<typeof vi.fn>; getSubscription: ReturnType<typeof vi.fn> }) {
  vi.stubGlobal("Notification", { requestPermission: vi.fn().mockResolvedValue("granted") });
  vi.stubGlobal("navigator", { serviceWorker: { ready: Promise.resolve({ pushManager }) } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("subscribeThisBrowser", () => {
  it("drops a subscription made against an older server key and subscribes again", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const subscribe = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("different applicationServerKey"), { name: "InvalidStateError" }))
      .mockResolvedValueOnce(goodSubscription);
    stubBrowser({ subscribe, getSubscription: vi.fn().mockResolvedValue({ unsubscribe }) });
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(subscribeThisBrowser("AAAA", save)).resolves.toBe("subscribed");

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith({ endpoint: "https://push.example/new", p256dh: "p256", auth: "authkey" });
  });

  it("does not hide any other failure", async () => {
    const subscribe = vi.fn().mockRejectedValue(Object.assign(new Error("push service unreachable"), { name: "AbortError" }));
    stubBrowser({ subscribe, getSubscription: vi.fn() });
    const save = vi.fn();

    await expect(subscribeThisBrowser("AAAA", save)).rejects.toThrow("push service unreachable");
    expect(save).not.toHaveBeenCalled();
  });
});

describe("testPushFailureMessage", () => {
  it("names the real reason a test notification did not go out", () => {
    expect(testPushFailureMessage({ reason: "rejected", statusCode: 403 })).toContain("403");
    expect(testPushFailureMessage({ reason: "not_configured" })).toContain("VAPID");
    expect(testPushFailureMessage({ reason: "no_subscription" })).not.toContain("VAPID");
  });
});
