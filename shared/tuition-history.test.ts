import { describe, expect, it } from "vitest";
import { humanizeFieldName, mergeTuitionHistory, parseChangedFields, tuitionHistoryActionLabel, type TuitionHistoryEntry } from "./tuition-history";

const entry = (action: string, at: string, source: TuitionHistoryEntry["source"] = "request"): TuitionHistoryEntry => ({ source, action, at, actorName: null });

describe("tuitionHistoryActionLabel", () => {
  it("names the moves an Admin makes today", () => {
    expect(tuitionHistoryActionLabel("go_live")).toBe("Went Live");
    expect(tuitionHistoryActionLabel("admin_updated")).toBe("Edited by an Admin");
    expect(tuitionHistoryActionLabel("admin_cancelled")).toBe("Cancelled by an Admin");
  });

  it("names the line a tuition gets when its fee is paid in full, apart from an ordinary payment-status change", () => {
    expect(tuitionHistoryActionLabel("tuition_closed")).toBe("Closed - fee paid in full");
    expect(tuitionHistoryActionLabel("admin_payment_status_changed")).toBe("Payment status changed");
  });

  it("still names a step the Job Board no longer has, so an old tuition's history reads whole", () => {
    expect(tuitionHistoryActionLabel("guardian_confirmed")).toBe("Guardian call recorded");
    expect(tuitionHistoryActionLabel("approve")).toBe("Approved for the Job Board");
  });

  it("shows an action it has no label for as its own words rather than hiding it", () => {
    expect(tuitionHistoryActionLabel("admin_did_something_new")).toBe("Admin did something new");
  });
});

describe("humanizeFieldName", () => {
  it("turns a column name into words", () => {
    expect(humanizeFieldName("budgetAmount")).toBe("Budget amount");
    expect(humanizeFieldName("class_course")).toBe("Class course");
    expect(humanizeFieldName("request")).toBe("Request");
  });
});

describe("parseChangedFields", () => {
  it("reads the list we wrote, and nothing else", () => {
    expect(parseChangedFields('["request","guardian"]')).toEqual(["request", "guardian"]);
    expect(parseChangedFields('["budgetAmount", 3, "", null]')).toEqual(["budgetAmount"]);
    expect(parseChangedFields('{"not":"a list"}')).toEqual([]);
    expect(parseChangedFields("not json")).toEqual([]);
    expect(parseChangedFields(null)).toEqual([]);
    expect(parseChangedFields("")).toEqual([]);
  });

  it("keeps a runaway list short", () => {
    expect(parseChangedFields(JSON.stringify(Array.from({ length: 50 }, (_, index) => `field${index}`)))).toHaveLength(20);
  });
});

describe("mergeTuitionHistory", () => {
  it("puts both logs in one list, newest first", () => {
    const merged = mergeTuitionHistory(
      [entry("go_live", "2026-10-08T10:00:00Z", "board"), entry("close", "2026-10-10T09:00:00Z", "board")],
      [entry("admin_updated", "2026-10-09T08:00:00Z")],
    );

    expect(merged.map(item => item.action)).toEqual(["close", "admin_updated", "go_live"]);
  });

  it("keeps the given order for entries made at the same moment", () => {
    const merged = mergeTuitionHistory([entry("edit", "2026-10-09T08:00:00Z", "board")], [entry("admin_updated", "2026-10-09T08:00:00Z")]);

    expect(merged.map(item => item.action)).toEqual(["edit", "admin_updated"]);
  });

  it("accepts dates and date strings together", () => {
    const merged = mergeTuitionHistory([{ ...entry("a", "2026-10-09T08:00:00Z"), at: new Date("2026-10-11T00:00:00Z") }, entry("b", "2026-10-12T00:00:00Z")]);

    expect(merged.map(item => item.action)).toEqual(["b", "a"]);
  });

  it("is empty when there is nothing to show", () => {
    expect(mergeTuitionHistory([], [])).toEqual([]);
  });
});
