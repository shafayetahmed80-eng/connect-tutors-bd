import { PushPromptDialog } from "@/components/PushPermissionPrompt";
import { useAdminPushSubscribed } from "@/hooks/useAdminPushSubscribed";
import { trpc } from "@/lib/trpc";
import { supportsWebPush } from "@/lib/webPush";

/** Kept apart from the Tutor and Guardian prompt's snooze: an Admin's "Not now" says nothing about those panels. */
export const ADMIN_PUSH_PROMPT_SNOOZE_KEY = "connect-admin-push-prompt-until";

function AdminPushPermissionPromptDialog() {
  const keyQuery = trpc.admin.getPushPublicKey.useQuery(undefined, { retry: false });
  const subscribeMutation = trpc.admin.subscribePush.useMutation();
  const [registered, , checked] = useAdminPushSubscribed(true);

  // Unlike a Tutor's, an Admin's browser may already be allowed (and even hold a subscription) from another switch
  // while the server has no record of it as an Admin device - that case is asked too. Only a browser that said Block is left alone.
  return <PushPromptDialog
    shouldOpen={checked && !registered && Notification.permission !== "denied"}
    publicKey={keyQuery.data?.publicKey ?? null}
    save={subscription => subscribeMutation.mutateAsync(subscription)}
    snoozeKey={ADMIN_PUSH_PROMPT_SNOOZE_KEY}
    body="নতুন টিউশন, টিউটরের আবেদন, পেমেন্ট রিপোর্ট আর চ্যাটের খবর ফোনে সঙ্গে সঙ্গে পেতে চালু করুন। এরপর ব্রাউজার অনুমতি চাইবে, সেখানে Allow করুন।"
    successMessage="এই ডিভাইসে নোটিফিকেশন সফলভাবে চালু হয়েছে!"
  />;
}

/**
 * Asks a signed-in Admin, once the workspace is up, whether to turn on phone alerts
 * on this browser. Renders nothing where push cannot work, so the network checks only
 * run where they can matter; a server with no VAPID keys answers with no key and the
 * dialog stays shut.
 */
export function AdminPushPermissionPrompt() {
  if (!supportsWebPush()) return null;
  return <AdminPushPermissionPromptDialog />;
}
