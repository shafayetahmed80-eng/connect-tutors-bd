/**
 * Connect Tutors BD — Guardian AI Live Chat Assistant Engine
 *
 * Coordinates live chat responses for Guardians and Parents.
 * Resolves questions about tuition fees, timeframes, tutor verification (BTPA-077),
 * replacement guarantees, and live request status.
 */

import { generateGuardianAiChatResponse, type GuardianChatContext } from "@shared/guardian-ai-chat-knowledge";
import { getDb } from "./db";
import {
  aiKnowledgeFaqs,
  guardianAiChatMessages,
  guardianAiChatThreads,
  guardianProfiles,
  tutorRequests,
  users,
} from "../drizzle/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export async function getGuardianChatContext(userId: number): Promise<GuardianChatContext> {
  const database = await getDb();
  if (!database) {
    return {};
  }

  const [userRow] = await database
    .select({ name: users.name, phone: users.loginPhone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [profileRow] = await database
    .select({ guardianId: guardianProfiles.guardianId })
    .from(guardianProfiles)
    .where(eq(guardianProfiles.userId, userId))
    .limit(1);

  const requests = await database
    .select({
      id: tutorRequests.id,
      publicationState: tutorRequests.publicationState,
      classLevel: tutorRequests.classCourse,
    })
    .from(tutorRequests)
    .where(eq(tutorRequests.guardianUserId, userId))
    .orderBy(desc(tutorRequests.id))
    .limit(1);

  const latestReq = requests[0];

  return {
    guardianName: userRow?.name ?? null,
    guardianId: profileRow?.guardianId ?? null,
    totalRequestsCount: requests.length,
    hasActiveRequest: Boolean(latestReq),
    latestRequestStatus: latestReq ? latestReq.publicationState : null,
  };
}

export async function processGuardianAiChatMessage(input: {
  guardianUserId: number;
  messageText: string;
}) {
  const database = await getDb();
  if (!database) {
    return {
      replyText: "সিস্টেম সাময়িকভাবে অনুপলব্ধ রয়েছে। অনুগ্রহ করে হেল্পলাইনে যোগাযোগ করুন।",
      isEscalated: false,
    };
  }

  // 1. Get or create thread
  let [thread] = await database
    .select({ id: guardianAiChatThreads.id })
    .from(guardianAiChatThreads)
    .where(eq(guardianAiChatThreads.guardianUserId, input.guardianUserId))
    .limit(1);

  const now = new Date();

  if (!thread) {
    const [inserted] = await database.insert(guardianAiChatThreads).values({
      guardianUserId: input.guardianUserId,
      lastMessageAt: now,
      lastMessagePreview: input.messageText.slice(0, 190),
      createdAt: now,
    });
    thread = { id: (inserted as any).insertId };
  }

  // 2. Insert guardian's message
  await database.insert(guardianAiChatMessages).values({
    threadId: thread.id,
    senderRole: "guardian",
    body: input.messageText,
    isAiGenerated: false,
    createdAt: now,
  });

  // 3. Generate response using knowledge base engine
  const context = await getGuardianChatContext(input.guardianUserId);
  const localReply = generateGuardianAiChatResponse({
    message: input.messageText,
    guardianContext: context,
  });

  let finalReplyText = localReply.replyText;

  // Check custom FAQ rules from aiKnowledgeFaqs
  try {
    const customFaqs = await database
      .select({ question: aiKnowledgeFaqs.question, answer: aiKnowledgeFaqs.answer })
      .from(aiKnowledgeFaqs)
      .where(and(eq(aiKnowledgeFaqs.isActive, true), inArray(aiKnowledgeFaqs.audience, ["all", "guardian"])));

    const lowerQuery = input.messageText.toLowerCase().trim();
    const matchingFaq = customFaqs.find(f => lowerQuery.includes(f.question.toLowerCase().trim()) || f.question.toLowerCase().trim().includes(lowerQuery));
    if (matchingFaq) {
      finalReplyText = matchingFaq.answer;
    }
  } catch {}

  // 4. Insert assistant's reply
  const replyTime = new Date();
  await database.insert(guardianAiChatMessages).values({
    threadId: thread.id,
    senderRole: "assistant",
    body: finalReplyText,
    isAiGenerated: true,
    aiActionChips: localReply.actionChips ?? null,
    createdAt: replyTime,
  });

  // 5. Update thread metadata
  const updatePayload: {
    lastMessageAt: Date;
    lastMessagePreview: string;
    aiEscalatedAt?: Date;
  } = {
    lastMessageAt: replyTime,
    lastMessagePreview: `[AI] ${finalReplyText.slice(0, 190)}`,
  };

  if (localReply.isEscalated) {
    updatePayload.aiEscalatedAt = replyTime;
  }

  await database
    .update(guardianAiChatThreads)
    .set(updatePayload)
    .where(eq(guardianAiChatThreads.id, thread.id));

  return {
    replyText: finalReplyText,
    actionChips: localReply.actionChips ?? [],
    isEscalated: localReply.isEscalated,
  };
}
