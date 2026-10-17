import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PushSetupError, describePushSetupFailure, subscribeThisBrowser, testPushFailureMessage } from "./webPush";

const goodSubscription = {
  toJSON: () => ({ endpoint: "https://push.example/new", keys: { p256dh: "p256", auth: "authkey" } }),
};

function stubBrowser(pushManager: { subscribe: ReturnType<typeof vi.fn>; getSubscription: ReturnType<typeof vi.fn> }) {
  vi.stubGlobal("Notification", { requestPermission: vi.fn().mockResolvedValue("granted") });
  vi.stubGlobal("navigator", { serviceWorker: { ready: Promise.resolve({ pushManager }) } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function stubReady(ready: Promise<unknown>) {
  vi.stubGlobal("Notification", { requestPermission: vi.fn().mockResolvedValue("granted") });
  vi.stubGlobal("navigator", { serviceWorker: { ready } });
}

async function failureOf(run: Promise<unknown>) {
  return run.then(() => null, (error: unknown) => error as PushSetupError);
}

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

describe("names the step that failed", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("the phone's push service refusing the registration", async () => {
    const subscribe = vi.fn().mockRejectedValue(Object.assign(new Error("Registration failed - push service error"), { name: "AbortError" }));
    stubBrowser({ subscribe, getSubscription: vi.fn() });

    const error = await failureOf(subscribeThisBrowser("AAAA", vi.fn()));

    expect(error).toBeInstanceOf(PushSetupError);
    expect(error).toMatchObject({ step: "push-service" });
    expect(error!.detail).toContain("AbortError");
    expect(error!.detail).toContain("push service error");
    expect(describePushSetupFailure(error)).toContain("AbortError");
  });

  it("the permission step itself failing", async () => {
    vi.stubGlobal("Notification", { requestPermission: vi.fn().mockRejectedValue(new Error("not allowed here")) });
    vi.stubGlobal("navigator", { serviceWorker: { ready: Promise.resolve({}) } });

    await expect(failureOf(subscribeThisBrowser("AAAA", vi.fn()))).resolves.toMatchObject({ step: "permission" });
  });

  it("no service worker ever becoming active", async () => {
    vi.useFakeTimers();
    stubReady(new Promise(() => {}));

    const pending = failureOf(subscribeThisBrowser("AAAA", vi.fn()));
    await vi.advanceTimersByTimeAsync(10_001);

    await expect(pending).resolves.toMatchObject({ step: "service-worker" });
  });

  it("the server not saving the subscription, with the server's own code", async () => {
    stubBrowser({ subscribe: vi.fn().mockResolvedValue(goodSubscription), getSubscription: vi.fn() });
    const save = vi.fn().mockRejectedValue(Object.assign(new Error("Forbidden"), { name: "TRPCClientError", data: { code: "FORBIDDEN" } }));

    const error = await failureOf(subscribeThisBrowser("AAAA", save));

    expect(error).toMatchObject({ step: "save", detail: "FORBIDDEN" });
  });

  it("the browser handing back an unusable subscription", async () => {
    stubBrowser({ subscribe: vi.fn().mockResolvedValue({ toJSON: () => ({ endpoint: "https://push.example/x" }) }), getSubscription: vi.fn() });

    await expect(failureOf(subscribeThisBrowser("AAAA", vi.fn()))).resolves.toMatchObject({ step: "browser-answer" });
  });

  it("says nothing more than a plain failure for an error that is not a setup step", () => {
    expect(describePushSetupFailure(new Error("x"))).not.toContain("x:");
  });
});
