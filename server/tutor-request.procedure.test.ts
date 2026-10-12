import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSiteLimits } from "@shared/site-limits";

const dbMocks = vi.hoisted(() => ({
  createTutorRequest: vi.fn(),
  getTutorRequestLocation: vi.fn(),
  getSiteLimits: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";

const baseContext = {
  req: {} as any,
  res: { cookie: () => undefined, clearCookie: () => undefined } as any,
};

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

const guardian = () => appRouter.createCaller({ ...baseContext, user: { id: 23, openId: "guardian-test", role: "guardian" } as any });

afterEach(() => vi.clearAllMocks());

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
    await expect(guardian().tutorRequests.create({
      ...validPayload,
      learningNeeds: [{ category: "", classes: [{ classCourse: "Class 9–10", subjects: ["English"] }] }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createTutorRequest).not.toHaveBeenCalled();
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

const arrange = () => {
  dbMocks.getSiteLimits.mockResolvedValue(defaultSiteLimits());
  dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "city-dhaka", locationId: "area-mirpur", locationLabel: "Mirpur, Dhaka" });
  dbMocks.createTutorRequest.mockResolvedValue({ id: 31 });
};

describe("tutorRequests.create with several curricula and classes", () => {
  it("hands the writer the whole list and a one-line summary of it for the request's own columns", async () => {
    arrange();

    await guardian().tutorRequests.create({
      ...validPayload,
      learningNeeds: [
        { category: "Bangla Medium", classes: [{ classCourse: "Class 5", subjects: ["Bangla", "Math"] }, { classCourse: "Class 6", subjects: ["Math"] }] },
        { category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Class 9–10", subjects: ["English"] }] },
      ],
    });

    const [request, learningNeeds] = dbMocks.createTutorRequest.mock.calls[0];
    expect(request).toMatchObject({ guardianUserId: 23, category: "Bangla Medium, English Medium", curriculumType: "Cambridge", classCourse: "Class 5, Class 6, Class 9–10" });
    expect(JSON.parse(request.subjects)).toEqual(["Bangla", "Math", "English"]);
    expect(learningNeeds).toEqual([
      { category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["Bangla", "Math"] }, { classCourse: "Class 6", subjects: ["Math"] }] },
      { category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Class 9–10", subjects: ["English"] }] },
    ]);
  });

  it("still takes a request sent the way a page opened before the update sends it, as a list of one", async () => {
    arrange();
    const { learningNeeds: _needs, ...rest } = validPayload;

    await guardian().tutorRequests.create({ ...rest, category: "English Medium", curriculumType: "Cambridge", classCourse: "Class 9–10", subjects: ["English"] } as never);

    const [request, learningNeeds] = dbMocks.createTutorRequest.mock.calls[0];
    expect(request).toMatchObject({ category: "English Medium", curriculumType: "Cambridge", classCourse: "Class 9–10" });
    expect(learningNeeds).toEqual(validPayload.learningNeeds.map(need => ({ ...need })));
  });

  it("holds a request to the Owner's numbers of the day, not only to the registry's ceilings", async () => {
    arrange();
    dbMocks.getSiteLimits.mockResolvedValue({ ...defaultSiteLimits(), "request.curricula": 1, "request.levels": 2, "request.subjects": 1 });
    const need = (category: string, classes = 1, subjects = 1) => ({
      category,
      classes: Array.from({ length: classes }, (_, index) => ({ classCourse: `Class ${index + 1}`, subjects: Array.from({ length: subjects }, (_, n) => `Subject ${n + 1}`) })),
    });

    await expect(guardian().tutorRequests.create({ ...validPayload, learningNeeds: [need("A"), need("B")] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("at most 1") });
    await expect(guardian().tutorRequests.create({ ...validPayload, learningNeeds: [need("A", 3)] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("at most 2") });
    await expect(guardian().tutorRequests.create({ ...validPayload, learningNeeds: [need("A", 1, 2)] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("at most 1") });
    expect(dbMocks.createTutorRequest).not.toHaveBeenCalled();

    await guardian().tutorRequests.create({ ...validPayload, learningNeeds: [need("A", 2)] });
    expect(dbMocks.createTutorRequest).toHaveBeenCalledTimes(1);
  });
});

describe("tutorRequests.create with a Tutoring Time", () => {
  it("hands the writer the time the Guardian chose, as the 24-hour string it was sent", async () => {
    arrange();

    await guardian().tutorRequests.create({ ...validPayload, tutoringTime: "16:30" });

    const [request] = dbMocks.createTutorRequest.mock.calls[0];
    expect(request).toMatchObject({ guardianUserId: 23, tutoringTime: "16:30" });
  });

  it("hands the writer null, not undefined or a blank, when the Guardian chose none", async () => {
    arrange();

    await guardian().tutorRequests.create(validPayload);

    const [request] = dbMocks.createTutorRequest.mock.calls[0];
    // The column is nullable and blank means no wish at all, so the writer is
    // never given "" or a missing key to store.
    expect(request).toHaveProperty("tutoringTime", null);
  });

  it("hands the writer null when the client sends an explicit null for an empty box", async () => {
    arrange();

    await guardian().tutorRequests.create({ ...validPayload, tutoringTime: null });

    const [request] = dbMocks.createTutorRequest.mock.calls[0];
    // The Guardian journey sends null for an empty box on create as well as on edit. A new request
    // has nothing to keep, so null and a missing key both store no time.
    expect(request).toHaveProperty("tutoringTime", null);
  });

  it("refuses a padded time instead of trimming it, without writing anything", async () => {
    arrange();

    // The time box never returns spaces or a newline. A padded value is refused on every route
    // alike, so create no longer quietly stores a trimmed copy of what an edit would have thrown on.
    for (const tutoringTime of [" 08:05 ", "08:05 ", " 08:05", "08:05\n"]) {
      await expect(guardian().tutorRequests.create({ ...validPayload, tutoringTime }), JSON.stringify(tutoringTime))
        .rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(dbMocks.createTutorRequest).not.toHaveBeenCalled();
  });

  it("sends a time to every tuition type, online included, which has no location to ask about", async () => {
    arrange();
    const { tuitionCityLocationId: _city, tuitionLocationId: _location, ...online } = validPayload;

    await guardian().tutorRequests.create({ ...online, tuitionType: "online", tutoringTime: "19:00" });

    expect(dbMocks.createTutorRequest.mock.calls[0][0]).toMatchObject({ tuitionType: "online", tutoringTime: "19:00" });
  });

  it("refuses a time that is not HH:mm without writing anything", async () => {
    arrange();

    for (const tutoringTime of ["4:30 PM", "24:00", "16:60", ""]) {
      await expect(guardian().tutorRequests.create({ ...validPayload, tutoringTime }), tutoringTime)
        .rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(dbMocks.createTutorRequest).not.toHaveBeenCalled();
  });
});
