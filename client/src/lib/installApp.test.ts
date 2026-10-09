import { describe, expect, it, vi } from "vitest";
import { createInstallApp } from "./installApp";

/** The browser's offer: an event carrying the one-shot prompt. */
function offer(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: typeof outcome }> };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

function setUp(runningAsInstalledApp = false) {
  const target = new EventTarget();
  const app = createInstallApp(target, () => runningAsInstalledApp);
  const stop = app.start();
  return { target, app, stop };
}

describe("createInstallApp", () => {
  it("offers nothing until the browser offers, and says so when asked to install anyway", async () => {
    const { app } = setUp();

    expect(app.canInstall()).toBe(false);
    expect(await app.prompt()).toBe("unavailable");
  });

  it("keeps the browser's offer, and stops the browser's own bar from taking it", () => {
    const { target, app } = setUp();
    const event = offer();

    target.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(app.canInstall()).toBe(true);
  });

  it("tells subscribers when an offer arrives", () => {
    const { target, app } = setUp();
    const listener = vi.fn();
    app.subscribe(listener);

    target.dispatchEvent(offer());

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("shows the prompt once, reports what the person chose, and has nothing left to offer", async () => {
    const { target, app } = setUp();
    const event = offer("accepted");
    target.dispatchEvent(event);

    expect(await app.prompt()).toBe("accepted");

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(app.canInstall()).toBe(false);
    expect(await app.prompt()).toBe("unavailable");
  });

  it("reports a dismissed prompt, and a prompt that failed to show, as dismissed", async () => {
    const dismissed = setUp();
    dismissed.target.dispatchEvent(offer("dismissed"));
    expect(await dismissed.app.prompt()).toBe("dismissed");

    const failing = setUp();
    const event = offer();
    event.prompt = vi.fn().mockRejectedValue(new Error("not allowed"));
    failing.target.dispatchEvent(event);
    expect(await failing.app.prompt()).toBe("dismissed");
  });

  it("takes the offer back once the app is installed", () => {
    const { target, app } = setUp();
    target.dispatchEvent(offer());

    target.dispatchEvent(new Event("appinstalled"));

    expect(app.canInstall()).toBe(false);
  });

  it("never offers inside the installed app itself", () => {
    const { target, app } = setUp(true);

    target.dispatchEvent(offer());

    expect(app.canInstall()).toBe(false);
  });

  it("stops listening when asked to", () => {
    const { target, app, stop } = setUp();
    stop();

    target.dispatchEvent(offer());

    expect(app.canInstall()).toBe(false);
  });
});
