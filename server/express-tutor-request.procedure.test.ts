import { afterEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createExpressTutorRequest: vi.fn(),
  listExpressTutorRequests: vi.fn(),
  updateExpressTutorRequestStatus: vi.fn(),
  getAdminTwoFactorSettings: vi.fn(async () => null),
  notifyAdminPushEvent: vi.fn(async () => ({ sent: 0 })),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

const telegramMocks = vi.hoisted(() => ({
  sendTelegramAdminText: vi.fn(async () => true),
  isTelegramAdminConfigured: vi.fn(() => false),
}));

vi.mock("./telegram-notification", async importOriginal => {
  const actual = await importOriginal<typeof import("./telegram-notification")>();
  return {
    ...actual,
    sendTelegramAdminText: telegramMocks.sendTelegramAdminText,
    isTelegramAdminConfigured: telegramMocks.isTelegramAdminConfigured,
  };
});

import { appRouter, __resetAuthRateLimitsForTests } from "./routers";

const baseContext = {
  req: { headers: { "user-agent": "test-agent" } } as any,
  res: { cookie: () => undefined, clearCookie: () => undefined } as any,
};

const publicCaller = () => appRouter.createCaller({ ...baseContext, user: null });
const adminCaller = () =>
  appRouter.createCaller({
    ...baseContext,
    user: { id: 1, openId: "admin-owner", role: "admin", isOwner: true } as any,
  });
const tutorCaller = () =>
  appRouter.createCaller({
    ...baseContext,
    user: { id: 2, openId: "tutor-user", role: "tutor" } as any,
  });

afterEach(() => {
  vi.clearAllMocks();
  __resetAuthRateLimitsForTests();
});

describe("tutorRequests.submitExpress procedure", () => {
  const validPayload = {
    phone: "01712345678",
    classCourse: "Class 9-10 (SSC)",
    curriculumType: "Bangla Medium",
    subjects: "All Subjects",
    locationLabel: "Dhanmondi, Dhaka",
    tuitionType: "home" as const,
    source: "home_hero" as const,
  };

  it("successfully creates express request for public visitor", async () => {
    dbMocks.createExpressTutorRequest.mockResolvedValueOnce({ id: 88 });

    const result = await publicCaller().tutorRequests.submitExpress(validPayload);
    expect(result).toEqual({ success: true, id: 88, phone: "01712345678" });
    expect(dbMocks.createExpressTutorRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "01712345678",
        classCourse: "Class 9-10 (SSC)",
        locationLabel: "Dhanmondi, Dhaka",
        status: "new",
      })
    );
    expect(dbMocks.notifyAdminPushEvent).toHaveBeenCalled();
  });

  it("normalizes phone with leading prefix +880 and spaces", async () => {
    dbMocks.createExpressTutorRequest.mockResolvedValueOnce({ id: 89 });

    const result = await publicCaller().tutorRequests.submitExpress({
      ...validPayload,
      phone: "+880 1812-345678",
    });
    expect(result).toEqual({ success: true, id: 89, phone: "01812345678" });
    expect(dbMocks.createExpressTutorRequest).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "01812345678" })
    );
  });

  it("dispatches telegram notification when telegram is configured", async () => {
    telegramMocks.isTelegramAdminConfigured.mockReturnValueOnce(true);
    dbMocks.createExpressTutorRequest.mockResolvedValueOnce({ id: 90 });

    await publicCaller().tutorRequests.submitExpress(validPayload);
    expect(telegramMocks.sendTelegramAdminText).toHaveBeenCalledWith(
      expect.stringContaining("New Express Tutor Request")
    );
  });

  it("silently drops bot submissions when honeypot field is filled", async () => {
    const result = await publicCaller().tutorRequests.submitExpress({
      ...validPayload,
      honeypot: "spam-bot-value",
    });

    expect(result).toEqual({ success: true, id: 0, phone: "01712345678" });
    expect(dbMocks.createExpressTutorRequest).not.toHaveBeenCalled();
    expect(dbMocks.notifyAdminPushEvent).not.toHaveBeenCalled();
  });

  it("rejects invalid input phone or empty location with BAD_REQUEST", async () => {
    await expect(
      publicCaller().tutorRequests.submitExpress({
        ...validPayload,
        phone: "12345",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await expect(
      publicCaller().tutorRequests.submitExpress({
        ...validPayload,
        locationLabel: "a",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rate limits repeated express submissions from the same IP", async () => {
    dbMocks.createExpressTutorRequest.mockResolvedValue({ id: 1 });

    for (let i = 0; i < 5; i++) {
      await publicCaller().tutorRequests.submitExpress(validPayload);
    }

    await expect(publicCaller().tutorRequests.submitExpress(validPayload)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });
});

describe("admin express request procedures", () => {
  it("rejects non-admin callers", async () => {
    await expect(publicCaller().admin.listExpressRequests({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(tutorCaller().admin.listExpressRequests({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows admin to list and search express requests", async () => {
    dbMocks.listExpressTutorRequests.mockResolvedValueOnce({
      items: [
        {
          id: 1,
          phone: "01712345678",
          classCourse: "Class 9",
          locationLabel: "Dhanmondi",
          status: "new",
        },
      ],
      total: 1,
    });

    const result = await adminCaller().admin.listExpressRequests({
      status: "new",
      search: "Dhanmondi",
    });
    expect(result.items.length).toBe(1);
    expect(dbMocks.listExpressTutorRequests).toHaveBeenCalledWith({
      status: "new",
      search: "Dhanmondi",
      limit: 50,
      offset: 0,
    });
  });

  it("allows admin to update express request status", async () => {
    dbMocks.updateExpressTutorRequestStatus.mockResolvedValueOnce({ success: true });

    const result = await adminCaller().admin.updateExpressRequestStatus({
      id: 1,
      status: "contacted",
      notes: "Called guardian, interested in Math tutor.",
    });

    expect(result).toEqual({ success: true });
    expect(dbMocks.updateExpressTutorRequestStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        status: "contacted",
        notes: "Called guardian, interested in Math tutor.",
        adminUserId: 1,
      })
    );
  });
});
