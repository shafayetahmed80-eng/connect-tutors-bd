import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  listAdminMessageTemplates: vi.fn(),
  createAdminMessageTemplate: vi.fn(),
  updateAdminMessageTemplate: vi.fn(),
  deleteAdminMessageTemplate: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const adminUser = {
  id: 42,
  openId: ENV.ownerOpenId,
  email: "owner@example.com",
  name: "Owner",
  passwordHash: null,
  loginMethod: "oauth",
  role: "admin" as const,
  accountStatus: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createCaller(user: TrpcContext["user"] = adminUser) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.clearAllMocks());

describe("admin message templates router", () => {
  it("lists templates filtered by category including slash command", async () => {
    dbMocks.listAdminMessageTemplates.mockResolvedValue({
      items: [
        { id: 1, category: "tutor_notify", command: "/verify-id", title: "Document reminder", body: "Please upload your student ID." },
      ],
    });

    const result = await createCaller().admin.listMessageTemplates({ category: "tutor_notify" });

    expect(dbMocks.listAdminMessageTemplates).toHaveBeenCalledWith("tutor_notify");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Document reminder");
    expect(result.items[0].command).toBe("/verify-id");
  });

  it("creates a new message template with slash command and admin author id", async () => {
    dbMocks.createAdminMessageTemplate.mockResolvedValue({ id: 10, created: true });

    const result = await createCaller().admin.createMessageTemplate({
      category: "guardian_notify",
      command: "/special-offer",
      title: "Tuition status update",
      body: "We have appointed a top tutor for your request.",
    });

    expect(dbMocks.createAdminMessageTemplate).toHaveBeenCalledWith({
      category: "guardian_notify",
      command: "/special-offer",
      title: "Tuition status update",
      body: "We have appointed a top tutor for your request.",
      createdByAdminId: 42,
    });
    expect(result).toEqual({ id: 10, created: true });
  });

  it("updates an existing message template", async () => {
    dbMocks.updateAdminMessageTemplate.mockResolvedValue({ updated: true });

    const result = await createCaller().admin.updateMessageTemplate({
      id: 10,
      command: "/interview",
      title: "Updated Interview Call",
      body: "Please attend the interview tomorrow.",
    });

    expect(dbMocks.updateAdminMessageTemplate).toHaveBeenCalledWith({
      id: 10,
      command: "/interview",
      title: "Updated Interview Call",
      body: "Please attend the interview tomorrow.",
    });
    expect(result).toEqual({ updated: true });
  });

  it("deletes a template by id", async () => {
    dbMocks.deleteAdminMessageTemplate.mockResolvedValue({ deleted: true });

    const result = await createCaller().admin.deleteMessageTemplate({ id: 10 });

    expect(dbMocks.deleteAdminMessageTemplate).toHaveBeenCalledWith({ id: 10 });
    expect(result).toEqual({ deleted: true });
  });

  it("rejects unauthorized and non-admin users", async () => {
    await expect(createCaller(null).admin.listMessageTemplates()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      createCaller({ ...adminUser, role: "user", openId: "other" }).admin.listMessageTemplates(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
