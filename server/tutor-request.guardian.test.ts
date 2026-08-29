import { beforeEach, describe, expect, it, vi } from "vitest";

const requestDbMocks = vi.hoisted(() => ({
  listGuardianTutorRequests: vi.fn(),
  decideGuardianTutorRequestContactConsent: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listGuardianTutorRequests: requestDbMocks.listGuardianTutorRequests,
    decideGuardianTutorRequestContactConsent: requestDbMocks.decideGuardianTutorRequestContactConsent,
  };
});

import { appRouter } from "./routers";

const baseContext = {
  req: {} as any,
  res: { cookie: () => undefined, clearCookie: () => undefined } as any,
};

function guardianCaller(userId = 77) {
  return appRouter.createCaller({
    ...baseContext,
    user: { id: userId, openId: `guardian-${userId}`, role: "guardian" } as any,
  });
}

describe("Guardian-owned Tutor Request procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the current Guardian's safe request history", async () => {
    requestDbMocks.listGuardianTutorRequests.mockResolvedValueOnce([
      {
        id: 19,
        classCourse: "Class 9–10",
        studentFirstName: "Rafi",
        status: "matched",
        contactConsent: "pending",
        nextAction: "decide_contact_consent",
      },
    ]);

    await expect(guardianCaller(77).tutorRequests.mine()).resolves.toEqual([
      expect.objectContaining({ id: 19, nextAction: "decide_contact_consent" }),
    ]);
    expect(requestDbMocks.listGuardianTutorRequests).toHaveBeenCalledWith(77);
  });

  it("saves an explicit decision only through the current Guardian's scoped transition", async () => {
    requestDbMocks.decideGuardianTutorRequestContactConsent.mockResolvedValueOnce({ saved: true, decision: "approved" });

    await expect(guardianCaller(77).tutorRequests.decideContactConsent({ requestId: 19, decision: "approved" }))
      .resolves.toEqual({ saved: true, decision: "approved" });
    expect(requestDbMocks.decideGuardianTutorRequestContactConsent).toHaveBeenCalledWith({
      guardianUserId: 77,
      requestId: 19,
      decision: "approved",
    });
  });

  it("rejects a consent decision that is not pending, matched, and Guardian-owned", async () => {
    requestDbMocks.decideGuardianTutorRequestContactConsent.mockResolvedValueOnce({ saved: false, decision: "declined" });

    await expect(guardianCaller(77).tutorRequests.decideContactConsent({ requestId: 19, decision: "declined" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });
});
