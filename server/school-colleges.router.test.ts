import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeSchoolName } from "@shared/school-colleges";

const dbMocks = vi.hoisted(() => ({
  getTutorAccountStatusByUserId: vi.fn(),
  renewTutorPortalSession: vi.fn(),
  searchSchoolColleges: vi.fn(),
  createSchoolCollegeForTutor: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";

const tutor = { id: 101, role: "tutor" as const, name: "Amina Rahman", openId: "tutor:101" };

function createCaller(user: TrpcContext["user"] = tutor as TrpcContext["user"]) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example", "x-connect-tutor-portal-session": "proof" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.getTutorAccountStatusByUserId.mockResolvedValue("active");
  dbMocks.renewTutorPortalSession.mockResolvedValue(true);
});

describe("school and college names", () => {
  it("searches as the signed-in Tutor, so their own names come along and nobody else's", async () => {
    dbMocks.searchSchoolColleges.mockResolvedValue([]);
    await createCaller().catalog.searchSchoolColleges({ query: " Dhaka Col " });
    expect(dbMocks.searchSchoolColleges).toHaveBeenCalledWith({ userId: 101, query: "Dhaka Col" });
  });

  it("creates a name for the Tutor, and says so when they have made too many", async () => {
    dbMocks.createSchoolCollegeForTutor.mockResolvedValueOnce({ outcome: "created", school: { id: 9, name: "Madhupur Shahid Smrity", division: null, own: true } });
    await expect(createCaller().catalog.createSchoolCollege({ name: "Madhupur Shahid Smrity" })).resolves.toMatchObject({ id: 9, own: true });
    expect(dbMocks.createSchoolCollegeForTutor).toHaveBeenCalledWith({ userId: 101, name: "Madhupur Shahid Smrity" });

    dbMocks.createSchoolCollegeForTutor.mockResolvedValueOnce({ outcome: "limit" });
    await expect(createCaller().catalog.createSchoolCollege({ name: "Another School" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(createCaller().catalog.createSchoolCollege({ name: "ab" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("one name, many spellings", () => {
  it("treats case, &/and, Govt./Government, Cantt/Cantonment and punctuation as the same name", () => {
    expect(normalizeSchoolName("St. Gregory's High School & College")).toBe(normalizeSchoolName("st gregorys high school and college".replace("gregorys", "gregory s")));
    expect(normalizeSchoolName("Dhanmondi Govt. Girls' High School")).toBe(normalizeSchoolName("Dhanmondi Government Girls High School"));
    expect(normalizeSchoolName("Bandarban Cantt Public School and College")).toBe(normalizeSchoolName("Bandarban Cantonment Public School & College"));
  });
});

describe("the Owner's Schools & colleges page", () => {
  it("is the Project Owner's alone", async () => {
    await expect(createCaller().schoolColleges.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller({ id: 2, role: "admin", name: "Other", openId: "admin-2" } as TrpcContext["user"]).schoolColleges.add({ name: "Dhaka College", division: "dhaka" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
