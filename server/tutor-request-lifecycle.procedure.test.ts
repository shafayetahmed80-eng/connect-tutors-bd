import { beforeEach, describe, expect, it, vi } from "vitest";

const lifecycleDbMocks = vi.hoisted(() => ({
  cancelTutorRequest: vi.fn(),
  confirmTutorRequestAppointment: vi.fn(),
  createConfirmationLetterDraft: vi.fn(),
  createGuardianRequestFollowUp: vi.fn(),
  getConfirmationLetterRecipientFile: vi.fn(),
  getTutorAccountStatusByUserId: vi.fn(),
  getTutorRequestLocation: vi.fn(),
  getGuardianNotificationUnreadCount: vi.fn(),
  issueConfirmationLetter: vi.fn(),
  previewConfirmationLetterDraft: vi.fn(),
  verifyConfirmationLetter: vi.fn(),
  listConfirmationLettersForGuardian: vi.fn(),
  listConfirmationLettersForTutor: vi.fn(),
  listGuardianNotifications: vi.fn(),
  markAllGuardianNotificationsRead: vi.fn(),
  markGuardianNotificationRead: vi.fn(),
  renewTutorPortalSession: vi.fn(),
  updateGuardianTutorRequest: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    cancelTutorRequest: lifecycleDbMocks.cancelTutorRequest,
    confirmTutorRequestAppointment: lifecycleDbMocks.confirmTutorRequestAppointment,
    createConfirmationLetterDraft: lifecycleDbMocks.createConfirmationLetterDraft,
    createGuardianRequestFollowUp: lifecycleDbMocks.createGuardianRequestFollowUp,
    getConfirmationLetterRecipientFile: lifecycleDbMocks.getConfirmationLetterRecipientFile,
    getTutorAccountStatusByUserId: lifecycleDbMocks.getTutorAccountStatusByUserId,
    getTutorRequestLocation: lifecycleDbMocks.getTutorRequestLocation,
    getGuardianNotificationUnreadCount: lifecycleDbMocks.getGuardianNotificationUnreadCount,
    issueConfirmationLetter: lifecycleDbMocks.issueConfirmationLetter,
    previewConfirmationLetterDraft: lifecycleDbMocks.previewConfirmationLetterDraft,
    verifyConfirmationLetter: lifecycleDbMocks.verifyConfirmationLetter,
    listConfirmationLettersForGuardian: lifecycleDbMocks.listConfirmationLettersForGuardian,
    listConfirmationLettersForTutor: lifecycleDbMocks.listConfirmationLettersForTutor,
    listGuardianNotifications: lifecycleDbMocks.listGuardianNotifications,
    markAllGuardianNotificationsRead: lifecycleDbMocks.markAllGuardianNotificationsRead,
    markGuardianNotificationRead: lifecycleDbMocks.markGuardianNotificationRead,
    renewTutorPortalSession: lifecycleDbMocks.renewTutorPortalSession,
    updateGuardianTutorRequest: lifecycleDbMocks.updateGuardianTutorRequest,
  };
});

import { appRouter } from "./routers";

const baseContext = {
  req: { protocol: "https", headers: { host: "connecttutor.example" } } as any,
  res: { cookie: () => undefined, clearCookie: () => undefined } as any,
};

function adminCaller() {
  return appRouter.createCaller({
    ...baseContext,
    user: { id: 901, openId: "admin-901", role: "admin" } as any,
  });
}

/** Someone who is not signed in - a visitor scanning a letter's QR code. */
function publicCaller() {
  return appRouter.createCaller({ ...baseContext, user: null } as any);
}

function guardianCaller(userId = 77) {
  return appRouter.createCaller({
    ...baseContext,
    user: { id: userId, openId: `guardian-${userId}`, role: "guardian" } as any,
  });
}

function tutorCaller(userId = 88, portalToken?: string) {
  return appRouter.createCaller({
    ...baseContext,
    req: {
      ...baseContext.req,
      headers: {
        ...baseContext.req.headers,
        ...(portalToken ? { "x-connect-tutor-portal-session": portalToken } : {}),
      },
    },
    user: { id: userId, openId: `tutor-${userId}`, role: "tutor" } as any,
  });
}

const pendingUpdate = {
  requestId: 19,
  tuitionType: "home" as const,
  category: "Bangla Medium",
  curriculumType: "",
  classCourse: "Class 9",
  subjects: ["English"],
  daysPerWeek: 3,
  preferredGender: "any" as const,
  studentFirstName: "Rafi",
  studentGender: "male" as const,
  addressDetails: "Private landmark",
  tuitionCityLocationId: "city-dhaka",
  tuitionLocationId: "location-mirpur",
  budgetAmount: 5000,
  instituteName: "Dhaka College",
  heardAboutUs: "facebook" as const,
  notes: "Private scheduling note",
  studentCount: 1,
};

describe("approved Guardian request lifecycle procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lifecycleDbMocks.getTutorAccountStatusByUserId.mockResolvedValue("active");
    lifecycleDbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "city-dhaka", locationId: "location-mirpur", locationLabel: "Mirpur, Dhaka" });
    lifecycleDbMocks.renewTutorPortalSession.mockResolvedValue(true);
  });

  it("allows a Guardian to update only their own Pending request through the scoped procedure", async () => {
    lifecycleDbMocks.updateGuardianTutorRequest.mockResolvedValueOnce({ updated: true, lifecycle: "pending" });

    await expect((guardianCaller(77).tutorRequests as any).updatePending(pendingUpdate))
      .resolves.toEqual({ updated: true, lifecycle: "pending" });
    expect(lifecycleDbMocks.updateGuardianTutorRequest).toHaveBeenCalledWith(expect.objectContaining({ guardianUserId: 77, requestId: 19 }));
  });

  it("reserves appointment confirmation and cancellation for an Admin, including a required cancellation reason", async () => {
    lifecycleDbMocks.confirmTutorRequestAppointment.mockResolvedValueOnce({ updated: true, lifecycle: "confirmed" });
    lifecycleDbMocks.cancelTutorRequest.mockResolvedValueOnce({ updated: true, lifecycle: "cancelled" });

    await expect((adminCaller().admin as any).confirmTutorRequestAppointment({ requestId: 19 }))
      .resolves.toEqual({ updated: true, lifecycle: "confirmed" });
    await expect((adminCaller().admin as any).cancelTutorRequest({ requestId: 19, reason: "Guardian cancelled the request" }))
      .resolves.toEqual({ updated: true, lifecycle: "cancelled" });
    await expect((guardianCaller().admin as any).confirmTutorRequestAppointment({ requestId: 19 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect((adminCaller().admin as any).cancelTutorRequest({ requestId: 19, reason: "" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps Guardian notifications private while allowing a Guardian to read their own inbox", async () => {
    lifecycleDbMocks.listGuardianNotifications.mockResolvedValueOnce({ items: [{ id: 8, requestId: 19, title: "Request updated" }], nextCursor: null });
    lifecycleDbMocks.getGuardianNotificationUnreadCount.mockResolvedValueOnce({ unreadCount: 1 });
    lifecycleDbMocks.markGuardianNotificationRead.mockResolvedValueOnce({ updated: true });
    lifecycleDbMocks.markAllGuardianNotificationsRead.mockResolvedValueOnce({ updatedCount: 1 });

    await expect((guardianCaller(77) as any).guardianNotifications.mine({ limit: 20 }))
      .resolves.toEqual({ items: [{ id: 8, requestId: 19, title: "Request updated" }], nextCursor: null });
    await expect((guardianCaller(77) as any).guardianNotifications.unreadCount())
      .resolves.toEqual({ unreadCount: 1 });
    await expect((guardianCaller(77) as any).guardianNotifications.markRead({ notificationId: 8 }))
      .resolves.toEqual({ updated: true });
    await expect((guardianCaller(77) as any).guardianNotifications.markAllRead())
      .resolves.toEqual({ updatedCount: 1 });

    expect(lifecycleDbMocks.listGuardianNotifications).toHaveBeenCalledWith({ guardianUserId: 77, limit: 20, cursor: undefined });
    expect(lifecycleDbMocks.markGuardianNotificationRead).toHaveBeenCalledWith({ guardianUserId: 77, notificationId: 8 });
    expect(lifecycleDbMocks.markAllGuardianNotificationsRead).toHaveBeenCalledWith({ guardianUserId: 77 });
    await expect((adminCaller() as any).guardianNotifications.mine({ limit: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps Guardian follow-up messages Admin-only", async () => {
    lifecycleDbMocks.createGuardianRequestFollowUp.mockResolvedValueOnce({ created: true, notificationId: 9 });

    await expect((adminCaller().admin as any).createGuardianRequestFollowUp({
      requestId: 19,
      kind: "availability_confirmation",
      message: "Please confirm the preferred start date.",
    })).resolves.toEqual({ created: true, notificationId: 9 });

    expect(lifecycleDbMocks.createGuardianRequestFollowUp).toHaveBeenCalledWith(expect.objectContaining({ requestId: 19, adminUserId: 901, kind: "availability_confirmation" }));
    await expect((guardianCaller() as any).admin.createGuardianRequestFollowUp({ requestId: 19, kind: "availability_confirmation", message: "Private message" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows only an Admin to draft and issue a confirmed-match confirmation letter", async () => {
    lifecycleDbMocks.createConfirmationLetterDraft.mockResolvedValueOnce({ created: true, letterId: 31, status: "draft" });
    lifecycleDbMocks.issueConfirmationLetter.mockResolvedValueOnce({ issued: true, letterId: 31, status: "issued" });

    await expect((adminCaller().admin as any).createConfirmationLetterDraft({ requestId: 19 }))
      .resolves.toEqual({ created: true, letterId: 31, status: "draft" });
    await expect((adminCaller().admin as any).issueConfirmationLetter({
      letterId: 31,
      agreedStartDate: "2026-09-01",
      agreedFeeMinimum: 5000,
      agreedFeeMaximum: 7000,
    })).resolves.toEqual({ issued: true, letterId: 31, status: "issued" });

    expect(lifecycleDbMocks.createConfirmationLetterDraft).toHaveBeenCalledWith({ requestId: 19, adminUserId: 901 });
    expect(lifecycleDbMocks.issueConfirmationLetter).toHaveBeenCalledWith(expect.objectContaining({
      letterId: 31,
      adminUserId: 901,
      agreedStartDate: "2026-09-01",
    }));
    await expect((guardianCaller() as any).admin.createConfirmationLetterDraft({ requestId: 19 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("lets anyone check a letter by its ID and code, signed in or not", async () => {
    lifecycleDbMocks.verifyConfirmationLetter.mockResolvedValueOnce({ status: "unknown" });
    await expect((publicCaller() as any).confirmationLetters.verify({ letterNumber: "CTB-2026-000019-V1", code: "ABCDE-FGHJK" }))
      .resolves.toEqual({ status: "unknown" });
    expect(lifecycleDbMocks.verifyConfirmationLetter).toHaveBeenCalledWith({ letterNumber: "CTB-2026-000019-V1", code: "ABCDE-FGHJK" });
    await expect((publicCaller() as any).confirmationLetters.verify({ letterNumber: "", code: "ABCDE-FGHJK" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("lets only an Admin preview a draft with the terms typed so far, without storing anything", async () => {
    const terms = { letterId: 31, agreedStartDate: "2026-09-01", agreedFeeMinimum: 5000, agreedFeeMaximum: 7000 };
    const preview = { letterId: 31, letterNumber: "CTB-2026-000019-V1", fileName: "Connect-Tutors-Confirmation-Letter-CTB-2026-000019-V1-DRAFT.pdf", pdfBase64: "JVBERi0=" };
    lifecycleDbMocks.previewConfirmationLetterDraft.mockResolvedValueOnce(preview);

    await expect((adminCaller().admin as any).previewConfirmationLetter(terms)).resolves.toEqual(preview);
    expect(lifecycleDbMocks.previewConfirmationLetterDraft).toHaveBeenCalledWith(terms);
    expect(lifecycleDbMocks.issueConfirmationLetter).not.toHaveBeenCalled();

    lifecycleDbMocks.previewConfirmationLetterDraft.mockResolvedValueOnce(null);
    await expect((adminCaller().admin as any).previewConfirmationLetter(terms)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect((adminCaller().admin as any).previewConfirmationLetter({ ...terms, agreedFeeMaximum: 4000 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect((guardianCaller() as any).admin.previewConfirmationLetter(terms)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps issued confirmation letters private to their Guardian or assigned Tutor", async () => {
    lifecycleDbMocks.listConfirmationLettersForGuardian.mockResolvedValueOnce([{ id: 31, status: "issued", letterNumber: "CTB-2026-001" }]);
    lifecycleDbMocks.listConfirmationLettersForTutor.mockResolvedValueOnce([{ id: 31, status: "issued", letterNumber: "CTB-2026-001" }]);
    lifecycleDbMocks.getConfirmationLetterRecipientFile.mockResolvedValueOnce({ letterId: 31, letterNumber: "CTB-2026-001", fileName: "Connect-Tutors-Confirmation-Letter-CTB-2026-001.pdf", pdfBase64: "JVBERi0=" });

    await expect((guardianCaller(77) as any).confirmationLetters.guardianMine())
      .resolves.toEqual([{ id: 31, status: "issued", letterNumber: "CTB-2026-001" }]);
    await expect((tutorCaller(88) as any).confirmationLetters.tutorMine())
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect((tutorCaller(88, "valid-tutor-tab-proof") as any).confirmationLetters.tutorMine())
      .resolves.toEqual([{ id: 31, status: "issued", letterNumber: "CTB-2026-001" }]);
    await expect((guardianCaller(77) as any).confirmationLetters.file({ letterId: 31 }))
      .resolves.toEqual({ letterId: 31, letterNumber: "CTB-2026-001", fileName: "Connect-Tutors-Confirmation-Letter-CTB-2026-001.pdf", pdfBase64: "JVBERi0=" });

    expect(lifecycleDbMocks.listConfirmationLettersForGuardian).toHaveBeenCalledWith({ guardianUserId: 77 });
    expect(lifecycleDbMocks.listConfirmationLettersForTutor).toHaveBeenCalledWith({ tutorUserId: 88 });
    expect(lifecycleDbMocks.getConfirmationLetterRecipientFile).toHaveBeenCalledWith({ letterId: 31, recipient: { role: "guardian", userId: 77 } });
    await expect((adminCaller() as any).confirmationLetters.guardianMine()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
