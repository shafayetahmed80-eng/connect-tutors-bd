import { describe, expect, it } from "vitest";
import {
  detectAiChatIntent,
  generateAiChatResponse,
  type TutorChatContext,
} from "./ai-chat-knowledge";

describe("shared/ai-chat-knowledge", () => {
  describe("detectAiChatIntent", () => {
    it("detects greeting in Bengali, English, and Banglish", () => {
      expect(detectAiChatIntent("আসসালামু আলাইকুম").intent).toBe("GREETING");
      expect(detectAiChatIntent("Hello").intent).toBe("GREETING");
      expect(detectAiChatIntent("salam").intent).toBe("GREETING");
    });

    it("detects verification status inquiries", () => {
      expect(detectAiChatIntent("আমার প্রোফাইল ভেরিফাই হতে কতদিন লাগবে?").intent).toBe("VERIFICATION_STATUS");
      expect(detectAiChatIntent("kobe verify hobe profile?").intent).toBe("VERIFICATION_STATUS");
      expect(detectAiChatIntent("Why is my verification status pending?").intent).toBe("VERIFICATION_STATUS");
    });

    it("detects verification documents inquiries", () => {
      expect(detectAiChatIntent("কী কী ডকুমেন্ট আপলোড করতে হবে?").intent).toBe("VERIFICATION_DOCUMENTS");
      expect(detectAiChatIntent("NID card upload kivabe korbo?").intent).toBe("VERIFICATION_DOCUMENTS");
      expect(detectAiChatIntent("student id card requirement").intent).toBe("VERIFICATION_DOCUMENTS");
    });

    it("detects CV / Biodata download inquiries", () => {
      expect(detectAiChatIntent("সিভি ডাউনলোড কীভাবে করব?").intent).toBe("CV_DOWNLOAD");
      expect(detectAiChatIntent("how can I download my tutor cv?").intent).toBe("CV_DOWNLOAD");
      expect(detectAiChatIntent("biodata pdf download").intent).toBe("CV_DOWNLOAD");
    });

    it("detects human escalation inquiries", () => {
      expect(detectAiChatIntent("আমি এডমিনের সাথে সরাসরি কথা বলতে চাই").intent).toBe("HUMAN_ESCALATION");
      expect(detectAiChatIntent("talk to human agent please").intent).toBe("HUMAN_ESCALATION");
      expect(detectAiChatIntent("admin er shathe kotha bolbo").intent).toBe("HUMAN_ESCALATION");
    });

    it("detects BTPA membership inquiries", () => {
      expect(detectAiChatIntent("আপনারা কি BTPA অনুমোদিত?").intent).toBe("BTPA_MEMBERSHIP");
      expect(detectAiChatIntent("is connect tutors a member of btpa?").intent).toBe("BTPA_MEMBERSHIP");
    });

    it("detects online tuition travel distance questions", () => {
      expect(detectAiChatIntent("অনলাইন টিউশনে ট্রাভেল দূরত্ব কেন দিতে পারছি না?").intent).toBe("ONLINE_TUITION");
      expect(detectAiChatIntent("travel distance disabled for online tuition").intent).toBe("ONLINE_TUITION");
    });

    it("detects confirmation letter inquiries", () => {
      expect(detectAiChatIntent("কনফার্মেশন লেটার কীভাবে পাব?").intent).toBe("APPOINTMENT_LETTER");
      expect(detectAiChatIntent("where is my appointment letter?").intent).toBe("APPOINTMENT_LETTER");
    });

    it("falls back to GENERAL_FAQ for general or unknown queries", () => {
      expect(detectAiChatIntent("কিছু জানতে চাই").intent).toBe("GENERAL_FAQ");
      expect(detectAiChatIntent("").intent).toBe("GENERAL_FAQ");
    });
  });

  describe("generateAiChatResponse", () => {
    const mockContext: TutorChatContext = {
      tutorName: "শাফায়েত আহমেদ",
      tutorId: "CT-1042",
      profileStatus: "pending",
      readinessScore: 75,
      hasNidUploaded: false,
      appliedJobsCount: 3,
    };

    it("generates human escalation response with escalation flag set", () => {
      const response = generateAiChatResponse({
        message: "আমি এডমিনের সাথে কথা বলতে চাই",
        tutorContext: mockContext,
      });

      expect(response.isEscalated).toBe(true);
      expect(response.intent).toBe("HUMAN_ESCALATION");
      expect(response.replyText).toContain("সাপোর্ট এডমিন টিমের নিকট ফরোয়ার্ড করা হয়েছে");
    });

    it("contextually advises to upload NID when verification inquired and NID missing", () => {
      const response = generateAiChatResponse({
        message: "আমার প্রোফাইল ভেরিফাই হতে কতদিন লাগবে?",
        tutorContext: mockContext,
      });

      expect(response.isEscalated).toBe(false);
      expect(response.intent).toBe("VERIFICATION_STATUS");
      expect(response.replyText).toContain("জাতীয় পরিচয়পত্র (NID)");
      expect(response.replyText).toContain("শাফায়েত আহমেদ");
    });

    it("congratulates when profile is already approved", () => {
      const approvedContext: TutorChatContext = {
        ...mockContext,
        profileStatus: "approved",
        hasNidUploaded: true,
        readinessScore: 100,
      };
      const response = generateAiChatResponse({
        message: "when will my profile be verified?",
        tutorContext: approvedContext,
      });

      expect(response.replyText).toContain("ইতিমধ্যে অনুমোদিত (Approved) ও ভেরিফাইড");
    });

    it("generates informative CV download answer with quick suggestions", () => {
      const response = generateAiChatResponse({
        message: "সিভি ডাউনলোড কীভাবে করব?",
        tutorContext: mockContext,
      });

      expect(response.intent).toBe("CV_DOWNLOAD");
      expect(response.replyText).toContain("১-পেজ প্রফেশনাল এ৪ সিভি (Tutor CV PDF)");
      expect(response.suggestedQuickReplies?.length).toBeGreaterThan(0);
    });

    it("mentions applied jobs count in job application inquiries when tutor has applications", () => {
      const response = generateAiChatResponse({
        message: "জব বোর্ডে আবেদন করার নিয়ম কী?",
        tutorContext: mockContext,
      });

      expect(response.intent).toBe("JOB_APPLICATION");
      expect(response.replyText).toContain("৩টি টিউশনে আবেদন করেছেন");
    });

    it("explains BTPA membership and registration BTPA-077", () => {
      const response = generateAiChatResponse({
        message: "BTPA মেম্বারশিপ সম্পর্কে বলুন",
        tutorContext: mockContext,
      });

      expect(response.intent).toBe("BTPA_MEMBERSHIP");
      expect(response.replyText).toContain("BTPA - 077");
    });
  });
});
