import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listGuardianChatThreadsForAdmin: vi.fn(),
  getGuardianChatThreadForAdmin: vi.fn(),
  sendGuardianChatMessageFromAdmin: vi.fn(),
  resolveGuardianChatEscalation: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const activeAdmin = { id: 42, role: "admin" as const, name: "Staff Admin", openId: "admin:42", email: "admin@example.com" };
const regularTutor = { id: 101, role: "tutor" as const, name: "Amina Rahman", openId: "tutor:101" };

function createCaller(user: TrpcContext["user"] = activeAdmin) {
  const headers = {
    host: "connecttutor.example",
  };
  return appRouter.createCaller({ user, req: { protocol: "https", headers }, res: { cookie() {}, clearCookie() {} } } as unknown as TrpcContext);
}

describe("Admin Guardian Chat Procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("admin.listGuardianChatThreads", () => {
    it("allows admins to list guardian chat threads", async () => {
      const mockResult = {
        threads: [
          {
            id: 1,
            threadToken: "token-123",
            guardianName: "Rashid Khan",
            phone: "01711000000",
            guardianNumber: 105,
            lastMessagePreview: "Need a physics tutor",
            lastMessageAt: new Date(),
            aiEscalatedAt: null,
            unreadCount: 1,
          },
        ],
        total: 1,
      };
      dbMocks.listGuardianChatThreadsForAdmin.mockResolvedValue(mockResult);

      const caller = createCaller(activeAdmin);
      const res = await caller.admin.listGuardianChatThreads({ query: "Rashid", page: 1, pageSize: 30, escalatedOnly: false });

      expect(res).toEqual(mockResult);
      expect(dbMocks.listGuardianChatThreadsForAdmin).toHaveBeenCalledWith({
        query: "Rashid",
        page: 1,
        pageSize: 30,
        escalatedOnly: false,
      });
    });

    it("forbids non-admins from listing guardian chat threads", async () => {
      const caller = createCaller(regularTutor);
      await expect(caller.admin.listGuardianChatThreads({ query: "" })).rejects.toThrow();
      expect(dbMocks.listGuardianChatThreadsForAdmin).not.toHaveBeenCalled();
    });
  });

  describe("admin.getGuardianChatThread", () => {
    it("fetches thread metadata and messages for a threadId", async () => {
      const mockThreadData = {
        thread: {
          id: 5,
          threadToken: "tok-5",
          guardianName: "Nasreen Sultana",
          phone: "01811223344",
          guardianNumber: 202,
          aiEscalatedAt: new Date(),
        },
        messages: [
          {
            id: 1,
            threadId: 5,
            senderRole: "guardian",
            body: "Need help urgently",
            createdAt: new Date(),
          },
          {
            id: 2,
            threadId: 5,
            senderRole: "assistant",
            body: "Connecting you with human support",
            createdAt: new Date(),
          },
        ],
      };
      dbMocks.getGuardianChatThreadForAdmin.mockResolvedValue(mockThreadData);

      const caller = createCaller(activeAdmin);
      const res = await caller.admin.getGuardianChatThread({ threadId: 5 });

      expect(res).toEqual(mockThreadData);
      expect(dbMocks.getGuardianChatThreadForAdmin).toHaveBeenCalledWith({ threadId: 5 });
    });
  });

  describe("admin.sendGuardianChatMessage", () => {
    it("sends an admin reply to a guardian thread", async () => {
      dbMocks.sendGuardianChatMessageFromAdmin.mockResolvedValue({
        success: true,
        messageId: 3,
      });

      const caller = createCaller(activeAdmin);
      const res = await caller.admin.sendGuardianChatMessage({
        threadId: 5,
        body: "  Hello! Connect Tutors Admin team here. How can we help?  ",
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toBe(3);
      expect(dbMocks.sendGuardianChatMessageFromAdmin).toHaveBeenCalledWith({
        threadId: 5,
        adminUserId: activeAdmin.id,
        body: "Hello! Connect Tutors Admin team here. How can we help?",
      });
    });

    it("rejects empty messages", async () => {
      const caller = createCaller(activeAdmin);
      await expect(caller.admin.sendGuardianChatMessage({ threadId: 5, body: "   " })).rejects.toThrow();
      expect(dbMocks.sendGuardianChatMessageFromAdmin).not.toHaveBeenCalled();
    });
  });

  describe("admin.resolveGuardianChatEscalation", () => {
    it("clears escalation timestamp for a thread", async () => {
      dbMocks.resolveGuardianChatEscalation.mockResolvedValue({ success: true });

      const caller = createCaller(activeAdmin);
      const res = await caller.admin.resolveGuardianChatEscalation({ threadId: 5 });

      expect(res).toEqual({ success: true });
      expect(dbMocks.resolveGuardianChatEscalation).toHaveBeenCalledWith({ threadId: 5 });
    });
  });
});
