import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  GraduationCap,
  FileText,
  CreditCard,
  UserCheck,
  MessageSquare,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { subscribeThisBrowser, supportsWebPush } from "@/lib/webPush";

export function AdminPushNotificationSettings() {
  const supported = supportsWebPush();
  const keyQuery = trpc.admin.getPushPublicKey.useQuery();
  const subscribeMutation = trpc.admin.subscribePush.useMutation();
  const unsubscribeMutation = trpc.admin.unsubscribePush.useMutation();
  const preferencesQuery = trpc.admin.getPushPreferences.useQuery();
  const updatePreferencesMutation = trpc.admin.updatePushPreferences.useMutation();
  const sendTestMutation = trpc.admin.sendTestPush.useMutation();
  const utils = trpc.useUtils();

  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!supported) return;
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setPermissionDenied(true);
    }
    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      setSubscribed(Boolean(existing));
    })();
  }, [supported]);

  if (!supported) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">ব্রাউজার সাপোর্ট নেই</p>
            <p className="mt-1 text-xs text-amber-800">
              আপনার বর্তমান ব্রাউজার বা ডিভাইসে ওয়েব পুশ নোটিফিকেশন সমর্থিত নয়। দয়া করে Chrome, Edge, Firefox বা Safari ব্যবহার করুন।
            </p>
          </div>
        </div>
      </div>
    );
  }

  const publicKey = keyQuery.data?.publicKey;

  const toggleSubscription = async () => {
    if (!publicKey) {
      toast.error("পুশ নোটিফিকেশন সার্ভার কনফিগারেশন পাওয়া যায়নি।");
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
        toast.success("এই ডিভাইসে নোটিফিকেশন বন্ধ করা হয়েছে।");
      } else {
        const outcome = await subscribeThisBrowser(publicKey, sub => subscribeMutation.mutateAsync(sub));
        if (outcome === "denied") {
          setPermissionDenied(true);
          toast.error("ব্রাউজার নোটিফিকেশনের অনুমতি প্রদান করা হয়নি।");
          return;
        }
        setPermissionDenied(false);
        setSubscribed(true);
        toast.success("এই ডিভাইসে নোটিফিকেশন সফলভাবে চালু হয়েছে!");
      }
    } catch (err) {
      console.error("Push toggle error:", err);
      toast.error("নোটিফিকেশন সেটিং পরিবর্তন করতে সমস্যা হয়েছে।");
    } finally {
      setBusy(false);
    }
  };

  const handleCategoryToggle = async (key: "notifyTuitions" | "notifyApplications" | "notifyPayments" | "notifyRegistrations" | "notifyChat", currentValue: boolean) => {
    const nextValue = !currentValue;
    try {
      await updatePreferencesMutation.mutateAsync({ [key]: nextValue });
      await utils.admin.getPushPreferences.invalidate();
      toast.success("ক্যাটাগরি প্রেফারেন্স আপডেট হয়েছে।");
    } catch {
      toast.error("প্রেফারেন্স সেভ করতে ব্যর্থ হয়েছে।");
    }
  };

  const handleSendTestPush = async () => {
    if (!subscribed) {
      toast.error("প্রথমে এই ডিভাইসে নোটিফিকেশন চালু করুন।");
      return;
    }
    setTestBusy(true);
    try {
      const result = await sendTestMutation.mutateAsync();
      if (result.sent > 0) {
        toast.success("টেস্ট নোটিফিকেশন পাঠানো হয়েছে! আপনার স্ক্রিনের দিকে লক্ষ্য করুন।");
      } else {
        toast.error("কোনো সক্রিয় সাবস্ক্রিপশন পাওয়া যায়নি। সুইচটি পুনরায় চালু করুন।");
      }
    } catch {
      toast.error("টেস্ট নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।");
    } finally {
      setTestBusy(false);
    }
  };

  const prefs = preferencesQuery.data ?? {
    notifyTuitions: true,
    notifyApplications: true,
    notifyPayments: true,
    notifyRegistrations: true,
    notifyChat: true,
  };

  const categories = [
    {
      key: "notifyTuitions" as const,
      icon: GraduationCap,
      iconTone: "bg-blue-50 text-blue-600",
      title: "নতুন টিউশন রিকোয়েস্ট",
      desc: "অভিভাবক নতুন টিউশন রিকোয়েস্ট পোস্ট করলে সাথে সাথে নোটিফিকেশন পাবেন।",
      value: prefs.notifyTuitions,
    },
    {
      key: "notifyApplications" as const,
      icon: FileText,
      iconTone: "bg-emerald-50 text-emerald-600",
      title: "টিউটর আবেদন",
      desc: "কোনো টিউশন পোস্টে টিউটর আবেদন করলে সাথে সাথে অ্যালার্ট পাবেন।",
      value: prefs.notifyApplications,
    },
    {
      key: "notifyPayments" as const,
      icon: CreditCard,
      iconTone: "bg-purple-50 text-purple-600",
      title: "পেমেন্ট রিপোর্ট (TrxID)",
      desc: "টিউটর ফি ভেরিফিকেশনের জন্য TrxID জমা দিলে নোটিফিকেশন আসবে।",
      value: prefs.notifyPayments,
    },
    {
      key: "notifyRegistrations" as const,
      icon: UserCheck,
      iconTone: "bg-amber-50 text-amber-600",
      title: "নতুন টিউটর রেজিস্ট্রেশন",
      desc: "নতুন কোনো টিউটর প্রোফাইল অনুমোদনের জন্য জমা দিলে তাৎক্ষণিক নোটিফিকেশন আসবে।",
      value: prefs.notifyRegistrations,
    },
    {
      key: "notifyChat" as const,
      icon: MessageSquare,
      iconTone: "bg-sky-50 text-sky-600",
      title: "টিউটর চ্যাট মেসেজ",
      desc: "টিউটর অ্যাডমিন সাপোর্টে নতুন মেসেজ পাঠালে সাথে সাথে নোটিফিকেশন আসবে।",
      value: prefs.notifyChat,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Master Toggle Card */}
      <div className="rounded-2xl border border-j-border bg-white p-5 shadow-sm transition">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className={`mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl ${subscribed ? "bg-emerald-50 text-emerald-600" : "bg-j-border-light text-j-ink-faint"}`}>
              <Bell className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-j-ink">এই ডিভাইসে নোটিফিকেশন</h4>
                {subscribed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-2xs font-bold text-emerald-700">
                    <CheckCircle2 className="size-3" /> সক্রিয়
                  </span>
                ) : (
                  <span className="rounded-full bg-j-border-light px-2 py-0.5 text-2xs font-bold text-j-ink-faint">
                    নিষ্ক্রিয়
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-j-ink-soft">
                অভিভাবক ও টিউটরদের গুরুত্বপূর্ণ অ্যাকশনগুলো সরাসরি ব্রাউজার পুশ নোটিফিকেশন হিসেবে আসবে।
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Switch
              checked={subscribed}
              disabled={busy || !publicKey}
              onCheckedChange={toggleSubscription}
              aria-label="Toggle admin push notifications on this device"
            />
          </div>
        </div>

        {permissionDenied && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
            <p className="font-semibold">⚠️ নোটিফিকেশন পারমিশন ব্লক করা রয়েছে</p>
            <p className="mt-0.5">
              ব্রাউজারের অ্যাড্রেস বারের বাম পাশে তালা (Lock) আইকনে ক্লিক করে Notification অনুমতি &quot;Allow&quot; করুন।
            </p>
          </div>
        )}

        {subscribed && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-j-border pt-3.5">
            <span className="text-2xs text-j-ink-faint">
              সংশ্লিষ্ট নোটিফিকেশনে ক্লিক করলে সরাসরি নির্দিষ্ট রিকোয়েস্ট বা আবেদন পেজে নিয়ে যাবে।
            </span>
            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={testBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-j-border bg-j-border-light/40 px-3 py-1.5 text-xs font-semibold text-j-ink transition hover:bg-j-border-light disabled:opacity-60"
            >
              <Sparkles className="size-3.5 text-j-accent" />
              {testBusy ? "পাঠানো হচ্ছে…" : "টেস্ট নোটিফিকেশন পাঠান"}
            </button>
          </div>
        )}
      </div>

      {/* Category-based Preferences */}
      <div className="rounded-2xl border border-j-border bg-white p-5 shadow-sm">
        <div className="border-b border-j-border pb-3">
          <h4 className="font-bold text-j-ink">নোটিফিকেশন ক্যাটাগরি</h4>
          <p className="mt-0.5 text-xs text-j-ink-soft">
            যে যে বিষয়ের নোটিফিকেশন পেতে চান সেগুলো চালু বা বন্ধ রাখুন।
          </p>
        </div>

        <div className="mt-3 divide-y divide-j-border-light">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.key} className="flex items-start justify-between gap-4 py-3.5 first:pt-2 last:pb-1">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ${cat.iconTone}`}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-j-ink">{cat.title}</p>
                    <p className="mt-0.5 text-xs text-j-ink-soft leading-relaxed">{cat.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={cat.value}
                  disabled={!subscribed || updatePreferencesMutation.isPending}
                  onCheckedChange={() => handleCategoryToggle(cat.key, cat.value)}
                  aria-label={`Toggle ${cat.title}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
