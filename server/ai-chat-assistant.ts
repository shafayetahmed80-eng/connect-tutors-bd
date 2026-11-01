/**
 * Connect Tutors BD — AI Live Chat Assistant Engine
 *
 * Coordinates live chat AI response generation. Incorporates real-time tutor
 * context (profile status, readiness score, application count) and platform
 * knowledge (BTPA-077, fees, verification rules).
 * Supports external LLM (Gemini 2.0 Flash) when configured, and falls back
 * to the deterministic knowledge engine for 100% offline & test reliability.
 */

import { generateAiChatResponse, type TutorChatContext } from "@shared/ai-chat-knowledge";
import { getDb } from "./db";
import {
  aiChatSettings,
  tutorAdminChatMessages,
  tutorAdminChatThreads,
  tutors,
  tutorAcademicProfiles,
  tutorJobInterests,
  tutorUniversityIdDocuments,
} from "../drizzle/schema";
import { eq, count } from "drizzle-orm";
import { notifyAdminsOfChatMessage, notifyTutorOfChatMessage } from "./chat-ws";

export interface ProcessAiChatMessageInput {
  tutorId: string;
  threadId?: number;
  messageText: string;
}

export interface ProcessAiChatMessageResult {
  processed: boolean;
  replyText?: string;
  isEscalated?: boolean;
  intent?: string;
  reason?: string;
}

/**
 * Loads context for a tutor to enrich AI prompt with real-time profile facts
 */
export async function getTutorChatContext(tutorId: string): Promise<TutorChatContext | null> {
  const database = await getDb();
  if (!database) return null;

  const [tutorRow] = await database
    .select({
      id: tutors.id,
      name: tutors.name,
      status: tutors.profileStatus,
    })
    .from(tutors)
    .where(eq(tutors.id, tutorId))
    .limit(1);

  if (!tutorRow) return null;

  // Check NID / Student ID upload
  const [docRow] = await database
    .select({
      tutorId: tutorUniversityIdDocuments.tutorId,
      documentStatus: tutorUniversityIdDocuments.documentStatus,
    })
    .from(tutorUniversityIdDocuments)
    .where(eq(tutorUniversityIdDocuments.tutorId, tutorId))
    .limit(1);

  // Check applied jobs count
  const [interestRow] = await database
    .select({ total: count() })
    .from(tutorJobInterests)
    .where(eq(tutorJobInterests.tutorId, tutorId));

  const hasDoc = Boolean(docRow && docRow.documentStatus && docRow.documentStatus !== "not_uploaded");

  return {
    tutorName: tutorRow.name,
    tutorId: tutorRow.id,
    profileStatus: tutorRow.status,
    readinessScore: tutorRow.status === "approved" ? 100 : hasDoc ? 75 : 50,
    hasNidUploaded: hasDoc,
    hasStudentIdUploaded: hasDoc,
    appliedJobsCount: Number(interestRow?.total ?? 0),
  };
}

/**
 * Queries Gemini API if API key is provided
 */
async function callGeminiApi(prompt: string, systemInstruction: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_ASSISTANT_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[AI Assistant] Gemini API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const json = (await response.json()) as any;
    const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof candidateText === "string" ? candidateText.trim() : null;
  } catch (err) {
    console.warn("[AI Assistant] Gemini API fetch failed, falling back to local engine:", err);
    return null;
  }
}

/**
 * Processes an incoming tutor message, generates AI reply, and stores it in the thread
 */
export async function processTutorMessageForAiAssistant(
  input: ProcessAiChatMessageInput
): Promise<ProcessAiChatMessageResult> {
  const database = await getDb();
  if (!database) {
    return { processed: false, reason: "Database unavailable" };
  }

  // 1. Check thread configuration (whether aiAutoReply is enabled)
  const [thread] = input.threadId
    ? await database
        .select({
          id: tutorAdminChatThreads.id,
          aiAutoReply: tutorAdminChatThreads.aiAutoReply,
          tutorId: tutorAdminChatThreads.tutorId,
        })
        .from(tutorAdminChatThreads)
        .where(eq(tutorAdminChatThreads.id, input.threadId))
        .limit(1)
    : await database
        .select({
          id: tutorAdminChatThreads.id,
          aiAutoReply: tutorAdminChatThreads.aiAutoReply,
          tutorId: tutorAdminChatThreads.tutorId,
        })
        .from(tutorAdminChatThreads)
        .where(eq(tutorAdminChatThreads.tutorId, input.tutorId))
        .limit(1);

  if (!thread || thread.aiAutoReply === false) {
    return { processed: false, reason: "AI auto-reply disabled for this thread" };
  }

  const threadId = thread.id;

  // 2. Fetch live tutor context
  const context = await getTutorChatContext(input.tutorId);

  // 3. Generate response using knowledge base engine
  const localReply = generateAiChatResponse({
    message: input.messageText,
    tutorContext: context,
  });

  let finalReplyText = localReply.replyText;

  // 4. If LLM API key is present and intent is not a direct human escalation, attempt LLM refinement
  if (process.env.GEMINI_API_KEY && !localReply.isEscalated) {
    const systemInstruction = `You are the Connect Tutors BD AI Assistant (কানেক্ট টিউটরস এআই সাপোর্ট).
The platform is an official BTPA member (Member: BTPA - 077).
Current Tutor details:
- Name: ${context?.tutorName || "Unknown"}
- Tutor ID: ${context?.tutorId || "CT-XXXX"}
- Profile Status: ${context?.profileStatus || "pending"}
- NID Uploaded: ${context?.hasNidUploaded ? "Yes" : "No"}
- Applications: ${context?.appliedJobsCount || 0}
Guidelines:
- Answer in polite, professional Bengali (with helpful English terms in parentheses when needed).
- Be concise (2-4 sentences).
- If the user asks for a human admin or has a financial complaint, politely explain that an admin has been notified.
- Never hallucinate fake rules or unverified facts.`;

    const geminiText = await callGeminiApi(input.messageText, systemInstruction);
    if (geminiText) {
      finalReplyText = geminiText;
    }
  }

  // 5. Store the AI reply in the database
  const now = new Date();
  await database.insert(tutorAdminChatMessages).values({
    threadId,
    senderRole: "admin",
    body: finalReplyText,
    isAiGenerated: true,
    createdAt: now,
  });

  // 6. Update thread metadata (lastMessageAt, preview, and escalation timestamp if applicable)
  const updatePayload: {
    lastMessageAt: Date;
    lastMessagePreview: string;
    aiEscalatedAt?: Date;
  } = {
    lastMessageAt: now,
    lastMessagePreview: `[AI] ${finalReplyText.slice(0, 190)}`,
  };

  if (localReply.isEscalated) {
    updatePayload.aiEscalatedAt = now;
  }

  await database
    .update(tutorAdminChatThreads)
    .set(updatePayload)
    .where(eq(tutorAdminChatThreads.id, threadId));

  // 7. Broadcast via WebSocket to Tutor and Admins
  try {
    notifyTutorOfChatMessage(input.tutorId);
    notifyAdminsOfChatMessage(input.tutorId);
  } catch (err) {
    // Non-fatal if WebSocket server is not running (e.g. unit tests)
  }

  return {
    processed: true,
    replyText: finalReplyText,
    isEscalated: localReply.isEscalated,
    intent: localReply.intent,
  };
}
