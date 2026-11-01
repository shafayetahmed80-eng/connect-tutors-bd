import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: dbMocks.select,
    insert: dbMocks.insert,
    update: dbMocks.update,
  })),
}));

import { getGuardianChatContext, processGuardianAiChatMessage } from "./guardian-ai-chat-assistant";

describe("Guardian AI Chat Assistant Engine", () => {
  it("fetches guardian context including user name and profile ID", async () => {
    dbMocks.select
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ name: "Mr. Guardian", phone: "01700000000" }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ guardianId: "G-1002" }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: vi.fn().mockResolvedValue([{ id: 101, publicationState: "published", classLevel: "Class 8" }]),
            }),
          }),
        }),
      });

    const ctx = await getGuardianChatContext(42);
    expect(ctx.guardianName).toBe("Mr. Guardian");
    expect(ctx.guardianId).toBe("G-1002");
    expect(ctx.hasActiveRequest).toBe(true);
  });

  it("processes guardian message, generates AI reply and records thread", async () => {
    // 1. Thread query
    dbMocks.select
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ id: 7 }]),
          }),
        }),
      })
      // 2. getGuardianChatContext queries (users, guardianProfiles, tutorRequests)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ name: "Mrs. Nasrin", phone: "01800000000" }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ guardianId: "G-1005" }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      })
      // 3. custom FAQs query
      .mockReturnValueOnce({
        from: () => ({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

    dbMocks.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue({ insertId: 1 }),
    });

    dbMocks.update.mockReturnValue({
      set: () => ({
        where: vi.fn().mockResolvedValue({}),
      }),
    });

    const res = await processGuardianAiChatMessage({
      guardianUserId: 42,
      messageText: "টিউটরদের ব্যাকগ্রাউন্ড কীভাবে ভেরিফাই করেন?",
    });

    expect(res.replyText).toContain("BTPA - 077");
    expect(res.actionChips).toBeDefined();
    expect(dbMocks.insert).toHaveBeenCalledTimes(2); // guardian message + assistant message
  });
});
