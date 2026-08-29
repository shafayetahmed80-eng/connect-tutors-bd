import { describe, expect, it } from "vitest";
import {
  parseAdminMatchingSavedViewFilters,
  sanitizeAdminMatchingSavedViewFilters,
} from "./admin-matching-saved-views";

describe("Admin Matching Saved View filter safety", () => {
  it("falls back safely when a legacy Saved View contains malformed JSON", () => {
    expect(parseAdminMatchingSavedViewFilters("{not-json")).toMatchObject({
      lifecycle: "all",
      location: "",
      pageSize: 20,
    });
  });

  it("keeps only allowlisted operational filters and removes private request content", () => {
    const filters = sanitizeAdminMatchingSavedViewFilters({
      lifecycle: "pending",
      location: "Mirpur",
      page: 99,
      studentFirstName: "Private",
      addressDetails: "Private address",
      assignmentNotes: [{ body: "Private note" }],
      appointmentState: "invalid",
      pageSize: 999,
    });

    expect(filters).toMatchObject({ lifecycle: "pending", location: "Mirpur", appointmentState: "all", pageSize: 20 });
    expect(filters).not.toHaveProperty("page");
    expect(filters).not.toHaveProperty("studentFirstName");
    expect(filters).not.toHaveProperty("addressDetails");
    expect(filters).not.toHaveProperty("assignmentNotes");
  });
});
