import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
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
  const [showExplainer, setShowExplainer] = useState(false);
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

  const onToggle = () => {
    if (subscribed) { void disable(); return; }
    // First time this browser is asked, explain why before the browser's own
    // permission prompt appears - a bare native dialog with no context is
    // often just reflexively dismissed. Already decided (granted or denied)
    // means asking again shows no prompt anyway, so there is nothing to explain.
    if (Notification.permission === "default") { setShowExplainer(true); return; }
    void enable();
  };

  return <>
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-j-ink-strong">{subscribed ? "On for this browser" : "Off for this browser"}</p>
        <p className="mt-0.5 text-xs text-j-ink-soft">Get notified here when something new happens - a new message, a decision, a payment.</p>
      </div>
      <Switch checked={subscribed} disabled={busy} onCheckedChange={onToggle} aria-label="Push notifications for this browser" />
    </div>
    {showExplainer ? <Modal size="sm" onClose={() => setShowExplainer(false)}>
      <ModalHeader title="নোটিফিকেশন চালু করবেন?" />
      <ModalBody>
        <p className="text-sm text-j-ink-soft">
          এটা অন করলে পেমেন্ট, অ্যাপয়েন্টমেন্ট বা কোনো সিদ্ধান্তের মতো গুরুত্বপূর্ণ আপডেট সাইট খোলা না থাকলেও সরাসরি এই ব্রাউজারে নোটিফিকেশন হিসেবে আসবে।
          এরপর ব্রাউজার নিজে থেকে একটা অনুমতি চাইবে - সেখানে Allow করুন।
        </p>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setShowExplainer(false)} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">বাতিল</button>
        <button
          type="button"
          onClick={() => { setShowExplainer(false); void enable(); }}
          className="h-10 rounded-xl bg-[#0f7048] px-4 text-sm font-bold text-white hover:bg-[#0c5b3a]"
        >চালিয়ে যান</button>
      </ModalFooter>
    </Modal> : null}
  </>;
}
