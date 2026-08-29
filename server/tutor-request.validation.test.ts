import { describe, expect, it } from "vitest";
import { guardianRequestTuitionTypeSchema, tutorRequestInputSchema, tuitionTypeSchema } from "./routers";

describe("tutor request validation", () => {
  const baseRequest = {
    category: "English Medium",
    curriculumType: "Cambridge",
    classCourse: "Class 9–10",
    subjects: ["English", "Mathematics"],
    daysPerWeek: 3,
    preferredGender: "any" as const,
    studentFirstName: "Rafi",
    budget: { kind: "range" as const, minimum: 10000, maximum: 12000 },
    notes: "Weekday evening preferred",
  };

  it("accepts Home, Online, Group, and Package Tutoring with the approved conditional location rules", () => {
    expect(tuitionTypeSchema.parse("both")).toBe("both");
    expect(guardianRequestTuitionTypeSchema.parse("group")).toBe("group");
    expect(guardianRequestTuitionTypeSchema.parse("package")).toBe("package");
    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "home",
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      studentCount: 1,
    }).success).toBe(true);

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "group",
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      groupCapacity: 8,
    }).success).toBe(true);

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "package",
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      packageDurationMonths: 6,
      studentCount: 2,
    }).success).toBe(true);

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "online",
      budget: { kind: "discuss" },
      studentCount: 1,
    }).success).toBe(true);
  });

  it("rejects Home, Group, and Package Tutoring requests without a City-scoped structured tuition location", () => {
    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "home",
    }).success).toBe(false);

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "both",
      tuitionCityLocationId: "dhaka-city",
    }).success).toBe(false);

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "group",
    }).success).toBe(false);

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "package",
      tuitionCityLocationId: "dhaka-city",
    }).success).toBe(false);
  });

  it("requires a realistic maximum student capacity only for Group Tutoring", () => {
    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "group",
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      groupCapacity: 8,
    }).success).toBe(true);

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "group",
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
    }).success).toBe(false);

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "group",
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      groupCapacity: 1,
    }).success).toBe(false);

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "group",
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      groupCapacity: 101,
    }).success).toBe(false);

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "home",
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      groupCapacity: 8,
    }).success).toBe(false);
  });

  it("requires a whole-number Package Tutoring duration from 1 to 24 months only for Package Tutoring", () => {
    const packageRequest = {
      ...baseRequest,
      tuitionType: "package" as const,
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      studentCount: 1,
    };

    expect(tutorRequestInputSchema.safeParse({ ...packageRequest, packageDurationMonths: 6 }).success).toBe(true);
    expect(tutorRequestInputSchema.safeParse(packageRequest).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...packageRequest, packageDurationMonths: 0 }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...packageRequest, packageDurationMonths: 25 }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "home",
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      studentCount: 1,
      packageDurationMonths: 6,
    }).success).toBe(false);
  });

  it("accepts an optional Male or Female Student Gender and bounded private Address Details", () => {
    const homeRequest = {
      ...baseRequest,
      tuitionType: "home" as const,
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      studentCount: 1,
    };

    expect(tutorRequestInputSchema.safeParse(homeRequest).success).toBe(true);
    expect(tutorRequestInputSchema.safeParse({
      ...homeRequest,
      studentGender: "male",
      addressDetails: "Near the community library, use the side entrance.",
    }).success).toBe(true);
    expect(tutorRequestInputSchema.safeParse({ ...homeRequest, studentGender: "female" }).success).toBe(true);
    expect(tutorRequestInputSchema.safeParse({ ...homeRequest, studentGender: "any" }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...homeRequest, addressDetails: "x".repeat(161) }).success).toBe(false);
  });

  it("requires Number of Students only for Home, Online, and Package Tutoring while Group keeps Maximum students only", () => {
    const homeRequest = {
      ...baseRequest,
      tuitionType: "home" as const,
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
    };
    const onlineRequest = { ...baseRequest, tuitionType: "online" as const };
    const packageRequest = {
      ...baseRequest,
      tuitionType: "package" as const,
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      packageDurationMonths: 6,
    };
    const groupRequest = {
      ...baseRequest,
      tuitionType: "group" as const,
      tuitionCityLocationId: "dhaka-city",
      tuitionLocationId: "mirpur-10",
      groupCapacity: 8,
    };

    expect(tutorRequestInputSchema.safeParse({ ...homeRequest, studentCount: 1 }).success).toBe(true);
    expect(tutorRequestInputSchema.safeParse({ ...onlineRequest, studentCount: 3 }).success).toBe(true);
    expect(tutorRequestInputSchema.safeParse({ ...packageRequest, studentCount: 4 }).success).toBe(true);
    expect(tutorRequestInputSchema.safeParse(homeRequest).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse(onlineRequest).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse(packageRequest).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...homeRequest, studentCount: 0 }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...onlineRequest, studentCount: 101 }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...packageRequest, studentCount: 1.5 }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse(groupRequest).success).toBe(true);
    expect(tutorRequestInputSchema.safeParse({ ...groupRequest, studentCount: 8 }).success).toBe(false);
  });

  it("rejects unsafe budget choices and incomplete learning details", () => {
    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      tuitionType: "invalid",
      category: "",
      subjects: [],
      daysPerWeek: 0,
      budget: { kind: "range", minimum: 12000, maximum: 10000 },
    }).success).toBe(false);
  });

  it("requires exactly one approved Curriculum Type for English Medium and excludes it for other categories", () => {
    for (const curriculumType of ["British", "Cambridge", "Ed-excel"] as const) {
      expect(tutorRequestInputSchema.safeParse({
        ...baseRequest,
        curriculumType,
        tuitionType: "online",
        studentCount: 1,
      }).success).toBe(true);
    }

    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      curriculumType: "",
      tuitionType: "online",
      studentCount: 1,
    }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      curriculumType: "International Baccalaureate",
      tuitionType: "online",
      studentCount: 1,
    }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      category: "Bangla Medium",
      curriculumType: "",
      tuitionType: "online",
      studentCount: 1,
    }).success).toBe(true);
    expect(tutorRequestInputSchema.safeParse({
      ...baseRequest,
      category: "Bangla Medium",
      curriculumType: "Cambridge",
      tuitionType: "online",
      studentCount: 1,
    }).success).toBe(false);
  });
});
