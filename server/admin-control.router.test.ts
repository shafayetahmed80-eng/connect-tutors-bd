import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ getAdminControl: vi.fn(), setGuardianApplicantVisibility: vi.fn() }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const owner = {
  id: 42, openId: ENV.ownerOpenId, email: "owner@example.com", name: "Owner",
  passwordHash: null, loginMethod: "oauth", role: "admin" as const, accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function createCaller(user: TrpcContext["user"] = owner) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.clearAllMocks());

describe("adminControl", () => {
  it("reads and sets the Guardian applicant switch for the Owner", async () => {
    dbMocks.getAdminControl.mockResolvedValue({ guardianApplicantVisibility: "all", appointmentRequestsOutsideShortlist: 2 });
    dbMocks.setGuardianApplicantVisibility.mockResolvedValue({ visibility: "shortlisted", cancelledAppointmentRequests: 2 });

    await expect(createCaller().adminControl.get()).resolves.toEqual({ guardianApplicantVisibility: "all", appointmentRequestsOutsideShortlist: 2 });
    await expect(createCaller().adminControl.setGuardianApplicantVisibility({ visibility: "shortlisted" }))
      .resolves.toEqual({ visibility: "shortlisted", cancelledAppointmentRequests: 2 });
    expect(dbMocks.setGuardianApplicantVisibility).toHaveBeenCalledWith({ visibility: "shortlisted" });
  });

  it("refuses an unknown choice", async () => {
    await expect(createCaller().adminControl.setGuardianApplicantVisibility({ visibility: "everyone" } as never)).rejects.toThrow();
    expect(dbMocks.setGuardianApplicantVisibility).not.toHaveBeenCalled();
  });

  it("is the Owner's alone - not another Admin's, and not a Guardian's", async () => {
    const admin = { ...owner, openId: "another-admin" };
    await expect(createCaller(admin).adminControl.get()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller(admin).adminControl.setGuardianApplicantVisibility({ visibility: "all" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller({ ...owner, role: "guardian" as const }).adminControl.setGuardianApplicantVisibility({ visibility: "all" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.getAdminControl).not.toHaveBeenCalled();
    expect(dbMocks.setGuardianApplicantVisibility).not.toHaveBeenCalled();
  });
});
