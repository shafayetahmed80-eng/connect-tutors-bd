import { describe, expect, it } from "vitest";
import { defaultTutorProfileFieldConfig, resolveTutorProfileFieldConfig } from "@shared/tutor-profile-field-registry";
import {
  appendSortOrder,
  editTargetFor,
  emptyOverrideRow,
  enabledOverrideValue,
  groupFieldsForEditor,
  moveTargetOverride,
  overrideRowsEqual,
  requiredOverrideValue,
  seedFieldEditorDrafts,
  swapSortOrder,
  tutorProfileFieldEditTargets,
} from "./TutorProfileFieldEditor";

describe("Tutor Profile field editor logic", () => {
  it("buckets every field into exactly one of the declared edit targets, except profilePhotoUrl", () => {
    const config = defaultTutorProfileFieldConfig();
    const grouped = groupFieldsForEditor(config.all);

    expect(new Set(grouped.keys())).toEqual(new Set([
      "a-identity", "a-family", "c-education", "d-availability", "d-teaching", "d-location", "e",
    ]));
    // c-teaching is a declared target with nothing in it by default.
    expect(grouped.get("c-teaching")).toBeUndefined();
    expect(editTargetFor(config.byId.get("profilePhotoUrl")!)).toBeNull();
    for (const [, fields] of Array.from(grouped.entries())) {
      expect(fields.map(f => f.sortOrder)).toEqual([...fields.map(f => f.sortOrder)].sort((a, b) => a - b));
    }
  });

  it("keeps a disabled field in its group, so the editor can turn it back on", () => {
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "headline", section: null, subGroup: null, sortOrder: null, enabled: 0, required: null },
    ]);
    const grouped = groupFieldsForEditor(config.all);
    expect(grouped.get("a-identity")?.some(f => f.id === "headline" && f.enabled === false)).toBe(true);
  });

  it("reflects a not-yet-saved draft move immediately", () => {
    const draftRows = [
      { fieldId: "aboutMe", section: "a" as const, subGroup: "a-family" as const, sortOrder: 500, enabled: null, required: null },
    ];
    const config = resolveTutorProfileFieldConfig(draftRows);
    const grouped = groupFieldsForEditor(config.all);
    expect(grouped.get("a-family")?.some(f => f.id === "aboutMe")).toBe(true);
    expect(grouped.get("e")?.some(f => f.id === "aboutMe")).toBe(false);
  });

  it("enabledOverrideValue: null re-enables (the shipped default), 0 is the only way to disable", () => {
    expect(enabledOverrideValue(true)).toBeNull();
    expect(enabledOverrideValue(false)).toBe(0);
  });

  it("requiredOverrideValue: clears to null exactly when the toggle matches the field's own default", () => {
    expect(requiredOverrideValue(true, true)).toBeNull();
    expect(requiredOverrideValue(false, false)).toBeNull();
    expect(requiredOverrideValue(false, true)).toBe(0);
    expect(requiredOverrideValue(true, false)).toBe(1);
  });

  it("moveTargetOverride always names both axes, even for a sub-group-free destination", () => {
    expect(moveTargetOverride("a-family")).toEqual({ section: "a", subGroup: "a-family" });
    expect(moveTargetOverride("d-location")).toEqual({ section: "d", subGroup: "d-location" });
    expect(moveTargetOverride("e")).toEqual({ section: "e", subGroup: null });
  });

  it("declares every target exactly once, covering all four sections", () => {
    expect(tutorProfileFieldEditTargets.map(t => t.id)).toEqual([
      "a-identity", "a-family", "c-education", "c-teaching", "d-availability", "d-teaching", "d-location", "e",
    ]);
  });

  it("appendSortOrder lands after the last field, or at 10 for an empty group", () => {
    const config = defaultTutorProfileFieldConfig();
    const teaching = groupFieldsForEditor(config.all).get("d-teaching") ?? [];
    expect(appendSortOrder([])).toBe(10);
    expect(appendSortOrder(teaching)).toBe(Math.max(...teaching.map(f => f.sortOrder)) + 10);
  });

  it("swapSortOrder exchanges the two neighbors' sortOrder and refuses at either boundary", () => {
    const config = defaultTutorProfileFieldConfig();
    const group = groupFieldsForEditor(config.all).get("e")!;
    const [first, second] = group;

    const down = swapSortOrder(group, first.id, 1)!;
    expect(down).toEqual(expect.arrayContaining([
      { fieldId: first.id, sortOrder: second.sortOrder },
      { fieldId: second.id, sortOrder: first.sortOrder },
    ]));

    expect(swapSortOrder(group, first.id, -1)).toBeNull();
    expect(swapSortOrder(group, group[group.length - 1].id, 1)).toBeNull();
    expect(swapSortOrder(group, "not-in-group", 1)).toBeNull();
  });

  it("overrideRowsEqual compares all five axes", () => {
    const base = emptyOverrideRow("name");
    expect(overrideRowsEqual(base, emptyOverrideRow("name"))).toBe(true);
    expect(overrideRowsEqual(base, { ...base, enabled: 0 })).toBe(false);
    expect(overrideRowsEqual(base, { ...base, required: 1 })).toBe(false);
  });

  it("seeds an empty row for a field with no stored override, and the stored row otherwise", () => {
    const stored = [{ fieldId: "name", section: null, subGroup: null, sortOrder: null, enabled: 0, required: null }];
    const drafts = seedFieldEditorDrafts(["name", "gender"], stored);
    expect(drafts.name).toEqual(stored[0]);
    expect(drafts.gender).toEqual(emptyOverrideRow("gender"));
  });
});
