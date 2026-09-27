import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { supportsWebPush, urlBase64ToUint8Array } from "@/lib/webPush";

/**
 * Lets a Tutor or Guardian turn on push notifications for this browser - the
 * same subscribe flow the Admin chat alert already proved
 * (`ChatPushToggle` in `AdminTutorChats.tsx`), just under the Settings item
 * both panels' account pages already have a slot for. Renders nothing on a
 * deployment with no VAPID keys configured, or a browser that cannot do push.
 */
export function PushNotificationToggle() {
  const keyQuery = trpc.pushNotifications.getPublicKey.useQuery();
  const subscribeMutation = trpc.pushNotifications.subscribe.useMutation();
  const unsubscribeMutation = trpc.pushNotifications.unsubscribe.useMutation();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = supportsWebPush();

  useEffect(() => {
    if (!supported) return;
    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      setSubscribed(Boolean(existing));
    })();
  }, [supported]);

  if (!supported || !keyQuery.data?.publicKey) return null;
  const publicKey = keyQuery.data.publicKey;

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("The browser did not return a usable subscription.");
      await subscribeMutation.mutateAsync({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
      setSubscribed(true);
      toast.success("Notifications are on for this browser.");
    } catch {
      toast.error("Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      if (existing) {
        await unsubscribeMutation.mutateAsync({ endpoint: existing.endpoint });
        await existing.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  };

  return <div className="flex items-center justify-between gap-3">
    <div>
      <p className="text-sm font-bold text-j-ink-strong">{subscribed ? "On for this browser" : "Off for this browser"}</p>
      <p className="mt-0.5 text-xs text-j-ink-soft">Get notified here when something new happens - a new message, a decision, a payment.</p>
    </div>
    <Switch checked={subscribed} disabled={busy} onCheckedChange={() => void (subscribed ? disable() : enable())} aria-label="Push notifications for this browser" />
  </div>;
}
