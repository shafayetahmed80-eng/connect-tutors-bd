import { and, eq, inArray } from "drizzle-orm";
import type { getDb } from "./db";
import { adminPushPreferences, adminPushSubscriptions } from "../drizzle/schema";
import { sendWebPushNotification } from "./chat-push";
import type { PushPayload } from "@shared/push-messages";

export type AdminPushCategory =
  | "tuition_request"
  | "tutor_application"
  | "payment_report"
  | "tutor_registration"
  | "tutor_chat";

export type AdminPushPreferences = {
  notifyTuitions: boolean;
  notifyApplications: boolean;
  notifyPayments: boolean;
  notifyRegistrations: boolean;
  notifyChat: boolean;
};

export const DEFAULT_ADMIN_PUSH_PREFERENCES: AdminPushPreferences = {
  notifyTuitions: true,
  notifyApplications: true,
  notifyPayments: true,
  notifyRegistrations: true,
  notifyChat: true,
};

export type AdminPushEvent =
  | {
      type: "tuition_request";
      requestId: number;
      classCourse?: string | null;
      guardianName?: string | null;
      locationText?: string | null;
    }
  | {
      type: "tutor_application";
      requestId: number;
      jobId?: string | null;
      tutorName?: string | null;
    }
  | {
      type: "payment_report";
      requestId: number;
      amount: number;
      tutorName?: string | null;
    }
  | {
      type: "tutor_registration";
      tutorId: string;
      tutorName: string;
      instituteName?: string | null;
    }
  | {
      type: "tutor_chat";
      tutorId: string;
      tutorName?: string | null;
      preview?: string | null;
    };

export function formatAdminPushPayload(event: AdminPushEvent): { payload: PushPayload; category: AdminPushCategory } {
  switch (event.type) {
    case "tuition_request": {
      const subjectDesc = event.classCourse ? ` (${event.classCourse})` : "";
      const loc = event.locationText ? ` · ${event.locationText}` : "";
      return {
        category: "tuition_request",
        payload: {
          title: `নতুন টিউশন রিকোয়েস্ট${subjectDesc}`,
          body: `${event.guardianName || "অভিভাবক"} নতুন টিউশন রিকোয়েস্ট জমা দিয়েছেন${loc}।`,
          url: `/admin/tutor-matching/${event.requestId}`,
          tag: `admin-tuition-${event.requestId}`,
          groupTitle: "{n}টি নতুন টিউশন রিকোয়েস্ট",
          groupUrl: "/admin/posted-jobs",
        },
      };
    }
    case "tutor_application": {
      const jobDisplay = event.jobId ? ` (${event.jobId})` : "";
      return {
        category: "tutor_application",
        payload: {
          title: `টিউশনে নতুন আবেদন${jobDisplay}`,
          body: `${event.tutorName || "একজন টিউটর"} টিউশনে আবেদন করেছেন। পর্যালোচনা করুন।`,
          url: `/admin/applied-tutors/${event.requestId}`,
          tag: `admin-app-${event.requestId}`,
          groupTitle: "{n}টি নতুন টিউটর আবেদন",
          groupUrl: `/admin/applied-tutors/${event.requestId}`,
        },
      };
    }
    case "payment_report": {
      return {
        category: "payment_report",
        payload: {
          title: `নতুন পেমেন্ট রিপোর্ট (৳${event.amount.toLocaleString("en-US")})`,
          body: `${event.tutorName || "টিউটর"} ভেরিফিকেশনের জন্য পেমেন্ট TrxID জমা দিয়েছেন।`,
          url: `/admin/confirmed-jobs`,
          tag: `admin-payment-${event.requestId}`,
          groupTitle: "{n}টি নতুন পেমেন্ট রিপোর্ট",
          groupUrl: "/admin/confirmed-jobs",
        },
      };
    }
    case "tutor_registration": {
      const inst = event.instituteName ? ` (${event.instituteName})` : "";
      return {
        category: "tutor_registration",
        payload: {
          title: "নতুন টিউটর রেজিস্ট্রেশন",
          body: `${event.tutorName}${inst} প্রোফাইল অনুমোদনের জন্য জমা দিয়েছেন।`,
          url: `/admin/tutor-profiles/${event.tutorId}`,
          tag: `admin-reg-${event.tutorId}`,
          groupTitle: "{n}টি নতুন টিউটর রেজিস্ট্রেশন",
          groupUrl: "/admin/tutor-profiles",
        },
      };
    }
    case "tutor_chat": {
      const name = event.tutorName || "টিউটর";
      return {
        category: "tutor_chat",
        payload: {
          title: `${name} একটি মেসেজ পাঠিয়েছেন`,
          body: event.preview || "নতুন মেসেজ পাঠিয়েছেন",
          url: `/admin/tutor-chats?tutorId=${event.tutorId}`,
          tag: `admin-chat-${event.tutorId}`,
          groupTitle: "{n}টি নতুন টিউটর চ্যাট মেসেজ",
          groupUrl: `/admin/tutor-chats?tutorId=${event.tutorId}`,
        },
      };
    }
  }
}

function categoryToPrefKey(category: AdminPushCategory): keyof AdminPushPreferences {
  switch (category) {
    case "tuition_request":
      return "notifyTuitions";
    case "tutor_application":
      return "notifyApplications";
    case "payment_report":
      return "notifyPayments";
    case "tutor_registration":
      return "notifyRegistrations";
    case "tutor_chat":
      return "notifyChat";
  }
}

type DatabaseInstance = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function notifyAdminsOfEvent(database: DatabaseInstance, event: AdminPushEvent) {
  try {
    const { payload, category } = formatAdminPushPayload(event);
    const prefKey = categoryToPrefKey(category);

    const subscriptions = await database
      .select({
        id: adminPushSubscriptions.id,
        adminId: adminPushSubscriptions.adminId,
        endpoint: adminPushSubscriptions.endpoint,
        p256dh: adminPushSubscriptions.p256dh,
        auth: adminPushSubscriptions.auth,
        prefValue: adminPushPreferences[prefKey],
      })
      .from(adminPushSubscriptions)
      .leftJoin(adminPushPreferences, eq(adminPushPreferences.adminId, adminPushSubscriptions.adminId));

    if (subscriptions.length === 0) return { sent: 0 };

    // Subscriptions where pref is null (default true) or explicitly true:
    const active = subscriptions.filter(sub => sub.prefValue !== false);
    if (active.length === 0) return { sent: 0 };

    const results = await Promise.all(
      active.map(async sub => ({
        id: sub.id,
        result: await sendWebPushNotification(sub, payload),
      }))
    );

    const goneIds = results.filter(row => row.result.gone).map(row => row.id);
    if (goneIds.length > 0) {
      await database.delete(adminPushSubscriptions).where(inArray(adminPushSubscriptions.id, goneIds));
    }

    return { sent: results.filter(r => r.result.ok).length };
  } catch (err) {
    console.error("Failed to notify admins of push event:", err);
    return { sent: 0 };
  }
}

export async function getAdminPushPreferences(database: DatabaseInstance, adminId: number): Promise<AdminPushPreferences> {
  const [row] = await database
    .select()
    .from(adminPushPreferences)
    .where(eq(adminPushPreferences.adminId, adminId))
    .limit(1);

  if (!row) return { ...DEFAULT_ADMIN_PUSH_PREFERENCES };

  return {
    notifyTuitions: Boolean(row.notifyTuitions),
    notifyApplications: Boolean(row.notifyApplications),
    notifyPayments: Boolean(row.notifyPayments),
    notifyRegistrations: Boolean(row.notifyRegistrations),
    notifyChat: Boolean(row.notifyChat),
  };
}

export async function updateAdminPushPreferences(
  database: DatabaseInstance,
  adminId: number,
  updates: Partial<AdminPushPreferences>
): Promise<AdminPushPreferences> {
  const current = await getAdminPushPreferences(database, adminId);
  const next: AdminPushPreferences = {
    notifyTuitions: updates.notifyTuitions ?? current.notifyTuitions,
    notifyApplications: updates.notifyApplications ?? current.notifyApplications,
    notifyPayments: updates.notifyPayments ?? current.notifyPayments,
    notifyRegistrations: updates.notifyRegistrations ?? current.notifyRegistrations,
    notifyChat: updates.notifyChat ?? current.notifyChat,
  };

  await database
    .insert(adminPushPreferences)
    .values({
      adminId,
      ...next,
    })
    .onDuplicateKeyUpdate({
      set: {
        ...next,
        updatedAt: new Date(),
      },
    });

  return next;
}

export async function sendTestAdminPushNotification(database: DatabaseInstance, adminId: number) {
  const subscriptions = await database
    .select()
    .from(adminPushSubscriptions)
    .where(eq(adminPushSubscriptions.adminId, adminId));

  if (subscriptions.length === 0) return { sent: 0, reason: "no_subscription" as const };

  const payload: PushPayload = {
    title: "🔔 কানেক্ট টিউটরস টেস্ট অ্যালার্ট",
    body: "আপনার ব্রাউজারে অ্যাডমিন পুশ নোটিফিকেশন সফলভাবে কাজ করছে!",
    url: "/admin/settings",
    tag: `admin-test-${Date.now()}`,
  };

  const results = await Promise.all(
    subscriptions.map(async sub => ({
      id: sub.id,
      result: await sendWebPushNotification(sub, payload),
    }))
  );

  const goneIds = results.filter(row => row.result.gone).map(row => row.id);
  if (goneIds.length > 0) {
    await database.delete(adminPushSubscriptions).where(inArray(adminPushSubscriptions.id, goneIds));
  }

  const sent = results.filter(r => r.result.ok).length;
  if (sent > 0) return { sent, reason: "ok" as const, statusCode: undefined };
  // Nothing went out: say which of the two ways it can fail, so the screen does not claim "no subscription" when the real trouble is the server's keys or the push service refusing.
  if (results.every(row => row.result.notConfigured)) return { sent: 0, reason: "not_configured" as const, statusCode: undefined };
  return { sent: 0, reason: "rejected" as const, statusCode: results.find(row => row.result.statusCode)?.result.statusCode };
}

/** Whether this very browser (its `endpoint`) is registered on the server to get this Admin's alerts - not merely whether the browser holds some push subscription. */
export async function isAdminPushSubscribed(database: DatabaseInstance, adminId: number, endpoint: string) {
  const [row] = await database
    .select({ id: adminPushSubscriptions.id })
    .from(adminPushSubscriptions)
    .where(and(eq(adminPushSubscriptions.adminId, adminId), eq(adminPushSubscriptions.endpoint, endpoint)))
    .limit(1);
  return { subscribed: Boolean(row) };
}
