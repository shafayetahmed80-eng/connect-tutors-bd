import { describe, expect, it } from "vitest";
import { getGuardianRequestStepValidation } from "./GuardianRequestJourney";

const completeRequest = {
  category: "English Medium",
  curriculumType: "British",
  classCourse: "Class 9–10",
  selectedSubjects: ["English"],
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
  budgetKind: "range" as const,
  budgetMinimum: "10000",
  budgetMaximum: "12000",
};

describe("canonical Guardian Tutor Request validation", () => {
  it("requires the approved learning and preference fields before advancing", () => {
    expect(getGuardianRequestStepValidation({ ...completeRequest, category: "" }, 1)).toBe("Choose a curriculum or category to continue.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, curriculumType: "" }, 1)).toBe(
      "Choose a Curriculum Type for English Medium to continue.",
    );
    expect(getGuardianRequestStepValidation({ ...completeRequest, category: "Bangla Medium", curriculumType: "" }, 1)).toBeNull();
    expect(getGuardianRequestStepValidation({ ...completeRequest, daysPerWeek: "" }, 2)).toBe("Choose how many days per week you need tuition.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, budgetKind: "" as never }, 2)).toBe("Choose a monthly budget option.");
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

  it("rejects an invalid budget range and accepts the coordinator-discussion option", () => {
    expect(getGuardianRequestStepValidation({ ...completeRequest, budgetMinimum: "13000", budgetMaximum: "12000" }, 2)).toBe("Your minimum budget cannot be higher than your maximum budget.");
    expect(getGuardianRequestStepValidation({ ...completeRequest, budgetKind: "discuss", budgetMinimum: "", budgetMaximum: "" }, 2)).toBeNull();
  });
});
