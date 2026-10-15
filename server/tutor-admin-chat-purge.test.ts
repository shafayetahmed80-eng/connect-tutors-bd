import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { TUTOR_ADMIN_CHAT_RETENTION_DAYS, TUTOR_ADMIN_CHAT_RETENTION_MS } from "@shared/const";
import { registerCronRoutes } from "./cron-routes";

describe("Tutor Admin Chat 30-day retention & auto-purge", () => {
  it("defines retention period as 30 days in milliseconds", () => {
    expect(TUTOR_ADMIN_CHAT_RETENTION_DAYS).toBe(30);
    expect(TUTOR_ADMIN_CHAT_RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("protects /api/cron/purge-expired-chat endpoint with cron secret authentication", async () => {
    const app = express();
    const purgeMock = vi.fn().mockResolvedValue({ purgedMessagesCount: 5, attachmentsDeletedCount: 2 });
    registerCronRoutes(app, {
      secret: () => "0123456789012345678901234",
      purgeExpiredTutorAdminChatMessages: purgeMock,
    });

    // 1. Without secret
    const unauthorized = await request(app).post("/api/cron/purge-expired-chat");
    expect(unauthorized.status).toBe(401);
    expect(purgeMock).not.toHaveBeenCalled();

    // 2. With wrong secret
    const badSecret = await request(app)
      .post("/api/cron/purge-expired-chat")
      .set("x-cron-secret", "wrong-secret-0000000000000000");
    expect(badSecret.status).toBe(401);
    expect(purgeMock).not.toHaveBeenCalled();

    // 3. With valid secret
    const authorized = await request(app)
      .post("/api/cron/purge-expired-chat")
      .set("x-cron-secret", "0123456789012345678901234");
    expect(authorized.status).toBe(200);
    expect(authorized.body).toEqual({ purgedMessagesCount: 5, attachmentsDeletedCount: 2 });
    expect(purgeMock).toHaveBeenCalledWith(30);
  });

  it("allows overriding retention days via query parameter", async () => {
    const app = express();
    const purgeMock = vi.fn().mockResolvedValue({ purgedMessagesCount: 2, attachmentsDeletedCount: 0 });
    registerCronRoutes(app, {
      secret: () => "0123456789012345678901234",
      purgeExpiredTutorAdminChatMessages: purgeMock,
    });

    const res = await request(app)
      .post("/api/cron/purge-expired-chat?days=45")
      .set("x-cron-secret", "0123456789012345678901234");
    expect(res.status).toBe(200);
    expect(purgeMock).toHaveBeenCalledWith(45);
  });
});
