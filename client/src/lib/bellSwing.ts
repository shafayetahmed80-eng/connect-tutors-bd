import { useEffect, useState } from "react";

/** How often a signed-in Tutor or Guardian's header asks whether anything new has arrived. */
export const NOTIFICATION_CHECK_MS = 60_000;

/**
 * The last unread count each panel's bell has seen in this tab. It lives
 * outside React because every page change mounts the header afresh, and the
 * bell must not ring again for notifications it has already announced.
 */
const lastSeen = new Map<string, number>();

/**
 * Swings the bell once when the unread count goes up while someone is on the
 * page. The first count a tab learns - opening the dashboard with unread
 * notifications already waiting - only sets the mark; the number on the bell
 * tells them that. `undefined` means the count has not loaded yet.
 */
export function useBellSwing(panel: string, unreadCount: number | undefined) {
  const [swinging, setSwinging] = useState(false);
  useEffect(() => {
    if (unreadCount === undefined) return;
    const previous = lastSeen.get(panel);
    lastSeen.set(panel, unreadCount);
    if (previous !== undefined && unreadCount > previous) setSwinging(true);
  }, [panel, unreadCount]);
  return { swinging, stop: () => setSwinging(false) };
}

export function forgetBellCountsForTests() {
  lastSeen.clear();
}

/**
 * Bounces the bell the moment a push notification lands in this browser,
 * rather than waiting for the next `NOTIFICATION_CHECK_MS` poll to notice the
 * unread count rose. `push-sw.js` tells every open tab as soon as one
 * arrives; this is the tab side of that message.
 */
export function usePushBellBounce() {
  const [bouncing, setBouncing] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "push-received") setBouncing(true);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
  return { bouncing, stop: () => setBouncing(false) };
}
