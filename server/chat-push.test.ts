import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotification = vi.hoisted(() => vi.fn());
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification } }));

import { ADMIN_CHAT_PUSH_URL } from "../shared/push-messages";
import { sendWebPushNotification } from "./chat-push";

const subscription = { endpoint: "https://push.example/abc", p256dh: "p256dh-key", auth: "auth-key" };

beforeEach(() => {
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({});
  process.env.VAPID_PUBLIC_KEY = "public-key";
  process.env.VAPID_PRIVATE_KEY = "private-key";
});

const sent = () => JSON.parse(sendNotification.mock.calls[0]![1] as string) as Record<string, unknown>;

describe("sending a phone push", () => {
  it("tells the phone which pushes stack into one notification", async () => {
    await sendWebPushNotification(subscription, { title: "অ্যাডমিনের মেসেজ", body: "hello", url: ADMIN_CHAT_PUSH_URL });

    expect(sent()).toMatchObject({ title: "অ্যাডমিনের মেসেজ", body: "hello", url: ADMIN_CHAT_PUSH_URL, tag: "admin-chat", groupTitle: "অ্যাডমিনের {n}টি মেসেজ", groupUrl: ADMIN_CHAT_PUSH_URL });
  });

  it("sends a push that opens somewhere unknown exactly as it was given", async () => {
    await sendWebPushNotification(subscription, { title: "t", body: "b", url: "/somewhere" });

    expect(sent()).toEqual({ title: "t", body: "b", url: "/somewhere" });
  });

  it("sends nothing, and keeps the subscription, when the server has no push keys", async () => {
    delete process.env.VAPID_PUBLIC_KEY;

    await expect(sendWebPushNotification(subscription, { title: "t", body: "b" })).resolves.toEqual({ ok: false, gone: false });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("reports a subscription the browser has dropped, so it can be deleted", async () => {
    sendNotification.mockRejectedValue({ statusCode: 410 });

    await expect(sendWebPushNotification(subscription, { title: "t", body: "b" })).resolves.toEqual({ ok: false, gone: true });
  });
});
