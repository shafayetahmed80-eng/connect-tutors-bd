import { describe, expect, it } from "vitest";
import { guardianRequestTuitionTypeSchema, tutorRequestInputSchema, tuitionTypeSchema } from "./routers";
import { withLegacyLearningNeeds } from "./learning-needs-input";

describe("tutor request validation", () => {
  const baseRequest = {
    learningNeeds: [{ category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Class 9–10", subjects: ["English", "Mathematics"] }] }],
    daysPerWeek: 3,
    preferredGender: "any" as const,
    studentFirstName: "Rafi",
    budgetAmount: 10000,
    instituteName: "Dhaka College",
    heardAboutUs: "facebook" as const,
    notes: "Weekday evening preferred",
  };

  it("accepts Home, Online, Group, and Package Tutoring with the approved conditional location rules", () => {
    expect(guardianRequestTuitionTypeSchema.parse("both")).toBe("both");
    expect(tuitionTypeSchema.parse("group")).toBe("group");
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
      budgetAmount: 5000,
      instituteName: "Dhaka College",
      heardAboutUs: "facebook" as const,
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
      learningNeeds: [{ category: "", classes: [{ classCourse: "Class 9–10", subjects: [] }] }],
      daysPerWeek: 0,
      budgetAmount: 12000,
      instituteName: "Dhaka College",
      heardAboutUs: "facebook" as const,
    }).success).toBe(false);
  });

  const online = { tuitionType: "online" as const, studentCount: 1 };
  const english = (curriculumType?: string) => [{ category: "English Medium", ...(curriculumType !== undefined ? { curriculumType } : {}), classes: [{ classCourse: "Class 9–10", subjects: ["English"] }] }];
  const bangla = (curriculumType?: string) => [{ category: "Bangla Medium", ...(curriculumType !== undefined ? { curriculumType } : {}), classes: [{ classCourse: "Class 5", subjects: ["Bangla"] }] }];

  it("requires exactly one approved Curriculum Type for English Medium and excludes it for other categories", () => {
    for (const curriculumType of ["British", "Cambridge", "Ed-excel"] as const) {
      expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: english(curriculumType) }).success).toBe(true);
    }
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: english("") }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: english() }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: english("International Baccalaureate") }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: bangla("") }).success).toBe(true);
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: bangla("Cambridge") }).success).toBe(false);
  });

  it("takes several curricula, each with several classes and each class with its own subjects", () => {
    const needs = [
      { category: "English Version", classes: [{ classCourse: "Class 5", subjects: ["Math", "English"] }, { classCourse: "Class 6", subjects: ["Math"] }] },
      ...english("Cambridge"),
    ];

    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: needs }).success).toBe(true);
  });

  it("asks for a class in every curriculum and a subject in every class", () => {
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: [{ category: "Bangla Medium", classes: [] }] }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: [{ category: "Bangla Medium", classes: [{ classCourse: "Class 5", subjects: [] }] }] }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: [] }).success).toBe(false);
  });

  it("refuses a curriculum or a class chosen twice, and more than the ceilings the registry allows", () => {
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: [...bangla(), ...bangla()] }).success).toBe(false);
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: [{ category: "Bangla Medium", classes: [{ classCourse: "Class 5", subjects: ["A"] }, { classCourse: "Class 5", subjects: ["B"] }] }] }).success).toBe(false);
    const seven = ["A", "B", "C", "D", "E", "F", "G"].map(category => ({ category, classes: [{ classCourse: "Class 1", subjects: ["Math"] }] }));
    expect(tutorRequestInputSchema.safeParse({ ...baseRequest, ...online, learningNeeds: seven }).success).toBe(false);
  });

  it("still takes the request in the shape it had before there were lists, as a list of one", () => {
    const { learningNeeds: _needs, ...rest } = baseRequest;
    const legacy = withLegacyLearningNeeds({ ...rest, ...online, category: "Bangla Medium", classCourse: "Class 5", subjects: ["Bangla"] });

    const parsed = tutorRequestInputSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.learningNeeds).toEqual([{ category: "Bangla Medium", classes: [{ classCourse: "Class 5", subjects: ["Bangla"] }] }]);
  });
});
