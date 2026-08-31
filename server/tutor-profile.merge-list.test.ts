import { describe, expect, it } from "vitest";
import { keepList } from "./db";

describe("keepList — partial section save vs. stored list fields", () => {
  it("keeps the incoming value when the section provides one", () => {
    expect(keepList(["3", "4"], ["1"])).toEqual(["3", "4"]);
    expect(keepList([], ["1"])).toEqual([]);
  });

  it("falls back to a non-empty stored value when the section omits the field", () => {
    expect(keepList(undefined, ["1", "2"])).toEqual(["1", "2"]);
  });

  it("treats an empty or missing stored list as unset so the field stays optional", () => {
    expect(keepList(undefined, [])).toBeUndefined();
    expect(keepList(undefined, null)).toBeUndefined();
    expect(keepList(undefined, undefined)).toBeUndefined();
  });
});
