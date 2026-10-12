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

  describe("Tutoring Time", () => {
    // One valid request of each tuition type. Every member of the union is .strict(),
    // so each one has to name tutoringTime itself for the field to get through.
    const requestsByType = {
      home: { ...baseRequest, tuitionType: "home" as const, tuitionCityLocationId: "dhaka-city", tuitionLocationId: "mirpur-10", studentCount: 1 },
      online: { ...baseRequest, tuitionType: "online" as const, studentCount: 1 },
      group: { ...baseRequest, tuitionType: "group" as const, tuitionCityLocationId: "dhaka-city", tuitionLocationId: "mirpur-10", groupCapacity: 8 },
      package: { ...baseRequest, tuitionType: "package" as const, tuitionCityLocationId: "dhaka-city", tuitionLocationId: "mirpur-10", packageDurationMonths: 6, studentCount: 1 },
      both: { ...baseRequest, tuitionType: "both" as const, tuitionCityLocationId: "dhaka-city", tuitionLocationId: "mirpur-10" },
    };
    const home = requestsByType.home;
    const timeOf = (parsed: ReturnType<typeof tutorRequestInputSchema.safeParse>) => (parsed.success ? parsed.data.tutoringTime : "did not parse");

    it("is optional: a request without one is still a valid request and carries none", () => {
      const parsed = tutorRequestInputSchema.safeParse(home);

      expect(parsed.success).toBe(true);
      expect(timeOf(parsed)).toBeUndefined();
    });

    it("takes a zero-padded 24-hour time, midnight and the last minute of the day included", () => {
      for (const time of ["16:30", "00:00", "23:59", "09:05", "12:00"]) {
        const parsed = tutorRequestInputSchema.safeParse({ ...home, tutoringTime: time });
        expect(parsed.success, time).toBe(true);
        expect(timeOf(parsed), time).toBe(time);
      }
    });

    it("refuses anything that is not a real HH:mm time", () => {
      const notTimes = [
        "24:00", // there is no hour 24, midnight is 00:00
        "16:60", // there is no minute 60
        "99:99",
        "4:30 PM", // the box hands back 24 hours whatever it shows
        "04:30 PM",
        "16:30:00", // no seconds
        "4:30", // not zero-padded
        "16:3",
        "1630",
        "16.30",
        "-1:30",
        "",   // the client sends nothing rather than a blank
        "   ", // spaces only is blank once trimmed
      ];
      for (const time of notTimes) {
        expect(tutorRequestInputSchema.safeParse({ ...home, tutoringTime: time }).success, JSON.stringify(time)).toBe(false);
      }
    });

    it("refuses a value that is not a string, null included", () => {
      for (const value of [1630, 16.5, true, null, ["16:30"], { hour: 16, minute: 30 }]) {
        expect(tutorRequestInputSchema.safeParse({ ...home, tutoringTime: value }).success, JSON.stringify(value)).toBe(false);
      }
    });

    it("trims surrounding spaces before checking, and keeps the trimmed time", () => {
      const parsed = tutorRequestInputSchema.safeParse({ ...home, tutoringTime: "  16:30 " });

      expect(parsed.success).toBe(true);
      expect(timeOf(parsed)).toBe("16:30");
      // Spaces inside the time are not trimmed away: it is still not a time.
      expect(tutorRequestInputSchema.safeParse({ ...home, tutoringTime: "16: 30" }).success).toBe(false);
    });

    it.each(Object.entries(requestsByType))("is a known key on a %s request, while an unknown key is still refused", (_type, request) => {
      // The request is valid as it stands, so each refusal below is down to the field it adds.
      expect(tutorRequestInputSchema.safeParse(request).success).toBe(true);

      const withTime = tutorRequestInputSchema.safeParse({ ...request, tutoringTime: "16:30" });
      expect(withTime.success).toBe(true);
      expect(timeOf(withTime)).toBe("16:30");
      expect(tutorRequestInputSchema.safeParse({ ...request, tutoringTime: "24:00" }).success).toBe(false);

      // Strictness is as it was: tutoringTime is accepted because the schema names it,
      // not because extra keys are let through.
      expect(tutorRequestInputSchema.safeParse({ ...request, tutoringTime: "16:30", tutoringTimeZone: "Asia/Dhaka" }).success).toBe(false);
      expect(tutorRequestInputSchema.safeParse({ ...request, startTime: "16:30" }).success).toBe(false);
    });
  });
});
