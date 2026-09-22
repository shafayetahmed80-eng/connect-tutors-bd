import { describe, expect, it } from "vitest";
import { appRouter, tutorProfileInputSchema } from "./routers";
import { listTutors } from "./db";

const validTutorProfile = {
  name: "Amina Rahman",
  phone: "+880 1516 131411",
  contactEmail: "amina@example.com",
  gender: "female" as const,
  subjects: ["Mathematics"],
  levels: ["Class 9–10"],
  experience: 4,
  fee: 6500,
  mode: "home" as const,
  locationId: "bd-dhaka",
  institution: "University of Dhaka",
  education: "BSc in Mathematics",
  availability: "Weekday evenings",
  languages: ["Bangla", "English"],
  about: "I use clear explanations, practice plans, and regular progress checks.",
};

function createCaller(role?: "guardian" | "tutor") {
  return appRouter.createCaller({
    user: role ? { id: 987654, role, name: "Test user", openId: "test-open-id" } : null,
    req: {},
    res: { cookie() {}, clearCookie() {} },
  } as any);
}

describe("Tutor profile validation", () => {
  it("accepts a complete private Tutor Profile payload", () => {
    expect(tutorProfileInputSchema.parse(validTutorProfile)).toMatchObject(validTutorProfile);
  });

  it("rejects an invalid phone number and a too-short introduction", () => {
    const invalid = tutorProfileInputSchema.safeParse({ ...validTutorProfile, phone: "invalid", about: "Too short" });
    expect(invalid.success).toBe(false);
  });
});

describe("Tutor profile access", () => {
  it("rejects unauthenticated and Guardian access before profile data is read", async () => {
    await expect(createCaller().tutor.getMyProfile()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(createCaller("guardian").tutor.getMyProfile()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("Tutor secure login handoff", () => {
  it("stores the Tutor role and dashboard redirect before authentication starts", async () => {
    const cookies: Array<{ name: string; value: string }> = [];
    const caller = appRouter.createCaller({
      user: null,
      req: {},
      res: { cookie(name: string, value: string) { cookies.push({ name, value }); }, clearCookie() {} },
    } as any);

    await expect(caller.auth.selectRole({ role: "tutor", redirectTo: "/tutor/dashboard" })).resolves.toMatchObject({
      success: true,
      role: "tutor",
      redirectTo: "/tutor/dashboard",
    });
    expect(cookies).toEqual(expect.arrayContaining([
      { name: "connect-role", value: "tutor" },
      { name: "connect-redirect", value: "/tutor/dashboard" },
    ]));
  });
});

describe("Approved-Tutor candidate privacy", () => {
  it("omits private phone, email, and moderation status fields from the matching candidate list", async () => {
    const candidates = await listTutors();
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every(tutor => !("phone" in tutor) && !("contactEmail" in tutor) && !("profileStatus" in tutor))).toBe(true);
  });
});
