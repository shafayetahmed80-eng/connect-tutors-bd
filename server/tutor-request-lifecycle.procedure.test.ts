import { beforeEach, describe, expect, it, vi } from "vitest";

const lifecycleDbMocks = vi.hoisted(() => ({
  addTutorRequestAssignmentNote: vi.fn(),
  cancelTutorRequest: vi.fn(),
  confirmTutorRequestAppointment: vi.fn(),
  createAdminMatchingSavedView: vi.fn(),
  clearAdminMatchingDefaultSavedView: vi.fn(),
  createConfirmationLetterDraft: vi.fn(),
  createGuardianRequestFollowUp: vi.fn(),
  getConfirmationLetterRecipientDownload: vi.fn(),
  getTutorAccountStatusByUserId: vi.fn(),
  getTutorRequestLocation: vi.fn(),
  getGuardianNotificationUnreadCount: vi.fn(),
  issueConfirmationLetter: vi.fn(),
  listConfirmationLettersForGuardian: vi.fn(),
  listConfirmationLettersForTutor: vi.fn(),
  listAdminMatchingSavedViews: vi.fn(),
  listGuardianNotifications: vi.fn(),
  listTutorRequestAssignmentNotes: vi.fn(),
  markAllGuardianNotificationsRead: vi.fn(),
  markGuardianNotificationRead: vi.fn(),
  renameAdminMatchingSavedView: vi.fn(),
  renewTutorPortalSession: vi.fn(),
  updateGuardianTutorRequest: vi.fn(),
  deleteAdminMatchingSavedView: vi.fn(),
  setAdminMatchingDefaultSavedView: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    addTutorRequestAssignmentNote: lifecycleDbMocks.addTutorRequestAssignmentNote,
    cancelTutorRequest: lifecycleDbMocks.cancelTutorRequest,
    confirmTutorRequestAppointment: lifecycleDbMocks.confirmTutorRequestAppointment,
    createAdminMatchingSavedView: lifecycleDbMocks.createAdminMatchingSavedView,
    clearAdminMatchingDefaultSavedView: lifecycleDbMocks.clearAdminMatchingDefaultSavedView,
    createConfirmationLetterDraft: lifecycleDbMocks.createConfirmationLetterDraft,
    createGuardianRequestFollowUp: lifecycleDbMocks.createGuardianRequestFollowUp,
    getConfirmationLetterRecipientDownload: lifecycleDbMocks.getConfirmationLetterRecipientDownload,
    getTutorAccountStatusByUserId: lifecycleDbMocks.getTutorAccountStatusByUserId,
    getTutorRequestLocation: lifecycleDbMocks.getTutorRequestLocation,
    getGuardianNotificationUnreadCount: lifecycleDbMocks.getGuardianNotificationUnreadCount,
    issueConfirmationLetter: lifecycleDbMocks.issueConfirmationLetter,
    listConfirmationLettersForGuardian: lifecycleDbMocks.listConfirmationLettersForGuardian,
    listConfirmationLettersForTutor: lifecycleDbMocks.listConfirmationLettersForTutor,
    listAdminMatchingSavedViews: lifecycleDbMocks.listAdminMatchingSavedViews,
    listGuardianNotifications: lifecycleDbMocks.listGuardianNotifications,
    listTutorRequestAssignmentNotes: lifecycleDbMocks.listTutorRequestAssignmentNotes,
    markAllGuardianNotificationsRead: lifecycleDbMocks.markAllGuardianNotificationsRead,
    markGuardianNotificationRead: lifecycleDbMocks.markGuardianNotificationRead,
    renameAdminMatchingSavedView: lifecycleDbMocks.renameAdminMatchingSavedView,
    renewTutorPortalSession: lifecycleDbMocks.renewTutorPortalSession,
    updateGuardianTutorRequest: lifecycleDbMocks.updateGuardianTutorRequest,
    deleteAdminMatchingSavedView: lifecycleDbMocks.deleteAdminMatchingSavedView,
    setAdminMatchingDefaultSavedView: lifecycleDbMocks.setAdminMatchingDefaultSavedView,
  };
});

import { appRouter } from "./routers";
import { AdminMatchingSavedViewNameConflictError } from "./db";

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

  it("keeps categorised assignment notes and Guardian follow-up messages Admin-only", async () => {
    lifecycleDbMocks.addTutorRequestAssignmentNote.mockResolvedValueOnce({ created: true, id: 22 });
    lifecycleDbMocks.listTutorRequestAssignmentNotes.mockResolvedValueOnce([{ id: 22, category: "matching", body: "Shortlist the verified Tutor." }]);
    lifecycleDbMocks.createGuardianRequestFollowUp.mockResolvedValueOnce({ created: true, notificationId: 9 });

    await expect((adminCaller().admin as any).addTutorRequestAssignmentNote({
      requestId: 19,
      category: "matching",
      body: "Shortlist the verified Tutor.",
    })).resolves.toEqual({ created: true, id: 22 });
    await expect((adminCaller().admin as any).listTutorRequestAssignmentNotes({ requestId: 19 }))
      .resolves.toEqual([{ id: 22, category: "matching", body: "Shortlist the verified Tutor." }]);
    await expect((adminCaller().admin as any).createGuardianRequestFollowUp({
      requestId: 19,
      kind: "availability_confirmation",
      message: "Please confirm the preferred start date.",
    })).resolves.toEqual({ created: true, notificationId: 9 });

    expect(lifecycleDbMocks.addTutorRequestAssignmentNote).toHaveBeenCalledWith(expect.objectContaining({ requestId: 19, adminUserId: 901, category: "matching" }));
    expect(lifecycleDbMocks.createGuardianRequestFollowUp).toHaveBeenCalledWith(expect.objectContaining({ requestId: 19, adminUserId: 901, kind: "availability_confirmation" }));
    await expect((guardianCaller() as any).admin.addTutorRequestAssignmentNote({ requestId: 19, category: "matching", body: "Private note" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps matching Saved Views private to the Admin who created them", async () => {
    const savedFilters = {
      lifecycle: "pending" as const,
      assignmentState: "unassigned" as const,
      location: "Mirpur",
      pageSize: 20,
    };
    lifecycleDbMocks.listAdminMatchingSavedViews.mockResolvedValueOnce([{ id: 41, name: "Pending Mirpur", filters: savedFilters }]);
    lifecycleDbMocks.createAdminMatchingSavedView.mockResolvedValueOnce({ created: true, id: 41 });
    lifecycleDbMocks.deleteAdminMatchingSavedView.mockResolvedValueOnce({ deleted: true });

    await expect((adminCaller().admin as any).listMatchingSavedViews())
      .resolves.toEqual([{ id: 41, name: "Pending Mirpur", filters: savedFilters }]);
    await expect((adminCaller().admin as any).createMatchingSavedView({ name: "Pending Mirpur", filters: savedFilters }))
      .resolves.toEqual({ created: true, id: 41 });
    await expect((adminCaller().admin as any).deleteMatchingSavedView({ savedViewId: 41 }))
      .resolves.toEqual({ deleted: true });

    expect(lifecycleDbMocks.listAdminMatchingSavedViews).toHaveBeenCalledWith({ adminUserId: 901 });
    expect(lifecycleDbMocks.createAdminMatchingSavedView).toHaveBeenCalledWith(expect.objectContaining({ adminUserId: 901, name: "Pending Mirpur", filters: savedFilters }));
    expect(lifecycleDbMocks.deleteAdminMatchingSavedView).toHaveBeenCalledWith({ adminUserId: 901, savedViewId: 41 });
    await expect((guardianCaller() as any).admin.listMatchingSavedViews()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect((guardianCaller() as any).admin.createMatchingSavedView({ name: "Private", filters: savedFilters })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect((guardianCaller() as any).admin.deleteMatchingSavedView({ savedViewId: 41 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects duplicate, unavailable, and invalid Admin Saved View actions without leaking ownership", async () => {
    const savedFilters = { lifecycle: "pending" as const, pageSize: 20 };
    lifecycleDbMocks.createAdminMatchingSavedView.mockRejectedValueOnce(new AdminMatchingSavedViewNameConflictError());
    lifecycleDbMocks.deleteAdminMatchingSavedView.mockResolvedValueOnce({ deleted: false });

    await expect((adminCaller().admin as any).createMatchingSavedView({ name: "Pending", filters: savedFilters }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await expect((adminCaller().admin as any).deleteMatchingSavedView({ savedViewId: 987 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect((adminCaller().admin as any).createMatchingSavedView({ name: "Invalid", filters: { lifecycle: "not-a-state" } }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("allows a 2FA-verified Admin to set or clear only their personal Default Saved View", async () => {
    lifecycleDbMocks.setAdminMatchingDefaultSavedView.mockResolvedValueOnce({ updated: true, savedViewId: 41 });
    lifecycleDbMocks.clearAdminMatchingDefaultSavedView.mockResolvedValueOnce({ updated: true });

    await expect((adminCaller().admin as any).setMatchingDefaultSavedView({ savedViewId: 41 }))
      .resolves.toEqual({ updated: true, savedViewId: 41 });
    await expect((adminCaller().admin as any).clearMatchingDefaultSavedView())
      .resolves.toEqual({ updated: true });

    expect(lifecycleDbMocks.setAdminMatchingDefaultSavedView).toHaveBeenCalledWith({ adminUserId: 901, savedViewId: 41 });
    expect(lifecycleDbMocks.clearAdminMatchingDefaultSavedView).toHaveBeenCalledWith({ adminUserId: 901 });
    await expect((guardianCaller() as any).admin.setMatchingDefaultSavedView({ savedViewId: 41 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect((tutorCaller() as any).admin.clearMatchingDefaultSavedView()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not disclose another Admin's Saved View through Default View selection", async () => {
    lifecycleDbMocks.setAdminMatchingDefaultSavedView.mockResolvedValueOnce({ updated: false, savedViewId: null });

    await expect((adminCaller().admin as any).setMatchingDefaultSavedView({ savedViewId: 999 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows a 2FA-verified Admin to rename only their own Saved View", async () => {
    lifecycleDbMocks.renameAdminMatchingSavedView.mockResolvedValueOnce({ updated: true, savedViewId: 41, name: "Daily pending queue" });

    await expect((adminCaller().admin as any).renameMatchingSavedView({ savedViewId: 41, name: "Daily pending queue" }))
      .resolves.toEqual({ updated: true, savedViewId: 41, name: "Daily pending queue" });

    expect(lifecycleDbMocks.renameAdminMatchingSavedView)
      .toHaveBeenCalledWith({ adminUserId: 901, savedViewId: 41, name: "Daily pending queue" });
    await expect((guardianCaller() as any).admin.renameMatchingSavedView({ savedViewId: 41, name: "Private" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects duplicate, missing, and invalid Saved View rename requests without leaking ownership", async () => {
    lifecycleDbMocks.renameAdminMatchingSavedView.mockRejectedValueOnce(new AdminMatchingSavedViewNameConflictError());
    lifecycleDbMocks.renameAdminMatchingSavedView.mockResolvedValueOnce({ updated: false, savedViewId: null, name: null });

    await expect((adminCaller().admin as any).renameMatchingSavedView({ savedViewId: 41, name: "Existing name" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await expect((adminCaller().admin as any).renameMatchingSavedView({ savedViewId: 999, name: "Unavailable" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect((adminCaller().admin as any).renameMatchingSavedView({ savedViewId: 41, name: "" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
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

  it("keeps issued confirmation letters private to their Guardian or assigned Tutor", async () => {
    lifecycleDbMocks.listConfirmationLettersForGuardian.mockResolvedValueOnce([{ id: 31, status: "issued", letterNumber: "CTB-2026-001" }]);
    lifecycleDbMocks.listConfirmationLettersForTutor.mockResolvedValueOnce([{ id: 31, status: "issued", letterNumber: "CTB-2026-001" }]);
    lifecycleDbMocks.getConfirmationLetterRecipientDownload.mockResolvedValueOnce({ letterId: 31, downloadUrl: "https://private.example/letter.pdf" });

    await expect((guardianCaller(77) as any).confirmationLetters.guardianMine())
      .resolves.toEqual([{ id: 31, status: "issued", letterNumber: "CTB-2026-001" }]);
    await expect((tutorCaller(88) as any).confirmationLetters.tutorMine())
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect((tutorCaller(88, "valid-tutor-tab-proof") as any).confirmationLetters.tutorMine())
      .resolves.toEqual([{ id: 31, status: "issued", letterNumber: "CTB-2026-001" }]);
    await expect((guardianCaller(77) as any).confirmationLetters.download({ letterId: 31 }))
      .resolves.toEqual({ letterId: 31, downloadUrl: "https://private.example/letter.pdf" });

    expect(lifecycleDbMocks.listConfirmationLettersForGuardian).toHaveBeenCalledWith({ guardianUserId: 77 });
    expect(lifecycleDbMocks.listConfirmationLettersForTutor).toHaveBeenCalledWith({ tutorUserId: 88 });
    expect(lifecycleDbMocks.getConfirmationLetterRecipientDownload).toHaveBeenCalledWith({ letterId: 31, recipient: { role: "guardian", userId: 77 } });
    await expect((adminCaller() as any).confirmationLetters.guardianMine()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
