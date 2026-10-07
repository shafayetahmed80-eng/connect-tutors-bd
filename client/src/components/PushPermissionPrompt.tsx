import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { subscribeThisBrowser, supportsWebPush } from "@/lib/webPush";

/** "Not now" keeps the prompt away for a week; a browser that has answered (Allow or Block) is never asked again. */
export const PUSH_PROMPT_SNOOZE_KEY = "connect-push-prompt-until";
export const PUSH_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** A beat after the dashboard opens, so it does not land on top of the page while it is still drawing. */
const PROMPT_DELAY_MS = 1800;

function snoozedUntil() {
  try {
    return Number(window.localStorage.getItem(PUSH_PROMPT_SNOOZE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function snoozeForAWeek() {
  try {
    window.localStorage.setItem(PUSH_PROMPT_SNOOZE_KEY, String(Date.now() + PUSH_PROMPT_SNOOZE_MS));
  } catch {
    // Without storage the prompt simply comes back next visit.
  }
}

function PushPermissionPromptDialog() {
  const keyQuery = trpc.pushNotifications.getPublicKey.useQuery(undefined, { retry: false });
  const subscribeMutation = trpc.pushNotifications.subscribe.useMutation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const publicKey = keyQuery.data?.publicKey ?? null;

  useEffect(() => {
    // Permission still "default" means this browser was never asked, so it cannot hold a subscription either.
    if (!publicKey || Notification.permission !== "default" || snoozedUntil() > Date.now()) return;
    const timer = setTimeout(() => setOpen(true), PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [publicKey]);

  if (!open || !publicKey) return null;

  const notNow = () => {
    snoozeForAWeek();
    setOpen(false);
  };

  // On a phone the browser's own Allow box only appears after a tap, which is why this is a button and not automatic.
  const turnOn = async () => {
    setBusy(true);
    try {
      const outcome = await subscribeThisBrowser(publicKey, subscription => subscribeMutation.mutateAsync(subscription));
      if (outcome === "subscribed") toast.success("Notifications are on for this browser.");
      setOpen(false);
    } catch {
      toast.error("Could not enable notifications.");
      snoozeForAWeek();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return <Modal size="sm" onClose={notNow}>
    <ModalHeader title="নোটিফিকেশন চালু করবেন?" />
    <ModalBody>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#dff2ff] text-j-accent"><Bell size={18} aria-hidden="true" /></span>
        <p className="text-sm leading-6 text-j-ink-soft">
          চালু করলে অ্যাপয়েন্টমেন্ট, লেটার বা কোনো সিদ্ধান্তের মতো গুরুত্বপূর্ণ আপডেট ফোনের লক স্ক্রিনেও নোটিফিকেশন হিসেবে আসবে।
          এরপর ব্রাউজার একটা অনুমতি চাইবে, সেখানে Allow করুন।
        </p>
      </div>
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={notNow} disabled={busy} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">এখন না</button>
      <button type="button" onClick={() => void turnOn()} disabled={busy} className="h-10 rounded-xl bg-j-accent px-4 text-sm font-bold text-white hover:bg-j-accent-hover disabled:opacity-60">চালু করুন</button>
    </ModalFooter>
  </Modal>;
}

/**
 * Asks a signed-in Tutor or Guardian, once the dashboard is up, whether to turn
 * on phone notifications. Renders nothing at all where push cannot work (no
 * browser support), so the checks that need the network only run where they can
 * matter; a server with no VAPID keys answers with no key and the dialog stays shut.
 */
export function PushPermissionPrompt() {
  if (!supportsWebPush()) return null;
  return <PushPermissionPromptDialog />;
}
