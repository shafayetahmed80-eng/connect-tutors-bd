import { describe, expect, it } from "vitest";
import { dedupeBangladeshLocationRows } from "./db";

describe("Bangladesh location catalog", () => {
  it("removes repeated labels within the same parent and type while keeping distinct parents", () => {
    const rows = dedupeBangladeshLocationRows([
      { id: "mirpur-legacy", label: "Mirpur", type: "area", parentId: "dhaka-city" },
      { id: "mirpur-canonical", label: " mirpur ", type: "area", parentId: "dhaka-city" },
      { id: "mirpur-chattogram", label: "Mirpur", type: "area", parentId: "chattogram-city" },
      { id: "uttara-thana", label: "Uttara", type: "thana", parentId: "dhaka-city" },
    ]);

    expect(rows.map(row => row.id)).toEqual(["mirpur-legacy", "mirpur-chattogram", "uttara-thana"]);
  });

  it("keeps canonical sub-area labels distinct from their parent thana label", () => {
    const rows = dedupeBangladeshLocationRows([
      { id: "mirpur-thana", label: "Mirpur", type: "thana", parentId: "dhaka-city" },
      { id: "mirpur-1", label: "Mirpur 1", type: "subdivision", parentId: "mirpur-thana" },
      { id: "mirpur-2", label: "Mirpur 2", type: "subdivision", parentId: "mirpur-thana" },
    ]);

    expect(rows).toHaveLength(3);
    expect(rows.map(row => row.label)).toEqual(["Mirpur", "Mirpur 1", "Mirpur 2"]);
  });
});
