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

/**
 * Asks the browser for permission, subscribes it against the server's VAPID key
 * and hands the subscription to `save`. Resolves `"denied"` when the person
 * refuses (nothing is saved) and throws when the browser gives back something
 * unusable. One flow for the Settings switch and the first-sign-in prompt.
 */
export async function subscribeThisBrowser(
  publicKey: string,
  save: (subscription: { endpoint: string; p256dh: string; auth: string }) => Promise<unknown>,
): Promise<"subscribed" | "denied"> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("The browser did not return a usable subscription.");
  await save({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
  return "subscribed";
}
