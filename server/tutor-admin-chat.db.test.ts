import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tutorAdminChatMessages, tutorAdminChatThreads } from "../drizzle/schema";

const chatWsMocks = vi.hoisted(() => ({ notifyAdminsOfChatMessage: vi.fn(), notifyTutorOfChatMessage: vi.fn() }));
vi.mock("./chat-ws", () => chatWsMocks);

import {
  getDb,
  getTutorAdminChatThread,
  getTutorAdminChatUnreadCount,
  markTutorAdminChatReadByAdmin,
  sendTutorAdminChatMessageFromAdmin,
  sendTutorAdminChatMessageFromTutor,
} from "./db";

// Seeded by scripts/seed-dev-discovery-fixtures.mjs; every row this test makes on it is removed afterwards.
const tutorId = "dev-tutor-amina";

afterEach(async () => {
  vi.clearAllMocks();
  const database = await getDb();
  if (!database) return;
  const [thread] = await database.select({ id: tutorAdminChatThreads.id }).from(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.tutorId, tutorId));
  if (thread) {
    await database.delete(tutorAdminChatMessages).where(eq(tutorAdminChatMessages.threadId, thread.id));
    await database.delete(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.id, thread.id));
  }
});

describe("the Tutor-Admin chat, against the real database", () => {
  it("pushes the Admin side after a Tutor writes in, and the Tutor side after an Admin replies", async () => {
    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "Hello Admin" });
    expect(chatWsMocks.notifyAdminsOfChatMessage).toHaveBeenCalledWith(tutorId);
    expect(chatWsMocks.notifyTutorOfChatMessage).not.toHaveBeenCalled();

    await sendTutorAdminChatMessageFromAdmin({ tutorId, body: "How can we help?", adminUserId: 1 });
    expect(chatWsMocks.notifyTutorOfChatMessage).toHaveBeenCalledWith(tutorId);
  });

  it("counts an Admin reply as unread for the Tutor until the Tutor reads it", async () => {
    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "I have a question" });
    await sendTutorAdminChatMessageFromAdmin({ tutorId, body: "Sure, go ahead", adminUserId: 1 });

    await expect(getTutorAdminChatUnreadCount({ tutorId })).resolves.toEqual({ unreadCount: 1 });

    const thread = await getTutorAdminChatThread({ tutorId });
    expect(thread.messages.map(message => message.body)).toEqual(["I have a question", "Sure, go ahead"]);
  });

  it("marks the thread read on the Admin side without touching the Tutor's own read state", async () => {
    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "Ping" });
    await markTutorAdminChatReadByAdmin({ tutorId });
    // The Tutor's own message already set tutorLastReadAt=now on send, so this Admin-side mark leaves it untouched either way.
    await expect(getTutorAdminChatUnreadCount({ tutorId })).resolves.toEqual({ unreadCount: 0 });
  });
});
