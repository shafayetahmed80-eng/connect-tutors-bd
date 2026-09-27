import webpush from "web-push";

/**
 * Kept separate from `db.ts` the same way `chat-ws.ts` is: a thin, dependency-free
 * layer around one delivery mechanism, so `db.ts` can call into it without a
 * circular import. Nothing here knows about threads, Tutors, Guardians, or
 * Admins - it only knows how to reach one already-saved browser subscription,
 * for the Admin chat-push alert and the Tutor/Guardian push feature alike.
 */

function vapidConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

if (vapidConfigured()) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@connecttutorsbd.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

/** `null` until the server has VAPID keys configured - the client then knows to leave push notifications off entirely rather than fail against a placeholder key. */
export function getWebPushPublicKey() {
  return vapidConfigured() ? (process.env.VAPID_PUBLIC_KEY as string) : null;
}

export type WebPushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string };

/** Sends one push message; `gone: true` means the browser has dropped this subscription, so the caller should delete its row. */
export async function sendWebPushNotification(subscription: WebPushSubscriptionKeys, payload: { title: string; body: string; url?: string }) {
  if (!vapidConfigured()) return { ok: false as const, gone: false };
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    );
    return { ok: true as const, gone: false };
  } catch (error) {
    const statusCode = (error as { statusCode?: number } | null)?.statusCode;
    return { ok: false as const, gone: statusCode === 404 || statusCode === 410 };
  }
}
