import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const baseContext = {
  req: {} as any,
  res: { cookie: () => undefined, clearCookie: () => undefined } as any,
};

const validPayload = {
  tuitionType: "home" as const,
  category: "English Medium",
  classCourse: "Class 9–10",
  subjects: ["English"],
  daysPerWeek: 3,
  preferredGender: "any" as const,
  tuitionCityLocationId: "city-dhaka",
  tuitionLocationId: "area-mirpur",
  budget: { kind: "range" as const, minimum: 10000, maximum: 12000 },
};

describe("tutor request procedure authorization", () => {
  it("rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller({ ...baseContext, user: null });
    await expect(caller.tutorRequests.create(validPayload)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects Tutor callers", async () => {
    const caller = appRouter.createCaller({ ...baseContext, user: { id: 22, openId: "tutor-test", role: "tutor" } as any });
    await expect(caller.tutorRequests.create(validPayload)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows Guardian callers to reach input validation without writing data", async () => {
    const caller = appRouter.createCaller({ ...baseContext, user: { id: 23, openId: "guardian-test", role: "guardian" } as any });
    await expect(caller.tutorRequests.create({ ...validPayload, category: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects unauthenticated and Tutor callers from Guardian-owned request history and consent actions", async () => {
    const anonymous = appRouter.createCaller({ ...baseContext, user: null });
    const tutor = appRouter.createCaller({ ...baseContext, user: { id: 24, openId: "tutor-test", role: "tutor" } as any });

    await expect(anonymous.tutorRequests.mine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(tutor.tutorRequests.mine()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(anonymous.tutorRequests.decideContactConsent({ requestId: 1, decision: "approved" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(tutor.tutorRequests.decideContactConsent({ requestId: 1, decision: "declined" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
