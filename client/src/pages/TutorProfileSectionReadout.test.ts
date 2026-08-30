import { describe, expect, it } from "vitest";
import { getTutorProfileReadoutSections, type TutorProfileReadoutResolvers } from "./TutorProfileSectionReadout";
import { hydrateTutorProfileForm } from "./TutorProfileFormData";
import type { TeachingProfileState } from "./TutorProfileWorkspace";

const identity = (id: string) => `#${id}`;
const resolvers: TutorProfileReadoutResolvers = {
  subject: id => ({ "1": "Mathematics", "2": "Physics" }[id] ?? identity(id)),
  classLevel: id => ({ "5": "SSC" }[id] ?? identity(id)),
  curriculum: identity,
  studentType: identity,
  language: identity,
  university: id => ({ "10": "Dhaka University" }[id] ?? identity(id)),
  faculty: identity,
  department: identity,
  location: id => ({ "dhaka-uttara": "Uttara" }[id] ?? identity(id)),
  area: identity,
};

function baseForm(overrides: Partial<TeachingProfileState> = {}): TeachingProfileState {
  const base = hydrateTutorProfileForm(null, null) as TeachingProfileState;
  return {
    ...base,
    primarySubjectIds: [],
    additionalSubjectIds: [],
    classLevelIds: [],
    curriculumIds: [],
    teachingExperienceYears: "",
    priorTeachingExperience: "",
    specialExpertise: "",
    studentTypeIds: [],
    academicAchievement: "",
    ...overrides,
  };
}

describe("getTutorProfileReadoutSections", () => {
  it("returns the five sections in order with the shared titles", () => {
    const sections = getTutorProfileReadoutSections(baseForm(), resolvers);
    expect(sections.map(section => section.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(sections.map(section => section.title)).toEqual([
      "Identity and contact",
      "Family and emergency contact",
      "Education and teaching expertise",
      "Tuition, location and communication",
      "Introduction and review",
    ]);
  });

  it("marks an empty required value as missing and shows 'Not given'", () => {
    const sections = getTutorProfileReadoutSections(baseForm(), resolvers);
    const nameRow = sections[0].groups[0].rows.find(row => row.label === "Full name");
    expect(nameRow).toEqual({ label: "Full name", value: "Not given", missing: true });
  });

  it("marks an empty optional value as optional and shows an em dash, not a red 'Not given'", () => {
    const sections = getTutorProfileReadoutSections(baseForm(), resolvers);
    const rows = sections.flatMap(section => section.groups.flatMap(group => group.rows));

    const additionalPhone = rows.find(row => row.label === "Additional phone");
    expect(additionalPhone).toEqual({ label: "Additional phone", value: "—", missing: true, optional: true });

    // Every Section E field is optional for submission.
    const sectionE = sections[4].groups.flatMap(group => group.rows);
    expect(sectionE.every(row => row.optional === true)).toBe(true);
    expect(sectionE.map(row => row.value)).toEqual(["—", "—", "—", "—"]);

    // Required rows keep the plain shape with no `optional` flag.
    expect(rows.find(row => row.label === "Father's name")).toEqual({ label: "Father's name", value: "Not given", missing: true });
  });

  it("falls back to 'Not given' rather than a raw id when a catalog value does not resolve", () => {
    const sections = getTutorProfileReadoutSections(
      baseForm({ name: "Rahim", universityId: "999", primarySubjectIds: ["1", "404"] }),
      { ...resolvers, university: () => "", subject: id => (id === "1" ? "Mathematics" : "") },
    );
    const education = sections[2].groups.flatMap(group => group.rows);
    expect(education.find(row => row.label === "Institute")).toEqual({ label: "Institute", value: "Not given", missing: true });
    expect(education.find(row => row.label === "Primary subjects")?.value).toBe("Mathematics");
  });

  it("resolves id lists and enum codes to human labels", () => {
    const sections = getTutorProfileReadoutSections(
      baseForm({
        name: "Rahim",
        primarySubjectIds: ["1", "2"],
        classLevelIds: ["5"],
        universityId: "10",
        currentLocationId: "dhaka-uttara",
        tuitionType: "both",
        preferredTeachingDays: ["monday", "friday"],
        communicationPreferences: ["whatsapp"],
      }),
      resolvers,
    );

    const identityRows = sections[0].groups[0].rows;
    expect(identityRows.find(row => row.label === "Full name")).toEqual({ label: "Full name", value: "Rahim", missing: false });

    const education = sections[2].groups.flatMap(group => group.rows);
    expect(education.find(row => row.label === "Primary subjects")?.value).toBe("Mathematics, Physics");
    expect(education.find(row => row.label === "Class / level")?.value).toBe("SSC");
    expect(education.find(row => row.label === "Institute")?.value).toBe("Dhaka University");

    const teaching = sections[3].groups.flatMap(group => group.rows);
    expect(teaching.find(row => row.label === "Tuition type")?.value).toBe("Home & online");
    expect(teaching.find(row => row.label === "Preferred teaching days")?.value).toBe("Monday, Friday");
    expect(teaching.find(row => row.label === "Current location")?.value).toBe("Uttara");
    expect(teaching.find(row => row.label === "Communication preferences")?.value).toBe("WhatsApp");
  });
});
