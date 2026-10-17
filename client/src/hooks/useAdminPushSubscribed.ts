import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Whether THIS browser is signed up for the Admin's alerts. The browser alone cannot
 * say: a subscription made for the account Notifications switch, a Tutor or Guardian
 * prompt, or an older Tutor-chat switch is still "a subscription" to it, yet the
 * server holds no row for it as an Admin device - so the switch read "on" while
 * nothing ever arrived. The server's answer decides.
 */
export function useAdminPushSubscribed(supported: boolean) {
  const utils = trpc.useUtils();
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const existing = await registration?.pushManager.getSubscription();
        if (!existing) return;
        const { subscribed: registered } = await utils.admin.isPushSubscribed.fetch({ endpoint: existing.endpoint });
        if (!cancelled) setSubscribed(registered);
      } catch {
        // Cannot tell: the switch stays off, and turning it on registers this browser properly.
      }
    })();
    return () => {
      cancelled = true;
    };
    // `utils` is left out on purpose: it only reaches the query client, and the check should run once per mount.
  }, [supported]);

  return [subscribed, setSubscribed] as const;
}
