import { describe, expect, it } from "vitest";
import { buildAdminWorkspaceNavigation } from "@/components/AdminWorkspaceLayout";
import { ADMIN_HOME_PATH } from "./adminHome";

describe("ADMIN_HOME_PATH", () => {
  it("is the Applied Tutors page", () => {
    expect(ADMIN_HOME_PATH).toBe("/admin/applied-tutors");
  });

  it("is a page every Admin has in their sidebar, the Owner or not", () => {
    for (const isOwner of [true, false]) {
      expect(buildAdminWorkspaceNavigation(isOwner).map(item => item.path)).toContain(ADMIN_HOME_PATH);
    }
  });
});
