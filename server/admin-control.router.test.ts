import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getAdminControl: vi.fn(),
  setGuardianApplicantVisibility: vi.fn(),
  setNewTuitionTutorAlertsEnabled: vi.fn(),
  setTutorChatAccessMode: vi.fn(),
  setChatBusinessHoursSettings: vi.fn(),
}));

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

  it("lets the Owner switch the new tuition alerts on or off, and nobody else", async () => {
    dbMocks.setNewTuitionTutorAlertsEnabled.mockResolvedValue({ enabled: false });

    await expect(createCaller().adminControl.setNewTuitionTutorAlertsEnabled({ enabled: false })).resolves.toEqual({ enabled: false });
    expect(dbMocks.setNewTuitionTutorAlertsEnabled).toHaveBeenCalledWith(false);
    await expect(createCaller().adminControl.setNewTuitionTutorAlertsEnabled({ enabled: "no" } as never)).rejects.toThrow();
    await expect(createCaller({ ...owner, openId: "another-admin" }).adminControl.setNewTuitionTutorAlertsEnabled({ enabled: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller({ ...owner, role: "guardian" as const }).adminControl.setNewTuitionTutorAlertsEnabled({ enabled: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.setNewTuitionTutorAlertsEnabled).toHaveBeenCalledTimes(1);
  });

  it("lets the Owner switch the tutor chat access mode, and nobody else", async () => {
    dbMocks.setTutorChatAccessMode.mockResolvedValue({ mode: "approved" });

    await expect(createCaller().adminControl.setTutorChatAccessMode({ mode: "approved" })).resolves.toEqual({ mode: "approved" });
    expect(dbMocks.setTutorChatAccessMode).toHaveBeenCalledWith("approved");

    await expect(createCaller().adminControl.setTutorChatAccessMode({ mode: "invalid" } as never)).rejects.toThrow();
    await expect(createCaller({ ...owner, openId: "another-admin" }).adminControl.setTutorChatAccessMode({ mode: "all" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller({ ...owner, role: "tutor" as const }).adminControl.setTutorChatAccessMode({ mode: "all" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.setTutorChatAccessMode).toHaveBeenCalledTimes(1);
  });

  it("lets the Owner configure chat business hours, and nobody else", async () => {
    dbMocks.setChatBusinessHoursSettings.mockResolvedValue({ enabled: true, startMinutes: 600, endMinutes: 1200 });

    await expect(createCaller().adminControl.setChatBusinessHours({ enabled: true, startMinutes: 600, endMinutes: 1200 }))
      .resolves.toEqual({ enabled: true, startMinutes: 600, endMinutes: 1200 });
    expect(dbMocks.setChatBusinessHoursSettings).toHaveBeenCalledWith({ enabled: true, startMinutes: 600, endMinutes: 1200 });

    await expect(createCaller({ ...owner, openId: "another-admin" }).adminControl.setChatBusinessHours({ enabled: true }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller({ ...owner, role: "tutor" as const }).adminControl.setChatBusinessHours({ enabled: true }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
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
