import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import {
  tutorAdminChatMessages,
  tutorAdminChatThreads,
  tutors,
  users,
} from "../drizzle/schema";

const chatWsMocks = vi.hoisted(() => ({
  notifyAdminsOfChatMessage: vi.fn(),
  notifyTutorOfChatMessage: vi.fn(),
  notifyAdminsOfNewNote: vi.fn(),
  notifyAllTutorsOfChatAccessModeChange: vi.fn(),
}));
vi.mock("./chat-ws", () => chatWsMocks);

import { getDb } from "./db";
import {
  getTutorChatContext,
  processTutorMessageForAiAssistant,
} from "./ai-chat-assistant";

const testTutorId = "dev-tutor-amina";

describe("server/ai-chat-assistant", () => {
  let threadId: number;

  beforeAll(async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Clean any existing thread
    const [existing] = await database
      .select({ id: tutorAdminChatThreads.id })
      .from(tutorAdminChatThreads)
      .where(eq(tutorAdminChatThreads.tutorId, testTutorId));

    if (existing) {
      await database.delete(tutorAdminChatMessages).where(eq(tutorAdminChatMessages.threadId, existing.id));
      await database.delete(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.id, existing.id));
    }

    const [created] = await database.insert(tutorAdminChatThreads).values({
      tutorId: testTutorId,
      aiAutoReply: true,
    });
    threadId = Number(created.insertId);
  });

  afterAll(async () => {
    const database = await getDb();
    if (!database) return;
    await database.delete(tutorAdminChatMessages).where(eq(tutorAdminChatMessages.threadId, threadId));
    await database.delete(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.id, threadId));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches context for an existing tutor", async () => {
    const context = await getTutorChatContext(testTutorId);
    expect(context).not.toBeNull();
    expect(context?.tutorId).toBe(testTutorId);
    expect(typeof context?.tutorName).toBe("string");
  });

  it("processes a greeting message and stores an AI-generated message in the thread", async () => {
    const result = await processTutorMessageForAiAssistant({
      tutorId: testTutorId,
      threadId,
      messageText: "আসসালামু আলাইকুম",
    });

    expect(result.processed).toBe(true);
    expect(result.replyText).toContain("কানেক্ট টিউটরস এআই সাপোর্ট অ্যাসিস্ট্যান্টে আপনাকে স্বাগতম");
    expect(result.isEscalated).toBe(false);

    // Verify database record has isAiGenerated = true
    const database = await getDb();
    const [msg] = await database!
      .select({
        body: tutorAdminChatMessages.body,
        senderRole: tutorAdminChatMessages.senderRole,
        isAiGenerated: tutorAdminChatMessages.isAiGenerated,
      })
      .from(tutorAdminChatMessages)
      .where(eq(tutorAdminChatMessages.threadId, threadId))
      .orderBy(tutorAdminChatMessages.id)
      .limit(1);

    expect(msg).toBeDefined();
    expect(msg.senderRole).toBe("admin");
    expect(msg.isAiGenerated).toBe(true);
    expect(chatWsMocks.notifyTutorOfChatMessage).toHaveBeenCalledWith(testTutorId);
  });

  it("escalates thread and sets aiEscalatedAt when human admin is requested", async () => {
    const result = await processTutorMessageForAiAssistant({
      tutorId: testTutorId,
      threadId,
      messageText: "আমি জরুরি বিষয়ে সরাসরি এডমিনের সাথে কথা বলতে চাই",
    });

    expect(result.processed).toBe(true);
    expect(result.isEscalated).toBe(true);
    expect(result.replyText).toContain("সাপোর্ট এডমিন টিমের নিকট ফরোয়ার্ড করা হয়েছে");

    // Verify aiEscalatedAt is set on thread
    const database = await getDb();
    const [thread] = await database!
      .select({ aiEscalatedAt: tutorAdminChatThreads.aiEscalatedAt })
      .from(tutorAdminChatThreads)
      .where(eq(tutorAdminChatThreads.id, threadId));

    expect(thread.aiEscalatedAt).not.toBeNull();
  });

  it("does not process message when thread has aiAutoReply disabled", async () => {
    const database = await getDb();
    await database!
      .update(tutorAdminChatThreads)
      .set({ aiAutoReply: false })
      .where(eq(tutorAdminChatThreads.id, threadId));

    const result = await processTutorMessageForAiAssistant({
      tutorId: testTutorId,
      threadId,
      messageText: "সিভি ডাউনলোড করব কীভাবে?",
    });

    expect(result.processed).toBe(false);
    expect(result.reason).toContain("AI auto-reply disabled");

    // Restore aiAutoReply
    await database!
      .update(tutorAdminChatThreads)
      .set({ aiAutoReply: true })
      .where(eq(tutorAdminChatThreads.id, threadId));
  });
});
