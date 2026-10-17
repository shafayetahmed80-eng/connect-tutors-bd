import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSiteLimits } from "@shared/site-limits";

const dbMocks = vi.hoisted(() => ({
  createTutorRequest: vi.fn(),
  getTutorRequestLocation: vi.fn(),
  getSiteLimits: vi.fn(),
  ownerAllowsAdminAlert: vi.fn(),
  notifyAdminPushEvent: vi.fn(async () => ({ sent: 0 })),
}));
const telegramMocks = vi.hoisted(() => ({
  configured: true,
  notifyTelegramAdmin: vi.fn(async () => true),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});
vi.mock("./telegram-notification", async importOriginal => {
  const actual = await importOriginal<typeof import("./telegram-notification")>();
  return { ...actual, isTelegramAdminConfigured: () => telegramMocks.configured, notifyTelegramAdmin: telegramMocks.notifyTelegramAdmin };
});

import { appRouter } from "./routers";

const validPayload = {
  tuitionType: "home" as const,
  learningNeeds: [{ category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Class 9–10", subjects: ["English"] }] }],
  studentCount: 1,
  daysPerWeek: 3,
  preferredGender: "any" as const,
  heardAboutUs: "others" as const,
  tuitionCityLocationId: "city-dhaka",
  tuitionLocationId: "area-mirpur",
  budgetAmount: 10000,
};

const guardian = () => appRouter.createCaller({
  req: {} as any,
  res: { cookie: () => undefined, clearCookie: () => undefined } as any,
  user: { id: 23, openId: "guardian-test", role: "guardian", name: "Rina Akter" } as any,
});

function arrange() {
  dbMocks.getSiteLimits.mockResolvedValue(defaultSiteLimits());
  dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "city-dhaka", locationId: "area-mirpur", locationLabel: "Mirpur, Dhaka" });
  dbMocks.createTutorRequest.mockResolvedValue({ id: 31 });
}

afterEach(() => {
  vi.clearAllMocks();
  telegramMocks.configured = true;
});

describe("the new-tuition Telegram message", () => {
  it("goes to the Admin chat while the Owner's new-tuition switch is on", async () => {
    arrange();
    dbMocks.ownerAllowsAdminAlert.mockResolvedValue(true);

    await expect(guardian().tutorRequests.create(validPayload)).resolves.toMatchObject({ success: true, notificationDelivered: true });

    expect(dbMocks.ownerAllowsAdminAlert).toHaveBeenCalledWith("tuition_request");
    expect(telegramMocks.notifyTelegramAdmin).toHaveBeenCalledWith(expect.objectContaining({ requestId: 31 }));
  });

  it("stays away once the Owner switches new-tuition alerts off, and the request is still taken", async () => {
    arrange();
    dbMocks.ownerAllowsAdminAlert.mockResolvedValue(false);

    await expect(guardian().tutorRequests.create(validPayload)).resolves.toMatchObject({ success: true, notificationDelivered: false });

    expect(telegramMocks.notifyTelegramAdmin).not.toHaveBeenCalled();
    expect(dbMocks.createTutorRequest).toHaveBeenCalled();
  });

  it("asks nothing of the database when no Telegram chat is set up", async () => {
    arrange();
    telegramMocks.configured = false;

    await guardian().tutorRequests.create(validPayload);

    expect(dbMocks.ownerAllowsAdminAlert).not.toHaveBeenCalled();
    expect(telegramMocks.notifyTelegramAdmin).not.toHaveBeenCalled();
  });
});
