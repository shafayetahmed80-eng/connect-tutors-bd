/** `PushManager.subscribe` wants the VAPID public key as this, not the base64url string the server hands back. */
export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

/** Whether this browser can do push notifications at all - renders nothing rather than offering a toggle that can only fail. */
export function supportsWebPush() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export type PushSetupStep = "permission" | "service-worker" | "push-service" | "browser-answer" | "save";

/** A failed setup that remembers which step failed, so the screen can say so instead of a bare "something went wrong". */
export class PushSetupError extends Error {
  readonly step: PushSetupStep;
  /** The browser's own name for what went wrong, short enough for a toast. */
  readonly detail: string;

  constructor(step: PushSetupStep, cause: unknown) {
    const original = cause as { name?: string; message?: string; data?: { code?: string } } | null;
    super(original?.message || String(cause));
    this.name = "PushSetupError";
    this.step = step;
    this.detail = [original?.data?.code ?? original?.name, step === "push-service" ? original?.message : undefined].filter(Boolean).join(": ").slice(0, 90);
  }
}

async function atStep<T>(step: PushSetupStep, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    console.error("[push] setup failed at the", step, "step:", error);
    throw new PushSetupError(step, error);
  }
}

const SERVICE_WORKER_WAIT_MS = 10_000;

/** `serviceWorker.ready` never settles when no worker could be installed; give up with a reason instead of spinning. */
function serviceWorkerReady() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const giveUp = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("The service worker did not become active.")), SERVICE_WORKER_WAIT_MS);
  });
  return Promise.race([navigator.serviceWorker.ready, giveUp]).finally(() => clearTimeout(timer));
}

/**
 * Asks the browser for permission, subscribes it against the server's VAPID key
 * and hands the subscription to `save`. Resolves `"denied"` when the person
 * refuses (nothing is saved) and throws a `PushSetupError` naming the step when
 * anything else goes wrong. One flow for the Settings switch and the
 * first-sign-in prompt.
 */
export async function subscribeThisBrowser(
  publicKey: string,
  save: (subscription: { endpoint: string; p256dh: string; auth: string }) => Promise<unknown>,
): Promise<"subscribed" | "denied"> {
  const permission = await atStep("permission", () => Notification.requestPermission());
  if (permission !== "granted") return "denied";
  const registration = await atStep("service-worker", serviceWorkerReady);
  const subscription = await atStep("push-service", async () => {
    const options = { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) };
    try {
      return await registration.pushManager.subscribe(options);
    } catch (error) {
      // A subscription made against an older server key blocks a new one until it is dropped.
      if ((error as { name?: string } | null)?.name !== "InvalidStateError") throw error;
      await (await registration.pushManager.getSubscription())?.unsubscribe();
      return registration.pushManager.subscribe(options);
    }
  });
  const json = await atStep("browser-answer", async () => subscription.toJSON());
  const { endpoint, keys } = json;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new PushSetupError("browser-answer", new Error("The browser did not return a usable subscription."));
  }
  await atStep("save", () => save({ endpoint, p256dh: keys.p256dh!, auth: keys.auth! }).then(() => undefined));
  return "subscribed";
}

const setupStepLabels: Record<PushSetupStep, string> = {
  permission: "অনুমতির ধাপ",
  "service-worker": "সার্ভিস ওয়ার্কার",
  "push-service": "ফোনের পুশ সার্ভিস",
  "browser-answer": "ব্রাউজারের উত্তর",
  save: "সার্ভারে সেভ",
};

/** The one line a failed turn-on shows: which step, and the browser's own word for it. */
export function describePushSetupFailure(error: unknown) {
  if (error instanceof PushSetupError) return `নোটিফিকেশন চালু করা যায়নি (${setupStepLabels[error.step]}: ${error.detail})।`;
  return "নোটিফিকেশন চালু করা যায়নি।";
}

/** What a failed test push tells the Admin: the real reason, not always "no subscription". */
export function testPushFailureMessage(result: { reason: "ok" | "no_subscription" | "not_configured" | "rejected"; statusCode?: number }) {
  if (result.reason === "not_configured") return "সার্ভারে পুশ নোটিফিকেশনের চাবি (VAPID) বসানো নেই।";
  if (result.reason === "rejected") return `ব্রাউজারের পুশ সার্ভিস নোটিফিকেশন নেয়নি (কোড ${result.statusCode ?? "?"})। সুইচটি বন্ধ করে আবার চালু করুন।`;
  return "কোনো সক্রিয় সাবস্ক্রিপশন পাওয়া যায়নি। সুইচটি পুনরায় চালু করুন।";
}
