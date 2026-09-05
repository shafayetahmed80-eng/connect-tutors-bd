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
  it("returns the four sections in order with the shared titles", () => {
    const sections = getTutorProfileReadoutSections(baseForm(), resolvers);
    expect(sections.map(section => section.id)).toEqual(["a", "c", "d", "e"]);
    expect(sections.map(section => section.title)).toEqual([
      "Personal Information",
      "Education",
      "Tuition, location and communication",
      "Introduction and review",
    ]);
    // Personal Information carries the two former sections as sub-groups.
    expect(sections[0].groups.map(group => group.heading)).toEqual(["Identity and contact", "Family and emergency contact"]);
  });

  it("cards a section by its sub-groups, or by its panels where it has none", () => {
    const sections = getTutorProfileReadoutSections(baseForm(), resolvers);

    // Personal Information edits one sub-group at a time, so each card names
    // the popup its pencil opens.
    expect(sections[0].groups.map(group => group.editTarget)).toEqual(["a-identity", "a-family"]);

    // Tuition & location is one popup - its cards are panels, and Teaching
    // expertise now sits second, straight after Availability.
    expect(sections[2].groups.map(group => group.heading)).toEqual([
      "Availability",
      "Teaching expertise",
      "In your own words",
      "Location and fee",
      "Communication",
    ]);
    expect(sections[2].groups.every(group => group.editTarget === undefined)).toBe(true);
  });

  it("marks an empty required value as missing and shows 'Not given'", () => {
    const sections = getTutorProfileReadoutSections(baseForm(), resolvers);
    const nameRow = sections[0].groups[0].rows.find(row => row.label === "Full name");
    expect(nameRow).toEqual({ label: "Full name", value: "Not given", missing: true });
  });

  it("says 'Not given' on every empty field, and still flags which ones are optional", () => {
    const sections = getTutorProfileReadoutSections(baseForm(), resolvers);
    const rows = sections.flatMap(section => section.groups.flatMap(group => group.rows));

    // An em dash left the tutor guessing; the wording is now the same
    // everywhere and only the `optional` flag (and so the colour) differs.
    const additionalPhone = rows.find(row => row.label === "Additional phone");
    expect(additionalPhone).toEqual({ label: "Additional phone", value: "Not given", missing: true, optional: true });

    // Every "Introduction and review" field is optional for submission.
    const sectionE = sections[3].groups.flatMap(group => group.rows);
    expect(sectionE.every(row => row.optional === true)).toBe(true);
    expect(sectionE.map(row => row.value)).toEqual(["Not given", "Not given", "Not given", "Not given"]);

    // No empty field anywhere still reads as a dash.
    expect(rows.filter(row => row.missing).every(row => row.value === "Not given")).toBe(true);

    // Required rows keep the plain shape with no `optional` flag.
    expect(rows.find(row => row.label === "Father's name")).toEqual({ label: "Father's name", value: "Not given", missing: true });
  });

  it("falls back to 'Not given' rather than a raw id when a catalog value does not resolve", () => {
    const sections = getTutorProfileReadoutSections(
      baseForm({ name: "Rahim", universityId: "999", primarySubjectIds: ["1", "404"] }),
      { ...resolvers, university: () => "", subject: id => (id === "1" ? "Mathematics" : "") },
    );
    const education = sections[1].groups.flatMap(group => group.rows);
    expect(education.find(row => row.label === "Institute")).toEqual({ label: "Institute", value: "Not given", missing: true });
    // Subjects live in Tuition & location now, not with the Tutor's own degree.
    const tuition = sections[2].groups.flatMap(group => group.rows);
    expect(tuition.find(row => row.label === "Primary subjects")?.value).toBe("Mathematics");
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

    const education = sections[1].groups.flatMap(group => group.rows);
    const tuition = sections[2].groups.flatMap(group => group.rows);
    expect(tuition.find(row => row.label === "Primary subjects")?.value).toBe("Mathematics, Physics");
    expect(tuition.find(row => row.label === "Class / level")?.value).toBe("SSC");
    expect(education.find(row => row.label === "Institute")?.value).toBe("Dhaka University");

    const teaching = sections[2].groups.flatMap(group => group.rows);
    expect(teaching.find(row => row.label === "Tuition type")?.value).toBe("Home & online");
    expect(teaching.find(row => row.label === "Preferred teaching days")?.value).toBe("Monday, Friday");
    expect(teaching.find(row => row.label === "Current location")?.value).toBe("Uttara");
    expect(teaching.find(row => row.label === "Communication preferences")?.value).toBe("WhatsApp");
  });
});
