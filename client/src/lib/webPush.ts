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
