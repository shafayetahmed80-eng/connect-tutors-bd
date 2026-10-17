import { trpc } from "@/lib/trpc";
import { useBrowserPushRegistered } from "@/hooks/useBrowserPushRegistered";

/** Whether this browser is registered for the signed-in Tutor's or Guardian's alerts - the server's answer, not the browser's. */
export function usePushSubscribed(supported: boolean) {
  const utils = trpc.useUtils();
  return useBrowserPushRegistered(supported, async endpoint => (await utils.pushNotifications.isSubscribed.fetch({ endpoint }, { staleTime: 0 })).subscribed);
}
