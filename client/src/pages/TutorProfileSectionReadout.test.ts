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
  it("returns every section in order with the shared titles", () => {
    const sections = getTutorProfileReadoutSections(baseForm(), resolvers);
    expect(sections.map(section => section.id)).toEqual(["a", "c", "d", "f", "e"]);
    expect(sections.map(section => section.title)).toEqual([
      "Personal Information",
      "Education",
      "Tuition Related",
      "Credential",
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

    // Tuition Related splits into two sub-groups, each its own card and its
    // own popup. "In your own words" and the old Location and fee fields both
    // fold into Teaching Expertise, the sub-group they belong to.
    expect(sections[2].groups.map(group => group.heading)).toEqual([
      "Availability",
      "Teaching Expertise",
    ]);
    expect(sections[2].groups.map(group => group.editTarget)).toEqual([
      "d-availability",
      "d-teaching",
    ]);

    // Education stages are cards of their own, newest first.
    expect(sections[1].groups.map(group => group.editTarget)).toEqual([
      "c-university",
      "c-higher-secondary",
      "c-secondary",
    ]);
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
    const sectionE = sections[4].groups.flatMap(group => group.rows);
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
        tuitionTypes: ["home", "online"],
        preferredTeachingDays: ["monday", "friday"],
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
    expect(teaching.find(row => row.label === "Tuition type")?.value).toBe("Home tuition, Online tuition");
    expect(teaching.find(row => row.label === "Preferred teaching days")?.value).toBe("Monday, Friday");
    expect(teaching.find(row => row.label === "Current location")?.value).toBe("Uttara");
  });
});

describe("the Secondary and Higher Secondary read-outs", () => {
  it("show every detail the record holds, one row each, and mark the optional ones", () => {
    const form = baseForm();
    const records = form.educationRecords.map(record => record.qualificationLevel === "HSC"
      ? { ...record, instituteName: "Notre Dame College", degreeExamTitle: "HSC", majorGroup: "Science", curriculum: "English Version" as const, resultGpa: "5.00", rollNumber: "123456", registrationNumber: "98765", passingYear: "2017" }
      : record);
    const education = getTutorProfileReadoutSections({ ...form, educationRecords: records }, resolvers).find(section => section.id === "c")!;
    const higher = education.groups.find(group => group.heading === "Higher Secondary")!;

    expect(higher.rows.map(row => [row.label, row.value])).toEqual([
      ["Institute name", "Notre Dame College"], ["Degree / exam title", "HSC"], ["Subject / group", "Science"], ["Curriculum", "English Version"],
      ["Result / GPA", "5.00"], ["Roll number", "123456"], ["Registration number", "98765"], ["Passing year", "2017"],
    ]);
    expect(higher.rows.filter(row => row.optional).map(row => row.label)).toEqual(["Result / GPA", "Roll number", "Registration number"]);
    // Secondary has nothing yet: its rows are all there and all missing.
    const secondary = education.groups.find(group => group.heading === "Secondary")!;
    expect(secondary.rows.every(row => row.missing)).toBe(true);
  });
});

describe("the Qualification history read-out", () => {
  const degree = (level: "Honours" | "Masters", over: Record<string, unknown> = {}) => ({
    qualificationLevel: level, instituteName: "Dhaka University", degreeExamTitle: level === "Honours" ? "BSc" : "MSc", majorGroup: "Physics",
    curriculum: "English Version", resultGpa: "3.80", studyStartYear: "2016", studyEndYear: "2020", currentlyStudying: false, instituteIdCardNumber: "", ...over,
  });
  const history = (records: unknown[]) => {
    const form = baseForm();
    const education = getTutorProfileReadoutSections({ ...form, educationRecords: [...form.educationRecords, ...records] as never }, resolvers).find(section => section.id === "c")!;
    return education.groups.flatMap(group => group.rows).filter(row => row.label.includes(" · "));
  };

  it("shows each degree with everything it holds, every row named by its level", () => {
    const rows = history([degree("Honours"), degree("Masters", { currentlyStudying: true, studyEndYear: "" })]);
    const byLabel = Object.fromEntries(rows.map(row => [row.label, row.value]));
    expect(byLabel["Honours · Degree / exam title"]).toBe("BSc");
    expect(byLabel["Honours · Study period"]).toBe("2016 - 2020");
    expect(byLabel["Masters · Degree / exam title"]).toBe("MSc");
    expect(byLabel["Masters · Study period"]).toBe("2016 - Ongoing");
    expect(byLabel["Honours · Result / GPA"]).toBe("3.80");
    expect(rows.filter(row => row.optional).map(row => row.label)).toContain("Honours · Institute ID card number");
  });

  it("is one missing row while no degree has been added", () => {
    const form = baseForm();
    const row = getTutorProfileReadoutSections(form, resolvers).find(section => section.id === "c")!.groups.flatMap(group => group.rows).find(entry => entry.label === "Qualification history");
    expect(row?.missing).toBe(true);
  });
});
