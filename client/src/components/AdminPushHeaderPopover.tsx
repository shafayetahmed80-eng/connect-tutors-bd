import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Bell, CheckCircle2, Settings, Sparkles, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useAdminPushSubscribed } from "@/hooks/useAdminPushSubscribed";
import { announcePushRegistrationChange } from "@/hooks/useBrowserPushRegistered";
import { subscribeThisBrowser, supportsWebPush, testPushFailureMessage } from "@/lib/webPush";

export function AdminPushHeaderPopover() {
  const supported = supportsWebPush();
  const keyQuery = trpc.admin.getPushPublicKey.useQuery();
  const subscribeMutation = trpc.admin.subscribePush.useMutation();
  const unsubscribeMutation = trpc.admin.unsubscribePush.useMutation();
  const preferencesQuery = trpc.admin.getPushPreferences.useQuery();
  const sendTestMutation = trpc.admin.sendTestPush.useMutation();

  const [subscribed, setSubscribed] = useAdminPushSubscribed(supported);
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!supported) return;
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setPermissionDenied(true);
    }
  }, [supported]);

  if (!supported) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-bold text-j-ink">নোটিফিকেশন</p>
        <p className="text-xs text-j-ink-soft">
          আপনার ব্রাউজার ওয়েব পুশ নোটিফিকেশন সমর্থন করে না।
        </p>
      </div>
    );
  }

  const publicKey = keyQuery.data?.publicKey;

  const toggleSubscription = async () => {
    if (!publicKey) {
      toast.error("পুশ নোটিফিকেশন কনফিগারেশন পাওয়া যায়নি।");
      return;
    }
    setBusy(true);
    try {
      if (subscribed) {
        const registration = await navigator.serviceWorker.getRegistration();
        const existing = await registration?.pushManager.getSubscription();
        if (existing) {
          await unsubscribeMutation.mutateAsync({ endpoint: existing.endpoint });
          await existing.unsubscribe();
        }
        setSubscribed(false);
        announcePushRegistrationChange();
        toast.success("নোটিফিকেশন বন্ধ করা হয়েছে।");
      } else {
        const outcome = await subscribeThisBrowser(publicKey, sub => subscribeMutation.mutateAsync(sub));
        if (outcome === "denied") {
          setPermissionDenied(true);
          toast.error("ব্রাউজার নোটিফিকেশনের অনুমতি দেওয়া হয়নি।");
          return;
        }
        setPermissionDenied(false);
        setSubscribed(true);
        announcePushRegistrationChange();
        toast.success("ব্রাউজার নোটিফিকেশন চালু হয়েছে!");
      }
    } catch {
      toast.error("নোটিফিকেশন চালু/বন্ধ করতে সমস্যা হয়েছে।");
    } finally {
      setBusy(false);
    }
  };

  const handleSendTestPush = async () => {
    if (!subscribed) {
      toast.error("প্রথমে নোটিফিকেশন চালু করুন।");
      return;
    }
    setTestBusy(true);
    try {
      const result = await sendTestMutation.mutateAsync();
      if (result.sent > 0) {
        toast.success("টেস্ট নোটিফিকেশন পাঠানো হয়েছে!");
      } else {
        toast.error(testPushFailureMessage(result));
      }
    } catch {
      toast.error("টেস্ট পাঠাতে ব্যর্থ হয়েছে।");
    } finally {
      setTestBusy(false);
    }
  };

  const prefs = preferencesQuery.data;
  const activeCount = prefs
    ? [
        prefs.notifyTuitions,
        prefs.notifyApplications,
        prefs.notifyPayments,
        prefs.notifyRegistrations,
        prefs.notifyChat,
        prefs.notifyGuardianRequests,
        prefs.notifyAccountChanges,
      ].filter(Boolean).length
    : 7;

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between border-b border-j-border-light pb-2.5">
        <div>
          <h4 className="text-sm font-bold text-j-ink">ব্রাউজার অ্যালার্ট</h4>
          <p className="text-2xs text-j-ink-faint">অভিভাবক ও টিউটরদের অ্যাকশন</p>
        </div>
        {subscribed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-700">
            <CheckCircle2 className="size-3" /> সক্রিয়
          </span>
        ) : (
          <span className="rounded-full bg-j-border-light px-2 py-0.5 text-2xs font-bold text-j-ink-faint">
            নিষ্ক্রিয়
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-j-border-light/40 p-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`grid size-8 place-items-center rounded-lg ${subscribed ? "bg-emerald-50 text-emerald-600" : "bg-j-border text-j-ink-faint"}`}>
            <Bell className="size-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-j-ink">এই ডিভাইসে নোটিফিকেশন</p>
            <p className="text-2xs text-j-ink-soft">
              {subscribed ? `${activeCount}/৭টি ক্যাটাগরি চালু আছে` : "চালু করতে সুইচ অন করুন"}
            </p>
          </div>
        </div>
        <Switch
          checked={subscribed}
          disabled={busy || !publicKey}
          onCheckedChange={toggleSubscription}
          aria-label="Toggle admin push notifications"
        />
      </div>

      {permissionDenied && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-2 text-2xs text-rose-800">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-600" />
          <p>নোটিফিকেশন পারমিশন বন্ধ আছে। ব্রাউজার লক আইকন থেকে Allow করুন।</p>
        </div>
      )}

      {subscribed && (
        <button
          type="button"
          onClick={handleSendTestPush}
          disabled={testBusy}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-j-border bg-white px-2.5 py-1.5 text-xs font-semibold text-j-ink transition hover:bg-j-border-light/60 disabled:opacity-60"
        >
          <Sparkles className="size-3 text-j-accent" />
          {testBusy ? "পাঠানো হচ্ছে…" : "টেস্ট নোটিফিকেশন পাঠান"}
        </button>
      )}

      <div className="border-t border-j-border-light pt-2">
        <Link
          to="/admin/settings"
          className="flex items-center justify-between text-xs font-medium text-j-accent transition hover:text-j-accent-hover"
        >
          <span className="flex items-center gap-1.5">
            <Settings className="size-3.5" />
            ক্যাটাগরি ও সেটিংস
          </span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
