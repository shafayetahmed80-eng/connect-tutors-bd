import { trpc } from "@/lib/trpc";
import { useBrowserPushRegistered } from "@/hooks/useBrowserPushRegistered";

/** Whether this browser is registered for the signed-in Admin's alerts - the server's answer, not the browser's. */
export function useAdminPushSubscribed(supported: boolean) {
  const utils = trpc.useUtils();
  return useBrowserPushRegistered(supported, async endpoint => (await utils.admin.isPushSubscribed.fetch({ endpoint }, { staleTime: 0 })).subscribed);
}
