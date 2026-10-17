import { and, eq, inArray } from "drizzle-orm";
import type { getDb } from "./db";
import { adminPushPreferences, adminPushSubscriptions } from "../drizzle/schema";
import { sendWebPushNotification } from "./chat-push";
import type { PushPayload } from "@shared/push-messages";
import { jobIdForRequest } from "@shared/job-id";
import { accountChangeTypeBengaliLabels, type AccountChangeType } from "@shared/account-change-requests";

export type AdminPushCategory =
  | "tuition_request"
  | "tutor_application"
  | "payment_report"
  | "tutor_registration"
  | "tutor_chat"
  | "guardian_request"
  | "account_change";

export type AdminPushPreferences = {
  notifyTuitions: boolean;
  notifyApplications: boolean;
  notifyPayments: boolean;
  notifyRegistrations: boolean;
  notifyChat: boolean;
  notifyGuardianRequests: boolean;
  notifyAccountChanges: boolean;
};

export const DEFAULT_ADMIN_PUSH_PREFERENCES: AdminPushPreferences = {
  notifyTuitions: true,
  notifyApplications: true,
  notifyPayments: true,
  notifyRegistrations: true,
  notifyChat: true,
  notifyGuardianRequests: true,
  notifyAccountChanges: true,
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
    }
  | {
      /** A Guardian asks an Admin to appoint a Tutor, confirm the appointed one, remove the Tutor, or cancel the tuition. */
      type: "guardian_request";
      requestId: number;
      kind: GuardianRequestAlertKind;
      guardianName?: string | null;
    }
  | {
      type: "account_change";
      requestRole: "guardian" | "tutor" | "admin";
      changeType: AccountChangeType;
      personName?: string | null;
    };

export type GuardianRequestAlertKind = "appoint" | "confirm" | "remove_tutor" | "cancel_tuition";

/** What the lock-screen line says and which Admin screen answers it. Removing a Tutor and cancelling the tuition share the Cancel Requests screen. */
const guardianRequestCopy: Record<GuardianRequestAlertKind, { title: string; asked: string; screen: "appoint" | "confirm" | "cancel" }> = {
  appoint: { title: "অ্যাপয়েন্টমেন্টের অনুরোধ", asked: "একজন টিউটরকে অ্যাপয়েন্ট করার অনুরোধ করেছেন", screen: "appoint" },
  confirm: { title: "টিউশন কনফার্মের অনুরোধ", asked: "টিউশন কনফার্ম করার অনুরোধ করেছেন", screen: "confirm" },
  remove_tutor: { title: "টিউটর সরানোর অনুরোধ", asked: "অ্যাপয়েন্ট করা টিউটরকে সরানোর অনুরোধ করেছেন", screen: "cancel" },
  cancel_tuition: { title: "টিউশন বাতিলের অনুরোধ", asked: "টিউশন বাতিলের অনুরোধ করেছেন", screen: "cancel" },
};

const accountChangeRoleLabels = { guardian: "অভিভাবক", tutor: "টিউটর", admin: "অ্যাডমিন" } as const;

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
    case "guardian_request":
      return { category: "guardian_request", payload: formatGuardianRequestPayload(event) };
    case "account_change":
      return { category: "account_change", payload: formatAccountChangePayload(event) };
  }
}

export function formatGuardianRequestPayload(event: Extract<AdminPushEvent, { type: "guardian_request" }>): PushPayload {
  const copy = guardianRequestCopy[event.kind];
  const screen = `/admin/guardian-requests/${copy.screen}`;
  return {
    title: `${copy.title} (জব #${jobIdForRequest(event.requestId)})`,
    body: `${event.guardianName || "অভিভাবক"} ${copy.asked}। উত্তর দিন।`,
    url: screen,
    tag: `admin-greq-${event.kind}-${event.requestId}`,
    groupTitle: "{n}টি নতুন অভিভাবকের অনুরোধ",
    groupUrl: screen,
  };
}

export function formatAccountChangePayload(event: Extract<AdminPushEvent, { type: "account_change" }>): PushPayload {
  return {
    title: "অ্যাকাউন্ট পরিবর্তনের অনুরোধ",
    body: `${event.personName || "একজন ব্যবহারকারী"} (${accountChangeRoleLabels[event.requestRole]}) ${accountChangeTypeBengaliLabels[event.changeType]} চেয়েছেন।`,
    url: "/admin/change-requests",
    tag: `admin-change-${event.requestRole}-${event.changeType}`,
    groupTitle: "{n}টি নতুন অ্যাকাউন্ট পরিবর্তনের অনুরোধ",
    groupUrl: "/admin/change-requests",
  };
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
    case "guardian_request":
      return "notifyGuardianRequests";
    case "account_change":
      return "notifyAccountChanges";
  }
}

type DatabaseInstance = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** `onlyAdminId` narrows the alert to one Admin's devices - another Admin's own requests are the Project Owner's alone. */
export async function notifyAdminsOfEvent(database: DatabaseInstance, event: AdminPushEvent, options: { onlyAdminId?: number } = {}) {
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
    const active = subscriptions.filter(sub => sub.prefValue !== false && (options.onlyAdminId === undefined || sub.adminId === options.onlyAdminId));
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
    notifyGuardianRequests: Boolean(row.notifyGuardianRequests),
    notifyAccountChanges: Boolean(row.notifyAccountChanges),
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
    notifyGuardianRequests: updates.notifyGuardianRequests ?? current.notifyGuardianRequests,
    notifyAccountChanges: updates.notifyAccountChanges ?? current.notifyAccountChanges,
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
