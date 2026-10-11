import { describe, expect, it } from "vitest";
import { getGuardianRequestStepValidation } from "./GuardianRequestJourney";

const completeRequest = {
  learningNeeds: [{ category: "English Medium", curriculumType: "British", classes: [{ classCourse: "Class 9–10", subjects: ["English"] }] }],
  tuitionType: "home" as const,
  groupCapacity: "",
  packageDurationMonths: "",
  studentCount: "1",
  studentGender: "",
  addressDetails: "",
  tuitionCityLocationId: "city-dhaka",
  tuitionLocationId: "area-mirpur",
  daysPerWeek: "3",
  preferredGender: "any" as const,
  instituteName: "", heardAboutUs: "facebook" as const, salaryAmount: "10000",
};

const banglaMedium = [{ category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["Mathematics"] }] }];
const englishVersion = [{ category: "English Version", curriculumType: null, classes: [{ classCourse: "Class 6", subjects: ["Science", "English"] }, { classCourse: "Class 7", subjects: ["Mathematics"] }] }];

describe("a request for several curricula and classes", () => {
  it("accepts several curricula, each with its classes and every class with its own subjects", () => {
    expect(getGuardianRequestStepValidation({ ...completeRequest, learningNeeds: [...banglaMedium, ...englishVersion] }, 1)).toBeNull();
  });

  it("names the curriculum or class that is missing something", () => {
    const noClass = [{ category: "Madrasa Medium", curriculumType: null, classes: [] }];
    const noSubject = [{ category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: [] }] }];

    expect(getGuardianRequestStepValidation({ ...completeRequest, learningNeeds: [...banglaMedium, ...noClass] }, 1)).toBe("Choose a class or level for Madrasa Medium to continue.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, learningNeeds: noSubject }, 1)).toBe("Select at least one subject for Class 5 to continue.");
  });

  it("holds a request to the Owner's limits: curricula, classes in all, subjects in a class", () => {
    const limits = { maxCurricula: 2, maxClasses: 3, maxSubjectsPerClass: 2 };
    const three = ["Bangla Medium", "English Version", "Madrasa Medium"].map(category => ({ category, curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["Math"] }] }));
    const fourClasses = [{ category: "Bangla Medium", curriculumType: null, classes: ["1", "2", "3", "4"].map(n => ({ classCourse: `Class ${n}`, subjects: ["Math"] })) }];
    const manySubjects = [{ category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["Math", "English", "Bangla"] }] }];

    expect(getGuardianRequestStepValidation({ ...completeRequest, learningNeeds: three }, 1, limits)).toBe("Choose at most 2 curricula.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, learningNeeds: fourClasses }, 1, limits)).toBe("Choose at most 3 classes.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, learningNeeds: manySubjects }, 1, limits)).toBe("You can choose up to 2 subjects for each class.");
  });
});

describe("canonical Guardian Tutor Request validation", () => {
  it("requires the approved learning and preference fields before advancing", () => {
    expect(getGuardianRequestStepValidation({ ...completeRequest, learningNeeds: [] }, 1)).toBe("Choose a curriculum or category to continue.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, learningNeeds: [{ ...completeRequest.learningNeeds[0], curriculumType: null }] }, 1)).toBe(
      "Choose a Curriculum Type for English Medium to continue.",
    );
    expect(getGuardianRequestStepValidation({ ...completeRequest, learningNeeds: banglaMedium }, 1)).toBeNull();
    expect(getGuardianRequestStepValidation({ ...completeRequest, daysPerWeek: "" }, 2)).toBe("Choose how many days per week you need tuition.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, instituteName: "", heardAboutUs: "facebook" as const, salaryAmount: "" }, 2)).toBe("Enter the monthly salary you are offering.");
  });

  it("requires a City-scoped tuition location for Home, Group, Package, and legacy Both requests", () => {
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionLocationId: "" }, 2)).toBe("Choose a City and a location for Home, Group, or Package Tutoring.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "group", tuitionCityLocationId: "", tuitionLocationId: "" }, 2)).toBe("Choose a City and a location for Home, Group, or Package Tutoring.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "package", tuitionCityLocationId: "", tuitionLocationId: "" }, 2)).toBe("Choose a City and a location for Home, Group, or Package Tutoring.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "both", tuitionCityLocationId: "", tuitionLocationId: "" }, 2)).toBe("Choose a City and a location for Home, Group, or Package Tutoring.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "online", tuitionCityLocationId: "", tuitionLocationId: "" }, 2)).toBeNull();
  });

  it("requires a whole-number maximum of 2–100 students only for Group Tutoring", () => {
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "group", groupCapacity: "" }, 2)).toBe("Enter a maximum student capacity from 2 to 100 for Group Tutoring.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "group", groupCapacity: "1" }, 2)).toBe("Enter a maximum student capacity from 2 to 100 for Group Tutoring.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "group", groupCapacity: "101" }, 2)).toBe("Enter a maximum student capacity from 2 to 100 for Group Tutoring.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "group", groupCapacity: "8" }, 2)).toBeNull();
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "home", groupCapacity: "" }, 2)).toBeNull();
  });

  it("requires a whole-number duration of 1–24 months only for Package Tutoring", () => {
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "package", packageDurationMonths: "" }, 2)).toBe("Enter a Package Tutoring duration from 1 to 24 whole months.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "package", packageDurationMonths: "0" }, 2)).toBe("Enter a Package Tutoring duration from 1 to 24 whole months.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "package", packageDurationMonths: "25" }, 2)).toBe("Enter a Package Tutoring duration from 1 to 24 whole months.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "package", packageDurationMonths: "6" }, 2)).toBeNull();
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "home", packageDurationMonths: "" }, 2)).toBeNull();
  });

  it("requires Number of Students from 1–100 for Home, Online, and Package Tutoring but not Group Tutoring", () => {
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "home", studentCount: "" }, 2)).toBe("Enter the number of students from 1 to 100.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "online", studentCount: "0", tuitionCityLocationId: "", tuitionLocationId: "" }, 2)).toBe("Enter the number of students from 1 to 100.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "package", packageDurationMonths: "6", studentCount: "101" }, 2)).toBe("Enter the number of students from 1 to 100.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, tuitionType: "group", groupCapacity: "8", studentCount: "" }, 2)).toBeNull();
  });

  it("reads the salary however it is written, and refuses one that is missing or impossible", () => {
    // The Guardian types a number the way they write numbers; a comma or the
    // currency word must not be an error.
    for (const written of ["5000", "5,000", "5,000 Taka"]) {
      expect(getGuardianRequestStepValidation({ ...completeRequest, instituteName: "", heardAboutUs: "facebook" as const, salaryAmount: written }, 2), written).toBeNull();
    }
    // "Discuss with coordinator" is gone, so an empty field is now a refusal
    // rather than a second option.
    expect(getGuardianRequestStepValidation({ ...completeRequest, instituteName: "", heardAboutUs: "facebook" as const, salaryAmount: "" }, 2)).toBe("Enter the monthly salary you are offering.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, instituteName: "", heardAboutUs: "facebook" as const, salaryAmount: "0" }, 2)).toBe("Enter a salary greater than zero.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, instituteName: "", heardAboutUs: "facebook" as const, salaryAmount: "900000" }, 2)).toMatch(/500,000 Taka or less/);
  });
});
