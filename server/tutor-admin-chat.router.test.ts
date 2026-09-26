import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getTutorAccountStatusByUserId: vi.fn(),
  getTutorProfileByUserId: vi.fn(),
  renewTutorPortalSession: vi.fn(),
  getTutorAdminChatThread: vi.fn(),
  getTutorAdminChatUnreadCount: vi.fn(),
  sendTutorAdminChatMessageFromTutor: vi.fn(),
  markTutorAdminChatReadByTutor: vi.fn(),
  listTutorAdminChatThreadsForAdmin: vi.fn(),
  getTutorAdminChatUnreadThreadCountForAdmin: vi.fn(),
  getTutorAdminChatThreadForAdmin: vi.fn(),
  sendTutorAdminChatMessageFromAdmin: vi.fn(),
  markTutorAdminChatReadByAdmin: vi.fn(),
  claimTutorAdminChatThread: vi.fn(),
  releaseTutorAdminChatThread: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const activeTutor = { id: 101, role: "tutor" as const, name: "Amina Rahman", openId: "tutor:101" };
const admin = { id: 42, role: "admin" as const, name: "Project Owner", openId: ENV.ownerOpenId, email: "owner@example.com" };

function createCaller(user: TrpcContext["user"] = activeTutor) {
  const headers = {
    host: "connecttutor.example",
    ...(user?.role === "tutor" ? { "x-connect-tutor-portal-session": "test-tutor-portal-proof" } : {}),
  };
  return appRouter.createCaller({ user, req: { protocol: "https", headers }, res: { cookie() {}, clearCookie() {} } } as unknown as TrpcContext);
}

describe("a Tutor's own side of the Admin chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getTutorAccountStatusByUserId.mockResolvedValue("active");
    dbMocks.renewTutorPortalSession.mockResolvedValue(true);
    dbMocks.getTutorProfileByUserId.mockResolvedValue({ tutorId: "tutor-1503", profileStatus: "approved" });
  });

  it("reads only the authenticated Tutor's own thread", async () => {
    dbMocks.getTutorAdminChatThread.mockResolvedValue({ messages: [{ id: 1, senderRole: "admin", body: "Hi", createdAt: new Date() }], tutorLastReadAt: null });

    const result = await createCaller().tutorAdminChat.thread();
    expect(result.messages).toHaveLength(1);
    expect(dbMocks.getTutorAdminChatThread).toHaveBeenCalledWith({ tutorId: "tutor-1503" });
  });

  it("reports the Tutor's own unread count", async () => {
    dbMocks.getTutorAdminChatUnreadCount.mockResolvedValue({ unreadCount: 2 });
    await expect(createCaller().tutorAdminChat.unreadCount()).resolves.toEqual({ unreadCount: 2 });
    expect(dbMocks.getTutorAdminChatUnreadCount).toHaveBeenCalledWith({ tutorId: "tutor-1503" });
  });

  it("sends a trimmed message as the signed-in Tutor", async () => {
    dbMocks.sendTutorAdminChatMessageFromTutor.mockResolvedValue({ sent: true });
    await expect(createCaller().tutorAdminChat.send({ body: "  Hello Admin  " })).resolves.toEqual({ sent: true });
    expect(dbMocks.sendTutorAdminChatMessageFromTutor).toHaveBeenCalledWith({ tutorId: "tutor-1503", body: "Hello Admin", attachmentKey: undefined, attachmentContentType: undefined });
  });

  it("sends an attachment with no caption", async () => {
    dbMocks.sendTutorAdminChatMessageFromTutor.mockResolvedValue({ sent: true });
    await expect(createCaller().tutorAdminChat.send({ body: "", attachmentKey: "chat/tutor-1503/1.png", attachmentContentType: "image/png" })).resolves.toEqual({ sent: true });
    expect(dbMocks.sendTutorAdminChatMessageFromTutor).toHaveBeenCalledWith({ tutorId: "tutor-1503", body: "", attachmentKey: "chat/tutor-1503/1.png", attachmentContentType: "image/png" });
  });

  it("refuses an empty message with no attachment, or one over the limit", async () => {
    await expect(createCaller().tutorAdminChat.send({ body: "   " })).rejects.toThrow();
    await expect(createCaller().tutorAdminChat.send({ body: "a".repeat(2001) })).rejects.toThrow();
    expect(dbMocks.sendTutorAdminChatMessageFromTutor).not.toHaveBeenCalled();
  });

  it("turns a not-yet-eligible Tutor's send into a clear refusal", async () => {
    dbMocks.sendTutorAdminChatMessageFromTutor.mockResolvedValue({ sent: false, reason: "not_eligible" });
    await expect(createCaller().tutorAdminChat.send({ body: "Hi" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("marks the Tutor's own thread read", async () => {
    dbMocks.markTutorAdminChatReadByTutor.mockResolvedValue({ updated: true });
    await createCaller().tutorAdminChat.markRead();
    expect(dbMocks.markTutorAdminChatReadByTutor).toHaveBeenCalledWith({ tutorId: "tutor-1503" });
  });

  it("is an active Tutor's to use", async () => {
    const guardian = { id: 7, role: "guardian" as const, name: "A Guardian", openId: "g:7" };
    await expect(createCaller(guardian).tutorAdminChat.thread()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.getTutorAdminChatThread).not.toHaveBeenCalled();
  });
});

describe("the Admin side of the Tutor chat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists every Tutor thread, newest activity first", async () => {
    dbMocks.listTutorAdminChatThreadsForAdmin.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });
    await createCaller(admin).admin.listTutorChatThreads({});
    expect(dbMocks.listTutorAdminChatThreadsForAdmin).toHaveBeenCalledWith({ query: "", page: 1, pageSize: 20 });
  });

  it("reports how many Tutor threads have an unread reply waiting", async () => {
    dbMocks.getTutorAdminChatUnreadThreadCountForAdmin.mockResolvedValue({ unreadThreadCount: 3 });
    await expect(createCaller(admin).admin.tutorChatUnreadThreadCount()).resolves.toEqual({ unreadThreadCount: 3 });
  });

  it("opens one Tutor's thread by its Tutor id", async () => {
    dbMocks.getTutorAdminChatThreadForAdmin.mockResolvedValue({ tutor: { tutorId: "tutor-1503", tutorName: "Amina Rahman", tutorNumber: 91 }, messages: [] });
    await createCaller(admin).admin.getTutorChatThread({ tutorId: "tutor-1503" });
    expect(dbMocks.getTutorAdminChatThreadForAdmin).toHaveBeenCalledWith({ tutorId: "tutor-1503" });
  });

  it("sends a reply as the signed-in Admin, without any Admin naming itself in the input", async () => {
    dbMocks.sendTutorAdminChatMessageFromAdmin.mockResolvedValue({ sent: true });
    await createCaller(admin).admin.sendTutorChatMessage({ tutorId: "tutor-1503", body: "  We will check this.  " });
    expect(dbMocks.sendTutorAdminChatMessageFromAdmin).toHaveBeenCalledWith({ tutorId: "tutor-1503", body: "We will check this.", adminUserId: 42, attachmentKey: undefined, attachmentContentType: undefined });
  });

  it("marks one Tutor's thread read on the Admin side", async () => {
    dbMocks.markTutorAdminChatReadByAdmin.mockResolvedValue({ updated: true });
    await createCaller(admin).admin.markTutorChatRead({ tutorId: "tutor-1503" });
    expect(dbMocks.markTutorAdminChatReadByAdmin).toHaveBeenCalledWith({ tutorId: "tutor-1503" });
  });

  it("lets an Admin claim a thread, and release it again", async () => {
    dbMocks.claimTutorAdminChatThread.mockResolvedValue({ claimed: true });
    await expect(createCaller(admin).admin.claimTutorChatThread({ tutorId: "tutor-1503" })).resolves.toEqual({ claimed: true });
    expect(dbMocks.claimTutorAdminChatThread).toHaveBeenCalledWith({ tutorId: "tutor-1503", adminUserId: 42 });

    dbMocks.releaseTutorAdminChatThread.mockResolvedValue({ released: true });
    await expect(createCaller(admin).admin.releaseTutorChatThread({ tutorId: "tutor-1503" })).resolves.toEqual({ released: true });
    expect(dbMocks.releaseTutorAdminChatThread).toHaveBeenCalledWith({ tutorId: "tutor-1503" });
  });

  it("is an Admin's to use", async () => {
    await expect(createCaller(activeTutor).admin.listTutorChatThreads({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.listTutorAdminChatThreadsForAdmin).not.toHaveBeenCalled();
  });
});
