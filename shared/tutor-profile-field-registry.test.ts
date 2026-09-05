import { describe, expect, it } from "vitest";
import {
  defaultTutorProfileFieldConfig,
  findTutorProfileFieldMeta,
  groupFieldsByPanel,
  resolveTutorProfileFieldConfig,
  subGroupsForSection,
  tutorProfileFieldPanels,
  tutorProfileFieldRegistry,
  tutorProfileFieldSections,
  tutorProfileFieldSubGroups,
} from "./tutor-profile-field-registry";

describe("Tutor Profile field registry", () => {
  it("declares every field with a unique id and a label", () => {
    const ids = tutorProfileFieldRegistry.map(field => field.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const field of tutorProfileFieldRegistry) {
      expect(field.label.trim(), field.id).not.toBe("");
    }
  });

  it("only assigns a sub-group that actually belongs to the field's section", () => {
    for (const field of tutorProfileFieldRegistry) {
      if (!field.subGroup) continue;
      const groups = subGroupsForSection(field.section);
      expect(groups, field.id).toBeDefined();
      expect(groups, field.id).toContain(field.subGroup);
    }
  });

  it("gives sections d and e no sub-groups, matching their single-popup editor", () => {
    expect(subGroupsForSection("d")).toBeUndefined();
    expect(subGroupsForSection("e")).toBeUndefined();
    expect(subGroupsForSection("a")).toEqual(["a-identity", "a-family"]);
    expect(subGroupsForSection("c")).toEqual(["c-education", "c-teaching"]);
  });

  it("finds a declared field and returns undefined for an unknown one", () => {
    expect(findTutorProfileFieldMeta("name")?.section).toBe("a");
    expect(findTutorProfileFieldMeta("does-not-exist")).toBeUndefined();
  });

  it("resolves every field enabled, at its default section/order/required, when nothing is stored", () => {
    const config = defaultTutorProfileFieldConfig();
    for (const field of tutorProfileFieldRegistry) {
      const resolved = config.byId.get(field.id);
      expect(resolved, field.id).toBeDefined();
      expect(resolved?.enabled).toBe(true);
      expect(resolved?.section).toBe(field.section);
      expect(resolved?.subGroup).toBe(field.subGroup);
      expect(resolved?.sortOrder).toBe(field.sortOrder);
      expect(resolved?.required).toBe(field.requiredByDefault);
    }
  });

  it("orders every section and sub-group's resolved fields by sortOrder", () => {
    const config = defaultTutorProfileFieldConfig();
    for (const section of tutorProfileFieldSections) {
      const fields = config.bySection.get(section) ?? [];
      const orders = fields.map(field => field.sortOrder);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
    for (const subGroup of tutorProfileFieldSubGroups) {
      const fields = config.bySubGroup.get(subGroup) ?? [];
      const orders = fields.map(field => field.sortOrder);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  });

  it("moves a field to a stored section and sub-group", () => {
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "aboutMe", section: "a", subGroup: "a-family", sortOrder: null, enabled: null, required: null },
    ]);
    const field = config.byId.get("aboutMe")!;
    expect(field.section).toBe("a");
    expect(field.subGroup).toBe("a-family");
    expect(config.bySection.get("e")?.some(f => f.id === "aboutMe")).toBe(false);
    expect(config.bySubGroup.get("a-family")?.some(f => f.id === "aboutMe")).toBe(true);
  });

  it("reorders a field within its section via a stored sortOrder", () => {
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "additionalNotes", section: null, subGroup: null, sortOrder: 5, enabled: null, required: null },
    ]);
    const fields = config.bySection.get("e")!;
    expect(fields[0].id).toBe("additionalNotes");
  });

  it("drops a disabled field from both lookups, but keeps its registry entry addressable", () => {
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "travelDistanceKm", section: null, subGroup: null, sortOrder: null, enabled: 0, required: null },
    ]);
    expect(config.byId.get("travelDistanceKm")?.enabled).toBe(false);
    expect(config.bySection.get("d")?.some(f => f.id === "travelDistanceKm")).toBe(false);
  });

  it("flips a configurable field required, and ignores the same override on a code-owned one", () => {
    const configurable = resolveTutorProfileFieldConfig([
      { fieldId: "resultGpa", section: null, subGroup: null, sortOrder: null, enabled: null, required: 1 },
    ]);
    expect(configurable.byId.get("resultGpa")?.required).toBe(true);

    // yearSemester's requiredness branches on studyStatus in code - a flat
    // override must not be able to fight that.
    const codeOwned = resolveTutorProfileFieldConfig([
      { fieldId: "yearSemester", section: null, subGroup: null, sortOrder: null, enabled: null, required: 0 },
    ]);
    expect(findTutorProfileFieldMeta("yearSemester")?.requiredConfigurable).toBe(false);
    expect(codeOwned.byId.get("yearSemester")?.required).toBe(true);
  });

  it("ignores an override for a field the registry no longer declares", () => {
    expect(() => resolveTutorProfileFieldConfig([
      { fieldId: "gone-away", section: "a", subGroup: null, sortOrder: 1, enabled: 0, required: 1 },
    ])).not.toThrow();
    expect(resolveTutorProfileFieldConfig([
      { fieldId: "gone-away", section: "a", subGroup: null, sortOrder: 1, enabled: 0, required: 1 },
    ])).toEqual(defaultTutorProfileFieldConfig());
  });

  it("ignores an invalid section/sub-group value rather than resolving to it", () => {
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "name", section: "not-a-section", subGroup: "not-a-group", sortOrder: null, enabled: null, required: null },
    ]);
    expect(config.byId.get("name")?.section).toBe("a");
    expect(config.byId.get("name")?.subGroup).toBe("a-identity");
  });

  it("excludes only profilePhotoUrl from reorder", () => {
    const excluded = tutorProfileFieldRegistry.filter(field => field.excludedFromReorder);
    expect(excluded.map(field => field.id)).toEqual(["profilePhotoUrl"]);
  });

  it("names every sub-group after the section it belongs to", () => {
    // The resolve step relies on this prefix to tell a carried-over sub-group
    // from one that still applies after a move.
    for (const subGroup of tutorProfileFieldSubGroups) {
      const section = tutorProfileFieldRegistry.find(field => field.subGroup === subGroup)?.section;
      expect(subGroup.startsWith(`${section}-`), subGroup).toBe(true);
    }
  });

  it("gives every field a declared panel", () => {
    for (const field of tutorProfileFieldRegistry) {
      expect(tutorProfileFieldPanels, field.id).toContain(field.panel);
    }
  });
});

describe("Tutor Profile field panels", () => {
  it("splits a section's fields into panels, keeping both orders", () => {
    const config = defaultTutorProfileFieldConfig();
    const panels = groupFieldsByPanel(config.bySection.get("d") ?? []);

    expect(panels.map(panel => panel.panel)).toEqual(["how-you-teach", "location-fee", "communication"]);
    expect(panels[1].fields.map(field => field.id)).toEqual([
      "currentCityId", "currentLocationId", "teachingAreaIds", "feeMin", "feeMax", "travelDistanceKm",
    ]);
  });

  it("drops a panel once every field in it is disabled", () => {
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "teachingLanguageIds", section: null, subGroup: null, sortOrder: null, enabled: 0, required: null },
      { fieldId: "communicationPreferences", section: null, subGroup: null, sortOrder: null, enabled: 0, required: null },
    ]);
    const panels = groupFieldsByPanel(config.bySection.get("d") ?? []);
    expect(panels.map(panel => panel.panel)).toEqual(["how-you-teach", "location-fee"]);
  });

  it("carries a field's panel with it into another section", () => {
    // Moving Teaching expertise to Tuition & location must not scatter its
    // fields - they arrive under their own heading in the new section.
    const moved = ["primarySubjectIds", "additionalSubjectIds", "classLevelIds", "curriculumIds", "teachingExperienceYears"];
    const config = resolveTutorProfileFieldConfig(moved.map((fieldId, index) => ({
      fieldId, section: "d", subGroup: null, sortOrder: 200 + index, enabled: null, required: null,
    })));

    const panels = groupFieldsByPanel(config.bySection.get("d") ?? []);
    expect(panels.map(panel => panel.panel)).toEqual(["how-you-teach", "location-fee", "communication", "what-you-teach"]);
    expect(panels[3].fields.map(field => field.id)).toEqual(moved);

    // ...and its sub-group is dropped, since `c-teaching` cannot follow a field
    // into section d. Nothing may still list it under Education's sub-group.
    expect(config.byId.get("primarySubjectIds")?.subGroup).toBeUndefined();
    expect(config.bySubGroup.get("c-teaching")?.map(field => field.id) ?? []).not.toContain("primarySubjectIds");
  });
});
