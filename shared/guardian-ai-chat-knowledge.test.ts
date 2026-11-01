import { describe, expect, it } from "vitest";
import {
  detectGuardianAiChatIntent,
  generateGuardianAiChatResponse,
} from "./guardian-ai-chat-knowledge";

describe("Guardian AI Live Chat Knowledge & Intent Engine", () => {
  describe("detectGuardianAiChatIntent", () => {
    it("detects tuition fee inquiries", () => {
      const match = detectGuardianAiChatIntent("ক্লাস ৮ এর জন্য মাসিক বেতন বা টিউশন ফি কেমন হবে?");
      expect(match.intent).toBe("TUITION_FEE_ESTIMATE");
      expect(match.confidence).toBeGreaterThanOrEqual(80);
    });

    it("detects matching timeframe inquiries", () => {
      const match = detectGuardianAiChatIntent("টিউটর পেতে সাধারণত কত দিন সময় লাগবে?");
      expect(match.intent).toBe("MATCHING_TIMEFRAME");
      expect(match.confidence).toBeGreaterThanOrEqual(80);
    });

    it("detects tutor verification inquiries", () => {
      const match = detectGuardianAiChatIntent("আপনারা টিউটরদের এনআইডি ও ব্যাকগ্রাউন্ড কীভাবে ভেরিফাই করেন?");
      expect(match.intent).toBe("TUTOR_VERIFICATION");
      expect(match.confidence).toBeGreaterThanOrEqual(80);
    });

    it("detects replacement inquiries", () => {
      const match = detectGuardianAiChatIntent("টিউটর পছন্দ না হলে কি পরিবর্তন করা যাবে?");
      expect(match.intent).toBe("REPLACEMENT_GUARANTEE");
      expect(match.confidence).toBeGreaterThanOrEqual(80);
    });

    it("detects human escalation requests", () => {
      const match = detectGuardianAiChatIntent("আমি সরাসরি একজন এডমিনের সাথে কথা বলতে চাই");
      expect(match.intent).toBe("HUMAN_ESCALATION");
      expect(match.confidence).toBe(100);
    });

    it("detects greeting", () => {
      const match = detectGuardianAiChatIntent("আসসালামু আলাইকুম");
      expect(match.intent).toBe("GREETING");
    });
  });

  describe("generateGuardianAiChatResponse", () => {
    it("generates fee estimate with action chips", () => {
      const reply = generateGuardianAiChatResponse({
        message: "টিউশন ফি কেমন পড়বে?",
        guardianContext: { guardianName: "জনাব কামাল" },
      });
      expect(reply.replyText).toContain("জনাব কামাল");
      expect(reply.replyText).toContain("বাংলা মিডিয়াম");
      expect(reply.actionChips).toBeDefined();
      expect(reply.actionChips?.[0]?.url).toBe("/request-tutor");
    });

    it("handles human escalation with escalation flag", () => {
      const reply = generateGuardianAiChatResponse({
        message: "আমি একজন হিউম্যান এডমিনের সাথে কথা বলব",
        guardianContext: { guardianName: "জনাব জামিল" },
      });
      expect(reply.isEscalated).toBe(true);
      expect(reply.replyText).toContain("+8801516131411");
    });

    it("adapts reply when guardian has an active tuition request", () => {
      const reply = generateGuardianAiChatResponse({
        message: "আমার রিকোয়েস্ট এর কি অবস্থা?",
        guardianContext: {
          guardianName: "মো: রফিক",
          hasActiveRequest: true,
          latestRequestStatus: "শর্টলিস্টিং চলছে",
        },
      });
      expect(reply.replyText).toContain("শর্টলিস্টিং চলছে");
      expect(reply.actionChips?.[0]?.url).toBe("/guardian/requests");
    });
  });
});
