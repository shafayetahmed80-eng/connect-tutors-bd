import { useAdminPushSubscribed } from "@/hooks/useAdminPushSubscribed";
import { trpc } from "@/lib/trpc";
import { supportsWebPush } from "@/lib/webPush";

function BellDot() {
  const keyQuery = trpc.admin.getPushPublicKey.useQuery(undefined, { retry: false });
  const [registered, , checked] = useAdminPushSubscribed(true);
  // A browser that said Block chose to be left alone, and a server with no push keys cannot send at all - no dot for either.
  if (!keyQuery.data?.publicKey || !checked || registered || Notification.permission === "denied") return null;
  return <span aria-hidden="true" data-testid="admin-alerts-off-dot" className="header-bell-dot" />;
}

/** A small dot on the Admin header's bell while this browser is not set up to get Admin alerts. */
export function AdminPushBellDot() {
  if (!supportsWebPush()) return null;
  return <BellDot />;
}
