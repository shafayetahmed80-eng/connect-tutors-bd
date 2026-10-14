import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  formatAdminPushPayload,
  notifyAdminsOfEvent,
  getAdminPushPreferences,
  updateAdminPushPreferences,
  sendTestAdminPushNotification,
  DEFAULT_ADMIN_PUSH_PREFERENCES,
} from "./admin-push";
import * as chatPush from "./chat-push";

vi.mock("./chat-push", () => ({
  sendWebPushNotification: vi.fn(),
  getWebPushPublicKey: vi.fn(() => "test-public-key"),
}));

describe("Admin Web Push Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formatAdminPushPayload", () => {
    it("formats tuition_request payload with Bengali text and matching URL", () => {
      const { payload, category } = formatAdminPushPayload({
        type: "tuition_request",
        requestId: 42,
        classCourse: "Class 9",
        guardianName: "কামাল হোসেন",
        locationText: "Dhanmondi, Dhaka",
      });

      expect(category).toBe("tuition_request");
      expect(payload.title).toContain("নতুন টিউশন রিকোয়েস্ট (Class 9)");
      expect(payload.body).toContain("কামাল হোসেন নতুন টিউশন রিকোয়েস্ট জমা দিয়েছেন");
      expect(payload.url).toBe("/admin/tutor-matching/42");
      expect(payload.tag).toBe("admin-tuition-42");
    });

    it("formats tutor_application payload with job ID and direct applied tutors link", () => {
      const { payload, category } = formatAdminPushPayload({
        type: "tutor_application",
        requestId: 105,
        jobId: "CTB-261014-001",
        tutorName: "আহমেদ সাদিক",
      });

      expect(category).toBe("tutor_application");
      expect(payload.title).toContain("টিউশনে নতুন আবেদন (CTB-261014-001)");
      expect(payload.body).toContain("আহমেদ সাদিক টিউশনে আবেদন করেছেন");
      expect(payload.url).toBe("/admin/applied-tutors/105");
      expect(payload.tag).toBe("admin-app-105");
    });

    it("formats payment_report payload with amount and confirmed jobs link", () => {
      const { payload, category } = formatAdminPushPayload({
        type: "payment_report",
        requestId: 88,
        amount: 2500,
        tutorName: "ফারহানা করিম",
      });

      expect(category).toBe("payment_report");
      expect(payload.title).toContain("নতুন পেমেন্ট রিপোর্ট (৳2,500)");
      expect(payload.body).toContain("ফারহানা করিম ভেরিফিকেশনের জন্য পেমেন্ট TrxID জমা দিয়েছেন");
      expect(payload.url).toBe("/admin/confirmed-jobs");
      expect(payload.tag).toBe("admin-payment-88");
    });

    it("formats tutor_registration payload with tutor profile link", () => {
      const { payload, category } = formatAdminPushPayload({
        type: "tutor_registration",
        tutorId: "tutor-99",
        tutorName: "তানভীর রহমান",
        instituteName: "ঢাকা বিশ্ববিদ্যালয়",
      });

      expect(category).toBe("tutor_registration");
      expect(payload.title).toBe("নতুন টিউটর রেজিস্ট্রেশন");
      expect(payload.body).toContain("তানভীর রহমান (ঢাকা বিশ্ববিদ্যালয়) প্রোফাইল অনুমোদনের জন্য জমা দিয়েছেন");
      expect(payload.url).toBe("/admin/tutor-profiles/tutor-99");
      expect(payload.tag).toBe("admin-reg-tutor-99");
    });

    it("formats tutor_chat payload with deep link to tutor chat thread", () => {
      const { payload, category } = formatAdminPushPayload({
        type: "tutor_chat",
        tutorId: "tutor-12",
        tutorName: "রাকিব হাসান",
        preview: "আমার পেমেন্ট ভেরিফাই হয়েছে কি?",
      });

      expect(category).toBe("tutor_chat");
      expect(payload.title).toContain("রাকিব হাসান একটি মেসেজ পাঠিয়েছেন");
      expect(payload.body).toBe("আমার পেমেন্ট ভেরিফাই হয়েছে কি?");
      expect(payload.url).toBe("/admin/tutor-chats?tutorId=tutor-12");
      expect(payload.tag).toBe("admin-chat-tutor-12");
    });
  });

  describe("notifyAdminsOfEvent", () => {
    it("sends notifications to active subscriptions and skips subscriptions with disabled preference", async () => {
      vi.mocked(chatPush.sendWebPushNotification).mockResolvedValue({ ok: true, gone: false });

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockResolvedValue([
          {
            id: 1,
            adminId: 10,
            endpoint: "https://push.example.com/sub-1",
            p256dh: "key-1",
            auth: "auth-1",
            prefValue: true, // enabled
          },
          {
            id: 2,
            adminId: 20,
            endpoint: "https://push.example.com/sub-2",
            p256dh: "key-2",
            auth: "auth-2",
            prefValue: false, // disabled for this category
          },
          {
            id: 3,
            adminId: 30,
            endpoint: "https://push.example.com/sub-3",
            p256dh: "key-3",
            auth: "auth-3",
            prefValue: null, // default enabled
          },
        ]),
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      };

      const result = await notifyAdminsOfEvent(mockDb as any, {
        type: "tuition_request",
        requestId: 1,
        classCourse: "Class 10",
      });

      expect(result.sent).toBe(2); // sub-1 and sub-3, sub-2 was skipped
      expect(chatPush.sendWebPushNotification).toHaveBeenCalledTimes(2);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("cleans up expired (gone) subscriptions when push endpoint returns gone", async () => {
      vi.mocked(chatPush.sendWebPushNotification)
        .mockResolvedValueOnce({ ok: false, gone: true })
        .mockResolvedValueOnce({ ok: true, gone: false });

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockResolvedValue([
          { id: 1, adminId: 10, endpoint: "https://push.example.com/dead", p256dh: "k1", auth: "a1", prefValue: true },
          { id: 2, adminId: 10, endpoint: "https://push.example.com/live", p256dh: "k2", auth: "a2", prefValue: true },
        ]),
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      };

      const result = await notifyAdminsOfEvent(mockDb as any, {
        type: "payment_report",
        requestId: 2,
        amount: 1000,
      });

      expect(result.sent).toBe(1);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe("getAdminPushPreferences & updateAdminPushPreferences", () => {
    it("returns default preferences when no row exists", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const prefs = await getAdminPushPreferences(mockDb as any, 5);
      expect(prefs).toEqual(DEFAULT_ADMIN_PUSH_PREFERENCES);
    });

    it("updates preferences via onDuplicateKeyUpdate", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ adminId: 5, notifyTuitions: true, notifyApplications: false, notifyPayments: true, notifyRegistrations: true, notifyChat: true }]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue({}),
      };

      const updated = await updateAdminPushPreferences(mockDb as any, 5, { notifyChat: false });
      expect(updated.notifyChat).toBe(false);
      expect(updated.notifyApplications).toBe(false);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("sendTestAdminPushNotification", () => {
    it("sends test alert to current admin's subscriptions", async () => {
      vi.mocked(chatPush.sendWebPushNotification).mockResolvedValue({ ok: true, gone: false });

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: 1, adminId: 5, endpoint: "https://push.example.com/sub", p256dh: "k", auth: "a" },
        ]),
        delete: vi.fn().mockReturnThis(),
      };

      const result = await sendTestAdminPushNotification(mockDb as any, 5);
      expect(result.sent).toBe(1);
      expect(result.reason).toBe("ok");
      expect(chatPush.sendWebPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: "https://push.example.com/sub" }),
        expect.objectContaining({
          title: "🔔 কানেক্ট টিউটরস টেস্ট অ্যালার্ট",
          url: "/admin/settings",
        })
      );
    });
  });
});
