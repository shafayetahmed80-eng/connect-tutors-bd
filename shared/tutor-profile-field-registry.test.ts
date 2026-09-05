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

  it("gives only section e no sub-groups, matching its single-popup editor", () => {
    expect(subGroupsForSection("e")).toBeUndefined();
    expect(subGroupsForSection("a")).toEqual(["a-identity", "a-family"]);
    // `c-teaching` stays a declared id an Owner could move fields back into,
    // but no field ships in it since Teaching expertise moved to section d.
    expect(subGroupsForSection("c")).toEqual(["c-education"]);
    expect(subGroupsForSection("d")).toEqual(["d-availability", "d-teaching", "d-location"]);
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
    // from one that still applies after a move, so the naming is load-bearing
    // whether or not any field currently sits in the sub-group.
    for (const subGroup of tutorProfileFieldSubGroups) {
      const section = tutorProfileFieldSections.find(candidate => subGroup.startsWith(`${candidate}-`));
      expect(section, subGroup).toBeDefined();
      // And no field may claim a sub-group from a different section.
      for (const field of tutorProfileFieldRegistry.filter(candidate => candidate.subGroup === subGroup)) {
        expect(field.section, field.id).toBe(section);
      }
    }
  });

  it("gives every field a declared panel", () => {
    for (const field of tutorProfileFieldRegistry) {
      expect(tutorProfileFieldPanels, field.id).toContain(field.panel);
    }
  });

  it("keeps every sort order unique inside its section", () => {
    // Two fields in one section sharing an order leaves their relative
    // position to array order - which the Admin editor's move-up/move-down
    // arithmetic would then fight.
    for (const section of tutorProfileFieldSections) {
      const orders = tutorProfileFieldRegistry.filter(field => field.section === section).map(field => field.sortOrder);
      expect(new Set(orders).size, section).toBe(orders.length);
    }
  });
});

describe("Tutor Profile field panels", () => {
  it("splits a section's fields into panels, keeping both orders", () => {
    const config = defaultTutorProfileFieldConfig();
    const panels = groupFieldsByPanel(config.bySection.get("d") ?? []);

    // Teaching expertise ships in this tab now, second, straight after
    // Availability - see the section-d entries in the registry.
    expect(panels.map(panel => panel.panel)).toEqual([
      "how-you-teach", "what-you-teach", "own-words", "location-fee",
    ]);
    expect(panels[3].fields.map(field => field.id)).toEqual([
      "currentCityId", "currentLocationId", "teachingAreaIds", "feeMin", "feeMax", "travelDistanceKm",
    ]);
  });

  it("drops a panel once every field in it is disabled", () => {
    const config = resolveTutorProfileFieldConfig(
      ["priorTeachingExperience", "specialExpertise", "academicAchievement"].map(fieldId => ({
        fieldId, section: null, subGroup: null, sortOrder: null, enabled: 0, required: null,
      })),
    );
    const panels = groupFieldsByPanel(config.bySection.get("d") ?? []);
    expect(panels.map(panel => panel.panel)).not.toContain("own-words");
  });

  it("carries a field's panel with it into another section", () => {
    // A moved field must not scatter into whatever block comes first - it
    // arrives under its own heading in the new section.
    const moved = ["aboutMe", "teachingApproach", "whyChooseMe"];
    const config = resolveTutorProfileFieldConfig(moved.map((fieldId, index) => ({
      fieldId, section: "a", subGroup: null, sortOrder: 500 + index, enabled: null, required: null,
    })));

    const panels = groupFieldsByPanel(config.bySection.get("a") ?? []);
    expect(panels.map(panel => panel.panel)).toEqual(["identity", "family", "introduction"]);
    expect(panels[2].fields.map(field => field.id)).toEqual(moved);
  });

  it("drops a sub-group a moved field cannot take with it", () => {
    // `a-identity` belongs to section a; carrying it into section d would put
    // the field in two places at once.
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "headline", section: "d", subGroup: null, sortOrder: 500, enabled: null, required: null },
    ]);

    expect(config.byId.get("headline")?.section).toBe("d");
    expect(config.byId.get("headline")?.subGroup).toBeUndefined();
    expect(config.bySubGroup.get("a-identity")?.map(field => field.id) ?? []).not.toContain("headline");
    expect(config.bySection.get("d")?.map(field => field.id) ?? []).toContain("headline");
  });
});
